let clockedIn = false;
let clockedOut = false;
let startEpoch = 0;
let todayBaseSeconds = 0;
let tickInterval = null;
let screenshotCount = 0;

(async () => {

  window.agent.onToggleClock(() => {
    if (clockedIn) doClock('out');
    else doClock('in');
  });

  window.agent.onForceLogout(() => {
    stopTick();
    clockedIn = false; clockedOut = false; startEpoch = 0; todayBaseSeconds = 0; screenshotCount = 0;
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('dashboard-screen').classList.remove('active');
  });

  const token = await window.agent.getStore('auth_token');
  const user  = await window.agent.getStore('user');

  if (token && user) {
    showDashboard(user);
    await refreshToday();
  }
})();

function togglePasswordVisibility() {
  const input = document.getElementById('password');
  const icon  = document.getElementById('eye-icon');
  const btn   = document.getElementById('password-toggle');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.title = showing ? 'Show password' : 'Hide password';
  icon.innerHTML = showing
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>'
    : '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.62 21.62 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.62 21.62 0 0 1-2.89 4.16M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
}

function clean_ipc_error(e, fallback) {
  const raw = e?.response?.data?.message || e?.message || fallback;
  return raw.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '');
}

async function doLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('login-btn');
  const errEl    = document.getElementById('login-error');

  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Email and password are required.'; return; }

  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const { user } = await window.agent.login({ email, password });
    showDashboard(user);
    await refreshToday();
  } catch (e) {
    errEl.textContent = clean_ipc_error(e, 'Login failed.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.screen.active');
    if (active?.id === 'login-screen') doLogin();
  }
});

async function doLogout() {
  stopTick();
  await window.agent.logout();
  clockedIn = false; clockedOut = false; startEpoch = 0; todayBaseSeconds = 0; screenshotCount = 0;
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('dashboard-screen').classList.remove('active');
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  if (document.getElementById('password').type === 'text') togglePasswordVisibility();
}

function showDashboard(user) {
  const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || '?';
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-name').textContent   = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  document.getElementById('user-role').textContent   = user.role_name?.replace(/_/g, ' ') || user.email;

  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('dashboard-screen').classList.add('active');
}

async function refreshToday() {
  try {
    const data = await window.agent.getToday();
    if (!data || !data.entry) {
      clockedIn = false; clockedOut = false; todayBaseSeconds = 0;
      stopTick();
      setTrackerUI('idle');
      return;
    }

    if (data.clocked_in && !data.clocked_out) {

      const checkIn = new Date(data.entry.check_in).getTime();
      startEpoch = checkIn;
      todayBaseSeconds = data.entry.prior_seconds || 0;
      clockedIn = true; clockedOut = false;
      setTrackerUI('active');
      startTick();
      setSsIndicator(true);

      const checkinTime = new Date(data.entry.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      document.getElementById('stat-checkin').textContent = checkinTime;
    } else if (data.clocked_in && data.clocked_out) {

      clockedIn = false; clockedOut = true;
      stopTick();
      const dur = data.entry.duration_seconds || 0;
      todayBaseSeconds = dur;
      document.getElementById('tracker-time').textContent = fmtHms(dur);
      document.getElementById('stat-today').textContent = fmtDuration(dur);
      setTrackerUI('idle');
      setSsIndicator(false);
      const checkinTime = new Date(data.entry.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      document.getElementById('stat-checkin').textContent = checkinTime;
    }
  } catch (_) {}
}

async function doClock(action) {
  const actRow = document.getElementById('tracker-actions');

  try {
    if (action === 'in') {
      actRow.innerHTML = '<button class="btn btn-outline" disabled>Clocking in…</button>';
      await window.agent.clockIn();
      screenshotCount = 0;
      await refreshToday();
    } else {
      actRow.innerHTML = '<button class="btn btn-outline" disabled>Clocking out…</button>';
      await window.agent.clockOut();
      await refreshToday();
    }
  } catch (e) {

    await refreshToday();
    alert(clean_ipc_error(e, 'Action failed'));
  }
}

function setTrackerUI(state) {
  const actRow   = document.getElementById('tracker-actions');
  const statusEl = document.getElementById('tracker-status');
  const textEl   = document.getElementById('status-text');

  statusEl.className = 'tracker-status';

  if (state === 'idle') {
    statusEl.classList.add('status-idle');
    textEl.textContent = 'Not clocked in';
    actRow.innerHTML = '<button class="btn btn-green" onclick="doClock(\'in\')">▶ Clock In</button>';
  } else if (state === 'active') {
    statusEl.classList.add('status-active');
    textEl.textContent = 'Clocked in';
    actRow.innerHTML = `
      <button class="btn btn-red"    onclick="doClock('out')">■ Clock Out</button>
    `;
  }
}

function setSsIndicator(active) {

}

function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    const elapsed = todayBaseSeconds + Math.floor((Date.now() - startEpoch) / 1000);
    document.getElementById('tracker-time').textContent = fmtHms(elapsed);
    document.getElementById('stat-today').textContent   = fmtDuration(elapsed);
  }, 1000);
}

function stopTick() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
}

function fmtHms(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h:${String(m).padStart(2,'0')}m:${String(s).padStart(2,'0')}s`;
}

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}
