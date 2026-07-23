const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'build-manifest.json'), 'utf8'));
const selectionPath = 'src/js/game-01aa-render-profile-selection.js';
const runtimePath = 'src/js/game-01a-render-resolution-profiles.js';
const selection = fs.readFileSync(path.join(root, selectionPath), 'utf8');
const runtime = fs.readFileSync(path.join(root, runtimePath), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const selectionIndex = manifest.scripts.indexOf(selectionPath);
const runtimeIndex = manifest.scripts.indexOf(runtimePath);
assert(selectionIndex >= 0, 'render profile selection manifest input is missing');
assert(runtimeIndex === selectionIndex + 1, 'render profile runtime must immediately follow selection');
for (const symbol of ['CR_FFRES_ALLOWLIST', 'CR_RENDER_PROFILES']) {
  assert(new RegExp(`const\\s+${symbol}\\b`).test(selection), `selection must define ${symbol}`);
  assert(!new RegExp(`const\\s+${symbol}\\b`).test(runtime), `render profile runtime must not define ${symbol}`);
}
for (const symbol of ['crResolveRenderProfile', 'crCanonicalRenderProfile', 'crGetRenderProfile']) {
  assert(new RegExp(`function\\s+${symbol}\\b`).test(selection), `selection must define ${symbol}`);
  assert(!new RegExp(`function\\s+${symbol}\\b`).test(runtime), `render profile runtime must not define ${symbol}`);
}
for (const symbol of ['crRenderTargetsMatch', 'crResetRenderTargets', 'crGetRenderResolutionStats', 'crApplyRenderProfile']) {
  assert(runtime.includes(symbol), `render profile runtime must retain ${symbol}`);
}
console.log('PASS render profile selection boundary');
