# Roadmap

This roadmap follows the approved [Game Design Document](../design/GAME-DESIGN.md). Work remains bounded to one card and one hypothesis at a time.

## Foundation — current

- Establish the clean canonical repository, living documentation, truthful metadata, and focused CI.
- Preserve the existing production artifact without gameplay or renderer changes.
- Keep generated proof and historical reports out of public history.

## Device-performance gate — next

- Compare the unchanged 400×250 production build in the phone's high-refresh and temporary 60 Hz modes.
- If 60 Hz is clearly smoother, authorize one query-gated render-pacing candidate.
- If it is the same or worse, extend only the existing profiler to correlate long frames with measured phases.
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

