# BUILDING SCALE POLISH REPORT

**Card:** Building scale / street mass polish  
**Date:** 2026-06-27

## Baseline

| Field | Value |
|-------|-------|
| Previous BUILD_ID | `levelselect1` |
| Previous commit | `9136c01` |
| Backup | `index.before-building-scale-polish.html` (local) |

## New baseline

| Field | Value |
|-------|-------|
| BUILD_ID | `buildscale1` |
| Gameplay commit | `0092fab` |

## What changed

**Template / minimap mass (40×20 unchanged)**

- Raised district `buildingFill` for D2–D4 and thicker **storefront facade rows** (3 rows on D2, 4 on D3–D4) with stronger side-band fill near the street face.
- D2+ bands use **wider inset** (0) so building blocks read more continuous along segments.
- **D1 restroom pavilion** footprint **7×4** (was 5×3), mixed **CONCRETE / BUILDING / MURAL** walls for clearer landmark mass.

**FPV (first-person)**

- `CR_BUILDING_FPV_MASS = 1.5` — wall slices render ~50% taller (fences/vans unchanged; pavilion slightly taller).
- **Procedural facade cues** on scaled walls: doors, window strips, awning band on glass, garage seams, bulletin panel on mural/concrete.

**Unchanged**

- Level selector (START DISTRICT below NEW RUN, D1–D4).
- SAVE_VERSION / `cannedRun.save.v1`, `cannedRun.controls.v1`, OPTIONS / EDIT CONTROLS.
- Props non-collision; no moving blockers / NPCs / can timers; no external assets.

## Harness

- New: `CR.runBuildingScalePolishSelfCheck()` in `CR.runFullSelfCheck()`.
- Playwright: `buildingScalePolishSection`, proofs listed below.

## Verification

| Check | Result |
|-------|--------|
| Local `npm run test:selfcheck` | PASS |
| Map footprint | 40×20 |
| Level selector | PASS |
| Reachability D1–D4 | PASS |

## CI

- GitHub Actions: https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28298975223 — **success**
- **Artifact:** `snc-can-run-proof-artifacts`

## Proof paths (repo root after local run)

- `proof-building-scale-polish.json`
- `proof-building-scale-d1.png` … `proof-building-scale-d4.png`
- `proof-building-scale-minimap.png`
- `proof-full-selfcheck.json`

## URLs

**Play:**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?v=0092fab&mobile=on&portraitlayout=1

**Self-check:**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=0092fab&mobile=on&portraitlayout=1