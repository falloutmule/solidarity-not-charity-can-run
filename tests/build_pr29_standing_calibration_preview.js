'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const proofArg = process.argv.find((arg) => arg.startsWith('--proof='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'pr29-scale-lock-recovery-005', 'calibration-artifact', 'index.html'));
const proof = path.resolve(root, proofArg ? proofArg.slice('--proof='.length) : path.join('test-results', 'pr29-scale-lock-recovery-005', 'calibration-artifact', 'build-proof.json'));
const allowedRoot = path.join(root, 'test-results') + path.sep;
assert(output.startsWith(allowedRoot) && proof.startsWith(allowedRoot), 'calibration artifact and proof remain ignored test output');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readUtf8 = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const manifest = JSON.parse(readUtf8('src/build-manifest.json'));
const metadata = JSON.parse(readUtf8('project-metadata.json'));
const sourceBuildId = manifest.scripts.map(readUtf8).map((text) => text.match(/\b(?:const|let|var)\s+BUILD_ID\s*=\s*['\"]([^'\"]+)['\"]/)).find(Boolean)[1];
assert.strictEqual(sourceBuildId, metadata.runtime.buildId, 'calibration source retains the accepted metadata build identity');
const styles = manifest.styles.map(readUtf8).join('\n').replace(/[ \t]+\n/g, '\n').trimEnd();
const body = readUtf8(manifest.body).replace(/[ \t]+\n/g, '\n').trimEnd();
let script = manifest.scripts.map(readUtf8).join('');
script = script.replace(/\n+$/, '\n');
const template = readUtf8(manifest.template);
const html = template.replace('{{STYLES}}', styles).replace('{{BODY}}', body).replace('{{SCRIPT}}', script).replace(/\r\n/g, '\n');
const artifact = html.endsWith('\n') ? html : `${html}\n`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, artifact, 'utf8');
const inputFiles = [manifest.template, ...manifest.styles, manifest.body, ...manifest.scripts].map((relativePath) => {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return { path: relativePath, bytes: bytes.length, sha256: sha256(bytes) };
});
fs.mkdirSync(path.dirname(proof), { recursive: true });
fs.writeFileSync(proof, JSON.stringify({
  schema: 'snc-calibration-preview-build-v1', calibrationBuildId: 'pr29-scale-lock-005-standing',
  sourceBuildId, output: path.relative(root, output).replace(/\\/g, '/'), bytes: Buffer.byteLength(artifact, 'utf8'),
  sha256: sha256(Buffer.from(artifact, 'utf8')), inputs: inputFiles
}, null, 2) + '\n');
console.log(JSON.stringify({ pass: true, output: path.relative(root, output), bytes: Buffer.byteLength(artifact, 'utf8'), sha256: sha256(Buffer.from(artifact, 'utf8')) }));
