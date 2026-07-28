'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath));
const sha256 = (relativePath) => crypto.createHash('sha256').update(read(relativePath)).digest('hex');
const json = (relativePath) => JSON.parse(read(relativePath).toString('utf8'));

const protectedHashes = Object.freeze({
  'src/js/game-16d-heightfield-renderer.js': '9c17a03108ea23deb892119f2f15c82c7d18089d4df38fc8464a763edbae1014',
  'src/js/game-16-section-7-render.js': '4d174fe082f7ab34837c179e86582f7ae82f2fa1d1e199a853fe3469f0ede6ea',
  'src/js/game-16a-bitmap-building-renderer.js': 'e6ce245021a78cef64a8f1be38ac483c3e195746d216db86ddeb9f5c00c063d7',
  'src/js/game-12-section-4-collision-walk-helpers.js': 'af9f3c27b2d2ff7c19aeb8bbb079da84a637abee7f57bbd4148b77485e577270',
  'authoring/buildings/low_block_concrete_001/source/east.png': 'bbab580eeef4bb3ff76f485e3c1ea49acc432745b7900d506177628a00c15eaa',
  'authoring/buildings/low_block_concrete_001/source/north.png': '5397ee4252e0301eb25e1d02b6f092fffbf5b356c82cc53e5124f0b10295e01e',
  'authoring/buildings/low_block_concrete_001/source/south.png': '1dab136a7483149e92741424fe2747cb705081f5c3da140ca07bf09665f333d1',
  'authoring/buildings/low_block_concrete_001/source/top.png': 'e0c9dd6822036d2139c2a7b96984fcd6651bd510c3b3aa2596e326e9c6fa6f4b',
  'authoring/buildings/low_block_concrete_001/source/west.png': '49f154437fd58e3be6afb82f67f50a3ea9ea127b6cbf70265d27cc2ae57e47d5',
  'authoring/characters/runtime/npc_unhoused_slumped_001.png': '0124303d47ccc1fbf0c0f4fd729ad9d82f3e0339cf4e21ee6b0c6f5dcd8b8895'
});

for(const [relativePath, expected] of Object.entries(protectedHashes)){
  assert.strictEqual(sha256(relativePath), expected, `${relativePath}: protected bytes changed`);
}

const manifest = json('authoring/characters/character-assets-v2.json');
const standing = manifest.assets.find((asset) => asset.assetId === 'npc_unhoused_work_jacket_001');
const slumped = manifest.assets.find((asset) => asset.assetId === 'npc_unhoused_slumped_001');
assert.strictEqual(standing.worldHeight, 0.78, 'Samsung-selected standing world height remains locked');
assert.strictEqual(slumped.worldHeight, 0.68, 'seated world height remains locked');
assert.strictEqual(slumped.groundContactSourceY, 182, 'row 182 is the canonical generic seated contact pivot');

const core = read('src/js/game-15a-variable-height-core.js').toString('utf8');
const renderer = read('src/js/game-16d-heightfield-renderer.js').toString('utf8');
assert(core.includes('eyeZ: 0.68'), 'camera eye remains locked at 0.68');
assert(core.includes('const screenH = projectedTopToGround;'), 'physical world height defines screen height independently of pivot');
assert(core.includes('const scalePerSourcePixel = screenH / bounds.sourceHeight;'), 'perspective scale uses the full visible crop');
assert(core.includes('const topY = groundScreenY - sourcePixelsAboveGround * scalePerSourcePixel;'), 'pivot affects only vertical translation');
assert(!core.includes('npc_unhoused_slumped_001'), 'generic projector contains no seated-asset branch');
assert(!core.includes('targetInternalPixelDelta'), 'rejected display-delta search is absent');
assert(!core.includes('requiredSourceDelta'), 'rejected display-delta source-row derivation is absent');
assert(!renderer.includes('showGroundLine'), 'temporary calibration ground-marker overlay is absent');

console.log(JSON.stringify({
  pass: true,
  check: 'independent vertical pivot locks',
  standingWorldHeight: standing.worldHeight,
  slumpedWorldHeight: slumped.worldHeight,
  slumpedGroundContactSourceY: slumped.groundContactSourceY,
  protectedHashes
}));
