# Changelog

Notable public releases are recorded here.

## Unreleased

### Accepted mobile input fix

- `chromeinput2` isolates Android Chrome to Pointer Events, retains legacy Touch only as a no-PointerEvent fallback, and consumes coalesced LOOK samples exactly once.
- Physical Android Chrome testing found simultaneous MOVE + LOOK clearly better than `inputfallback1`, with no thumb drops, scroll, pull-to-refresh, text selection, zoom, or material sensitivity change.

## [0.1.0-alpha.1] - 2026-07-20

### Included

- Playable single-file browser-game baseline.
- Authored District 1 content and embedded bitmap landmark.
- Portrait mobile and desktop controls, minimap, saving, sound, and focused verification.
- Curated game design, architecture, roadmap, testing, and performance documentation.

### Closed mobile paths

- 320x200 was not smoother and looked worse, so it is not a default or adaptive-resolution path.
- `rawlook1` did not improve the reported Chrome feel and remains rejected.
