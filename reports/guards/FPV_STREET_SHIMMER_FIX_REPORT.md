# FPV STREET SHIMMER FIX REPORT

**Card:** FPV street shimmer / reflection fix  
**Date:** 2026-06-27

## Baseline

| Field | Value |
|-------|-------|
| Backup | `index.before-fpv-street-shimmer-fix.html` |
| Previous | `streetread1` / `3cd3b7f` |
| New BUILD_ID | `shimmerfix1` |
| Gameplay commit | *(after push)* |

## Root cause

`crDrawFpvStreetReadabilityCues()` drew **full-width horizontal bands at the horizon** (`RH/2` … `RH/2+6`) with **high-contrast rgba** (up to 0.28–0.32 alpha). Those overlays are **screen-fixed** while walls scroll in the raycaster, which reads as **wet/reflective shimmer** along storefronts.

Contributing factors:
- Bright floor gradient at the horizon (`#4a4a52` top stop).
- Yellow **road flecks** at `RH/2+2` (thin 2×1 rects).
- **Per-column** procedural facade cues on every wall column (high-frequency bands while moving).

## Fix (FPV only)

1. **`crDrawFpvStreetReadabilityCues`:** Single **matte** zone tint on the **lower 28%** of the screen (`RH * 0.72`); **no horizon bands**.
2. **Floor:** Darker, lower-contrast matte asphalt gradient; **removed** center flecks.
3. **Facades:** Procedural cues on **every other column** (`col & 1`); softened GLASS awning strip (lower alpha, slightly thicker).

| Gameplay commit | `7f3ad89` |

## Harness

- **Local:** `npm run test:selfcheck` — **PASS**
- **CI:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28306018599 — **success**
- **Artifact:** `snc-can-run-proof-artifacts`

## URLs

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=7f3ad89&mobile=on&portraitlayout=1
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=7f3ad89&mobile=on&portraitlayout=1