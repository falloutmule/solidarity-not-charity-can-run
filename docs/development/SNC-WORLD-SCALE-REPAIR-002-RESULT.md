# SNC World-Scale Repair 002

## Scope

This bounded candidate repairs only heightfield billboard physical presentation:

- default can physical `worldHeight` is `0.26`;
- the heightfield renderer projects the visible alpha bounds rather than a full PNG canvas;
- the visible alpha-bound bottom is grounded at world `Z=0`;
- the existing Gallery display scale, variable-height geometry, DDA, top planes, collision, and world-depth ownership remain unchanged.

No production merge or Pages deployment is authorized by this result.

## Generic physical-bounds contract

`crHeightfieldPhysicalSpriteBounds` resolves, for every heightfield billboard:

```text
sourceX/sourceY/sourceWidth/sourceHeight
sourceCanvasWidth/sourceCanvasHeight
anchorX
groundSourceY = alphaBounds.y + alphaBounds.h
worldHeight
```

Runtime character registry metadata supplies the alpha bounds and anchor where
available. Cans, props, and exits use the same cached alpha-mask scan as a
generic fallback. `crProjectHeightfieldVisibleSprite` maps only those visible
bounds to the physical `worldHeight` and places their bottom on the projected
world ground. The legacy full-canvas `crProjectBillboardSprite` remains the
Gallery/non-heightfield path.

There is no asset-ID branch, slumped-only offset, fixture multiplier, source
PNG edit, or change to sprite alpha/depth comparison behavior.

## Calibration measurements

Equal-depth calibration uses a camera depth of `6.5` at the internal `400x250`
render size.

| Subject | World height | Projected height | Ground Y | Visible alpha bounds | Grounding error |
| --- | ---: | ---: | ---: | --- | ---: |
| standing NPC | 0.96 | 36.923 px | 151.154 | 3,3,74,186 | 0.846 px |
| slumped NPC | 0.68 | 26.154 px | 151.154 | 3,3,161,186 | 0.846 px |
| default can | 0.26 | 10.000 px | 151.154 | 2,2,16,20 | 0.846 px |
| half block | 0.50 | 19.231 px | 151.154 | geometric | n/a |
| full wall | 1.00 | 38.462 px | 151.154 | geometric | n/a |

The comparison query in this same artifact is:

```text
?heightfield=1&hfcalibration=1&hfcalpose=equal-depth&hfcancomparison=1
```

It renders equal-depth cans at `0.24`, `0.26` (default), and `0.28`, with
projected heights `9.231`, `10.000`, and `10.769` pixels respectively.

## Automated evidence

All passed from the candidate worktree:

- `npm.cmd run test:world-height-contract`
- `npm.cmd run test:world-height-calibration -- --output=test-results/world-scale-repair-002/world-height-calibration-browser.json`
- `npm.cmd run test:heightfield-proof -- --output=test-results/world-scale-repair-002/heightfield-proof-browser.json`
- `npm.cmd run test:runtime-asset-gallery-smoke -- --output=test-results/world-scale-repair-002/gallery-browser.json`
- `npm.cmd run test:authored-d1`
- `npm.cmd run test:authored-d1-save`
- `npm.cmd run test:render-interpolation`
- `npm.cmd run test:farfield-projection`
- `npm.cmd run test:farfield-final-smoke`
- `npm.cmd run test:chrome-pointer-path`
- `npm.cmd run test:renderer-static-regression`
- `npm.cmd run test:custom-next`
- `npm.cmd run build`, `npm.cmd run build:check`, and `npm.cmd run test:metadata-truth`

Run-local screenshots and numeric browser evidence are under
`test-results/world-scale-repair-002/`. The pre-edit generated artifact is
preserved at `test-results/world-scale-repair-002/index.before-world-scale-repair-002.html`.

## Samsung gate

The `0.26` default can is provisional pending a physical Samsung selection
among `0.24`, `0.26`, and `0.28`, and a visual acceptance of the corrected
slumped grounding. Automated browser proof does not replace that review.
