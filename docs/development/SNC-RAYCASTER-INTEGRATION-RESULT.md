# SNC Raycaster Authored Low-Block Integration Result

## Scope

This branch integrates one authored solid-height asset into the query-gated Asset Gallery only. It does not alter District 1, production `main`, GitHub Pages production, or the accepted `?heightfield=1` proof fixture's geometry.

## Source authority

- Accepted proof base: `a05222b26c9d5de9df8f1cc9203306947b51d95e`
- Integration branch: `feature/snc-raycaster-authored-low-block-integration`
- Integration commits:
  - `00421f8` Generic heightfield core contract
  - `a5d397e` Deterministic authored low-block asset
  - `2fc2dcf` Generic material renderer
  - `ac3bb75` Asset Gallery placement
- The merge-base with the accepted proof is exactly `a05222b`.
- PR #27 commit `e765de889febb7e3daf6184fa00e3df1e7a575ea` is not an ancestor of this branch.

## Runtime result

- `low_block_concrete_001` is a 1x1, solid `Z=0.5` asset with five independent, fully opaque 64x64 PNG faces.
- The heightfield renderer activates from valid profile-grid and material-registry data, not a proof-level identity.
- Side and top materials resolve through profile data and per-cell quarter rotation. The hot renderer has no proof-level, proof-profile, or asset-ID branch.
- The Asset Gallery installs the one authored low block through a map-authoritative collision cell and a map-sized vertical profile grid. Existing 16 character exhibits remain present; the low block is the one additional environment exhibit.
- The gallery's deterministic review poses prove a fully occluded aligned can, unobstructed side visibility, partial NPC occlusion, attached top plane, close-range geometry, all four rotations, collision, and save isolation.

## Asset hashes

| Face | Bytes | SHA-256 |
| --- | ---: | --- |
| north | 6679 | `5397ee4252e0301eb25e1d02b6f092fffbf5b356c82cc53e5124f0b10295e01e` |
| east | 6422 | `bbab580eeef4bb3ff76f485e3c1ea49acc432745b7900d506177628a00c15eaa` |
| south | 6515 | `1dab136a7483149e92741424fe2747cb705081f5c3da140ca07bf09665f333d1` |
| west | 6526 | `49f154437fd58e3be6afb82f67f50a3ea127b6cbf70265d27cc2ae57e47d5` |
| top | 6536 | `e0c9dd6822036d2139c2a7b96984fcd6651bd510c3b3aa2596e326e9c6fa6f4b` |

- Compiled asset hash: `bbd4e0480aad51201bd1fa9012ad3aeb409fb43b4b578312c7834c626fd7097c`
- Candidate build ID: `heightfieldintegration5`
- Generated artifact: `index.html`, 1,665,572 bytes, SHA-256 `a0aeb4ac6f58957f9240c28ca90d514d3342e5abd5b73364e40ff1914883002f`

## Automated verification

All of the following passed after the gallery integration:

- `npm.cmd run build` and `npm.cmd run build:check`
- solid-height manifest, opacity, directional-face, determinism, idempotence, and top-material tests
- vertical projection, profile adapter, multi-height DDA, raised-plane, and generic ownership tests
- accepted `?heightfield=1` browser proof suite
- Asset Gallery browser suite, including all review poses and rotations
- Asset Gallery static and focus-panel tests
- District 1 and District 1 save/load tests
- interpolation, far-field projection, far-field final smoke, and Chrome Pointer Event path tests
- metadata truth, build-proof routing, runtime diagnostics boundary, and renderer static regression tests

Ignored run evidence is under `test-results/raycaster-authored-low-block-integration/`, including the browser JSON reports and screenshots in `ri-050-gallery-placement/` and `ri-060-regression/`.

## Checker verdict

**PASS — automated scope.** The branch is based on the accepted proof, the proof remains passing, the authored asset is opaque and deterministic, renderer ownership is generic, the gallery installs a real profile grid, and normal regression lanes remain clean.

## Pending human gate

Samsung review remains required for final visual and pacing acceptance. No merge, production deployment, or production Pages update is authorized or performed.
