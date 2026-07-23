# SNC CLEAN P3 — Runtime/Harness Boundary Implementation

Status: verified production boundary; historical self-check characterization recorded.

## Production result

- Root `index.html` contains the normal runtime, inert `SNCHarnessAdapter`, and frozen read-only `SNCDiagnostics` only.
- It excludes the mutable `window.CR` API, self-check lifecycle, visual-QA route, proof overlay DOM/CSS, and harness state.
- The protected frame sequence remains `RAF → actions → fixed-step update → render pose → drawScene → presentation`.

## Test result

- The build tool creates a single-file harness artifact only beneath ignored `test-results/` when requested.
- Self-check, visual-QA, proof scenes, and legacy `window.CR` are present only in that artifact.
- Focused browser consumers that need legacy mutable APIs now generate an ignored harness artifact; the release smoke uses ordinary DOM and keyboard interaction against production.

## Verification

- Passed: production boundary verifier, build, build check, diff check, Chrome Pointer-path verifier, production smoke, render interpolation, far-field angle/default equivalence, authored D1 save and ordinary smoke, renderer static regression, and perf-probe verifier.
- Independent Luna review: PASS (`SNC-CLEAN-P3-LUNA-BOUNDARY-REVIEW.md`).
- One full historical self-check was run against `test-results/selfcheck-runs/phase3-harness-artifact-20260723T2/index.html`. It completed and produced its run manifest, but remains a non-blocking characterization failure because it retains obsolete 320×200/material expectations unrelated to this boundary (for example, `internal resolution not 320x200`). No production runtime error was reported.

## Scope

No change was made to Pointer-event controls, input cadence, movement, look sensitivity, fixed timestep, camera interpolation, renderer output, maps, saves, or authored content.
