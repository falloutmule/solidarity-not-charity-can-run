# D2/D3 facade readability final polish report

**Previous baseline:** `groundplane1` / `9d48802`
**New BUILD_ID:** `facadefinal1`
**Gameplay commit:** `c8dc483` — `fix(render): polish D2 D3 facade readability`
**CI URLs:** selfcheck https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28343655976; Pages https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28343655808

## Visual issue addressed

After `groundplane1`, NPC/can/prop grounding was fixed, but D2/D3 facades still read too much like broad, chunky slabs on phone: large red/tan/dark panels, boarded areas that felt wall-wide, and garage/service faces that could read as pasted dark rectangles instead of small-town building details.

## What changed in facade drawing

This pass keeps the existing facade pack, module list, and composition renderer, but tunes the art vocabulary inside `crDrawComposedFacadeFaceColumn`:

- Storefront faces now use smaller, calmer sign bands with thin borders.
- Storefront windows are inset/framed rectangles with clear wall margins, dividers, highlights, and a visible kickplate/base below.
- Storefront doors are narrower, distinct rectangles with upper lite, lower panel, handle mark, and threshold cue.
- Boarded shops draw the window box first, then 3–4 plank lines only inside that box; wall color remains visible around the boarded window.
- Garage/service faces draw a frame first, then an inset roll-up door with contained horizontal roll-up lines and a distinct service/utility detail.
- Side/back/service faces stay quiet: soft wall treatment and at most one small door/vent/utility cue, with no barcode/high-frequency stripes.

## Preservation confirmations

- Groundplane wall-base alignment preserved.
- Spriteground anchors preserved; NPC/can/prop grounded deltas still pass.
- Facade pack/composition renderer preserved.
- Current six gameplay modules preserved.
- No lab-only modules imported.
- D1 identity remains park/plaza/pavilion.
- D2 storefront readability improved.
- D2 boarded-shop readability improved.
- D3 garage/service readability improved.
- D3 side/back readability improved.
- Split-source build pipeline preserved; root `index.html` regenerated from `src/`.
- Matte road preserved.
- Minimap remains navigation-first.
- Building mass remains substantial.
- Level selector still works for D1-D4.
- D1-D4 can start directly.
- People, cans, and exit remain reachable D1-D4.
- Props remain non-collision.
- No moving blockers, moving NPCs, timers, interiors, floor-zone gameplay, map-size changes, or external assets added.
- Controls/options/edit controls remain functional.
- Hall remains functional.
- Save/load remains functional with `SAVE_VERSION = 1`.

## Self-check and debug helpers

- Added `CR.runD2D3FacadeReadabilityFinalSelfCheck()`.
- Added `CR.crDebugFacadeReadabilityFinal()`.
- Included the new self-check in `CR.runFullSelfCheck()`.
- Updated the Playwright selfcheck harness to capture required `proof-facadefinal-*` artifacts.

## Commands

```bash
npm run build
npm run build:check
npm run test:selfcheck
```

Local results:

- `npm run build`: PASS; regenerated root `index.html` from `src/`.
- `npm run build:check`: PASS, `{"pass":true,"check":"pass","output":"index.html","bytes":589504}`.
- `npm run test:selfcheck`: PASS, `{"pass":true,"proofs":"proof-*.json in repo root"}`.

## Proof artifacts

- `proof-facadefinal-readability.json`
- `proof-facadefinal-debug.json`
- `proof-facadefinal-d2-storefront.png`
- `proof-facadefinal-d2-boarded-shop.png`
- `proof-facadefinal-d3-garage-service.png`
- `proof-facadefinal-d3-side-back.png`
- `proof-facadefinal-d1-preserved.png`
- `proof-facadefinal-groundplane-preserved.png`
- `proof-facadefinal-minimap-preserved.png`
- `proof-full-selfcheck.json`
- `proof-playwright-summary.json`

## Local proof summary

- `proof-facadefinal-readability.json`: PASS / `facadefinal1`.
- `proof-facadefinal-debug.json`: confirms facade pack version `facadeart1`, six modules, expected roles, D2 storefront target, D2 boarded-shop target, D3 garage/service target, D3 side/back target, groundplane helpers active, spriteground helpers active, and no lab-only modules.
- `proof-playwright-summary.json`: PASS, including `sourceBuildPipeline`, `d2D3FacadeReadabilityFinal`, `fpvGroundPlaneAlignment`, `spriteGroundAnchor`, `facadeArtVocabulary`, `facadeCompositionReadability`, and `releaseArtifact`.

## URLs

- Play: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=c8dc483&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=c8dc483&mobile=on&portraitlayout=1
