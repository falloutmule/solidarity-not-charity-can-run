# PROCEDURAL LEVEL VALIDATION REPORT

## WHAT WAS DONE

- Backup: `index.before-multiseed-level-validation.html`
- Prior baseline: **reachlos1 / 5736c8c**
- **BUILD_ID:** `multiseed1`
- Added **`CR.runProceduralLevelValidationSelfCheck()`** — **52** deterministic cases (seeds **1–25**, edge seeds **0, 42, 12345, 99999**, districts **1–3** on seeds **1–10**, modifiers **clear / maze / shortage** on seed **42**)
- Playwright **`proceduralLevelValidationSection()`** + **`proof-procedural-level-validation.json`**
- Wired into **`CR.runFullSelfCheck()`** and Playwright summary gate
- **Generator logic unchanged** — `genCity` already flood-fills reachable cells for placement; validation proves it across seeds

## WHAT WAS VERIFIED

Per generated level: rectangular **40×20** map, valid spawn (`canStand`), BFS reachable area ≥ **48** cells, exit reachable, reachable NPC count ≥ **quota**, reachable can sum ≥ **quota**, no runtime errors, harness state restored after run.

## WHAT FAILED

Nothing — all **52** levels passed.

## CURRENT EXACT STATE

- **levelsChecked:** 52, **levelsPassed:** 52, **levelsFailed:** 0
- **districtCount:** 3
- **minReachableCells:** 277, **maxReachableCells:** 421
- **totalUnreachablePickups:** 0, **totalUnreachableNpcs:** 0
- Full Playwright + CR self-check: **pass**

## REMAINING BLOCKERS

None for this card.

## NEXT ACTIONABLE STEP

Optional: expand seed matrix or add post-generation repair loop only if a future seed fails.

## EVIDENCE

- `proof-procedural-level-validation.json` (pass)
- `proof-playwright-summary.json` (pass)
- `proof-reachability.json`, `proof-release-artifact.json`, `proof-ai-safe-constitution.json`
- No `proof-procedural-failures.json` (no failures)

## GITHUB PAGES URL

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=ec44e53&mobile=on&portraitlayout=1`
- Self-check: `?selfcheck=1&v=ec44e53&mobile=on&portraitlayout=1`