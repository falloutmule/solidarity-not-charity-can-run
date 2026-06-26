# Project status — Solidarity Not Charity Can Run

Last updated: visual readability polish (`visual1`).

Reports were moved into **`reports/`** to keep the GitHub root readable. Index: **`reports/README.md`**; guard write-ups: **`reports/guards/`**.

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Gameplay baseline

| | |
|--|--|
| **BUILD_ID** (root `index.html`) | `visual1` |
| **Prior gameplay baseline** | `onboard1` / `aaaf901` |
| **Handoff reference baseline** | `runprog1` / `1437b6f` |

## URLs

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=4c85289&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=4c85289&mobile=on&portraitlayout=1  

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

## Next likely work

- New gameplay or reliability cards **only when explicitly requested** (no broad refactors).  
- Optional: modular `src/` **only after** proven build parity to single-file artifact.

## Blockers

- None known after local harness and GitHub Actions CI pass.