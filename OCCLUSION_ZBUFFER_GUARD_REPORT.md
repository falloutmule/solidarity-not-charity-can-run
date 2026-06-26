# CARD 3 — Occlusion / zbuffer regression guard (P1)

## WHAT WAS DONE
- Backup: `index.before-occlusion-zbuf-guard.html`
- Confirmed existing raycaster path: wall DDA writes `zbuffer[col]=d` per column; sprites (props, pickups, npcs, exit) draw only via per-column `depth >= zbuffer[col]` skip.
- Added `OCCLUSION REGRESSION GUARD` comment block at zbuffer declaration.
- Strengthened inline comments on wall pass and sprite column guard.
- Added `getOcclusionZbufferProof()` on `window.CR` (predicate unit samples + zbuffer width checks).
- `BUILD_ID` → `zbuf1`

## WHAT WAS VERIFIED
- Static: single sprite `drawImage` path; single `if(depth >= zbuffer[col])` guard; `zbuffer[col]=d` in wall loop.
- Browser `file://?mobile=on`: `startRun()` → `play`, `__crRuntimeErrors` empty, `getOcclusionZbufferProof().predicateOk === true`, `zbufferMatchesRenderWidth === true`.

## WHAT FAILED
- Nothing in code/static/browser proof hooks.

## NOT TESTED
- Screenshot of NPC/can deliberately placed behind wall on real device.
- GitHub Pages CDN after push (poll separately).

## CURRENT EXACT STATE
- Occlusion behavior unchanged (already correct); regression documentation + proof API added for future sprite/render edits.

## EVIDENCE
```js
CR.getOcclusionZbufferProof()
// predicateOk: true, renderWidth: 320, billboardKinds: props/pickups/npcs/exit
```

## NEXT STEP
- Card 4+ per Kanban queue; optional manual wall-occlusion screenshot in custom level or teleported NPC.