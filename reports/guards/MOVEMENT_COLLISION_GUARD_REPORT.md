# MOVEMENT COLLISION GUARD REPORT

## WHAT WAS DONE

- Backup: `index.before-2d-substep-collision.html`
- Prior gameplay baseline: **controlrel1 / bdc40b6**
- Prior report-only: **Q1K3_LEARNING_REPORT.md / 90382b1**
- **`BUILD_ID` → `movcoll1`**
- Added **`movePlayerWithCollision(dx, dy)`** with **CR_MOVE_SUBSTEP_MAX = 0.12** (axis-separated substeps per frame)
- Wired **`update()`** to use substeps instead of single-step X/Y resolve
- Added **`CR.runMovementCollisionSelfCheck()`** with harness micro-maps (wall, corner, high-speed tunnel, corridor) plus normal/hall spawn and joystick release regression
- Playwright **`movementCollisionSection()`** + **`proof-movement-collision.json`**
- **`CR.runFullSelfCheck()`** now includes movement/collision

## WHAT WAS VERIFIED

- Normal run seed **88** spawn **canStand** + forward probe
- Hall spawn **canStand**
- Wall push: no entry into wall (x stayed **< 4.85**)
- Diagonal corner: **canStand** held, no NaN
- High-speed **5.0** cell X move: **no tunnel** (x **< 7.2**, **canStand** true)
- Corridor: advanced then stopped with no input
- Joystick release: no drift after clear
- **Mobile control reliability** still passes inside movement check
- Full Playwright harness **pass**
- Harness isolation / release artifact / constitution **pass**

## WHAT FAILED

- Nothing in final automated run.

## CURRENT EXACT STATE

- **Movement logic changed:** yes — `update()` now calls `movePlayerWithCollision` with up to `ceil(max(|dx|,|dy|)/0.12)` substeps; each substep applies X then Y with `canStand` rollback on invalid position.
- **Old behavior:** one `canStand` test per axis for full frame delta.
- **New behavior:** same axis order, smaller steps — prevents large-dt / sprint tunneling while preserving slide-along-wall feel.

## REMAINING BLOCKERS

- None.

## NEXT ACTIONABLE STEP

- Optional: add `proof-collision-wall.png` / `proof-collision-corner.png` from micro-map draw if visual audit wanted (corridor screenshot captured).

## EVIDENCE

- `proof-movement-collision.json`
- `proof-playwright-summary.json` — **pass**
- `proof-collision-corridor.png`
- Backup: `index.before-2d-substep-collision.html`

## GITHUB PAGES URL

- Play: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=b504d63&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=b504d63&mobile=on&portraitlayout=1
- Commit: **b504d63**