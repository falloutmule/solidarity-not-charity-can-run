# Harness overview

SNC Can Run uses **in-browser self-checks** (`window.CR`) plus a **Playwright** driver that loads root **`index.html`** and collects proofs.

## In-browser (`window.CR`)

- Functions like `CR.runLayoutSelfCheck()`, `CR.runFullSelfCheck()`, `CR.runOnboardingSelfCheck()`, `CR.runSoundFeedbackSelfCheck()`, `CR.runVisualReadabilitySelfCheck()`, `CR.runVisualRectangleRegressionSelfCheck()`, `CR.runDecorativePropsSelfCheck()`, `CR.runOptionsCleanupSelfCheck()`, `CR.runHallSelfCheck()`, etc.
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
| `proof-options-cleanup-menu.png` / `proof-options-cleanup-edit-controls.png` | OPTIONS cleanup proof shots |
| `proof-control-resize-move-before.png` … `proof-control-resize-button-after.png` | Resize proof shots |
| `proof-control-edit-reset.png` | RESET CONTROLS |

## Other gates

- **No external request check** — game must not depend on network assets at runtime.
- **Console / page errors** — captured during Playwright runs.
- **Release artifact check** — validates root `index.html` structure policy.

## Why Travis should not manually re-verify harness-green work

If Playwright and self-check proofs pass on the **same commit** as the Pages `?v=` URL, manual confirmation adds little unless the task is **device-specific** (real phone GPU, touch quirks) or **deployment** (Pages cache). Report the proof paths instead.