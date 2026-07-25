#!/usr/bin/env node
'use strict';

/* Emits a future-editor palette from the same candidate manifest used by runtime compilation. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'authoring', 'characters', 'character-isolation-v1.json');
const outputPath = path.join(root, 'authoring', 'generated', 'asset-palette.json');

function main(){
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const assets = manifest.assets.filter((asset) => asset.status === 'candidate').map((asset) => ({
    assetId: asset.assetId,
    category: asset.assetId.includes('_volunteer_') ? 'character.volunteer' : asset.assetId.includes('_civilian_') ? 'character.civilian' : 'character.household',
    displayLabel: asset.assetId,
    approvalStatus: 'candidate',
    renderMode: 'billboard-single',
    collision: 'none',
    previewPath: asset.runtimePath,
    sha256: asset.runtimeSha256,
    allowedLevelLayers: ['NPCs', 'Gallery']
  })).sort((a, b) => a.assetId.localeCompare(b.assetId));
  const output = { schema: 'snc-asset-palette-v1', generatedFrom: 'authoring/characters/character-isolation-v1.json', assets };
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
