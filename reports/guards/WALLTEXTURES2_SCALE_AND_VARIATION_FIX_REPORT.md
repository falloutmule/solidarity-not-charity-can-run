# Walltextures2 Scale and Variation Fix Report

## Goal
Fix walltextures1 stretch/panel bugs: tile each building’s single base material at stable world scale, tune stucco/cinderblock painters, keep role overlays on facade U.

## What was done
- Added `crBuildingMaterialTileU`, `crMaterialTileScaleCells`, `crBuildingMaterialTileUForCell`, `crDrawBuildingMaterialWallColumn`.
- Live FPV + composed facade paths use tiled `materialU` for base; overlays still use `wallX` / facade coords.
- Retuned `crPaintMaterialStucco` and `crPaintMaterialLightGrayCinderblock`.
- `BUILD_ID` → `walltextures2`; allowlists extended in `game-22`.
- `runWalltextures2ScaleVariationSelfCheck`, `crInstallMaterialTextureBenchScene`, Playwright proofs + `corePass` gate.

## What was verified
- Pending: `npm run build`, `build:check`, `test:selfcheck` on this workstation.

## What failed
- None yet (pre-pipeline).

## Current exact state
- Base commit before card: `986f8150a01bba9192c9adcf46da539eb102da21`
- BUILD_ID: `walltextures2` (local, uncommitted until push)

## Remaining blockers
- None after green pipeline + push.

## Next actionable step
- Run full selfcheck; commit `fix(render): tile building wall textures at world scale`; pin Pages `?v=<sha>`.

## Evidence
- `proof-walltextures2-scale-variation.json`
- `proof-walltextures2-*.png` (four materials + mixed street + minimap)
- `proof-playwright-summary.json`