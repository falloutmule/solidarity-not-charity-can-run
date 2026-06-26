# CONTROL HEIGHT + RECTANGULAR LEVELS — Report

## WHAT WAS DONE

- **Backup:** `index.before-control-height-rect-levels.html` (162964 bytes)
- **CONTROL HEIGHT** option added (`controlsYOffsetPx`, labels via `controlHeightLabel()`)
  - Steps (px): **+60 LOW**, **0 MID**, **-30 HIGH**, **-60 VERY HIGH**
  - Positive = controls lower; negative = higher
  - Default: **0 (MID)**
  - Saved in `localStorage` with other options
  - **`?resetcontrols=1`** resets to **0**
  - Mobile OPTIONS row: `CONTROL HEIGHT: LOW|MID|HIGH|VERY HIGH`
  - Desktop OPTIONS: `CONTROL HEIGHT: …`
- **Group offset (portrait):** `portraitLayout()` applies `yOff` to `moveRect`, `giveRect`, `sprintRect`, `lookRect`, `menuRect` together
- **Landscape:** `ml` / `mlookpad` `bottom` adjusted; `mg` / `ms` `translateY` with same offset
- **Rectangular levels:** `genCity()` grid **40×20** (was **42×42**)
  - `game.MAP_W` / `game.MAP_H` set independently; loops/bounds/raycast/minimap already used W/H separately
- **`getLayoutProof()`** exposes `controlsYOffsetPx` and `mapSize {w,h,aspect}`

## WHAT WAS VERIFIED

| Check | Result |
|-------|--------|
| Backup exists | ✓ |
| `node --check` on extracted script | ✓ |
| No `onclick=` in HTML | ✓ (rg) |
| Title | Solidarity Not Charity Can Run |
| New run `genCity(12345,1,'clear')` | MAP_W=40, MAP_H=20, aspect=2.00 |
| `controlsYOffsetPx=-60` in proof | ✓ menuRect top shifts with offset |
| `?resetcontrols=1` path | resets `controlsYOffsetPx` to 0 in code |

## WHAT FAILED

- Local `python -m http.server 8787` → browser `ERR_EMPTY_RESPONSE` (environment)
- Portrait DOM proof screenshots not captured in this session (desktop viewport; `isMobilePortrait()` false)
- GitHub Actions not polled (historical 401)

## CURRENT EXACT STATE

- **Repo:** `main`, uncommitted report + index changes pending commit below
- **Map gen:** **40 wide × 20 tall** for new random/seeded runs
- **Saved runs:** load prior `MAP_W`/`MAP_H` from save (legacy 42×42 saves still valid)
- **Portrait layout:** unchanged zones (FPV → minimap → controls → stats); overlap preserved

## REMAINING BLOCKERS

- Real-phone confirmation of CONTROL HEIGHT cycle + 2:1 feel in FPV
- Optional proof PNGs on device/emulator

## NEXT ACTIONABLE STEP

Travis: cache-busted URL below → new random run → OPTIONS → cycle CONTROL HEIGHT → confirm cluster moves; confirm minimap is wide-short (not square maze stretched).

## EVIDENCE

- Console (file:// local): `{ MAP_W: 40, MAP_H: 20, aspect: "2.00", controlsYOffsetPx: -60 }`
- Square assumption replaced: `const GW = 42, GH = 42` → `const GW = 40, GH = 20` in `genCity()`

## GITHUB PAGES URL

- Normal: https://falloutmule.github.io/solidarity-not-charity-can-run/
- Cache-busted: `?v=caecbac&mobile=on`
- Layout debug: `?v=caecbac&mobile=on&layoutdebug=1`
- Commit: **caecbac** (feature), **2a598be** (BUILD_ID stamp)

## REAL-PHONE TEST (Travis)

1. Open cache-busted URL
2. Portrait new random run
3. OPTIONS → **CONTROL HEIGHT** (LOW/MID/HIGH/VERY HIGH)
4. Confirm MOVE/GIVE/SPRINT/LOOK/MENU move together; overlap kept
5. New run: minimap ~**2:1**; gameplay not a square map stretched wide