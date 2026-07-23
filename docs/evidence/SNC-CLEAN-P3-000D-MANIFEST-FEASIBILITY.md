# SNC-CLEAN-P3-000D — Production/Test Artifact Feasibility

**Baseline:** `889fcbb88eb176dd811897c551467cfe43c68dca` (`chromeinput2`)

## Verified current assembly

- `src/build-manifest.json` is an explicit ordered 33-script manifest.
- `tools/build-single-file.js` concatenates its template, styles, body, and scripts into root `index.html`.
- The build tool validates and updates only the production metadata record for root `index.html`.
- `test:selfcheck` currently reconstructs a fixture directly from that same production manifest and opens it with `?selfcheck=1`.
- Focused owner tests and ordinary smokes use root `index.html`.

## Constraint

The present builder cannot safely produce a second artifact: its manifest loader is fixed to `src/build-manifest.json`, and a normal build synchronizes `project-metadata.json` to the output. A self-check artifact must not overwrite production metadata or root `index.html`.

## Feasible least-coupled design

Keep the current production manifest and root artifact authoritative. Add a dedicated, ignored self-check artifact builder that:

1. reads a test manifest containing the production ordered inputs plus explicitly listed harness sources;
2. writes only `test-results/selfcheck-artifacts/<unique-run>/index.html`;
3. never updates `project-metadata.json`;
4. records a run-local input/hash proof; and
5. is called only by self-check/harness tests.

The implementation should first extract test-only bootstrap code from the existing mixed main-loop source into separate harness source files. Production `src/build-manifest.json` must then omit those files. The test manifest appends them after the production runtime so they can install test-only APIs and query routes without production reachability.

## Why not a second tracked release manifest/output

`dist/index.html` is already treated as an optional release-shaped artifact by the historical self-check. Tracking a second production-like output would invite stale bytes and metadata confusion. A run-local ignored artifact preserves the one shipped root artifact while keeping self-check executable.

## Required implementation contracts

| Contract | Production | Self-check artifact |
|---|---|---|
| Output | root `index.html` | ignored run-local `index.html` |
| Metadata update | required | forbidden |
| `?selfcheck` / `?visualqa` | ignored | supported |
| Test-only `CR` members | absent | installed by appended harness layer |
| Runtime sources | ordered production manifest | identical production prefix |
| Proof output | ignored run-local | same run-local directory |

## Focused verification required after extraction

- production forbidden-symbol scan;
- production build and `build:check`;
- normal production browser smoke;
- self-check artifact boot and one representative section;
- one final full self-check against the test artifact.

## Result

**PASS.** A run-local dedicated single-file self-check artifact is feasible without changing the shipped artifact model. Exact source extraction boundaries depend on the remaining ownership inventories.
