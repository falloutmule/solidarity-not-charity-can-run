# Single-material building textures report

**Card:** `SINGLE_MATERIAL_BUILDING_TEXTURES`  
**BUILD_ID:** `walltextures1`  
**Date:** 2026-07-02

## Done

- Deterministic per-building `materialKey` in `game.buildingRegistry` (`stucco`, `red_brick`, `light_gray_cinderblock`, `aluminum_siding`).
- Procedural atlas entries `material_*` and `crGetBuildingMaterialTextureForFace` for continuous-facade base sampling.
- Live draw: `crDrawComposedFacadeFaceColumn` uses building material base + `crDrawFpvFacadePackRoleOverlays` for doors/windows/signs/boards/garage.
- Smooth path base fill uses registry `materialKey`; debug hit exposes `buildingMaterial` / `baseMaterial` / `baseTextureKey`.
- `CR.runSingleMaterialBuildingTextureSelfCheck()` + Playwright `singleMaterialBuildingTextureSection` (`corePass`).
- Continuous-facade harness accepts `crGetBuildingMaterialTextureForFace` in raycaster sampling check.

## Verified

```bash
npm run build          # PASS
npm run build:check    # PASS
npm run test:selfcheck # PASS (proof-playwright-summary.json pass: true)
```

`proof-single-material-building-textures.json`: `pass: true`, all four materials seen across seeds, `noFaceMaterialMismatch: true`.

## Failed

- **Runtime (pre-fix):** `drawScene` still routed building walls through `crDrawFlatBuildingWallColumn` (`CR_PROPS1_RESTORE_SIMPLE_MATERIALS`), so atlas/registry changes never reached the live FPV path. Fixed in `game-16-section-7-render.js` + composed-facade priority in `game-09`.

## Current state

- **Repo:** `falloutmule/solidarity-not-charity-can-run`
- **Branch:** `main`
- **Prior HEAD:** `3a7b3d1` (engine hardening / `feel2`)
- **BUILD_ID:** `walltextures1`
- **SAVE_VERSION:** unchanged (1)
- **Gameplay / controls / fixed-step:** no intentional regressions; nested harness checks green.

## Proof artifacts

- `proof-single-material-building-textures.json`
- `proof-single-material-d1.png` … `proof-single-material-d4.png`

## Next actionable step

- Push and pin Pages `?v=<full-sha>`; optional phone spot-check for wall material read at street distance.