# Sprite occlusion screenshot proof — Card 6

**Card:** `SPRITE_OCCLUSION_SCREENSHOT_PROOF_COMPLETE`  
**BUILD_ID:** `feel2` (unchanged)  
**Date:** 2026-07-01

## Done

- Added `crSpriteOcclusionScreenshotProof()` — renders visible + occluded bench scenes from the buffer, projects sprite billboard columns, and compares pixel variance in the sprite's projected area.
- Playwright captures three screenshots: `proof-sprite-visible.png`, `proof-sprite-occluded.png`, `proof-sprite-near-wall.png`.
- Wrote `proof-sprite-occlusion-screenshot.json` and gated it in `corePass`.

## Pixel evidence

| Scene | Sprite column variance | Meaning |
|-------|----------------------|---------|
| visible_sprite | 2911.07 | High variance = sprite pixels present |
| occluded_sprite | ~0 (3.2e-27) | Zero variance = wall fully covers sprite |

## Verified

```
npm run build          # PASS
npm run build:check    # PASS
npm run test:selfcheck # PASS
proof-sprite-occlusion-screenshot.json pass: true (8/8 checks)
```

## Checks

- visibleSpriteNonblank ✓
- visibleSpriteColumnsHaveContent ✓
- occludedSpriteHidden ✓
- noHaloBox ✓
- haloGuardPasses ✓
- occlusionPredicatePasses ✓
- raycasterInvariantPasses ✓
- runtimeClean ✓

## Screenshots

- `proof-sprite-visible.png` — can sprite visible in open corridor
- `proof-sprite-occluded.png` — wall between player and sprite; sprite hidden
- `proof-sprite-near-wall.png` — can sprite near wall, no halo/box artifact

## Next

Card 7 (World adapter wiring phase 1) or Cards 8–11 per handoff order.