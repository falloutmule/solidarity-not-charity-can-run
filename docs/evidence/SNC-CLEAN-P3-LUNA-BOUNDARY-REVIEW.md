# SNC CLEAN P3 — Luna runtime/harness boundary review

**Baseline:** `889fcbb88eb176dd811897c551467cfe43c68dca` (`chromeinput2`)
**Review mode:** read-only; no full self-check run
**Final structural result:** **PASS**

## Protected runtime path

`src/js/game-22-section-13-main-loop.js:404-488` still follows:

```text
requestAnimationFrame(frame)
→ crApplyPendingInputActions
→ fixed-step accumulator / crStepSimulationFixed
→ update(dt)
→ render-pose calculation
→ drawScene(now, renderPose)
→ presentation
```

The only new timing seam is `SNCHarnessAdapter.allowFrame()` at line 407. Its
production adapter returns `true`; it does not wrap or alter the accumulator,
input application, update, pose calculation, or rendering.

## Boundary review

| Area | Evidence | Verdict |
|---|---|---|
| Adapter | `src/js/game-05a-runtime-harness-adapter.js` is manifest-ordered after game state and before all consumers. Its eight methods map only to legacy active/frame, save, audio, portrait, and snapshot crossings; defaults are inert. | PASS |
| Direct reads | game-06, game-07, game-11, game-13, game-14, game-16, and game-20 now use the adapter instead of `_crHarnessDepth`, `_crBlockHarnessSave`, or `_selfCheckForcePortrait`. | PASS |
| Test artifact | `tools/build-single-file.js` strips both JavaScript and HTML harness markers from root output and includes them only in a strict-descendant run-local test artifact. | PASS |
| Root artifact | No broad mutable `CR`, self-check lifecycle, visual-QA mutation route, self-check overlay, or harness marker remains in `index.html`. | PASS |
| Diagnostics | `window.SNCDiagnostics` is frozen and has only `buildId` plus read-only `getSnapshot`; it exposes no gameplay, input, renderer, or state mutator. | PASS |
| Focused consumers | `chrome_pointer_path_verify`, `far_field_default_equivalence_verify`, and `authored_d1_ordinary_game_smoke` now create ignored harness artifacts through `tests/harness_artifact.js`. | PASS |
| VM consumer | `tests/authored_d1_save_load_verify.js` now injects the inert save/unload adapter stub. | PASS |
| CI | `.github/workflows/selfcheck.yml` uses the DOM/keyboard production smoke for release; changed-path consumers now target their generated harness artifacts. | PASS |

## Independent checks run

```text
node tests/production_harness_boundary_verify.js  PASS
node tools/build-single-file.js --check           PASS
git diff --check                                  PASS
```

The forbidden-symbol scan found no `crselfcheck`, broad CR assignment,
`runFullSelfCheck`, visual-QA lifecycle state, or self-check meta route in root
`index.html`.

## Remaining final gates

Run the planned focused browser tests and one full self-check against the
generated test artifact. No structural blocker remains.
