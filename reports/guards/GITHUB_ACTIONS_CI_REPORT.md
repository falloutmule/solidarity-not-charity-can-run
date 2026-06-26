# GitHub Actions CI — SNC Can Run Selfcheck

## WHAT WAS DONE

- Added **`.github/workflows/selfcheck.yml`** — workflow **SNC Can Run Selfcheck**
- Added **`package.json`** with `test:selfcheck` script and **`playwright`** devDependency
- Generated **`package-lock.json`** via `npm install` (for `npm ci` in CI)
- Updated **`reports/README.md`** and **`PROJECT_STATUS.md`**
- **No** changes to **`index.html`**, gameplay, or **`tests/run_selfcheck_playwright.js`**

## WHAT WAS VERIFIED

- **`index.html`** — unchanged (no diff)
- **`tests/run_selfcheck_playwright.js`** — unchanged; uses `path.resolve(__dirname, '..')` and root **`index.html`** by default
- Local:
  - `npm ci` (after lockfile present)
  - `npx playwright install chromium`
  - `npm run test:selfcheck` → exit **0**, `{"pass":true,...}`
  - **`proof-playwright-summary.json`** → **`"pass": true`**, **`releaseArtifactPath": "index.html"`**
- No secrets added; **`node_modules/`** not committed (`.gitignore`)

## WHAT FAILED

- (Fill after first GitHub Actions run if any failure.)

## CURRENT EXACT STATE

| Item | Value |
|------|--------|
| **BUILD_ID** | `runprog1` |
| **Gameplay commit** | `1437b6f` |
| **CI commit** | (see git after push) |
| **Workflow** | `.github/workflows/selfcheck.yml` |
| **Artifact upload** | `snc-can-run-proof-artifacts` |

## REMAINING BLOCKERS

- None unless first Actions run fails (see below).

## NEXT ACTIONABLE STEP

- Watch first **push** workflow on `main`; download artifact **`snc-can-run-proof-artifacts`** if needed.

## EVIDENCE

- Local harness stdout: `{"pass":true,"proofs":"proof-*.json in repo root"}`
- Workflow runs **`npm run test:selfcheck`** → **`node tests/run_selfcheck_playwright.js`**
- Proof upload paths: `proof-*.json`, `proof-*.png`, `reports/proofs/current/**`

## GITHUB PAGES URL

- **Play:** https://falloutmule.github.io/solidarity-not-charity-can-run/?v=1437b6f&mobile=on&portraitlayout=1  
- **Self-check:** https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=1437b6f&mobile=on&portraitlayout=1  

## GitHub Actions

- **Workflow file:** `.github/workflows/selfcheck.yml`
- **Triggers:** `push` / `pull_request` to **`main`**, **`workflow_dispatch`**
- **Run URL:** (updated after push — `https://github.com/falloutmule/solidarity-not-charity-can-run/actions`)

## Package files

| File | Role |
|------|------|
| `package.json` | `test:selfcheck` script, `playwright` devDependency |
| `package-lock.json` | Lock for `npm ci` |