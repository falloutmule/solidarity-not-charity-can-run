# True Half-Block Renderer Map

**Cards:** HB-000, HB-010
**Inspected base:** `feature/runtime-asset-gallery-level` at
`61849f69e8e51a586084b026c26e638fd03f3213`
**Status:** Mapping complete. Implementation is blocked pending review of the
required renderer-foundation extension described below.

## Scope and exclusion boundary

This is a read-only map of the accepted gallery base. It adds no runtime
behavior, asset, proof level, or generated artifact. It does not reuse PR #27.
PR #27's alpha-cutout/dumpster path is explicitly outside the proposed
extension surface.

The base itself contains no `half_block_debug_001` source, compiled asset, or
proof level. A separate local-only documentation sequence exists on the
checked-out gallery worktree, but it is not part of this proof branch and was
not used as an implementation base.

## Current raycaster contract

### DDA and hit ownership

`src/js/game-16-section-7-render.js` performs exactly one horizontal DDA
traversal for each internal render column.

1. It advances `mapX/mapY` until `World.rawCell(mapX, mapY) !== 0`
   (lines 111-126).
2. It retains only that first hit's horizontal side, step direction, wall
   fraction, and perpendicular depth (lines 128-140).
3. It stores one scalar depth: `zbuffer[col] = d` (line 130).
4. It draws one vertically continuous full-wall span for that first hit.

`zbuffer` is a `Float32Array(RW)` documented as a per-column wall-distance
buffer in `src/js/game-01-section-0-canvas-resolution.js` line 10. It has no
per-pixel Y dimension, layered depths, or depth intervals.

### Side-face direction and UV seam

The generic bitmap-building renderer already provides a suitable, generic
horizontal side-face seam:

- `resolveBitmapWorldFace` maps DDA side/step to world `south/east/north/west`
  (`src/js/game-16a-bitmap-building-renderer.js`, lines 23-27).
- `inverseRotateBitmapFace` maps the world face into the placed asset's local
  face for `rotationQ` (`lines 29-34`).
- `resolveBitmapLocalHit` and `orientBitmapCanonicalU` calculate the local
  along-face coordinate without camera-facing switching (`lines 36-62`).
- `drawWholeFaceBitmapBuildingColumn` samples the resolved face one source
  column at a time (`lines 215-250`).

The existing seam supports a rectangular footprint. It does not model a top
plane or partial visual height.

### Camera, horizon, and vertical projection

The renderer uses a simplified wall-height projection, not a world-Z camera
model or a vertical ray per rendered pixel.

`crWallProjectionMetrics(depth, mass)` in
`src/js/game-15-section-6-procedural-assets.js` (lines 1023-1039) computes:

```text
baseLineH    = RH / depth
floorBottomY = RH/2 + baseLineH/2
wallTopY     = floorBottomY - baseLineH
```

For a normal full-height wall (`mass = 1`), this is equivalent to:

```text
screenY(worldZ, depth) = RH/2 + (RH/depth) × (0.5 - worldZ)
```

Therefore the implicit eye height is exactly `worldZ = 0.5`, the horizon is
`RH/2`, the floor is at `worldZ = 0`, and a normal wall spans `worldZ = 0..1`.
The current `mass` parameter only scales the span upward from the same
floor-line anchor; it is not a general world-Z interface.

The floor itself is a screen-space gradient (`game-16-section-7-render.js`,
lines 94-99), so there is no existing floor ray or inverse world-plane mapper
to reuse. Grounded sprites use the same simplified floor anchor:
`crProjectedFloorY(depth) = RH/2 + RH/(2 × depth)` and
`crProjectBillboardSprite` anchors their feet there
(`game-15-section-6-procedural-assets.js`, lines 1016-1022 and 1125-1137).

### Consequence for the requested top at Z=0.5

At the requested block top `worldZ = 0.5`, the current equation returns
exactly `RH/2` at every depth. The horizontal top plane is coplanar with the
implicit eye and cannot appear as a visible, progressively exposed surface.
The renderer also lacks the vertical-ray data needed to inverse-map a screen
pixel to a horizontal plane and obtain top UVs.

Using a cap fill, affine screen polygon, stretched side texture, or procedural
color would not repair this: each would violate the requested geometric,
textured-top contract.

### Sprite occlusion ownership

Sprites are drawn after walls. The normal and far-field paths compare a
sprite's **whole column** against `zbuffer[col]`:

```text
if (depth >= zbuffer[col]) continue
```

See `src/js/game-16-section-7-render.js` lines 279-305 and
`src/js/game-16b-far-field-projection.js` lines 177-235. This supports
all-or-nothing column occlusion only. It cannot preserve a farther sprite's
pixels above a half-height block while hiding its pixels below the block top.
The same limitation applies to a farther full-height wall exposed above a
nearer short block.

### Collision

Collision already has the desired full-footprint semantics. `World.cellSolid`
returns solid for every nonzero map cell
(`src/js/game-12-section-4-collision-walk-helpers.js`, lines 130-140), and
`canStand` / `movePlayerWithCollision` use that grid (`lines 20-22,
110-126`). The authored-level runtime populates every footprint cell in both
the map and `buildingGrid` (`src/js/game-09a-authored-level-runtime.js`,
lines 71-100). Visual height is not used by collision.

## Existing asset-tooling contract

`tools/building-asset-compiler.js` accepts only
`snc-building-source-v1`, requires `front/side/back`, optionally permits
`west`, and compiles `renderMode: importedWholeFaceAsset` (lines 35-60 and
87-128). It currently:

- has no `solidShortBlock` render mode or `heightScale`;
- has no required `top` face;
- permits a reused west face;
- has no full-opacity audit; and
- emits an atlas/face descriptor contract only for vertical faces.

It is unsuitable for the requested proof unchanged, but it is a bounded
compiler extension point rather than a reason to reuse the PR #27 contract.

## Reuse classification

| Area | Classification | Evidence and limit |
| --- | --- | --- |
| DDA horizontal traversal and first side hit | safe reuse | Stable first-hit DDA in `game-16-section-7-render.js`; retain it for side discovery, but not as the sole top/depth representation. |
| World face → local face → U mapping | safe reuse | Generic, rotation-aware mapping in `game-16a-bitmap-building-renderer.js`; it has no camera-dominant face selection. |
| Rectangular placement and full-footprint collision | safe reuse | `buildingGrid` and `World.cellSolid` already make every footprint cell solid. |
| Existing bitmap asset registry/load lifecycle | safe reuse | It can register a newly compiled asset after a separately defined solid-short-block schema is validated. |
| Building compiler and atlas packer | requires extension | Add five mandatory faces, exact dimensions, opaque-alpha audit, `heightScale`, and an explicit top descriptor; do not change the existing imported-whole-face contract in place without compatibility tests. |
| Vertical side projection | requires extension | Generalize the implicit eye-height equations into named world-Z projection helpers; a floor-anchored `0..0.5` span can then be drawn without alpha logic. |
| Horizontal top texture projection | requires extension | Requires an explicit eye height above `0.5` and an invertible per-pixel screen ray / plane-intersection path. The base does not supply either. |
| Depth for side, top, wall, and sprite pixels | requires extension | Replace the scalar-only ownership for this mode with a reusable per-pixel or vertical-interval depth representation. |
| Query-gated proof state | requires extension | A new isolated level/harness can use existing custom-level conventions only after the renderer interface is frozen. |
| PR #27 alpha-cutout/dumpster code | must not reuse | It is explicitly prohibited and solves a different, alpha-dependent rendering problem. |
| `mass` as a half-height implementation | must not reuse | It changes a visual wall span only; it has neither textured-top geometry nor partial-depth ownership. |
| Existing camera height as an explicit contract | unknown until tested | The current `0.5` eye is derived from equations, not named state. Raising it must be tested against normal walls, floor anchoring, sprites, interpolation, and far-field projection. |

## Required decision before HB-020 through HB-050

The requested proof cannot meet its top-plane and partial-occlusion acceptance
criteria on the base renderer unchanged. The smallest coherent foundation
extension is:

1. establish an explicit camera eye height strictly above `0.5` and preserve
   normal full-wall grounding through one centralized world-Z projection
   function;
2. derive a per-internal-pixel ray that intersects `worldZ = 0.5`, permitting
   bounded top-plane UV mapping; and
3. introduce reusable depth ownership that can hold a near short-block pixel
   below its top while leaving a farther wall or sprite visible above it.

No substitute should be implemented without that decision. In particular, a
fake cap or an alpha-cutout/sprite path would violate the proof contract.

## Exact future files, only after approval

The following are proposed boundaries, not work authorized by this map:

```text
authoring/buildings/half_block_debug_001/building.json
authoring/buildings/half_block_debug_001/source/south.png
authoring/buildings/half_block_debug_001/source/east.png
authoring/buildings/half_block_debug_001/source/north.png
authoring/buildings/half_block_debug_001/source/west.png
authoring/buildings/half_block_debug_001/source/top.png
tools/building-asset-compiler.js
tools/generate-half-block-debug-faces.js
src/imported-handoff-assets/half_block_debug_001.asset.js
src/js/game-15-section-6-procedural-assets.js
src/js/game-16c-solid-short-block-renderer.js
src/js/game-16d-horizontal-top-plane-projection.js
src/js/game-16-section-7-render.js
src/js/game-09a-authored-level-runtime.js
src/js/game-11-section-3b.js
src/build-manifest.json
tests/solid_short_block_compiler_verify.js
tests/solid_short_block_alpha_contract_verify.js
tests/solid_short_block_manifest_verify.js
tests/solid_short_block_geometry_verify.js
tests/solid_short_block_top_plane_verify.js
tests/solid_short_block_occlusion_verify.js
tests/solid_short_block_collision_verify.js
```

`index.html` is intentionally absent: it remains generated only after a later
authorized implementation card.

## HB-010 conclusion

**FAIL — ARCHITECTURAL, before implementation.** The clean gallery base has
safe seams for opaque directional side textures and full-footprint collision,
but not for a visible `Z=0.5` textured top or partial-height depth/occlusion.
The proof branch is intentionally limited to this map until the renderer
foundation decision is approved.
