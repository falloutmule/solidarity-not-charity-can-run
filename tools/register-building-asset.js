'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'src', 'build-manifest.json');
const ASSET_DIR = 'src/imported-handoff-assets';

function assetModulePath(id) {
  return `${ASSET_DIR}/${id}.asset.js`;
}

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function nextManifestForAsset(manifest, id) {
  const modulePath = assetModulePath(id);
  const scripts = Array.from(manifest.scripts || []);
  if (scripts.includes(modulePath)) return { manifest, changed: false, modulePath };
  const firstLevel = scripts.findIndex((entry) => entry.startsWith('src/levels/'));
  if (firstLevel < 0) throw new Error('build manifest has no level boundary for asset registration');
  const next = { ...manifest, scripts: scripts.slice() };
  next.scripts.splice(firstLevel, 0, modulePath);
  return { manifest: next, changed: true, modulePath };
}

function registerBuildingAsset(id, { write = false } = {}) {
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error(`invalid building asset id: ${id}`);
  const modulePath = assetModulePath(id);
  if (!fs.existsSync(path.join(ROOT, modulePath))) throw new Error(`generated asset module is missing: ${modulePath}`);
  const result = nextManifestForAsset(readManifest(), id);
  if (write && result.changed) fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');
  return result;
}

function main(argv) {
  const id = argv.find((arg) => !arg.startsWith('--'));
  if (!id) throw new Error('usage: node tools/register-building-asset.js <asset-id> [--write]');
  const result = registerBuildingAsset(id, { write: argv.includes('--write') });
  process.stdout.write(`${JSON.stringify({ pass: true, assetId: id, modulePath: result.modulePath, changed: result.changed, wrote: argv.includes('--write') })}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { assetModulePath, nextManifestForAsset, registerBuildingAsset };
