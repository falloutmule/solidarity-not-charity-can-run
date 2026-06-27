# EDIT CONTROLS visibility (OPTIONS path)

**Card:** EDIT CONTROLS visibility  
**BUILD_ID:** `controledit1`  
**Backup:** `index.before-controledit1.html`

## Problem

With **OPTIONS → EDIT CONTROLS**, `crEnterControlEditMode()` hid `#rmenu` once, but **`drawMobileMenu()`** re-opened the OPTIONS panel every frame (`state === STATE.OPTIONS` → `rmenuShow()`). The semi-transparent options overlay (`z-index: 20`) sat above the control dock (`z-index: 9`), so editable controls and **DONE / RESET / CANCEL** were not usable.

## Fix (default layout unchanged)

- **`drawMobileMenu()`:** early exit when `_controlEditActive` — `rmenuClearForGameplay()`, strip `options-tune`, show portrait controls + edit chrome only.
- **`drawMobileMenu()`:** do not treat OPTIONS/pause tune preview while `_controlEditActive`.
- **`crEnterControlEditMode()`:** `rmenuClearForGameplay()` + remove `options-tune` on enter.

## Harness

`CR.runDeclarativeControlsSelfCheck()` now asserts:

- OPTIONS panel visible before edit (`optionsPanelBeforeEdit`)
- OPTIONS hidden in edit (`optionsHiddenInEdit`)
- Edit bar visible (`editBarVisibleFromOptions`)
- MOVE visible (`moveVisibleInEdit`)
- Drag from OPTIONS edit path (`dragFromOptionsEdit`)

Playwright `declarativeControlsSection` records `optionsEditPath` proof; pass gated on full declarative selfcheck.

## Proof

- Local: `npm run test:selfcheck` → `{"pass":true}`
- `proof-declarative-controls.json` → `declarative.checks.*` above
- `proof-full-selfcheck.json`

## URLs (cache-bust after deploy)

- Play: `?v=<commit>&mobile=on&portraitlayout=1`
- Selfcheck: `?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1`