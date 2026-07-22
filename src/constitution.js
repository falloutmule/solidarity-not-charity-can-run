/**
 * Development reference mirror; this file is not loaded by the release build.
 * The runtime constitution lives in the generated artifact. See
 * SOURCE_RELEASE_POLICY.md and docs/development/SOURCE-MAP.md.
 */
export const AI_SAFE_RULES = [
  'Named section edits only',
  'SAVE_VERSION bump plus migration on save schema changes',
  'One-way flow: INPUT -> ACTIONS -> SIMULATION -> RENDER',
  'Render must not mutate gameplay state',
  'Scene transitions own setup and teardown',
  'Feature flags only in CONFIG, DEBUG, options, or URL state',
  'No runtime external dependencies',
  'No eval()',
  'No inline event handlers',
  'Runtime globals must have documented ownership',
  'One bounded card at a time',
  'Run focused owner checks for each change',
  'Historical self-check is characterization, not the default release gate',
  'Harness scenes temporary and state-isolated',
  'Public artifact remains single-file HTML',
];
