# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`groundplane1`** |
| **Previous gameplay baseline** | `spriteground1` / `820b67c`; split infra `35c74cc` |
| **Infrastructure** | Split-source build pipeline (`src/` → `index.html`) |
| **Gameplay commit** | Pending push for FPV ground-plane alignment |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<commit>&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1`

## Build workflow

```bash
npm run build        # combine src/ → index.html
npm run build:check  # verify index.html matches src/
npm run test:selfcheck
```

See **`src/README.md`**, **`reports/guards/SOURCE_SPLIT_BUILD_PIPELINE_REPORT.md`**, and **`reports/guards/FPV_GROUND_PLANE_ALIGNMENT_REPORT.md`**.