# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`facadetexture1`** |
| **Previous gameplay baseline** | `buildingsmooth1` / `0b41159`; `facadefinal1` / `0761c94`; `groundplane1` / `9d48802`; split infra `35c74cc` |
| **Infrastructure** | Split-source build pipeline (`src/` → `index.html`) |
| **Gameplay commit** | `c511936` — `fix(render): use continuous facade textures` |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=c511936&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=c511936&mobile=on&portraitlayout=1`

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

- **BUILD_ID:** `feel2` (unchanged)
- Viewport authority, semantic actions, input guard, `World` adapter, fixed-step baseline, raycast debug proofs in Playwright `corePass`
- Report: `reports/guards/ENGINE_HARDENING_PHASE_REPORT.md`
- Fixed-step **simulation rewrite** (card 5) deferred; baseline in `proof-fixed-step-baseline.json`

## Fixed-step simulation (2026-07-01, Card 5)

- **1/60s accumulator** in `frame()` via `crStepSimulationFixed`; look applied once per frame before stepping.
- Proof: `proof-fixed-step-simulation.json` (Playwright `corePass`); report: `reports/guards/FIXED_STEP_SIMULATION_REPORT.md`.
