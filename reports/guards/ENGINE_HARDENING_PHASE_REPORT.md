# Engine hardening phase report

**Date:** 2026-07-01  
**BUILD_ID:** feel2  
**Selfcheck:** PASS (`npm run test:selfcheck`)

## Cards completed

| Card | Status | Proof / notes |
|------|--------|----------------|
| VIEWPORT_AUTHORITY_OBJECT | Done | `crGetViewportAuthority`, `runViewportAuthoritySelfCheck`, `proof-viewport-authority.json`, corePass |
| SEMANTIC_ACTION_MAP | Done | `crRefreshSemanticActionMap`, `getSemanticActionMap`, `update()` uses `act.*`, `proof-semantic-action-map.json` |
| INPUT_NO_DIRECT_MUTATION_GUARD | Done | Look deferred via `inp.lookDeltaRad` + `crApplyPendingInputActions`; `proof-input-no-direct-mutation.json` |
| FIXED_STEP_SIMULATION_SNAPSHOT | Done | `runFixedStepBaselineSelfCheck`, `proof-fixed-step-baseline.json` (variable-dt evidence; no sim rewrite) |
| FIXED_STEP_SIMULATION | Deferred | Baseline only; fixed accumulator not implemented this pass |
| WORLD_LAYER_ADAPTER | Done | `World.cellSolid/Material/Semantic`, `proof-world-layer-adapter.json` |
| RAYCAST_DEBUG_PROBE_PANEL | Done | `crDebugRaycastFrame`, `proof-raycast-debug-frame.json` |
| SPRITE_OCCLUSION_SCREENSHOT_PROOF | Partial | `proof-sprite-occlusion-visual.json` (halo + zbuffer predicate); render-failure PNGs unchanged |
| MOBILE_REAL_DEVICE_PROTOCOL | Done | `docs/mobile-real-device-protocol.md` |
| RELEASE_PAGES_PROOF_REFRESH | Done | `docs/release-pages-proof-refresh.md` |

## Key behavior changes

- **Viewport:** single authority object drives proofs; portrait/landscape scenarios in selfcheck.
- **Input:** gameplay reads semantic action map; touch look no longer mutates `player.angle` in handlers.
- **World:** adapter mirrors `isWalkableCell` / map `0` vs wall without changing collision paths yet.

## Verification

```bash
npm run build && npm run build:check && npm run test:selfcheck
```

## Next (not this pass)

- Fixed-step simulation accumulator (card 5) after baseline review.
- Wire collision/render to `World.*` gradually.
- Phone evidence per mobile protocol when Travis requests.