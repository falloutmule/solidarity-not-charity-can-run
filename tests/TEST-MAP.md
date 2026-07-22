# Test ownership map

Run the smallest listed owner test for a changed path, then run `npm.cmd run build`, `npm.cmd run build:check`, and `git diff --check` when the release artifact or build inputs change. Runtime changes also need the ordinary browser smoke; device-specific changes need the relevant physical acceptance.

| Changed area | Required focused check |
|---|---|
| `tools/build-single-file.js`, `src/build-manifest.json`, `project-metadata.json` | `test:metadata-truth`, `test:build-proof-routing` |
| `src/js/game-06*`, mobile input CSS, control markup | `test:chrome-pointer-path`; `test:mobile-ui-cache` when layout/cache changes |
| Render pose or frame loop | `test:render-interpolation`, `test:farfield-angle` |
| Far-field resolution or projection | matching `test:farfield-resolution`, `test:farfield-angle`, or `test:farfield-projection` |
| Bitmap building renderer or facade data | `test:custom-next` and `tests/bitmap_building_renderer_verify.js` |
| Authored District 1 data or save behavior | `test:authored-d1`, `test:authored-d1-save`, and `test:authored-d1-smoke` as applicable |
| Performance diagnostics | `test:perf-probe-v2` or `test:farfield-profiler` as applicable |
| Documentation only | `git diff --check` |

`test:selfcheck` is historical characterization, not a default release gate. Use it only for a broad milestone or a systemic regression investigation.
