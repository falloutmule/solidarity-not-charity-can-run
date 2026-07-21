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
8. Treat physical Samsung evidence as authoritative for touch feel, frame pacing, and visible mobile acceptance.

## Required verification

```powershell
npm.cmd ci
New-Item -ItemType Directory -Force test-results/selfcheck-runs/local-release | Out-Null
$env:CR_SELFCHECK_RUN_DIR = 'test-results/selfcheck-runs/local-release'
npm.cmd run test:metadata-truth
npm.cmd run build:check
npm.cmd run test:farfield-final-smoke -- --output=test-results/local-release/farfield-final-smoke.json
```

Also run the smallest focused test for the subsystem being changed. The broad historical self-check is a characterization tool, not a release blocker; see [docs/development/TESTING.md](docs/development/TESTING.md).

## Pull requests

- Explain what changed, why, and what the player or developer will notice.
- Include exact commands and results.
- State whether `index.html` changed and whether Samsung verification is required.
- Use squash merge. The branch is deleted after merging.

