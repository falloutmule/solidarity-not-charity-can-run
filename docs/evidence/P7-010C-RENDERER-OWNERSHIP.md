# P7-010C Renderer Ownership Map

**Scope:** read-only P7-010C map on `main` / `chromeinput2`.  This report
classifies ownership; it makes no runtime, test, metadata, artifact, or build
change.  `index.html` was not inspected as an editable input.

## Result

Normal authored District 1 has one active whole-face bitmap route:

`district-01-authored.js` data -> `game-09a-authored-level-runtime.js`
prepare/commit -> `game.buildingRegistry` + `game.buildingGrid` -> DDA hit in
`game-16-section-7-render.js` -> `drawWholeFaceBitmapBuildingColumn()` in
`game-16a-bitmap-building-renderer.js` -> `custom_next_001` atlas slice.

The generic renderer owns a handled `importedWholeFaceAsset` hit, including an
invalid or not-yet-loaded asset: it paints its magenta failure column and
returns `true`.  Therefore the older prefab, skin, material, and procedural
branches are **not** failover for an ordinary authored-D1 `custom_next_001`
hit.  They remain compatibility/special-scene paths.

## Ownership by concern

| Class | Owner(s) | Evidence and boundary |
| --- | --- | --- |
| Data | `src/imported-handoff-assets/custom_next_001.asset.js` | Defines the `snc-bitmap-building-asset-v1` asset, `importedWholeFaceAsset` mode, 6x3 footprint, 1280x160 atlas, face slices, U directions, east reuse by west without mirroring, load state, and global bitmap registry entry. |
| Data | `src/levels/district-01-authored.js` | Frozen D1 definition is 40x20, places the 6x3 `custom_next_001` landmark at `(8,5)`, rotation 0, front south.  Static identity is part of authored-level validation. |
| Lookup | `src/js/game-16a-bitmap-building-renderer.js` | Looks up only `BITMAP_BUILDING_ASSET_REGISTRY` (with two compatible registry aliases), validates schema/mode/footprint/faces, resolves world face -> local face -> reusable descriptor -> atlas slice, and retains a module-local face-canvas `Map`. |
| Preparation | `src/js/game-09a-authored-level-runtime.js` | Validates locked D1 data, creates its map, registry entry, and one `{bid,lx,ly}` grid cell per footprint cell.  Commit installs that prepared state atomically into `game`; it does not create facade roles, material components, or legacy prefab-face canvases. |
| Dispatch | `src/js/game-09-section-3-city-generation.js` | `genCity()` calls `sncInstallAuthoredLevel()` and returns immediately for district 1.  The following procedural city setup and facade-profile assignment are consequently non-D1 work. |
| Dispatch | `src/js/game-16-section-7-render.js` | Each DDA column finds `game.buildingGrid[mapY][mapX]` and registry owner.  A registry mode of `importedWholeFaceAsset` is offered to the generic renderer before proof, old prefab, material, flat, composed-facade, and raw-texture paths. |
| Rendering | `src/js/game-16a-bitmap-building-renderer.js` | `drawWholeFaceBitmapBuildingColumn()` calculates full-building canonical U from `{lx,ly}`, hit fraction, face direction, and rotation; samples one atlas-face column with smoothing disabled.  It owns magenta fail-loud drawing for invalid schema/atlas/face/load/canvas work. |
| Diagnostics | `src/js/game-21a-section-12b-perf-probe.js` | Query-gated probe wraps the generic whole-face function and records call timing/handled count.  This is the current bitmap timing observation point. |
| Diagnostics | `src/js/game-20a-render-angle-smoothing.js`, `game-22-section-13-main-loop.js` | Fixed-step pose history supplies interpolated position; selected `ffangle` mode supplies render-only angle before `drawScene()`.  D1 map/asset data does not participate in this selection. |
| Diagnostics | `src/js/game-16b-far-field-projection.js` | `ffproj` affects distant billboard sprites after wall drawing, not wall/facade bitmap columns.  Subpixel runs use the wall z-buffer for occlusion. |
| Compatibility fallback | `src/js/game-16-section-7-render.js` plus `game-09-section-3-city-generation.js` | Retained order after the generic route is D1 proof renderer, legacy `crDrawPrefabFaceColumn`, material wall, flat wall, composed facade, then raw wall texture/world panel.  These serve other modes/scenes; they are not an imported-asset recovery path. |

## Active authored-D1 data and lookup detail

`sncPrepareAuthoredLevelState()` accepts only validated authored data and
creates registry entry `bid: 1` with `assetId`, `renderMode`, rotation,
footprint, and front.  Its grid is deliberately ownership-only (`bid`, `lx`,
`ly`).  The renderer receives the same cell and registry record from the DDA
hit; no facade-skin profile lookup is involved.

The generic asset lookup is deliberately separate from the older
`CR_PREFAB_ASSETS` catalog.  `custom_next_001.asset.js` registers the asset in
the bitmap registry and starts the atlas `Image` load.  The generic renderer
requires a loaded image whose natural dimensions match the asset contract.
It resolves `west` via the declared `east` reuse, rejects undeclared unsafe
mirroring, and creates a cached face canvas from the declared atlas slice.

For each raycast column, it maps world hit side and DDA step to a world face,
inverse-rotates to local face, derives the continuous local position across
the complete 6x3 footprint, applies the face's declared U direction, then
draws one source column.  This is the active whole-face facade ownership.

## Legacy/special routes retained in source

| Route | Classification | Why it is not normal authored D1 |
| --- | --- | --- |
| `crDrawPrefabFaceColumn()` in `game-16-section-7-render.js` | Compatibility renderer + limited prefab debug writer | Handles `exactImportedBitmap` and `pendingArtReviewAsset`, and has old full-face `faceU` arithmetic.  Generic handling preempts it for the authored D1 registry's `importedWholeFaceAsset` mode. |
| `crGetPrefabFaceCanvas()` and `crDrawPendingArtReviewFaceCanvas()` in `game-09-section-3-city-generation.js` | Special/historical compatibility canvas route | `custom_next_001` here is rendered as a “PENDING ART REVIEW” panel.  The generic path does not call it; a generic failure is magenta, not this panel. |
| `crDrawD1ProofPrefabFaceColumn()` and D1 proof-zone helpers | Special proof route | Reached only when proof mode/zone gates are active and the generic renderer did not already own the column. |
| `crDrawBitmapFacadeSkinWallColumn()` in `game-09c-section-facadeskins1-bitmap-facades.js` | Legacy facade-skin route | It resolves span/profile/material and cached generated skins, but is build-ID gated to older facade builds and D1-proof-zone gated. `chromeinput2` normal D1 does not dispatch to it. |
| `crDrawBuildingMaterialWallColumn()` / `crDrawComposedFacadeFaceColumn()` | Procedural/material compatibility | Used only after generic/prefab/proof dispatch misses and relevant texture flags/roles apply. |
| Flat and raw texture/world-panel branches in `drawScene()` | Procedural fallback | Final non-prefab wall presentation for ordinary non-bitmap or unowned cells. |

These routes include meaningful historical and test contracts.  This map does
not recommend deletion, consolidation by behavior change, or treating their
presence as proof that the current D1 renderer can safely fall back to them.

## Projection and render-angle boundary

The main loop first applies input and fixed-step simulation, produces an
interpolated render pose, then chooses a render-only angle (`raw`, `interp`,
or `smooth`; production default resolves to `interp`).  `drawScene()` consumes
that pose for the DDA wall pass.  Thus full-face U selection follows the
rendered camera angle and interpolated position, while map/registry data stays
simulation-owned.

Far-field projection is a later sprite-only branch.  At depth >= 8 it can
draw subpixel billboard runs using the already-filled wall z-buffer.  It does
not project, quantize, or sample bitmap building faces.  Keeping this boundary
explicit is important: a far-field sprite or render-angle card is not a
facade-renderer refactor.

## `facadedebug` diagnostic boundary

`?facadedebug=1` is initialized by HUD code into
`game.prefabDebugEnabled`; the HUD reads `game.debugFacadeHit`.  The legacy
skin renderer writes detailed center-ray skin diagnostics only on its own
route.  The legacy prefab renderer writes a smaller prefab record when it is
reached.  The active generic whole-face renderer does **not** currently write
a `debugFacadeHit` record.  Consequently this diagnostic is useful for legacy
route identification, but it is not proof of the active authored-D1 generic
lookup/face/U result.  Perf-probe bitmap timing is the current generic-path
diagnostic instead.

## Low-risk organizational seams only

No source seam is proposed here: moving any dispatch or fallback code changes
the wall-column control flow and would require behavior verification, including
new screenshot/visual baselines.  The only low-risk, non-deletion seams are
documentation-level ownership labels:

1. Keep this path map adjacent to any future renderer card, with explicit
   labels for **active generic**, **proof-only**, and **compatibility** routes.
2. If a future diagnostics-only card is authorized, describe generic bitmap
   hits in a separate diagnostic record rather than changing the legacy
   `facadedebug` schema.  That remains a prospective card, not a change
   proposed or made by P7-010C.

No screenshot rebaseline is needed for this evidence-only report.
