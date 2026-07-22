# Roadmap

This roadmap follows the approved [Game Design Document](../design/GAME-DESIGN.md). Work remains bounded to one card and one hypothesis at a time.

## Foundation cleanup — active

1. Keep `chromeinput2` as the accepted Android Chrome baseline.
2. Reconcile release truth, build-proof routing, documentation, and the focused test ownership map.
3. Inventory runtime ownership before removing any self-check, renderer, diagnostic, or fallback code.
4. Separate production and test-only harness behavior only after that ownership proof.

No gameplay behavior is part of this cleanup phase.

## Device-performance decision — complete

- The selected 400x250/interpolated/subpixel profile remains unchanged. The 320x200 path is closed.
- `rawlook1` was physically rejected.
- `chromeinput2` was physically accepted in Android Chrome: simultaneous MOVE + LOOK was clearly better with no thumb drops or browser-gesture regressions.
- Preserve the Pointer-only Chrome path, coalesced-sample handling, and static no-scroll CSS. Do not revisit renderer, resolution, raw-pointer, or frame-cap work without new evidence.

## Rules and vertical slice — after explicit card approval

1. Define versioned game rules and the save-migration contract without changing rendering.
2. Reconcile no-fail timing, can capacity, recipient requests, and targeted delivery in bounded cards.
3. Add deterministic can and portal anchors plus upgrade choices.
4. Accumulate the first playable vertical slice through focused cards rather than one broad rewrite.

## Campaign and progression

- Build World 1 before moving-loop World 2 and avoidance-based World 3.
- Add Hall of Servants data, unlocks, and abilities only after the core run is stable.
- Add leaderboard work after run identity and ruleset versioning are reliable.

## Phase 5 — hard user gate

Phase 5 is not authorized by this roadmap. Do not complete it, start broad gameplay expansion, or reinterpret the approved design without direct user input.
