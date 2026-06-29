# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`facadefinal1`** |
| **Previous gameplay baseline** | `groundplane1` / `9d48802`; split infra `35c74cc` |
| **Infrastructure** | Split-source build pipeline (`src/` → `index.html`) |
| **Gameplay commit** | `c8dc483` — D2/D3 facade readability final polish |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<commit>&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1`

## Build workflow

```bash
npm run build        # combine src/ → index.html
npm run build:check  # verify index.html matches src/
npm run test:selfcheck
```

See **`src/README.md`**, **`reports/guards/SOURCE_SPLIT_BUILD_PIPELINE_REPORT.md`**, **`reports/guards/FPV_GROUND_PLANE_ALIGNMENT_REPORT.md`**, and **`reports/guards/D2_D3_FACADE_READABILITY_FINAL_POLISH_REPORT.md`**.

## Facadefinal CI

- Selfcheck: https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28343655976
- Pages: https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28343655808
