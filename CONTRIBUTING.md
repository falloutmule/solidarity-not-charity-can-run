# Contributing to SNC Can Run

Thank you for helping improve the project. Open an issue before beginning a substantial change so the work can be kept to one clear card.

## Change rules

1. Create a short-lived branch from `main`.
2. Keep one hypothesis or product change per branch.
3. Edit canonical inputs under `src/`; never hand-edit generated `index.html`.
4. Preserve the single-file runtime and one-way `INPUT -> ACTIONS -> SIMULATION -> RENDER` flow.
5. Do not add runtime external JavaScript, CSS, fonts, images, or assets.
6. Do not commit proofs, reports, backups, machine paths, or generated test output.
7. Give every behaviorally different candidate a unique `BUILD_ID`.
8. Treat physical Android Chrome evidence as authoritative for touch feel, frame pacing, and visible mobile acceptance.

## Required verification

```powershell
npm.cmd ci
npm.cmd run test:metadata-truth
npm.cmd run test:build-proof-routing
npm.cmd run build:check
npm.cmd run test:farfield-final-smoke -- --output=test-results/local-release/farfield-final-smoke.json
```

Also run the smallest focused test for the subsystem being changed; [tests/TEST-MAP.md](tests/TEST-MAP.md) names the owner checks. The obsolete aggregate self-check is retired; see [docs/development/TESTING.md](docs/development/TESTING.md).

## Pull requests

- Explain what changed, why, and what the player or developer will notice.
- Include exact commands and results.
- State whether `index.html` changed and whether Android Chrome verification is required.
- Use squash merge. The branch is deleted after merging.
