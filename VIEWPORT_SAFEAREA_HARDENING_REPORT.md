# VIEWPORT SAFE-AREA HARDENING REPORT

## WHAT WAS DONE

- Backup: `index.before-viewport-safearea-hardening.html`
- Baseline: **isofix1 / a12ee0a**
- **`BUILD_ID` → `viewportfix1`**
- Added **`CR.runViewportSafeAreaSelfCheck()`** (harness-isolated via `crWithTemporaryState`)
- Wired into **`CR.runFullSelfCheck()`**
- Playwright **`viewportSafeAreaSection()`** — Pixel 7 portrait/landscape, Travis-like, short/tall portrait (URL bar), resize re-check
- Small fixes (proof-driven only):
  - **`syncVisualViewportShell()`** on fullscreen change
  - **`window.__crVvResizeHooked`** flag for listener proof
  - Landscape **`#mr`** height → **`var(--app-vh-px)`** (not raw `100%`)
  - **`crForceMobileOverlayVisible()`** so controls measure correctly in headless/Playwright
  - Portrait vs landscape branches in self-check (no forced portrait UI on landscape URL)

## WHAT WAS VERIFIED

- **`CR.runViewportSafeAreaSelfCheck().pass === true`** (all scenarios)
- **OPTIONS BACK reachable** (`optionsBackReachable` + `proof-options-back-reachable.png`)
- **Stats/controls safe-area** (portrait rects + landscape partial visibility)
- **`CR.runHarnessIsolationSelfCheck().pass === true`**
- **`CR.runRenderFailureSelfCheck().pass === true`**
- **`CR.runHallSelfCheck().pass === true`**
- **`CR.runFullSelfCheck().pass === true`**
- **`node tests/run_selfcheck_playwright.js`** exit **0**, **`proof-playwright-summary.json` → pass: true**
- **`proof-viewport-safearea.json` → pass: true**

## WHAT FAILED

- Nothing on final run.

## CURRENT EXACT STATE

- Repo: `C:\Users\fallo\Documents\HermesProjects\canned-run`
- Single-file game unchanged architecturally; layout contract preserved (no redesign)
- Viewport shell already used **`100dvh`**, **`viewport-fit=cover`**, **`--app-vh-px`**, **`visualViewport`** — hardened with regression checks

## REMAINING BLOCKERS

- None for this card.

## NEXT ACTIONABLE STEP

- User picks next kanban card; optional real-device spot-check only if desired (not required).

## EVIDENCE

- `proof-viewport-safearea.json`
- `proof-viewport-pixel7-portrait.png`
- `proof-viewport-pixel7-landscape.png`
- `proof-viewport-short-portrait.png`
- `proof-viewport-tall-portrait.png`
- `proof-options-back-reachable.png`
- `proof-playwright-summary.json`
- `proof-harness-isolation.json`, `proof-render-failure-guard.json`, `proof-hall-e2e.json`

## GITHUB PAGES URL

- Commit: **PLACEHOLDER**
- Normal: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=PLACEHOLDER&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=PLACEHOLDER&mobile=on&portraitlayout=1