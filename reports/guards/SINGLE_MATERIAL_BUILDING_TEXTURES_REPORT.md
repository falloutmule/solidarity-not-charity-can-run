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

- None.

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