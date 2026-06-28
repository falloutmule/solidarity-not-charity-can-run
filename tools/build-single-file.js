#!/usr/bin/env node
/**
 * SNC Can Run — boring single-file combiner (no bundler).
 * Reads src/build-manifest.json and writes root index.html.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'src', 'build-manifest.json');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readUtf8(rel) {
  const p = path.join(ROOT, rel);
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

function loadManifest() {
  return JSON.parse(readUtf8('src/build-manifest.json'));
}

function fileEntry(rel) {
  const p = path.join(ROOT, rel);
  const raw = fs.readFileSync(p);
  return { path: rel, sha256: sha256(raw), bytes: raw.length };
}

function combine(manifest) {
  let template = readUtf8(manifest.template);
  const styles = manifest.styles.map(readUtf8).join('\n').replace(/\n$/, '');
  const body = readUtf8(manifest.body).replace(/\n$/, '');
  const scriptParts = manifest.scripts.map((rel) => readUtf8(rel));
  let script = scriptParts.join('');
  script = script.replace(/\n+$/, '\n');
  const html = template
    .replace('{{STYLES}}', styles)
    .replace('{{BODY}}', body)
    .replace('{{SCRIPT}}', script)
    .replace(/\r\n/g, '\n');
  return html.endsWith('\n') ? html : html + '\n';
}

function writeProof(manifest, html, extra = {}) {
  const inputs = [
    fileEntry(manifest.template),
    ...manifest.styles.map(fileEntry),
    fileEntry(manifest.body),
    ...manifest.scripts.map(fileEntry),
  ];
  const proof = {
    generatedAt: new Date().toISOString(),
    output: manifest.output,
    outputSha256: sha256(Buffer.from(html, 'utf8')),
    outputBytes: Buffer.byteLength(html, 'utf8'),
    inputs,
    nodeVersion: process.version,
    ...extra,
  };
  const proofPath = path.join(ROOT, 'proof-source-build-manifest.json');
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + '\n', 'utf8');
  return proof;
}

function simpleMinifyHtml(html) {
  // Safe whitespace collapse only — no JS/CSS minify in this pass.
  return html
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function main() {
  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has('--check');
  const doMin = args.has('--min');
  const manifest = loadManifest();
  const html = combine(manifest);
  const outPath = path.join(ROOT, manifest.output || 'index.html');

  if (checkOnly) {
    if (!fs.existsSync(outPath)) {
      console.error('build:check failed — missing', manifest.output);
      process.exit(1);
    }
    const existing = fs.readFileSync(outPath, 'utf8').replace(/\r\n/g, '\n');
    const built = html;
    if (existing !== built) {
      const proof = writeProof(manifest, built, { check: 'fail', reason: 'index.html differs from src rebuild' });
      console.error('build:check failed — index.html out of sync with src/ (see proof-source-build-manifest.json)');
      console.error('output sha existing', sha256(Buffer.from(existing, 'utf8')));
      console.error('output sha rebuilt ', proof.outputSha256);
      process.exit(1);
    }
    writeProof(manifest, built, { check: 'pass' });
    console.log(JSON.stringify({ pass: true, check: 'pass', output: manifest.output, bytes: built.length }));
    return;
  }

  fs.writeFileSync(outPath, html, 'utf8');
  const proof = writeProof(manifest, html, { mode: doMin ? 'build+min' : 'build' });
  console.log('Wrote', manifest.output, proof.outputBytes, 'bytes', proof.outputSha256.slice(0, 12) + '…');

  if (doMin) {
    const distDir = path.join(ROOT, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const minPath = path.join(ROOT, manifest.distMin || 'dist/index.min.html');
    const minHtml = simpleMinifyHtml(html);
    fs.writeFileSync(minPath, minHtml, 'utf8');
    console.log('Wrote', manifest.distMin, Buffer.byteLength(minHtml, 'utf8'), 'bytes (whitespace-only min)');
  }
}

main();