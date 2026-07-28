# SNC PR #29 scale-loop recovery 005

## Scope

- Accepted baseline: `42ae5341827ad092ced4659834bcf5b78da2a23d` (`heightfieldworldscale2`).
- Rejected head preserved without rewriting: `a4ceae005db18b76eaa57a96bae8b55a454cf7f9` on `archive/pr29-heightfieldworldscale4-rejected`.
- Recovery branch: `repair/pr29-scale-lock-recovery`.
- This change adds only the query-gated standing comparison. It does not apply a canonical standing or can selection.

## Golden lock

`SNC-VISUAL-LOCKS-001.json` locks the accepted seated asset at `worldHeight: 0.68`, the camera at `0.68`, the half block at `0.50`, the full wall at `1.00`, the renderer/depth/collision sources, authored low-block source textures, seated metadata, and the accepted root artifact.

The accepted root artifact is unchanged:

```text
index.html
bytes:  1675176
sha256: a3a41db8891738ff1dadaa782633b9866a0f7466707c63037fa03a93ae6b2e52
```

## Calibration route

The route is active only at:

```text
?heightfield=1&hfcalibration=1&hfstandingcomparison=1&hfcalpose=equal-depth
```

It creates three runtime-only copies of `npc_unhoused_work_jacket_001` at equal camera depth `6.5` with `worldHeight` values `0.78`, `0.82`, and `0.86`. The seated `npc_unhoused_slumped_001` is an unchanged `0.68` reference. No cans are present in this route.

Without `hfstandingcomparison=1`, the normal calibration route resolves the canonical standing height `0.96`; no runtime override survives.

The calibration artifact is intentionally generated only beneath ignored `test-results/` so that `project-metadata.json`, `src/build-manifest.json`, the root artifact, runtime character registry, canonical character manifest, ordinary Gallery, and accepted tests remain unchanged. It identifies itself as `pr29-scale-lock-005-standing` while retaining the locked baseline `BUILD_ID` `heightfieldworldscale2`.

## Verification

```text
node tests/visual_locks_verify.js
PASS

node tests/build_pr29_standing_calibration_preview.js ...
PASS — 1676482 bytes
SHA-256 80fa0cfcc86453947aa105ff0abf8989b37dc0cf47a40159db6d42ada891a1ed

node tests/pr29_standing_calibration_browser.js ...
PASS
```

Browser checks prove the query gate, exact candidate values, equal depth, shared standing source bounds, ground contact within one internal pixel, locked seated height, absence of cans, disappearance of overrides in the ordinary query, and absence of page/console errors or external requests.

At equal depth, projected standing heights are `30.00`, `31.54`, and `33.08` internal pixels for `0.78`, `0.82`, and `0.86`; the locked seated reference projects to `26.15` internal pixels.

The first lock-test attempt caught a transcription error in the newly written hash entry for `game-16-section-7-render.js`. The recorded value was repaired to the actual accepted-base SHA-256 before the passing run; the protected source file itself was never modified.

## Evidence

```text
test-results/pr29-scale-lock-recovery-005/index.before-calibration-only.html
test-results/pr29-scale-lock-recovery-005/calibration-artifact/index.html
test-results/pr29-scale-lock-recovery-005/calibration-artifact/build-proof.json
test-results/pr29-scale-lock-recovery-005/standing-calibration-browser.json
test-results/pr29-scale-lock-recovery-005/standing-size-comparison.png
```

## Known environment issue

The fresh recovery worktree does not have its own `node_modules` directory. The browser lane was run against the existing local Playwright dependency via `NODE_PATH`; no dependency or source file was added for that workaround.

## Pending decision

Samsung must select exactly one standing candidate: `0.78`, `0.82`, or `0.86`. Only then may an isolated canonical standing-height commit be prepared. Can calibration is intentionally deferred to Phase B.
