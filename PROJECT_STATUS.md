# Project status — Solidarity Not Charity Can Run

Last updated: level selector pass (`levelselect1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| Field | Value |
|-------|-------|
| **BUILD_ID** | `levelselect1` |
| **Gameplay commit** | `9136c01` |
| **Backup** | `index.before-level-selector.html` (local) |

**Play (cache-busted):**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?v=9136c01&mobile=on&portraitlayout=1

**Self-check:**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=9136c01&mobile=on&portraitlayout=1

## Level selector (testing)

- **START DISTRICT: D1–D4** row below **NEW RUN** on title menu.
- Cycle district, then **NEW RUN** starts fresh at selection (default D1).
- Normal progression / continue / save format unchanged.

## Early districts (D1–D4)

- **D1:** Park/community plaza + restroom pavilion
- **D2:** Storefront street, shallow pockets
- **D3:** Alleys and service lanes
- **D4:** Tucked pockets and off-road cans/NPCs

Same **40×20** footprint; street-block grammar with per-district knobs.

## Prior baselines

| BUILD_ID | Commit | Note |
|----------|--------|------|
| `districts1` | `6b43a16` | Early district progression |
| `park1` | `e801077` | D1 park landmark |
| `street1` | `3cb957a` | Street-block grammar |

## Guard report

`reports/guards/LEVEL_SELECTOR_PASS_REPORT.md`