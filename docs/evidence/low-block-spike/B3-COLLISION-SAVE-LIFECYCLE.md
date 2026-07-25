# B1-D — Block collision and lifecycle

Current collision authority is `game.map` through `World.cellSolid` in `src/js/game-12-section-4-collision-walk-helpers.js:129–155`; every nonzero map cell is solid. `movePlayerWithCollision` (`:106–127`) is the only movement owner and preserves axis-separated wall sliding. It is called by fixed-step update at `src/js/game-20-section-11-update-input.js:463–466`.

Reachability and interaction share the map-based owner:

- `gridReachableFrom`: collision helpers `:63–100`
- line-of-sight: `:25–60`
- interaction: `src/js/game-19-section-10-gameplay-actions.js:27–34,110–120`

District 1 installation builds a detached authored map, building registry, and building-owner grid before atomically replacing runtime state (`src/js/game-09a-authored-level-runtime.js:44–190`). The building-owner grid is renderer metadata, not collision authority.

Authored saves serialize identity plus mutable pickup/NPC/exit overlay only (`src/js/game-14-section-5b-local-persistence.js:346–408`). Continue reconstructs immutable authored state before applying the overlay, so a static low block must not enter the save schema.

Proposed only: an immutable authored `lowBlocks` collection, validated by the installer and stamped into the derived `game.map` as existing solid building cells. A separate registry may own visual height data, but must not become a second collision authority. Required eventual owners: `test:authored-d1`, `test:authored-d1-save`, `test:tiled-d1-roundtrip`, plus a new focused movement/reachability test.
