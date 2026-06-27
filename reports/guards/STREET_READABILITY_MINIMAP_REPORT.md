# STREET READABILITY / MINIMAP REPORT

**Card:** Street readability / minimap simplification  
**Date:** 2026-06-27

## Baseline

| Field | Value |
|-------|-------|
| Backup | `index.before-street-readability-minimap.html` |
| Previous BUILD_ID | `buildscale1` |
| Previous commit | `0092fab` |
| New BUILD_ID | `streetread1` |
| Gameplay commit | `3cd3b7f` |

## What changed

### Minimap (navigation-first)
- Buildings render as **solid limited-tone masses** via `crMinimapNavCellColor()` — no per-wall-type facade mosaic (`WALL_MINI` only used in FPV).
- **Open cells** tinted by zone: main road, alley band, sidewalk-adjacent strip, pocket/service space.
- Player, cans, people, exit markers unchanged.

### FPV (expressive, clearer hierarchy)
- **Building mass preserved:** `CR_BUILDING_FPV_MASS` still **1.5**; textured facades + procedural cues unchanged.
- Added `crDrawFpvStreetReadabilityCues()` — subtle road edge, curb, and storefront-adjacent strips when near buildings.

### Sign/pole clutter
- Road props use **weighted spawn** (`crPickWeightedRoadProp`) — signboards ~10% vs equal mix before.
- District prop budget **6+d+rand(4)** (was 8+d+rand(5)).
- D1 fixed plans: one signboard → mural_panel; duplicate signboard → bench.
- Signboard board colors slightly **muted**.

## Preserved
- Map **40×20**, START DISTRICT selector, D1–D4 identities, controls, OPTIONS, EDIT CONTROLS, `SAVE_VERSION`, `cannedRun.save.v1`, `cannedRun.controls.v1`, Hall, non-collision props, no moving blockers/NPCs/timers.

## Harness
- **Local:** `npm run test:selfcheck` — **PASS**
- **CI:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28302438616 — **success**
- **Artifact:** `snc-can-run-proof-artifacts`

## Proof files
- `proof-street-readability-minimap.json`
- `proof-street-readability-d1.png` … `proof-street-readability-d4.png`
- `proof-street-readability-minimap.png`
- `proof-full-selfcheck.json`

## URLs (cache-bust with gameplay commit)
- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=3cd3b7f&mobile=on&portraitlayout=1
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=3cd3b7f&mobile=on&portraitlayout=1