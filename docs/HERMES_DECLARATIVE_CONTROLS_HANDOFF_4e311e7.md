# Hermes declarative custom controls handoff

**Canonical guard report:** [../reports/guards/DECLARATIVE_CUSTOM_CONTROLS_REPORT.md](../reports/guards/DECLARATIVE_CUSTOM_CONTROLS_REPORT.md)

**Commit:** `4e311e7`  
**BUILD_ID:** `controls1`  
**Backup (local):** `index.before-declarative-custom-controls.html` (gitignored; on disk before edit)

## What shipped

- **`INPUT_CONFIG`** — centralized schema for MOVE / GIVE / LOOK / SPRINT / MENU (menu not editable).
- **Normalized rects** (`x,y,w,h` in 0–1 viewport space) merged after legacy `portraitLayout()` math.
- **Persistence:** `localStorage` key `cannedRun.controls.v1` (`v`, `overrides`, `ts`).
- **OPTIONS (portrait):** EDIT CONTROLS, RESET CONTROLS; `?resetcontrols=1` also clears control overrides.
- **Edit mode:** pause, drag editable controls, DONE / CANCEL / RESET bar; gameplay pointers gated while editing.
- **`CR.runDeclarativeControlsSelfCheck()`** in full harness + Playwright `declarativeControlsSection`.

## Default layout

With **no** overrides, layout parity self-check matches pre-change legacy rects (MOVE/GIVE/LOOK/SPRINT/MENU). MENU band unchanged. SPRINT/LOOK overlap still allowed by contract.

## Harness

- Local: `npm run test:selfcheck` → **pass**
- CI: SNC Can Run Selfcheck on `4e311e7` → **success**
- Proofs: `proof-declarative-controls.json`, `proof-control-hit-test.json`, `proof-control-edit-*.png`, `proof-full-selfcheck.json`

## Phone verify

`https://falloutmule.github.io/solidarity-not-charity-can-run/?mobile=on&v=controls1`

1. Fresh load — default control positions should match prior build.
2. OPTIONS → EDIT CONTROLS — drag MOVE, DONE, reload — position persists.
3. OPTIONS → RESET CONTROLS — back to default.
4. Smoke: move, look, sprint, give still responsive.

## Not changed

- FPV / minimap / MENU vertical contract (unless user overrides in edit mode).
- Sound (`CR_SOUND_FEEDBACK` still `sound1`), visuals, collision, onboarding logic.