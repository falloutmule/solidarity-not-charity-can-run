# Project status — Solidarity Not Charity Can Run

Last updated: building scale polish (`buildscale1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| Field | Value |
|-------|-------|
| **BUILD_ID** | `buildscale1` |
| **Gameplay commit** | `0092fab` |
| **Backup** | `index.before-building-scale-polish.html` (local) |

**Play (cache-busted):**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?v=0092fab&mobile=on&portraitlayout=1

**Self-check:**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=0092fab&mobile=on&portraitlayout=1

## Building scale (buildscale1)

- Stronger **storefront / side-band** footprints on D2–D4; **7×4** D1 pavilion.
- **FPV** wall height ×1.5 + procedural door/window/awning cues.
- **40×20** map, level selector, save/controls/Hall unchanged.

## Level selector (testing)

- **START DISTRICT: D1–D4** below **NEW RUN**; **NEW RUN** uses selection (default D1).

## Early districts (D1–D4)

- **D1:** Open park/plaza + substantial restroom pavilion  
- **D2:** Storefront rows  
- **D3:** Alleys behind building mass  
- **D4:** Service pockets  

## Prior baselines

| BUILD_ID | Commit | Note |
|----------|--------|------|
| `levelselect1` | `9136c01` | START DISTRICT selector |
| `districts1` | `6b43a16` | Early district progression |

## Guard reports

- `reports/guards/BUILDING_SCALE_POLISH_REPORT.md`
- `reports/guards/LEVEL_SELECTOR_PASS_REPORT.md`