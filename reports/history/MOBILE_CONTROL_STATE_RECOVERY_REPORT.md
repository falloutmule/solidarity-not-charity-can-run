# MOBILE_CONTROL_STATE_RECOVERY_REPORT.md
## Solidarity Not Charity Can Run — Emergency URL Flags + Mobile Control Recovery
**Failed revert URL:** `?v=9714f3c`
**New commit:** `36123f0`
**Date:** 2026-06-24
**Status:** PUSHED to GitHub Pages (build in progress)

---

## WHAT WAS DONE

1. **Diagnosed why reverted build still didn't work on phone:**
   - The revert (`9714f3c`) restored pre-router code, but if the phone had `mobileControls: 'off'` or other stale localStorage settings, mobile mode would never activate.
   - `mobileOverride` was derived from `options.mobileControls`, so a stale `'off'` value would disable all mobile controls regardless of the code revert.
   - There was no way to force mobile mode or reset settings from the URL.

2. **Added emergency URL flags (commit `36123f0`):**
   - `?mobile=on` — forces `mobileMode=true`, `mobileOverride='on'`, `#mob.show`, and a fail-safe `setInterval` that forces all control elements `display:''` + `pointer-events:'auto'` during PLAY state.
   - `?resetcontrols=1` — resets control-related options to safe defaults: `mobileControls='auto'`, `lookSpeed=1`, `joySizePx=110`, `buttonSizePx=85`, `controlOpacityValue=0.60`, `minimapSizePx=68`, `touchDeadzonePx=8`, `minimapDefault=true`.
   - `?clearsave=1` — wipes only the active game save (`cannedRun.save.v1`), NOT stats/profile/settings.
   - All three can be combined: `?mobile=on&resetcontrols=1&touchdebug=1`

3. **Expanded `?touchdebug=1` overlay diagnostics:**
   - `mobileMode`, `mobileControls`, `mobileOverride`, `isMobile()`, `isMobilePortrait()`
   - `innerWidth × innerHeight`, `visualViewport width × height`
   - `#mob` class list and `pointer-events`
   - For each control (`#ml`, `#mr`, `#mg`, `#ms`, `#mm`, `#mp`, `#mlookpad`): bounding rect, `display`, `pointer-events`
   - Last touch/pointer event: type, target id/class, x/y, whether defaultPrevented, handler
   - `inp` state (give/sprint/map/pause)
   - Overlay uses `pointer-events: none` — does NOT block controls

---

## WHAT WAS VERIFIED

**Static checks (all PASS):**
- Syntax: OK ✓
- onclick=0 ✓
- eval=no ✓
- externals=0 ✓
- Title: "Solidarity Not Charity Can Run" ✓
- Size: 149,189 bytes (local)

**Local runtime — normal URL:**
- `__crRuntimeErrors.length` → 0 ✓
- `startRun()` → `OK:play` ✓
- `typeof WALL` → `object` ✓

**Local runtime — `?mobile=on`:**
- `mobileMode` → `true` ✓
- `mobileOverride` → `'on'` ✓
- `options.mobileControls` → `'on'` ✓
- `isMobile()` → `true` ✓
- `__crRuntimeErrors.length` → 0 ✓
- `startRun()` → `state: play, mobileMode: true, errors: 0` ✓

**Local runtime — `?resetcontrols=1`:**
- `joySizePx` → 110 ✓
- `buttonSizePx` → 85 ✓
- `controlOpacityValue` → 0.60 ✓
- `lookSpeed` → 1 ✓
- `mobileControls` → `'auto'` ✓
- `minimapSizePx` → 68 ✓
- `touchDeadzonePx` → 8 ✓
- `__crRuntimeErrors.length` → 0 ✓

**Local runtime — `?touchdebug=1` overlay:**
- Overlay element present and populated ✓
- Shows: orient, state, angle, mobileMode, mobileControls, mobileOverride, isMobile, innerWH, vvWH, mobClass, mobPE, all control zones with rect/display/pointer-events ✓

**GitHub Pages:**
- HTTP 200 ✓
- New code deployment: build in progress (commit `36123f0`)

---

## WHAT FAILED

**Previous revert (`9714f3c`) did not fix phone:**
- Revert restored code, but phone's localStorage may have `mobileControls: 'off'` or other stale settings
- No URL mechanism existed to override bad phone state
- Now resolved via `?mobile=on` and `?resetcontrols=1`

**LOOK remains unresolved:**
- Portrait LOOK (`#mlookpad`) is still in center of screen — user says this is wrong, should be on right side
- LOOK is a separate next step after controls are confirmed working

**GitHub Pages build latency:**
- Pages deployment takes ~2-7 minutes; the new code was not yet live at time of report

---

## CURRENT EXACT STATE

- Commit `36123f0` is HEAD on main
- GitHub Pages build in progress
- Emergency URL flags active: `?mobile=on`, `?resetcontrols=1`, `?clearsave=1`, `?touchdebug=1`
- `?mobile=on` forces mobile mode + fail-safe visible controls
- `?resetcontrols=1` resets all control settings to safe defaults
- Debug overlay shows full mobile/control diagnostics
- LOOK is NOT fixed yet (separate next step)
- Portrait LOOK placement still in center (needs right-side correction in phase 2)

---

## REMAINING BLOCKERS

1. **Real-phone verification** — Travis must test `?mobile=on&resetcontrols=1` to confirm controls work
2. **Stale localStorage** — phone may have bad settings that can now be overridden via URL flags
3. **LOOK** — not fixed; portrait should be right-side, not center
4. **MOVE/GIVE/SPRINT/MAP/PAUSE** — cannot be programmatically verified in headless browser (canvas limitation)

---

## NEXT ACTIONABLE STEP

**Travis test sequence:**

1. Open: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=36123f0`
   - If controls work → great, confirm each one
   - If controls fail → proceed to step 2

2. Open reset/force URL:
   `https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&resetcontrols=1&touchdebug=1&v=36123f0`
   - Start a run
   - Test MOVE, GIVE, SPRINT, MAP, PAUSE
   - Screenshot debug overlay if controls still fail

3. Try clean-state test:
   - Chrome Incognito tab, OR
   - Clear site data for `falloutmule.github.io`

4. After controls confirmed → LOOK fix as separate narrow patch

---

## EVIDENCE

- Previous failed revert: https://github.com/falloutmule/solidarity-not-charity-can-run/commit/9714f3c
- New recovery commit: https://github.com/falloutmule/solidarity-not-charity-can-run/commit/36123f0
- GitHub issue: https://github.com/falloutmule/solidarity-not-charity-can-run/issues/1
- Local file: `index.html` (149,189 bytes)
- Report: `MOBILE_CONTROL_STATE_RECOVERY_REPORT.md`

---

## GITHUB PAGES URLS

- **Normal:** `https://falloutmule.github.io/solidarity-not-charity-can-run/`
- **Cache-busted:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=36123f0`
- **Force mobile + reset + debug:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&resetcontrols=1&touchdebug=1&v=36123f0`
- **Force mobile only:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&v=36123f0`

---

## REAL PHONE STATUS

**Samsung Galaxy S21 Ultra** — PENDING Travis manual retest.

Priority: Confirm MOVE/GIVE/SPRINT/MAP/PAUSE work using the reset/force URL. LOOK is separate.
