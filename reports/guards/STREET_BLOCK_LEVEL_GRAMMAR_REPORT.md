# Street-block level design grammar pass

**Card:** STREET-BLOCK LEVEL DESIGN GRAMMAR PASS  
**BUILD_ID:** `street1`  
**Gameplay commit:** `3cb957a`  
**Prior baseline:** `propsread1` / `e6f6af6`

## Backup

- `index.before-street-block-level-grammar.html` (repo root; gitignored by default, force-added on ship commit)

## Level grammar summary

Procedural `genCity()` now uses **street-block layout grammar** on the same **40×20** grid:

- **MAIN_ROAD** — horizontal central travel spine (rows around map midline), re-stamped after alleys so it stays open
- **Spine connectors** — vertical floor strips at fixed X slots for orientation
- **SIDE_BUILDING** — chunky storefront rows north/south of the road (segmented blocks, not random maze teeth)
- **BACK_ALLEY / SERVICE** — top/bottom service rows (D2+) and vertical alley carves behind building bands
- **POCKETS** — small carved pockets behind storefronts (complexity scales with district)
- **Zone placement** — cans, NPCs, and the 12-kind decor roster use `crStreetZoneAt` + district ladder (D1 open/road-visible → later districts tucked in pockets/alleys)

Internal helpers: `applyStreetBlockGrammar`, `crStreetLayoutMetrics`, `crStreetPropKindForZone`, `game.streetLayoutMeta`.

## District complexity ladder (implemented)

| District | Behavior |
|----------|----------|
| D1 | Wide road, park-style opening, minimal optional building mass |
| D2+ | Guaranteed north/south **storefront face** rows per street segment |
| D3+ | Extra pocket carves behind buildings |
| D4–D5 | Higher fill / alley bias; road spine preserved |

Modifiers `clear`, `maze`, `shortage` still adjust fill/alley bias without changing footprint.

## Confirmations

- Map footprint **unchanged** (40×20)
- D1 remains **simpler/open** (self-check: main road mass vs building mass)
- Later districts add **alleys, pockets, storefronts** — not map size
- **No** moving cars/blockers, moving NPCs, or can timers
- **12-kind** decor roster unchanged; props **non-collision**
- Portrait layout, controls, OPTIONS, EDIT CONTROLS, `SAVE_VERSION`, `cannedRun.save.v1`, `cannedRun.controls.v1`, Hall format **unchanged**
- Default custom level layouts **unchanged** (Hall / specials untouched)

## Harness

- **`CR.runStreetBlockLevelSelfCheck()`** — footprint, spine, buildings (D2+), alleys (D>1), D1 openness, per-seed reachability, prop non-collision
- Wired into **`CR.runFullSelfCheck()`**
- Playwright: **`streetBlockLevelSection`** in `tests/run_selfcheck_playwright.js`

**Local:** `npm run test:selfcheck` — **PASS** (2026-06-27)

## CI

- **Workflow:** SNC Can Run Selfcheck  
- **Run:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28295099113  
- **Artifact:** `snc-can-run-proof-artifacts`

## Proof artifacts

| Path | Purpose |
|------|---------|
| `proof-street-block-level.json` | In-browser street-block self-check |
| `proof-street-block-d1.png` | D1 open layout |
| `proof-street-block-d2.png` | D2 storefront sides |
| `proof-street-block-d3.png` | D3+ alleys/pockets |
| `proof-street-block-minimap.png` | Minimap street readability |
| `proof-full-selfcheck.json` | Full `CR.runFullSelfCheck()` |
| `proof-playwright-summary.json` | Playwright suite summary |

## URLs (cache-bust)

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=3cb957a&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=3cb957a&mobile=on&portraitlayout=1

## Travis action

**None required** when CI and local harness are green.