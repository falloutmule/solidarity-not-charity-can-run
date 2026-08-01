'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/imported-handoff-assets/runtime-sign-assets.js'), 'utf8');
class MockImage {
  constructor(){ this.complete = true; this.naturalWidth = 1; this.naturalHeight = 1; }
  set src(value){ this._src = value; }
  get src(){ return this._src; }
}
const sandbox = { Image: MockImage, Object, Number, String, Array }; sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox);
const registry = sandbox.SNC_RUNTIME_SIGN_ASSET_REGISTRY;
assert(registry && Object.isFrozen(registry), 'sign registry is a frozen generated runtime authority');
assert.deepStrictEqual(Object.keys(registry).sort(), [
  'sign_drop_off_cans_001', 'sign_family_3_cans_001', 'sign_neighbor_1_can_001', 'sign_snc_can_station_001', 'sign_summer_loop_market_001'
], 'five supplied signs compile to five exact runtime IDs');
for(const entry of Object.values(registry)){
  assert.strictEqual(entry.kind, 'prop');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(entry.anchor)), { x: 0.5, y: 1 }, `${entry.id}: centered bottom anchor`);
  assert.strictEqual(entry.groundContactSourceY, entry.height, `${entry.id}: runtime source bottom is the ground contact`);
  assert(entry.image.src.startsWith('data:image/png;base64,'), `${entry.id}: self-contained PNG payload`);
  assert(entry.alphaBounds.x === 0 && entry.alphaBounds.y === 0 && entry.alphaBounds.w === entry.width && entry.alphaBounds.h === entry.height, `${entry.id}: cropped alpha bounds`);
  assert(entry.displayClasses[entry.defaultDisplayClass].worldHeight > 0, `${entry.id}: data-level display class`);
}
assert.strictEqual(registry.sign_drop_off_cans_001.defaultDisplayClass, 'tall', 'the taller drop-off composition uses data metadata rather than a renderer branch');
console.log(JSON.stringify({ pass: true, assets: Object.keys(registry).length, tallSign: registry.sign_drop_off_cans_001.id }, null, 2));
