# SNC-CLEAN-P3-000C — Proof-helper audit

**Baseline:** `889fcbb88eb176dd811897c551467cfe43c68dca` (`chromeinput2`)
**Method:** read-only source and maintained-test inspection; no self-check run; no runtime, test, build, or branch change.
**Result:** PASS — production contains source-text and stateful proof helpers that have a clear test-artifact destination.

## Inspected paths

- `src/js/game-22-section-13-main-loop.js`
- `src/js/game-09-section-3-city-generation.js`
- `src/js/game-09c-section-facadeskins1-bitmap-facades.js`
- `src/js/game-06-section-2b-mobile-touch-input.js`
- `src/js/game-16-section-7-render.js`
- `src/html/body.html`, `src/build-manifest.json`, `package.json`
- `tests/run_selfcheck_playwright.js` and focused tests containing proof vocabulary.

## Findings

| Helper / family | Location | Classification and reachability | Side effects / query gate | Maintained consumer | Phase 3 disposition |
|---|---|---|---|---|---|
| Layout, minimap, touch-action, viewport proofs | `game-22` 534–699, 986; exported at 8949 | Runtime diagnostics plus self-check support. Normal play does not call them. | `getLayoutProof`, `getMinimapAlignProof`, `getTouchActionProof`, `getViewportProof`, and occlusion read state/DOM only. No direct query gate; callable through public `CR`. | Full harness calls layout/viewport checks; no focused consumer found. | Keep only bounded, read-only diagnostics in production if a runtime need is identified; move test-only proofs with harness. |
| Control-dock proof | `game-22` 603–669 | Test-only helper incorrectly exposed in production. | **Writes** `options.controlsYOffsetPx`, calls `options.save()` twice, changes mobile-control DOM through `applyMobileControlSettings`; it restores the value but its getter contract is not pure. No query gate. | `runControlDockSelfCheck` / full harness; no focused test direct consumer. | Move to test artifact. Replace with a pure layout-input test or snapshot storage/options/DOM before and after until removed. |
| Sprite-halo proof | `game-22` 671–697 | Test-only source-string proof, exported in production. | Reads `String(drawScene)` and requires comments/implementation phrases; no state write. | `runRenderSelfCheck`, raycaster/render-failure paths, and full harness at `tests/run_selfcheck_playwright.js:4926–4930`. | Move to Node static test over canonical render source. Test semantic behavior separately in existing render smoke; do not retain comments as runtime API. |
| Occlusion proof | `game-22` 699–718 | Test-only synthetic predicate diagnostic, exported in production. | No game-state write; tests local `depth >= wallDist`. No query gate. | Same full-harness consumer at 4926–4930 and render self-check families. | Move predicate to Node/unit test or retain as a tiny test-artifact helper; production does not need it. |
| Source-string self-check family | `game-22` 2471, 2548–55, 2650–51, 2748–70, 2853, 2947–48, 3114, 3318, 3449, 3559, 3666–70, 3776–81, 3890, 6248, 6779–84, 6972–99, 7039, 7259, 7379, 7544, 7793 | Test-only. These inspect `String(drawScene)` or renderer helper source to enforce historical ordering/markers. They only execute from self-check methods. | Their enclosing self-checks generate cities, start runs, force portrait, render, and may write saves/DOM before wrapper restoration. No normal-play or URL-only call path except `?selfcheck=1`. | Full harness invokes the named self-checks throughout `tests/run_selfcheck_playwright.js` 1066–4943. | Convert each source-text assertion to a focused Node static assertion against the owning canonical source file; retain browser checks only for behavior/pixels. |
| Temporary-state wrapper and full browser lifecycle | `game-22` 1418–1468, 4528–4568, 8637–8779 | Test-only harness infrastructure currently bundled into normal production. | Snapshots/restores game/player/options/storage, blocks saves, changes state, layout, controls, menu and canvas; `?selfcheck=1` activates async lifecycle and test meta flags. | Monolithic `test:selfcheck` uses `CR.runFullSelfCheck()` and selfcheck URL 4843–5022. | Move wholesale into test artifact/injected layer with all dependent self-check bodies. Production must ignore `selfcheck`, `selfcheckhangmeta`, and `selfcheckfailmeta`. |
| Proof/bench scene installers | `game-22` 6876–6954, 8396–8532; `game-09` 3661–3740 | Test-only synthetic scene/harness code. | Mutates map, shade, entities, player, game state and render canvas; legacy solid-walls helper mutates live world. Not query-gated itself. | Full harness calls material/facade installers at `tests/run_selfcheck_playwright.js:2465–2908`, render bench at 4310–4364 and screenshot proof at 4943. `game-09c` has historical in-runtime callers around 1181–1295. | Move installer families and consumers into the test artifact. Treat `game-09c` callers as a separate dependency slice; do not delete until harness injection owns them. |
| D1 proof-zone helpers | `game-09` 2408–2923; mirrored renderer references in `game-16` 36, 154–186 | Historical/dead candidate, not a normal authored-D1 contract. | Audit is read-only; illegal-wall draw appends `game.d1ProofIllegalHits` and warns; placement/purge helpers mutate map/registry/props. No observed maintained-test consumer. | None found outside production/historical paths. | Do **not** remove in Phase 3. Isolate from production only after a dedicated reachability/inventory card proves it unreachable. |
| Feel2 look-tuning proof | `game-06` 809–827 | Historical runtime diagnostic. | Read-only but contains obsolete BUILD_ID branches; no query gate. | No maintained consumer found. | Remove from production API with the test API split; later decide deletion after consumer inventory. Do not touch input behavior. |
| Texture/transparency and screenshot proof | `game-22` 8121–8139, 8408–8486, 8533–8634 | Test-only render proof. | Creates canvas/image data; screenshot proof invokes render bench and scene drawing under harness state. | Full harness at 4926–4943 and render-failure section. | Keep only in test artifact; migrate pure texture calculations to Node where asset bytes suffice. |

## Exact source-text migration

1. Add Node static tests that read named canonical files, never `String(function)` at runtime.
2. For every former order/marker assertion, assert a stable semantic token or exported data contract in its owning source file; prefer behavior tests where an implementation-order assertion would be brittle.
3. Keep `tests/run_selfcheck_playwright.js` as the only consumer of browser-only scene/pixel proofs, loaded with the test artifact or injected harness layer.
4. Delete the production exports only after all `CR.*` consumers are redirected; do not retain production comments merely to satisfy a test.

## Dependency and safety conclusion

The normal frame loop has no call to these helpers. Their production reachability is through the oversized mutable `window.CR` API, and the browser lifecycle is additionally URL-gated by `?selfcheck=1`. The stateful helpers are guarded by `crWithTemporaryState`, but that wrapper itself remains production code and executes restoration/layout work on every harness call. The least-coupled Phase 3 path is to move the complete self-check/proof helper family to the dedicated test artifact identified by the manifest lane, rather than deleting helpers piecemeal from root `index.html`.

## Recommendation

**PASS.** Implement the production/test-artifact split first. Migrate source-string assertions to focused Node tests as each owning helper moves. Do not change the accepted Pointer Event path, gameplay, renderer selection, saves, authored levels, fixed-step code, or camera interpolation in this card.
