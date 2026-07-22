# Testing

## Blocking release lane

Every public runtime release must pass:

1. `npm run test:metadata-truth`
2. `npm run build:check`
3. the smallest focused subsystem test
4. `npm run test:farfield-final-smoke`

GitHub Actions runs metadata, source/artifact, and ordinary browser checks on every push and pull request to `main`. Path-aware jobs add input/layout, renderer, authored-content, and persistence checks when those areas change.

## Focused checks

- `test:custom-next` — embedded landmark asset and face reuse
- `test:authored-d1`, `test:authored-d1-save`, `test:authored-d1-smoke` — authored District 1
- `test:farfield-resolution`, `test:farfield-angle`, `test:farfield-projection` — selected render contracts
- `test:render-interpolation`, `test:farfield-profiler`, `test:mobile-ui-cache` — pacing and interface support
- `test:chrome-pointer-path` — Pointer-versus-Touch registration, static interaction CSS, and concurrent MOVE + LOOK
- `test:build-proof-routing` — ordinary builds leave no root proof file; explicit proofs stay ignored and run-local

Use [tests/TEST-MAP.md](../../tests/TEST-MAP.md) to choose the owner test. All generated output goes under ignored `test-results/`; ordinary `build` and `build:check` do not write proof output.

## Broad self-check

`npm run test:selfcheck` is retained for characterization and milestone investigation. It is not a release blocker because parts of the historical suite encode superseded 320x200, procedural-level, material, facade, and aggregate expectations.

Do not change production behavior merely to make a legacy assertion green. Each assertion must first be confirmed as a current product contract, made state-isolated, and proven portable in a fresh clone.

## Physical acceptance

Automated checks prove technical behavior, not mobile feel. Touch, pacing, layout, and visible-performance changes require a physical Android Chrome verdict after automation passes.
