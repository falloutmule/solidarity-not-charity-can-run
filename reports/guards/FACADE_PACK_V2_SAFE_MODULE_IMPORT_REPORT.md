# Facade pack v2 safe module import — `facadev2safe1`

**Date:** 2026-06-28  
**Backup:** `index.before-facade-pack-v2-safe-modules.html`  
**Previous baseline:** `facadepack1` / `0a8d34f`  
**Lab reference commit:** `af37c54` (`snc-building-module-lab-v2.html`)  
**BUILD_ID:** `facadev2safe1`  
**Gameplay commit:** `4c0c4c0`  
**Previous baseline:** `facadepack1` / `0a8d34f`
## Modules imported

- `garage_service_4x2`
- `boarded_shop_3x2`

## Intentionally not imported (lab-only)

- `two_story_storefront_4x2_visual`
- `walkin_storefront_4x3`
- `corner_shop_L`
- `floorZones` gameplay
- two-story rendering, walk-in collision, interiors, new pathing

## Roles added

- `blank_concrete`
- `garage_bay`
- `service_door` (facade role)
- `boarded_window`

## Slots added

- `soft_panel_bands` → `soft_panel`
- `garage_door` → `garage_door`
- `service_door` → `service_door` (door slot)
- `boarded_window` → `boards`

## Materials

- No new materials; reused `concrete`, `brick`, `stucco` from facadepack1.

## Placement (sparse)

| District | Module | Where |
|----------|--------|--------|
| D2 | `boarded_shop_3x2` | Street segments (`seg % 3 === 1` south, `seg % 5 === 2` north) |
| D2 | `garage_service_4x2` | Rare (`seg % 11 === 5` south) |
| D3 | `garage_service_4x2` | Fixed north pocket (7, roadY1+4) |
| D3 | `boarded_shop_3x2` | Fixed south (22, roadY0-4) |
| D3+ | `boarded_shop_3x2` | Some south segments (`seg % 4 === 2`) |
| D4 | `garage_service_4x2` | Sparse service pocket (30, roadY0-3) |

D1 unchanged. Storefront modules remain dominant on D2.

## Confirmations

- No collision, pathing, interior, or two-story gameplay changes.
- Lab file standalone; game does not load it.
- `CR_FACADE_PACK` markers preserved; copy-paste workflow intact.
- Matte road, navigation-first minimap, building mass, D1–D4 selector, controls/save/Hall unchanged.
- `SAVE_VERSION`, `cannedRun.save.v1`, `cannedRun.controls.v1` unchanged.

## Local harness

```text
npm run test:selfcheck → pass:true
```

## CI

- https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28329532063 — **success**
- Artifact: `snc-can-run-proof-artifacts`

## Play URLs

- Play: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=4c0c4c0&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=4c0c4c0&mobile=on&portraitlayout=1

## Proof paths

- `proof-facade-pack-v2-safe.txt`
- `proof-facadev2safe-modules.json`
- `proof-facadev2safe-role-debug.json`
- `proof-facadev2safe-d2-boarded-shop.png`
- `proof-facadev2safe-d3-garage-service.png`
- `proof-facadev2safe-minimap-preserved.png`
- `proof-full-selfcheck.json`

## Play URLs

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=4c0c4c0&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=4c0c4c0&mobile=on&portraitlayout=1`