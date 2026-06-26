# MOBILE_CONTROL_RECOVERY_REPORT.md
## Solidarity Not Charity Can Run — Revert Broken Document-Level Router
**Bad commit:** 7f3f346
**Revert commit:** 9714f3c
**Date:** 2026-06-24
**Status:** PUSHED to GitHub Pages

---

## WHAT WAS DONE

1. **Reverted commit 7f3f346** — the document-level touch/pointer router that captured all document touches and broke every mobile control (MOVE, GIVE, SPRINT, MAP, PAUSE all stopped working on real phones).
2. **Revert method:** `git revert 7f3f346 --no-edit` (clean revert, no conflicts, no force-push).
3. **Revert commit:** `9714f3c` — restores the build from `4d3f791` which has working per-element mobile control handlers.
4. **Pushed to main:** `7f3f346..9714f3c main -> main`.
5. **GitHub Pages verified:** HTTP 200, Content-Length 153303 bytes.

The reverted build restores:
- Per-element touch handlers on #ml (MOVE), #mr (LOOK landscape), #mg (GIVE), #ms (SPRINT), #mm (MAP), #mp (PAUSE)
- #mlookpad for portrait LOOK (from commit 863cc24)
- All mobile control show/hide lifecycle
- No document-level touch capture

---

## WHAT WAS VERIFIED

**Static checks (all PASS):**
- Syntax check: OK (JS parses cleanly)
- onclick=0 (no inline handlers) ✓
- eval=no ✓
- externals=0 (no external URLs/libs/assets) ✓
- Title: "Solidarity Not Charity Can Run" ✓
- File size: 144,867 bytes (local)

**Local browser runtime (all PASS):**
- `startRun()` → `OK:play` ✓
- `restartRun()` → OK ✓
- `typeof WALL` → `object` (no TDZ error) ✓
- `typeof genCity` → `function` ✓
- `window.__crRuntimeErrors.length` → `0` (zero runtime errors) ✓

**Mobile control elements present:**
- `#ml` (MOVE) ✓
- `#mr` (LOOK landscape) ✓
- `#mg` (GIVE) ✓
- `#ms` (SPRINT) ✓
- `#mm` (MAP) ✓
- `#mp` (PAUSE) ✓
- `#mlookpad` (portrait LOOK) ✓

**GitHub Pages HTTP verification:**
- `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=9714f3c` → HTTP 200 (153303 bytes) ✓
- `applyMobileControlSettings`, `bindMobileControls`, `mlookpad` all present in served HTML (34 matches) ✓

---

## WHAT FAILED

**Commit 7f3f346 (the broken router):**
- Document-level touch/pointer router captured ALL touch events at the document level
- preventDefault was called globally, which consumed events before per-element handlers could fire
- This broke: MOVE joystick, GIVE button, SPRINT button, MAP button, PAUSE button
- Real-phone result confirmed by Travis: "No controls work now."
- Portrait LOOK was placed in center of screen (user correction: should NOT be center)
- Root cause: the router consumed/blocked all touches instead of only handling LOOK

**LOOK remains unresolved:**
- This revert restores working controls but does NOT fix LOOK
- LOOK is a separate next step (phase 2) — must not be mixed with control recovery
- Next LOOK approach must be narrow: a targeted LOOK handler that ignores buttons/joystick/minimap, does NOT preventDefault globally, and does NOT consume all document touches

---

## CURRENT EXACT STATE

- Commit `9714f3c` is HEAD on main branch
- GitHub Pages serves the reverted build at HTTP 200
- Mobile controls (MOVE/GIVE/SPRINT/MAP/PAUSE) restored to per-element handlers
- `#mlookpad` portrait LOOK pad exists from commit 863cc24
- No document-level touch router
- No runtime errors
- LOOK is NOT fixed yet (treated as separate next task)
- Portrait LOOK placement (#mlookpad) may still be in center — needs adjustment in phase 2

---

## REMAINING BLOCKERS

1. **LOOK not working** — portrait and landscape LOOK need a narrow, targeted fix that does not break controls
2. **Portrait LOOK placement** — should NOT be center; should be right-side open area above GIVE/SPRINT, excluding minimap
3. **Real-phone verification** — Travis must confirm controls are restored on Samsung S21 Ultra before any LOOK work continues

---

## NEXT ACTIONABLE STEP

1. **Travis confirms controls work again** on real Samsung S21 Ultra using the reverted cache-busted URL
2. Only after confirmation, implement a **narrow LOOK-only handler** that:
   - Only activates when: state=PLAY, not paused, mobileMode=true, pointer starts in LOOK rectangle
   - Excludes button rectangles (GIVE/SPRINT/MAP/PAUSE), joystick, minimap
   - Does NOT preventDefault for non-LOOK touches
   - Does NOT consume all document touches
   - Uses pointer handlers on canvas/#mob, not document-level capture
3. **Portrait LOOK zone** moved to right-side area above GIVE/SPRINT, NOT center

---

## EVIDENCE

- Bad commit: https://github.com/falloutmule/solidarity-not-charity-can-run/commit/7f3f346
- Revert commit: https://github.com/falloutmule/solidarity-not-charity-can-run/commit/9714f3c
- GitHub issue: https://github.com/falloutmule/solidarity-not-charity-can-run/issues/1
- Local backup (pre-router): `index.before-realphone-look-router.html`
- Local file: `index.html` (144,867 bytes)
- Report: `MOBILE_CONTROL_RECOVERY_REPORT.md`

---

## GITHUB PAGES URLS

- **Reverted (cache-busted):** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=9714f3c`
- **Normal:** `https://falloutmule.github.io/solidarity-not-charity-can-run/`
- **Debug:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?touchdebug=1&v=9714f3c`

---

## REAL PHONE STATUS

**Samsung Galaxy S21 Ultra** — PENDING Travis manual retest of reverted build.

Priority: Confirm MOVE/GIVE/SPRINT/MAP/PAUSE all work again. LOOK is a separate next step.
