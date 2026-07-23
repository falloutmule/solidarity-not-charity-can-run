'use strict';

const fs = require('fs');
const path = require('path');
const { combine } = require('../tools/build-single-file.js');

const ROOT = path.resolve(__dirname, '..');

function createHarnessArtifact(label) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build-manifest.json'), 'utf8'));
  const directory = path.join(ROOT, 'test-results', 'harness-artifacts');
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, `${label}-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(target, combine(manifest, { includeHarness: true }), 'utf8');
  return target;
}

module.exports = { createHarnessArtifact };
