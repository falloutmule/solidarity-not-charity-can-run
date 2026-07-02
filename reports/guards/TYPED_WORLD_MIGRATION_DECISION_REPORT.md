# Typed world migration decision report

**Card:** `TYPED_WORLD_MIGRATION_DECISION`  
**Date:** 2026-07-01

## Questions

### 1. Is current map performance a problem?

**No.** The game uses a 2D array-of-arrays (`game.map[ty][tx]`) for maps that are typically under 50×50 cells. The raycaster DDA loop touches at most ~80 cells per column × `RW` columns per frame. No frame drops or stutter have been attributed to map access. The fixed-step simulation (Card 5) now caps gameplay cost per frame regardless.

### 2. Would typed arrays simplify or complicate Hermes edits?

**Complicate.** Typed arrays (`Int8Array`, `Uint8Array`) require manual width/height tracking, flatten 2D `[y][x]` access to `y * W + x`, and make dynamic map resize (custom levels, harness micro-maps) harder. The current `World` adapter already provides a clean choke point — any future migration would be localized to `World.*` internals, but the edit cost and regression risk outweigh the benefit at current map sizes.

### 3. What files would be touched?

- `src/js/game-12-section-4-collision-walk-helpers.js` — `World.rawCell`, `World.inBounds`
- `src/js/game-09-section-3-city-generation.js` — map creation/allocation
- `src/js/game-16-section-7-render.js` — raycaster DDA cell reads
- `src/js/game-22-section-13-main-loop.js` — harness micro-map installers
- `tests/run_selfcheck_playwright.js` — any proof that reads `game.map` directly

### 4. What tests would prove no behavior change?

- `runWorldAdapterWiringPhase1SelfCheck` (all cells agree)
- `runWorldAdapterWiringPhase2SelfCheck` (raycaster reads)
- `runRaycasterInvariantSelfCheck` (zbuffer/halo/render order)
- `runMovementCollisionSelfCheck` (collision)
- `runReachabilitySelfCheck` (BFS)
- `runProceduralLevelValidationSelfCheck` (multi-seed maps)
- Full `corePass` suite

### 5. Should we defer?

**Yes — defer.**

## Recommendation

Defer typed-array migration until there is a measured performance or memory reason. The `World` adapter (Phase 1 + Phase 2 wiring now complete) provides the exact seam where a future migration would be isolated. All proofs pass with the current array-of-arrays structure. No action needed.