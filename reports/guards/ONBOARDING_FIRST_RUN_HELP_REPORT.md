# Onboarding / first-run help report

## WHAT WAS DONE

- Backup: `index.before-onboarding-first-run.html`
- Added dismissible **How to Play** overlay (`#cronboard`) on first new run when `options.helpDismissed` is false
- Persisted dismissal in **options/settings** (`helpDismissed`) — **SAVE_VERSION unchanged** (game save format unchanged)
- Reopen: **PAUSE → HOW TO PLAY**, **OPTIONS → HOW TO PLAY**
- Note in panel: `resetcontrols=1` for misplaced mobile controls
- **`CR.runOnboardingSelfCheck()`**; included in **`CR.runFullSelfCheck()`**
- **BUILD_ID:** `runprog1` → **`onboard1`**

## WHAT WAS VERIFIED

- Local **`npm run test:selfcheck`**: **PASS** (`proof-playwright-summary.json`, `proof-full-selfcheck.json`)
- Onboarding checks: first-run visible, dismiss, reopen (API, pause, options), save/load with help flag, movement/timer after dismiss, portrait panel rect, no extra runtime errors
- Layout/controls: no repositioning of MENU, minimap, FPV, MOVE, GIVE, SPRINT, LOOK (layout self-check still in full suite)
- Static: no eval, no external runtime assets, title unchanged

## WHAT FAILED

- None (after harness save test used `crHarnessWriteSaveToStorage` under `_crBlockHarnessSave`)

## CURRENT EXACT STATE

| Field | Value |
|-------|-------|
| BUILD_ID | `onboard1` |
| Baseline | `runprog1` / `1437b6f` |
| Gameplay commit | `aaaf901` |
| Save format | **Unchanged** (`SAVE_VERSION` 2); options JSON gains optional `helpDismissed` |
| Backup | `index.before-onboarding-first-run.html` |

## REMAINING BLOCKERS

- None

## NEXT ACTIONABLE STEP

- None for this card

## EVIDENCE

- `reports/guards/ONBOARDING_FIRST_RUN_HELP_REPORT.md` (this file)
- `proof-full-selfcheck.json` → `onboarding.pass: true`
- `index.html` onboarding + `runOnboardingSelfCheckBody`

## GITHUB PAGES URL

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=aaaf901&mobile=on&portraitlayout=1
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=aaaf901&mobile=on&portraitlayout=1

## CI

- **Run:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28257318045 — **success**
- **Artifact:** `snc-can-run-proof-artifacts`

## Player-facing behavior

- **First new run:** overlay with short loop (cans → GIVE → quota → exit → upgrade → next district) and control labels
- **Dismiss:** GOT IT (sets `helpDismissed`, saves options)
- **Again:** MENU (paused) or OPTIONS → **HOW TO PLAY**
- Harness runs do not auto-show overlay (`_crHarnessDepth > 0`)