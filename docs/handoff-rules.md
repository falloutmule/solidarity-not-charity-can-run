# Handoff rules — Travis / Hermes

## Scope

- Do **exactly** the requested task.
- Do **not** broaden scope (no extra refactors, no unrelated repos).
- Do **not** substitute planning for execution.

## Verification

- If a **file** can be read, read it.
- If a **function** can be tested, test it (harness / Playwright).
- If **UI** is involved, use screenshots or rendered proof when the task requires it.
- **Verify before claiming success.**

## Report format (required for cards)

1. **WHAT WAS DONE**  
2. **WHAT WAS VERIFIED**  
3. **WHAT FAILED**  
4. **CURRENT EXACT STATE**  
5. **REMAINING BLOCKERS**  
6. **NEXT ACTIONABLE STEP**  
7. **EVIDENCE** (proof JSON, commit, screenshots)  
8. **GITHUB PAGES URL** (`?v=<commit>`)

## Gameplay edits

- Read **`PROJECT_STATUS.md`** first.
- Backup **`index.html`** before code changes.
- Run **`node tests/run_selfcheck_playwright.js`** before push.
- Layout and controls **frozen** unless explicitly requested.

## Privacy

- No unrelated GitHub inventory.
- No private repo names or credentials in commits or docs.