/**
 * AI-SAFE SINGLE-FILE CONSTITUTION — reference mirror (NOT loaded at runtime).
 * Authoritative copy lives in index.html top-of-script block.
 * See SOURCE_RELEASE_POLICY.md and src/sections.md.
 */
export const AI_SAFE_RULES = [
  'Named section edits only',
  'SAVE_VERSION bump + migration on save schema changes',
  'One-way flow: INPUT → ACTIONS → SIMULATION → RENDER',
  'Render must not mutate gameplay state',
  'Scene transitions own setup/teardown',
  'Feature flags only in CONFIG / DEBUG / options / URL',
  'No runtime external dependencies',
  'No eval()',
  'No inline event handlers',
  'No hidden globals (window.CR is the public API)',
  'One Kanban card at a time',
  'Every edit passes Playwright harness',
  'Harness scenes temporary and state-isolated',
  'Public artifact remains single-file HTML',
  'Do not ask Travis to discover harness-testable bugs',
];