# Fixed-step simulation report

**Card:** `FIXED_STEP_SIMULATION`  
**BUILD_ID:** `feel2` (unchanged)  
**Date:** 2026-07-01

## Done

- Added `CR_FIXED_STEP_DT` (1/60), accumulator, max frame dt 0.25, max 5 steps/frame.
- `frame()` calls `crApplyPendingInputActions()` once per visual frame, then `crStepSimulationFixed(rawDt)`; render stays once per frame.
- Removed per-substep look apply from `update()` (look consumed only in `frame()`).
- Exported: `crResetFixedStepSimulation`, `crStepSimulationFixed`, `crGetFixedStepState`, `crClampFixedFrameDt`, `runFixedStepSimulationSelfCheck`.
- Playwright: `proof-fixed-step-simulation.json` gated in `corePass`.
- Docs: `docs/harness-overview.md` proof table rows.

## Verified

```bash
npm run build          # PASS
npm run build:check    # PASS
npm run test:selfcheck # PASS
```

`proof-fixed-step-simulation.json`: `pass: true` (all required checks green).

## Failed

- None for Card 5.

## Current state

- **Repo:** `falloutmule/solidarity-not-charity-can-run`
- **Branch:** `main`
- **Commit before:** `4f3a883`
- **BUILD_ID:** `feel2`
- **Working tree:** unrelated proof PNG churn may remain unstaged (pre-existing).

## Blockers (remaining cards, not Card 5)

| Card | Blocker |
|------|---------|
| 6 Sprite occlusion screenshots | Not started this pass |
| 7–8 World adapter wiring | Not started |
| 9 Mobile real device | **BLOCKER:** no physical Android device in Hermes environment |
| 10 Pages proof refresh | Needs post-push deploy + browser fetch |
| 11 Typed world decision | Report-only; deferred |

## Next actionable step

1. Commit/push Card 5 (`index.html` + src + tests + docs + report).
2. Travis: optional `?v=<sha>` Pages selfcheck.
3. Card 6: Playwright screenshots for visible/occluded sprite benches.

## Evidence

- `reports/guards/FIXED_STEP_SIMULATION_REPORT.md` (this file)
- `proof-fixed-step-simulation.json` (local; gitignored — regenerate via `npm run test:selfcheck`)
- `src/js/game-22-section-13-main-loop.js` — accumulator + selfcheck
- `tests/run_selfcheck_playwright.js` — `corePass` gate