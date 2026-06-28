# Source split / single-file build pipeline report

**BUILD_ID:** `spriteground1` (unchanged — rebuilt `index.html` matches pre-split bytes)  
**Gameplay commit:** *(after push)*  
**Previous baseline:** `spriteground1` / `820b67c`  
**Backup:** `index.before-source-split-build-pipeline.html` (local)

## What was added

- **`src/`** — `template.html`, `styles/game.css`, `html/body.html`, **23** ordered `src/js/game-*.js` slices on SECTION boundaries
- **`src/build-manifest.json`** — explicit combine order
- **`tools/build-single-file.js`** — plain Node combiner, SHA-256 proof manifest
- **`src/README.md`** — editor workflow
- **npm:** `build`, `build:check`, `build:min`; **`pretest:selfcheck`** runs `build:check`

## What did not change

- Gameplay, visuals, controls, maps, save format, facade pack, sprite grounding
- **`BUILD_ID`** remains **`spriteground1`**
- Root **`index.html`** still the only runtime artifact for GitHub Pages
- Labs **`snc-building-module-lab*.html`** unchanged

## Verification

```bash
npm run build:check   # index.html must match src/ rebuild (562321 bytes)
npm run test:selfcheck
```

Proof: **`proof-source-build-manifest.json`**

## CI / play URLs

*(Filled after push.)*