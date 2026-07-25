# S1-D — Sprite interval occlusion

Sprites in front of the low block draw normally. Behind it but before the far wall, their column is split around the low side/cap occupied interval; the lower portion is hidden and the upper portion remains visible. Existing far-wall scalar depth still hides sprites behind the farther opaque wall.

The spike supports one low interval per screen column only.
