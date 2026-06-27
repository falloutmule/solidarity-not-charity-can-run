# Declarative custom mobile controls — SNC Can Run

**Card closed:** 2026-06-27 — CI green on **`4e311e7`**.

## WHAT WAS DONE

- Backup: `index.before-declarative-custom-controls.html` (repo root, local; gitignored).
- **BUILD_ID** `sound1` → **`controls1`** (gameplay card id; **`CR_SOUND_FEEDBACK`** style remains **`sound1`**).
- **`INPUT_CONFIG`** — MOVE / GIVE / LOOK / SPRINT / MENU (MENU not editable in edit mode).
- Normalized control rects (`x,y,w,h` 0–1) merged **after** legacy `portraitLayout()` math; default parity self-check when no overrides.
- Persistence: **`cannedRun.controls.v1`** (`v`, `overrides`, `ts`) — separate from game save.
- OPTIONS: **EDIT CONTROLS**, **RESET CONTROLS**; **`?resetcontrols=1`** also clears control overrides.
- Edit mode: pause, drag editable controls, DONE / CANCEL / RESET; gameplay pointers gated while editing.
- **`CR.runDeclarativeControlsSelfCheck()`** folded into **`CR.runFullSelfCheck()`**.
- Playwright **`declarativeControlsSection`** + proof PNGs/JSON.

## WHAT WAS VERIFIED

- **Static:** single-file `index.html`; no external runtime assets; constitution checks pass.
- **Gameplay unchanged:** portrait FPV / minimap / stats / MENU vertical contract (fixed bands unless user drags in edit mode); intentional SPRINT/LOOK overlap preserved; Hall E2E path; procedural map generation; movement/collision; reachability; full-run progression; onboarding; sound/visual contracts.
- **Save format unchanged:** **`SAVE_VERSION`** still **1**; **`cannedRun.save.v1`** schema unchanged — harness **`saveFormatUnchanged: true`** in `proof-declarative-controls.json`.
- **Harness (local):** `npm run test:selfcheck` → **`pass: true`** (on commit **`4e311e7`**).
- **Harness (CI):** workflow **SNC Can Run Selfcheck** — **success** on push **`4e311e7`**.
- Gates: declarative controls, full selfcheck, sound feedback, visual guards, onboarding, full-run E2E, mobile controls, movement, reachability, multiseed, Hall, isolation, render guard, no external requests.

## WHAT FAILED

- Nothing for this card (local + CI on **`4e311e7`**).

## CURRENT EXACT STATE

| Field | Value |
|-------|--------|
| **BUILD_ID** | `controls1` |
| **Gameplay commit** | `4e311e7` (`4e311e767109409889e9dada9b05825d580b65d3`) |
| **Prior baseline** | `sound1` / `d06b2ee` |
| **Control overrides key** | `cannedRun.controls.v1` (new; does not bump SAVE_VERSION) |
| **Save format** | Unchanged (`SAVE_VERSION` 1) |
| **Layout / Hall / map gen** | Unchanged unless user applies custom control overrides |

## REMAINING BLOCKERS

- None for this card.

## NEXT ACTIONABLE STEP

- None for this card. Optional real-phone confirmation of EDIT/RESET CONTROLS only.

## EVIDENCE

- **Gameplay commit:** `4e311e7`
- **Proof JSON (local / CI artifact):** `proof-declarative-controls.json`, `proof-control-hit-test.json`, `proof-full-selfcheck.json`, `proof-playwright-summary.json` (`declarativeControls` section)
- **Proof PNGs:** `proof-control-edit-default.png`, `proof-control-edit-moved.png`, `proof-control-edit-reset.png` (and related `proof-control-*.png` from harness)
- **Local harness:** `npm run test:selfcheck` → `{"pass":true}` on **`4e311e7`**
- **GitHub Actions:** https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28285372330
  - Workflow: **SNC Can Run Selfcheck** — success (~1m49s)
  - **headSha:** `4e311e767109409889e9dada9b05825d580b65d3`
- **Artifact (confirmed on run):** **`snc-can-run-proof-artifacts`**
- **Play URL:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=4e311e7&mobile=on&portraitlayout=1
- **Self-check URL:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=4e311e7&mobile=on&portraitlayout=1

### Unchanged by contract (harness + card scope)

- Portrait **layout shell** (FPV, minimap, stats, MENU band) with **no** user control overrides
- **CONTROL DOCK HEIGHT** behavior for MOVE / GIVE / SPRINT / LOOK (MENU not shifted by dock height)
- **Hall Of Servants** custom level generator and E2E gates
- **Procedural** `genCity` multi-seed validation
- **Game save** format and **SAVE_VERSION**