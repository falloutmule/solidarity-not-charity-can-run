# S3 — Isolated implementation

- `WALL.LOW_BLOCK` distinguishes the fixture from opaque walls while remaining solid to existing collision.
- `src/js/game-16c-low-block-spike.js` owns only query-gated buffers, low-face/cap projection, and sprite interval helper logic.
- The render loop captures one first low hit, continues to one far wall, and composes far wall → low side → cap → sprites.
- `low_block_spike` is an isolated custom level; it places one `1×2` low block, a far wall, and a test NPC behind it.
- Normal city and Hall generation explicitly clear fixture-only low-block metadata.

The pilot uses opaque diagnostic materials, not final dumpster artwork. A distinct long-side/short-end art decision remains required before a production-content card.
