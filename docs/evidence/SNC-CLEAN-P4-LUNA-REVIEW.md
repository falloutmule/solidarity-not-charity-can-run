# SNC-CLEAN-P4-LUNA — Phase 4 cleanup review

**Branch:** `cleanup/snc-retire-legacy-selfcheck`
**Review target:** current worktree, production `BUILD_ID` `chromeinput2`
**Scope:** read-only independent review; no runtime, test, build, or workflow edits.

## Verdict

**PASS.** No blocker was found in the requested cleanup criteria. The only command failure during review was an intentionally invalid proof directory (`test-results/p4-luna-build-check`); rerunning with the required `test-results/build-proofs/p4-luna` descendant passed.

## Evidence

| Criterion | Result | Actual evidence |
|---|---|---|
| No `src/**` or `index.html` change | **PASS** | `git status --short` shows edits only in workflow/docs/package/tools/tests plus evidence files; no `src/` path and no root `index.html`. `git diff --name-only main...HEAD` has no source/artifact path. |
| Legacy full self-check command/artifacts retired | **PASS** | `package.json` has no `test:selfcheck`, `test:authored-d1-smoke`, or `test:farfield-default-equivalence`; deleted files are `tests/run_selfcheck_playwright.js`, `tests/harness_artifact.js`, `tests/authored_d1_ordinary_game_smoke.js`, and `tests/far_field_default_equivalence_verify.js`. `tests/legacy_selfcheck_retirement_verify.js` passes and checks the build tool no longer exposes harness artifact flags. |
| Legacy artifact boundary removed from production | **PASS** | `npm.cmd run test:production-harness-boundary` passes. It rebuilds root `index.html` from `src/build-manifest.json`, rejects mutable `CR`/selfcheck symbols, and requires frozen `window.SNCDiagnostics`. |
| Docs capture no longer depends on `window.CR` | **PASS** | `tools/capture-docs-images.js` starts through `[data-action="title-start"]` and waits on `window.SNCDiagnostics`; `npm.cmd run test:docs-capture-boundary` passes and finds no `window.CR` or `CR.startRun`. |
| CI/package/docs routing coherent | **PASS** | `package.json` routes retirement, production-boundary, docs-boundary, focused mobile, authored, renderer, and release-smoke commands. `.github/workflows/selfcheck.yml` invokes metadata, build-proof routing, retirement, build parity, ordinary smoke, and path-aware focused lanes. `docs/development/TESTING.md`, `CONTRIBUTING.md`, and `tests/TEST-MAP.md` describe the retired aggregate and current focused owners. |
| Useful gaps have focused owners | **PASS** | `test:mobile-options-persistence` passes for custom control sizes; `test:chrome-pointer-path` covers pointer/touch registration, concurrent MOVE+LOOK, cancellation, and browser observers; authored D1/save and renderer/far-field owners are named in the docs and map. |
| Chrome pointer smoke uses production only | **PASS** | `tests/chrome_pointer_path_verify.js` reads only root `index.html`, serves that artifact, waits on `SNCDiagnostics`, and contains no harness-artifact import or mutable `CR` calls. Run passed: `npm.cmd run test:chrome-pointer-path -- --output=test-results/p4-luna-chrome-pointer.json`. |
| Build parity | **PASS** | `npm.cmd run build:check -- --proof-dir=test-results/build-proofs/p4-luna` returned `{"pass":true,"output":"index.html","bytes":928131}`. |

## Review commands

Passed:

- `npm.cmd run test:legacy-selfcheck-retirement`
- `npm.cmd run test:production-harness-boundary`
- `npm.cmd run test:docs-capture-boundary`
- `npm.cmd run test:chrome-pointer-path -- --output=test-results/p4-luna-chrome-pointer.json`
- `npm.cmd run test:mobile-options-persistence`
- `npm.cmd run build:check -- --proof-dir=test-results/build-proofs/p4-luna`

The generated proof remains under ignored `test-results/`; no production artifact was regenerated or modified by this review.
