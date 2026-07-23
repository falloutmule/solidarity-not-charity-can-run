# P7-010E — Build identity mechanics

Baseline: `aef4489`, artifact `index.html`, SHA-256 `623355ff8a811dd2eae141d8da8c07e6ceb44d683b61f2a639e38c33d4bcc33e`.

## Verified mechanics

- `src/build-manifest.json` supplies an explicit ordered list of 33 scripts.
- `tools/build-single-file.js` normalizes CRLF to LF, concatenates script text with no injected separator, and writes root `index.html`.
- The builder validates metadata against the generated UTF-8 artifact; its proof path is optional and run-local.
- Source order therefore remains runtime order.

## Temporary-copy experiment

Outside the canonical worktree, the terminal text beginning at `function getDebugState(){` was removed from `game-22-section-13-main-loop.js`, written byte-for-byte to `game-22a-runtime-diagnostics.js`, and the new file was inserted immediately after the original manifest input.

The temporary build check passed and reproduced:

```text
bytes: 918383
SHA-256: 623355ff8a811dd2eae141d8da8c07e6ceb44d683b61f2a639e38c33d4bcc33e
Git blob: 9133eabb6cf8503a1fb5d0e4b6a3625c992789c7
```

## Classification

**B1 — exact byte identity feasible** for a terminal literal relocation when the source split and adjacent manifest insertion preserve exact concatenated text. This does not prove byte identity for arbitrary nonterminal moves.
