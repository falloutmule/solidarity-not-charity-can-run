# B1-E — Low-block authoring contract

Toolkit foundation at `ae0cba08` is verified as authoring-only. It currently compiles `snc-building-source-v1` into `snc-bitmap-building-asset-v1` with `renderMode: importedWholeFaceAsset`:

- source validation and deterministic atlas generation: `tools/building-asset-compiler.js:30–152`
- generated registration immediately before authored levels: `tools/register-building-asset.js:9–32`
- all-side/rotation local preview: `tools/building-asset-preview.js:18–32`
- Tiled Buildings schema and semantic D1 companion bridge: `authoring/levels/templates/building.tx`; `tools/tiled-level-bridge.js:37–99`

The current input contract assumes full-height front, side, and back PNGs, with optional west reuse. It has no `heightScale`, short-end, top-cap, or collision metadata. The preview is an atlas/face preview, not a geometric low-prism preview.

Proposed future low-block source contract, pending a renderer design that passes B1-C:

```json
{
  "schema": "snc-low-block-source-v1",
  "id": "dumpster_001",
  "footprint": { "widthCells": 1, "depthCells": 2 },
  "heightScale": 0.3,
  "faces": { "long": "source/longFace.png", "short": "source/shortEnd.png" },
  "top": { "mode": "solid" },
  "collision": { "solid": true }
}
```

Rotation remains quarter turns: 0/2 use 1×2, 1/3 use 2×1. South/north may reuse `long`; east/west may reuse `short`. This is a proposed source contract only, not implemented runtime behavior. It explicitly excludes transparent full-height canvases, wall-atlas hand edits, per-frame pixel reads, billboard metadata, and `game.props`.
