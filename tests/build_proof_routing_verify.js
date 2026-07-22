#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const rootProof = path.join(ROOT, 'proof-source-build-manifest.json');
const proofDir = path.join(ROOT, 'test-results', 'build-proofs', `routing-${process.pid}`);
const proofPath = path.join(proofDir, 'proof-source-build-manifest.json');
const fingerprint = (file) => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const rootBefore = fingerprint(rootProof);

try {
  childProcess.execFileSync(process.execPath, ['tools/build-single-file.js', '--check'], { cwd: ROOT, stdio: 'pipe' });
  assert.strictEqual(fingerprint(rootProof), rootBefore, 'ordinary build:check must not create or change a root proof file');

  childProcess.execFileSync(process.execPath, ['tools/build-single-file.js', '--check', `--proof-dir=${path.relative(ROOT, proofDir)}`], { cwd: ROOT, stdio: 'pipe' });
  const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
  assert.strictEqual(proof.check, 'pass', 'explicit proof must record the passing check');
  assert.strictEqual(fingerprint(rootProof), rootBefore, 'explicit proof must not write a root proof file');

  console.log(JSON.stringify({ check: 'build-proof-routing', pass: true, proofPath: path.relative(ROOT, proofPath) }));
} finally {
  fs.rmSync(proofDir, { recursive: true, force: true });
}
