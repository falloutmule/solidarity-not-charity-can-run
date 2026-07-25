# B1-C — Top cap and vertical occlusion

`crWallProjectionMetrics` in `src/js/game-15-section-6-procedural-assets.js:1023` ground-anchors the existing full wall interval. `drawScene` obtains that interval at `src/js/game-16-section-7-render.js:131–136`.

The current renderer cannot represent a correct low solid from that interval alone:

1. First-hit DDA exits at the near low-block cell.
2. One scalar `zbuffer[col]` is written for the complete screen column (`game-16...:110–130`).
3. The screen interval above a shortened side is therefore never traced to the farther wall.
4. Sprite rendering rejects a whole column against that scalar depth (`game-16...:297–305`); far-field sprites use the same all-or-nothing comparison (`game-16b-far-field-projection.js:177–183`).
5. There is no top-plane asset contract or projection primitive. The historical cap was a screen polygon, not depth-correct geometry.

Correct behavior requires vertical visibility/depth intervals (or an equivalent second-hit/compositing pass): lower pixels owned by the low block, upper pixels traced to farther world, and sprites clipped/depth-tested to those intervals. A cap belongs in that same model.

Conclusion: the requested four-sided low prism is blocked by the current single-depth-column architecture. A local `heightScale` edit would repeat the rejected full-height occlusion failure.
