# Facade art vocabulary / human scale report

**BUILD_ID:** `facadeart1`  
**Previous gameplay baseline:** `facadecompose1` / `58ca4c3`  
**Backup:** `index.before-facade-art-vocabulary.html`

## What caused the flat / wallpaper look

`facadecompose1` fixed face-wide composition, but each slot still filled **entire vertical bands** (sign / glass / base / garage / boarded) per column. That read as **flat color wallpaper** on phone: tall dark glass slabs, full-wall red boarded stripes, and unframed garage rectangles.

## What changed

- **`CR_FACADE_ART_VOCABULARY`** flag; pack **`version: 'facadeart1'`**
- Helpers **`crFacadeArtVocabularyZones`**, **`crFacadeArtPanelInset`**, **`crFacadeArtColumnInX`**
- **`crDrawComposedFacadeFaceColumn`** redraws slots as **inset objects** with margins:
  - **Storefront:** narrow sign band + border, inset windows with highlight, door-shaped panel (upper lite + handle), kickplate/threshold
  - **Boarded:** planks **only inside window boxes** (tan/brown), muted sign strip — not full-wall red
  - **Garage:** framed roll-up bay (lines inside bay), smaller service door, calm concrete upper wall
  - **Side:** quiet brick, small vent / narrow side door / small mural frame
  - **Pavilion:** civic doors + small bulletin — not strip-mall glass slabs

**Composition system preserved:** same `CR_FACADE_PACK`, `crGetFacadeFaceContext`, column raycast path, six modules, no new imports.

## Preserved

- Six gameplay modules only; two-story / walk-in / corner-shop remain lab-only
- D1 park/plaza/pavilion identity
- Matte road (`CR_FPV_STREET_MATTE`)
- Navigation-first minimap
- `CR_BUILDING_FPV_MASS` 1.5
- Level selector D1–D4; reachability; props non-collision
- No moving blockers / NPCs / can timers
- `SAVE_VERSION` 1; `cannedRun.controls.v1`; Hall / save format unchanged
- Facade pack copy markers `BEGIN/END SNC FACADE PACK v1`

## Harness

- Local: `npm run test:selfcheck` — **pass**
- `CR.runFacadeArtVocabularySelfCheck()` in `CR.runFullSelfCheck()`

## CI / play URLs

*(Filled after push.)*

## Proof artifacts

- `proof-facade-art-vocabulary.json`
- `proof-facadeart-role-debug.json`
- `proof-facadeart-d1-identity.png`
- `proof-facadeart-d2-storefront-human-scale.png`
- `proof-facadeart-d2-boarded-shop-human-scale.png`
- `proof-facadeart-d3-garage-service-human-scale.png`
- `proof-facadeart-d3-side-back-quiet.png`
- `proof-facadeart-minimap-preserved.png`
- `proof-full-selfcheck.json`