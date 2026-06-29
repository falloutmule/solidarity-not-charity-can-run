# Flat Building Walls Baseline Report

## Goal

Reduce the active FPV building wall render path to one flat baseline for `flatwalls1`.

## BUILD_ID

`flatwalls1`

## Files changed

- `src/js/game-06-section-2b-mobile-touch-input.js`
- `src/js/game-16-section-7-render.js`
- `src/js/game-09-section-3-city-generation.js`
- `src/js/game-22-section-13-main-loop.js`
- `tests/run_selfcheck_playwright.js`
- regenerated `index.html`
- regenerated `proof-source-build-manifest.json`

## What changed visually

- Added `CR_FLAT_BUILDING_WALLS_BASELINE = 1`.
- Added one flat building-wall type predicate for `WALL.BUILDING`, `WALL.BRICK`, `WALL.GLASS`, `WALL.GARAGE`, `WALL.CONCRETE`, `WALL.SIGNAGE`, and `WALL.MURAL`.
- Added `crDrawFlatBuildingWallColumn(...)` using one flat fill color.
- Updated `drawScene(...)` so flat building-like walls route before facade-role rendering.
- Flat building-like walls bypass `WALL_TEX[...]`, `crDrawFpvWorldFacadePanel(...)`, facade-role drawing, per-cell `game.wallShade`, and the old strong side-face contrast.
- `WALL.FENCE` and `WALL.VAN` remain on their existing texture path.

## Commands run

```bash
npm run build
npm run build:check
npm run test:selfcheck
git diff --check
```

Observed results:

- `npm run build`: `Wrote index.html 635962 bytes 4e4d74233a4f…`
- `npm run build:check`: `{"pass":true,"check":"pass","output":"index.html","bytes":635514}`
- `npm run test:selfcheck`: `{"pass":true,"proofs":"proof-*.json in repo root"}`

## Visual proof

- `proof-flatwalls-phone-d2.png`
- `proof-flatwalls-close-wall.png`
- `proof-flatwalls-minimap.png`

Proof capture verified:

- `BUILD_ID` is `flatwalls1`.
- `CR_FLAT_BUILDING_WALLS_BASELINE === 1`.
- flat building branch appears before facade-role rendering in `drawScene(...)`.
- facade panel overlay calls remain only behind the non-flat branch.
- `game.wallShade` is guarded behind `!flatBuildingWall`.
- fence and van are not flattened.
- D2 proof setup retained props, pickups, and NPCs.

## Notes

No gameplay, map generation, collision, props, pickups, NPCs, exits, minimap rules, mobile controls, save data, or Hall behavior were intentionally changed.
