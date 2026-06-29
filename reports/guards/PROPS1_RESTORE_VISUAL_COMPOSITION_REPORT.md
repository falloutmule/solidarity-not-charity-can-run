# Props1 Restore Visual Composition Report

## Goal

Restore practical props-first visual composition from the known props1 direction while preserving current gameplay, mobile layout, ground anchoring, selfcheck, and build pipeline.

## BUILD_ID

`props1restore1`

## Files changed

- `src/js/game-06-section-2b-mobile-touch-input.js`
- `src/js/game-09-section-3-city-generation.js`
- `src/js/game-16-section-7-render.js`
- `src/js/game-22-section-13-main-loop.js`
- `tests/run_selfcheck_playwright.js`
- regenerated `index.html`
- regenerated `proof-source-build-manifest.json`

## What changed visually

- Replaced one-color flat wall renderer with simple per-material category colors:
  - `WALL.BUILDING` → tan stucco `rgba(184,166,128,0.90)`
  - `WALL.CONCRETE` / `WALL.GARAGE` → gray concrete `rgba(150,144,134,0.90)`
  - `WALL.BRICK` → muted clay `rgba(150,108,84,0.90)`
  - `WALL.GLASS` → dark blue-gray `rgba(54,66,80,0.90)`
  - `WALL.SIGNAGE` / `WALL.MURAL` → faded tan `rgba(176,160,130,0.90)`
- No decals, doors, windows, signs, or facade panels added.
- Added minimum prop-density rule for D2/D3 (≥14 total, ≥5 on main road).
- Increased D1 minimum props from 12 to 14.
- Added `crDebugPropDensity()` helper for prop/road/near-start counts.

## Commands run

```bash
npm run build         # Wrote index.html 639181 bytes 3cc38f00d7a1
npm run build:check   # {"pass":true,"check":"pass","output":"index.html","bytes":638733}
npm run test:selfcheck # {"pass":true,"proofs":"proof-*.json in repo root"}
git diff --check
```

## Visual proof

- `proof-props1restore-d1.png` — D1 with nearby tarp_bundle prop, walls show muted tones
- `proof-props1restore-d2.png` — D2 with signboard/NPCs visible, props on street
- `proof-props1restore-close-wall.png` — close wall showing brick-brown material color
- `proof-props1restore-minimap.png` — build label reads `props1restore1`, minimap readable

## Prop density verified

- D1: 14 props total, 8 road, 5 near player start, 16 pickups, 8 NPCs
- D2: 14 props total, 14 road, 2 near start, 18 pickups, 9 NPCs

## Notes

No gameplay, collision, map generation, pickups, NPCs, exit, minimap rules, mobile controls, save data, or Hall behavior were intentionally changed.
