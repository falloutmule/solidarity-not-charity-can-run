# S2 — Decision A: bounded spike

Implement a query-gated pilot only. The allowed model is one low hit per ray, one continued traversal to one farther opaque wall, one side/cap vertical interval, and interval-clipped sprites. The fixture is a solid rotated `1×2` footprint at `heightScale: 0.4`, with collision provided by the existing `game.map` solid-cell path.

Forbidden: normal-route behavior changes, wall alpha cutouts, per-frame source reads, arbitrary layers, save migration, input/timing work, District 1 placement, or production integration.
