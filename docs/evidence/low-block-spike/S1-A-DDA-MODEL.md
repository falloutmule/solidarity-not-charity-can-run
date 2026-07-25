# S1-A — One-low-hit DDA model

`WALL.LOW_BLOCK` is a nonzero map cell: movement remains solid while DDA can distinguish it from an opaque full-height wall.

Per screen column, the spike records the first low cell's depth, side, and wall fraction, then continues DDA through cells owned by that same low block. It stops at the first farther opaque wall, map bound, or the existing 80-step cap. A second low block is deliberately not layered for this spike.

The normal wall's depth remains the scalar far depth. The low interval is held separately, so normal routes use their previous DDA behavior.
