# Building module / facade role pass — `modules1`

## Backup
`index.before-building-module-facade-role.html`

## Baselines
| | |
|--|--|
| Previous | `facadefix1` / `2c80f71` |
| New BUILD_ID | `modules1` |
| Gameplay commit | `0905d1d` |

## Reference (not imported)
`snc-building-module-lab.html` — data model + visual target for semantic facades.

## Module data model
- `BUILDING_MODULES` — `storefront_4x2`, `storefront_3x2`, `restroom_pavilion`, `blank_service_block`
- Per cell: `game.buildingGrid[y][x]` → `{ bid, lx, ly, mid }`
- Per building: `game.buildingRegistry[bid]` → `{ moduleId, x0, y0, front, mod }`
- Face roles per direction: `mod.faces.south|north|east|west` → role strings

## Wall hit → role
1. Ray hit yields `mapX`, `mapY`, `side`, `stepX`, `stepY`
2. `crWallHitFaceDir` → `north|south|east|west`
3. `crGetBuildingFaceRole(mapX, mapY, faceDir)` → role (e.g. `storefront_glass`, `side_door`, `blank_brick_side`)

## FPV draw
- Module cells use `BUILDING` base texture + `crDrawFpvFacadeRoleOverlay` (sign/glass/door, blank brick bands, side door, service/mural/utility)
- Non-module walls keep coarse tex / optional world panels

## Placement
- `crAssignBuildingModules` after street-block grammar (D2+ storefront modules road-facing; D3 service blocks; D1 pavilion via `crRegisterD1PavilionModule`)

## Preserved
- Matte FPV road, navigation-first minimap, `CR_BUILDING_FPV_MASS` 1.5, D1–D4 layouts/selector, controls/save/Hall, no moving blockers/NPCs/timers, props non-collision

## Harness
- `CR.runBuildingModuleFacadeSelfCheck()` + Playwright `buildingModuleFacadeSection`
- Local: `npm run test:selfcheck` — **PASS**

## CI
- **GitHub Actions:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28325373507 — **success**
- Artifact: `snc-can-run-proof-artifacts`

## Proof paths
- `proof-building-module-facade.json`
- `proof-modules-d2-storefront-front.png`
- `proof-modules-d3-side-back-alley.png`
- `proof-modules-d1-pavilion.png`
- `proof-modules-minimap-preserved.png`
- `proof-full-selfcheck.json`

## URLs (cache-bust `0905d1d`)
**Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=0905d1d&mobile=on&portraitlayout=1

**Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=0905d1d&mobile=on&portraitlayout=1