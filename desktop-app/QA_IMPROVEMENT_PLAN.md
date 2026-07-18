# Desktop Agent QA Improvement Proposal

**Status: PROPOSAL ONLY — not implemented.**

## Why this is needed

This sprint's QA was thorough but entirely manual: every check (login, password toggle, single-instance, tray behavior, crash reproduction) required a human/agent driving the actual GUI via computer-use tooling, one click at a time. That's slow, doesn't scale, and depends on whoever's running it remembering the full checklist. It also has a real gap: two items (screenshot-interval, auto-update) couldn't be verified this cycle simply because manual GUI testing makes long-running or state-dependent checks impractical. Automating the parts that can be automated frees manual QA time for the parts that genuinely need human judgment (visual polish, UX feel).

## Automated Smoke Tests

- A fast (< 2 minute) test that launches the built app and asserts: process starts, doesn't crash within N seconds, login screen renders with expected elements present (email field, password field, sign-in button, password toggle icon)
- Run on every CI build (see CI/CD plan) as a build-gate before anything gets published
- Tooling: Electron apps are testable via **Playwright's Electron support** (`playwright.chromium.launch` has an Electron-specific API) or **Spectron**'s successor patterns — Playwright is the more actively maintained option as of this writing and is recommended

## Electron Integration Tests

- Beyond smoke-level: drive real interactions inside the running app (not just asserting it launched) — click the password toggle and assert the input's `type` attribute changes, type invalid credentials and assert the error text, etc.
- These are the automatable equivalent of most of what was done manually this sprint via computer-use
- Store as a `desktop-app/tests/` suite, run via Playwright's Electron driver in CI on both Windows and (if in scope) macOS runners

## End-to-End Login Tests

- Requires a dedicated test account against either a staging backend or a sandboxed slice of production data — **decision needed**: does a staging backend exist or need to be stood up? This sprint's testing went directly against production because no staging environment was available; that's a real gap worth flagging to you as a broader infrastructure question, not just a desktop-app one.
- Test both the success path (valid creds → dashboard) and the failure path (invalid creds → correct error message) end-to-end against a real backend, not mocked

## Installer Verification

- Automated (in CI, see CI/CD plan): checksum verification, `app.asar` hash comparison between build output and what actually gets installed
- Automated NSIS silent-install testing: `TekXAI-Agent-Setup.exe /S` (NSIS supports silent-install flags) on a clean Windows CI runner, then assert the expected files exist at the expected install path — this catches installer-level bugs (wrong install location, missing files) that pure app-level testing can't

## Auto-Update Testing

- Not verified this sprint because no prior version existed to update *from* in the test environment
- Once CI/CD produces versioned releases (Phase 3), this becomes testable: install version N, trigger a build of version N+1, verify the running N instance detects and offers the update, verify post-update the app reports the new version
- Needs a decision on update channel strategy (is `electron-updater` already fully configured, or does it need its own audit? `autoUpdater` calls exist in `main.js` — worth a dedicated review pass, separate from this QA proposal, since it's nontrivial)

## Screenshot Interval Testing

- Not directly observed live this sprint (would require waiting a full interval cycle, impractical for manual GUI-driven QA)
- Proposal: a dedicated integration test that mocks/shortens the interval (e.g. via an environment variable or test-only override, injected only in test builds — never in production) to something like 5 seconds, then asserts a screenshot API call fires within that window
- Also test the admin-configurable path specifically: set the interval via the System Settings API, assert the agent picks up the new value on next clock-in (this is exactly the behavior a prior fix — `c6e2633` — targeted; a regression test here protects that fix long-term)

## Single-Instance Testing

- Straightforward to automate: in CI, launch the built app twice in sequence, assert the second launch doesn't increase the process count and the existing window receives focus — essentially scripting exactly what was done manually this sprint via `tasklist`
- Also test the crash-regression scenario found this sprint as a permanent regression test: close via the titlebar, relaunch, assert no crash dialog appears

## Tray Behavior Testing

- Partially automatable: assert process survives window close (already scriptable via process-count checks, same technique used manually this sprint)
- Direct tray-icon-click testing is harder to automate reliably across platforms (tray icons are OS-level UI, not always accessible to standard test drivers) — recommend this stays a manual QA checklist item rather than forcing brittle automation

## Production Verification Checklist

Codify this sprint's manual process into a repeatable checklist/script for every future release:

1. Confirm `git status` clean, on the intended tag
2. Confirm CI build succeeded and produced the expected artifacts (once Phase 3 exists — until then, confirm local build matches committed source)
3. Confirm deployment completed (automated verification steps from the CI/CD plan, or manual equivalent until that's built)
4. Download the installer from the **public URL**, not from any local/staging copy
5. Verify SHA256 of the downloaded file against the recorded value
6. Verify `app.asar` hash of the downloaded/installed app against the build output
7. Run the smoke test suite (automated once it exists) or the manual checklist (login, password toggle, invalid-credentials message, Time Tracker, single-instance, tray survival, relaunch-after-close, resume-session) against the **production-downloaded** installer specifically — not a local build standing in for it
8. Only mark a release GO after step 7 passes against the real production artifact

## Suggested Priority Order

1. Automated smoke tests (highest value, lowest effort — catches the most common failure class: "the build doesn't even launch")
2. Single-instance + relaunch-crash regression tests (this sprint found a real regression here; automating it prevents recurrence cheaply)
3. Installer verification (checksum + asar hash) — directly closes this sprint's core pain point
4. Electron integration tests (login flow, password toggle, error messages)
5. Screenshot interval + auto-update testing (higher effort, needs infrastructure decisions first — staging environment, test-only config overrides)
