# Facade pack bridge / lab sync pass

**BUILD_ID:** `facadepack1`  
**Prior baseline:** `modules1` / `0905d1d`  
**Backup:** `index.before-facade-pack-bridge.html`  
**Reference (not imported):** `snc-building-module-lab.html` (concept only; pack lives in game)

## Problem

`modules1` mixed coarse wall texture sampling with role overlays. Facades read as flat slabs, scratch noise, or anonymous panels.

## Solution

**`CR_FACADE_PACK` is the single source of truth** for module footprints, per-face roles, decoration slots, and base materials. FPV wall hits with a building module **skip** `WALL_TEX` drawImage and render **pack base + slots** only.

## Pack location

Root `index.html`, marked block:

- Start: `/* BEGIN SNC FACADE PACK v1 */` (~line 2238)
- End: `/* END SNC FACADE PACK v1 */`
- Copy snapshot: `proof-facade-pack-v1.txt`

## Structure

| Layer | Contents |
|-------|----------|
| **modules** | `storefront_4x2`, `storefront_3x2`, `restroom_pavilion`, `blank_service_block` — `cells`, `front`, `faces` per direction |
| **roles** | `storefront_window`, `storefront_door`, `storefront_sign`, `blank_brick`, `side_door`, `service_wall`, `mural_wall`, `utility_wall` |
| **slots** | `sign_band`, `glass_window`, `glass_door`, `dark_base`, `soft_brick_bands`, `side_door`, service/mural/utility slots |
| **materials** | `brick`, `stucco`, `concrete` → flat base fills (no comb/scratch texture on pack faces) |

## Ray hit → draw

1. Ray hit tile `(mapX, mapY)` + side → `crResolveBuildingFaceRole`
2. `buildingGrid` cell → building id, module id, local x/y
3. Module `faces[direction]` → role id
4. `CR_FACADE_PACK.roles[role]` → material + slot list
5. `crDrawFpvFacadePackColumn` — material base + slot rects (leading-edge column only)

**Debug:** `CR.crDebugDescribeFacadeHit(tileX, tileY, faceDirection)` → `{ buildingId, moduleId, localX, localY, faceDirection, role, material, slots }`

## Old wall texture

- **Pack faces:** no `drawImage(WALL_TEX)`; no `crDrawFpvWorldFacadePanel` on module hits
- **Non-module walls:** unchanged coarse tex + optional world panel polish

## Preserved

Matte road (`CR_FPV_STREET_MATTE`), navigation minimap, `CR_BUILDING_FPV_MASS`, D1–D4 selector/progression, controls/save/Hall, 40×20 map, props non-collision.

## Self-check

- `CR.runFacadePackBridgeSelfCheck()` — pack markers, version, D2/D3 role hits, pack renderer, reachability
- Included in `CR.runFullSelfCheck()`
- Playwright: `facadePackBridgeSection` → `proof-facade-pack-bridge.json`, `proof-facadepack-role-debug.json`, PNG proofs

## Local harness

```bash
npm run test:selfcheck
```

**Result:** PASS (post-implementation run).

## CI

*(Fill run URL after push.)*

- Artifact: `snc-can-run-proof-artifacts`

## Proof paths

- `proof-facade-pack-bridge.json`
- `proof-facadepack-role-debug.json`
- `proof-facade-pack-v1.txt`
- `proof-facadepack-d2-storefront-front.png`
- `proof-facadepack-d3-side-back-alley.png`
- `proof-facadepack-minimap-preserved.png`
- `proof-full-selfcheck.json`

## Play URLs

*(Update `v=` with gameplay commit hash after push.)*