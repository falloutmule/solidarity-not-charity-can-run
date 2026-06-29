# Reports — SNC Can Run

Main hub for guard cards, reference studies, history, proofs, and backups.  
**Gameplay baseline:** `facadefinal1` — see **`../PROJECT_STATUS.md`**. **Source:** edit `src/`, run `npm run build`.

Reports were moved out of the repo root so GitHub shows only the game + core docs.

---

## 1. Current guard reports

| # | Card | Report | BUILD / commit | One-line proof | Gameplay? |
|---|------|--------|----------------|----------------|-----------|
| 1 | AI-safe source / release | [guards/AI_SAFE_SOURCE_PIPELINE_REPORT.md](guards/AI_SAFE_SOURCE_PIPELINE_REPORT.md) | pipeline | `src/` scaffold + constitution proofs | Scaffold only |
| 2 | Playwright self-check harness | [guards/PLAYWRIGHT_SELF_CHECK_HARNESS_REPORT.md](guards/PLAYWRIGHT_SELF_CHECK_HARNESS_REPORT.md) | harness card | Driver + proof JSON | Harness |
| 3 | Hall E2E | [guards/HALL_E2E_SELFCHECK_REPORT.md](guards/HALL_E2E_SELFCHECK_REPORT.md) | hall E2E | Custom level run + exit | Yes (level) |
| 4 | Render failure guard | [guards/RENDER_FAILURE_GUARD_REPORT.md](guards/RENDER_FAILURE_GUARD_REPORT.md) | render guard | Bench scenes + image hashes | Harness |
| 5 | Harness state isolation | [guards/HARNESS_STATE_ISOLATION_REPORT.md](guards/HARNESS_STATE_ISOLATION_REPORT.md) | isolation | `crWithTemporaryState` | Harness |
| 6 | Viewport / safe-area | [guards/VIEWPORT_SAFEAREA_HARDENING_REPORT.md](guards/VIEWPORT_SAFEAREA_HARDENING_REPORT.md) | viewport | Safe area + resilience | Yes |
| 7 | Portrait layout usability | [guards/PORTRAIT_LAYOUT_USABILITY_REPORT.md](guards/PORTRAIT_LAYOUT_USABILITY_REPORT.md) | layoutguard2 | Presets + overlap guard | Yes |
| 8 | Mobile control reliability | [guards/MOBILE_CONTROL_RELIABILITY_REPORT.md](guards/MOBILE_CONTROL_RELIABILITY_REPORT.md) | `controlrel1` | Touch release / drift | Yes |
| 9 | 2D substep movement / collision | [guards/MOVEMENT_COLLISION_GUARD_REPORT.md](guards/MOVEMENT_COLLISION_GUARD_REPORT.md) | `movcoll1` | `movePlayerWithCollision` | Yes |
| 10 | Grid LOS / reachability | [guards/REACHABILITY_LOS_GUARD_REPORT.md](guards/REACHABILITY_LOS_GUARD_REPORT.md) | `reachlos1` / `5736c8c` | BFS + interaction LOS | Yes (hall doors) |
| 11 | Procedural multi-seed validation | [guards/PROCEDURAL_LEVEL_VALIDATION_REPORT.md](guards/PROCEDURAL_LEVEL_VALIDATION_REPORT.md) | `multiseed1` / `ec44e53` | 52 seeds reachable | Harness only |
| 12 | Full-run progression / save-load | [guards/FULL_RUN_PROGRESSION_E2E_REPORT.md](guards/FULL_RUN_PROGRESSION_E2E_REPORT.md) | `runprog1` / `1437b6f` | Run loop + SAVE | Yes (save fields) |
| 13 | GitHub Actions harness CI | [guards/GITHUB_ACTIONS_CI_REPORT.md](guards/GITHUB_ACTIONS_CI_REPORT.md) | CI card | Playwright on push/PR | CI only |
| 14 | Onboarding / first-run help | [guards/ONBOARDING_FIRST_RUN_HELP_REPORT.md](guards/ONBOARDING_FIRST_RUN_HELP_REPORT.md) | `onboard1` | `CR.runOnboardingSelfCheck` | Yes (UI only) |
| 15 | Visual readability polish | [guards/VISUAL_READABILITY_POLISH_REPORT.md](guards/VISUAL_READABILITY_POLISH_REPORT.md) | `visual1` | `CR.runVisualReadabilitySelfCheck` + proof PNGs | Yes (render/HUD) |
| 16 | Visual rectangle regression fix | [guards/VISUAL_RECTANGLE_REGRESSION_FIX_REPORT.md](guards/VISUAL_RECTANGLE_REGRESSION_FIX_REPORT.md) | `visualfix1` | `CR.runVisualRectangleRegressionSelfCheck` | Yes (render fix) |
| 17 | Sound / feedback pass | [guards/SOUND_FEEDBACK_PASS_REPORT.md](guards/SOUND_FEEDBACK_PASS_REPORT.md) | `sound1` | `CR.runSoundFeedbackSelfCheck` + feedback proof PNGs | Yes (audio/HUD) |
| 18 | Declarative custom controls | [guards/DECLARATIVE_CUSTOM_CONTROLS_REPORT.md](guards/DECLARATIVE_CUSTOM_CONTROLS_REPORT.md) | `controls1` / `4e311e7` | `CR.runDeclarativeControlsSelfCheck` + edit proof PNGs | Yes (controls UI; layout frozen by default) |
| 19 | EDIT CONTROLS visibility | [guards/EDIT_CONTROLS_VISIBILITY_REPORT.md](guards/EDIT_CONTROLS_VISIBILITY_REPORT.md) | `controledit1` | OPTIONS→edit harness checks + `optionsEditPath` proof | Yes (edit overlay only) |
| 20 | EDIT CONTROLS resize | [guards/EDIT_CONTROLS_RESIZE_FIX_REPORT.md](guards/EDIT_CONTROLS_RESIZE_FIX_REPORT.md) | `controlsresize1` | SIZE −/+ + `proof-edit-controls-resize.json` | Yes (controls UI) |
| 21 | OPTIONS cleanup | [guards/OPTIONS_CLEANUP_PASS_REPORT.md](guards/OPTIONS_CLEANUP_PASS_REPORT.md) | `optionsclean1` / `8ef75ad` | `CR.runOptionsCleanupSelfCheck` + `proof-options-cleanup.json` | Yes (menu only) |
| 22 | Community street punk decor props | [guards/COMMUNITY_STREET_PUNK_PROP_PASS_REPORT.md](guards/COMMUNITY_STREET_PUNK_PROP_PASS_REPORT.md) | `props1` / `6adc981` | `CR.runDecorativePropsSelfCheck` + `proof-decorative-props.json` | Yes (decor only) |
| 23 | Prop readability polish | [guards/PROP_READABILITY_POLISH_REPORT.md](guards/PROP_READABILITY_POLISH_REPORT.md) | `propsread1` | `CR.runDecorativePropsSelfCheck` + proof PNGs | Yes (decor art only) |
| 24 | Street-block level grammar | [guards/STREET_BLOCK_LEVEL_GRAMMAR_REPORT.md](guards/STREET_BLOCK_LEVEL_GRAMMAR_REPORT.md) | `street1` / `3cb957a` | `CR.runStreetBlockLevelSelfCheck` + street proof PNGs | Yes (procedural layout) |
| 25 | D1 park landmark / plaza | [guards/D1_PARK_LANDMARK_PASS_REPORT.md](guards/D1_PARK_LANDMARK_PASS_REPORT.md) | `park1` / `e801077` | `CR.runD1ParkLandmarkSelfCheck` + D1 park proof PNGs | Yes (D1 layout + decor) |
| 26 | Early district progression (D1–D4) | [guards/EARLY_DISTRICT_PROGRESSION_REPORT.md](guards/EARLY_DISTRICT_PROGRESSION_REPORT.md) | `districts1` / `6b43a16` | `CR.runEarlyDistrictProgressionSelfCheck` + district PNGs | Yes (D1–D4 grammar) |
| 27 | Level selector (START DISTRICT) | [guards/LEVEL_SELECTOR_PASS_REPORT.md](guards/LEVEL_SELECTOR_PASS_REPORT.md) | `levelselect1` / `9136c01` | `CR.runLevelSelectorSelfCheck` + selector proof PNGs | Yes (title menu testing) |
| 28 | Building scale / street mass | [guards/BUILDING_SCALE_POLISH_REPORT.md](guards/BUILDING_SCALE_POLISH_REPORT.md) | `buildscale1` / `0092fab` | `CR.runBuildingScalePolishSelfCheck` + building-scale PNGs | Yes (FPV + band mass) |
| 29 | Street readability / minimap | [guards/STREET_READABILITY_MINIMAP_REPORT.md](guards/STREET_READABILITY_MINIMAP_REPORT.md) | `streetread1` / `3cd3b7f` | `CR.runStreetReadabilityMinimapSelfCheck` + readability PNGs | Yes (minimap nav palette) |
| 30 | FPV street shimmer fix | [guards/FPV_STREET_SHIMMER_FIX_REPORT.md](guards/FPV_STREET_SHIMMER_FIX_REPORT.md) | `shimmerfix1` / `7f3ad89` | `CR.runFpvStreetShimmerFixSelfCheck` + FPV matte road PNGs | Yes (D2/D3 storefront FPV) |
| 32 | FPV facade target polish | [guards/FPV_FACADE_TARGET_POLISH_REPORT.md](guards/FPV_FACADE_TARGET_POLISH_REPORT.md) | `facadefix1` / `2c80f71` | `CR.runFpvFacadeTargetPolishSelfCheck` + D1–D3 facade PNGs | Yes (broad panels vs comb lines) |
| 33 | Building module / facade roles | [guards/BUILDING_MODULE_FACADE_ROLE_REPORT.md](guards/BUILDING_MODULE_FACADE_ROLE_REPORT.md) | `modules1` / `0905d1d` | `CR.runBuildingModuleFacadeSelfCheck` + D2/D3 module proofs |
| 34 | Facade pack bridge / lab sync | [guards/FACADE_PACK_BRIDGE_REPORT.md](guards/FACADE_PACK_BRIDGE_REPORT.md) | `facadepack1` | `CR_FACADE_PACK` block + `CR.runFacadePackBridgeSelfCheck` + `proof-facade-pack-v1.txt` |
| 35 | Facade composition / readability | [guards/FACADE_COMPOSITION_READABILITY_REPORT.md](guards/FACADE_COMPOSITION_READABILITY_REPORT.md) | `facadecompose1` | `crDrawComposedFacadeFaceColumn` + `proof-facadecompose-*.png` |
| 40 | FPV ground plane / wall base alignment | [guards/FPV_GROUND_PLANE_ALIGNMENT_REPORT.md](guards/FPV_GROUND_PLANE_ALIGNMENT_REPORT.md) | `groundplane1` | `CR.runFpvGroundPlaneAlignmentSelfCheck` + `proof-groundplane-*.png/json` |
| 41 | D2/D3 facade readability final polish | [guards/D2_D3_FACADE_READABILITY_FINAL_POLISH_REPORT.md](guards/D2_D3_FACADE_READABILITY_FINAL_POLISH_REPORT.md) | `facadefinal1` | `CR.runD2D3FacadeReadabilityFinalSelfCheck` + `proof-facadefinal-*.png/json` | Yes (facade art/readability only) |
| 39 | Source split / single-file build pipeline | [guards/SOURCE_SPLIT_BUILD_PIPELINE_REPORT.md](guards/SOURCE_SPLIT_BUILD_PIPELINE_REPORT.md) | `spriteground1` | `npm run build:check` + `proof-source-build-manifest.json` |
| 38 | Sprite ground anchor / human scale | [guards/SPRITE_GROUND_ANCHOR_HUMAN_SCALE_REPORT.md](guards/SPRITE_GROUND_ANCHOR_HUMAN_SCALE_REPORT.md) | `spriteground1` | Foot anchor + `CR.runSpriteGroundAnchorSelfCheck` + `proof-spriteground-*.png` |
| 37 | Facade art vocabulary / human scale | [guards/FACADE_ART_VOCABULARY_HUMAN_SCALE_REPORT.md](guards/FACADE_ART_VOCABULARY_HUMAN_SCALE_REPORT.md) | `facadeart1` | Inset slot drawing + `CR.runFacadeArtVocabularySelfCheck` + `proof-facadeart-*.png` |
| 36 | Facade pack v2 safe modules | [guards/FACADE_PACK_V2_SAFE_MODULE_IMPORT_REPORT.md](guards/FACADE_PACK_V2_SAFE_MODULE_IMPORT_REPORT.md) | `facadev2safe1` | `garage_service_4x2` + `boarded_shop_3x2` + `CR.runFacadePackV2SafeModuleSelfCheck` |
| 31 | FPV wall line artifact fix | [guards/FPV_WALL_LINE_ARTIFACT_FIX_REPORT.md](guards/FPV_WALL_LINE_ARTIFACT_FIX_REPORT.md) | `wallfix1` / `d419ca9` | `CR.runFpvWallLineArtifactFixSelfCheck` + D1–D3 FPV wall PNGs | Yes (storefront/alley walls) |

---

## 2. Reference reports

| Report | Path |
|--------|------|
| q1k3 study (no port) | [reference/Q1K3_LEARNING_REPORT.md](reference/Q1K3_LEARNING_REPORT.md) |

---

## 3. Historical reports

Older tuning, deploy notes, and superseded write-ups: **[history/](history/)** (see [history/README.md](history/README.md)).

---

## 4. Proof artifacts

Tracked proof JSON/PNG from harness runs: **[proofs/current/](proofs/current/)**.  
New local runs may still write `proof-*` to repo root (gitignored); copy into `proofs/current/` when archiving a ship.

---

## 5. Backups

`index.before-*.html` snapshots: **[backups/](backups/)**.

---

## Navigation

- **Docs:** [../docs/README.md](../docs/README.md)  
- **Status:** [../PROJECT_STATUS.md](../PROJECT_STATUS.md)  
- **Root cleanup report:** [../SNC_REPO_ORGANIZATION_REPORT.md](../SNC_REPO_ORGANIZATION_REPORT.md)