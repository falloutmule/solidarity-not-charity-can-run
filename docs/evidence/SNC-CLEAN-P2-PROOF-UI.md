# SNC-CLEAN-P2-030 — Remove Historical Proof UI

**Baseline:** `aa24619a8473566e5075032b467b410bee6b3bd2` (`chromeinput2`)

## Scope

Removed the dormant historical proof label from both normal HUD branches:

- portrait: `drawPortraitStatsPanel()` in `game-22-section-13-main-loop.js`;
- non-portrait: `drawHUD()` in `game-18-section-9-hud-reticle-popups.js`.

The patch removes only the `d1CustomBuildingRegistry.slot_02` reads, the proof text draw, and the non-portrait panel-height allowance used only by that text.

It does not change Pointer Events, legacy-touch fallback, touch CSS, controls, simulation, renderer ownership, authored-level data, saves, bitmap assets, or the build manifest.

## Test migration

`tests/authored_d1_ordinary_game_smoke.js` now observes text drawn on the normal game canvas during an ordinary no-query New Run and asserts that it contains no historical proof vocabulary. The existing smoke continues to assert ordinary authored-D1 identity, bitmap ownership, rendering, movement, save/reload, and zero runtime errors.

The real `custom_next_001` asset and authored-level identity assertions remain unchanged.

## Verification

All commands passed: `test:authored-d1-smoke`, `test:render-interpolation`, `test:farfield-angle`, `test:metadata-truth`, `test:custom-next`, `build`, `build:check`, and `git diff --check`.

The ordinary authored-D1 smoke used a mobile portrait context, normal New Run, no query mode, and recorded no page errors, console errors, external requests, request failures, or bad responses.

## Artifact

The canonical generated artifact is intentionally changed only by the two deleted dormant HUD branches:

```text
BUILD_ID: chromeinput2
UTF-8 bytes: 1,313,780
SHA-256: df6bd7e4e443646acde6585a804ce260f3b793ece2b71246aaa4c82cd122b178
```

`project-metadata.json` records the same byte length and SHA-256. `chromeinput2` remains the build identity because accepted Android Chrome control behavior and ordinary authored-D1 gameplay are unchanged.

## Acceptance

The production HUD no longer contains historical proof status text. The accepted Android Chrome input path remains outside this card's changed paths.
