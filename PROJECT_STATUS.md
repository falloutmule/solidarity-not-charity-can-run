# Project status — Solidarity Not Charity Can Run

Last updated: Community street punk decor props (`props1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| | |
|--|--|
| **BUILD_ID** (root `index.html`) | `props1` |
| **Gameplay commit** | *(pending push)* |
| **Prior BUILD_ID** | `optionsclean1` / `8ef75ad` |
| **Prior** | `controledit1` / `controls1` |
| **Sound baseline** | `sound1` / `d06b2ee` |

## URLs

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=8ef75ad&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=8ef75ad&mobile=on&portraitlayout=1  

*(Cache-bust with `8ef75ad` — see `reports/guards/OPTIONS_CLEANUP_PASS_REPORT.md`.)*

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

## Next likely work

- New gameplay or reliability cards **only when explicitly requested** (no broad refactors).  
- Optional: modular `src/` **only after** proven build parity to single-file artifact.

## Blockers

- None known after local harness + GitHub Actions CI pass on `8ef75ad`.