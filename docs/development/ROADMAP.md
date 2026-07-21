# Roadmap

This roadmap follows the approved [Game Design Document](../design/GAME-DESIGN.md). Work remains bounded to one card and one hypothesis at a time.

## Foundation — current

- Establish the clean canonical repository, living documentation, truthful metadata, and focused CI.
- Preserve the existing production artifact without gameplay or renderer changes.
- Keep generated proof and historical reports out of public history.

## Device-performance gate — current

- The target Samsung device did not expose a usable 60 Hz control, so the display-refresh comparison is unavailable.
- Repaired `inputcadence2` captures showed about 82 ms LOOK event-gap p95 values, matching the phone's visible angle jumps while measured game phases remained below budget.
- `rawlook1` was physically rejected: it did not change the reported feel and a moving capture still showed sparse LOOK delivery. `inputfallback1` restores the preceding normal pointer route.
- The next test has no game-code mutation: compare the ordinary browser view with the game's FULLSCREEN action, using the same MOVE + LOOK route near a building and in the open.
- Fullscreen clearly smoother selects Android browser-chrome/compositor delivery. The same or worse result selects one final no-code Chrome versus Samsung Internet A/B before another source card.
- Do not add a frame cap unless separately testable physical evidence supports it.
- Do not revive 320×200, adaptive resolution, or the rejected `presentpose1` path.

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
