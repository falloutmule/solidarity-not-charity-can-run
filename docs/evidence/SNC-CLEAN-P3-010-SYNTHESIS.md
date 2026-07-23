# SNC-CLEAN-P3-010 — Harness Separation Synthesis

**Baseline:** `889fcbb88eb176dd811897c551467cfe43c68dca` (`chromeinput2`)

## Decision

The production/test-harness separation is feasible and required. The target is a run-local, ignored single-file self-check artifact built from the normal ordered production inputs plus appended harness modules.

## Verified production leakage

- The full self-check lifecycle, proof scenes, and `?visualqa=facades` mutation route are inside `src/js/game-22-section-13-main-loop.js`.
- `?selfcheck=1` is parsed in `src/js/game-03-section-0c-debug-flag.js` before normal boot.
- Root production exports a broad mutable `window.CR`; normal production code does not consume that object.
- Source-string proofs and stateful getter/proof helpers have no focused-test consumers.

## Selected architecture

1. Split the mixed game-22 source into production frame/runtime code and explicit `src/test-harness/` modules.
2. Keep `src/build-manifest.json` as the root production-only ordered manifest.
3. Add a test-only manifest/builder that emits an ignored run-local `index.html`, never updates `project-metadata.json`, and appends harness modules after the identical production prefix.
4. Expose the broad legacy test API only from the test artifact. Root production retains a bounded read-only identity/diagnostic surface.
5. Move `selfcheck`, `visualqa`, lifecycle meta routes, visual-QA mutation, proof scenes, and source-string checks to the test layer; root production must ignore those routes.
6. Replace source-string checks with focused Node static assertions before deleting their harness equivalents.

## Exact affected areas

| Area | Required direction |
|---|---|
| `game-03-section-0c-debug-flag.js` | retain normal debug/portrait flags; move self-check-only parsing/state into harness bootstrap |
| `game-22-section-13-main-loop.js` | retain frame loop and rendering; remove self-check, proof, visual-QA, and broad API sections |
| `src/test-harness/` | new extracted lifecycle, proof scene, API, and visual-QA modules |
| build tooling/tests | create ignored test artifact without metadata mutation; point full self-check at it |
| focused tests | migrate four current CR consumers to the dedicated artifact or normal UI smoke as appropriate |

## Required final gates

Production forbidden-symbol scan; production build/check; normal production browser smoke; test-artifact boot; one harness section; interpolation; far-field angle; authored D1 smoke; one full self-check against the test artifact; diff check.

## Status

**PASS — ownership is clear.** The next card is the structural extraction and is intentionally separate from the read-only inventories.
