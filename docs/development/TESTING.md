# Testing

## Blocking release lane

Every public runtime release must pass:

1. `npm run test:metadata-truth`
2. `npm run build:check`
3. the smallest focused subsystem test
4. `npm run test:farfield-final-smoke`

GitHub Actions runs metadata, source/artifact, and ordinary browser checks on every push and pull request to `main`. Path-aware jobs add input/layout, renderer, authored-content, and persistence checks when those areas change.

## Focused checks

- `test:custom-next`, `test:authored-d1`, `test:authored-d1-save` — authored District 1 and its bitmap identity
- `test:farfield-resolution`, `test:farfield-angle`, `test:farfield-projection` — selected render contracts
- `test:render-interpolation`, `test:farfield-profiler`, `test:mobile-ui-cache`, `test:mobile-options-persistence` — pacing and interface support
- `test:chrome-pointer-path` — Pointer-versus-Touch registration, static interaction CSS, and concurrent MOVE + LOOK
- `test:build-proof-routing` — ordinary builds leave no root proof file; explicit proofs stay ignored and run-local

Use [tests/TEST-MAP.md](../../tests/TEST-MAP.md) to choose the owner test. All generated output goes under ignored `test-results/`; ordinary `build` and `build:check` do not write proof output.

## Retired legacy self-check

The aggregate legacy self-check is retired. It encoded superseded 320x200, procedural-level, material, facade, and aggregate expectations; it is not a release command. The Phase 4 inventory records each retired assertion and its focused replacement where one remains useful.

## Physical acceptance

Automated checks prove technical behavior, not mobile feel. Touch, pacing, layout, and visible-performance changes require a physical Android Chrome verdict after automation passes.
