# AI-safe constitution (summary)

Authoritative rules also appear at the top of **`index.html`** script and in **`src/constitution.js`** (reference only, not loaded at runtime).

## Core rules

1. **Named section edits** — change code inside documented `SECTION` blocks; see `src/sections.md`.
2. **SAVE_VERSION** — bump and migrate when save schema changes.
3. **One-way flow:** INPUT → ACTIONS → SIMULATION → RENDER.
4. **Render must not mutate gameplay state** (no side effects in draw path).
5. **Scene transitions** own setup/teardown.
6. **Config / debug** — feature flags only in CONFIG, DEBUG, `options`, or URL params.
7. **No runtime external dependencies** — no CDN scripts, stylesheets, or fetched gameplay assets.
8. **No `eval()`**.
9. **No inline event handlers** — use `addEventListener` / delegated handlers.
10. **Public API** — `window.CR` for harness and debug; avoid hidden globals.
11. **One Kanban card at a time** — scoped commits and reports.
12. **Harness proof required** before claiming gameplay success.
13. **Release artifact proof** — tests target root `index.html` (what Pages serves).

## Verification artifacts

- `proof-ai-safe-constitution.json`
- `proof-release-artifact.json`
- `proof-playwright-summary.json`

## Policy

See **`SOURCE_RELEASE_POLICY.md`** and **`../reports/guards/AI_SAFE_SOURCE_PIPELINE_REPORT.md`**.