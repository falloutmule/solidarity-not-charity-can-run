# PLAYWRIGHT_SELF_CHECK_HARNESS_REPORT

## WHAT WAS DONE

- Backup: `index.before-playwright-selfcheck-harness.html`
- `BUILD_ID` → **selfharness1**
- In-game CR API: `runLayoutSelfCheck`, `runInputSelfCheck`, `runLevelSelfCheck`, `runRenderSelfCheck`, `runFullSelfCheck`, `showCrSelfCheckOverlay`
- `?selfcheck=1` boot overlay (single run, `window.__crSelfCheckResult`)
- `tests/run_selfcheck_playwright.js` — local HTTP server, network guard, console/pageerror hooks, viewports, dock regression, pointer torture, viewport resilience, save/load, audio, visual shots, constitution static check
- `tests/SELF_CHECK_README.md`, `SELF_CHECK_RUNS.md`

## WHAT WAS VERIFIED

| Area | Verdict | Evidence |
|------|---------|----------|
| Static constitution | PASS | `proof-constitution-check.json` |
| CR.runFullSelfCheck | PASS | `proof-full-selfcheck.json` |
| Playwright summary | PASS | `proof-playwright-summary.json` (`pass: true`) |
| Network (no external) | PASS | `proof-network.json` |
| Console/page errors | PASS | summary `console.pass`, `pageErrors.pass` |
| Control dock | PASS | `proof-control-dock-playwright.json` |
| Pointer torture | PASS | `proof-pointer-torture.json` |
| Viewport resilience | PASS | `proof-viewport-resilience.json` |
| Save/load (http) | PASS | `proof-save-load-roundtrip.json` |
| Audio unlock | PASS | `proof-audio-unlock.json` |
| Render/halo/zbuffer | PASS | `proof-full-selfcheck.json` → `render.pass` |
| Layout | PASS | `proof-full-selfcheck.json` → `layout.pass` |
| Input | PASS | `proof-full-selfcheck.json` → `input.pass` |
| Levels (normal + hall) | PASS | `proof-full-selfcheck.json` → `levels.pass` |
| Title | PASS | `<title>Solidarity Not Charity Can Run</title>` |
| no eval / no onclick | PASS | constitution checks |

**Command run:** `node tests/run_selfcheck_playwright.js` → exit **0**

**CR in console:** `CR.runFullSelfCheck().pass === true` (matches Playwright evaluate)

## WHAT FAILED

- None in automated harness (2026-06-26 local run).

## CURRENT EXACT STATE

- Repo: `C:\Users\fallo\Documents\HermesProjects\canned-run`
- Shipped artifact: `index.html` only (`selfharness1`)
- Prior baseline: `menufix1` / `040aea6`
- Harness: `tests/run_selfcheck_playwright.js` + proof artifacts at repo root

## REMAINING BLOCKERS

- **Real-phone confirmation** (feel, SNC Hall on device) — not run in agent environment; Travis only after harness PASS.

## NEXT ACTIONABLE STEP

1. Travis: hard-refresh cache-busted URL below.
2. Start run, confirm controls feel right, SNC Hall starts.
3. Report only deltas vs automated proof.

## EVIDENCE

**Backup:** `index.before-playwright-selfcheck-harness.html`

**Functions added:** `showCrSelfCheckOverlay`, `crPrepareSelfCheckPortrait`, `crDispatchPointer`, `crDispatchTouch`, `runLayoutSelfCheck`, `runInputSelfCheck`, `runLevelSelfCheck`, `runRenderSelfCheck`, `runFullSelfCheck` (+ existing `runControlDockSelfCheck`)

**How to run CR:** load game → `CR.runFullSelfCheck()`

**How to run Playwright:** `node tests/run_selfcheck_playwright.js`

**Screenshots (sample):**

- `proof-playwright-pixel7-portrait.png`
- `proof-playwright-pixel7-landscape.png`
- `proof-playwright-travislike-portrait.png`
- `proof-playwright-desktop-smoke.png`
- `proof-visual-normal-seed42.png`, `proof-visual-snc-hall.png`, `proof-visual-options.png`, `proof-visual-dock-mid.png`, `proof-visual-dock-high.png`

**Full self-check excerpt:** `proof-full-selfcheck.json` → `"pass": true`, `"build": "selfharness1"`

**Commit:** (filled after push)

## GITHUB PAGES URL

- Normal: https://falloutmule.github.io/solidarity-not-charity-can-run/
- Cache-busted: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=COMMIT&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=COMMIT&mobile=on&portraitlayout=1