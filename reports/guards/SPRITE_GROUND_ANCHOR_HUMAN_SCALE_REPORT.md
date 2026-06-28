# Sprite ground anchor / human scale report

**BUILD_ID:** `spriteground1`  
**Previous gameplay baseline:** `facadeart1` / `56f4acb`  
**Backup:** `index.before-sprite-ground-anchor.html` (local; may be gitignored)

## Cause

Billboards used `bottom = RH/2 + lineH/2` with **texture-bottom** as the foot point, while person textures place **shoes at y≈44** with shadow below (h=46). **Vertical wobble** (`Math.sin(now/300 + wob) * screenH * 0.03`) moved the entire billboard, so feet left the projected floor plane and NPCs read as floating or pasted onto facades.

## Fix

- **`crProjectedGroundBottomY(depth)`** — explicit floor anchor: `RH/2 + (RH/depth)/2`
- **`CR_SPRITE_ANCHOR`** + **`crGetSpriteFootAnchor`** — shoe-bottom for people (44/46), can (18/22), exit float exception (76/80)
- **`crProjectBillboardSprite`** — `topY = groundBottomY - screenH * (footY/textureH)`; **`yoffUsed = 0`** for all ground sprites
- **Exit only** keeps intentional vertical float (`Math.sin(now/180)*2.5`)
- **Small ellipse contact shadow** at `groundBottomY` (no full-rect halo)
- **`CR.crDebugSpriteProjection()`** + **`CR.runSpriteGroundAnchorSelfCheck()`**

## Preserved

- Facade art vocabulary / composition / pack bridge / v2 safe modules
- Six gameplay modules; no lab-only imports
- Per-column zbuffer occlusion; sprite halo guard
- D1 park/plaza/pavilion; matte road; navigation minimap; FPV mass 1.5
- Controls, save, Hall, props non-collision

## Harness

- Local: `npm run test:selfcheck` — **pass**

## CI / play URLs

*(Filled after push.)*

## Proof artifacts

- `proof-sprite-ground-anchor.json`
- `proof-spriteground-debug.json`
- `proof-spriteground-d1-grounded.png`
- `proof-spriteground-d2-npc-storefront.png`
- `proof-spriteground-d2-can-grounded.png`
- `proof-spriteground-d3-garage-human-scale.png`
- `proof-spriteground-minimap-preserved.png`
- `proof-full-selfcheck.json`