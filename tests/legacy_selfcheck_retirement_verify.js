'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const tool = fs.readFileSync(path.join(ROOT, 'tools', 'build-single-file.js'), 'utf8');
const map = fs.readFileSync(path.join(ROOT, 'tests', 'TEST-MAP.md'), 'utf8');
const testing = fs.readFileSync(path.join(ROOT, 'docs', 'development', 'TESTING.md'), 'utf8');
const inventory = path.join(ROOT, 'docs', 'evidence', 'SNC-CLEAN-P4-010-LEGACY-SELFCHECK-INVENTORY.md');

for(const name of ['test:selfcheck', 'test:authored-d1-smoke', 'test:farfield-default-equivalence']) {
  assert(!Object.prototype.hasOwnProperty.call(packageJson.scripts, name), `${name} must not remain a maintained command`);
}
for(const file of ['run_selfcheck_playwright.js', 'harness_artifact.js', 'authored_d1_ordinary_game_smoke.js', 'far_field_default_equivalence_verify.js']) {
  assert(!fs.existsSync(path.join(ROOT, 'tests', file)), `retired legacy harness file remains: tests/${file}`);
}
assert(!tool.includes('includeHarness'), 'build tool must not produce a legacy harness artifact');
assert(!tool.includes('--test-artifact'), 'build tool must not expose a legacy test-artifact command');
assert(fs.existsSync(inventory), 'Phase 4 assertion inventory must remain as retirement evidence');
assert(map.includes('legacy aggregate self-check is retired'), 'test ownership map must identify the retirement');
assert(testing.includes('## Retired legacy self-check'), 'testing documentation must identify the retirement');

console.log(JSON.stringify({ check:'legacy-selfcheck-retirement', pass:true, retiredFiles:4, maintainedCommands:Object.keys(packageJson.scripts).length }));
