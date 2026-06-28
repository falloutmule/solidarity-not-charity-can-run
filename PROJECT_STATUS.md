# SNC Can Run — project status

**Last updated:** Facade pack bridge / lab sync pass (`facadepack1`)

## Gameplay baseline

| Field | Value |
|-------|-------|
| **BUILD_ID** | `facadepack1` |
| **Prior baseline** | `modules1` / `0905d1d` |
| **Backup** | `index.before-facade-pack-bridge.html` |

## Play (cache-bust after push)

`https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<commit>&mobile=on&portraitlayout=1`

## Self-check

`https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1`

## Facade pack

Copy-paste block in `index.html`: `/* BEGIN SNC FACADE PACK v1 */` … `/* END SNC FACADE PACK v1 */` — `CR_FACADE_PACK` (modules, roles, slots, materials). Snapshot: `proof-facade-pack-v1.txt`.

## Harness

```bash
npm run test:selfcheck
```

## Guard report

`reports/guards/FACADE_PACK_BRIDGE_REPORT.md`