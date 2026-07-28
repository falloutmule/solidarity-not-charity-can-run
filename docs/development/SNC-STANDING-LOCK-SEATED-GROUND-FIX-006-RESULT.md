# SNC-STANDING-LOCK-SEATED-GROUND-FIX-006 result

## What was done

- Locked the Samsung-selected `npc_unhoused_work_jacket_001` physical `worldHeight` at `0.78` in isolated commit `7a0eff8d43a3b3320233cdc7b8b425552e9d71ce`. Its Gallery `displayHeightScale` remains `0.62`.
- Preserved `npc_unhoused_slumped_001` at `worldHeight: 0.68` and added its explicit generic `groundContactSourceY: 184`. Its runtime PNG SHA-256 remains `0124303d47ccc1fbf0c0f4fd729ad9d82f3e0339cf4e21ee6b0c6f5dcd8b8895`.
- Repaired the generic heightfield projector so physical height is measured from the visible top to the resolved contact row. Default assets retain the alpha-bound-bottom fallback; no asset-ID branch exists in the renderer.
- Replaced rectangle-bottom grounding diagnostics with mapped-alpha evidence and added a query-only selected-standing/seated review route. Can calibration was not changed.

## What was verified

- Alpha audit selected source row `184` as the seated physical contact; alpha-bound bottom remains row `189` and 236 authored opaque source pixels below the contact are recorded as lower-tail/shadow detail.
- Equal-depth browser measurement: standing `0.78` projects to `30.0` internal pixels; seated `0.68` projects to `26.153846` internal pixels; both contact the projected ground within `0.846154` internal pixels.
- `npm.cmd run build`, `npm.cmd run build:check`, metadata truth, visual locks, character registry and alpha checks, generic heightfield contract, can fixture, heightfield proof, Asset Gallery, District 1, save/load, interpolation, far-field, Chrome pointer path, and selected review browser test all passed.
- Public immutable preview HTTP verification returned `200`, exactly `1,681,377` bytes, and SHA-256 `85d1729933f1cd1265d06ba7d3c5a66afea151d6414d9e7be5a38d0fe563c7fe`.

## What failed

- The first new browser assertion used exact floating-point equality for the projected seated height. It was corrected to an epsilon comparison; renderer measurements were already consistent.
- The Gallery regression test assumed every non-seated asset remained at `0.96`; it was corrected to recognize the explicitly selected work-jacket record at `0.78` while preserving all other records and all legacy display scales.

## Current exact state

- Recovery branch: `repair/pr29-scale-lock-recovery`.
- Source commits: `7a0eff8d43a3b3320233cdc7b8b425552e9d71ce`, then `6717c2aa627e0b8b496724c10568f5e0ad3d6851`.
- Baseline: `42ae5341827ad092ced4659834bcf5b78da2a23d`.
- BUILD_ID: `heightfieldseatedground1`.
- Preview commit: `ff546407550bc7be37b9dfbe203cfcb12f6fd0fa` in `falloutmule/sfhs-preview`.
- PR #29 remains open draft at `a4ceae005db18b76eaa57a96bae8b55a454cf7f9`, targeting `feature/runtime-asset-gallery-level`; it was not retargeted or force-updated.
- Production `main` remains `ae0cba08b647ebff5db533f1dedff1b46f789412`; no merge or production deployment occurred.

## Remaining blocker

Samsung acceptance of the seated ground contact only. Standing `0.78` is locked; can calibration remains deferred.

## Next actionable step

On Samsung, open the selected review route and confirm that the seated figure's visible feet meet the cyan ground line without sinking:

`https://falloutmule.github.io/sfhs-preview/snc/pr29-scale-lock-recovery/6717c2aa627e/?heightfield=1&hfcalibration=1&hfselectedreview=1&hfgroundline=1&hfcalpose=equal-depth`

## Evidence paths

- Local alpha audit: `test-results/pr29-standing-lock-seated-ground-fix-006/slumped-contact-diagnostic/`.
- Local browser captures and report: `test-results/pr29-standing-lock-seated-ground-fix-006/`.
- Published evidence: `https://falloutmule.github.io/sfhs-preview/snc/pr29-scale-lock-recovery/6717c2aa627e/evidence/`.
