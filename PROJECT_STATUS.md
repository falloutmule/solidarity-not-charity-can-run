# Project Status

**Stage:** Playable pre-alpha  
**Build:** `farfieldsmooth1`  
**Release artifact:** root `index.html`  
**Production:** <https://falloutmule.github.io/solidarity-not-charity-can-run/>  
**Game-building state:** Paused while the current device-performance gate is resolved

## Implemented and verified

- Custom single-file raycaster runtime with no external runtime dependencies.
- Manifest-driven source build with source/artifact parity checks.
- Portrait mobile controls, desktop support, minimap, HUD, audio, and local saving.
- Authored District 1 data and the embedded `custom_next_001` landmark asset.
- Canned-good collection, delivery vocabulary, timer, sprint, and current progression scaffolding.
- Selected 400×250 render profile with interpolated angles and subpixel projection.

## Partial or not yet aligned with the approved design

- The current run rules predate the approved no-fail, nine-level campaign design.
- Recipient types, household delivery, portal upgrades, world-specific movement, and Hall abilities require bounded implementation cards.
- Existing menus and progression scaffolding do not yet represent the complete approved flow.
- The broad historical self-check includes obsolete expectations and remains characterization-only.

## Current blocker

Simultaneous MOVE + LOOK still stutters on the target Samsung device. Lowering internal resolution to 320×200 was the same or worse and looked worse, so production remains at 400×250.

The next action is a no-code comparison between the phone's high-refresh mode and a temporary 60 Hz setting using the unchanged production artifact. See [docs/development/PERFORMANCE.md](docs/development/PERFORMANCE.md).

## Authorization boundary

Repository foundation work is authorized. Gameplay, renderer, controls, map content, saves, art, and generated runtime behavior remain paused unless the user explicitly authorizes a bounded card. Phase 5 in the roadmap is a hard user gate.

