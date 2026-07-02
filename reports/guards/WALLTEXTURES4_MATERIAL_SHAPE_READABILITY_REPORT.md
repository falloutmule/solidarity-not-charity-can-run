# Walltextures4 Material Shape Readability Report

## Goal

Improve cinderblock and aluminum siding material readability on phone while preserving `walltextures3` whole-building texture ownership.

## What was done

- **BUILD_ID** `walltextures4`
- Cinderblock painter: 48×12 blocks (4:1 aspect), staggered CMU rows, lighter seams/aggregate
- Aluminum siding: horizontal bands (9px), highlight/shadow per band, removed grime streaks and per-band smudge/dent clutter
- Tile scales: cinderblock **1.85**, siding **2.0** (was 1.25 / 1.0)
- `crMaterialTextureDebugSpec()` for harness metadata
- `runWalltextures4MaterialShapeReadabilitySelfCheck()` + Playwright proofs (412×915 viewport)
- Bench harness: `wallShade` grid init so FPV draw works on material bench scenes

## What was verified

- `npm run build` PASS
- `npm run build:check` PASS
- `npm run test:selfcheck` PASS (`proof-playwright-summary.json` pass true)
- `proof-walltextures4-material-shape-readability.json` pass true
- Nested: walltextures3 ownership, walltextures2 scale, raycaster invariant

## What failed

- Nothing blocking release in automated suite.

## Current exact state

- **walltextures3 component ownership preserved** (grid + flood-fill + sync unchanged in behavior)
- Cinderblock intended **rectangular** (not square panels)
- Siding simplified to **horizontal bands**, low high-frequency noise
- Pushed pending this commit

## Remaining blockers

- Travis Samsung acceptance on pinned Pages (visual authority)

## Next actionable step

Pin Pages `?v=<full-sha>` after push; D2 seed `290144176` long wall + corner screenshots on Samsung.

## Evidence

- JSON: `proof-walltextures4-material-shape-readability.json`
- Screenshots (local, gitignored like other proof PNGs):
  - `proof-walltextures4-cinderblock-phone-proxy.png`
  - `proof-walltextures4-siding-phone-proxy.png`
  - `proof-walltextures4-d2-long-wall.png`
  - `proof-walltextures4-corner-material-continuity.png`
- Committed: `index.html`, `src/js/game-06`, `game-09`, `game-22`, `tests/run_selfcheck_playwright.js`, this report if tracked