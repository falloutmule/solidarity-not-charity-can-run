# Test ownership map

Run the smallest listed owner test for a changed path, then run `npm.cmd run build`, `npm.cmd run build:check`, and `git diff --check` when the release artifact or build inputs change. Runtime changes also need the ordinary browser smoke; device-specific changes need the relevant physical acceptance.

| Changed area | Required focused check |
|---|---|
| `tools/build-single-file.js`, `src/build-manifest.json`, `project-metadata.json` | `test:metadata-truth`, `test:build-proof-routing` |
| Dead harness boundaries in `game-22`, source CSS/body, or build assembly | `test:dead-harness-boundaries` |
| Retired inert harness adapter and its former caller seams | `test:inert-adapter-retirement`; affected owner checks |
| Retired query diagnostics in mobile input, portrait layout, CSS, or markup | `test:unowned-diagnostics-retirement`, `test:chrome-pointer-path` |
| `src/js/game-06*`, `src/js/game-07*`, mobile input CSS, control markup | `test:chrome-pointer-path`; `test:mobile-ui-cache`; `test:mobile-options-persistence` when option persistence changes |
| Retired LOOK-pad instrumentation | `test:lookpad-counter-retirement`; `test:chrome-pointer-path`; `test:farfield-angle` |
| Retired zero-consumer visual flags | `test:dead-visual-flags`; `test:chrome-pointer-path`; `test:farfield-angle` |
| Retired zero-consumer faÃ§ade global | `test:facade-global-retirement`; `test:custom-next`; `tests/bitmap_building_renderer_verify.js` |
| Render pose or frame loop | `test:render-interpolation`, `test:farfield-angle` |
| Far-field resolution or projection | matching `test:farfield-resolution`, `test:farfield-angle`, or `test:farfield-projection` |
| Bitmap building renderer or facade data | `test:custom-next` and `tests/bitmap_building_renderer_verify.js` |
| Authored District 1 data or save behavior | `test:authored-d1`, `test:authored-d1-save`, and `test:custom-next` when bitmap identity changes |
| Performance diagnostics | `test:perf-probe-v2` or `test:farfield-profiler` as applicable |
| Documentation only | `git diff --check` |

The legacy aggregate self-check is retired. Its valid behavior is owned by the focused checks above; its 320x200 and historical procedural-material expectations are recorded in `docs/evidence/SNC-CLEAN-P4-010-LEGACY-SELFCHECK-INVENTORY.md`.
