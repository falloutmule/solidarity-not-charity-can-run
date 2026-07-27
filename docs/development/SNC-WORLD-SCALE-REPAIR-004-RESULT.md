# SNC World-Scale Repair 004

## Scope

The `.40` can remains accepted and unchanged. This candidate changes the
generic physical height of every standing runtime character from `0.96` to
`0.68`, exactly matching `camera.eyeZ`.

The heightfield visible-alpha-bounds projection grounds each artwork at
world `Z=0`. At any shared depth, a visible sprite with `worldHeight: 0.68`
has its top on the camera's horizontal eye line. This is a physical-height
contract change, not a fixture offset, camera change, or renderer change.

Unchanged: `camera.eyeZ: 0.68`, can `worldHeight: 0.40`, slumped
`worldHeight: 0.68`, half block `Z=0.50`, full wall `Z=1.00`, collision,
DDA, raised-top-plane projection, world depth, alpha-run behavior, source
PNGs, and legacy Gallery display scales.

## Required calibration result

At equal depth `6.5` in the internal `400x250` renderer, the standing
sprite's top is `Y=125.000`, the horizon / eye line. Its projected visible
height is `26.154 px` and its grounded base is `Y=151.154`. The `.40` can
retains `15.385 px` projected height at that depth.

## Verification scope

The focused contract now requires all standing assets to equal `camera.eyeZ`.
The browser calibration requires the standing top to remain on the eye line
at equal and close depths while visible-alpha-bounds grounding remains within
one internal pixel. The regular heightfield proof and Gallery regression
lanes remain required before publication.

PASS: `npm.cmd run build`, `npm.cmd run build:check`, world-height contract,
runtime-character alpha, runtime asset gallery, generic heightfield contract,
can fixture, eye-level calibration browser proof, heightfield proof, Gallery
smoke, authored District 1, District 1 save/load, render interpolation,
far-field projection, Chrome pointer path, and metadata truth. Browser
observers recorded no page errors, console errors, or external requests.

The rebuilt root artifact is `1,675,174` bytes with SHA-256
`c01fb8b54c9402130d631173ad6fe443f54dc0932ba93de74a77437948e039fa`.
Run-local screenshots and measurements are under
`test-results/world-scale-repair-004/`; the pre-edit artifact backup is
`test-results/world-scale-repair-004/index.before-standing-eye-level.html`.

The first build stopped before writing because `project-metadata.json` still
identified `heightfieldworldscale3` after the source was advanced to
`heightfieldworldscale4`. Updating that metadata identity was the only
repair; the subsequent build and parity check passed.

## Samsung status

This is a new visual candidate. It is not production-accepted until the
Samsung eye-level view is reviewed.
