# SNC-CLEAN-P2-010A — Source Ownership Audit

**Baseline:** `aa24619a8473566e5075032b467b410bee6b3bd2` (`chromeinput2`)
**Method:** read-only search and call-path inspection of canonical `src/`; no build or runtime source changed.
**Status:** verified unless marked inferred.

## Result

Two normal-production HUD draw paths contain the historical proof phrase and read the old D1 proof registry. They are not query-gated. In the current ordinary D1 route they are dormant because `genCity()` installs the authored level and that installer clears the registry, but the code remains in the normal HUD functions and can render if an old procedural-D1 state is supplied. This is a production HUD leak in source, not evidence that the current ordinary authored D1 baseline displays the phrase.

## Exact normal-HUD call path

```text
frame() — game-22:409–493
  -> state PLAY, not paused — game-22:457–459
  -> drawHUD(now) — game-18:158–214
     portrait: mobileMode && isMobilePortrait()
       -> drawPortraitStatsPanel() — game-22:158–195
       -> reads game.d1CustomBuildingRegistry.slot_02 — 187
       -> draws “D1 PROOF slot_02 custom_next_001” — 190
     non-portrait:
       -> extraProof lookup — game-18:198
       -> draws the same phrase — 204–207
```

Both lookups are property reads only: no storage, game-state, registry, or layout mutation occurs. The normal draw operations write canvas pixels only.

## Current ordinary-D1 reachability

`genCity()` routes District 1 directly to `sncInstallAuthoredLevel()` and returns (`game-09:3757–3762`). `sncCommitAuthoredLevelState()` then sets `d1CustomBuildingRegistry`, proof-zone state, and related viewer state to null/empty (`game-09a:176–185`). Therefore the ordinary authored D1 run cannot satisfy either HUD condition. The legacy procedural-D1 builder still creates the registry, but its D1 branch is bypassed by the current `genCity()` early return. No query parameter gates the HUD condition.

## Occurrence classification

| Classification | Path / section / lines | Normal-play reachability; query gate | Writer -> reader | Maintained test owner | Phase 2 action |
|---|---|---|---|---|---|
| **normal production HUD leak** | `src/js/game-22-section-13-main-loop.js`, `drawPortraitStatsPanel`, 187–191 | Normal portrait HUD function; dormant on current authored D1, otherwise reachable; no query gate | legacy registry writer below -> property read -> `ctx.fillText` | No focused HUD owner exists; P2-010B to confirm | Remove condition and phrase only; preserve surrounding portrait geometry/content. |
| **normal production HUD leak** | `src/js/game-18-section-9-hud-reticle-popups.js`, `drawHUD`, 198–208 | Normal non-portrait HUD function; same dormant condition; no query gate | legacy registry writer below -> `extraProof` -> canvas text | No focused HUD owner exists; P2-010B to confirm | Remove `extraProof` and its panel-height contribution; retain ordinary meta panel. |
| **legitimate authored-level identity** | `src/levels/district-01-authored.js`, authored landmark, 110–121 | Current ordinary D1; no query gate | authored definition -> authored installer/registry -> generic bitmap renderer | `test:authored-d1`, `test:authored-d1-smoke`, `test:authored-d1-save` | Retain `custom_next_001`; it is the real 6×3 building ID, not proof UI. |
| **legitimate bitmap asset identity** | `src/imported-handoff-assets/custom_next_001.asset.js`, asset declaration/load state, 1–27 | Manifest-loaded production asset; no query gate | asset module -> `BITMAP_BUILDING_ASSET_REGISTRY` -> generic bitmap renderer | `test:custom-next`; bitmap renderer verifier | Retain unchanged. |
| **legitimate bitmap asset identity** | `src/build-manifest.json`, script input, 21 | Production build input | manifest -> embedded artifact | build/check; `test:custom-next` | Retain unchanged. |
| **historical/dead candidate** | `src/js/game-09-section-3-city-generation.js`, `crDrawPendingArtReviewFaceCanvas` / `crGetPrefabFaceCanvas`, 2301–2405 | Reached only through legacy prefab renderer path; generic bitmap renderer handles the authored asset first; legacy procedural D1 is bypassed | `CUSTOM_NEXT_001_IMAGE`/asset ID -> cached canvas -> `crDrawPrefabFaceColumn` | No maintained owner directly exercises this old branch | Do not alter in Phase 2; renderer retirement requires its own inventory card. |
| **historical/dead candidate** | `src/js/game-09-section-3-city-generation.js`, proof-zone helpers/audit/illegal renderer, 2408–2628 | Requires legacy `d1CustomProofZone.mode === 'prefab_only'`; current authored D1 clears it; no query gate | legacy registry/grid -> helpers; illegal renderer appends `game.d1ProofIllegalHits` and warns | No maintained direct owner found by source search | Do not alter in Phase 2. It has diagnostic side effects only when the obsolete branch is entered. |
| **historical/dead candidate** | `src/js/game-09-section-3-city-generation.js`, `crPlaceD1ProofSlotBuilding`, 2630–2712 | Only legacy procedural D1 placement; bypassed by current authored D1 | slot definitions -> writes registry, map, building grid, proof-zone map, and optional signboard -> HUD/render helpers | No maintained direct owner found; authored D1 instead asserts these fields are absent | Do not alter in Phase 2; this is broader historical-generator cleanup. |
| **historical/dead candidate** | `src/js/game-09-section-3-city-generation.js`, purge/place helpers, 2715–2761 | Called only after legacy registry creation | proof zone/slots -> map/grid/registry writes | Same as above | Do not alter in Phase 2. |
| **historical/dead candidate** | `src/js/game-09-section-3-city-generation.js`, `crInitD1CustomBuildingRegistry`, 2807–2920; `crPlaceD1CustomBuildingProofProps`, 2923–2930; caller 2934–2989 | Legacy D1 branch creates `slot_02`, `d1ProofSlotId`, `proofZone`, `visualOnly`, and visible world signboards; bypassed by `genCity` D1 early return | `crAssignPrefabBuildings` -> registry/props -> HUD and renderer readers | No maintained direct owner found | Do not alter in Phase 2; this is the writer for the HUD leak and proof-zone state. |
| **historical/dead candidate** | `src/js/game-16-section-7-render.js`, `crDrawPrefabFaceColumn`, 31–88; scene proof branch, 154–194 | Requires proof mode/legacy registry unless generic bitmap path handles the building first | legacy registry/proof helpers -> old renderer; illegal branch may append/warn through helper | Bitmap renderer verifier deliberately keeps generic renderer free of these terms | Do not alter in Phase 2. |
| **historical/dead candidate** | `src/js/game-09-section-3-city-generation.js`, material/facade guards, 940; 1420–1423; 1449–1454; 1772–1799; 1823–1826, and `game-09c-section-facadeskins1-bitmap-facades.js`:941–943 | All require legacy proof mode/zone | proof-mode readers -> early return from material/facade rendering | No maintained direct owner found | Do not alter in Phase 2. |
| **legitimate authored-level identity** | `src/js/game-09a-authored-level-runtime.js`, `sncCommitAuthoredLevelState`, 150–190 | Current ordinary D1, no query gate | authored state writer -> clears legacy proof fields -> HUD conditions remain false | `test:authored-d1` | Retain; it is the current boundary that protects ordinary D1. |
| **test-only dependency** | `tests/authored_d1_level_verify.js`, 108–128 | Node focused authored-level test | authored registry/cells -> asserts real asset and absence of proof-slot fields | `test:authored-d1` | Retain semantic absence assertions; no proof text dependency. |
| **test-only dependency** | `tests/custom_next_001_face_reuse_runtime_verify.js`, 161–163; `tests/bitmap_building_renderer_verify.js`, 19–25 | Node focused asset/renderer tests | asset/generic renderer -> asserts proof vocabulary is absent from those generic modules | `test:custom-next`; bitmap renderer verifier | Retain; these protect generic ownership, not the historical HUD phrase. |

## Vocabulary coverage notes

- `custom_next_001` in authored data, the manifest, and the asset module is legitimate production identity and must not be globally banned.
- `slot_02`, `d1ProofSlotId`, `d1CustomProofSlot`, `proofZone`, and `visualOnly` occur in the legacy procedural-D1 proof subsystem. The current authored D1 test explicitly proves those fields do not enter authored registry/cells.
- The exact phrase `D1 PROOF slot_02 custom_next_001` occurs only in the two HUD owners above; the generated artifact contains both copies.
- Legacy world signboard text (`SLOT 02 … PENDING REVIEW`) is separate from the HUD leak. It is unreachable from current authored D1 but is not part of the narrow Phase 2 HUD removal.

## Bounded recommendation

**Verified candidate scope:** remove only the two normal-HUD proof-label branches in `game-22` and `game-18`, plus one focused semantic regression test selected after P2-010B. Do not touch the authored level, asset, generic bitmap renderer, legacy proof-zone generator, renderer fallbacks, input, saves, or build manifest in Phase 2.

**Untested:** this source audit did not execute a browser session or any test; P2-010B owns maintained-test dependency proof and P2-010C owns normal portrait baseline evidence.
