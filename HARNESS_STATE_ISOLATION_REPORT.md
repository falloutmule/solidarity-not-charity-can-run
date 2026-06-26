# HARNESS STATE ISOLATION REPORT

## WHAT WAS DONE

- Backup: `index.before-harness-state-leak-fix.html`
- **`BUILD_ID` → `isofix1`**
- Root cause: **`runFullSelfCheck()` / `?selfcheck=1`** ran **`runRenderFailureSelfCheck()`** and bench helpers (`crApplyBenchWorld`, `startRun`, `startCustomLevel`) without restoring **`state`**, **`game.map`**, **`timeLeft` ~999**, **`seed 12345`**, or **`localStorage`** (`cannedRun.save.v1`). User saw **renderguard1** + rectangular arena + TIME **998.5** on a normal URL.
- Added **`crWithTemporaryState(label, fn)`** — snapshot/restore game, player, inputs, options, **`cannedRun.save.v1`**, block saves during tests.
- **`crApplyBenchWorld`** sets **`game.run.harnessOnly`**, **`customLevel: harness_render_benchmark`**, **`game.run.active = false`**, never autosaved.
- **`SAVE.save` / `beforeunload` / `startRun` / `startCustomLevel`** respect **`_crBlockHarnessSave`** and **`harnessOnly`**.
- **`SAVE.load`** rejects and clears harness saves.
- Wrapped: **`runRenderFailureSelfCheck`**, **`runLevelSelfCheck`**, **`runHallSelfCheck`**, **`runFullSelfCheck`**, **`crRenderFailureBenchScene`**.
- **`?selfcheck=1`**: after overlay, **`crForceSafeTitleAfterHarness()`** + menu refresh.
- **`crGuardHarnessLeakOutsideCheck()`** in **`frame()`** when not inside harness.
- **`CR.runHarnessIsolationSelfCheck()`** + Playwright **`harnessIsolationSection()`**.

## WHAT WAS VERIFIED

- **`CR.runHarnessIsolationSelfCheck().pass === true`**
- **`CR.runRenderFailureSelfCheck().pass === true`** (via full harness)
- **`CR.runHallSelfCheck().pass === true`**
- **`CR.runFullSelfCheck().pass === true`**
- Playwright exit **0**, **`proof-playwright-summary.json` pass true**
- **`proof-harness-isolation.json` pass true**
- Normal boot not benchmark; selfcheck restores **title**; reload clean

## WHAT FAILED

- Nothing in current **`isofix1`** run.

## CURRENT EXACT STATE

- Repo: `C:\Users\fallo\Documents\HermesProjects\canned-run`
- **`index.html`**: **`isofix1`**, harness isolation merged
- Render + Hall guards still active inside wrapped self-checks

## REMAINING BLOCKERS

- None for harness leak. Optional: Travis real-phone spot-check.

## NEXT ACTIONABLE STEP

- Ship commit to GitHub Pages; hard-refresh with new **`?v=`** hash.

## EVIDENCE

- `proof-harness-isolation.json`
- `proof-normal-boot-after-selfcheck.png`
- `proof-selfcheck-restored-state.png`
- `proof-playwright-summary.json`
- `proof-render-failure-guard.json`, `proof-hall-e2e.json`

## GITHUB PAGES URL

- Commit: **PLACEHOLDER**
- Normal: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=PLACEHOLDER&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=PLACEHOLDER&mobile=on&portraitlayout=1

## FUNCTIONS WRAPPED / ISOLATED

- `crWithTemporaryState`, `runRenderFailureSelfCheckBody`, `runLevelSelfCheckBody`, `runHallSelfCheckBody`, `runFullSelfCheckInner`, `crRenderFailureBenchSceneImpl`, `crApplyBenchWorld`

## STORAGE KEYS RESTORED

- **`cannedRun.save.v1`** (primary active run; harness payloads cleared on load/boot)

## USER SCREENSHOT DIAGNOSIS

- Matched **render benchmark**: small **MAP_W/H**, **timeLeft ~999**, **seed 12345**, **BUILD_ID renderguard1** — left in **PLAY** after self-check with no restore.