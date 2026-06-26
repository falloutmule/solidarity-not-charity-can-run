# Solidarity Not Charity Can Run

**Solidarity Not Charity Can Run** (short: **SNC Can Run**) is a **single-file HTML** first-person can-collection and community-helping game, built for **GitHub Pages**. All gameplay, styles, and scripts live in one root **`index.html`** — no build step required to play or ship.

## Play

- **GitHub Pages (recommended):**  
  https://falloutmule.github.io/solidarity-not-charity-can-run/?v=1437b6f&mobile=on&portraitlayout=1
- **Self-check harness (automated QA):**  
  https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=1437b6f&mobile=on&portraitlayout=1
- **Local:** open `index.html` in a browser (saves may differ from Pages origin).

Cache-bust with `?v=<git-commit>` when verifying a specific ship. Mobile portrait layout: add `mobile=on&portraitlayout=1`. Reset control offsets: `resetcontrols=1`.

## Current ship reference

| Field | Value |
|-------|--------|
| **BUILD_ID** (in `index.html`) | `runprog1` |
| **Gameplay commit** | `1437b6f` |
| **Prior baseline** (handoff reference) | `multiseed1` / `ec44e53` |

See **`PROJECT_STATUS.md`** for completed guard cards and rules.

## Final artifact rule

- **Root `index.html` is the shipped game.** GitHub Pages serves this file.
- **No runtime external** JS, CSS, fonts, or assets.
- **`src/`** is a non-runtime scaffold only (see `SOURCE_RELEASE_POLICY.md`).

## Run locally

```bash
# From repo root — any static server or file://
# Self-check in browser:
#   index.html?selfcheck=1&mobile=on&portraitlayout=1
```

## Run Playwright harness

Requires Node.js and Playwright (see `tests/run_selfcheck_playwright.js`).

```bash
cd /path/to/solidarity-not-charity-can-run
node tests/run_selfcheck_playwright.js
```

Exit `0` and `proof-playwright-summary.json` with `"pass": true` means the full guard suite passed against **root `index.html`**.

## Completed guard cards (high level)

1. AI-safe source / release policy  
2. Portrait layout usability  
3. Mobile control reliability  
4. 2D substep movement / collision  
5. Grid LOS / reachability  
6. Procedural multi-seed level validation  
7. Full-run progression / save-load E2E  

Details and reports: **`reports/README.md`**.

## Project docs

- **`PROJECT_STATUS.md`** — current baseline, cards, blockers, rules  
- **`docs/README.md`** — harness, Pages, mobile layout, handoff rules  
- **`CONTRIBUTING.md`** — Hermes / agent workflow  
- **`SOURCE_RELEASE_POLICY.md`** — single-file release policy  

## For Hermes

1. Read **`PROJECT_STATUS.md`** first.  
2. **Do not change `index.html`** for docs-only tasks.  
3. **Do not broaden** the requested task scope.  
4. **Backup** before game-code edits: `index.before-<topic>.html`.  
5. **Verify** the release artifact (`node tests/run_selfcheck_playwright.js`) before claiming gameplay success.  
6. Write or update a card report in repo root; index in **`reports/README.md`**.

## Repo

https://github.com/falloutmule/solidarity-not-charity-can-run