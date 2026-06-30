# SOLID_WALLS_OPAQUE_BASELINE_REPORT

## Goal
`solidwalls1` — opaque building wall fills and per-segment material grouping for a simple expandable baseline.

## BUILD_ID
`solidwalls1`

## What changed
- Building-like FPV walls use opaque hex fills (`#b8a680`, `#969084`, `#966c54`, `#364250`) instead of semi-transparent rgba base fills.
- `stampSideBand` picks one `segMaterial` per block segment instead of per-cell `crPickWallType` during band fill.
- Props/NPC/pickup density and grounding unchanged from `props1restore1`.
- No decals, facade panels, or new gameplay systems.

## Files
- `src/js/game-06-section-2b-mobile-touch-input.js`
- `src/js/game-09-section-3-city-generation.js`
- `src/js/game-16-section-7-render.js`
- `src/js/game-22-section-13-main-loop.js`
- `tests/run_selfcheck_playwright.js`
- `index.html` (generated)
- `proof-source-build-manifest.json`

## Commands
- `npm run build`
- `npm run build:check`
- `npm run test:selfcheck`

## Proof screenshots
- `proof-solidwalls-phone-d2.png`
- `proof-solidwalls-close-wall.png`
- `proof-solidwalls-props.png`
- `proof-solidwalls-minimap.png`

## propDensity note
`proof-solidwalls-debug.json` prop counts of 0 were from an earlier harness that called `drawScene()` only without `CR.startRun()`; normal runs show props/pickups/NPCs > 0 (verified Playwright `tests/verify_and_capture_solidwalls.js`).

## Play URL
PENDING after push

## Selfcheck URL
PENDING after push