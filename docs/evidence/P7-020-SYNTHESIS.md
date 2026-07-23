# P7-020 — First seam synthesis

Baseline: `aef4489`, `chromeinput2`, artifact SHA-256 `623355ff8a811dd2eae141d8da8c07e6ceb44d683b61f2a639e38c33d4bcc33e`.

## Candidate scoring

Scores are 0–3; lower is safer except coverage and byte feasibility, where higher is safer.

| Candidate | Shared state | Init / manifest | Dynamic / DOM | Save / visual / input | Coverage | Byte feasibility | Decision |
|---|---:|---:|---:|---:|---:|---:|---|
| Terminal runtime diagnostics | 1 (read only) | 0 / 0 | 1 / 0 | 0 / 0 / 0 | 2 | 3 | **Select** |
| Portrait geometry / chrome | 2 | 2 / 2 | 2 / 2 | 0 / 2 / 3 | 2 | 1 | Reject first seam |
| Fixed step / RAF / render pose | 3 | 3 / 3 | 1 / 0 | 0 / 3 / 3 | 3 | 1 | Protected |
| Mobile event/layout ownership | 3 | 2 / 2 | 3 / 3 | 2 / 3 / 3 | 3 | 1 | Protected |
| Renderer/facade dispatch | 3 | 3 / 3 | 2 / 1 | 0 / 3 / 0 | 2 | 1 | Protected fallback path |
| Save/options/audio lifecycle | 3 | 3 / 2 | 2 / 2 | 3 / 2 / 2 | 1 | 1 | Reject |
| Render-profile calculation | 1 | 1 / 2 | 0 / 1 | 0 / 1 / 0 | 2 | 1 | Defer after diagnostics |

## Decision A — safe seam selected

**Responsibility:** bounded read-only runtime diagnostics.

**Move:** `src/js/game-22-section-13-main-loop.js`, exact terminal text from `function getDebugState(){` through the frozen `window.SNCDiagnostics` assignment (current lines 489–528).

**Destination:** `src/js/game-22a-runtime-diagnostics.js`, inserted immediately after the main-loop source in `src/build-manifest.json`.

**Dependencies:** existing concatenated lexical globals (`game`, `player`, `state`, `options`, `SAVE`, fixed-step query, viewport helpers, and optional perf report). The group only reads them. It creates no new API beyond the existing frozen `window.SNCDiagnostics` object.

**Ordering:** the main loop schedules RAF before the terminal diagnostics text, but RAF cannot run until the synchronous concatenated script finishes. Appending the exact tail as the immediate next manifest input preserves both execution and concatenated source order.

**Artifact class:** B1. The temporary-copy build verified identical bytes, SHA-256, and Git blob.

**Allowed paths:** original main-loop source; one diagnostics source; manifest; one focused boundary verifier; test map; package script if registered; generated artifact; metadata only if build requires it; Phase 7 evidence.

**Forbidden paths:** mobile input; timing functions; renderers; saves; audio; authored content; CSS/HTML; diagnostic behavior; `BUILD_ID`.

**Focused verification:** new diagnostics-boundary static test, `test:render-interpolation`, `test:farfield-angle`, production smoke, build, build check, exact artifact identity, and diff check.

**Commit message:** `Extract runtime diagnostics module`.
