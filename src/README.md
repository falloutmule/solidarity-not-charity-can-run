# SNC Can Run source layout

Root `index.html` is the shipped GitHub Pages game. It is generated; do not hand-edit it.

## Canonical inputs

| Path | Role |
|---|---|
| `template.html` | HTML shell with `{{STYLES}}`, `{{BODY}}`, and `{{SCRIPT}}` slots |
| `styles/game.css` | Embedded runtime CSS |
| `html/body.html` | Canvas and mobile overlay markup |
| `js/game-*.js` | Ordered runtime sections |
| `levels/` | Authored level data |
| `imported-handoff-assets/` | Embedded source assets |
| `build-manifest.json` | Explicit input order and output path |
| `../tools/build-single-file.js` | Deterministic combiner and validator |

## Workflow

1. Change only the relevant canonical source.
2. Run `npm run build` to regenerate root `index.html`.
3. Run `npm run build:check` plus the smallest focused test.
4. Run the ordinary browser smoke before a runtime release.
5. Commit canonical source and regenerated `index.html` together.

Set `CR_SELFCHECK_RUN_DIR` to an existing descendant of `test-results/selfcheck-runs/` so generated build proof stays ignored and run-local.

