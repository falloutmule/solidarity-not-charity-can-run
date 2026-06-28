# SNC Can Run — project status

**Last updated:** Facade composition / module readability (`facadecompose1`)

## Gameplay baseline

| Field | Value |
|-------|-------|
| **BUILD_ID** | `facadecompose1` |
| **Gameplay commit** | `58ca4c3` |
| **Prior** | `facadev2safe1` / `4c0c4c0` |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=58ca4c3&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=58ca4c3&mobile=on&portraitlayout=1`

## Recent passes

- **facadecompose1** — composed FPV facades (`crDrawComposedFacadeFaceColumn`), D1 identity preserved
- **facadev2safe1** — `garage_service_4x2`, `boarded_shop_3x2` safe import

## Harness

```bash
npm run test:selfcheck
```

Includes `CR.runFacadeCompositionReadabilitySelfCheck()` in `CR.runFullSelfCheck()`.

## Reports

- [FACADE_COMPOSITION_READABILITY_REPORT.md](reports/guards/FACADE_COMPOSITION_READABILITY_REPORT.md)
- [FACADE_PACK_V2_SAFE_MODULE_IMPORT_REPORT.md](reports/guards/FACADE_PACK_V2_SAFE_MODULE_IMPORT_REPORT.md)