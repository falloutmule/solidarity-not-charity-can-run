# OPTIONS cleanup pass — `optionsclean1`

## Summary

Obsolete global control layout rows were removed from the mobile OPTIONS menu. The menu is grouped into CONTROLS / AUDIO / DISPLAY / HELP / SYSTEM. EDIT CONTROLS (move + SIZE −/+) and RESET CONTROLS are unchanged. LOOK SPEED and DEADZONE remain. Default layout, `cannedRun.controls.v1`, and `SAVE_VERSION` / `cannedRun.save.v1` are unchanged.

## Baseline

| | |
|--|--|
| **Backup** | `index.before-options-cleanup.html` (repo root, gitignored) |
| **Previous BUILD_ID** | `controlsresize1` |
| **Previous gameplay commit** | `14b31e8` |
| **New BUILD_ID** | `optionsclean1` |
| **Gameplay commit** | `8ef75ad` |

## Rows removed (OPTIONS)

- CONTROL DOCK (height)
- JOYSTICK SIZE / JOY SIZE
- BUTTON SIZE
- CONTROL OPACITY / OPACITY
- Also dropped from mobile OPTIONS (layout tuning now in EDIT CONTROLS): LOOK SIZE, MAP SIZE, MOUSE (desktop canvas menu still has NAME / clear-save paths where applicable)

## Rows kept

- EDIT CONTROLS, RESET CONTROLS
- LOOK SPEED, DEADZONE, MOBILE (AUTO/ON/OFF)
- SOUND
- MINIMAP DEFAULT, REDUCE FX
- HOW TO PLAY
- BACK (plus NAME / FULLSCREEN under SYSTEM)

## Section grouping

1. **CONTROLS** — EDIT, RESET, LOOK SPEED, DEADZONE, MOBILE  
2. **AUDIO** — SOUND  
3. **DISPLAY** — MINIMAP DEFAULT, REDUCE FX  
4. **HELP** — HOW TO PLAY  
5. **SYSTEM** — NAME, FULLSCREEN, BACK  

CLEAR ACTIVE SAVE / RESET ALL LOCAL DATA remain on desktop canvas OPTIONS only (labeled separately from RESET CONTROLS).

## Harness

- **`CR.runOptionsCleanupSelfCheck()`** — menu content, cycles, EDIT + resize, RESET, help, BACK, no stuck input  
- **`CR.runFullSelfCheck()`** — includes `optionsCleanup` gate  
- **Playwright** — `optionsCleanupSection`, proofs below  

## Verification

| Check | Result |
|-------|--------|
| Local `npm run test:selfcheck` | **PASS** |
| GitHub Actions | **PASS** — https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28287680708 |
| Artifact | `snc-can-run-proof-artifacts` |

## Proof paths

- `proof-options-cleanup.json`
- `proof-options-cleanup-menu.png`
- `proof-options-cleanup-edit-controls.png`
- `proof-full-selfcheck.json` (includes `optionsCleanup`)
- `proof-edit-controls-resize.json` (unchanged resize path)
- `proof-declarative-controls.json`

## URLs (cache-bust `8ef75ad`)

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=8ef75ad&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=8ef75ad&mobile=on&portraitlayout=1  

## Unchanged

- `SAVE_VERSION` / `cannedRun.save.v1`
- `cannedRun.controls.v1` / custom control persistence
- Default control layout (without overrides)
- Hall, procedural generation, movement/collision, sound behavior, onboarding

## CI

- **Workflow:** SNC Can Run Selfcheck  
- **Run URL:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28287680708