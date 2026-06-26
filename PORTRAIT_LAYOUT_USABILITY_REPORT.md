# PORTRAIT LAYOUT USABILITY REPORT

## WHAT WAS DONE

- Backup: `index.before-portrait-usability-guard.html`
- Prior baseline: **aipipeline1 / 48c3b21**
- **`BUILD_ID` → `layoutguard2`** (cache bust; overlap guard unchanged from merged layoutguard work)
- Screenshot diagnosis: viewport/safe-area proved on-screen visibility, not minimap **usability** — controls could cover ~36% of minimap at VERY HIGH (-240) without clamp
- Overlap harness: **15% per control**, **25% total** of minimap area
- **`crApplyMinimapUsabilityClamp()`** in `portraitLayout()` — dock Y clamp only; MENU / minimap / stats / FPV fixed
- **`crMigrateUnsafeControlsYOffset()`** on boot, resize, after dock height changes — saves nearest safe step when raw offset fails (no-clamp test)
- **VERY HIGH kept** in `CONTROL_Y_STEPS` with OPTIONS label **“clamps if overlap”**; runtime clamp makes preset usable
- **`CR.runPortraitUsabilitySelfCheck()`** + **`CR.runSettingsSafetySelfCheck()`** in **`CR.runFullSelfCheck()`**
- Playwright **`portraitUsabilitySection()`** — release artifact, presets, screenshots, `resetcontrols=1`, post-selfcheck boot leak check
- Playwright summary requires **`portraitUsability.pass`** and **`settingsSafety.pass`**

## WHAT WAS VERIFIED

- **Before clamp (VERY HIGH -240 raw):** total **36.5%** (move 13.6%, look 14.2%, give 4.6%, sprint 4.1%)
- **After clamp (all presets in harness):** total **0%** overlap at every preset including VERY HIGH
- `controlsYOffsetPx` **migrated** when saved -240 is unsafe without clamp; **not removed** from steps
- **`resetcontrols=1`** → MID (`0`) + overlap pass + settings safety pass
- Normal boot after selfcheck does not inherit unsafe Y (`afterHarness.overlapPass`)
- Hall E2E, render guard, viewport safe-area, harness isolation, release artifact, AI-safe constitution — pass
- `node tests/run_selfcheck_playwright.js` exit **0**

## WHAT FAILED

- Nothing blocking ship.

## CURRENT EXACT STATE

- Shipped artifact: root **`index.html`**
- Adjuster: LOW / MID / HIGH / VERY HIGH all available; unsafe overlap **clamped at layout**, unsafe saves **migrated**
- LOOK ↔ SPRINT overlap unchanged (allowed)

## REMAINING BLOCKERS

- None.

## NEXT ACTIONABLE STEP

- Travis optional device spot-check with `?v=<commit>&mobile=on&portraitlayout=1`; harness is completion gate.

## EVIDENCE

- `proof-portrait-usability.json`
- `proof-usability-low.png`, `proof-usability-mid.png`, `proof-usability-high.png`, `proof-usability-very-high.png`
- `proof-resetcontrols-safe.png`
- `proof-playwright-summary.json`, `proof-release-artifact.json`, `proof-ai-safe-constitution.json`, `proof-full-selfcheck.json`

## GITHUB PAGES URL

- **BUILD_ID:** `layoutguard2`
- Commit: **PLACEHOLDER**
- Play: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=PLACEHOLDER&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=PLACEHOLDER&mobile=on&portraitlayout=1
- Reset controls: add `&resetcontrols=1` to play URL