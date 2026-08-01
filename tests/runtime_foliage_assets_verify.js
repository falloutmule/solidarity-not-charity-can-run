'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/imported-handoff-assets/runtime-foliage-assets.js'), 'utf8');
class MockImage { constructor(){ this.complete = true; this.naturalWidth = 1; this.naturalHeight = 1; } set src(value){ this._src = value; } get src(){ return this._src; } }
const sandbox = { Image: MockImage, Object, Number, String, Array }; sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox);
const registry = sandbox.SNC_RUNTIME_FOLIAGE_ASSET_REGISTRY;
assert(registry && Object.isFrozen(registry), 'foliage registry is a frozen generated runtime authority');
assert.deepStrictEqual(Object.keys(registry).sort(), [
  'foliage_bush_low_001', 'foliage_grass_patch_long_001', 'foliage_grass_tuft_medium_001', 'foliage_groundcover_wide_001',
  'foliage_tree_low_canopy_001', 'foliage_tree_round_large_001', 'foliage_tree_slender_001'
], 'seven selected foliage assets compile to exact runtime IDs');
for(const entry of Object.values(registry)){
  assert.strictEqual(entry.kind, 'prop');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(entry.anchor)), { x: 0.5, y: 1 }, `${entry.id}: centered bottom anchor`);
  assert.strictEqual(entry.groundContactSourceY, entry.height, `${entry.id}: runtime source bottom is the ground contact`);
  assert(entry.image.src.startsWith('data:image/png;base64,'), `${entry.id}: self-contained PNG payload`);
  assert(entry.alphaHistogram.partial > 0, `${entry.id}: source soft alpha reaches the runtime asset`);
  assert(entry.alphaBounds.x === 0 && entry.alphaBounds.y === 0 && entry.alphaBounds.w === entry.width && entry.alphaBounds.h === entry.height, `${entry.id}: cropped alpha bounds`);
  assert(entry.displayClasses[entry.defaultDisplayClass].worldHeight > 0, `${entry.id}: data-level display class`);
}
console.log(JSON.stringify({ pass: true, assets: Object.keys(registry).length, softAlpha: true }, null, 2));
