# FPV WALL LINE ARTIFACT FIX REPORT

**Card:** FPV wall line artifact fix  
**Date:** 2026-06-27

## Baseline

| Field | Value |
|-------|-------|
| Backup | `index.before-fpv-wall-line-artifact-fix.html` |
| Previous | `shimmerfix1` / `7f3ad89` |
| **BUILD_ID** | **`wallfix1`** |
| Gameplay commit | *(after push)* |

## Root cause

1. **Per-pixel texture U:** Raycaster sampled `wallX * 64` per screen column → high-frequency vertical combing on large faces (moiré on phone).
2. **GLASS / GARAGE tiles:** Vertical mullions and side rails in `WALL_TEX` amplified stripes when column-sampled.
3. **Per-column facade cues:** `crDrawProceduralFacadeCue` on alternating screen columns (`col & 1`) stacked thin vertical rects on every wall slice.
4. **Strong per-cell shade:** `0.82 + 0.30 * shade` flickered column-to-column.

## Changes

- **`crCoarseWallTexX`:** 8px-wide texture U bands for building walls (`CR_FPV_WALL_TEX_COARSE = 8`); fences keep 2px sampling only on `WALL.FENCE`.
- **Facade cues:** World **`wallBand`** (`floor(wallX * 5)`); only bands 1 and 3; broader 3px panels; no garage comb loop.
- **Textures:** GLASS single pane + sign band (no center mullion); GARAGE horizontal seams only; BUILDING lower noise density.
- **Shade:** `0.90 + 0.10 * shade` (was 0.82/0.30).

| Gameplay commit | `d419ca9` |

## Harness

- **Local:** `npm run test:selfcheck` — **PASS**
- **CI:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28309063210 — **success**
- **Artifact:** `snc-can-run-proof-artifacts`
- **Proofs:** `proof-fpv-wall-line-artifact-fix.json`, `proof-fpv-wallfix-d1.png`, `proof-fpv-wallfix-d2-storefront.png`, `proof-fpv-wallfix-d3-alley.png`, `proof-wallfix-minimap-preserved.png`

## URLs

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=d419ca9&mobile=on&portraitlayout=1
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=d419ca9&mobile=on&portraitlayout=1