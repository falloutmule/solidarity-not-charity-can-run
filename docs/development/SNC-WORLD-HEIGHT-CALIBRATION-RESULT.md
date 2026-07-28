# SNC Heightfield Sprite World-Height Calibration Candidate

## Status

**PROVISIONAL — Samsung calibration required.** This candidate repairs the
separate physical-height contract that was missing from `heightfieldintegration5`.
It does not supersede the accepted geometry evidence for `a05222b` or the
rejected immutable candidate `45890cb`.

## Bounded change

- Legacy Gallery presentation keeps `displayHeightScale`: standing/composite
  assets remain `0.62`; `npc_unhoused_slumped_001` remains `0.45`.
- Variable-height rendering reads `worldHeight`: standing/composite assets use
  provisional `0.96`; the slumped asset uses provisional `0.68`.
- The heightfield can reads one explicit world-height contract of `0.18`.
- The half block remains `Z=0.50`, camera eye remains `Z=0.68`, and full walls
  remain `Z=1.00`.
- Existing sprite alpha-run drawing, world-depth comparison, and ground
  anchoring are unchanged.

No Gallery placement, environment fixture, or asset ID contains a scale
multiplier. The runtime registry owns both character fields.

## Equal-depth calibration lane

Query gate: `?heightfield=1&hfcalibration=1&hfcalpose=equal-depth`

The lane places a standing NPC, slumped NPC, can, authored half block, and
full-wall reference at a shared forward camera depth of `6.5` internal world
units. Measurements use the live `crProjectWorldZToScreenY` model at internal
render height `250`.

| Reference | World height | Projected px | Top screen Y | Ground screen Y | Camera depth |
| --- | ---: | ---: | ---: | ---: | ---: |
| Standing NPC | 0.96 | 36.92 | 114.23 | 151.15 | 6.5 |
| Slumped NPC | 0.68 | 26.15 | 125.00 | 151.15 | 6.5 |
| Can | 0.18 | 6.92 | 144.23 | 151.15 | 6.5 |
| Half block | 0.50 | 19.23 | 131.92 | 151.15 | 6.5 |
| Full wall | 1.00 | 38.46 | 112.69 | 151.15 | 6.5 |

The `standing-close` pose places the standing subject at depth `1.5`; it
projects to `160.00` pixels, top `Y=78.33`, and grounded bottom `Y=238.33`.

## Evidence

Ignored run-local evidence:

- `test-results/world-height-calibration-20260727/world-height-calibration-browser.json`
- `test-results/world-height-calibration-20260727/equal-depth.png`
- `test-results/world-height-calibration-20260727/standing-close.png`
- `test-results/world-height-calibration-20260727/heightfield-proof-regression.json`
- `test-results/world-height-calibration-20260727/gallery-regression.json`

The candidate values are intentionally not final until the user selects them
from equal-depth Samsung captures. Required phone review: standing height above
eye level, can clearly shorter than the half block, grounded bases, natural
close standing scale, retained block/NPC/can occlusion, and simultaneous MOVE + LOOK pacing.

## Repaired verification failure

The first build correctly failed because `project-metadata.json` still named
`heightfieldintegration5` after the source BUILD_ID changed. Metadata was
updated to `heightfieldworldscale1`; the rebuild, parity check, and metadata
truth test then passed. No renderer behavior was reverted or bypassed.

## Publication boundary

This branch remains a draft-PR candidate only. Do not merge it or deploy the
game production branch or production Pages.
