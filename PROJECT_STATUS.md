# Project status — SNC Can Run

| Field | Value |
|-------|-------|
| **Gameplay baseline** | `BUILD_ID` **`spriteground1`** |
| **Previous baseline** | `facadeart1` / `56f4acb` |
| **Gameplay commit** | *(after push)* |
| **Backup** | `index.before-sprite-ground-anchor.html` |

## Play / self-check

- Play: `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<commit>&mobile=on&portraitlayout=1`
- Self-check: `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1`

## Latest guard

- [SPRITE_GROUND_ANCHOR_HUMAN_SCALE_REPORT.md](reports/guards/SPRITE_GROUND_ANCHOR_HUMAN_SCALE_REPORT.md)

## Harness

```bash
npm run test:selfcheck
```

Must pass full aggregate including `spriteGroundAnchor`.