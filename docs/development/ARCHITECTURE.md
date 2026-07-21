# Architecture

## Release shape

SNC Can Run ships as root `index.html`. It contains all runtime HTML, CSS, JavaScript, fonts, and bitmap data required by the game. GitHub Pages serves that artifact directly from `main:/`.

## Source flow

```text
src/build-manifest.json
        |
        v
ordered src/ inputs -> tools/build-single-file.js -> index.html
```

- `src/template.html` owns the document shell.
- `src/styles/` owns embedded CSS.
- `src/html/` owns body markup.
- `src/js/` contains ordered runtime sections.
- `src/levels/` contains authored level data.
- `src/imported-handoff-assets/` contains embedded source assets.
- `project-metadata.json` records stable release facts verified by the build.

The generated artifact is never edited directly.

## Runtime contract

Gameplay follows one-way ownership:

```text
INPUT -> ACTIONS -> SIMULATION -> RENDER
```

Rendering must not mutate gameplay or save state. Debug and verification entry points are exposed through `window.CR`; runtime code does not use `eval`, dynamic `Function`, inline event handlers, or external dependencies.

## Release identity

`BUILD_ID` identifies behaviorally distinct builds. The current build is `rawlook1`. Documentation-only, test-only, and repository-only work does not change it. A runtime behavior change requires a new ID and focused proof.
