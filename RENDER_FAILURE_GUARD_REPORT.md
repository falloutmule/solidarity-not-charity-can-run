# RENDER FAILURE GUARD REPORT

## WHAT WAS DONE

- Backup: `index.before-render-failure-guard.html`
- Prior baseline: **hallharness1** / **e34445c**
- **`BUILD_ID` → renderguard1**
- Added **`CR.runRenderFailureSelfCheck()`** with texture transparency proofs, zbuffer/occlusion source guards, deterministic bench scenes (visible/occluded sprite, can/NPC/exit near wall, Hall start), canvas sanity, halo border sampling
- Helpers: `crRenderFailureBenchScene`, `crRenderFailureDrawFrame`, `crTexTransparencyProof`, `crProjectBillboard`, region pixel stats
- **`runFullSelfCheck()`** now requires **`runRenderFailureSelfCheck().pass`**
- Playwright: **`renderFailureSection()`** + required screenshots + `proof-render-failure-guard.json` + `proof-render-image-hashes.json`
- Insert source: `tests/_render_failure_insert.js`

## WHAT WAS VERIFIED

- `node tests/run_selfcheck_playwright.js` → **exit 0**
- `proof-playwright-summary.json` → **pass: true**, **`renderFailure.pass: true`**
- `proof-render-failure-guard.json` → **pass: true**
- `CR.runRenderFailureSelfCheck().pass` → **true**
- `CR.runFullSelfCheck().pass` → **true**
- `CR.runHallSelfCheck().pass` → **true** (Hall E2E regression)
- Sprite halos: **PASS** (`noSpriteFullRectFog`, visible/can/NPC/exit halo border checks)
- Occlusion: **PASS** (`occludedSpriteHidden`, zbuffer predicate + pixel diff benches)
- zbuffer: **PASS** (`zbufferExists`, `zbufferLengthMatches`, `spriteDepthCheckPresent`)
- Constitution: title, no eval, no inline onclick, no external runtime assets
- Network/console: clean

## WHAT FAILED

- Nothing on final run (hall bench pixel stats fixed: integer region bounds).

## CURRENT EXACT STATE

- Single-file game unchanged for UI/layout/gameplay balance
- Renderer logic unchanged; harness-only bench maps and checks added
- Hall Of Servants E2E harness intact

## REMAINING BLOCKERS

- None for this card.

## NEXT ACTIONABLE STEP

- Kanban next card when Travis picks (not render guard).

## EVIDENCE

- `proof-render-failure-guard.json`
- `proof-render-image-hashes.json`
- `proof-render-visible-sprite.png`
- `proof-render-occluded-sprite.png`
- `proof-render-can-near-wall.png`
- `proof-render-npc-near-wall.png`
- `proof-render-hall-start.png`
- `proof-full-selfcheck.json`
- `proof-playwright-summary.json`
- `proof-hall-e2e.json`

## GITHUB PAGES URL

- https://falloutmule.github.io/solidarity-not-charity-can-run/?v=COMMIT&mobile=on&portraitlayout=1
- Self-check: https://falloutmule.github.io/solidarity-not-charity-can-run/?selfcheck=1&v=COMMIT&mobile=on&portraitlayout=1