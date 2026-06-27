# Early District Progression Pass Report

**Card:** Early District Street Progression Pass  
**Date:** 2026-06-27  
**Backup:** `index.before-early-district-progression.html`  
**Previous baseline:** `park1` / `e801077`  
**New BUILD_ID:** `districts1`

## D1–D4 progression summary

| District | Identity | Layout tuning |
|----------|------------|---------------|
| **D1** | Park/community plaza, restroom pavilion landmark | Low building fill, wide road band, no vertical alleys; D1 park props unchanged |
| **D2** | Simple storefront street | Storefront face rows (glass/building), shallow 3-cell pockets, max 2 short vertical connectors; NPCs mostly on main road (≤1 tucked) |
| **D3** | Street + alleys/service lanes | Back-alley strips behind faces, segment vertical lanes, deeper pockets; NPCs/cans/props favor pockets and alleys |
| **D4** | More service pockets | Higher service-pocket carve rate, props clustered off main road; more tucked NPCs and spread cans |

**Footprint:** unchanged **40×20** (`STREET_FOOTPRINT_W` × `STREET_FOOTPRINT_H`).

## Safety / scope confirmations

- No moving blockers, moving NPCs, or can timers added
- Props remain **non-collision** (12-kind roster)
- Default mobile layout, `cannedRun.controls.v1`, `SAVE_VERSION` 1, Hall/save format unchanged
- No external assets; single-file `index.html`

## Harness

- **Local:** `npm run test:selfcheck` — **PASS**
- **`CR.runEarlyDistrictProgressionSelfCheck()`** — district seeds 880101–880104, reachability, progression metrics, spawn-zone stats
- **`CR.runFullSelfCheck()`** includes early-district check

## Proofs

| Artifact | Path |
|----------|------|
| JSON | `proof-early-district-progression.json` |
| D1 plaza | `proof-d1-park-plaza.png` |
| D2 storefront | `proof-d2-storefront-street.png` |
| D3 alleys | `proof-d3-alley-street.png` |
| D4 pockets | `proof-d4-service-pockets.png` |
| Full harness | `proof-full-selfcheck.json` |

## GitHub Actions

*(Fill after push.)*

## Play URLs

*(Fill with commit hash after push.)*