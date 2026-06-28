# Harness overview

SNC Can Run uses **in-browser self-checks** (`window.CR`) plus a **Playwright** driver that loads root **`index.html`** and collects proofs.

**Gameplay baseline:** `BUILD_ID` `facadefix1` — see `PROJECT_STATUS.md` for cache-busted Play / self-check URLs.

## In-browser (`window.CR`)

- Functions like `CR.runLayoutSelfCheck()`, `CR.runFullSelfCheck()`, `CR.runStreetReadabilityMinimapSelfCheck()`, `CR.runBuildingScalePolishSelfCheck()`, `CR.runLevelSelectorSelfCheck()`, `CR.runEarlyDistrictProgressionSelfCheck()`, `CR.runStreetBlockLevelSelfCheck()`, `CR.runD1ParkLandmarkSelfCheck()`, `CR.runOnboardingSelfCheck()`, `CR.runSoundFeedbackSelfCheck()`, `CR.runVisualReadabilitySelfCheck()`, `CR.runVisualRectangleRegressionSelfCheck()`, `CR.runDecorativePropsSelfCheck()`, `CR.runOptionsCleanupSelfCheck()`, `CR.runHallSelfCheck()`, etc.
- URL: `?selfcheck=1` runs full check and shows PASS/FAIL overlay.
- **`crWithTemporaryState`** — snapshots public state + `localStorage`, runs harness, restores so benchmarks do not leak.
- **`__crRuntimeErrors`** — uncaught errors fail runtime-clean checks.

## Playwright

- **`tests/run_selfcheck_playwright.js`** — launches browser, runs section checks, writes JSON proofs to repo root.
- Run: `node tests/run_selfcheck_playwright.js`
- Summary: **`proof-playwright-summary.json`** at repo root when harness runs (`pass: true` required for ship). Archived copies: **`reports/proofs/current/`**.

## Proof JSON (examples)

| File | Card |
|------|------|
| `proof-playwright-summary.json` | Full suite |
| `proof-portrait-usability.json` | Portrait layout |
| `proof-mobile-control-reliability.json` | Mobile controls |
| `proof-movement-collision.json` | Collision |
| `proof-reachability.json` | LOS / BFS |
| `proof-procedural-level-validation.json` | Multi-seed maps |
| `proof-full-run-progression.json` | Run + save/load E2E |
| `proof-onboarding` (in `proof-full-selfcheck.json` → `onboarding`) | First-run help overlay |
| `proof-visual-readability-selfcheck.json` / `visualReadability` in full selfcheck | Visual readability polish |
| `proof-visual-rectangle-regression-selfcheck.json` | Stuck lower-center rectangle guard |
| `proof-sound-feedback-selfcheck.json` | Procedural sound/HUD feedback (harness-muted) |
| `proof-feedback-can.png` … `proof-feedback-district-complete.png` | HUD feedback proof shots |
| `proof-visualfix-normal.png` … `proof-visualfix-turn-right.png` | Rectangle fix heading proofs |
| `proof-harness-isolation.json` | State isolation |
| `proof-release-artifact.json` | Single-file artifact |
| `proof-no-external-requests.json` | No external fetches |
| `proof-declarative-controls.json` | Declarative custom controls + edit path |
| `proof-edit-controls-resize.json` | EDIT CONTROLS SIZE −/+ |
| `proof-options-cleanup.json` | OPTIONS menu cleanup (sections, obsolete rows) |
| `proof-decorative-props.json` | Southwest decor props bake/placement/render |
| `proof-decorative-props-world.png` / `proof-decorative-props-closeup.png` | Decor props proof shots |
| `proof-street-block-level.json` | Street-block layout grammar self-check |
| `proof-street-block-d1.png` … `proof-street-block-minimap.png` | Street layout / minimap proof shots |
| `proof-d1-park-landmark.json` … `proof-d1-park-landmark-minimap.png` | D1 park landmark |
| `proof-early-district-progression.json` | Early D1–D4 progression self-check |
| `proof-d1-park-plaza.png` … `proof-d4-service-pockets.png` | District minimap progression shots |
| `proof-level-selector.json` | START DISTRICT menu + direct-start self-check |
| `proof-level-selector-menu.png` … `proof-level-selector-d4.png` | Selector menu + D1–D4 start shots |
| `proof-building-scale-polish.json` | Building mass / FPV scale self-check |
| `proof-building-scale-d1.png` … `proof-building-scale-d4.png` / `proof-building-scale-minimap.png` | Building scale proof shots |
| `proof-street-readability-minimap.json` | Street readability / minimap self-check |
| `proof-street-readability-d1.png` … `proof-street-readability-d4.png` / `proof-street-readability-minimap.png` | Minimap nav + FPV readability shots |
| `proof-fpv-street-shimmer-fix.json` | FPV street shimmer fix self-check |
| `proof-fpv-street-shimmer-d2.png` / `proof-fpv-street-shimmer-d3.png` / `proof-streetread-minimap-preserved.png` | Matte FPV road + minimap preserved |
| `proof-fpv-wall-line-artifact-fix.json` | FPV wall line artifact fix self-check |
| `proof-fpv-wallfix-d1.png` … `proof-fpv-wallfix-d3-alley.png` / `proof-wallfix-minimap-preserved.png` | Coarse wall FPV + minimap preserved |
| `proof-fpv-facade-target-polish.json` | FPV facade target polish self-check |
| `proof-facadefix-d1.png` … `proof-facadefix-d3-alley.png` / `proof-facadefix-minimap-preserved.png` | Broad panel facades + minimap preserved |
| `proof-options-cleanup-menu.png` / `proof-options-cleanup-edit-controls.png` | OPTIONS cleanup proof shots |
| `proof-control-resize-move-before.png` … `proof-control-resize-button-after.png` | Resize proof shots |
| `proof-control-edit-reset.png` | RESET CONTROLS |

## Other gates

- **No external request check** — game must not depend on network assets at runtime.
- **Console / page errors** — captured during Playwright runs.
- **Release artifact check** — validates root `index.html` structure policy.

## Why Travis should not manually re-verify harness-green work

If Playwright and self-check proofs pass on the **same commit** as the Pages `?v=` URL, manual confirmation adds little unless the task is **device-specific** (real phone GPU, touch quirks) or **deployment** (Pages cache). Report the proof paths instead.