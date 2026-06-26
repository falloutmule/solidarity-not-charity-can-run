# Reports index — SNC Can Run

Guard and pipeline reports live in the **repository root** (not moved — avoids broken links and proof paths). This file is the index.

## Primary guard cards

| Report | Card | What it proved | BUILD / commit | Gameplay changed? |
|--------|------|----------------|----------------|-------------------|
| [AI_SAFE_SOURCE_PIPELINE_REPORT.md](../AI_SAFE_SOURCE_PIPELINE_REPORT.md) | AI-safe source / release | `src/` scaffold, policy, constitution proofs | pipeline card | Scaffold + policy only |
| [PORTRAIT_LAYOUT_USABILITY_REPORT.md](../PORTRAIT_LAYOUT_USABILITY_REPORT.md) | Portrait layout usability | Portrait presets, usability harness | layoutguard2 era | Yes |
| [MOBILE_CONTROL_RELIABILITY_REPORT.md](../MOBILE_CONTROL_RELIABILITY_REPORT.md) | Mobile control reliability | Touch release, drift, sprint/give/menu | `controlrel1` | Yes |
| [MOVEMENT_COLLISION_GUARD_REPORT.md](../MOVEMENT_COLLISION_GUARD_REPORT.md) | 2D substep movement / collision | `movePlayerWithCollision` guard | `movcoll1` | Yes |
| [REACHABILITY_LOS_GUARD_REPORT.md](../REACHABILITY_LOS_GUARD_REPORT.md) | Grid LOS / reachability | BFS, interaction LOS, hall connectivity | `reachlos1` / `5736c8c` | Yes (hall doors) |
| [PROCEDURAL_LEVEL_VALIDATION_REPORT.md](../PROCEDURAL_LEVEL_VALIDATION_REPORT.md) | Procedural multi-seed validation | 52 seeds, reachability / quota | `multiseed1` / `ec44e53` | Harness only |
| [Q1K3_LEARNING_REPORT.md](../Q1K3_LEARNING_REPORT.md) | q1k3 study | Reference analysis | report-only | No |
| [FULL_RUN_PROGRESSION_E2E_REPORT.md](../FULL_RUN_PROGRESSION_E2E_REPORT.md) | Full-run / save-load E2E | Run loop + SAVE round-trip | `runprog1` / `1437b6f` | Yes (save fields) |

## Related harness / infra reports (root)

- `PLAYWRIGHT_SELF_CHECK_HARNESS_REPORT.md` — Playwright driver  
- `HARNESS_STATE_ISOLATION_REPORT.md` — `crWithTemporaryState`  
- `HALL_E2E_SELFCHECK_REPORT.md` — Hall custom level E2E  
- `RENDER_FAILURE_GUARD_REPORT.md` — Render failure bench  
- `VIEWPORT_SAFEAREA_HARDENING_REPORT.md` — Safe area  
- `SELF_CHECK_RUNS.md` — Self-check notes  

Older mobile/layout tune-up reports remain in root for history; prefer the **primary guard** table above for current contracts.

## Organization

- **`docs/README.md`** — technical docs  
- **`PROJECT_STATUS.md`** — current baseline and card list  
- **`SNC_REPO_ORGANIZATION_REPORT.md`** — this repo layout pass