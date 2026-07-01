# Raycast Engine Architecture Report

## Goal

Document and lock down the SNC Can Run raycasting engine architecture **without changing gameplay runtime**.

## What was done

- Created **`docs/raycast-engine-architecture.md`** — purpose, stack (320×200, z-buffer), one-way flow, source ownership map (full `build-manifest.json` slices), raycaster invariants, protected render order, future cards, failure modes, test protocol.
- Updated **`docs/README.md`** — one index link to the architecture doc.
- Created this guard report.

No edits to `index.html`, `src/js/*`, CSS, body HTML, build manifest, build tool, or Playwright harness.

## What was verified

| Check | Result |
|-------|--------|
| **Branch** | `main` |
| **Commit (before commit of this card)** | `4d129753204ea951159b5b733aa7d19c6ce37f86` |
| **`git status --short` before doc edits** | No tracked modifications; untracked local tests/proofs only |
| **`git status --short` after doc edits (docs only)** | `M docs/README.md`, `?? docs/raycast-engine-architecture.md` |
| **`npm run build:check`** | **PASS** — `{"pass":true,"check":"pass","output":"index.html","bytes":653832}` |
| **`npm run test:selfcheck`** | **PASS** — `{"pass":true,"proofs":"proof-*.json in repo root"}` (exit 0) |
| **Runtime paths diff vs HEAD** | **No diff** on `index.html`, `src/js/*`, `src/styles/game.css`, `src/html/body.html`, `src/build-manifest.json`, `tools/build-single-file.js`, `tests/run_selfcheck_playwright.js` |

**Note:** `npm run test:selfcheck` refreshed many root `proof-*` files in the **working tree** (screenshots/JSON). Those artifacts were **not** part of this card and are **not** included in the doc-only commit.

## What failed

- Nothing.

## Current exact state

- **Branch:** `main`
- **Commit:** (set after push — doc-only commit on top of `4d12975`)
- **Changed files (this card):** `docs/raycast-engine-architecture.md`, `docs/README.md`, `reports/guards/RAYCAST_ENGINE_ARCHITECTURE_REPORT.md`
- **Runtime changed:** **no**
- **Docs changed:** **yes**
- **Tests passed:** **yes** (`build:check`, `test:selfcheck`)

**Baseline reference:** `PROJECT_STATUS.md` lists gameplay baseline `facadetexture1` / commit `c511936` on GitHub; local clone at verification was at `4d12975` (ahead/parallel to that card line — architecture doc describes engine shape, not a gameplay bump).

## Remaining blockers

- None for this card.

## Next actionable step

Implement **`RAYCAST_INVARIANT_SELFCHECK`** — add `CR.runRaycasterInvariantSelfCheck()` for zbuffer, sprite occlusion, halo guard, deterministic render scene setup; JSON proof + harness screenshot.

## Evidence paths/files/logs/screenshots

- `docs/raycast-engine-architecture.md`
- `reports/guards/RAYCAST_ENGINE_ARCHITECTURE_REPORT.md`
- Terminal: `npm run build:check`, `npm run test:selfcheck` (background session `proc_ecae8c7e79e8`, exit 0)
- No new harness screenshots committed for this doc-only card