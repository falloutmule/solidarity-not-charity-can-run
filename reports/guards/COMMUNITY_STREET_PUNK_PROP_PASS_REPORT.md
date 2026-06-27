# Community street punk southwest decorative props — `props1`

## Summary

Integrated procedural Canvas decor props (16 kinds) from the community prop lab reference into root `index.html`. Props are non-collision billboards baked to offscreen canvases via `bakeDecorPropTexture()` / `_decorPropLab.DRAWERS`. No external assets.

## BUILD_ID

| Field | Value |
|-------|--------|
| **New BUILD_ID** | `props1` |
| **Gameplay commit** | `6adc981` |
| **Prior** | `optionsclean1` / `8ef75ad` |
| **Backup** | `index.before-community-prop-pass.html` |

## Prop kinds (`DECOR_PROP_REQUIRED`)

`mailbox`, `old_sedan`, `old_van`, `dumpster`, `shopping_cart`, `utility_pole`, `poster_pole`, `flyer_wall`, `mural_patch`, `dry_bush`, `scrub_tree`, `crate_stack`, `donation_bin`, `folding_chair`, `cooler`, `bus_stop_sign`

## Gameplay wiring

- `genCity` — weighted `PROP_KINDS` mix, modestly higher prop count.
- `genHallOfServants` — hall `game.props` use new kinds.
- `propTex(kind, prop)` — bakes/caches decor textures; legacy `TEX` grass/cart/pole/sign/busstop IIFEs removed.
- `HEIGHT` — per-kind billboard heights for all decor kinds.
- Collision grid unchanged; props remain `game.props[]` only.

## Self-check

- `CR.runDecorativePropsSelfCheck()` — defs, deterministic placement, non-collision `canStand`, bake/render, hall kinds, options cleanup regression, save/load, no external asset tags, `BUILD_ID === 'props1'`.
- Wired into `runFullSelfCheckInner()` aggregate.
- Options-related harness BUILD_ID checks updated to `props1`.

## Playwright

- `decorativePropsSection` in `tests/run_selfcheck_playwright.js`
- Proofs: `proof-decorative-props.json`, `proof-decorative-props-world.png`, `proof-decorative-props-closeup.png`
- Included in `corePass` aggregate.

## Unchanged

`SAVE_VERSION`, `cannedRun.controls.v1`, default control layout, hall logic beyond prop kinds, collision rules, gameplay quotas.

---

## Final closure / proof alignment (`props1`)

| Item | Value |
|------|--------|
| **Verified gameplay commit** | `6adc981` (`feat(gameplay): community street punk southwest decor props (props1)`) |
| **Local harness** | `npm run test:selfcheck` — **PASS** (`proof-playwright-summary.json` `pass: true`) |
| **GitHub Actions** | [Run 28292488544](https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28292488544) — workflow **SNC Can Run Selfcheck**, `headSha` `6adc981`, **success** |
| **CI artifact** | `snc-can-run-proof-artifacts` |
| **Play URL** | https://falloutmule.github.io/solidarity-not-charity-can-run/?v=6adc981&mobile=on&portraitlayout=1 |
| **Self-check URL** | https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=6adc981&mobile=on&portraitlayout=1 |

### Proof paths (local / artifact)

- `proof-decorative-props.json` — **pass** (`buildIdProps1`, `propsNonCollision`, `deterministicPlacement`, `noExternalAssetTags`, …)
- `proof-decorative-props-world.png`
- `proof-decorative-props-closeup.png`
- `proof-full-selfcheck.json` — **pass**, `build`: `props1`

### Closure confirmations

- Props are **non-collision** (harness `propsNonCollision` / `canStand` on prop tiles).
- **No external assets** / no bitmap prop images (`noExternalAssetTags`).
- **Default layout** unchanged (layout + portrait usability gates pass).
- **Controls / OPTIONS / EDIT CONTROLS** unchanged (declarative + options cleanup + resize proofs pass).
- **Hall / map gen / save format** unchanged (`SAVE_VERSION`, `cannedRun.save.v1`, `cannedRun.controls.v1`).

**Status:** Closed — docs and URLs aligned to `6adc981`; no further gameplay work on this card.