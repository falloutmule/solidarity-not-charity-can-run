# PR #30 physical cast class policy

PR #30 has one canonical physical-height policy. The renderer receives a
resolved numeric `worldHeight`; class resolution happens during deterministic
character-asset compilation and never in the per-pixel renderer.

| Class | Members | `worldHeight` | Legacy `displayHeightScale` |
| --- | ---: | ---: | ---: |
| `standingComposite` | 15 approved cast assets | 0.78 | 0.62 |
| `seatedSlumped` | `npc_unhoused_slumped_001` | 0.68 | 0.45 |
| `canPickup` | all cans | 0.40 | n/a |

`npc_unhoused_slumped_001` also keeps `groundContactSourceY: 182`. Its height
and contact pivot are independent: changing a generic vertical pivot must not
change projected sprite width or height.

The standing/composite class deliberately includes multi-subject and wider
artwork such as parent-and-child, dog, bicycle, and cart images. Source-image
width is artwork composition, not a third physical-height authority.

The character source manifest contains only `worldHeightClass`; it has no
per-asset `worldHeight` values. The compiler validates exactly fifteen
`standingComposite` records and one `seatedSlumped` record, resolves the two
heights, and emits the class plus resolved number to the runtime registry.

`?heightfield=1&hfclasssweep=1` is an internal regression-evidence fixture. It
uses generated records without runtime height overrides to render all sixteen
assets at equal depth, along with can, half-block, full-wall, and camera-height
diagnostics. It is not a user calibration or comparison route and is excluded
from the normal Asset Gallery candidate.
