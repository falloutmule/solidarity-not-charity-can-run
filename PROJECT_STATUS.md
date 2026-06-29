# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`buildingsmooth1`** |
| **Previous gameplay baseline** | `facadefinal1` / `0761c94`; `groundplane1` / `9d48802`; split infra `35c74cc` |
| **Infrastructure** | Split-source build pipeline (`src/` → `index.html`) |
| **Gameplay commit** | pending — building visual reset / smooth wall style |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<commit>&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1`

## Build workflow

```bash
npm run build        # combine src/ → index.html
npm run build:check  # verify index.html matches src/
npm run test:selfcheck
```

See **`src/README.md`**, **`reports/guards/SOURCE_SPLIT_BUILD_PIPELINE_REPORT.md`**, **`reports/guards/FPV_GROUND_PLANE_ALIGNMENT_REPORT.md`**, **`reports/guards/D2_D3_FACADE_READABILITY_FINAL_POLISH_REPORT.md`**, and **`reports/guards/BUILDING_VISUAL_RESET_SMOOTH_WALL_STYLE_REPORT.md`**.

## Buildingsmooth CI

- Selfcheck: pending
- Pages: pending
