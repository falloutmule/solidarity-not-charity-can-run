# Raycast Invariant Selfcheck Report

## Goal

Add **`CR.runRaycasterInvariantSelfCheck()`** to prove the Canvas 2D raycaster still matches the architecture guard: wall pass before sprites, z-buffer shape/fill, per-column sprite clip, halo/occlusion policies, and no gameplay mutation from `drawScene`.

## What was done

- Implemented `runRaycasterInvariantSelfCheck` / `runRaycasterInvariantSelfCheckBody` + `crRaycastInvariantStateSnap` in `src/js/game-22-section-13-main-loop.js` (uses `crWithTemporaryState('raycasterInvariant', …)`).
- Exported on `window.CR` as `runRaycasterInvariantSelfCheck`.
- Playwright: after `waitGameReady`, evaluates the check and writes **`proof-raycaster-invariant.json`**; **`corePass`** requires `raycastInvariant.pass === true`.
- Regenerated **`index.html`** via `npm run build`.
- Updated **`docs/harness-overview.md`** (API mention + proof table row).

**BUILD_ID:** preserved **`feel2`** (no bump; no allowlist edits).

## What was verified

| Step | Result |
|------|--------|
| `npm run build` | PASS — `index.html` rebuilt (~660234 bytes) |
| `npm run build:check` | PASS |
| `npm run test:selfcheck` | PASS — `{"pass":true}` |
| `proof-raycaster-invariant.json` | **`pass: true`**, `build: feel2`, all 20 checks true |
| Node proof gate | PASS (handoff `node -e` snippet) |
| External runtime deps | Unchanged (check inside invariant selfcheck) |
| Save schema | Unchanged |

## What failed

- Nothing.

## Current exact state

- **Branch:** `main`
- **Commit before card:** `e1451fdd4910be07b6f36fa3ab01228c2942ea05`
- **Commit after card:** (set on push)
- **Files changed (intended commit):**
  - `src/js/game-22-section-13-main-loop.js`
  - `tests/run_selfcheck_playwright.js`
  - `docs/harness-overview.md`
  - `index.html` (generated from `src/`)
  - `proof-raycaster-invariant.json`
  - `reports/guards/RAYCAST_INVARIANT_SELFCHECK_REPORT.md`
- **Gameplay / art / controls:** no intentional change — harness + export surface only.
- **Unrelated proof refresh:** `npm run test:selfcheck` may refresh other root `proof-*` files; those are **not** part of this commit unless already tracked and required — stash/restore local churn if present before push.

## Remaining blockers

- None.

## Next actionable step

**`VIEWPORT_AUTHORITY_OBJECT`** — centralize visualViewport, safe area, DPR, CSS/backing sizes (separate card; do not start here).

## Evidence

- `proof-raycaster-invariant.json` — `pass: true`
- `docs/raycast-engine-architecture.md` — prior architecture baseline (`e1451fd`)
- Terminal: `npm run build`, `npm run build:check`, `npm run test:selfcheck` (exit 0)
- Playwright session: full suite including new invariant gate