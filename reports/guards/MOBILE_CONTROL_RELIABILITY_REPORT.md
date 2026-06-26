# MOBILE CONTROL RELIABILITY REPORT

## WHAT WAS DONE

- Backup: `index.before-mobile-control-reliability.html`
- Prior baseline: **layoutguard2 / 16b9294**
- **`BUILD_ID` → `controlrel1`**
- Added **`CR.runMobileControlReliabilitySelfCheck()`** — MOVE (start, move, drift release, stop), LOOK (angle + release + capture), SPRINT burst, GIVE edge-safe tap, MENU open/resume cleanup, pointercancel, touch-action audit
- Playwright **`mobileControlReliabilitySection()`** + proof screenshots
- **Fixes (harness-driven only):**
  - GIVE **edge-trigger** (`inp._lastGive`) — no per-frame spam while held
  - **LOOK** touch pointers: `setPointerCapture` / `releasePointerCapture` on `#mlookpad`
  - **GIVE / SPRINT** `pointerdown` (+ cancel on GIVE) for Playwright + touch parity
  - **`triggerMobileSprintBurst()`** shared helper
  - **MENU / pause**: `clearInputState()` on open + resume

## WHAT WAS VERIFIED

- `CR.runMobileControlReliabilitySelfCheck().pass === true`
- `CR.runFullSelfCheck().pass === true`
- Portrait usability, settings safety, viewport, isolation, render, Hall E2E, release artifact, AI constitution — **pass**
- `node tests/run_selfcheck_playwright.js` — **exit 0**

## WHAT FAILED

- None (this card)

## CURRENT EXACT STATE

- Layout **unchanged** (layoutguard2 positions frozen)
- Controls: MOVE stops on release; LOOK clears; SPRINT tap burst; GIVE safe without NPC; MENU resume clean

## REMAINING BLOCKERS

- None for this card

## NEXT ACTIONABLE STEP

- Optional: real-device thumb drift spot-check on Travis phone (not required for completion)

## EVIDENCE

- `proof-mobile-control-reliability.json`
- `proof-pointer-events-log.json`
- `proof-control-move-drag.png`
- `proof-control-look-drag.png`
- `proof-control-menu-open.png`
- `proof-playwright-summary.json`

## GITHUB PAGES URL

- Commit: **bdc40b6**
- Play: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=bdc40b6&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=bdc40b6&mobile=on&portraitlayout=1