# SNC-CLEAN-P3-000B — `window.CR` and maintained-test consumer map

**Baseline:** `889fcbb88eb176dd811897c551467cfe43c68dca` (`chromeinput2`)
**Card:** read-only inventory
**Result:** PASS

## Inspected paths

- `package.json`; `tests/TEST-MAP.md`; `.github/workflows/selfcheck.yml`
- `src/build-manifest.json`; `src/js/game-22-section-13-main-loop.js`
- `src/js/game-21a-section-12b-perf-probe.js`; `src/js/game-03-section-0c-debug-flag.js`
- every tracked `tests/*.js`; direct `CR.` consumers are enumerated below.

## API ownership

`game-22-section-13-main-loop.js:8938-8963` creates one mutable `globalThis.CR =
window.CR` object.  Its only runtime writer after construction is the query-gated
performance probe (`game-21a...:562-565`), which appends report/reset functions
only when `?perfprobe=1`.  No normal production source reads `window.CR` to run
the game.  Ordinary game code calls lexical functions and variables directly.

| Cluster / members in the current object | Classification | Current consumer | Phase 3 disposition |
|---|---|---|---|
| `BUILD_ID`; read-only state accessors (`state`, `paused`, `mobileMode`, `onboardingOpen`) | test/harness only | four focused browser smokes; full selfcheck | Provide from a test-only injected API; do not retain mutable setters in production. |
| Mutable live objects: `game`, `player`, `options`, `SAVE`, `stats`, `leaderboards`, `profile`, `dbg`, `cfg`, `STATE`, `World` | test/harness only | focused browser smokes and full selfcheck | Test artifact/injected harness only.  The normal game does not need a global reference. |
| Normal actions: `startRun`, `restartRun`, `continueRun`, `endRun`, `completeRun`, `giveCan`, `chooseUpgrade`, `startCustomLevel`, `update`, `updateSeed`, menu/district helpers | test/harness only | focused browser smokes; heavily full selfcheck | Expose only to test artifact; keep lexical production functions. |
| Fixed-step/input semantic helpers: `crResetFixedStepSimulation`, `crStepSimulationFixed`, `crGetFixedStepState`, `crClampFixedFrameDt`, `crApplyPendingInputActions`, `getSemanticActionMap`, `crRefreshSemanticActionMap`, `crDispatchPointer`, `crDispatchTouch` | test/harness only | Chrome and far-field focused browser smokes; full selfcheck | Inject in test layer.  Do not alter input implementation. |
| Movement/world collision helpers: `movePlayerWithCollision`, `gridTraceClear`, `gridReachableFrom`, `isReachableCell`, `interactionLineClear`, `rectsOverlap` | test/harness only | authored-D1 smoke; full selfcheck | Inject in test layer; preserve lexical implementation. |
| Mobile/UI helpers: `setMobileMode`, `isMobile`, `rmenuAction`, `drawMobileMenu`, `applyMobileControlSettings`, control edit/persist helpers, portrait/layout/minimap/safe-area helpers | test/harness only | full selfcheck; no release-gate direct need except normal page behavior | Test artifact only.  Keep normal event/UI wiring lexical. |
| Selfcheck runners: every `run*SelfCheck`, `runFullSelfCheck`, harness isolation, fingerprint and temporary-state helpers | test/harness only | `tests/run_selfcheck_playwright.js` only | Remove from production artifact; include only test artifact. |
| Proof scenes/render debug: `crRenderFailure*`, `crInstall*BenchScene`, `crInstallFacadeSkinProofScene`, facade/decal/material inspectors, `crDebug*`, screenshot/proof getters | test/harness only | full selfcheck only | Test artifact only; no production global export. |
| `getDebugState`, `getViewportProof`, `getSafeAreaAudit`, `getLayoutProof`, `getControlDockRectProof`, `getMinimapAlignProof`, `getTouchActionProof` | test/harness only | full selfcheck only | Test artifact only; source-string/side-effect details are P3-000C’s owner. |
| `crPerfProbeGetReport`, `crPerfProbeReset` | bounded diagnostic | query-gated perf overlay and VM perf tests | Keep query-gated diagnostic capability, but attach it to a narrow diagnostics namespace/registration seam rather than `CR`; migrate its VM assertion. |
| `getAudioUnlockProof`, `resumeAudioContext`, `bindAudioUnlockGate`, sound cue helpers | uncertain / test-harness boundary | full selfcheck only (normal audio unlock is lexical) | Retain lexical behavior; expose only test artifact unless audit finds a public diagnostic contract. |

The object has no demonstrated **runtime-required public `CR` member**.  That is
not a recommendation to delete its underlying functions: it means production can
keep them lexical while the test artifact supplies an explicit harness surface.

## Maintained direct consumers

| Command / file | `CR` members consumed | Intent | Required replacement |
|---|---|---|---|
| `test:chrome-pointer-path` / `tests/chrome_pointer_path_verify.js` | `state`, `STATE`, `paused`, `onboardingOpen`, `player`, `update` | concurrent MOVE + LOOK, release/cancel, no double coalesced sample | Test-layer read/state/action adapter; retain test semantics. |
| `test:farfield-default-equivalence` / `tests/far_field_default_equivalence_verify.js` | state cluster, `player`, `game`, `update`, `crResetFixedStepSimulation`, `crGetFixedStepState` | default angle/projection equivalence and fixed-step state | Test-layer simulation adapter. |
| mandatory release smoke `test:farfield-final-smoke` / `tests/far_field_final_candidate_smoke.js` | state cluster, `player`, `game`, `update`, fixed-step reset/state | ordinary gameplay, keyboard movement, pause/resume | Test-layer ordinary-game adapter. |
| `test:authored-d1-smoke` / `tests/authored_d1_ordinary_game_smoke.js` | state cluster, `game`, `player`, `SAVE`, `update`, `gridReachableFrom`, `getSemanticActionMap`, district getter | ordinary authored D1, pickup, save/reload, no historical HUD proof text | Test-layer authored-game adapter. |
| `test:perf-probe-v2` / `tests/perf_probe_v2_verify.js` | test VM’s `CR.crPerfProbeGetReport` | verifies query-gated report registration | Change to the selected narrow diagnostic registration seam; this test is static/VM, not root-game consumer. |
| `test:selfcheck` / `tests/run_selfcheck_playwright.js` | broad API: all clusters above, including mutable setters and proof scenes | historical characterization / broad milestone harness | Dedicated test artifact must expose the complete legacy-compatible harness API first; no release CI job invokes it. |

All other package commands have no direct `window.CR` member consumer: metadata,
build-proof routing, custom asset, authored static/save, render interpolation,
mobile-cache, resolution, angle, projection, and profiler tests load source or
VM seams directly.  `TEST-MAP.md` labels `test:selfcheck` historical
characterization, not a default release gate.  The release workflow always runs
`farfield-final-smoke`; path jobs add focused renderer/authored/persistence tests,
but none runs `test:selfcheck`.

## Design constraints and recommendation

1. Do **not** attempt to recreate lexical closures with Playwright `addInitScript`:
   it runs before those closures exist and cannot recover their private bindings.
2. Build a dedicated single-file test artifact from the same ordered runtime
   sources plus a final test bootstrap.  That bootstrap may create the legacy
   `window.CR` compatibility object after all lexical definitions load.
3. The root production manifest must omit the bootstrap and must not run
   `?selfcheck`/`?visualqa`; it may retain only a deliberate query-gated,
   read-mostly diagnostics namespace for the perf probe.
4. Migrate the four focused browser tests to the test-artifact URL or a narrowly
   named injected test API.  Keep the ordinary production smoke on root
   `index.html`, asserting it has neither `CR` harness nor test URL behavior.
5. Preserve the full harness API initially for `test:selfcheck`; shrink it only
   after a later consumer-by-consumer retirement card.  This is the least-coupled
   route and avoids changes to input, gameplay, renderer, saves, or simulation.

## Evidence and clean-state statement

This lane ran no test and made no runtime/test/build/branch mutation.  The only
intended write is this bounded evidence file.  No full selfcheck was run.
