# Facade composition / module readability report

**BUILD_ID:** `facadecompose1`  
**Previous gameplay baseline:** `facadev2safe1` / `4c0c4c0`  
**Gameplay commit:** `58ca4c3`  
**Backup:** `index.before-facade-composition-readability.html`

## What caused the conflicted look

- Module FPV used **`crDrawFpvFacadePackColumn`** only on **leading panel edges** (`crFpvFacadePanelLeadingEdge`), so most raycast columns on module faces drew **nothing** while neighbors drew **full vertical slot stacks** in narrow slabs → barcode / comb / pasted-panel look.
- Per-column slot painting repeated **sign + glass + door + base** on every role panel boundary instead of **one composed face layout** per module wall.

## What changed

- **`crDrawComposedFacadeFaceColumn`** — resolves **module face context** (`faceU` along whole module width), draws **material every column**, applies **horizontal zone composition** by module kind:
  - **storefront / pavilion:** continuous sign band, per-panel glass/door/sign in mid band, continuous dark base
  - **boarded shop:** faded upper band, horizontal plank boards **inside window panels only**, door panel, base
  - **garage/service:** concrete upper, **merged garage bay** across adjacent `garage_bay` panels with frame, distinct service door panel, base
  - **side/back:** quiet stucco/brick, single side door / utility / mural — no soft_brick stripe fields on FPV
- **`CR_FACADE_COMPOSE_READABILITY`** flag; **`BUILD_ID` / pack `version`** → `facadecompose1`
- **`CR.runFacadeCompositionReadabilitySelfCheck()`** + Playwright proofs
- Removed rare **garage on D2** placement (D3 remains garage proof)
- Harness: building-module + bridge selfchecks accept **composed** renderer (not legacy overlay / leading-edge-only column)

## Preserved

- Same six gameplay modules; no two-story / walk-in / corner-shop import
- `CR_FACADE_PACK` markers and copy workflow; `crDebugDescribeFacadeHit`
- D1 park/plaza/pavilion identity (no storefront/garage canyon on D1)
- Matte road, minimap, building mass, D1–D4 layouts, level selector, controls/save/Hall, `SAVE_VERSION`, props non-collision

## Local harness

`npm run test:selfcheck` — **PASS**

## CI / play URLs

- CI: https://github.com/falloutmule/solidarity-not-charity-can-run/actions/runs/28330244678 — **success**
- Artifact: `snc-can-run-proof-artifacts`
- Play: https://falloutmule.github.io/solidarity-not-charity-can-run/?v=58ca4c3&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=58ca4c3&mobile=on&portraitlayout=1

## Proof artifacts

- `proof-facade-composition-readability.json`
- `proof-facadecompose-d1-identity.png`
- `proof-facadecompose-d2-storefront.png`
- `proof-facadecompose-d2-boarded-shop.png`
- `proof-facadecompose-d3-garage-service.png`
- `proof-facadecompose-d3-side-back.png`
- `proof-facadecompose-role-debug.json`
- `proof-facadecompose-minimap-preserved.png`
- `proof-full-selfcheck.json`