# Project Status

**Stage:** Playable pre-alpha
**Build:** `chromeinput2`
**Production:** <https://falloutmule.github.io/solidarity-not-charity-can-run/>
**Game-building state:** Gameplay content remains paused while the repository foundation is cleaned up.

## Current production truth

- Production `main` is commit `f12603b5cc92a840cdbb76873c84838a007fcc58`.
- Root `index.html` is the generated, self-contained release artifact: 1,314,349 bytes, SHA-256 `83d676c607ab4788a33d11150f630f69c8231ada72c5e3706891d2c576e0238b`.
- The selected render profile remains 400x250, interpolated angles, and subpixel projection. The 320x200 path is closed because it was not smoother and looked worse.
- Android Chrome is the required platform. The physical `chromeinput2` comparison was clearly better than `inputfallback1`, with no thumb drops, page scroll, pull-to-refresh, text selection, zoom, or material sensitivity change.

## Implemented and verified

- Custom single-file raycaster runtime with no external runtime dependencies.
- Manifest-driven source build with source/artifact parity checks.
- Portrait mobile controls, desktop support, minimap, HUD, audio, and local saving.
- Pointer Events are authoritative on PointerEvent-capable browsers; legacy Touch input is fallback-only. Chrome LOOK consumes coalesced samples when available.
- Authored District 1 data and the embedded `custom_next_001` landmark asset.
- Canned-good collection, delivery vocabulary, timer, sprint, and current progression scaffolding.

## Partial or not yet aligned with the approved design

- The current run rules predate the approved no-fail, nine-level campaign design.
- Recipient types, household delivery, portal upgrades, world-specific movement, and Hall abilities require bounded implementation cards.
- Existing menus and progression scaffolding do not yet represent the complete approved flow.
- The obsolete aggregate self-check was retired in Phase 4; its useful coverage now has focused owners.

## Current authorized work

The accepted Chrome input behavior is the cleanup baseline. The active repository card is truth and build hygiene: release records, build-proof routing, documentation, and test ownership.

Gameplay, renderer, controls, map content, saves, art, and generated runtime behavior remain paused unless the user explicitly authorizes a bounded card. Phase 5 in the roadmap remains a hard user gate.
