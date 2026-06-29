# Continuous facade texture / no panel gaps report

**Previous baseline:** `buildingsmooth1` / `0b41159`
**New BUILD_ID:** `facadetexture1`
**Gameplay commit:** `c511936` — `fix(render): use continuous facade textures`
**CI URLs:** selfcheck https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28372414445; Pages https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28372413468

## Visual issue addressed

The `buildingsmooth1` pass calmed wall colors, but close phone views still exposed the renderer's panelized facade model. Building faces were drawn as visible role chunks: face → role panel → inset box/frame → visible panel edge. That caused walls to read as separated blocks with gaps, pasted purple/tan/dark rectangles, and modular chunks instead of continuous buildings.

This pass changes the rendering model so buildings are textures first. Each module face samples a generated procedural canvas by continuous `faceU`; sparse details are painted into that canvas. The facade pack remains metadata for choosing/generated textures, not visible grid geometry.

## Rendering model change

- Added generated procedural facade texture atlas canvases:
  - `storefront_4x2_south` — 256×128
  - `storefront_3x2_south` — 240×128
  - `boarded_shop_3x2_south` — 240×128
  - `garage_service_4x2_south` — 256×128
  - `blank_side` — 128×128
  - `service_back` — 128×128
  - `pavilion_front` — 320×128
  - `fallback_smooth_wall` — 128×128
- Added `crBuildFacadeTextureAtlas()`.
- Added `crGetFacadeTextureForFace(moduleId, faceDir, roleId)`.
- Added `crDrawContinuousFacadeTextureColumn(ctx, col, drawStart, sliceH, texture, faceU)`.
- Updated `crDrawComposedFacadeFaceColumn(...)` so gameplay module faces now draw one vertical slice from the selected texture using `faceU`.
- Kept the old facade-pack/module role metadata and current six gameplay modules unchanged.
- Kept the old smooth/panel helpers available for historical guards, but they are no longer the primary visible rendering path for module faces.

## Visual confirmations

- Close wall views no longer use live inset role panels as primary rendering.
- D2 storefronts are continuous facade textures with sparse painted-in windows/door/sign details.
- D2 boarded shops keep boards inside window boxes and avoid wall-wide board stripes.
- D3 garage/service bay is painted into the continuous concrete/stucco wall texture rather than drawn as a pasted dark slab.
- Side/back walls are quiet continuous wall textures with only tiny utility/vent cues.
- Continuous texture fallback exists for missing module/face texture cases.

## Preservation confirmations

- `CR_FACADE_PACK` still exists as source metadata.
- The current six gameplay modules remain unchanged:
  - `storefront_4x2`
  - `storefront_3x2`
  - `restroom_pavilion`
  - `blank_service_block`
  - `garage_service_4x2`
  - `boarded_shop_3x2`
- No lab-only modules were imported.
- Groundplane alignment is preserved.
- Spriteground anchors are preserved.
- NPC/can/prop grounding still passes.
- Wall base/floor alignment still passes.
- D1 identity remains park/plaza/pavilion.
- Matte road and navigation-first minimap remain preserved.
- Building mass remains substantial.
- Level selector still works for D1-D4.
- D1-D4 can start directly.
- People/cans/exit remain reachable D1-D4.
- Props remain non-collision.
- No moving blockers, NPC timers, or new gameplay blockers were added.
- Controls/options/edit controls, Hall, and save/load remain functional.
- Split-source build pipeline remains active; root `index.html` was regenerated from `src/`.
- No external assets or runtime-loaded files were added.

## Self-checks and debug helpers

- Added `CR.runContinuousFacadeTextureSelfCheck()`.
- Added `CR.crDebugContinuousFacadeTexture()`.
- Updated `CR.runFullSelfCheck()` to include `continuousFacadeTexture`.
- Updated Playwright to write continuous facade texture proof JSON and screenshots.

`CR.runContinuousFacadeTextureSelfCheck()` verifies:

- `BUILD_ID` is `facadetexture1`.
- Split-source pipeline flag is active and root artifact is generated from source.
- The facade texture atlas and required textures exist.
- Raycaster module-face rendering samples textures by continuous `faceU`.
- `crFacadeArtPanelInset(...)` is not the primary visible rendering path for module faces.
- Live framed panel boxes are not the primary visible rendering path for module faces.
- Facade pack metadata and six gameplay modules are preserved.
- No lab-only modules are present.
- Groundplane, sprite anchors, D1 identity, matte road, minimap, level selector, D1-D4 starts, reachability, props, controls, Hall, save/load, no external assets, and no runtime errors all remain guarded.

## Commands

```bash
npm run build
npm run build:check
npm run test:selfcheck
```

Local results:

- `npm run build`: PASS; regenerated root `index.html` from `src/`.
- `npm run build:check`: PASS, `{"pass":true,"check":"pass","output":"index.html","bytes":623951}`.
- `npm run test:selfcheck`: PASS, `{"pass":true,"proofs":"proof-*.json in repo root"}`.

## Required proof artifacts

- `proof-facadetexture-continuous.json`
- `proof-facadetexture-debug.json`
- `proof-facadetexture-d2-road-view.png`
- `proof-facadetexture-d2-close-wall.png`
- `proof-facadetexture-d2-storefront.png`
- `proof-facadetexture-d2-boarded-shop.png`
- `proof-facadetexture-d3-garage-service.png`
- `proof-facadetexture-d3-side-wall.png`
- `proof-facadetexture-d1-preserved.png`
- `proof-facadetexture-groundplane-preserved.png`
- `proof-facadetexture-minimap-preserved.png`
- `proof-full-selfcheck.json`
- `proof-playwright-summary.json`

Local proof summary:

- `proof-facadetexture-continuous.json`: PASS / `facadetexture1`; all required continuous texture checks true.
- `proof-facadetexture-debug.json`: PASS; records texture atlas keys/sizes, module-to-texture mappings, D2/D3/side sample mappings, continuous `faceU` sampling, panel-inset bypass, and no lab-only modules.
- `proof-full-selfcheck.json`: PASS / `facadetexture1`.
- `proof-playwright-summary.json`: PASS, including `sourceBuildPipeline`, `continuousFacadeTexture`, `buildingSmoothStyle`, `fpvGroundPlaneAlignment`, `spriteGroundAnchor`, controls/save/Hall, network, console, and release artifact checks.

## URLs

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=c511936&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=c511936&mobile=on&portraitlayout=1`
