# Walltextures2 Scale and Variation Fix Report

## Goal
Fix walltextures1 stretch/panel bugs: tile each building’s single base material at stable world scale, tune stucco/cinderblock painters, keep role overlays on facade U.

## What was done
- Added `crBuildingMaterialTileU`, `crMaterialTileScaleCells`, `crBuildingMaterialTileUForCell`, `crDrawBuildingMaterialWallColumn`.
- Live FPV + composed facade paths use tiled `materialU` for base; overlays still use `wallX` / facade coords.
- Retuned `crPaintMaterialStucco` and `crPaintMaterialLightGrayCinderblock`.
- `BUILD_ID` → `walltextures2`; allowlists + debug helpers extended.
- `runWalltextures2ScaleVariationSelfCheck`, `crInstallMaterialTextureBenchScene`, Playwright proofs + `corePass` gate.

## What was verified
- `npm run build` — pass
- `npm run build:check` — pass
- `npm run test:selfcheck` — pass (`proof-playwright-summary.json` pass true)
- `proof-walltextures2-scale-variation.json` — pass true (all checks green)

## What failed
- Nothing on final pipeline run.

## Current exact state
- **HEAD:** `50c19432085fe40ab125587bfbd663ac5a63f649`
- **BUILD_ID:** `walltextures2`
- Pushed to `main`.

## Remaining blockers
- None.

## Next actionable step
- Phone check pinned Pages URL; confirm materials read at walking distance (not giant panels).

## Evidence
- commit before: `986f8150a01bba9192c9adcf46da539eb102da21`
- commit after: `50c19432085fe40ab125587bfbd663ac5a63f649`
- BUILD_ID: `walltextures2`
- proof-walltextures2-scale-variation.json: **pass true**
- Pages: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=50c19432085fe40ab125587bfbd663ac5a63f649&mobile=on&portraitlayout=1`