# FPV FACADE TARGET POLISH REPORT

**Card:** FPV facade target polish  
**Date:** 2026-06-28

## Baseline

| Field | Value |
|-------|-------|
| Backup (local) | `index.before-fpv-facade-target-polish.html` |
| Previous | `wallfix1` / `d419ca9` |
| New BUILD_ID | `facadefix1` |
| Visual reference | Travis before/after image — broad panels, no comb lines (not embedded in game) |

## Cause

Remaining FPV noise came from **per-column facade cues** (`crDrawProceduralFacadeCue` on 3px columns), **8px texture sampling** still too fine for phone, **dense brick/mortar** and **noiseFill** textures, and **per-cell wall shade** contrast.

## Changes

- **`CR_FPV_WALL_TEX_COARSE` 8 → 16** — wider texture bands on buildings
- **`crDrawFpvWorldFacadePanel`** — world-space panel leading edges (4 panels/face), 8px-wide door/window/awning/mural blocks keyed by `mapX/mapY/side` hash
- Removed **`crDrawProceduralFacadeCue`** from the FPV wall loop
- **BUILDING / BRICK / CONCRETE** textures → low-frequency block patches; **FENCE** mesh spacing 8 → 14
- Softer shade **0.94 + 0.06**
- **`CR_FPV_FACADE_TARGET_POLISH = 1`**, **`runFpvFacadeTargetPolishSelfCheck`**

## Preserved

Matte FPV road (`shimmerfix1` stack), nav-first minimap (`streetread1`), building mass ×1.5, level selector, D1–D4, controls/save/Hall, 40×20 map, no moving blockers/NPCs/timers.

## Harness

| Check | Result |
|-------|--------|
| Local `npm run test:selfcheck` | **PASS** |
| Gameplay commit | `2c80f71` |
| CI | https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28318735058 — **success** |
| Artifact | `snc-can-run-proof-artifacts` |

## Proofs

- `proof-fpv-facade-target-polish.json`
- `proof-facadefix-d1.png`, `proof-facadefix-d2-storefront.png`, `proof-facadefix-d3-alley.png`
- `proof-facadefix-minimap-preserved.png`
- `proof-full-selfcheck.json`

## URLs

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=2c80f71&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=2c80f71&mobile=on&portraitlayout=1`