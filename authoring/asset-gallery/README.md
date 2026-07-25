# SNC runtime asset gallery

`?assetgallery=1` opens the local, query-gated inspection level through the normal SNC renderer. It is a developer candidate mode, not a player-facing menu item.

The original concept sheets under `authoring/concepts/` are preserved source references. The deterministic, non-generative extraction manifest lives at `authoring/characters/character-isolation-v1.json`.

- `candidate` means an extracted asset is suitable for renderer review only.
- `blocked` means the supplied source cannot be cleanly isolated without redraw, inpainting, or invented pixels. It must not enter the runtime registry.
- The `.4/.5/.6` low-block obstruction bays are deferred until the separate low-block raycaster spike is accepted.

Commands:

```text
npm.cmd run characters:extract
npm.cmd run characters:check
npm.cmd run characters:build-runtime
npm.cmd run characters:check-runtime
node tools/build-asset-palette.js
node tools/build-asset-palette.js --check
```

The generated runtime module owns the single embedded payload for each candidate asset. Gallery placements carry only an `assetId`; they do not embed image data.
