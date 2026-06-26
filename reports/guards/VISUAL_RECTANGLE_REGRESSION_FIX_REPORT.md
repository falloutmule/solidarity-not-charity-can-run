# Visual rectangle regression fix — guard report

## WHAT WAS DONE

- **Backup:** `index.before-visual-rectangle-regression-fix.html` (local).
- **BUILD_ID:** `visual1` → **`visualfix1`**.
- **Root cause:** Screen-space **center path stripe** in `drawScene()` — `fillRect` over lower half of raycast buffer (`CR_VISUAL_READABILITY.floorPathStripe`), always camera-fixed.
- **Fix:** Removed stripe draw entirely; set `floorPathStripe: false`. Kept visual1 floor gradient, entity outlines, exit-ready pulse, GIVE/EXIT READY HUD, minimap floor, can/NPC textures.
- **Harness:** `CR.runVisualRectangleRegressionSelfCheck()` — structural flag + lower-center luma probes at three headings; nested visual readability / onboarding / full-run checks.
- **Playwright:** `proof-visualfix-*.png` + `proof-visual-rectangle-regression-selfcheck.json`.

## WHAT WAS VERIFIED

- Local `npm run test:selfcheck` — **PASS**.
- Rectangle stripe removed; probes do not detect stuck bright lower-center block.
- `CR.runVisualReadabilitySelfCheck()` still passes.
- Layout/controls unchanged; save format unchanged.

## WHAT FAILED

- Nothing blocking ship.

## CURRENT EXACT STATE

| Field | Value |
|--------|--------|
| BUILD_ID | `visualfix1` |
| Prior baseline | `visual1` / `4c85289` |
| Backup | `index.before-visual-rectangle-regression-fix.html` |
| Gameplay commit | `fd487c2` |
| Local harness | PASS |
| GitHub Actions | https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28267743764 |

## REMAINING BLOCKERS

- None known after local harness and GitHub Actions CI pass.

## NEXT ACTIONABLE STEP

- None for this card.

## EVIDENCE

**Cause:** `drawScene` lines (visual1) — `bctx.fillRect` center path stripe at `y >= RH/2`.

**Fix:** Stripe removed; `floorPathStripe: false`.

**Screenshots:**

- `proof-visualfix-normal.png`
- `proof-visualfix-turn-left.png`
- `proof-visualfix-turn-right.png`

**JSON:** `proof-visual-rectangle-regression-selfcheck.json`, `proof-full-selfcheck.json` → `visualRectangleRegression`

**CI artifact:** `snc-can-run-proof-artifacts`

## GITHUB PAGES URL

- **Play:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=fd487c2&mobile=on&portraitlayout=1`
- **Self-check:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=fd487c2&mobile=on&portraitlayout=1`

## CONFIRMATIONS

- Center path stripe **removed** (not converted to world space).
- Visual readability improvements (cans, NPCs, exit, GIVE, EXIT READY) retained.
- No Hall / map gen / save / layout / control changes.