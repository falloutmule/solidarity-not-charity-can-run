# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`facadeart1`** |
| **Previous baseline** | `facadecompose1` / `58ca4c3` |
| **Gameplay commit** | `56f4acb` |
| **Backup** | `index.before-facade-art-vocabulary.html` |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=56f4acb&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=56f4acb&mobile=on&portraitlayout=1`

## Latest guard

- [FACADE_ART_VOCABULARY_HUMAN_SCALE_REPORT.md](reports/guards/FACADE_ART_VOCABULARY_HUMAN_SCALE_REPORT.md)

## Harness

```bash
npm run test:selfcheck
```

Must pass full aggregate including `facadeArtVocabulary`.