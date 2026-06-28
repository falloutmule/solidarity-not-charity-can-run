# Project status — Solidarity Not Charity Can Run

Last updated: FPV street shimmer fix (`shimmerfix1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| Field | Value |
|-------|-------|
| BUILD_ID | `shimmerfix1` |
| Commit | `7f3ad89` |
| Prior | `streetread1` / `3cd3b7f` |

**Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=7f3ad89&mobile=on&portraitlayout=1

**Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=7f3ad89&mobile=on&portraitlayout=1

## Recent closure

- **shimmerfix1** — matte FPV road; removed horizon band overlays from `crDrawFpvStreetReadabilityCues`; report `reports/guards/FPV_STREET_SHIMMER_FIX_REPORT.md`
- **streetread1** — nav-first minimap (`3cd3b7f`)
- **buildscale1** — building FPV mass ×1.5 (`0092fab`)

## Harness

`npm run test:selfcheck` — full Playwright + in-page gates including `CR.runFpvStreetShimmerFixSelfCheck()`.