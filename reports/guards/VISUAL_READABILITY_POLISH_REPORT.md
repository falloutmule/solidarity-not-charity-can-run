# Visual readability polish — guard report

## WHAT WAS DONE

- **Backup:** `index.before-visual-readability-polish.html` (local, gitignored pattern).
- **BUILD_ID:** `onboard1` → **`visual1`**.
- **Render/HUD-only polish** (no layout/control/Hall/map-gen changes):
  - Higher-contrast floor gradient + center path stripe (`CR_VISUAL_READABILITY.floorPathStripe`).
  - Brighter gold can texture with outline; NPC person strokes; minimap floor fill (`MINIMAP_FLOOR`) and darker wall minimap colors.
  - Sprite readability accents (can edge highlights, NPC cyan strokes, exit-ready pulse) gated on **z-buffer visibility** (no occlusion regression).
  - Minimap exit dot + ring when quota met; portrait stats **EXIT READY** banner; stronger GIVE target ring + **GIVE** label on HUD/FPV overlay.
  - Onboarding panel contrast (CSS only).
- **Harness:** `CR.runVisualReadabilitySelfCheck()` + wired into `CR.runFullSelfCheck()` / `runFullSelfCheckInner()`.
- **Playwright:** `visualRegressionShots` captures required proof PNGs + `proof-visual-readability-selfcheck.json`.

## WHAT WAS VERIFIED

- Local: `npm run test:selfcheck` → **PASS** (`proof-playwright-summary.json` `pass: true`).
- `CR.runFullSelfCheck()` includes `visualReadability.pass: true`.
- Constitution: single-file `index.html`, no eval, no external runtime assets, title unchanged.
- Controls/layout rects unchanged (portrait usability + dock checks green).
- Save format / `SAVE_VERSION` unchanged.
- Onboarding self-check still passes.

## WHAT FAILED

- Nothing blocking ship after z-buffer gating fix for sprite accents (initial run failed `occludedSpriteHidden`; fixed).

## CURRENT EXACT STATE

| Field | Value |
|--------|--------|
| BUILD_ID | `visual1` |
| Prior baseline | `onboard1` / `aaaf901` |
| Backup | `index.before-visual-readability-polish.html` |
| Gameplay commit | *(filled after push)* |
| Local harness | PASS |

## REMAINING BLOCKERS

- None known after local harness and GitHub Actions CI pass.

## NEXT ACTIONABLE STEP

- None for this card; optional future cards only when requested.

## EVIDENCE

**Visual changes (summary):**

- Floor/wall/minimap contrast; can/NPC/exit markers; exit-ready + GIVE-ready HUD cues; onboarding readability CSS.

**Proof screenshots (repo root after harness):**

- `proof-visual-normal.png`
- `proof-visual-hall.png`
- `proof-visual-exit-ready.png`
- `proof-visual-give-target.png`
- `proof-visual-onboarding.png`

**JSON:**

- `proof-full-selfcheck.json` → `visualReadability`
- `proof-visual-readability-selfcheck.json`
- `proof-visual-regression-index.json`

**CI artifact:** `snc-can-run-proof-artifacts`

## GITHUB PAGES URL

- **Play:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<COMMIT>&mobile=on&portraitlayout=1`
- **Self-check:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<COMMIT>&mobile=on&portraitlayout=1`

*(Commit hash and Actions run URL updated in docs commit after CI.)*

## CONFIRMATIONS

- No control positions moved; no portrait layout repositioning.
- Hall layout, procedural generation, renderer structure preserved.
- No external images/fonts/scripts added.
- Save format unchanged.