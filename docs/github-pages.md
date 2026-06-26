# GitHub Pages

## What gets deployed

- **Repository:** `falloutmule/solidarity-not-charity-can-run`
- **Artifact:** root **`index.html`** (single-file game)
- **No** separate `dist/` gate today — Pages serves the file in the repo root.

## Play URL format

```
https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<commit>&mobile=on&portraitlayout=1
```

- **`v`** — cache-bust to a **git short SHA** you shipped (e.g. `1437b6f`).
- **`mobile=on`** — mobile control shell.
- **`portraitlayout=1`** — portrait dashboard layout (frozen baseline).

## Self-check URL

```
https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<commit>&mobile=on&portraitlayout=1
```

Runs **`CR.runFullSelfCheck()`** in the browser and shows overlay result.

## Useful query params

| Param | Effect |
|-------|--------|
| `resetcontrols=1` | Restore safe control dock offsets (MID) |
| `selfcheck=1` | Run full self-check on load |
| `benchmark=1` | Benchmark scenes (dev; isolated) |

## Deployment claims

- **Do not claim** a ship is live on Pages from **localhost only** — push to `main` and use the `?v=<commit>` URL after GitHub Pages updates.
- Saves use **origin** `localStorage`; file:// and Pages are different origins.