# MENU lock + Kanban reset — Card 1 report

**Date:** 2026-06-26  
**BUILD_ID:** `menu1`  
**Backup:** `C:\Users\fallo\Documents\HermesProjects\canned-run\index.before-menu-lock-kanban-reset.html`

## WHAT WAS DONE

- Removed `menuRect = portraitShiftY(menuRect, dy)` in `portraitLayout()` so CONTROL DOCK HEIGHT no longer shifts MENU.
- `portraitShiftY(dy)` still applies only to: `moveRect`, `giveRect`, `sprintRect`, `lookRect`.
- Fixed zones unchanged: `fpvRect`, `minimapRect`, `statsRect`, `menuRect` baseline (below minimap at `ctrlY0 + 6`).
- OPTIONS helper text updated.
- `getControlDockRectProof()` extended with top-level rects + stability booleans for menu/minimap/stats/fpv.
- `BUILD_ID` bumped `dock2` → `menu1`.

## Helper text

| | Text |
|---|------|
| **Old** | Tap row — moves MOVE / GIVE / SPRINT / LOOK / MENU only |
| **New** | Tap row — moves MOVE / GIVE / SPRINT / LOOK only |

## Code changed

- `const BUILD_ID = 'menu1';`
- `portraitLayout()`: deleted menu `portraitShiftY`; comment documents fixed MENU.
- OPTIONS `rdesc` helper (mobile OPTIONS HTML).
- `getControlDockRectProof()`: `moveRect`…`fpvRect` at current offset; `movement.menuYStable_*`, `minimapYStable`, `statsYStable`, `fpvYStable`.

## Proof (layout math, file:// + `?mobile=on`)

`portraitLayout(y)` vs baseline `y=0`:

| y | moveDelta | menuDelta | miniDelta |
|---|-----------|-----------|-----------|
| 120 | 120 | 0 | 0 |
| 0 | 0 | 0 | 0 |
| -240 | -240 | 0 | 0 |

`getControlDockRectProof().movement`:

- `menuYStable_lowToVery`: true  
- `menuYStable_midToHigh`: true  
- `minimapYStable`: true  
- `statsYStable`: true  
- `fpvYStable`: true  
- `lowToVery_moveTop`: 360  
- `midToHigh_moveTop`: 120  

## WHAT WAS VERIFIED

- Static: no `menuRect = portraitShiftY` in `index.html`.
- Browser console: `portraitLayout` deltas and `getControlDockRectProof()` on `file://` with `?mobile=on`.
- `startRun()` smoke: no throw.

## WHAT FAILED / NOT TESTED

- Real Samsung S21 Ultra screenshots at LOW vs VERY HIGH (user step).
- GitHub Pages CDN after push (may lag raw `main`).
- SNC Hall custom level on phone.
- DOM `domSample` in proof at four offsets (requires portrait viewport in browser).

## CURRENT EXACT STATE

- Card 1 (P0 MENU lock): **code complete**, pending commit hash + push.
- Cards 2–11: **backlog only** (documented in handoff; not started).

## REMAINING BLOCKERS

- None for merge; phone visual confirmation is user-owned.

## NEXT ACTIONABLE STEP

1. Push commit; open cache-busted Pages URL.  
2. Phone: LOW / VERY HIGH screenshots; confirm MENU/minimap/stats/FPV fixed.  
3. Start Kanban Card 2 (sprite halo guard) only after user confirms Card 1.

## EVIDENCE

- Backup path above.  
- Console proof JSON captured in-session (`menu1`, movement flags all true).

## Kanban backlog (Cards 2–11)

See handoff — queued P1/P2 items: sprite halo, occlusion, viewport/dvh, thumb contract, safe area, file:// storage, pointer capture, touch-action, audio unlock, AI-safe constitution.