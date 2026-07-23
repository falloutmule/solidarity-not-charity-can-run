# SNC-CLEAN-P2-020 — Proof UI Synthesis

**Baseline:** `aa24619a8473566e5075032b467b410bee6b3bd2` (`chromeinput2`)

## Decision

**A — leak verified.** The historic `D1 PROOF slot_02 custom_next_001` label remains in two ordinary HUD draw functions. It is dormant on the supported authored-D1 route because that route clears the legacy registry, but neither HUD branch is query-gated and either can draw if legacy D1 state exists.

## Evidence inputs

- [Source ownership](SNC-CLEAN-P2-010A-SOURCE-OWNERSHIP.md): two normal-HUD owners, property-read only, no lookup side effects.
- [Test dependencies](SNC-CLEAN-P2-010B-TEST-DEPENDENCIES.md): no maintained test needs the visible label; real asset and authored-level assertions remain necessary.
- Portrait baseline: ordinary no-query portrait New Run reached unpaused PLAY with controls and HUD, no page, console, or external-request errors.

## Exact implementation allowlist

| Path | Allowed change |
|---|---|
| `src/js/game-22-section-13-main-loop.js` | Remove the portrait proof-registry read and proof-label draw only. |
| `src/js/game-18-section-9-hud-reticle-popups.js` | Remove the non-portrait proof-registry read, label draw, and its now-unused panel-height contribution only. |
| `tests/authored_d1_ordinary_game_smoke.js` | Extend normal New Run coverage to assert no historical proof label is emitted and no runtime error occurs. |
| `project-metadata.json` | Accept the artifact byte/hash update produced by the canonical build. |
| `index.html` | Generated only by the canonical build. |
| `docs/evidence/SNC-CLEAN-P2-PROOF-UI.md` | Record the bounded implementation and verification evidence. |

## Forbidden paths and behavior

Do not change input, Pointer Event handling, touch CSS, movement, collision, simulation, camera, resolution, projection, rendering ownership, authored level data, saves, bitmap bytes, build manifest, CI workflow, self-check architecture, global APIs, visual-QA routes, or legacy proof-zone/generator/render code.

## Test migration

Keep every real `custom_next_001` asset, authored-registry, owner-cell, save, and generic-renderer assertion. Add one semantic assertion to the existing authored-D1 ordinary smoke: normal HUD output contains none of `D1 PROOF`, `slot_02`, or `custom_next_001` as proof text, and the run has no runtime error.

## Release identity

`BUILD_ID` remains `chromeinput2`. The repository policy assigns a new ID to a behaviorally distinct accepted build; this card removes dormant legacy proof text from unsupported legacy state while preserving the accepted Chrome control path and ordinary authored-D1 production behavior. The canonical build updates exact artifact metadata.

## Required focused verification

```text
npm.cmd run test:authored-d1-smoke -- --output=test-results/cleanup-phase2/<run>/authored-d1-proof-ui.json
npm.cmd run test:render-interpolation
npm.cmd run test:farfield-angle
npm.cmd run build
npm.cmd run build:check
git diff --check
```

## Expected commit

`Remove historical proof status from production HUD`
