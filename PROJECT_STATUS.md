# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`walltextures1`** |
| **Previous gameplay baseline** | `feel2` / engine hardening `3a7b3d1`; `facadetexture1` / `c511936`; `buildingsmooth1` / `0b41159` |
| **Infrastructure** | Split-source build pipeline (`src/` → `index.html`) |
| **Gameplay commit** | `d936677` — `feat(art): single-material building wall textures` |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=d93667755214c9bb28191c85ef14a9c572595820&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=d93667755214c9bb28191c85ef14a9c572595820&mobile=on&portraitlayout=1`

## Build workflow

```bash
npm run build        # combine src/ → index.html
npm run build:check  # verify index.html matches src/
npm run test:selfcheck
```

See **`src/README.md`**, **`reports/guards/SOURCE_SPLIT_BUILD_PIPELINE_REPORT.md`**, **`reports/guards/FPV_GROUND_PLANE_ALIGNMENT_REPORT.md`**, **`reports/guards/D2_D3_FACADE_READABILITY_FINAL_POLISH_REPORT.md`**, **`reports/guards/BUILDING_VISUAL_RESET_SMOOTH_WALL_STYLE_REPORT.md`**, and **`reports/guards/CONTINUOUS_FACADE_TEXTURE_NO_PANEL_GAPS_REPORT.md`**.

## Continuous facade texture CI

- Selfcheck: https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28372414445
- Pages: https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28372413468

## Engine hardening (2026-07-01)

- **BUILD_ID:** was `feel2` through hardening; art pass **`walltextures1`** bumps `BUILD_ID` for single-material building walls.
- Viewport authority, semantic actions, input guard, `World` adapter, fixed-step baseline, raycast debug proofs in Playwright `corePass`
- Report: `reports/guards/ENGINE_HARDENING_PHASE_REPORT.md`
- Fixed-step **simulation rewrite** (card 5) deferred; baseline in `proof-fixed-step-baseline.json`

## Single-material building textures (`walltextures1`)

- One deterministic `materialKey` per building (`stucco`, `red_brick`, `light_gray_cinderblock`, `aluminum_siding`); continuous-facade base uses building material; door/window/sign overlays unchanged.
- Selfcheck: `CR.runSingleMaterialBuildingTextureSelfCheck()`; proof: `proof-single-material-building-textures.json` (Playwright `corePass`).
- Report: `reports/guards/SINGLE_MATERIAL_BUILDING_TEXTURES_REPORT.md`

## Fixed-step simulation (2026-07-01, Card 5)

- **1/60s accumulator** in `frame()` via `crStepSimulationFixed`; look applied once per frame before stepping.
- Proof: `proof-fixed-step-simulation.json` (Playwright `corePass`); report: `reports/guards/FIXED_STEP_SIMULATION_REPORT.md`.
