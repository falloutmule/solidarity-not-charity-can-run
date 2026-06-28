# Project status — Solidarity Not Charity Can Run

Last updated: building module / facade role pass (`modules1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| Field | Value |
|-------|-------|
| BUILD_ID | `modules1` |
| Gameplay commit | `0905d1d` |
| Map | Procedural **40×20** |

**Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=0905d1d&mobile=on&portraitlayout=1

**Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=0905d1d&mobile=on&portraitlayout=1

## Recent shipped cards

- **modules1** — semantic building modules + facade roles; report `reports/guards/BUILDING_MODULE_FACADE_ROLE_REPORT.md`
- **facadefix1** — FPV broad facade panels; `2c80f71`
- **wallfix1** — FPV wall line artifact reduction
- **shimmerfix1** — matte FPV road

## Harness

Local: `npm run test:selfcheck` (Playwright + in-page `CR.runFullSelfCheck()`).