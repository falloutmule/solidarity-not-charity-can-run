# SNC-CLEAN-P4-020 — Legacy self-check retirement

Baseline: `2ea454a6773edcb6dbf87fce973a9a7204906a23` (`chromeinput2`).

## Decision

Retire the aggregate legacy self-check and its run-local harness artifact. It is
not repaired because its failing assertions describe superseded 320x200 and
procedural material/facade candidates rather than the accepted production game.

## Retired executable paths

- `test:selfcheck` and `tests/run_selfcheck_playwright.js`
- `tests/harness_artifact.js` and the build tool's `--test-artifact` mode
- harness-only authored D1 browser smoke
- harness-only far-field default-equivalence browser check

`docs:capture` was migrated to normal title-button interaction and the
read-only `SNCDiagnostics` snapshot, so it is no longer a hidden consumer of
the retired mutable API.

The production builder still strips the existing harness-marked source boundary;
it no longer has a code path that creates a harness artifact. Phase 4 does not
edit canonical runtime source or root `index.html`.

## Focused ownership retained or added

| Legacy intent | Focused owner after retirement |
|---|---|
| Authored District 1 identity, static reconstruction, and save overlay | `test:authored-d1`, `test:authored-d1-save`, `test:custom-next`, ordinary production smoke |
| Selected far-field resolution, angle, and projection | `test:farfield-resolution`, `test:farfield-angle`, `test:farfield-projection`, `test:render-interpolation` |
| Android Chrome Pointer path | production-only `test:chrome-pointer-path` |
| Mobile pause/resume lifecycle | `test:mobile-ui-cache` |
| Persisted control sizes and dock height | `test:mobile-options-persistence` |
| No mutable API or harness lifecycle in production | `test:production-harness-boundary`, ordinary production smoke |

The Phase 4 inventory records the retired 320x200/procedural-material assertions
and the two focused migrations.

## Verification

- focused mobile pause/resume and option-persistence tests passed;
- production-only Chrome Pointer smoke passed;
- documentation-capture production-boundary test passed;
- interpolation, far-field angle, renderer-static, authored-D1, authored save,
  asset, boundary, retirement, build-proof routing, and ordinary production
  smoke passed;
- `npm.cmd run build` and `npm.cmd run build:check` passed;
- `HEAD:index.html` and working `index.html` both resolve to
  `28f3e64125683492bbd9d377a2d30cb833020862`;
- `index.html` remains 928,554 bytes with SHA-256
  `fd2f104e748c0408a618f17de17a98d38de2c1e3f4b621475453b8a10ab1db78`.

No device or Pages verification is required: the production artifact is
byte-identical.
