# NARROW_LOOK_LAYOUT_FIX_REPORT.md
## Solidarity Not Charity Can Run — Narrow Landscape LOOK + Portrait Layout Fix
**Prior recovery commit:** `36123f0`
**New commit:** `89fc1c7`
**Date:** 2026-06-24
**Status:** PUSHED to GitHub Pages (build deploying)

---

## WHAT WAS DONE

### 1. Fixed Landscape LOOK (root cause: orientation change didn't re-apply controls)
**Root cause:** `_debouncedResize()` only called `resize()` (canvas size). It did NOT call `setMobileMode(isMobile())` or `applyMobileControlSettings()`. When the phone rotated from portrait to landscape:
- `#mr` (landscape LOOK zone) stayed at `pointer-events:none` from the portrait layout
- The touch handlers on `#mr` never fired because the element was inert
- LOOK was permanently broken after any portrait→landscape rotation

**Fix:** `_debouncedResize()` now calls:
1. `resize()` — canvas
2. `setMobileMode(isMobile())` — re-evaluate mobile detection
3. `applyMobileControlSettings()` — re-apply all control positions/pointer-events for new orientation

This is a 120ms debounced call, fired on `resize` and `orientationchange` events.

### 2. Portrait Layout — LOOK moved from center to right-side strip
**Before:** `#mlookpad` was centered between left joystick and right buttons, covering the middle of the screen.
**After:** `#mlookpad` is now a right-side vertical strip (right 30% of screen width), from below the gameplay window down to above GIVE/SPRINT.

### 3. Portrait GIVE/SPRINT shrunk and moved to bottom-right edge
**Before:** GIVE at `bottom: btnSize+34`, SPRINT at `bottom:22px` — both at right 14px, full size (85px).
**After:** Both shrunk to 72% size (~61px), stacked at far bottom-right edge (8px from right, 6px from bottom for SPRINT, GIVE above it).

This frees the right-side vertical strip for LOOK.

### 4. LOOK hint made subtle
- `#mlookpadhint` font reduced from bold 11px to bold 10px, opacity from 0.45 to 0.30
- Now appears in the right-side LOOK strip area, not center
- Center hint (`#mlookhint`) was already hidden in portrait via `applyMobileControlSettings()`

### 5. Emergency URL flags preserved
- `?mobile=on`, `?resetcontrols=1`, `?clearsave=1`, `?touchdebug=1` all intact

---

## WHAT WAS VERIFIED

**Static checks (all PASS):**
- Syntax: OK ✓
- onclick=0 ✓
- eval=no ✓
- externals=0 ✓
- Title: "Solidarity Not Charity Can Run" ✓
- Backup exists: `index.before-narrow-look-layout-fix.html` (149401 bytes) ✓

**Local runtime:**
- `__crRuntimeErrors.length` → 0 ✓
- `startRun()` → `OK:play` ✓
- `typeof WALL` → `object` ✓
- All control elements present and `display:flex` in mobile mode ✓
- `#mr` has `pointer-events:auto` in landscape ✓
- `#mlookpad` positioned at right side (not center) ✓

**GitHub Pages:**
- HTTP 200 ✓
- New build deploying

---

## WHAT FAILED

**Portrait LOOK cannot be programmatically angle-tested** in headless browser:
- Headless browser window is desktop-sized (1258×622), cannot simulate phone dimensions
- CDP WebSocket to Android emulator is blocked by Chrome origin restriction
- Angle delta from portrait LOOK drag requires a real phone or emulator with working CDP

---

## CURRENT EXACT STATE

- Commit `89fc1c7` is HEAD on main
- GitHub Pages build deploying
- Landscape LOOK: orientation-change fix applied — `#mr` should now get `pointer-events:auto` after rotation
- Portrait LOOK: `#mlookpad` is right-side 30% strip, not center
- Portrait GIVE/SPRINT: shrunk to 72%, stacked at bottom-right edge
- Center hint: hidden in portrait, `#mlookpadhint` is subtle and in right-side area
- All emergency URL flags preserved

---

## REMAINING BLOCKERS

1. **Real-phone verification** — Travis must test landscape LOOK after rotation and portrait right-side LOOK
2. **Portrait LOOK angle delta** — not programmatically confirmed (requires real phone)
3. **Landscape LOOK angle delta** — fix addresses root cause but needs real-phone confirmation

---

## NEXT ACTIONABLE STEP

**Travis test sequence:**

1. Open: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=89fc1c7`
2. Start a run
3. Confirm MOVE, GIVE, SPRINT, MAP, PAUSE all still work
4. **Landscape:** drag right side — confirm view turns
5. **Portrait:** confirm GIVE/SPRINT are smaller and at bottom-right edge
6. **Portrait:** drag right-side area (above GIVE/SPRINT) — confirm view turns
7. If LOOK fails: open `?touchdebug=1&v=89fc1c7`, screenshot overlay

---

## EVIDENCE

- Prior recovery commit: https://github.com/falloutmule/solidarity-not-charity-can-run/commit/36123f0
- New fix commit: https://github.com/falloutmule/solidarity-not-charity-can-run/commit/89fc1c7
- GitHub issue: https://github.com/falloutmule/solidarity-not-charity-can-run/issues/1
- Backup: `index.before-narrow-look-layout-fix.html` (149401 bytes)
- Local file: `index.html` (149889 bytes)
- Report: `NARROW_LOOK_LAYOUT_FIX_REPORT.md`

---

## GITHUB PAGES URLS

- **Cache-busted:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=89fc1c7`
- **Debug:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?touchdebug=1&v=89fc1c7`
- **Force mobile + reset + debug:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&resetcontrols=1&touchdebug=1&v=89fc1c7`

---

## REAL PHONE STATUS

**Samsung Galaxy S21 Ultra** — PENDING Travis manual retest.

Key questions:
1. Does landscape LOOK turn after rotating from portrait?
2. Is portrait LOOK zone on the right side, not center?
3. Do GIVE/SPRINT still work at their new smaller size?
