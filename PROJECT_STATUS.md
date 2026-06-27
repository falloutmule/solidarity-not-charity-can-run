# Project status — Solidarity Not Charity Can Run

Last updated: Prop readability polish (`propsread1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| | |
|--|--|
| **BUILD_ID** (root `index.html`) | `propsread1` |
| **Gameplay commit** | `e6f6af6` |
| **Prior BUILD_ID** | `props1` / `6adc981` |
| **Prior** | `optionsclean1` / `8ef75ad` |

**CI (propsread1):** [SNC Can Run Selfcheck run 28294528895](https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28294528895) — `success` on `4eabb49`, artifact `snc-can-run-proof-artifacts`.

## URLs

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=e6f6af6&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=e6f6af6&mobile=on&portraitlayout=1  

*(Cache-bust with `e6f6af6` — see `reports/guards/PROP_READABILITY_POLISH_REPORT.md`.)*

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
19. **Prop readability polish** — `propsread1`, `CR.runDecorativePropsSelfCheck` — **closed** (local harness)

## Next likely work

- Level design card (explicit handoff only).  
- Optional: modular `src/` **only after** proven build parity to single-file artifact.

## Blockers

- None known after local `npm run test:selfcheck` PASS on `propsread1` (await CI on push).