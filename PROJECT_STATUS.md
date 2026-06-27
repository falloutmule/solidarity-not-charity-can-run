# Project status — Solidarity Not Charity Can Run

Last updated: street readability / minimap (`streetread1`).

**CI:** `.github/workflows/selfcheck.yml` runs `npm run test:selfcheck` on push/PR to `main`.

## Current gameplay baseline

| Field | Value |
|-------|-------|
| **BUILD_ID** | `streetread1` |
| **Commit** | `3cd3b7f` |
| **Prior** | `buildscale1` / `0092fab` |

**Play (cache-bust):**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?v=3cd3b7f&mobile=on&portraitlayout=1

**Self-check:**  
https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=3cd3b7f&mobile=on&portraitlayout=1

## Recent shipped cards

1. **streetread1** — navigation-first minimap + FPV street cues; building mass from buildscale1 preserved. Report: `reports/guards/STREET_READABILITY_MINIMAP_REPORT.md`
2. **buildscale1** — building / FPV mass polish. Report: `reports/guards/BUILDING_SCALE_POLISH_REPORT.md`
3. **levelselect1** — START DISTRICT D1–D4. Report: `reports/guards/LEVEL_SELECTOR_PASS_REPORT.md`

## Local verification

```bash
npm run test:selfcheck
```

## Backup (local, not in git)

- `index.before-street-readability-minimap.html` — pre-`streetread1`
- `index.before-building-scale-polish.html` — pre-`buildscale1`