# Source and Release Policy

## Shipped artifact

- Root `index.html` is the GitHub Pages game and the only runtime deliverable.
- Runtime code, styles, fonts, images, and other assets remain embedded in that file.
- No external runtime dependency may be introduced without explicit approval.

## Canonical inputs

- `src/build-manifest.json` declares the ordered inputs.
- `src/` contains the editable HTML, CSS, JavaScript, level, and embedded-asset sources.
- `project-metadata.json` records stable build, artifact, distribution, selection, and acceptance facts.
- `tools/build-single-file.js` combines and validates the release.
- Generated `index.html` is never hand-edited.

## Release gate

Before a runtime release:

1. Run metadata truth verification.
2. Run `build:check` and prove source/artifact parity.
3. Run the smallest focused subsystem test.
4. Run the ordinary release smoke against root `index.html`.
5. Require physical Samsung evidence for touch, pacing, mobile-layout, or visible-performance changes.

Proof output belongs under ignored `test-results/`; it is not release source and is never committed.

## Public history

- `main` is protected from force-push and deletion.
- Work uses short-lived branches and squash merge.
- Raw reports, handoffs, backups, and proof archives stay outside the public repository.

