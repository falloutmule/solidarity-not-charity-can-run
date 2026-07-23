'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const sources = [
  'src/js/game-22-section-13-main-loop.js',
  'src/styles/game.css',
  'src/html/body.html',
];
const builder = fs.readFileSync(path.join(ROOT, 'tools', 'build-single-file.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build-manifest.json'), 'utf8'));

for (const relativePath of sources) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  assert(!source.includes('SNC_TEST_HARNESS'), `dead harness marker remains in ${relativePath}`);
}

for (const symbol of ['stripHarnessSource', 'HARNESS_BEGIN', 'HARNESS_END', 'invalid SNC test-harness boundary markers']) {
  assert(!builder.includes(symbol), `obsolete harness stripping implementation remains: ${symbol}`);
}

for (const relativePath of [manifest.template, manifest.body, ...manifest.styles, ...manifest.scripts]) {
  assert(fs.existsSync(path.join(ROOT, relativePath)), `build manifest input is missing: ${relativePath}`);
}

const assembled = childProcess.spawnSync(process.execPath, ['tools/build-single-file.js', '--check'], {
  cwd: ROOT,
  encoding: 'utf8',
});
assert.strictEqual(assembled.status, 0, `production manifest no longer assembles:\n${assembled.stdout}\n${assembled.stderr}`);

console.log(JSON.stringify({ check: 'dead-harness-boundaries', pass: true, inputs: manifest.scripts.length + manifest.styles.length + 2 }));
