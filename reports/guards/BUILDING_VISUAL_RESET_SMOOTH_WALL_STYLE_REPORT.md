# Building visual reset / smooth wall style report

**Previous baseline:** `facadefinal1` / `0761c94`
**New BUILD_ID:** `buildingsmooth1`
**Gameplay commit:** pending
**CI URLs:** pending until pushed workflow completes

## Visual issue addressed

The `facadefinal1` pass improved systems, grounding, and proof coverage, but the visible building art still looked worse than the earlier smoother wall feel. Close phone views could read as modular slabs, pasted panels, stripe fields, or over-rendered storefront wallpaper. This pass explicitly stops trying to solve building readability with more facade micro-detail and restores the cleaner art direction first: smooth stylized wall masses, sparse object cues, and low-noise D2/D3 close wall views.

## What was removed or reduced

- Reduced wall-wide red/tan/dark slab dominance.
- Reduced repeated panel seams and high-contrast horizontal marks.
- Reduced storefront sign/glass dominance; storefront glass is now small/inset instead of full-wall.
- Reduced boarded-shop line count and keeps boards inside a small window box.
- Reduced D3 garage bay contrast and roll-up line strength.
- Reduced side/back wall details to almost blank wall masses with at most one subdued cue.
- Removed the previous visual tendency toward fake high-detail storefront wallpaper.

## What was kept

- Existing `CR_FACADE_PACK` data and six gameplay modules.
- Existing composed facade rendering entrypoint.
- D2 storefront, D2 boarded-shop, D3 garage/service, and side/back proof targets.
- FPV ground-plane / wall-base alignment.
- Spriteground anchors and NPC/can/prop grounding.
- D1 park/plaza/pavilion identity.
- Split-source build pipeline and generated root `index.html` workflow.
- Controls/options/edit controls, save/load, Hall, matte road, minimap, level selector, and D1-D4 layouts.
- No external assets and no lab-only modules.

## Implementation summary

- Added `CR_BUILDING_SMOOTH_STYLE = 1`.
- Added smooth-wall helpers:
  - `crSmoothWallPalette(...)`
  - `crDrawSmoothBuildingMaterialBase(...)`
  - `crDrawSmoothBuildingFaceColumn(...)`
- `crDrawComposedFacadeFaceColumn(...)` now routes gameplay building module faces through the smooth style while preserving the facade pack and composition entrypoint.
- Added `CR.crDebugBuildingSmoothStyle()`.
- Added `CR.runBuildingSmoothStyleSelfCheck()` and included it in `CR.runFullSelfCheck()`.
- Updated older preserved guards to accept `buildingsmooth1` as the successor build id.
- Updated Playwright to write buildingsmooth proof JSON/screenshots.

## Preservation confirmations

- Smooth wall style is active.
- Groundplane alignment is preserved.
- Spriteground anchors are preserved.
- Facade pack/composition is preserved and intentionally simplified in visible output.
- No new modules imported.
- D2/D3 close wall views are improved by smoother/lower-noise wall rendering.
- D2 storefront/boarded-shop readability is preserved with sparse cues.
- D3 garage/service readability is preserved with a cleaner, lower-contrast bay.
- D1 identity remains park/plaza/pavilion.
- Split build pipeline is preserved; root `index.html` was regenerated from `src/`.
- Controls/save/Hall, matte road, minimap, level selector, and D1-D4 direct starts remain guarded.

## Commands

```bash
npm run build
npm run build:check
npm run test:selfcheck
```

Local results:

- `npm run build`: PASS; regenerated root `index.html` from `src/`.
- `npm run build:check`: PASS, `{"pass":true,"check":"pass","output":"index.html","bytes":601165}`.
- `npm run test:selfcheck`: PASS, `{"pass":true,"proofs":"proof-*.json in repo root"}`.

## Proof artifacts

Required buildingsmooth proofs:

- `proof-buildingsmooth-style.json`
- `proof-buildingsmooth-debug.json`
- `proof-buildingsmooth-d2-road-view.png`
- `proof-buildingsmooth-d2-close-wall.png`
- `proof-buildingsmooth-d2-storefront.png`
- `proof-buildingsmooth-d2-boarded-shop.png`
- `proof-buildingsmooth-d3-garage-service.png`
- `proof-buildingsmooth-d3-side-wall.png`
- `proof-buildingsmooth-d1-preserved.png`
- `proof-buildingsmooth-groundplane-preserved.png`
- `proof-buildingsmooth-minimap-preserved.png`
- `proof-full-selfcheck.json`
- `proof-playwright-summary.json`

Local proof summary:

- `proof-buildingsmooth-style.json`: PASS / `buildingsmooth1`.
- `proof-buildingsmooth-debug.json`: confirms smooth style flag/helper, facade pack, expected D2/D3 proof targets, limited boarded-shop marks, limited garage marks, side/back quietness, no lab-only modules, groundplane helpers active, and spriteground helpers active.
- `proof-playwright-summary.json`: PASS, including `sourceBuildPipeline`, `buildingSmoothStyle`, `fpvGroundPlaneAlignment`, `spriteGroundAnchor`, `facadeArtVocabulary`, `facadeCompositionReadability`, and `releaseArtifact`.

## Visual review note

The configured AI vision backends were unavailable during local review (`grok-4.3` account/model mismatch and browser OAuth credential validation failure), so the review relied on generated screenshots, runtime selfcheck proofs, and image-complexity metrics. D2 proof metrics showed lower FPV-region edge/color complexity versus `facadefinal1`; D3 was further simplified after an initial metric pass to reduce garage/side contrast.

## URLs

- Play: pending until final commit
- Self-check: pending until final commit
