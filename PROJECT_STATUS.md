# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`walltextures2`** |
| **Previous gameplay baseline** | `walltextures1` / `d936677`; `feel2` / engine hardening `3a7b3d1` |
| **Infrastructure** | Split-source build pipeline (`src/` → `index.html`) |
| **Gameplay commit** | `50c1943` — `fix(render): tile building wall textures at world scale` |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=50c19432085fe40ab125587bfbd663ac5a63f649&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=50c19432085fe40ab125587bfbd663ac5a63f649&mobile=on&portraitlayout=1`

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

## Walltextures2 scale & variation (`walltextures2`)

- Tiles single building material at world scale (not full-facade stretch); stucco/cinderblock painter retune; overlays still facade U.
- Selfcheck: `CR.runWalltextures2ScaleVariationSelfCheck()`; proof: `proof-walltextures2-scale-variation.json` (Playwright `corePass`).
- Report: `reports/guards/WALLTEXTURES2_SCALE_AND_VARIATION_FIX_REPORT.md`

## Single-material building textures (`walltextures1`)

- One deterministic `materialKey` per building (`stucco`, `red_brick`, `light_gray_cinderblock`, `aluminum_siding`); continuous-facade base uses building material; door/window/sign overlays unchanged.
- Selfcheck: `CR.runSingleMaterialBuildingTextureSelfCheck()`; proof: `proof-single-material-building-textures.json` (Playwright `corePass`).
- Report: `reports/guards/SINGLE_MATERIAL_BUILDING_TEXTURES_REPORT.md`

## Fixed-step simulation (2026-07-01, Card 5)

- **1/60s accumulator** in `frame()` via `crStepSimulationFixed`; look applied once per frame before stepping.
- Proof: `proof-fixed-step-simulation.json` (Playwright `corePass`); report: `reports/guards/FIXED_STEP_SIMULATION_REPORT.md`.
