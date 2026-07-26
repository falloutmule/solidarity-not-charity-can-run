# Phase 8 architecture

Status: verified for the toolkit foundation; pilot content is pending real face artwork.

- Building source authority is `authoring/buildings/<id>/building.json` plus one reusable face PNG. Directional overrides are optional.
- `tools/building-asset-compiler.js` deterministically packs the faces into the existing `snc-bitmap-building-asset-v1` whole-face asset contract.
- The Phase 8 pilot is fictional `dumpster_001`, footprint 1×2. It is a ground-anchored 0.3-height binary alpha cutout with an explicit `topCap: none` policy.
- West defaults to a non-mirrored reuse of east/side. No external asset URL, inferred anchor, or inferred mirror is permitted.
- `tools/building-asset-preview.js` writes an ignored local preview with every side, atlas, footprint, and four rotations.
- Tiled is the companion editor at a 32×32 orthogonal finite grid. District 1 remains JS-authoritative; the importer accepts only an exact semantic round trip.
- Adding an asset alone is save-safe. Changing District 1 geometry is not; the pilot will use a separate level identity and route.

Focused evidence: `test:building-asset-compiler`, `test:building-asset-preview`, `test:tiled-d1-roundtrip`, and `test:authored-d1`.
