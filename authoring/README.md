# SNC authoring

Building sources are canonical here; generated runtime assets under `src/imported-handoff-assets/` are never hand-edited.

## Building workflow

1. Create `authoring/buildings/<asset-id>/building.json` and one tightly cropped `source/face.png`.
2. Run `npm.cmd run building:build -- authoring/buildings/<asset-id>`.
3. Run `npm.cmd run building:preview -- authoring/buildings/<asset-id>` and open the reported ignored local HTML preview.
4. Place the generated asset in Tiled using the Building template, then validate the map.

The primary manifest is:

```json
{
  "schema": "snc-building-source-v1",
  "id": "dumpster_001",
  "footprint": { "widthCells": 1, "depthCells": 2 },
  "heightScale": 0.4,
  "face": "source/face.png"
}
```

The compiler derives front/back and side atlas slices from that one PNG. The west face reuses east without mirroring. Optional directional overrides may be added later under `faces`.

`heightScale` is optional and defaults to `1`. For low objects such as `dumpster_001`, set it to `0.4` and supply a tightly cropped, fully opaque face. The renderer anchors the short face at the wall-floor position and draws an opaque top cap, so no transparent upper-half padding or cutout is needed.

Short imported buildings still occupy their full grid footprint for collision. Their renderer tracks the real top edge, so sprites behind a short building can remain visible above it while full-height buildings keep their existing occlusion behavior.

## Tiled companion map

District 1 currently remains authored JS authority. Its Tiled map is a validated companion, not a replacement source:

```powershell
npm.cmd run level:export-tiled -- district-01
npm.cmd run level:check-tiled -- authoring/levels/district-01/district-01.tmj
```

The companion uses a 32×32 orthogonal finite grid and these layers: Collision, Buildings, PlayerStart, Pickups, NPCs, Props, Exit, and Metadata. The importer rejects semantic drift from current District 1.

`authoring/levels/dumpster-pilot/dumpster-pilot.tmj` is the non-production 1×2 Tiled placement example.
