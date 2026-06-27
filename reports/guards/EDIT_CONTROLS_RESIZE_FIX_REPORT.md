# EDIT CONTROLS resize fix

**Card:** EDIT CONTROLS resize (SIZE − / SIZE +)  
**Previous baseline:** `controledit1` / `f543956` (handoff cited `controls1` / `4e311e7`)  
**New BUILD_ID:** `controlsresize1`  
**Gameplay commit:** `14b31e84be3b62c06809feb2d83bd5105755a224`

## Problem

EDIT CONTROLS allowed drag-to-move but had no phone-friendly resize UI (corner handles were easy to miss).

## Fix

Edit bar (portrait **OPTIONS → EDIT CONTROLS**):

- **SELECTED:** MOVE / GIVE / LOOK / SPRINT (tap a control box to select)
- **SIZE −** / **SIZE +** on the selected control
- **DONE** / **CANCEL** / **RESET** (unchanged semantics)

**Resizable:** MOVE, GIVE, LOOK, SPRINT (sticks stay square; buttons scale on `JOY_SIZE_STEPS` / `BTN_SIZE_STEPS`).  
**Non-editable:** MENU (and minimap/FPV/stats bands unchanged).

**Persistence:** normalized `x,y,w,h` in `localStorage` key **`cannedRun.controls.v1`** (not game save).  
**SAVE_VERSION / `cannedRun.save.v1`:** unchanged.  
**Default layout:** unchanged when no overrides (parity harness still passes).

**`?resetcontrols=1`:** still calls `crClearControlOverrides()` — clears custom size/position.

## Harness

- `CR.runDeclarativeControlsSelfCheck()` — resize, persist w/h, reload size, reset default size, resetcontrols-style clear, MENU non-editable.
- `CR.runFullSelfCheck()` includes declarative block.
- Playwright: `proof-edit-controls-resize.json` + resize PNGs.

## Local verification

```bash
npm run test:selfcheck
```

Result: **`{"pass":true}`** (after implementation).

## Proof artifacts

- `proof-edit-controls-resize.json`
- `proof-control-resize-move-before.png` / `proof-control-resize-move-after.png`
- `proof-control-resize-button-before.png` / `proof-control-resize-button-after.png`
- `proof-control-edit-reset.png`
- `proof-full-selfcheck.json`
- `proof-declarative-controls.json`

## URLs

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=14b31e8&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=14b31e8&mobile=on&portraitlayout=1`

## CI

- Workflow: **SNC Can Run Selfcheck** (run URL after Actions completes)
- Artifact: **`snc-can-run-proof-artifacts`**

## Unchanged

- Hall, procedural map gen, movement/collision, save format, global OPTIONS size rows (not reintroduced).