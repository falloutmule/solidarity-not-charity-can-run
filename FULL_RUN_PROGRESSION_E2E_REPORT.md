# FULL RUN PROGRESSION E2E REPORT

## WHAT WAS DONE

- Backup: `index.before-full-run-progression-e2e.html`
- Prior baseline: **multiseed1 / ec44e53**
- **BUILD_ID:** `runprog1`
- **`CR.runFullRunProgressionSelfCheck()`** — normal run E2E, mid-run save/load, post-completion save/load, Hall + mobile regressions
- **SAVE** serialize/load now preserves **`screenState`** and **`upgradeOffered`** for district-complete (UPGRADE) reload
- Playwright **`fullRunProgressionSection()`** + proofs

## WHAT WAS VERIFIED

- **Normal run (seed 880017, district 1, modifier clear):** `tickPickups` collection, **`giveCan`** until quota, **`completeDistrict`**, **`chooseUpgrade(0)`** → district 2
- **Mid-run (seed 880018):** real **`SAVE.serialize` / `SAVE.load`** via `crHarnessWriteSaveToStorage`; position, cans, district, seed preserved; input clean after load
- **Post-completion (seed 880019):** save in **UPGRADE**, corrupt state, load restores **UPGRADE**, helped, district, upgrade offers
- **Hall:** `runHallSelfCheck` inside full-run card
- **Mobile:** `runMobileControlReliabilitySelfCheck` inside full-run card
- Harness clears save + title restore; no harness leak
- Full Playwright harness **pass**

## WHAT FAILED

- Nothing in automated proof.

## CURRENT EXACT STATE

- **BUILD_ID:** `runprog1`
- **Gameplay commit:** (see git push below)
- Collection via **`tickPickups`**; GIVE via **`giveCan`**; exit via **`completeDistrict`**; progression via **`chooseUpgrade`**

## REMAINING BLOCKERS

- None for this card.

## NEXT ACTIONABLE STEP

- Optional: full-run progression E2E guard is shipped; next cards per roadmap.

## EVIDENCE

- `proof-full-run-progression.json`
- `proof-full-run-before-save.json`, `proof-full-run-after-load.json`
- `proof-full-run-complete.png` (if screenshot succeeded)
- `proof-playwright-summary.json`

## GITHUB PAGES URL

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=COMMIT&mobile=on&portraitlayout=1`
- Self-check: `?selfcheck=1&v=COMMIT&mobile=on&portraitlayout=1`