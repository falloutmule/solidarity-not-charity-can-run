# Contributing — Hermes / AI agents

Short rules for **Solidarity Not Charity Can Run** only.

## Before you edit

1. Read **`PROJECT_STATUS.md`**.  
2. Confirm scope: **one card / one task** — do not broaden.  
3. **Docs-only tasks:** do **not** modify `index.html` or `tests/run_selfcheck_playwright.js` unless the task explicitly requires it.

## Gameplay / harness changes

1. Copy backup: `index.before-<topic>.html` in repo root.  
2. Bump **`BUILD_ID`** when shipping a guard card.  
3. Preserve **single-file** runtime (no external JS/CSS at runtime).  
4. Run **`node tests/run_selfcheck_playwright.js`** before push.  
5. Add or update a card report under **`reports/guards/`** and list it in **`reports/README.md`**.  
6. Commit with a **clear, scoped message** (gameplay vs docs).

## Reports

Use sections: WHAT WAS DONE, WHAT WAS VERIFIED, WHAT FAILED, CURRENT EXACT STATE, REMAINING BLOCKERS, NEXT ACTIONABLE STEP, EVIDENCE, GITHUB PAGES URL.

## Do not

- Inspect or document **unrelated** GitHub repos.  
- Publish **private** repo names, tokens, `.env`, OAuth paths, or credentials.  
- Change layout, controls, Hall, map generation, or renderer without explicit request + harness.  
- Substitute **planning** for **execution** or claim success without proof.

## Human (Travis)

Harness-green tasks should not require manual verification unless there is a concrete blocker (device-only issue, Pages deploy lag, etc.).