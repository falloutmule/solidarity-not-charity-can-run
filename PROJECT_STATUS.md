# Project status — Solidarity Not Charity Can Run

Last updated: FPV facade target polish (`facadefix1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| Field | Value |
|-------|-------|
| BUILD_ID | `facadefix1` |
| Gameplay commit | `2c80f71` |
| Map | Procedural **40×20** |

**Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=2c80f71&mobile=on&portraitlayout=1  

**Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=2c80f71&mobile=on&portraitlayout=1  

## Recent shipped cards

- **facadefix1** — FPV broad facade panels; CI https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28318735058
- **wallfix1** — FPV wall line artifact reduction; CI run 28309063210
- **shimmerfix1** — matte FPV road; `7f3ad89`
- **streetread1** — minimap navigation-first; `3cd3b7f`
- **buildscale1** — larger building FPV mass; `0092fab`
- **levelselect1** — START DISTRICT D1–D4; `9136c01`
- **districts1** — early D1–D4 progression; `6b43a16`

## Harness

Local: `npm run test:selfcheck` — must pass before push.

## Reports

See `reports/README.md` and `reports/guards/FPV_FACADE_TARGET_POLISH_REPORT.md`.