# PORTRAIT LAYOUT USABILITY REPORT

## WHAT WAS DONE

- Backup: `index.before-layout-usability-guard.html`
- Prior baseline: **viewportfix1 / 4611b1e**
- **Before clamp (VERY HIGH -240 raw):** total overlap **36.5%** (move 13.6%, look 14.2%, give 4.6%, sprint 4.1%) — would fail harness
- **After clamp (all presets):** per-control ≤15%, total ≤25% (VERY HIGH clamped to **0%** overlap in proof run)
- Commit: **cf88dc2**
- Minimap/control **overlap metrics** (`crMinimapOverlapMetrics`, `crMinimapOverlapPass`)
- **Runtime clamp** in `portraitLayout()` — `crApplyMinimapUsabilityClamp` keeps controls from covering the minimap beyond thresholds (without moving MENU/minimap)
- **`crMigrateUnsafeControlsYOffset()`** — persists a safer `controlsYOffsetPx` when raw preset would exceed overlap limits on the current viewport
- **`CR.runPortraitUsabilitySelfCheck()`** — LOW/MID/HIGH/VERY HIGH presets, FPV/minimap/MENU/stats/controls visibility, overlap thresholds
- **`CR.runSettingsSafetySelfCheck()`** — migrate, MID safe, resetcontrols-style MID, harness restore
- Playwright **`portraitUsabilitySection()`** + proof screenshots
- Wired into **`CR.runFullSelfCheck()`** and Playwright summary gate

## WHAT WAS VERIFIED

- Overlap thresholds: **15% per control**, **25% total** minimap area
- Screenshot-style overlap (VERY HIGH **-240** without clamp) recorded as **`overlapBeforeClamp`** in self-check
- With clamp + migration, all four presets pass usability harness
- **`?resetcontrols=1`** → `controlsYOffsetPx === 0` (MID) + safe overlap
- Hall E2E, render guard, harness isolation, viewport safe-area — still pass (full Playwright green)
- `proof-playwright-summary.json` **pass: true**
- `proof-portrait-usability.json` **pass: true**

## WHAT FAILED

- Nothing blocking ship on this lineage.

## CURRENT EXACT STATE

- **`BUILD_ID`:** `layoutguard1`
- VERY HIGH label notes **“clamps if overlap”** in OPTIONS
- Default boot: MID **0**; unsafe saved Y migrates on portrait resize/boot

## REMAINING BLOCKERS

- None for harness. Optional Travis device spot-check only.

## NEXT ACTIONABLE STEP

- Hard refresh Pages URL with new `v=` hash after push (below).

## EVIDENCE

- `proof-portrait-usability.json`
- `proof-usability-low.png`, `proof-usability-mid.png`, `proof-usability-high.png`, `proof-usability-very-high.png`
- `proof-resetcontrols-safe.png`
- `proof-full-selfcheck.json`, `proof-playwright-summary.json`

## GITHUB PAGES URL

- Commit: **cf88dc2**
- Normal: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=cf88dc2&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=cf88dc2&mobile=on&portraitlayout=1
- Reset controls: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=cf88dc2&mobile=on&portraitlayout=1&resetcontrols=1