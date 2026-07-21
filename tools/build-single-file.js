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
const METADATA_FILE = 'project-metadata.json';

function identityDiagnostics(values = {}) {
  return {
    metadata: values.metadata ?? null,
    source: values.source ?? null,
    artifact: values.artifact ?? null,
  };
}

function metadataError(message, diagnostics = {}) {
  const observed = identityDiagnostics(diagnostics);
  const error = new Error(`project metadata validation failed: ${message} (metadata=${observed.metadata}, source=${observed.source}, artifact=${observed.artifact})`);
  error.diagnostics = observed;
  throw error;
}

function extractBuildId(text, label, diagnostics = {}) {
  const match = String(text).match(/\b(?:const|let|var)\s+BUILD_ID\s*=\s*['"]([^'"]+)['"]/);
  if (!match) metadataError(`missing BUILD_ID declaration in ${label}`, diagnostics);
  return match[1];
}

function loadProjectMetadata(root = ROOT) {
  const metadataPath = path.join(root, METADATA_FILE);
  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch (err) {
    metadataError(`cannot parse ${METADATA_FILE}: ${err.message}`);
  }
}

function readManifestForMetadata(root, diagnostics) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'src', 'build-manifest.json'), 'utf8'));
  } catch (err) {
    metadataError(`cannot parse src/build-manifest.json: ${err.message}`, diagnostics);
  }
}

function sourceBuildIdentity(manifest, root, diagnostics) {
  const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : [];
  for (const rel of scripts) {
    const sourcePath = path.join(root, rel);
    if (!fs.existsSync(sourcePath)) metadataError(`missing manifest source ${rel}`, diagnostics);
    const text = fs.readFileSync(sourcePath, 'utf8');
    const match = text.match(/\b(?:const|let|var)\s+BUILD_ID\s*=\s*['"]([^'"]+)['"]/);
    if (match) return { id: match[1], path: rel };
  }
  metadataError('missing BUILD_ID declaration in manifest scripts', diagnostics);
}

function isSha256(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function isAcceptanceStatus(value) {
  return value === 'passed' || value === 'failed' || value === 'pending';
}

function validateEvidenceReference(value, root, label, fail) {
  if (typeof value !== 'string' || !value) fail(`${label} must be a repository-relative document reference`);
  const relative = value.split('#')[0];
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..') || !relative.endsWith('.md')) {
    fail(`${label} must be a repository-relative Markdown reference`);
  }
  if (!fs.existsSync(path.join(root, relative))) fail(`${label} target does not exist: ${relative}`);
}

function validateProjectMetadata(metadata, root = ROOT, options = {}) {
  const diagnostics = identityDiagnostics();
  const fail = (message) => metadataError(message, diagnostics);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) fail('root must be an object');
  const runtime = metadata.runtime || {};
  diagnostics.metadata = typeof runtime.buildId === 'string' ? runtime.buildId : null;
  if (!Number.isInteger(metadata.schemaVersion) || metadata.schemaVersion !== 3) fail('schemaVersion must be supported integer 3');
  if (!metadata.project || typeof metadata.project.id !== 'string' || !metadata.project.id || typeof metadata.project.name !== 'string' || !metadata.project.name) fail('project.id and project.name are required');
  if (!runtime || typeof runtime.buildId !== 'string' || !runtime.buildId.trim()) fail('runtime.buildId must be a non-empty identifier');
  if (runtime.sourcePolicy !== 'build-manifest') fail('runtime.sourcePolicy must be build-manifest');
  if (runtime.releaseArtifact !== 'index.html') fail('runtime.releaseArtifact must be index.html');
  const artifact = metadata.artifact;
  if (!artifact || artifact.path !== runtime.releaseArtifact || !Number.isInteger(artifact.byteLength) || artifact.byteLength <= 0 || !isSha256(artifact.sha256)) fail('artifact must record the release artifact path, byte length, and SHA-256');
  const distribution = metadata.distribution;
  if (!distribution || distribution.provider !== 'github-pages' || typeof distribution.url !== 'string' || !distribution.url) fail('distribution must identify the canonical GitHub Pages URL');
  if (!distribution.source || distribution.source.branch !== 'main' || distribution.source.path !== '/') fail('distribution.source must be main:/');
  const farField = metadata.selection && metadata.selection.farField;
  if (!farField || farField.status !== 'selected' || typeof farField.candidate !== 'string' || !farField.candidate || typeof farField.basis !== 'string' || !farField.basis || typeof farField.evidence !== 'string' || !farField.evidence) fail('selection.farField must record a selected candidate and its evidence');
  if (!farField.modes || farField.modes.ffres !== '400' || farField.modes.ffangle !== 'interp' || farField.modes.ffproj !== 'subpixel') fail('selection.farField.modes must record the selected 400/interp/subpixel modes');
  validateEvidenceReference(farField.evidence, root, 'selection.farField.evidence', fail);
  const acceptance = metadata.acceptance || {};
  if (!acceptance.samsungSmoothness || !acceptance.samsungSmoothness.target || !isAcceptanceStatus(acceptance.samsungSmoothness.status) || typeof acceptance.samsungSmoothness.scope !== 'string' || !acceptance.samsungSmoothness.scope || typeof acceptance.samsungSmoothness.evidence !== 'string' || !acceptance.samsungSmoothness.evidence) fail('acceptance.samsungSmoothness must be scoped, evidence-linked, and have a supported status');
  validateEvidenceReference(acceptance.samsungSmoothness.evidence, root, 'acceptance.samsungSmoothness.evidence', fail);
  if (!acceptance.userVisual || !isAcceptanceStatus(acceptance.userVisual.status) || typeof acceptance.userVisual.scope !== 'string' || !acceptance.userVisual.scope) fail('acceptance.userVisual must be scoped and have a supported status');
  const art = metadata.art && metadata.art.custom_next_001;
  if (!art || !art.version || !art.renderMode || art.approvalStatus !== 'pending_art_review') fail('art.custom_next_001 approvalStatus must remain pending_art_review');
  if (!art.footprintCells || art.footprintCells.w !== 6 || art.footprintCells.h !== 3) fail('art.custom_next_001.footprintCells must be 6x3');

  const manifest = readManifestForMetadata(root, diagnostics);
  if (manifest.output !== runtime.releaseArtifact) fail(`releaseArtifact mismatch: metadata=${runtime.releaseArtifact}, manifest=${manifest.output}`);
  const source = sourceBuildIdentity(manifest, root, diagnostics);
  diagnostics.source = source.id;
  const artifactPath = path.join(root, runtime.releaseArtifact);
  const requireArtifact = options.requireArtifact !== false;
  if (!fs.existsSync(artifactPath)) {
    if (requireArtifact) fail(`missing artifact ${runtime.releaseArtifact}`);
    return { metadata, manifest, sourcePath: source.path, sourceBuildId: source.id, artifactBuildId: null, diagnostics };
  }
  const artifactText = fs.readFileSync(artifactPath, 'utf8').replace(/\r\n/g, '\n');
  diagnostics.artifact = extractBuildId(artifactText, runtime.releaseArtifact, diagnostics);
  if (diagnostics.metadata !== diagnostics.source || diagnostics.source !== diagnostics.artifact) fail('BUILD_ID parity failed');
  const artifactBytes = Buffer.from(artifactText, 'utf8');
  if (artifactBytes.length !== artifact.byteLength || sha256(artifactBytes) !== artifact.sha256) fail('artifact byte length or SHA-256 does not match project metadata');
  return { metadata, manifest, sourcePath: source.path, sourceBuildId: source.id, artifactBuildId: diagnostics.artifact, diagnostics };
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readUtf8(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

function loadManifest() {
  return JSON.parse(readUtf8('src/build-manifest.json'));
}

function fileEntry(rel) {
  const raw = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, sha256: sha256(raw), bytes: raw.length };
}

function combine(manifest) {
  const template = readUtf8(manifest.template);
  const styles = manifest.styles.map(readUtf8).join('\n').replace(/\n$/, '');
  const body = readUtf8(manifest.body).replace(/\n$/, '');
  let script = manifest.scripts.map(readUtf8).join('');
  script = script.replace(/\n+$/, '\n');
  const html = template.replace('{{STYLES}}', styles).replace('{{BODY}}', body).replace('{{SCRIPT}}', script).replace(/\r\n/g, '\n');
  return html.endsWith('\n') ? html : `${html}\n`;
}

function resolveSelfcheckRunDir() {
  const runDir = process.env.CR_SELFCHECK_RUN_DIR;
  if (!runDir) return null;
  const selfcheckRoot = path.resolve(ROOT, 'test-results', 'selfcheck-runs');
  const resolvedRunDir = path.resolve(ROOT, runDir);
  const relative = path.relative(selfcheckRoot, resolvedRunDir);
  const isStrictDescendant = relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
  if (!isStrictDescendant) {
    throw new Error(`CR_SELFCHECK_RUN_DIR must be a strict descendant of test-results/selfcheck-runs: ${runDir}`);
  }
  if (!fs.existsSync(resolvedRunDir) || !fs.statSync(resolvedRunDir).isDirectory()) {
    throw new Error(`CR_SELFCHECK_RUN_DIR must be an existing directory: ${runDir}`);
  }
  return resolvedRunDir;
}

function proofOutputPath(name, resolvedRunDir = resolveSelfcheckRunDir()) {
  return resolvedRunDir ? path.join(resolvedRunDir, path.basename(name)) : path.join(ROOT, name);
}

function writeProof(manifest, html, extra = {}, resolvedRunDir) {
  const inputs = [fileEntry(manifest.template), ...manifest.styles.map(fileEntry), fileEntry(manifest.body), ...manifest.scripts.map(fileEntry)];
  const proof = {
    generatedAt: new Date().toISOString(), output: manifest.output,
    outputSha256: sha256(Buffer.from(html, 'utf8')), outputBytes: Buffer.byteLength(html, 'utf8'),
    inputs, nodeVersion: process.version, ...extra,
  };
  fs.writeFileSync(proofOutputPath('proof-source-build-manifest.json', resolvedRunDir), JSON.stringify(proof, null, 2) + '\n', 'utf8');
  return proof;
}

function simpleMinifyHtml(html) {
  return html.split('\n').map((line) => line.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n');
}

function proofIdentity(identity) {
  return { buildId: identity.diagnostics.metadata, sourceBuildId: identity.diagnostics.source, artifactBuildId: identity.diagnostics.artifact };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has('--check');
  const doMin = args.has('--min');
  const selfcheckRunDir = resolveSelfcheckRunDir();
  const metadata = loadProjectMetadata();
  const manifest = loadManifest();
  const preflight = validateProjectMetadata(metadata, ROOT, { requireArtifact: checkOnly });
  const html = combine(manifest);
  const outPath = path.join(ROOT, manifest.output || 'index.html');

  if (checkOnly) {
    const existing = fs.readFileSync(outPath, 'utf8').replace(/\r\n/g, '\n');
    if (existing !== html) {
      writeProof(manifest, html, { check: 'fail', reason: 'index.html out of sync with src/' }, selfcheckRunDir);
      console.error('build:check failed — index.html out of sync with src/');
      console.error('output sha existing', sha256(Buffer.from(existing, 'utf8')));
      console.error('output sha rebuilt ', sha256(Buffer.from(html, 'utf8')));
      process.exit(1);
    }
    const identity = validateProjectMetadata(metadata);
    writeProof(manifest, html, { check: 'pass', metadata: proofIdentity(identity) }, selfcheckRunDir);
    console.log(JSON.stringify({ pass: true, check: 'pass', output: manifest.output, bytes: html.length }));
    return;
  }

  fs.writeFileSync(outPath, html, 'utf8');
  const identity = validateProjectMetadata(metadata);
  const proof = writeProof(manifest, html, { mode: doMin ? 'build+min' : 'build', metadata: proofIdentity(identity) }, selfcheckRunDir);
  console.log('Wrote', manifest.output, proof.outputBytes, 'bytes', `${proof.outputSha256.slice(0, 12)}…`);
  if (doMin) {
    const distDir = path.join(ROOT, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const minHtml = simpleMinifyHtml(html);
    fs.writeFileSync(path.join(ROOT, manifest.distMin || 'dist/index.min.html'), minHtml, 'utf8');
    console.log('Wrote', manifest.distMin, Buffer.byteLength(minHtml, 'utf8'), 'bytes (whitespace-only min)');
  }
  void preflight;
}

if (require.main === module) main();

module.exports = { extractBuildId, loadProjectMetadata, validateProjectMetadata };
