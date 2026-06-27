# Project status — Solidarity Not Charity Can Run

Last updated: Street-block level grammar (`street1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| | |
|--|--|
| **BUILD_ID** (root `index.html`) | `street1` |
| **Gameplay commit** | `3cb957a` |
| **Prior BUILD_ID** | `propsread1` / `e6f6af6` |
| **Prior** | `props1` / `6adc981` |

**CI (street1):** [SNC Can Run Selfcheck run 28295099113](https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28295099113) — `success` on `3cb957a`, artifact `snc-can-run-proof-artifacts`.

## URLs

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=3cb957a&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=3cb957a&mobile=on&portraitlayout=1  

*(Cache-bust with `3cb957a` — see `reports/guards/STREET_BLOCK_LEVEL_GRAMMAR_REPORT.md`.)*

## Completed cards (order)

1. **AI-safe source / release structure** — `src/` scaffold, policy, constitution proofs  
2. **Portrait layout usability guard** — `layoutguard2` / frozen portrait shell  
3. **Mobile control reliability guard** — `controlrel1`  
4. **q1k3 study report** — reference only, no port  
5. **2D substep movement / collision guard** — `movcoll1`  
6. **Grid LOS / reachability guard** — `reachlos1`  
7. **Procedural multi-seed validation guard** — `multiseed1`  
8. **Full-run progression / save-load E2E guard** — `runprog1`  
9. **GitHub Actions harness CI** — `.github/workflows/selfcheck.yml`, proof artifact upload  
10. **Onboarding / first-run help** — `onboard1`, `CR.runOnboardingSelfCheck`  
11. **Visual readability polish** — `visual1`, `CR.runVisualReadabilitySelfCheck`  
12. **Visual rectangle regression fix** — `visualfix1`, `CR.runVisualRectangleRegressionSelfCheck`  
13. **Sound / feedback pass** — `sound1` / `d06b2ee`, `CR.runSoundFeedbackSelfCheck`  
14. **Declarative custom mobile controls** — `controls1` / `4e311e7`, `CR.runDeclarativeControlsSelfCheck` — **closed**  
15. **EDIT CONTROLS visibility** — `controledit1` — **closed**  
16. **EDIT CONTROLS resize** — `controlsresize1` — **closed**  
17. **OPTIONS cleanup** — `optionsclean1`, `CR.runOptionsCleanupSelfCheck` — **closed**  
18. **Community street punk decor props** — `props1`, `CR.runDecorativePropsSelfCheck` — **closed**  
19. **Prop readability polish** — `propsread1`, `CR.runDecorativePropsSelfCheck` — **closed**  
20. **Street-block level grammar** — `street1`, `CR.runStreetBlockLevelSelfCheck` — **closed**

## Next likely work

- Further level pressure (moving blockers, timers) — explicit handoff only.  
- Optional: modular `src/` **only after** proven build parity to single-file artifact.

## Blockers

- None known after local + CI `npm run test:selfcheck` PASS on `street1`.