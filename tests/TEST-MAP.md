# Test ownership map

Run the smallest listed owner test for a changed path, then run `npm.cmd run build`, `npm.cmd run build:check`, and `git diff --check` when the release artifact or build inputs change. Runtime changes also need the ordinary browser smoke; device-specific changes need the relevant physical acceptance.

| Changed area | Required focused check |
|---|---|
| `tools/build-single-file.js`, `src/build-manifest.json`, `project-metadata.json` | `test:metadata-truth`, `test:build-proof-routing` |
| `tools/building-asset-*`, `tools/register-building-asset.js`, `authoring/buildings/` | `test:building-asset-compiler`, `test:building-asset-preview`; `build`, `build:check` when a runtime asset is registered |
| `authoring/buildings/dumpster_001/`, generated `dumpster_001.asset.js`, dumpster Tiled example, short bitmap geometry | `test:dumpster-pilot`, `test:dumpster-pilot-runtime`, `test:short-building-geometry`, `test:building-asset-compiler`, `test:building-asset-preview` |
| `game-11-section-3b.js` Dumpster Pilot special level | `test:dumpster-pilot-runtime`, `test:dumpster-pilot-browser` |
| `tools/tiled-level-*`, `authoring/levels/` | `test:tiled-d1-roundtrip`; `test:authored-d1` when a production authored level is generated |
| Dead harness boundaries in `game-22`, source CSS/body, or build assembly | `test:dead-harness-boundaries` |
| Retired inert harness adapter and its former caller seams | `test:inert-adapter-retirement`; affected owner checks |
| Retired query diagnostics in mobile input, portrait layout, CSS, or markup | `test:unowned-diagnostics-retirement`, `test:chrome-pointer-path` |
| `src/js/game-06*`, `src/js/game-07*`, mobile input CSS, control markup | `test:chrome-pointer-path`; `test:mobile-ui-cache`; `test:mobile-options-persistence` when option persistence changes |
| Retired LOOK-pad instrumentation | `test:lookpad-counter-retirement`; `test:chrome-pointer-path`; `test:farfield-angle` |
| Retired zero-consumer visual flags | `test:dead-visual-flags`; `test:chrome-pointer-path`; `test:farfield-angle` |
| Retired zero-consumer faÃ§ade global | `test:facade-global-retirement`; `test:custom-next`; `tests/bitmap_building_renderer_verify.js` |
| Retired zero-consumer mobile-menu alias | `test:mobile-menu-alias-retirement`; `test:mobile-ui-cache`; `test:farfield-angle` |
| Render pose or frame loop | `test:render-interpolation`, `test:farfield-angle` |
| Runtime diagnostics boundary | `test:runtime-diagnostics-boundary`, `test:render-interpolation`, `test:farfield-angle`, `test:farfield-final-smoke` |
| Render profile selection boundary | `test:render-profile-selection-boundary`, `test:farfield-resolution`, `test:farfield-final-smoke` |
| Far-field resolution or projection | matching `test:farfield-resolution`, `test:farfield-angle`, or `test:farfield-projection` |
| Bitmap building renderer or facade data | `test:custom-next` and `tests/bitmap_building_renderer_verify.js` |
| Authored District 1 data or save behavior | `test:authored-d1`, `test:authored-d1-save`, and `test:custom-next` when bitmap identity changes |
| Performance diagnostics | `test:perf-probe-v2` or `test:farfield-profiler` as applicable |
| Documentation only | `git diff --check` |

The legacy aggregate self-check is retired. Its valid behavior is owned by the focused checks above; its 320x200 and historical procedural-material expectations are recorded in `docs/evidence/SNC-CLEAN-P4-010-LEGACY-SELFCHECK-INVENTORY.md`.
