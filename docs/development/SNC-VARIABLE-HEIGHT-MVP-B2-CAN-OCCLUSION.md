# Variable-Height Raycaster MVP B2 — Can Occlusion Repair

Base candidate: `8c047a8ebec76176412a194f0311adb24746a747`
Scope: bounded proof fixture and proof instrumentation repair.

## Preserved facts

- The proof block remains one map cell centered at `11.5, 7.5`, using the immutable half profile (`Z=0.5`).
- `camera.eyeZ` remains `0.68`.
- Map collision, the DDA, the per-pixel world-depth buffer, side/top geometry, and sprite depth-run architecture are unchanged.
- The B1 source commit and its immutable preview remain historical evidence; this repair produces a new candidate.

## Repair

- The default can lane now places the can at `11.5, 5.7`, directly behind the half block for the south-facing proof.
- The independent NPC lane (`hftarget=npc`) places the NPC at that same aligned position; its non-target companion moves to a lateral lane so it cannot hide the subject.
- `hfpose=can-side` gives the can an unobstructed side view.
- Diagnostics count opaque source texels for can/NPC visibility and occlusion, rather than transparent sprite-rectangle pixels.
- The heightfield sprite path now grounds billboards through the already-existing world-Z projection with `camera.eyeZ`. It retains the same depth buffer, draw order, textures, and sprite-run renderer; this prevents the ordinary centred-eye anchor from leaving a three-pixel can leak above a geometrically correct half block.

## Required local proof

`test:heightfield-proof` must report all of the following as true:

- `canOcclusion`: the aligned can has zero visible opaque texels and blocked opaque texels.
- `canSideVisibility`: the same can has visible opaque texels from `can-side`.
- `npcPartialOcclusion`: the independent NPC lane has both visible and blocked opaque texels.
- query gate, profile/depth, top plane, four rotations, collision, save isolation, and error-free browser execution.

## Remaining gate

Samsung must still confirm: hidden can from the south, visible can from the unobstructed side, no edge leak, retained NPC partial occlusion, and simultaneous MOVE plus LOOK pacing. This candidate is not a production release.
