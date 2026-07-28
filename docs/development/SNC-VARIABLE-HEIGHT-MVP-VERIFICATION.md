# Variable-Height Raycaster MVP — Verification Record

Date: 2026-07-26
Candidate branch: `feature/snc-variable-height-raycaster-mvp`
Base: PR #25 remote head `61849f69e8e51a586084b026c26e638fd03f3213`

## Scope and isolation

- The feature is only entered by `?heightfield=1` and is a harness-only custom level.
- It is a `1×1` solid `Z=0.5` proof block. Existing map collision remains authoritative; the profile grid does not change it.
- Normal levels continue through the ordinary renderer. The legacy adapter maps unprofiled non-zero cells to a full-height legacy wall only inside the heightfield proof renderer.
- The low-block spike's cap and scalar-depth path, and PR #27's alpha-cutout path, are deliberately excluded.

## Renderer contract proved locally

| Contract | Evidence |
| --- | --- |
| World-Z projection | `camera.eyeZ = 0.68`; `Z=0` and `Z=1` preserve the full-wall projected height, and `Z=0.5` is below the horizon. |
| Profiles | Immutable `EMPTY`, `HALF_DEBUG`, and `FULL_LEGACY` profiles; a proof map cell explicitly resolves to half height. |
| DDA | The query renderer continues through lower-profile hits and composites recorded segments far-to-near until a full legacy wall. |
| Depth | A reusable `Float32Array` world-depth buffer has `100000` pixels / `400000` bytes at the canonical `400×250` render size. |
| Materials | Four opaque, patterned side debug textures plus one opaque checker top texture; four rotations produce four different proof screenshots. |
| Top plane | The raised top is projected from the real world plane and writes per-pixel depth without a canvas readback. |
| Sprite occlusion | Billboards are split into depth-visible vertical runs against the world-depth buffer. |
| State safety | The proof does not clear or overwrite the normal save slot and uses the map as the sole collision authority. |

## Automated results

All results were generated against the built root `index.html`; run-local outputs are ignored under `test-results/raycaster-variable-height-mvp/`.

- PASS — projection, legacy-profile adapter, multi-height DDA, raised-plane, opaque-texture, and directional-face tests.
- PASS — heightfield browser proof: query gate; four rotations; far, near, two corner, and top-oblique poses; close-range top; raised top; partial sprite occlusion; map collision; save isolation; no console/page/external-request errors.
- PASS — `test:runtime-asset-gallery`, `test:runtime-asset-gallery-smoke`, `test:authored-d1`, `test:authored-d1-save`, `test:render-interpolation`, `test:farfield-projection`, `test:farfield-final-smoke`, `test:chrome-pointer-path`, `test:metadata-truth`, `test:renderer-static-regression`, and `test:build-proof-routing`.
- PASS — `npm.cmd run build` and exact-source `node tools/build-single-file.js --check --proof-dir=test-results/build-proofs/raycaster-variable-height-mvp`.

## Remaining acceptance gate

The candidate is not a production change. A physical Samsung verdict remains required for the actual geometry, top attachment, sprite occlusion, and simultaneous MOVE + LOOK pacing before any merge or production release decision.
