# Reports — SNC Can Run

Main hub for guard cards, reference studies, history, proofs, and backups.  
**Gameplay baseline:** `optionsclean1` — see **`../PROJECT_STATUS.md`**.

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