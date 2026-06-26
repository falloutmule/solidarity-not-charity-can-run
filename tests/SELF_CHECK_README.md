# SNC Can Run — CR + Playwright self-check harness

Single-file game: `../index.html`. Harness lives in `tests/` (not shipped).

## CR checks (in browser console or Playwright `page.evaluate`)

```js
CR.runLayoutSelfCheck()
CR.runInputSelfCheck()
CR.runLevelSelfCheck()
CR.runRenderSelfCheck()
CR.runFullSelfCheck()
```

## Playwright full harness

From repo root (requires `playwright` + Chromium — already installed via `npm install playwright` in this repo):

```bash
node tests/run_selfcheck_playwright.js
```

- Starts local HTTP server on `127.0.0.1:4173`
- Blocks external network (fail if any non-local request)
- Writes `proof-*.json` and `proof-*.png` in repo root
- Exit code `0` = PASS, `1` = FAIL

## URL flags

- `?mobile=on&portraitlayout=1` — mobile portrait layout for tests
- `?selfcheck=1` — after boot, runs `CR.runFullSelfCheck()` once and shows overlay

## Baseline

Build `selfharness1` (after `menufix1` / `040aea6`).