# LEVEL SELECTOR PASS REPORT

**Card:** Level/district selector for testing (below NEW RUN)  
**Date:** 2026-06-27

## Baseline

| Field | Value |
|-------|-------|
| Previous BUILD_ID | `districts1` |
| Previous gameplay commit | `6b43a16` |
| New BUILD_ID | `levelselect1` |
| Gameplay commit | `9136c01` |
| Backup (local) | `index.before-level-selector.html` |

## What changed

- **UI:** Title menu row **`START DISTRICT: D1`** directly **below `NEW RUN`** (mobile `rmenu` + canvas title list).
- **Interaction:** Tap/click cycles **D1 → D2 → D3 → D4 → D1** (`title-cycle-district`).
- **NEW RUN:** Starts a fresh run at **`crGetSelectedStartDistrict()`** (default **D1**); sets `game.run.highestDistrict` to the chosen district.
- **API:** `crGetSelectedStartDistrict`, `crCycleSelectedStartDistrict`, `crSetSelectedStartDistrict`, `crTitleMenuSelectableRows`, `titleMenuRowLabel` on `window.CR`.
- **Harness:** `CR.runLevelSelectorSelfCheck()` wired into `CR.runFullSelfCheck()`; Playwright `levelSelectorSection`.

## Confirmations

| Check | Result |
|-------|--------|
| Selector below NEW RUN | Yes (menu labels + `title-cycle-district` in rmenu HTML) |
| District range | D1–D4 |
| Direct start per district | Verified in self-check (seeds 881001–881004) |
| SAVE_VERSION / save format | Unchanged (`cannedRun.save.v1`, v1) |
| Controls / OPTIONS / EDIT CONTROLS | Unchanged (`cannedRun.controls.v1`) |
| D1–D4 layout identities | Still pass (park, storefront, alleys, pockets) |
| Hall | Unchanged (full suite Hall E2E still in gate) |
| Map size | 40×20 unchanged |

## Verification

| Layer | Result |
|-------|--------|
| Local `npm run test:selfcheck` | **PASS** |
| GitHub Actions | **PASS** — https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28298444924 |
| CI artifact | `snc-can-run-proof-artifacts` |

## Proof paths (local harness; CI artifact mirrors)

- `proof-level-selector.json`
- `proof-level-selector-menu.png`
- `proof-level-selector-d1.png` … `proof-level-selector-d4.png`
- `proof-full-selfcheck.json` → `levelSelector`
- `proof-playwright-summary.json` → `levelSelector`

## URLs (cache-busted)

**Play:**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?v=9136c01&mobile=on&portraitlayout=1

**Self-check:**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=9136c01&mobile=on&portraitlayout=1

## How to test on phone

1. Open Play URL → **MENU** on title.
2. Confirm order: **NEW RUN**, then **START DISTRICT: D1**.
3. Tap **START DISTRICT** until **D3** (or any target).
4. Tap **NEW RUN** — run should begin in that district (HUD/minimap reflect district).