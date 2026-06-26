# Canned Run — Mobile Fullscreen Report

## WHAT WAS DONE

- Created backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile-fullscreen.html`

- Added fullscreen API support to:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`

### 1. Visible fullscreen button

- Added `#fsbtn` — a small centered button at the top of the screen, shown only during mobile gameplay when not already fullscreen.
- Added FULLSCREEN / EXIT FULLSCREEN menu items on:
  - Title screen (new row, selection count updated to 7)
  - Options / Help screen
  - Pause menu
- All fullscreen actions are user-triggered via `data-action="toggle-fs"` → `rmenuAction()` → `toggleFullscreen()`.

### 2. Fullscreen state handling

- Added helpers:
  - `enterFullscreen()` — calls `requestFullscreen` (with webkit/ms prefixes); shows toast on failure
  - `exitFullscreen()` — calls `exitFullscreen` (with webkit/ms prefixes)
  - `toggleFullscreen()` — enters or exits based on current state
  - `isFullscreen()` — checks `fullscreenElement` / `webkitFullscreenElement` / `msFullscreenElement`
  - `updateFsBtnLabel()` — updates button text to EXIT FS when fullscreen active
  - `showToast(msg)` — displays `#fstoast` for 3 seconds
- `fullscreenchange` / `webkitfullscreenchange` / `msfullscreenchange` listeners call debounced resize + label update.
- Exposed via CR debug API:
  - `CR.toggleFullscreen`
  - `CR.isFullscreen`
  - `CR.enterFullscreen`
  - `CR.exitFullscreen`

### 3. Canvas fills viewport better

- `resize()` now uses `visualViewport.width/height` when available (falls back to `innerWidth/innerHeight`).
- Backing store and CSS size both update from visualViewport.
- `devicePixelRatio` capped at 2.
- Debounced resize (80ms) on:
  - window resize
  - orientationchange
  - fullscreenchange (all prefix variants)
  - visualViewport resize
  - visualViewport scroll
- Mobile landscape cover-scaling (`playfieldLayout()`) from prior pass preserved.

### 4. Browser scroll/selection hidden

- `overscroll-behavior:none` added to html/body.
- `touch-action:none`, `user-select:none`, `-webkit-user-select:none`, `-webkit-touch-callout:none` already present.
- Seed input (`#rseedinp`) remains tappable/typeable — it uses standard `<input type="number">` inside the menu panel.

### 5. In-game fullscreen button

- `#fsbtn` appears at top-center during mobile gameplay when not fullscreen.
- Touch and click handlers wired in `bindMobileControls()`.
- Button hidden when:
  - not mobile mode
  - not in active gameplay
  - already fullscreen
- Label updates to EXIT FS when fullscreen.

### 6. content:// mode

- The Fullscreen API requires a user-secure context. Opening from `content://` on Android may limit fullscreen behavior.
- `enterFullscreen()` checks for `requestFullscreen` availability and shows `FULLSCREEN NOT AVAILABLE IN THIS BROWSER MODE` toast if unavailable.
- Does not crash if the API is absent or the promise rejects.
- **Real-phone behavior under content:// is honestly labeled as pending.**

## WHAT WAS VERIFIED

### A. Static checks

- Backup exists: YES
- Node syntax check: PASS (exit 0)
- Lines: 2647
- Bytes: 119,161
- Inline onclick handlers: 0
- eval() usage: 0
- External assets/libs/backend: none
- Fullscreen helpers present: toggleFullscreen, enterFullscreen, exitFullscreen, isFullscreen, fsbtn, fstoast, overscroll-behavior

### B. Desktop smoke

- Game loads: YES
- Runtime errors: 0
- Desktop controls work: YES
- New run: PASS
- Pickup: PASS
- Handoff: PASS
- Pause/resume: PASS
- Results: PASS

### C. Forced mobile test

- setMobileMode(true): PASS
- Fullscreen button exists in mobile UI during play: PASS
- toggleFullscreen function exists: PASS
- Fullscreen unavailable path does not crash: PASS (toggle-fs action ran without error)
- Resize handler runs after simulated fullscreenchange: PASS
- Title menu has FULLSCREEN button: PASS
- Options menu has FULLSCREEN button: PASS
- Pause menu has FULLSCREEN button: PASS
- Title button label: "FULLSCREEN"
- Overlay shows: PASS
- rmenu hidden during play: PASS
- Turn zone works: PASS
- Joystick move works: PASS
- GIVE / SPRINT / MAP / PAUSE: ALL PASS
- Runtime errors: 0

### D. Real-phone retest

- **PENDING** — user must retest on Android Chrome.

## WHAT FAILED

- Nothing failed in local verification.
- Real-phone fullscreen behavior cannot be verified in automation.

## CURRENT EXACT STATE

- Updated game:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.html`
  - 2647 lines / 119,161 bytes

- Backup:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-mobile-fullscreen.html`
  - 2541 lines / 114,549 bytes

- Report:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\MOBILE_FULLSCREEN_REPORT.md`

- Proof:
  - `C:\Users\fallo\Documents\HermesProjects\canned-run\proof-mobile-fullscreen.png`

## REMAINING BLOCKERS

- Real-phone verification of fullscreen behavior on Android Chrome is pending.
- content:// file provider mode may limit Fullscreen API availability — cannot be tested in automation.

## NEXT ACTIONABLE STEP — REAL-PHONE RETEST

1. Open updated file from Telegram on Android Chrome.
2. Tap **FULLSCREEN** from title screen.
3. Rotate to landscape.
4. Tap **NEW RUN**.
5. Confirm browser/address bar reduces or disappears (if supported).
6. Confirm game uses more of the screen.
7. Confirm **MOVE** joystick works.
8. Confirm right **LOOK** zone turns.
9. Confirm **GIVE / SPRINT / MAP / PAUSE** still work.
10. Confirm seed/menu/results screens are still usable.
11. If fullscreen is unavailable, confirm the toast message appears and game still plays normally.

## EVIDENCE

- Static syntax pass (node --check exit 0).
- Desktop smoke: all subsystems pass, 0 runtime errors.
- Forced mobile: all controls pass, fullscreen buttons present on all menus, resize fires on fullscreenchange, toggle-fs action does not crash, 0 runtime errors.
- Proof screenshot saved.

## TELEGRAM DELIVERY

- Updated game file: attached.
- Report: attached.
- Proof: attached.
