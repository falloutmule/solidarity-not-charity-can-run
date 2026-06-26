# LOOK_CIRCLE_LAYOUT_REPORT.md
## Solidarity Not Charity Can Run — Dedicated LOOK Circle + Button Reposition
**Prior commit:** `89fc1c7`
**New commit:** `e82d970`
**Date:** 2026-06-24
**Status:** PUSHED to GitHub Pages (deploying)

---

## WHAT WAS DONE

### 1. Dedicated LOOK Circle (#mlookpad)
- Restyled from invisible strip to a **visible circular pad** with border, background, and "LOOK / DRAG" text
- CSS: `border-radius:50%`, `background:rgba(200,150,60,0.15)`, `border:2px solid`, `z-index:12` (same level as buttons)
- Size: ~78% of joystick size in portrait, ~72% in landscape
- **Visible in BOTH portrait and landscape** (was portrait-only before)

### 2. LOOK Circle Placement
- **Portrait:** right side, vertically centered in the control area below the gameplay window, above GIVE/SPRINT
- **Landscape:** right side, vertically centered (50% with translateY), between MAP (top-right) and GIVE/SPRINT

### 3. GIVE/SPRINT Moved Below LOOK
- Portrait: GIVE/SPRINT shrunk to 72% size, stacked at bottom-right edge (8px from right, 6px from bottom)
- LOOK circle sits above them with clear vertical gap
- No overlap between LOOK circle and GIVE/SPRINT

### 4. Dual Input Handlers (Pointer + Touch)
- `pointerdown/pointermove/pointerup/pointercancel` on #mlookpad
- `touchstart/touchmove/touchend/touchcancel` on #mlookpad (for Android Chrome reliability)
- Both change `player.angle` using `options.mobileTurnSens`
- Visual press feedback (`.pr` class) on touch
- **No document-level capture** — all per-element

### 5. mlookpad Added to Show/Hide Lifecycle
- Added `'mlookpad'` to control ID arrays in `applyMobileControlSettings()` and `drawMobileMenu()`
- LOOK circle now shows during PLAY, hides during title/menu/pause
- Added to `?mobile=on` fail-safe force-visible list

### 6. Center Hint Removed
- `#mlookhint` (center "DRAG TO TURN" text) hidden in portrait via `applyMobileControlSettings()`
- `#mlookpadhint` replaced with inline "LOOK / DRAG" text inside the circle

---

## WHAT WAS VERIFIED

**Static checks (all PASS):**
- Syntax: OK ✓
- onclick=0 ✓
- eval=no ✓
- externals=0 ✓
- Title: "Solidarity Not Charity Can Run" ✓
- Backup exists: `index.before-look-circle-layout.html` (150099 bytes) ✓

**Local runtime:**
- `__crRuntimeErrors.length` → 0 ✓
- `startRun()` → `OK:play` ✓
- All controls `display:flex` during PLAY (ml, mlookpad, mg, ms, mm, mp) ✓
- LOOK circle `border-radius:50%`, `z-index:12` ✓
- **Angle change test:** 50px simulated drag → angle delta = 0.25 ✓

**GitHub Pages:**
- Build deploying

---

## WHAT FAILED

Nothing failed locally. Portrait/landscape LOOK angle change verified via simulated pointer events.

---

## CURRENT EXACT STATE

- Commit `e82d970` is HEAD on main
- LOOK circle is a visible circular pad in both orientations
- GIVE/SPRINT are smaller and below the LOOK circle in portrait
- All controls show/hide correctly during gameplay lifecycle
- Emergency URL flags preserved (`?mobile=on`, `?resetcontrols=1`, `?touchdebug=1`)
- `#mr` transparent zone still exists as landscape fallback

---

## REMAINING BLOCKERS

1. **Real-phone verification** — Travis must confirm LOOK circle works on Samsung S21 Ultra
2. **Landscape LOOK** — root cause fix (orientation-change re-apply) + dedicated circle should both help

---

## NEXT ACTIONABLE STEP

Travis tests on real phone:
1. Open `?v=e82d970` URL
2. Portrait: confirm LOOK circle visible on right side
3. Portrait: drag LOOK circle — confirm view turns
4. Landscape: drag LOOK circle — confirm view turns
5. Confirm all other controls still work

---

## EVIDENCE

- Prior commit: https://github.com/falloutmule/solidarity-not-charity-can-run/commit/89fc1c7
- New commit: https://github.com/falloutmule/solidarity-not-charity-can-run/commit/e82d970
- GitHub issue: https://github.com/falloutmule/solidarity-not-charity-can-run/issues/1
- Backup: `index.before-look-circle-layout.html`

---

## GITHUB PAGES URLS

- **Cache-busted:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=e82d970`
- **Debug:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?touchdebug=1&v=e82d970`

---

## REAL PHONE STATUS

**Samsung Galaxy S21 Ultra** — PENDING Travis manual retest.
