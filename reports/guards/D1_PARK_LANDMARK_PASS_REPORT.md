# D1 Park Landmark Pass Report

**Card:** D1 Park Landmark / Bathroom Gazebo Pass  
**Date:** 2026-06-27  
**Backup:** `index.before-d1-park-landmark.html`  
**Previous baseline:** `BUILD_ID` `street1` / commit `3cb957a`  
**New BUILD_ID:** `park1`  
**Gameplay commit:** `e801077`

## Landmark identity

**Restroom / public pavilion** — procedural `WALL.CONCRETE` shell with `WALL.MURAL` bulletin face, south-facing door gap toward the main road spine. Slightly off-center (east band, x≈15–19), north of the open spine when seed bias allows.

## Placement summary

- Landmark: 5×3 collision footprint, door cells open, plaza pad + side walkways carved so the player cannot be trapped.
- Applied only when `district === 1` via `crApplyD1ParkLandmark()` after `applyStreetBlockGrammar()`.
- D2+ unchanged (`game.d1ParkLandmark` cleared).

## D1 prop placement summary

- `crPlaceD1ParkCommunityProps()` clusters benches, signboards, mailbox, scrub/agave, utility box, cooler, crates, cart, and edge tarp around the pavilion and NW park corner; fills to 12 props with `crD1ParkPropKind()` on remaining road/pocket spots.
- **12-kind decor roster unchanged** (no new tree kind; scrub/agave imply park edge).

## Confirmations

| Item | Status |
|------|--------|
| Map footprint 40×20 | Unchanged |
| D1 simple/open | Open spine retained (self-check metrics) |
| Moving blockers / moving people / can timers | Not added |
| Props non-collision | Verified |
| Default portrait layout / controls | Unchanged |
| `cannedRun.controls.v1` | Unchanged |
| `SAVE_VERSION` / `cannedRun.save.v1` | Unchanged |
| Hall / save format | Unchanged |
| External assets / eval / inline handlers | None |

## Harness

- **Local:** `npm run test:selfcheck` — **PASS** (`{"pass":true}`)
- **Self-check:** `CR.runD1ParkLandmarkSelfCheck()` included in `CR.runFullSelfCheck()`
- **Playwright:** `d1ParkLandmarkSection` + `streetBlockLevelSection`

## Proof artifacts

| Path | Role |
|------|------|
| `proof-d1-park-landmark.json` | D1 park landmark self-check |
| `proof-d1-park-landmark-fpv.png` | D1 FPV (seed 880101) |
| `proof-d1-park-landmark-minimap.png` | D1 minimap |
| `proof-full-selfcheck.json` | Full in-browser self-check |
| `proof-playwright-summary.json` | Playwright aggregate |

**CI artifact name:** `snc-can-run-proof-artifacts`

## URLs (cache-bust after CI)

- **Play:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=e801077&mobile=on&portraitlayout=1`
- **Self-check:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=e801077&mobile=on&portraitlayout=1`

## GitHub Actions

- **Run:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28295826828 — **success** on `e801077`