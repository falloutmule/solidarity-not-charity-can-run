'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const load = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(load('authoring/characters/character-assets-v2.json'));
const standing = manifest.assets.filter((asset) => asset.assetId !== 'npc_unhoused_slumped_001');
const slumped = manifest.assets.find((asset) => asset.assetId === 'npc_unhoused_slumped_001');

assert(standing.length === 15 && slumped, 'approved cast remains complete');
for(const asset of standing){
  assert.strictEqual(asset.displayHeightScale, 0.62, `${asset.assetId}: legacy display height remains approved`);
  assert.strictEqual(asset.worldHeight, 0.96, `${asset.assetId}: standing world height is calibrated`);
  assert.notStrictEqual(asset.displayHeightScale, asset.worldHeight, `${asset.assetId}: display and world heights are distinct`);
}
assert.strictEqual(slumped.displayHeightScale, 0.45, 'slumped legacy display height remains approved');
assert.strictEqual(slumped.worldHeight, 0.68, 'slumped physical height is calibrated');

const core = load('src/js/game-15a-variable-height-core.js');
const renderer = load('src/js/game-16d-heightfield-renderer.js');
const sprites = load('src/js/game-11-section-3b.js');
const gallery = load('src/js/game-21b-asset-gallery-mode.js');
assert(core.includes('eyeZ: 0.68'), 'camera eye height remains fixed');
assert(core.includes('CR_HEIGHTFIELD_SPRITE_WORLD_HEIGHTS = Object.freeze({ can: 0.18 })'), 'can has an explicit physical height contract');
assert(sprites.includes("const field = space === 'world' ? 'worldHeight' : 'displayHeightScale';"), 'NPC contract selects a declared height space');
assert(sprites.includes("if(kind === 'can') return CR_HEIGHTFIELD_SPRITE_WORLD_HEIGHTS.can;"), 'can world height uses the shared physical contract');
assert(renderer.includes("crHeightfieldSpriteWorldHeight('npc', npc)"), 'heightfield NPC rendering consumes world height');
assert(renderer.includes("crHeightfieldSpriteWorldHeight('can', can)"), 'heightfield can rendering consumes world height');
assert(!renderer.includes('HEIGHT.can'), 'heightfield can rendering does not use the legacy display scalar');
assert(!gallery.includes('worldHeight:'), 'no Gallery environment fixture owns a physical-height override');
assert(sprites.includes("params.get('hfcalibration') === '1'"), 'calibration scene is query gated');
assert(sprites.includes("id: 'half-block'") && sprites.includes("id: 'full-wall'"), 'calibration scene includes both geometry references');

const eyeZ = 0.68, halfBlock = 0.5, can = 0.18;
assert(standing[0].worldHeight > eyeZ, 'standing world height exceeds the camera eye');
assert(can < halfBlock, 'can remains shorter than the half block');
assert(slumped.worldHeight > halfBlock && slumped.worldHeight < standing[0].worldHeight, 'slumped person is physically between block and standing heights');

console.log(JSON.stringify({ pass: true, standingWorldHeight: standing[0].worldHeight, slumpedWorldHeight: slumped.worldHeight, canWorldHeight: can, cameraEyeZ: eyeZ }));
