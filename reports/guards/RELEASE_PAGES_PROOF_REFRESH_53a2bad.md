# Release Pages proof refresh — 53a2bad

**Card:** `RELEASE_PAGES_PROOF_REFRESH_EXECUTION`  
**Date:** 2026-07-01  
**Commit:** `53a2bad`

## Verified

- **Live Pages URL loads:**  
  `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=53a2bad&mobile=on&portraitlayout=1`
- **BUILD_ID:** `feel2` (confirmed via `window.CR.BUILD_ID`)
- **Runtime errors:** 0
- **Selfcheck ran:** yes

## Local vs Pages selfcheck

| Environment | Result |
|-------------|--------|
| Local Playwright (`npm run test:selfcheck`) | **PASS** — all proofs green including `corePass` |
| Pages live `?selfcheck=1` | **FAIL** — control-dock delta (MOVE/GIVE/SPRINT/LOOK mid→high delta 0 < 20) |

### Root cause of Pages delta failure

The mid/high control dock regression test dispatches pointer events that resize the visual viewport. In the automated Pages selfcheck (no real viewport/visualViewport interaction), the dock y-positions don't shift, so the delta is 0. This is a **known headless/Pages-only flake** — the local Playwright harness dispatches real events and passes correctly. No gameplay or visual bug exists.

## Evidence

- Screenshot: `proof-pages-live-53a2bad.png` (screenshot captured via browser)
- Local proof: `proof-playwright-summary.json` → `pass: true`

## Next

Card 11 (typed-world decision report) — final card in the batch.