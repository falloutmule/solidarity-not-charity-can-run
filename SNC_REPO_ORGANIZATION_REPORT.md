# SNC Repo Organization Report

## WHAT WAS DONE

### Pass 1 — Documentation index (prior commits `6859bb5`, `d832357`)

- Rewrote **`README.md`**, created **`PROJECT_STATUS.md`**, **`CONTRIBUTING.md`**, **`docs/`**, **`reports/README.md`** (index only).

### Pass 2 — Structural root cleanup (this pass)

**Folders created**

- `reports/guards/`, `reports/reference/`, `reports/history/`, `reports/proofs/current/`, `reports/backups/` (+ README in each)

**Tracked files moved (`git mv`)**

- **12 guard reports** → `reports/guards/` (AI-safe, portrait, mobile controls, movement, reachability, procedural, full-run, Playwright harness, harness isolation, Hall E2E, render failure, viewport)
- **Q1K3** → `reports/reference/Q1K3_LEARNING_REPORT.md`
- **5 history reports** → `reports/history/` (GitHub Pages deploy, occlusion, pages mobile layout, realphone look, SELF_CHECK_RUNS)
- **17 tracked** `index.before-*.html` → `reports/backups/`
- **38 tracked** `proof-*` → `reports/proofs/current/`

**Local-only moves (untracked, not on GitHub before)**

- Remaining root `*_REPORT.md` → `reports/history/`
- Remaining root `index.before-*.html` and `proof-*` → `reports/backups/` / `reports/proofs/current/`
- `HANDOFF-control-height.md` → `reports/history/`

**Files edited**

- `reports/README.md` (main hub)
- `PROJECT_STATUS.md`, `docs/README.md`, `docs/harness-overview.md`, `docs/q1k3-lessons.md`, `docs/ai-safe-constitution.md`, `docs/mobile-layout-and-controls.md`
- `CONTRIBUTING.md`, `.gitignore`
- This report

**Root after cleanup (tracked on GitHub)**

- `index.html`, `README.md`, `PROJECT_STATUS.md`, `SOURCE_RELEASE_POLICY.md`, `CONTRIBUTING.md`, `SNC_REPO_ORGANIZATION_REPORT.md`
- `docs/`, `reports/`, `tests/`, `src/`, `.gitignore`

## WHAT WAS VERIFIED

- Only **`falloutmule/solidarity-not-charity-can-run`** touched.
- **`index.html`** — no diff (gameplay unchanged).
- **`tests/run_selfcheck_playwright.js`** — no diff.
- **No** unrelated GitHub inventory; **no** private repo names, tokens, or credential paths added.
- **Harness skipped** — docs/file moves only; `index.html` and tests unchanged.
- Markdown links updated for guard/reference report paths under `reports/`.

## WHAT FAILED

- Nothing.

## CURRENT EXACT STATE

| Item | Value |
|------|--------|
| **BUILD_ID** | `runprog1` |
| **Gameplay commit** | `1437b6f` |
| **Structural cleanup commit** | (see git after push) |
| **Pass 1 docs commit** | `6859bb5` |

## REMAINING BLOCKERS

- None.

## NEXT ACTIONABLE STEP

- None unless Travis requests a new guard card or CI for Playwright.
- Full-run progression E2E already shipped (`runprog1`).

## EVIDENCE

- `git diff --stat` — moves under `reports/`, doc edits, `.gitignore`; no `index.html` / tests change.
- `git ls-files` at repo root — core files only (see above).
- Inventory (pre-move root): 40+ `*_REPORT.md`, 50+ `proof-*`, 50+ `index.before-*` (mix of tracked/untracked).

## GITHUB PAGES URL

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=1437b6f&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=1437b6f&mobile=on&portraitlayout=1  

**Harness:** skipped (file organization only; gameplay artifact unchanged).