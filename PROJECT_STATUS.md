# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`spriteground1`** (unchanged) |
| **Infrastructure** | Split-source build pipeline (`src/` → `index.html`) |
| **Previous gameplay commit** | `820b67c` |
| **Gameplay commit** | `35c74cc` (infrastructure only) |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<commit>&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1`

## Build workflow

```bash
npm run build        # combine src/ → index.html
npm run build:check  # verify index.html matches src/
npm run test:selfcheck
```

See **`src/README.md`** and **`reports/guards/SOURCE_SPLIT_BUILD_PIPELINE_REPORT.md`**.