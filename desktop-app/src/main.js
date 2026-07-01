const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell, powerMonitor } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
const API_BASE = 'https://api.tekxai.services/api/v1';
const DASHBOARD_URL = 'https://tekxai.services/employee';
const DEFAULT_SCREENSHOT_INTERVAL_MS = 5 * 60 * 1000; // fallback 5 minutes

let mainWindow = null;
let tray = null;
let screenshotTimer = null;
let sessionId = null;
let screenshotIntervalMs = DEFAULT_SCREENSHOT_INTERVAL_MS;

// ── Activity tracking state ───────────────────────────────────────────────────
let activityToken = null;
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
});

app.on('window-all-closed', () => {
  // Keep running in tray on all platforms
});

app.on('before-quit', async () => {
  stopScreenshots();
  if (sessionId) {
    const token = store.get('auth_token');
    if (token) {
      try {
        const axios = require('axios');
        await axios.post(`${API_BASE}/monitoring/session/${sessionId}/end`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_) {}
    }
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
  const axios = require('axios');
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  if (!res.data?.success || (!res.data?.payload && !res.data?.data)) {
    throw new Error(res.data?.message || 'Login failed');
  }
  const payload = res.data.payload || res.data.data;
  const { access_token, user } = payload;
  store.set('auth_token', access_token);
  store.set('user', user);
  updateTrayMenu();
  return { user };
});

ipcMain.handle('logout', async () => {
  stopScreenshots();
  store.delete('auth_token');
  store.delete('user');
  store.set('clocked_in', false);
  sessionId = null;
  updateTrayMenu();
});

ipcMain.handle('get-today', async () => {
  const token = store.get('auth_token');
  if (!token) return null;
  const axios = require('axios');
  const res = await axios.get(`${API_BASE}/timesheet/today`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.payload;
});

ipcMain.handle('clock-in', async () => {
  const token = store.get('auth_token');
  const axios = require('axios');

  // Fetch screenshot interval from admin settings
  try {
    const settingsRes = await axios.get(`${API_BASE}/settings/system/public`);
    const mins = parseInt(settingsRes.data?.payload?.screenshot_interval_minutes, 10);
    screenshotIntervalMs = (!isNaN(mins) && mins > 0) ? mins * 60 * 1000 : DEFAULT_SCREENSHOT_INTERVAL_MS;
  } catch (_) {
    screenshotIntervalMs = DEFAULT_SCREENSHOT_INTERVAL_MS;
  }

  // Start monitoring session (non-fatal if it fails)
  try {
    const sessRes = await axios.post(`${API_BASE}/monitoring/session/start`, {
      agent_version: app.getVersion(),
      os_platform: process.platform,
    }, { headers: { Authorization: `Bearer ${token}` } });
    sessionId = sessRes.data.payload.id;
  } catch (err) {
    console.error('[session-start]', err.message);
    sessionId = null; // screenshots will still be taken and upload attempted
  }

  const res = await axios.post(`${API_BASE}/timesheet/clock-in`, { note: '' }, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  store.set('clocked_in', true);
  store.set('screenshot_interval_ms', screenshotIntervalMs);
  updateTrayMenu();
  startScreenshots(token);
  startActivityTracking(token);
  return res.data.payload;
});

ipcMain.handle('clock-out', async () => {
  const token = store.get('auth_token');
  const axios = require('axios');

  stopScreenshots();
  stopActivityTracking();

  const res = await axios.post(`${API_BASE}/timesheet/clock-out`, { note: '' }, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  // End monitoring session
  if (sessionId) {
    try {
      await axios.post(`${API_BASE}/monitoring/session/${sessionId}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

function startScreenshots(token) {
  stopScreenshots();
  takeScreenshot(token); // immediate first capture
  screenshotTimer = setInterval(() => takeScreenshot(token), screenshotIntervalMs);
}

function stopScreenshots() {
  if (screenshotTimer) { clearInterval(screenshotTimer); screenshotTimer = null; }
  stopActivityTracking();
}

async function takeScreenshot(token) {
  try {
    const screenshot = require('screenshot-desktop');
    const axios = require('axios');

    const img = await screenshot({ format: 'png' });
    const key = `screenshots/${store.get('user')?.id || 'unknown'}/${Date.now()}.png`;

    // Get presigned upload URL from backend
    const fileName = `${Date.now()}.png`;
    let fileKey = key;
    let fileUrl = null;

    try {
      const presignRes = await axios.post(`${API_BASE}/storage/presign`, {
        file_name: fileName,
        mime_type: 'image/png',
        entity_type: 'screenshot',
      }, { headers: { Authorization: `Bearer ${token}` } });

      const uploadUrl = presignRes.data?.payload?.upload_url;
      fileKey = presignRes.data?.payload?.file_key || key;

      if (uploadUrl && !uploadUrl.includes('localhost')) {
        await axios.put(uploadUrl, img, { headers: { 'Content-Type': 'image/png' } });
        fileUrl = uploadUrl.split('?')[0];
      }
    } catch (_) {}

    // Record in backend (with or without S3 URL)
    await axios.post(`${API_BASE}/monitoring/screenshot`, {
      session_id: sessionId,
      file_key: fileKey,
      file_url: fileUrl || `data:image/png;base64,${img.toString('base64').slice(0, 100)}`,
      captured_at: new Date().toISOString(),
    }, { headers: { Authorization: `Bearer ${token}` } });

    mainWindow?.webContents.send('screenshot-taken');

    // System notification — visible even when app is minimised to tray
    const { Notification } = require('electron');
    if (Notification.isSupported()) {
      new Notification({
        title: 'TekXAI Agent',
        body: 'Screenshot captured ✓',
        silent: true,
      }).show();
    }
  } catch (err) {
    console.error('[screenshot]', err.message);
  }
}

// ── Activity tracking ─────────────────────────────────────────────────────────

function startActivityTracking(token) {
  stopActivityTracking();
  activityToken = token;
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
  activityToken = null;
}

async function flushProductivity() {
  if (!activityToken || !sessionId) return;
  const axios = require('axios');
  const idleTime = powerMonitor.getSystemIdleTime();
  const isIdle = idleTime >= ACTIVITY_IDLE_THRESHOLD;
  const active_seconds = isIdle ? 0 : 60;
  const idle_seconds = isIdle ? 60 : 0;
  const snap = { mouse: mouseEvents, keyboard: keyboardEvents };
  mouseEvents = 0;
  keyboardEvents = 0;

  try {
    await axios.post(`${API_BASE}/monitoring/productivity`, {
      date: new Date().toISOString().slice(0, 10),
      active_seconds,
      idle_seconds,
      mouse_events: snap.mouse,
      keyboard_events: snap.keyboard,
    }, { headers: { Authorization: `Bearer ${activityToken}` } });
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
  if (!activityToken || !sessionId) return;
  const axios = require('axios');

  const app_name = getActiveAppName();
  if (!app_name) return;

  const url = getActiveBrowserUrl();

  try {
    await axios.post(`${API_BASE}/monitoring/app-usage`, {
      session_id: sessionId,
      app_name,
      window_title: '',
      url: url || null,
      duration_seconds: 30,
      captured_at: new Date().toISOString(),
    }, { headers: { Authorization: `Bearer ${activityToken}` } });
  } catch (_) {}
}
