# SNC Can Run — project status

**Last updated:** Facade pack v2 safe module import (`facadev2safe1`)

## Gameplay baseline

| Field | Value |
|-------|-------|
| **BUILD_ID** | `facadev2safe1` |
| **Prior baseline** | `facadepack1` / `0a8d34f` |
| **Lab reference** | `snc-building-module-lab-v2.html` @ `af37c54` |
| **Backup** | `index.before-facade-pack-v2-safe-modules.html` |

## Play (cache-bust after push)

`https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<commit>&mobile=on&portraitlayout=1`

## Self-check

`https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1`

## Facade pack

`CR_FACADE_PACK` in `index.html` (markers `BEGIN`/`END SNC FACADE PACK v1`). Shipped modules include **`garage_service_4x2`** and **`boarded_shop_3x2`**. Snapshot: `proof-facade-pack-v2-safe.txt`. Lab v2 remains standalone — two-story / walk-in / corner modules not in gameplay.

## Harness

```bash
npm run test:selfcheck
```

## Guard report

`reports/guards/FACADE_PACK_V2_SAFE_MODULE_IMPORT_REPORT.md`