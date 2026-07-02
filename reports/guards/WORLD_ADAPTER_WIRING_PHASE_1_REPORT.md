# World adapter wiring Phase 1 — collision report

**Card:** `WORLD_ADAPTER_WIRING_PHASE_1_COLLISION`  
**BUILD_ID:** `feel2` (unchanged)  
**Date:** 2026-07-01

## Done

- **`isWalkableCell()`** now delegates to `World.cellSolid()` instead of reading `game.map[ty][tx]` directly.
- **`gridTraceClear()`** blockedAt cell now reads via `World.rawCell()` instead of `game.map[ty][tx]`.
- All collision, walkability, reachability (BFS), LOS (`interactionLineClear`), and movement (`movePlayerWithCollision`) paths now go through `World.*` as the single choke point.
- **No map behavior change** — `World` was already a mirror of `game.map` semantics.
- Raycaster wall loop untouched (Phase 2 scope).

## Verified

```
npm run build          # PASS
npm run build:check    # PASS
npm run test:selfcheck # PASS
proof-world-adapter-collision.json pass: true (11/11 checks)
```

## Checks

- allCellsAgree ✓ (656 walkable cells, zero mismatches)
- gridTraceWorks ✓
- blockedAtUsesWorld ✓
- reachabilityWorks ✓ (656 reachable cells)
- losWorks ✓
- movementWorks ✓
- oobWalkableFalse ✓
- oobSolid ✓
- raycasterInvariantPasses ✓
- movementCollisionPasses ✓
- runtimeClean ✓

## Next

Card 8 (Phase 2 render reads) — route raycaster cell reads through `World.*` where safe.