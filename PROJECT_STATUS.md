# Project status — Solidarity Not Charity Can Run

Last updated: structural repo cleanup (reports under `reports/`).

Reports were moved into **`reports/`** to keep the GitHub root readable. Index: **`reports/README.md`**; guard write-ups: **`reports/guards/`**.

## Gameplay baseline

| | |
|--|--|
| **BUILD_ID** (root `index.html`, unchanged by docs task) | `runprog1` |
| **Gameplay commit** | `1437b6f` |
| **Handoff reference baseline** | `multiseed1` / `ec44e53` |

## URLs

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=1437b6f&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=1437b6f&mobile=on&portraitlayout=1  

## Completed cards (order)

1. **AI-safe source / release structure** — `src/` scaffold, policy, constitution proofs  
2. **Portrait layout usability guard** — `layoutguard2` / frozen portrait shell  
3. **Mobile control reliability guard** — `controlrel1`  
4. **q1k3 study report** — reference only, no port  
5. **2D substep movement / collision guard** — `movcoll1`  
6. **Grid LOS / reachability guard** — `reachlos1`  
7. **Procedural multi-seed validation guard** — `multiseed1`  
8. **Full-run progression / save-load E2E guard** — `runprog1`  

## Next likely work

- New gameplay or reliability cards **only when explicitly requested** (no broad refactors).  
- Optional: further docs, CI wiring, or modular `src/` **only after** proven build parity to single-file artifact.

## Blockers

- **None known** from harness and recent ships.

## Rules (do not break casually)

| Rule | Detail |
|------|--------|
| **Layout** | Frozen from **layoutguard2** unless a harness proves a bug or Travis requests a change |
| **Controls** | Frozen from **controlrel1** unless explicitly requested |
| **Hall** | Custom level; do not redesign without harness + request |
| **Runtime** | **Single-file** root `index.html` for Pages |
| **Generator** | Do not change procedural placement logic without multi-seed validation |
| **Harness** | Do not ask Travis to manually confirm harness-proven tasks |

## Quick links

- Reports index: [reports/README.md](reports/README.md)  
- Guard reports: [reports/guards/](reports/guards/)  
- Docs index: [docs/README.md](docs/README.md)  
- Contributing: `CONTRIBUTING.md`  
- Release policy: `SOURCE_RELEASE_POLICY.md`