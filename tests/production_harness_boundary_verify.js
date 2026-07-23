'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { combine } = require('../tools/build-single-file.js');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build-manifest.json'), 'utf8'));
const production = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const rebuiltProduction = combine(manifest);

assert.strictEqual(production, rebuiltProduction, 'root index.html must be the production-only manifest build');
for (const symbol of ['globalThis.CR = window.CR', 'runFullSelfCheck', '__crVisualQaReady', 'selfcheckhangmeta', 'id="crselfcheck"', '#crselfcheck']) {
  assert(!production.includes(symbol), `production artifact retained harness symbol: ${symbol}`);
}
assert(production.includes('window.SNCDiagnostics = Object.freeze'), 'production must retain bounded diagnostics');
assert(!production.includes('set state(v)'), 'production diagnostics must not expose mutable state setters');
assert(!production.includes('SNC_TEST_HARNESS_BEGIN'), 'production must not retain harness boundary marker');
assert(!production.includes('SNC_TEST_HARNESS_END'), 'production must not retain harness boundary marker');

console.log(JSON.stringify({ pass: true, productionBytes: Buffer.byteLength(production), legacyHarnessArtifact:false }));
