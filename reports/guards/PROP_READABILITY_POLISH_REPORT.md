# Prop readability polish — `propsread1`

Visual-only pass on decorative non-collision props. Prior baseline: `props1` / `6adc981`.

## Summary

| Field | Value |
|-------|--------|
| **BUILD_ID** | `propsread1` |
| **Gameplay commit** | *(after push — see CI)* |
| **Prior BUILD_ID** | `props1` / `6adc981` |
| **Backup** | `index.before-prop-readability-polish.html` |

## What changed

- Tightened roster to **12 nameable kinds** (street/civic, mutual-aid, southwest, handmade families).
- Replaced ambiguous blob/slab props (e.g. random-circle `dry_bush`, large `flyer_wall` / `scrub_tree` masses, sedans/vans/dumpster clutter) with readable silhouettes: bench, sleeping bag pile, tarp bundle, scrub bush, agave, utility box, signboard, mural panel; kept polished mailbox, shopping cart, crate stack, cooler.
- Reduced bake scale (1.65×) and per-kind texture sizes; lowered billboard heights so props read smaller in FPV.
- Edge-biased `takePropCandidate` placement and fewer props per district (8–12 vs 12–19).
- Hall of Servants props updated to the same kind vocabulary.
- Harness: `BUILD_ID === 'propsread1'`, 12-kind export, lightweight `propDimsReasonable` + non-blank texture sampling.

## What stayed unchanged

- Portrait layout shell, controls / EDIT CONTROLS, OPTIONS structure.
- Movement, collision, Hall progression, procedural reachability, save format (`SAVE_VERSION`).
- Renderer architecture; no external assets; props remain non-collision.

## Harness

- Local: `npm run test:selfcheck` — **PASS**
- In-page: `CR.runDecorativePropsSelfCheck()`
- Proofs: `proof-decorative-props.json`, `proof-full-selfcheck.json`, `proof-decorative-props-world.png`, `proof-decorative-props-closeup.png`

## URLs (update `?v=` after gameplay commit)

- **Play:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?v=<sha>&mobile=on&portraitlayout=1`
- **Self-check:** `https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=<sha>&mobile=on&portraitlayout=1`

## 12-kind roster

`mailbox`, `shopping_cart`, `bench`, `sleeping_bag_pile`, `crate_stack`, `cooler`, `tarp_bundle`, `scrub_bush`, `agave`, `utility_box`, `signboard`, `mural_panel`