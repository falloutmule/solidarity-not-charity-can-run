# B1-B — Short-block renderer ownership

Active path:

`district-01-authored` → authored map/ownership registry → first-hit DDA wall column → whole-face bitmap column → shade/fog → sprite pass.

- `src/levels/district-01-authored.js:74–119` defines the current authored building data.
- `src/js/game-09a-authored-level-runtime.js:71–100` decodes every building cell to `WALL.BUILDING` and builds `{bid,lx,ly}` ownership metadata. It has no height or cap field.
- `src/js/game-16-section-7-render.js:89–149` paints sky/floor, performs DDA, stops at the first nonzero map cell, stores one `zbuffer[col]`, and dispatches an imported building column.
- `src/js/game-16a-bitmap-building-renderer.js:23–63,177–187` chooses one of four faces from DDA side/step, rotation, local cell, and hit fraction, then samples a vertical source column.
- `src/js/game-16-section-7-render.js:167–209` applies shade and fog after the whole wall column is drawn.

The generic face logic already represents north, south, east, and west. It does not provide a height contract, top-face asset, top-plane projector, or vertical depth intervals.

Conclusion: the natural ownership seam is the DDA-result-to-composite boundary in `drawScene`, not the bitmap-face sampler. A side-only visual scale could be added locally, but it would not meet the required occlusion behavior.
