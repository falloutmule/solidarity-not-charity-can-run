# SNC Variable-Height Renderer Reference Map

## Current seams

| Current owner | Existing behavior | MVP adaptation |
| --- | --- | --- |
| `drawScene` DDA loop | Stops at the first non-empty map cell and writes one depth value per column. | Trace profile-bearing cells until a full-height segment closes the ray; composite far-to-near vertical intervals. |
| Legacy `crWallProjectionMetrics` | Implicit centred eye produces an ordinary wall interval from one scalar depth. | Leave the ordinary path unchanged; the query-gated heightfield renderer projects both world-Z endpoints through `CR_HEIGHTFIELD_CAMERA.eyeZ`, keeping a full wall at `1 / depth`. |
| `zbuffer` | One distance per column gates normal and far-field billboards. | Preserve it as a compatibility/far-field buffer; use reusable `worldDepthPixels` for heightfield side, top, and sprite pixels. |
| Sprite loop | Rejects or accepts a whole sprite column against `zbuffer`. | Split each proof sprite column into depth-visible vertical runs against the per-pixel buffer. |
| `game.map` / `World.cellSolid` | Non-zero cells own collision, reachability, and line-of-sight. | Keep that ownership. A profile grid changes only render height/material, never solidity. |

## Rejected paths

- The low-block spike's screen-space cap is not a raised-plane renderer: it has no UV sampling or depth ownership.
- Its one low interval plus scalar far depth cannot represent a general heightfield.
- PR #27's alpha-cutout, asset-specific renderer is not an input to this MVP.

## MVP runtime contract

1. A legacy empty cell resolves to profile `EMPTY` (`Z=0`).
2. A legacy non-zero cell resolves to `FULL_LEGACY` (`Z=1`) with its existing material.
3. The proof's `1x1` solid cell resolves to `HALF_DEBUG` (`Z=0.5`) with four side materials, one top material, and ordinary map collision.
4. The heightfield renderer is active only when a level installs a profile grid. Ordinary levels retain the existing renderer path and semantics.
5. The proof uses an explicit eye height of `0.68`, so its `Z=0.5` top remains visible without pitch.
