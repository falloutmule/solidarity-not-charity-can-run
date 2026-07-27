#!/usr/bin/env node
'use strict';

/* Emits a future-editor palette from the approved runtime asset authority. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'authoring', 'characters', 'character-assets-v2.json');
const outputPath = path.join(root, 'authoring', 'generated', 'asset-palette.json');

function main(){
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if(manifest.schema !== 'snc-character-assets-v2') throw new Error('unexpected approved character manifest schema');
  const assets = manifest.assets.map((asset) => ({
    assetId: asset.assetId,
    category: 'character.' + asset.group,
    displayLabel: asset.assetId,
    approvalStatus: asset.reviewStatus,
    renderMode: asset.renderMode,
    collision: asset.collision,
    previewPath: asset.runtimePath,
    sha256: asset.runtimeSha256,
    displayHeightScale: asset.displayHeightScale,
    worldHeight: asset.worldHeight,
    allowedLevelLayers: ['NPCs', 'Gallery']
  })).sort((a, b) => a.assetId.localeCompare(b.assetId));
  if(assets.length !== 16) throw new Error('approved cast palette must contain exactly sixteen assets');
  const output = { schema: 'snc-asset-palette-v1', generatedFrom: 'authoring/characters/character-assets-v2.json', assets };
  const text = JSON.stringify(output, null, 2) + '\n';
  if(process.argv.includes('--check')){
    if(!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== text) throw new Error('asset palette drift; run without --check');
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, text, 'utf8');
  }
  console.log(JSON.stringify({ pass: true, assets: assets.length, sha256: crypto.createHash('sha256').update(text).digest('hex') }));
}
try { main(); } catch(error) { console.error('asset-palette:', error.message); process.exitCode = 1; }
