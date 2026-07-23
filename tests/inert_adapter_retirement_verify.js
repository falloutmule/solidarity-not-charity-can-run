'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'build-manifest.json'), 'utf8'));
const adapterName = ['SNC', 'Harness', 'Adapter'].join('');
const methodNames = [
  'is' + 'Active',
  'allow' + 'Frame',
  'suppress' + 'Save',
  'suppress' + 'UnloadSave',
  'mute' + 'Audio',
  'force' + 'Portrait',
  'capture' + 'VisualSnapshot',
  'capture' + 'SpriteGroundSnapshot',
];

assert(!manifest.scripts.includes('src/js/game-05a-runtime-harness-adapter.js'), 'manifest must not load the retired adapter');
assert(!fs.existsSync(path.join(root, 'src', 'js', 'game-05a-runtime-harness-adapter.js')), 'retired adapter module must not exist');

const files = [
  ...manifest.scripts,
  ...manifest.styles,
  manifest.template,
  manifest.body,
  'index.html',
].map((relative) => path.join(root, relative));

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!source.includes(adapterName), `retired adapter remains in ${path.relative(root, file)}`);
  for (const method of methodNames) {
    assert(!new RegExp(`\\b${method}\\s*\\(`).test(source), `retired adapter method ${method} remains in ${path.relative(root, file)}`);
  }
}

for (const file of ['authored_d1_save_load_verify.js', 'mobile_ui_cache_verify.js', 'render_interpolation_verify.js']) {
  const source = fs.readFileSync(path.join(root, 'tests', file), 'utf8');
  assert(!source.includes(adapterName), `${file} must not stub the retired adapter`);
}

const frameSource = fs.readFileSync(path.join(root, 'src', 'js', 'game-22-section-13-main-loop.js'), 'utf8');
const frameStart = frameSource.indexOf('function frame(now){');
const frameEnd = frameSource.indexOf('requestAnimationFrame(frame);', frameStart);
assert(frameStart >= 0 && frameEnd > frameStart, 'frame loop must retain its scheduler boundary');
const frame = frameSource.slice(frameStart, frameEnd);
const ordered = [
  'const rawDt =',
  'crApplyPendingInputActions();',
  'crStepSimulationFixed(rawDt);',
  'const renderPose = crGetInterpolatedRenderPose();',
  'drawScene(now, renderPose);',
];
let cursor = -1;
for (const token of ordered) {
  const next = frame.indexOf(token);
  assert(next > cursor, `frame order changed around ${token}`);
  cursor = next;
}

console.log(JSON.stringify({ check: 'inert-adapter-retirement', pass: true, manifestInputs: files.length }));
