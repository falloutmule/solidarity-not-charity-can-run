# Roadmap

This roadmap follows the approved [Game Design Document](../design/GAME-DESIGN.md). Work remains bounded to one card and one hypothesis at a time.

## Foundation — current

- Establish the clean canonical repository, living documentation, truthful metadata, and focused CI.
- Preserve the existing production artifact without gameplay or renderer changes.
- Keep generated proof and historical reports out of public history.

## Device-performance gate — current

- The target Samsung device did not expose a usable 60 Hz control, so the display-refresh comparison is unavailable.
- Repaired `inputcadence2` captures showed about 82 ms LOOK event-gap p95 values, matching the phone's visible angle jumps while measured game phases remained below budget.
- The active `rawlook1` candidate uses raw pointer samples for the dedicated LOOK drag when the browser supplies them; normal `pointermove` remains the fallback and cannot double-apply the same motion.
- Capture one moving sample near a building and one in an open area while holding MOVE and continuously dragging LOOK. Record the `lf n/g`, `lf p/w S/R/U`, and `look n/g … d … r …` overlay lines.
- A material drop from the previous ~82 ms `look g` value plus clearly smoother feel accepts the candidate. The same cadence or same stutter rejects it; do not make another source change until that physical-device result selects one hypothesis.
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
