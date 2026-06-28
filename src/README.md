# SNC Can Run — split source layout

Root **`index.html`** is the **shipped** single-file game (GitHub Pages). Do not hand-edit it for gameplay changes — edit **`src/`** and rebuild.

## Layout

| Path | Role |
|------|------|
| `src/template.html` | HTML shell (`{{STYLES}}`, `{{BODY}}`, `{{SCRIPT}}`) |
| `src/styles/game.css` | All in-page CSS |
| `src/html/body.html` | Canvas + mobile overlay markup |
| `src/js/game-*.js` | Ordered script slices (SECTION boundaries) |
| `src/build-manifest.json` | Explicit combine order + output paths |
| `tools/build-single-file.js` | Node combiner (no bundler) |

## Commands

```bash
npm run build        # combine src/ → index.html (+ proof-source-build-manifest.json)
npm run build:check  # fail if index.html is out of sync with src/
npm run build:min    # also writes dist/index.min.html (whitespace-only trim)
npm run test:selfcheck
```

`pretest:selfcheck` runs **`build:check`** automatically.

## Workflow for Hermes / editors

1. Change only the relevant `src/js/game-*.js` (or CSS/HTML) file.
2. Run `npm run build`.
3. Run `npm run test:selfcheck`.
4. Commit **`src/`**, **`tools/`**, and regenerated **`index.html`** together.

## Proof

After build or check, see **`proof-source-build-manifest.json`** (input paths + SHA-256, output hash).

## Standalone labs

`snc-building-module-lab.html` and `snc-building-module-lab-v2.html` stay standalone — not part of this manifest.