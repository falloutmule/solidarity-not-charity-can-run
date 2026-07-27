# SNC World-Scale Repair 003

## Scope

This candidate applies the user-selected can physical height:

```text
can worldHeight: 0.40
```

The standing height remains `0.96` because no replacement standing value was
specified. The slumped height remains `0.68`; its visible-alpha-bounds
grounding contract is unchanged. No DDA, raised top plane, map collision,
per-pixel depth, authored low-block material, source PNG, or legacy Gallery
display scale changed.

## Calibration

At equal camera depth `6.5` in the internal `400x250` renderer:

| Subject | World height | Projected height | Ground Y |
| --- | ---: | ---: | ---: |
| standing NPC | 0.96 | 36.923 px | 151.154 |
| slumped NPC | 0.68 | 26.154 px | 151.154 |
| can default | 0.40 | 15.385 px | 151.154 |
| half block | 0.50 | 19.231 px | 151.154 |

The calibration route also renders `0.36 / 0.40 / 0.44` cans at equal depth.
Their projected heights are `13.846 / 15.385 / 16.923` pixels. The default
can remains shorter than the half block, so the aligned-can full-occlusion
proof remains valid.

## Verification

Passed:

- world-height contract, visible alpha bounds, and grounding browser proof;
- heightfield can/NPC/top-plane/collision proof;
- Asset Gallery smoke, authored District 1, save/load, interpolation,
  far-field, pointer-path, renderer-static, diagnostics-boundary, and build
  parity checks;
- browser proof reported no page errors, console errors, or external requests.

Run-local evidence is under `test-results/world-scale-repair-003/`. The
pre-edit artifact backup is
`test-results/world-scale-repair-003/index.before-world-scale-repair-003.html`.

## Samsung status

The `.40` can is ready for Samsung review. The standing scale remains a
separate unresolved visual concern and was intentionally not changed by this
can-only request. Production merge and deployment are not authorized.
