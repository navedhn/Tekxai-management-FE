# TekXAI Desktop Agent — Release Notes

## v1.0.0 — 2026-07-18

### Release Summary

| Field | Value |
|---|---|
| Version | 1.0.0 |
| Git tag | `desktop-v1.0.0` |
| Commit | `9330a55f20755eca6dfb4407f57a6fc5751655e0` |
| Build timestamp | 2026-07-18T15:43:57Z |
| Installer SHA256 | `c57a4143ef8a4c5f76492f3d28e24cd45d2fe0af7f276be9b77558865a13aabe` |
| app.asar SHA256 | `17964e99ff89ccb8f83032e3f5cb581db995153f057c8c1861424ebf18f4b669` |
| Production URL | `https://api.tekxai.services/downloads/TekXAI-Agent-Setup.exe` |
| Release date | 2026-07-18 |
| QA status | PASSED (local + production) |
| Production verification | PASSED |

---

### Features Delivered

- Password visibility toggle on the login screen (eye icon, toggles field between hidden/visible, resets on sign-out)

### Bugs Fixed

1. **Login error message lost across Electron IPC boundary** — the renderer previously showed a raw `AxiosError`/IPC wrapper string (e.g. `"Error invoking remote method 'login': AxiosError: Request failed with status code 401"`) instead of the backend's actual message. `main.js`'s login handler now catches the axios error and rethrows with the real message; the renderer additionally strips the IPC wrapper prefix for a fully clean display (e.g. `"Invalid email or password"`).
2. **No single-instance protection** — repeated launches (e.g. double-clicking the Start Menu shortcut while already running) spawned a full duplicate Electron process instead of focusing the existing window; observed up to 12 concurrent processes in testing. Fixed with `app.requestSingleInstanceLock()` and a `second-instance` handler that restores/focuses the existing window.
3. **Crash on relaunch after closing via the titlebar button** (`TypeError: Object has been destroyed`) — introduced by the single-instance fix itself, caught during QA retesting before release. The `second-instance` handler now guards against a destroyed `mainWindow` reference and recreates the window if needed.

### Admin Dashboard (web app) change bundled in this release

- "Recent Timesheet" table on the Super Admin dashboard now shows an **Employee** column first; the **Status** column was removed (all rows are terminal/completed states, so it carried no information).

### Runtime Verification Summary

Every item below was verified by **observing actual running-application behavior** (clicking, launching, killing processes, checking `tasklist`), not by code review alone:

- Application starts correctly
- Login succeeds with valid credentials
- Password toggle reveals/hides the field, icon state updates
- Invalid credentials show a clean, correct message
- Time Tracker correctly shows a cumulative daily total across multiple clock in/out cycles within the same day (verified this is intentional design, not a bug — see "Retracted findings" below)
- Single-instance protection: repeated launches produce the same process count and focus the existing window
- Tray/minimize: closing via the titlebar hides the window and keeps the background process alive (agent keeps monitoring), rather than quitting
- Relaunch after close does not crash
- Auto-resume session: a fresh launch correctly restores an already-clocked-in state from the backend

**Retracted finding**: an initial report that "Time Tracker doesn't reset between sessions" was investigated at runtime and found to be a misdiagnosis — the display is an intentional cumulative-daily-total, not a per-session stopwatch. Math was verified exact across two real clock cycles.

**Not directly runtime-tested this release**: screenshot-capture-interval behavior (would require observing a full interval cycle live); auto-updater flow (no prior version existed to update *from* in this environment). Both are recommended for the next QA cycle (see Phase 4 proposal).

### Production Deployment Summary

- No CI/CD pipeline currently exists for the desktop app (the prior one, `build-desktop.yml`, was deleted from the repo on 2026-06-30 — see "Known Limitations").
- This release was built locally from the tagged commit and deployed manually via AWS CloudShell → temporary `ec2-instance-connect` SSH key → `scp` to the backend EC2 instance, landing at `/home/ubuntu/downloads/latest/` (the actual nginx-served path — see "Lessons Learned" in the sprint report for a path-naming error caught and corrected during this deployment).
- Deployment was independently verified from a separate machine: live endpoint headers, fresh re-download, and checksum all confirmed to match the intended build.

### Known Limitations

- **No automated CI/CD** for the desktop app. Every release requires a manual local build + manual file transfer to the backend server. See Phase 3 plan for the proposed fix.
- **Release provenance gap** (pre-existing, not fixed this release): the desktop CI/CD pipeline was deleted without a documented replacement process; a prior "release" (before this one) referenced a git commit that doesn't exist anywhere in the repository. This release closes that specific gap (its commit is real and pushed), but the *process* gap remains until CI/CD is restored.
- **Screenshot-interval and auto-updater behavior** not directly runtime-verified this cycle (present in code, `app.asar` hash-matched against reviewed source, but not observed live end-to-end).
- **Tray icon direct interaction** (clicking tray menu items) not verified this cycle due to a tooling limitation in the QA environment; only tray *survival* (process staying alive on window close) was confirmed.

### Upgrade Notes

- This is the first tracked release (`desktop-v1.0.0`); there is no prior tagged version to upgrade *from* within this repo's tag history.
- No breaking changes to stored user data, tokens, or settings — `electron-store` schema is unchanged.
- Existing installations will need to be manually reinstalled until an auto-update mechanism is verified (see Phase 4).

### Rollback Instructions

If this release needs to be rolled back on the production server:

```bash
# On the backend EC2 instance, in /home/ubuntu/downloads/latest/
ls *.bak-*                                    # find the most recent backup timestamp
cp TekXAI-Agent-Setup.exe.bak-<TIMESTAMP> TekXAI-Agent-Setup.exe
cp metadata.json.bak-<TIMESTAMP> metadata.json
sha256sum TekXAI-Agent-Setup.exe              # confirm it matches the prior release's recorded checksum
```

No nginx reload or service restart is required — files are served directly via `alias`, so the rollback takes effect on the very next request.

### Verification Evidence

- `app.asar` SHA256 identical between the local QA build and the installer downloaded fresh from `https://api.tekxai.services/downloads/TekXAI-Agent-Setup.exe`: `17964e99ff89ccb8f83032e3f5cb581db995153f057c8c1861424ebf18f4b669`
- Live endpoint headers at verification time: `Content-Length: 79123600`, `Last-Modified: Sat, 18 Jul 2026 16:10:29 GMT` — matching the deployed build exactly
- Full runtime verification suite (see above) re-run against the production-downloaded installer, not just the local build
