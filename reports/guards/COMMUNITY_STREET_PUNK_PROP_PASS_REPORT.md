# Community street punk southwest decorative props — `props1`

## Summary

Integrated procedural Canvas decor props (16 kinds) from the community prop lab reference into root `index.html`. Props are non-collision billboards baked to offscreen canvases via `bakeDecorPropTexture()` / `_decorPropLab.DRAWERS`. No external assets.

## BUILD_ID

| Field | Value |
|-------|--------|
| **New BUILD_ID** | `props1` |
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