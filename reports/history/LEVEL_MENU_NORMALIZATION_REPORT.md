# LEVEL / MENU NORMALIZATION REPORT

## WHAT WAS DONE

- Backup: `index.before-level-menu-normalization.html`
- **Diagnosed SNC Hall MOVE failure** — Category **B** (input OK, movement blocked by collision)
- **Fixed Hall spawn** — player now picks first `canStand()` candidate (default **12.5, 7.0**); old spawn **2.5, 7.0** had `canStand: false` (wall at row 6 under collision radius)
- **Shared start lifecycle**: `clearInputState()`, `sharedEnterPlay()` used by `startRun()` and `startCustomLevel()`
- **Menu single source**: `specialLevelMenuItems()` from `CUSTOM_LEVELS`; `titleMenuItems()` for canvas + `buildTitleRmenuBody()` for mobile HTML; `custom-level-<id>` rmenu actions
- **`CR.getDebugState()`** extended: `customLevel`, `MAP_W/H`, `canStand`, `standProbe`, `joy`, `moveDbg`
- **UI/control layout**: unchanged (no placement/CSS tuning in this pass)
- **BUILD_ID**: `lvl1`
- **Commit**: `b0774b6` (pushed to `main`)

## WHAT WAS VERIFIED

| Check | Result |
|-------|--------|
| Syntax (node --check) | pass |
| Normal run MAP size | **40×20**, aspect **2.0** (rectangular) |
| Hall MAP size | **30×14**, aspect ~**2.14** |
| Hall spawn `canStand` | **true** at 12.5, 7.0 |
| Hall simulated joy move | `dpx: 0.15`, position changes |
| Normal run `canStand` at spawn | **true** |
| Custom start via `custom-level-hall_of_servants` | `state: play`, `paused: false`, rmenu cleared (`in`) |
| Title menu SPECIAL LEVELS | **SNC HALL OF SERVANTS** from shared list |
| `startRun` clears `customLevel` | yes |
| Backup exists | yes |

## WHAT FAILED

- **Real-phone** Hall + normal MOVE not re-tested on Travis device in this pass (desktop/browser simulation only)
- **Hall GIVE** at scripted range not re-proven in this session (prior `hall1` pass had thank-you popups; `giveCan` needs in-range NPC)

## CURRENT EXACT STATE

- **File**: `index.html` only, `BUILD_ID=lvl1`
- **Level model**:
  - **Procedural**: `startRun()` → `genCity()` → 40×20 rectangle
  - **Custom**: `startCustomLevel(id)` → `CUSTOM_LEVELS[id].generator()` → e.g. Hall 30×14
  - Not every level is custom; specials are optional entries in `CUSTOM_LEVELS`
- **Menus**: mobile HTML + desktop canvas both driven by `titleMenuItems()` / `specialLevelMenuItems()`

## REMAINING BLOCKERS

- Travis phone confirmation on **`lvl1`** cache-busted URL (NEW RUN + Hall MOVE)

## NEXT ACTIONABLE STEP

1. Open `?mobile=on&v=lvl1` on phone, hard refresh
2. NEW RUN → MOVE
3. Menu → **SNC HALL OF SERVANTS** → MOVE immediately
4. Report if anything still stuck

## EVIDENCE

### Cause of SNC Hall MOVE failure

- Spawn at **(2.5, 7.0)**: floor cell OK, but **`canStand` false** — collision probe hits **wall brick** at **y=6** (divider row)
- Joystick updated `joy.*` (move2 path) but **`update()`** could not apply `player.x/y` when `canStand` fails

### Exact fix

- Spawn candidate loop + safer corridor position **12.5, 7.0**
- Plus `sharedEnterPlay()` so custom start matches procedural cleanup (rmenu, joy, controls)

### Map dimensions

- Normal: **40×20**
- Hall: **30×14**

### Proof screenshots (local)

- `proof-hall-start.png` — title menu, SPECIAL LEVELS
- `proof-normal-run-rectangle.png` — procedural play
- `proof-hall-move-debug.png` — Hall after movement
- `proof-hall-of-servants-thanks.png` — prior hall pass (thanks)

## GITHUB PAGES URL

- **Normal**: https://falloutmule.github.io/solidarity-not-charity-can-run/
- **Cache-busted**: https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&v=lvl1