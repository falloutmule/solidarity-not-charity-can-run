# SNC authoring

Building sources are canonical here; generated runtime assets under `src/imported-handoff-assets/` are never hand-edited.

## Building workflow

1. Create `authoring/buildings/<asset-id>/building.json` and `source/front.png`, `side.png`, and `back.png`. `west.png` is optional; without it, west safely reuses the east side without mirroring.
2. Run `npm.cmd run building:build -- authoring/buildings/<asset-id>`.
3. Run `npm.cmd run building:preview -- authoring/buildings/<asset-id>` and open the reported ignored local HTML preview.
4. Place the generated asset in Tiled using the Building template, then validate the map.

Face PNGs must share one height. Front/back width must equal `widthCells × pixelsPerCell`; side/west width must equal `depthCells × pixelsPerCell`.

## Tiled companion map

District 1 currently remains authored JS authority. Its Tiled map is a validated companion, not a replacement source:

```powershell
npm.cmd run level:export-tiled -- district-01
npm.cmd run level:check-tiled -- authoring/levels/district-01/district-01.tmj
```

The companion uses a 32×32 orthogonal finite grid and these layers: Collision, Buildings, PlayerStart, Pickups, NPCs, Props, Exit, and Metadata. The importer rejects semantic drift from current District 1.
