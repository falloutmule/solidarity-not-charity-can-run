# src/ — development scaffold (non-runtime)

This directory is **documentation and future modular source**. It does **not** power the game today.

## Current canonical runtime

- **`../index.html`** — single-file shipped artifact; edit here until a build pipeline is proven.

## Files

| File | Purpose |
|------|---------|
| `README.md` | This note |
| `constitution.js` | Mirror of AI edit rules (reference only; not bundled) |
| `sections.md` | Target module map ↔ SECTION markers in `index.html` |

## Extraction policy

1. Do **not** move live logic into `src/` until `scripts/build-singlefile.js` (or equivalent) exists.
2. Backup `index.html` before any extraction.
3. Build output must pass **`node tests/run_selfcheck_playwright.js`** against the **release path**.
4. Only then may `src/` become canonical.

## Status

**Extraction deferred** — scaffold only (AI-safe source pipeline card).