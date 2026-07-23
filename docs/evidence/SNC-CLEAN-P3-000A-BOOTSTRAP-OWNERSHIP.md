# SNC-CLEAN-P3-000A — Bootstrap ownership audit

**Baseline:** `889fcbb88eb176dd811897c551467cfe43c68dca` (`chromeinput2`)
**Mode:** read-only source/test inspection; no build or self-check run
**Result:** PASS — production carries query-gated test bootstrap and proof-scene code; ownership is sufficiently mapped for synthesis.

## Inspected paths

- `src/build-manifest.json` — production concatenates all 33 listed scripts, ending with `game-22-section-13-main-loop.js`.
- `src/js/game-03-section-0c-debug-flag.js:4-11` — URL gate and shared harness globals.
- `src/js/game-22-section-13-main-loop.js:404-496, 1264-1464, 4528-5079, 5254-5650, 6876-6920, 8242-8639, 8644-9036` — frame, harness state, self-checks, proof scenes, URL bootstraps, and `window.CR` assembly.
- `src/js/game-09c-section-facadeskins1-bitmap-facades.js:1150-1305` — facade self-check consumes two proof-scene installers.
- `src/html/body.html:45-49`, `src/styles/game.css:118-125` — self-check-only overlay element/style.
- `tests/run_selfcheck_playwright.js:422-538, 4172-4247, 4843-4850, 5013-5030, 5233-5256` — maintained full-harness and URL-lifecycle consumers.
- `package.json:21-37`, `tests/TEST-MAP.md:1-16`, `.github/workflows/selfcheck.yml:1-151` — command and current CI ownership.

## Reachability map

| Owner | Exact source evidence | Normal production reachability | Query/test gate | Consumers / dependencies | Phase 3 extraction candidate |
|---|---|---|---|---|---|
| URL gate | `game-03...:5` sets `_selfCheckUrl` only for `?selfcheck=1`; lines 7-11 declare `_selfCheckForcePortrait`, `_crHarnessDepth`, snapshot, and save-block state. | Gate parse and globals load on every boot; lifecycle does not start without query. | `selfcheck=1`. | Layout/input code reads `_selfCheckForcePortrait`; harness code reads the rest. | Keep production debug/portrait flags separate; move self-check-only state with harness code. |
| Synchronous full harness | `game-22...:4528-4615` calls 39 checks; `:8637-8639` wraps it in `crWithTemporaryState`. | Definitions and `CR.runFullSelfCheck` are shipped; no ordinary frame/title caller found. | Test caller/API only. | `tests/run_selfcheck_playwright.js:4843-4850`; `runHarnessIsolationSelfCheck`. | Move full harness and its test-only public export to a test-harness source module. |
| Browser lifecycle | `game-22...:8644-8782` defines four groups, async temporary state, lifecycle completion and failure/hang meta flags. | Definitions ship but run only via tail bootstrap. | `selfcheck=1`; nested `selfcheckhangmeta=1` and `selfcheckfailmeta=1`. | Playwright completion/hang meta tests at `:490-538`; overlay check at `:5013-5030`. | Move wholesale with URL bootstrap; preserve its completion contract only in test artifact. |
| Tail self-check bootstrap | `game-22...:8961-8998` creates `__crSelfCheck*`, starts after 900 ms, shows overlay, restores safe title. | No effect in normal URL except loaded conditional code. | `selfcheck=1`. | `tests/run_selfcheck_playwright.js:4172-4247, 5013-5030`. | Move wholesale. Production must not create lifecycle/promise or honor this query. |
| Self-check overlay | `game-22...:5070-5079`, `body.html:48`, `game.css:118-125`. | Hidden DOM/CSS ships; made visible only by bootstrap. | `selfcheck=1`. | Full Playwright overlay assertion. | Include element/style only in test artifact or create it from the harness module; do not retain in production body/CSS. |
| Visual QA bootstrap | `game-22...:9000-9035`. It sets selected district, starts a run, forces PLAY/unpaused, dismisses onboarding, scans rows, and writes player pose. | Normal URL is inert; the code itself ships. | `visualqa=facades`; optional `seed`, `district`. | No maintained test or CI path references `visualqa`; only source occurrence found. | Move wholesale to test harness; production must ignore `visualqa`. Preserve only if a focused test is added later. |
| Harness state isolation | `game-22...:1264-1464`; async counterpart `:8675-8703`. Snapshots game/player/input/storage, blocks saves, restores render pose/control UI, and has boot/frame leak guards. | `crSanitizeStorageOnBoot()` runs at `:8959`; `crGuardHarnessLeakOutsideCheck()` runs each frame at `:407`. Both are harness-leak cleanup in normal runtime. | Mutation occurs when a harness/proof function runs. | Every `crWithTemporaryState` self-check; isolation test `:5017-5068`; Playwright `:4222-4247`. | Move snapshots/restore/benchmark constructors with harness; retain a narrowly defined production save-validation guard only if synthesis proves it protects non-harness corrupted saves. |
| Micro-map proof scenes | `game-22...:5254-5660`, plus callers throughout `:5270-6589`. | Definitions ship; no ordinary gameplay call found. | `run*SelfCheck` / `CR` only. | Full harness sections and their nested checks. | Move together with collision/reachability/fixed-step self-checks. |
| Facade/material proof scenes | `game-22...:6876-6955`; called by `game-09c...:1181-1194, 1273-1295`. | Definitions ship; ordinary renderer does not call installers. | Facade self-check/API only. | Full harness facade section; `game-09c` self-check body. | Move installer + facade self-check bodies as one test-harness cluster; leave ordinary bitmap renderer intact. |
| Render benchmark/proof scenes | `game-22...:8242-8541`, including visible/occluded sprite, can/NPC/exit/hall benches and `crSpriteOcclusionScreenshotProof`. | Definitions ship; no ordinary frame caller. | `runRenderFailureSelfCheck` / `CR` only. | Full harness render/isolation sections; screenshot capture belongs to Playwright. | Move benchmark constructors, pixel proof, and render-failure self-check with harness. |
| Broad mutable test API | `game-22...:8942-8957` exports all above via `globalThis.CR = window.CR = {...}`. | Production exposes mutation-capable setters/helpers and test runners. | No query needed for console callers. | Maintained Playwright references `CR.*` extensively; exact member map is P3-000B/C scope. | Split to minimal production runtime API plus test-artifact-only `__SNC_TEST__`/harness API after consumer map. |

## Actual call paths

### Full browser self-check

`location.search` → `_selfCheckUrl` (`game-03:5`) → conditional bootstrap (`game-22:8961-8998`) → `runBrowserSelfCheckLifecycle` (`:8730-8782`) → `crWithTemporaryStateAsync` (`:8675-8703`) → `CR_SELFCHECK_GROUPS` (`:8644-8657`) → synchronous self-check/proof-scene functions → title restoration + optional `#crselfcheck` overlay.

The lifecycle mutates state deliberately but snapshots/restores it. It is test-only in intent, but it is embedded in the production artifact.

### Visual QA

`location.search` → `visualqa=facades` conditional (`game-22:9003-9035`) → delayed `_bootVisualQaOnce` → `crSetSelectedStartDistrict` + `startRun` + forced player pose. It has real gameplay-state side effects, is query-gated, and has no maintained consumer.

### Normal play

`requestAnimationFrame(frame)` → `frame` (`game-22:404-496`) → `crGuardHarnessLeakOutsideCheck` only when depth is zero. Startup also calls `crSanitizeStorageOnBoot` (`:8959`). Neither normal New Run nor render/HUD routes invoke `runFullSelfCheck`, proof installers, or visual-QA code.

## Extraction boundary and least-coupled design

**Proposed, pending P3-000B/C and manifest feasibility:** use a second ordered **test-artifact manifest** that appends harness source after the production source order, outputting an ignored `test-results/selfcheck-artifact/index.html`. The root production manifest must omit:

1. full/self-check lifecycle and URL boot;
2. visual-QA URL boot;
3. proof/benchmark scene constructors and self-check bodies;
4. overlay DOM/CSS; and
5. test-only `window.CR` exports.

The test manifest should retain the same production runtime modules, append a `src/test-harness/` module that supplies the extracted global-lexical harness functions, and expose only a test artifact API. This is less coupled than a runtime query switch because production cannot parse/activate `selfcheck` or `visualqa` and the test layer remains a single HTML artifact with no external runtime dependency.

**Do not extract yet:** `frame`, fixed-step/render pose, Pointer input, authored content, renderer implementations, or normal save code. `game-09c` facade self-check call sites must move with their installer dependencies; removing installers alone would silently weaken checks.

## Constraints for synthesis

- Preserve `crWithTemporaryState` semantics in the test artifact before moving nested checks.
- Production must ignore `selfcheck`, `selfcheckhangmeta`, `selfcheckfailmeta`, and `visualqa` rather than merely hiding UI.
- Keep focused owner tests and the final full harness against the test artifact; do not run the historical harness during this audit.
- No normal-play behavior was executed or modified by this audit.

**PASS.**
