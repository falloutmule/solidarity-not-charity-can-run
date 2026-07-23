# P7 runtime diagnostics implementation

## Classification

L1 literal relocation, with B1 exact artifact identity.

## Responsibility moved

The terminal read-only diagnostics group moved from
`src/js/game-22-section-13-main-loop.js` to
`src/js/game-22a-runtime-diagnostics.js`:

- `getDebugState()`;
- the frozen `window.SNCDiagnostics` snapshot API.

The new file immediately follows the main loop in the ordered source manifest.
The relocated text, including the boundary newline, is byte-for-byte identical
to the original terminal block when concatenated with the preceding main-loop
source.

## Protected systems

No input, RAF/accumulator, renderer, save, audio, authored-content, or mobile
layout source changed. The generated `index.html` is byte-identical to baseline.

## Focused verification

- `test:runtime-diagnostics-boundary` passed;
- `test:render-interpolation` passed;
- `test:farfield-angle` passed;
- normal production smoke passed;
- `build`, `build:check`, metadata truth, and diff checks passed.

## Baseline artifact identity

```text
BUILD_ID  chromeinput2
bytes     918383
SHA-256   623355ff8a811dd2eae141d8da8c07e6ceb44d683b61f2a639e38c33d4bcc33e
Git blob  9133eabb6cf8503a1fb5d0e4b6a3625c992789c7
```
