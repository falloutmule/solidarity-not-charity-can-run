# SNC-CLEAN-P2-010B — Maintained-test dependency audit

**Baseline:** `aa24619a8473566e5075032b467b410bee6b3bd2`
**Scope:** read-only audit of the Phase 2 proof vocabulary and proof-slot state.
**Result:** PASS — the maintained tests preserve real authored/asset contracts; none require the visible historical HUD label.

## Method and maintained-test boundary

Inspected `package.json`, `tests/TEST-MAP.md`, `.github/workflows/selfcheck.yml`, every target-vocabulary hit in `tests/`, the ordinary release smoke, and the historical `test:selfcheck` metadata fixture. Target search terms were `D1 PROOF`, `slot_02`, `custom_next_001`, `d1CustomBuildingRegistry`, `d1ProofSlotId`, `d1CustomProofSlot`, `proofZone`, and `visualOnly`.

`tests/TEST-MAP.md` calls `test:selfcheck` historical characterization rather than a default release gate. Generic files named `proof-*` and generic proof-output handling are not proof-slot dependencies and are out of this card's vocabulary scope.

## Maintained dependency table

| Test command or file | Proof symbol / lines | Assertion intent | Still useful? | Semantic replacement or retained assertion | P2 test edit? |
|---|---|---|---|---|---|
| `npm run test:custom-next` / `tests/custom_next_001_face_reuse_runtime_verify.js` | `custom_next_001` 7, 61–66, 130, 148–156; banned legacy names 161–163 | Validates the real generic bitmap asset, embedded atlas, face-reuse contract, and independence from old proof adapters. | Yes | Retain asset ID/atlas/face assertions and forbidden legacy-field assertion exactly. It never requires HUD text. | No |
| `tests/bitmap_building_renderer_verify.js` (listed renderer owner test) | banned `custom_next_001`, `slot_02`, `d1ProofSlotId`, `d1CustomProofSlot`, `proofZone` 19–25 | Ensures generic bitmap renderer has no asset-specific or proof-slot branch. | Yes | Retain generic-renderer negative assertion. It is already the semantic anti-leak assertion for renderer ownership. | No |
| `npm run test:authored-d1` / `tests/authored_d1_level_verify.js` | real `custom_next_001` 13, 111; rejected legacy fields `proofZone`, `d1ProofSlotId`, `visualOnly` 124–126 | Verifies D1's actual landmark identity, exact 18 owner cells, and that authored data is free of historical placement/proof fields. | Yes | Retain authored ID, owner-cell count, and absence of legacy data fields. | No |
| `npm run test:authored-d1-save` / `tests/authored_d1_save_load_verify.js` | real `custom_next_001` 43, 161 | Verifies save/load reconstructs the canonical D1 registry rather than serialized/tampered geometry. | Yes | Retain full registry identity including asset ID; this is save correctness, not proof UI. | No |
| `npm run test:authored-d1-smoke` / `tests/authored_d1_ordinary_game_smoke.js` | real asset ID 26, 102, 137–138, 745, 799, 859, 869, 889; rejects placement fields 758 | Normal New Run verifies actual D1 loading, registry/owner cells, bitmap renderer ownership, and no debug-query route. It does **not** inspect visible `D1 PROOF` text. | Yes | Retain all asset/renderer assertions. Add one normal-PLAY assertion: the ordinary portrait HUD emits no historical proof label (`D1 PROOF`, `slot_02`, or `custom_next_001` as HUD text) and records no runtime error. | **Yes — extend this existing focused smoke; no new command.** |
| `npm run test:farfield-final-smoke` / `tests/far_field_final_candidate_smoke.js` | real `custom_next_001` 337–350 | The always-run release smoke records the loaded bitmap SHA and authored registry identity while testing normal movement/state. | Yes | Retain asset lookup and authored snapshot. It is not a proof-slot or HUD assertion. | No |
| `npm run test:farfield-resolution` / `tests/far_field_resolution_verify.js` | real asset module 184–192 | Protects self-contained resolution profiles and canonical bitmap bytes/hash. | Yes | Retain exact asset-byte assertion. | No |
| `npm run test:selfcheck` / `tests/run_selfcheck_playwright.js` | `custom_next_001` metadata fixture 726–729, 772, 799, 802 | Confirms metadata validation preserves pending art review and validates asset-footprint schema. Historical characterization only. | Yes, outside default gate | Retain metadata fixture assertions; do not use this broad harness for Phase 2 and do not migrate it for a HUD-only removal. | No |

## CI and focused-owner conclusion

`.github/workflows/selfcheck.yml` always runs `minimal-release`, including `test:farfield-final-smoke`. Its `renderer_camera` filter covers `src/js/game-22-**`; its `authored_content` filter covers `tests/authored_d1_ordinary_game_smoke.js`. Therefore a Phase 2 source change in the frame/portrait owner plus the proposed ordinary-smoke extension receives both affected CI lanes without a workflow change.

`tests/TEST-MAP.md` maps frame-loop changes to `test:render-interpolation` and `test:farfield-angle`; it maps authored D1 behavior to `test:authored-d1-smoke`. The Phase 2 focused test set should therefore be:

```text
npm.cmd run test:authored-d1-smoke -- --output=test-results/cleanup-phase2/<run>/authored-d1-proof-ui.json
npm.cmd run test:render-interpolation
npm.cmd run test:farfield-angle
```

The ordinary smoke extension should use a normal New Run with no query route and assert observed HUD output/state, rather than adding a replacement production proof label or relying solely on a source-string match. The separate portrait baseline supplies the visual-layout comparison.

## Decision for Phase 2

No maintained test requires `D1 PROOF`, `slot_02`, `d1CustomBuildingRegistry`, `d1ProofSlotId`, `d1CustomProofSlot`, `proofZone`, or `visualOnly` to remain visible in normal production HUD rendering. The only Phase 2 test migration needed is the one narrowly scoped absence/no-error assertion in `tests/authored_d1_ordinary_game_smoke.js`; all `custom_next_001` identity assertions remain legitimate and must be retained.
