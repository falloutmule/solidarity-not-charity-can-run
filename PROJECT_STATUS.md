# Project status — Solidarity Not Charity Can Run

Last updated: early district progression pass (`districts1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| Field | Value |
|-------|-------|
| **BUILD_ID** | `districts1` |
| **Gameplay commit** | `6b43a16` |
| **Backup** | `index.before-early-district-progression.html` |

**Play (cache-busted):**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?v=6b43a16&mobile=on&portraitlayout=1

**Self-check:**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=6b43a16&mobile=on&portraitlayout=1

## Early districts (D1–D4)

- **D1:** Park/community plaza + restroom pavilion (easy, open)
- **D2:** Storefront street, shallow pockets
- **D3:** Alleys and service lanes behind/beside buildings
- **D4:** More tucked pockets and off-road cans/NPCs

Same **40×20** footprint; street-block grammar with per-district knobs.

## Prior baselines

| BUILD_ID | Commit | Note |
|----------|--------|------|
| `park1` | `e801077` | D1 park landmark |
| `street1` | `3cb957a` | Street-block grammar |

## Guard report

`reports/guards/EARLY_DISTRICT_PROGRESSION_REPORT.md`

## Local verify

```bash
npm run test:selfcheck
```

## Proof artifacts

- `proof-early-district-progression.json`
- `proof-d1-park-plaza.png` … `proof-d4-service-pockets.png`
- `proof-full-selfcheck.json`
- CI artifact: `snc-can-run-proof-artifacts`