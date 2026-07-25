# S1-C — Top cap

The cap is a bounded projected horizontal plane. Four ground-footprint corners are projected at `heightScale: 0.4`; each active ray column receives a depth-ordered cap interval. The cap is opaque, drawn after side intervals, and only exists on columns that actually hit the low block.

This avoids a full-footprint wall cap and does not use texture alpha or per-frame pixel reads.
