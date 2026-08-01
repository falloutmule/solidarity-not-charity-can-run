# SNC runtime asset gallery

`?assetgallery=1` opens the local, query-gated inspection level through the normal SNC renderer. It is a developer candidate mode, not a player-facing menu item.

The approved cast packages are preserved through their byte-level source manifests under `authoring/characters/source-manifests/`. The canonical runtime-authoring authority is `authoring/characters/character-assets-v2.json`; its candidate PNGs are unchanged package copies, not extracted concept-sheet crops.

- `candidate` means an approved package asset is suitable for renderer review only; approval of a package does not make it normal District 1 content.
- Assets that do not pass a later visual review remain candidates and are not silently edited or replaced.
- The `.4/.5/.6` low-block obstruction bays are deferred until the separate low-block raycaster spike is accepted.

Commands:

```text
npm.cmd run characters:check
npm.cmd run characters:build-runtime
npm.cmd run characters:check-runtime
npm.cmd run assets:build-palette
npm.cmd run assets:check-palette
```

The generated runtime module owns the single embedded payload for each candidate asset. Gallery placements carry only an `assetId`; they do not embed image data.
