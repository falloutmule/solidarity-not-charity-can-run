# Release / GitHub Pages proof refresh

Confirm Pages serves the same built artifact that passed local `npm run test:selfcheck`.

## Checklist

1. `git rev-parse HEAD` → note `<sha>`
2. Local: `npm run build && npm run build:check && npm run test:selfcheck` → PASS
3. Push `main`; wait for GitHub Pages deploy (Actions or Pages settings)
4. Open: `https://falloutmule.github.io/solidarity-not-charity-can-run/index.html?v=<sha>`
5. Optional selfcheck overlay: `...?selfcheck=1&mobile=on&portraitlayout=1&v=<sha>` — wait ~2s; overlay should report pass or list errors
6. Compare `proof-source-build-manifest.json` BUILD_ID with live page (console: `CR.BUILD_ID`)

## Blockers to record

- CDN/cache: stale `index.html` without `?v=` pin
- Deploy lag: note timestamp and retry
- Selfcheck localhost-only flakes: public URL selfcheck still authoritative for Travis when documented

## Template snippet

```
Pages URL: .../index.html?v=<sha>
Local selfcheck: PASS/FAIL at <sha>
Live BUILD_ID: feel2 (expected)
Selfcheck overlay: PASS/FAIL
Blocker: none | <description>
```