# Portrait Dashboard UI Report

## WHAT WAS DONE
- Backup: `index.before-portrait-dashboard-ui.html` (153002 bytes)
- Portrait stacked dashboard: **FPV panel** → **minimap panel** → **stats panel** → **controls dock**
- `portraitLayout()` returns panel rects + MOVE/GIVE/SPRINT/LOOK dock rects
- Portrait HUD: stats drawn in stats panel only (no giant overlay on FPV)
- Minimap centered in minimap panel (not bottom dock)
- Bottom dock: **MOVE left**, **GIVE + SPRINT center**, **LOOK right** (`#mlookpad`)
- Landscape: GIVE/SPRINT back on **right**; visible **LOOK** circle bottom-right (`#mlookpad`); `#mr` half-screen look zone retained
- `?layoutdebug=1`: colored control outlines + canvas zone labels (FPV/MINI/STATS/DOCK)
- `isMobilePortrait()` uses canvas `view.height > view.width` when mobile (matches phone after `resize()`)
- Prior commit: **25853e5** → New commit: **57edc8c**

## WHAT WAS VERIFIED
**Static:** syntax OK, onclick 0, eval no, title OK, backup exists, single-file ~156KB

**Functional (local http://localhost:8787):** `startRun` OK, `__crRuntimeErrors` 0, LOOK touch drag angle delta ~0.2

**Portrait layout (simulated 390×844, `?mobile=on`):**
- `fpvRect`: 390×256 @ y=0
- `minimapRect`: 390×80 @ y=256
- `statsRect`: 390×66 @ y=336
- `controlsRect`: 390×442 @ y=402
- DOM MOVE: 114×114 @ (12,720)
- DOM GIVE: 59×59 @ (147,775)
- DOM SPRINT: 59×59 @ (212,775)
- DOM LOOK: 90×90 @ (292,744)
- `giveBetweenMoveAndLook`: **true**
- Overlaps give/look, sprint/look, give/move, sprint/move, give/sprint: **all false**

**Landscape (simulated 844×390):** LOOK display flex, 83×83, rgba(200,150,60,0.35)

## WHAT FAILED
- Hermes browser tool strips some query params from URL (`layoutdebug=1`); use full URL on device/Pages
- Desktop browser viewport remains wide; portrait proof uses forced canvas 390×844 + `applyMobileControlSettings()`

## CURRENT EXACT STATE
- Repo `main` @ **57edc8c** pushed
- Real-phone validation: **pending Travis**

## REMAINING BLOCKERS
- Travis retest on Samsung portrait + landscape rotation

## NEXT ACTIONABLE STEP
1. Open cache-busted URL on phone (portrait).
2. Confirm four zones + bottom dock order.
3. Rotate landscape; confirm LOOK circle + right-side GIVE/SPRINT.
4. If wrong: `layoutdebug=1` screenshot to Telegram.

## EVIDENCE
- `proof-portrait-dashboard.png`
- `proof-portrait-dashboard-layoutdebug.png`
- `proof-landscape-look.png`

## GITHUB PAGES URL
- Play: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=57edc8c
- Layout debug: https://falloutmule.github.io/solidarity-not-charity-can-run/?layoutdebug=1&v=57edc8c
- Touch debug: https://falloutmule.github.io/solidarity-not-charity-can-run/?touchdebug=1&v=57edc8c
- Recovery: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=57edc8c&mobile=on&resetcontrols=1