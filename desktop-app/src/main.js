const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, powerMonitor } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');

// Required on Windows for Notification.show() to actually display a toast —
// without it, notifications silently no-op for unpacked/non-Store apps.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.tekxai.agent');
}

// Without this lock, launching the app while it's already running (e.g. from
// the Start Menu shortcut) spawns a whole second Electron process instead of
// focusing the existing window — each with its own screenshot/tracking
// timers running concurrently. Second launches now just focus the original.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // mainWindow can be destroyed (not just hidden) in edge cases the 'close'
    // handler doesn't catch (e.g. Windows session-ending events) — recreate
    // rather than crash on a destroyed BrowserWindow reference.
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

const store = new Store();
const API_BASE = 'https://api.tekxai.services/api/v1';
const DASHBOARD_URL = 'https://tekxai.services/employee';
const DEFAULT_SCREENSHOT_INTERVAL_MS = 10 * 60 * 1000; // fallback if settings can't be fetched
let screenshotIntervalMs = DEFAULT_SCREENSHOT_INTERVAL_MS;

// Super admin controls this via system settings; refresh it before every
// clock-in so a change takes effect on the next session without requiring
// an app restart. Public endpoint — no auth needed.
async function refreshScreenshotInterval() {
  try {
    const res = await axios.get(`${API_BASE}/settings/system/public`);
    const minutes = +(res.data?.payload?.screenshot_interval_minutes);
    if (minutes > 0) screenshotIntervalMs = minutes * 60 * 1000;
  } catch (_) {}
}

let mainWindow = null;
let tray = null;
let screenshotTimer = null;
let sessionId = null;

// ── API client — access tokens are short-lived (15m); this transparently
// refreshes via the stored refresh_token on 401 and retries once, so the
// clock-in-once-a-day background timers keep working for a whole shift. ───────

const apiClient = axios.create({ baseURL: API_BASE });

apiClient.interceptors.request.use((config) => {
  const token = store.get('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  const refresh_token = store.get('refresh_token');
  if (!refresh_token) throw new Error('No refresh token stored');
  const res = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token });
  const payload = res.data?.payload || res.data?.data;
  const newAccessToken = payload?.access_token || payload?.accessToken;
  const newRefreshToken = payload?.refresh_token || payload?.refreshToken;
  if (!newAccessToken) throw new Error('Refresh response missing access token');
  store.set('auth_token', newAccessToken);
  if (newRefreshToken) store.set('refresh_token', newRefreshToken);
  return newAccessToken;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (_) {
        // Refresh token is invalid/expired too — force the user to sign in again.
        store.delete('auth_token');
        store.delete('refresh_token');
        store.delete('user');
        store.set('clocked_in', false);
        stopScreenshots();
        sessionId = null;
        updateTrayMenu();
        mainWindow?.webContents.send('force-logout');
      }
    }
    return Promise.reject(error);
  }
);

// ── Activity tracking state ───────────────────────────────────────────────────
let activityTimer = null;   // 60s productivity flush
let appTrackTimer = null;   // 30s app+URL tracking
let activityPollTimer = null; // 5s idle poll

let mouseEvents = 0;
let keyboardEvents = 0;
let lastIdleTime = 0;
const ACTIVITY_IDLE_THRESHOLD = 5; // seconds idle to count as inactive

// ── App ready ─────────────────────────────────────────────────────────────────

// ── Auto updater ──────────────────────────────────────────────────────────────
// Disabled by default. Set AUTO_UPDATES_ENABLED=true in electron-store or env
// to enable once update server (latest.yml / latest-mac.yml) is deployed.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.logger = null; // silence logs until enabled

const AUTO_UPDATES_ENABLED = store.get('auto_updates_enabled', false);

if (AUTO_UPDATES_ENABLED) {
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info);
  });
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', info);
  });
}

ipcMain.handle('install-update', () => autoUpdater.quitAndInstall());
ipcMain.handle('check-for-updates', () => autoUpdater.checkForUpdates().catch(() => null));
ipcMain.handle('get-app-version', () => app.getVersion());

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  resumeSessionIfNeeded();
});

// sessionId lives in memory only, so it's lost on every app restart (crash,
// update, reboot). If the user was still clocked in when that happened,
// re-establish a monitoring session now instead of silently going dark for
// the rest of the day.
async function resumeSessionIfNeeded() {
  if (!store.get('clocked_in') || !store.get('auth_token')) return;
  try {
    const todayRes = await apiClient.get('/timesheet/today');
    const stillOpen = todayRes.data?.payload?.clocked_in && !todayRes.data?.payload?.clocked_out;
    if (!stillOpen) {
      store.set('clocked_in', false);
      updateTrayMenu();
      return;
    }
    const sessRes = await apiClient.post('/monitoring/session/start', {
      agent_version: app.getVersion(),
      os_platform: process.platform,
    });
    sessionId = sessRes.data.payload.id;
    startScreenshots();
    startActivityTracking();
  } catch (_) {}
}

app.on('window-all-closed', () => {
  // Keep running in tray on all platforms
});

app.on('before-quit', async () => {
  stopScreenshots();
  if (sessionId) {
    try {
      await apiClient.post(`/monitoring/session/${sessionId}/end`);
    } catch (_) {}
  }
});

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

// ── Tray ──────────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const img = nativeImage.createFromPath(iconPath);
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
  tray.setToolTip('TekXAI Agent');
  updateTrayMenu();

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

function updateTrayMenu() {
  const token = store.get('auth_token');
  const user = store.get('user');
  const clocked = store.get('clocked_in', false);

  const menu = Menu.buildFromTemplate([
    { label: user ? `${user.first_name} ${user.last_name}` : 'Not logged in', enabled: false },
    { label: clocked ? '🟢 Clocked In' : '⚫ Not clocked in', enabled: false },
    { type: 'separator' },
    { label: 'Open Agent', click: () => mainWindow?.show() },
    { label: 'Open Dashboard', click: () => shell.openExternal(DASHBOARD_URL) },
    { type: 'separator' },
    ...(token ? [
      { label: clocked ? 'Clock Out' : 'Clock In', click: () => mainWindow?.webContents.send('tray-toggle-clock') },
      { type: 'separator' },
    ] : []),
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('get-store', (_, key) => store.get(key));
ipcMain.handle('set-store', (_, key, value) => store.set(key, value));
ipcMain.handle('del-store', (_, key) => store.delete(key));

ipcMain.handle('login', async (_, { email, password }) => {
  let res;
  try {
    res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  } catch (err) {
    // Electron's IPC layer only preserves Error.message across the process
    // boundary, not the full axios error shape — so the backend's actual
    // message (e.g. "Invalid credentials") must be extracted here, not left
    // for the renderer to read from err.response, which won't survive.
    throw new Error(err?.response?.data?.message || 'Unable to sign in. Please check your connection and try again.');
  }
  if (!res.data?.success || (!res.data?.payload && !res.data?.data)) {
    throw new Error(res.data?.message || 'Login failed');
  }
  const payload = res.data.payload || res.data.data;
  const access_token = payload.access_token || payload.accessToken;
  const refresh_token = payload.refresh_token || payload.refreshToken;
  const { user } = payload;
  store.set('auth_token', access_token);
  store.set('refresh_token', refresh_token);
  store.set('user', user);
  updateTrayMenu();
  return { user };
});

ipcMain.handle('logout', async () => {
  stopScreenshots();
  store.delete('auth_token');
  store.delete('refresh_token');
  store.delete('user');
  store.set('clocked_in', false);
  sessionId = null;
  updateTrayMenu();
});

ipcMain.handle('get-today', async () => {
  if (!store.get('auth_token')) return null;
  const res = await apiClient.get('/timesheet/today');
  return res.data.payload;
});

ipcMain.handle('clock-in', async () => {
  // Start monitoring session
  try {
    const sessRes = await apiClient.post('/monitoring/session/start', {
      agent_version: app.getVersion(),
      os_platform: process.platform,
    });
    sessionId = sessRes.data.payload.id;
  } catch (_) {}

  let res;
  try {
    res = await apiClient.post('/timesheet/clock-in', { note: '' });
  } catch (err) {
    // Same IPC-boundary message loss as login — see the login handler above.
    throw new Error(err?.response?.data?.message || 'Unable to clock in. Please try again.');
  }

  store.set('clocked_in', true);
  updateTrayMenu();
  startScreenshots();
  startActivityTracking();
  return res.data.payload;
});

ipcMain.handle('clock-out', async () => {
  stopScreenshots();
  stopActivityTracking();

  let res;
  try {
    res = await apiClient.post('/timesheet/clock-out', { note: '' });
  } catch (err) {
    throw new Error(err?.response?.data?.message || 'Unable to clock out. Please try again.');
  }

  // End monitoring session
  if (sessionId) {
    try {
      await apiClient.post(`/monitoring/session/${sessionId}/end`);
    } catch (_) {}
    sessionId = null;
  }

  store.set('clocked_in', false);
  updateTrayMenu();
  return res.data.payload;
});

ipcMain.handle('open-dashboard', () => {
  shell.openExternal(DASHBOARD_URL);
});

// ── Screenshot capture ────────────────────────────────────────────────────────

async function startScreenshots() {
  stopScreenshots();
  await refreshScreenshotInterval();
  takeScreenshot(); // immediate first capture
  screenshotTimer = setInterval(() => takeScreenshot(), screenshotIntervalMs);
}

function stopScreenshots() {
  if (screenshotTimer) { clearInterval(screenshotTimer); screenshotTimer = null; }
  stopActivityTracking();
}

async function takeScreenshot() {
  if (!sessionId) return;
  try {
    const screenshot = require('screenshot-desktop');

    const img = await screenshot({ format: 'png' });
    const key = `screenshots/${store.get('user')?.id || 'unknown'}/${Date.now()}.png`;

    // Get presigned upload URL from backend
    const fileName = `${Date.now()}.png`;
    let fileKey = key;
    let fileUrl = null;

    try {
      const presignRes = await apiClient.post('/storage/presign', {
        file_name: fileName,
        mime_type: 'image/png',
        entity_type: 'screenshot',
      });

      const uploadUrl = presignRes.data?.payload?.upload_url;
      fileKey = presignRes.data?.payload?.file_key || key;

      if (uploadUrl && !uploadUrl.includes('localhost')) {
        // Presigned S3 URL — not an API call, no bearer auth needed/wanted here.
        await axios.put(uploadUrl, img, { headers: { 'Content-Type': 'image/png' } });
        fileUrl = uploadUrl.split('?')[0];
      }
    } catch (_) {}

    // Record in backend (with or without S3 URL)
    await apiClient.post('/monitoring/screenshot', {
      session_id: sessionId,
      file_key: fileKey,
      file_url: fileUrl || `data:image/png;base64,${img.toString('base64').slice(0, 100)}`,
      captured_at: new Date().toISOString(),
    });

    // Employees must never be shown that a screenshot was taken. The two
    // blocks below were added for testing only — commented out (not deleted)
    // so they're easy to re-enable for local debugging if needed.
    // mainWindow?.webContents.send('screenshot-taken');
    //
    // // System notification — visible even when app is minimised to tray
    // const { Notification } = require('electron');
    // if (Notification.isSupported()) {
    //   new Notification({
    //     title: 'TekXAI Agent',
    //     body: 'Screenshot captured ✓',
    //     silent: true,
    //   }).show();
    // }
  } catch (err) {
    console.error('[screenshot]', err.message);
  }
}

// ── Activity tracking ─────────────────────────────────────────────────────────

function startActivityTracking() {
  stopActivityTracking();
  mouseEvents = 0;
  keyboardEvents = 0;
  lastIdleTime = 0;

  // Poll idle time every 5 seconds to infer mouse/keyboard activity
  activityPollTimer = setInterval(() => {
    try {
      const idleNow = powerMonitor.getSystemIdleTime(); // seconds
      if (idleNow < ACTIVITY_IDLE_THRESHOLD && lastIdleTime >= ACTIVITY_IDLE_THRESHOLD) {
        // User just became active after being idle — count as mouse/keyboard event
        mouseEvents += 1;
        keyboardEvents += 1;
      } else if (idleNow < lastIdleTime) {
        // Idle counter reset means activity happened
        mouseEvents += 1;
      }
      lastIdleTime = idleNow;
    } catch (_) {}
  }, 5000);

  // Every 60 seconds, flush productivity stats
  activityTimer = setInterval(async () => {
    await flushProductivity();
  }, 60 * 1000);

  // Every 30 seconds, track active app + URL
  appTrackTimer = setInterval(async () => {
    await trackAppAndUrl();
  }, 30 * 1000);
}

function stopActivityTracking() {
  if (activityPollTimer) { clearInterval(activityPollTimer); activityPollTimer = null; }
  if (activityTimer) { clearInterval(activityTimer); activityTimer = null; }
  if (appTrackTimer) { clearInterval(appTrackTimer); appTrackTimer = null; }
}

async function flushProductivity() {
  if (!sessionId) return;
  const idleTime = powerMonitor.getSystemIdleTime();
  const isIdle = idleTime >= ACTIVITY_IDLE_THRESHOLD;
  const active_seconds = isIdle ? 0 : 60;
  const idle_seconds = isIdle ? 60 : 0;
  const snap = { mouse: mouseEvents, keyboard: keyboardEvents };
  mouseEvents = 0;
  keyboardEvents = 0;

  try {
    await apiClient.post('/monitoring/productivity', {
      date: new Date().toISOString().slice(0, 10),
      active_seconds,
      idle_seconds,
      mouse_events: snap.mouse,
      keyboard_events: snap.keyboard,
    });
  } catch (_) {}
}

function getActiveAppName() {
  const { execSync } = require('child_process');
  try {
    if (process.platform === 'darwin') {
      return execSync(
        `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
        { timeout: 3000 }
      ).toString().trim();
    } else if (process.platform === 'win32') {
      return execSync(
        `powershell -command "Get-Process | Where-Object {$_.MainWindowHandle -ne 0 -and $_.Responding} | Sort-Object CPU -Descending | Select-Object -First 1 -ExpandProperty ProcessName"`,
        { timeout: 3000 }
      ).toString().trim();
    }
  } catch (_) {}
  return null;
}

function getActiveBrowserUrl() {
  const { execSync } = require('child_process');
  if (process.platform === 'darwin') {
    // Try Chrome
    try {
      const url = execSync(
        `osascript -e 'tell application "Google Chrome" to get URL of active tab of front window'`,
        { timeout: 3000 }
      ).toString().trim();
      if (url && url.startsWith('http')) return url;
    } catch (_) {}
    // Try Safari
    try {
      const url = execSync(
        `osascript -e 'tell application "Safari" to get URL of current tab of front window'`,
        { timeout: 3000 }
      ).toString().trim();
      if (url && url.startsWith('http')) return url;
    } catch (_) {}
    // Try Firefox (via UI automation — best effort)
    try {
      const url = execSync(
        `osascript -e 'tell application "Firefox" to get URL of active tab of front window'`,
        { timeout: 3000 }
      ).toString().trim();
      if (url && url.startsWith('http')) return url;
    } catch (_) {}
  } else if (process.platform === 'win32') {
    try {
      // Best-effort PowerShell UI Automation to read Chrome address bar
      const url = execSync(
        `powershell -command "Add-Type -AssemblyName UIAutomationClient; $root=[Windows.Automation.AutomationElement]::RootElement; $chrome=$root.FindFirst([Windows.Automation.TreeScope]::Children,[Windows.Automation.PropertyCondition]::new([Windows.Automation.AutomationElement]::NameProperty,'Google Chrome')); if($chrome){$bar=$chrome.FindFirst([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.PropertyCondition]::new([Windows.Automation.AutomationElement]::ControlTypeProperty,[Windows.Automation.ControlType]::Edit)); if($bar){$val=[Windows.Automation.ValuePattern]$bar.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern); $val.Current.Value}}"`,
        { timeout: 5000 }
      ).toString().trim();
      if (url && url.startsWith('http')) return url;
    } catch (_) {}
  }
  return null;
}

async function trackAppAndUrl() {
  if (!sessionId) return;

  const app_name = getActiveAppName();
  if (!app_name) return;

  const url = getActiveBrowserUrl();

  try {
    await apiClient.post('/monitoring/app-usage', {
      session_id: sessionId,
      app_name,
      window_title: '',
      url: url || null,
      duration_seconds: 30,
      captured_at: new Date().toISOString(),
    });
  } catch (_) {}
}
