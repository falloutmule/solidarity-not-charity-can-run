# World adapter wiring Phase 2 — render reads report

**Card:** `WORLD_ADAPTER_WIRING_PHASE_2_RENDER_READS`  
**BUILD_ID:** `feel2` (unchanged)  
**Date:** 2026-07-01

## Done

- **Raycaster wall loop** in `game-16-section-7-render.js` now reads map cells via `World.inBounds()` + `World.rawCell()` instead of `game.map[mapY][mapX]` directly.
- No projection math, zbuffer, or sprite sort changes — only the cell-read wrappers.
- `runWorldAdapterWiringPhase2SelfCheck` + `proof-world-adapter-render.json` gated in `corePass`.

## Verified

```
npm run build          # PASS
npm run build:check    # PASS
npm run test:selfcheck # PASS
proof-world-adapter-render.json pass: true (6/6 checks)
```

## Checks

- zbufferPopulated ✓ (wall loop ran through World.* and filled zbuffer)
- renderFailurePasses ✓
- spriteOcclusionPasses ✓
- raycasterInvariantPasses ✓
- visualReadabilityPasses ✓
- runtimeClean ✓

## Next

Card 10 (Pages proof refresh) and Card 11 (typed-world decision report).