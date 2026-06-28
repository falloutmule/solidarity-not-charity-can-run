# FPV ground plane / wall base alignment report

**Previous baseline:** `spriteground1` / split infrastructure `35c74cc`  
**New BUILD_ID:** `groundplane1`  
**Gameplay commit:** `3f489ed` (`3f489edd206556de7c40b387143f1366ef6f6f6b`)  
**CI URL:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28337881113

## Cause found

Building and facade walls used `CR_BUILDING_FPV_MASS = 1.5`, but the FPV renderer scaled wall height symmetrically around screen center:

```js
lineH = (RH / d) * mass
drawStart = RH/2 - lineH/2
drawEnd = RH/2 + lineH/2
```

That made enlarged building bottoms extend below the normal projected floor line while NPCs, cans, props, and shadows still used `crProjectedGroundBottomY(depth)`. The math made sprites technically grounded but visually high/pasted relative to storefront and garage bases.

## Fix

- Added `crProjectedFloorY(depth)` and kept `crProjectedGroundBottomY(depth)` as its sprite-compatible alias.
- Added `crWallProjectionMetrics(depth, mass)` so normal wall height establishes the floor baseline and extra mass extends upward.
- Updated FPV wall rendering to use:

```js
baseLineH = RH / d
massLineH = baseLineH * mass
floorBottomY = RH/2 + baseLineH/2
drawEnd = ceil(floorBottomY)
drawStart = floorBottomY - massLineH
```

- Kept `CR_BUILDING_FPV_MASS = 1.5`; D1 pavilion still uses the existing 1.58 mass.
- Did **not** change facade art vocabulary, facade composition, district layout, controls, save schema, Hall, or gameplay modules.
- Did **not** add lab-only modules.
- No NPC scale multiplier was needed.
- Reduced contact shadow contrast/height slightly so shadows sit under feet without looking like detached halos.

## Verification

- `BUILD_ID` changed from `spriteground1` to `groundplane1` only after local verification.
- `CR.runFpvGroundPlaneAlignmentSelfCheck()` added and included in `CR.runFullSelfCheck()`.
- `CR.crDebugGroundPlaneAlignment()` added.
- Debug records confirm:
  - D1 pavilion wallDrawEnd is within 0.778 px of the shared floor line.
  - D2 storefront wallDrawEnd is within 0.952 px of the shared floor line.
  - D3 garage/service wallDrawEnd is within 0.609 px of the shared floor line.
  - NPC, can, and prop grounded deltas are 0 at the same depth samples.
  - Wall mass extra extends upward; downward extra is 0.

## Preservation confirmations

- Spriteground anchor preserved.
- Facade art/composition systems preserved.
- Facade pack v2 safe modules preserved.
- Current six gameplay modules preserved.
- D1 identity remains park/plaza/pavilion.
- D2 storefront/boarded shops and D3 garage/service faces remain active.
- Matte road preserved.
- Minimap remains navigation-first.
- Level selector still supports D1-D4 direct start.
- People, cans, and exit remain reachable D1-D4.
- Props remain non-collision.
- No moving blockers, moving NPCs, or timers added.
- Controls/options/edit controls remain functional.
- Hall remains functional.
- Save/load schema remains `SAVE_VERSION = 1`.
- No external runtime assets introduced.

## Commands

```bash
npm run build
npm run build:check
npm run test:selfcheck
```

Local results:

- `npm run build`: wrote root `index.html` from `src/`.
- `npm run build:check`: PASS, `{"pass":true,"check":"pass","output":"index.html","bytes":574434}`.
- `npm run test:selfcheck`: PASS, `{"pass":true,"proofs":"proof-*.json in repo root"}`.

## Proof artifacts

- `proof-groundplane-alignment.json`
- `proof-groundplane-debug.json`
- `proof-groundplane-d2-npc-storefront.png`
- `proof-groundplane-d2-can-storefront.png`
- `proof-groundplane-d3-garage-service.png`
- `proof-groundplane-d1-pavilion.png`
- `proof-groundplane-minimap-preserved.png`
- `proof-full-selfcheck.json`
- `proof-playwright-summary.json`

## Visual proof notes

- D2 NPC feet sit on the same road/floor plane as storefront bases; no visible floating/elevation/halo in the proof screenshot.
- D2 can bottom sits on the road/floor plane; no visible floating/elevation/halo.
- D3 garage/service base aligns to the road/floor plane; no visible sinking/floating/halo.
- D1 pavilion/building base aligns to the floor/road plane.

## URLs

- Play: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=3f489ed&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=3f489ed&mobile=on&portraitlayout=1
