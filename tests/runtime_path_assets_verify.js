'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/imported-handoff-assets/runtime-path-assets.js'), 'utf8');
class MockImage { constructor(){ this.complete = true; this.naturalWidth = 1; this.naturalHeight = 1; } set src(value){ this._src = value; } get src(){ return this._src; } }
const sandbox = { Image: MockImage, Object, Number, String, Array }; sandbox.globalThis = sandbox; vm.runInNewContext(source, sandbox);
const registry = sandbox.SNC_RUNTIME_PATH_ASSET_REGISTRY;
assert(registry && Object.isFrozen(registry), 'path registry is frozen generated runtime authority');
assert.deepStrictEqual(Object.keys(registry).sort(), ['path_modular_corner_001','path_modular_cross_001','path_modular_straight_001','path_modular_t_junction_001','path_organic_tree_wear_001','path_organic_wear_001']);
for(const entry of Object.values(registry)){
  assert.strictEqual(entry.kind, 'ground-decal'); assert.strictEqual(entry.renderMode, 'ground-plane-decal');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(entry.anchor)), { x: 0.5, y: 0.5 });
  assert(entry.image.src.startsWith('data:image/png;base64,'), `${entry.id}: self-contained PNG payload`);
  assert(entry.alphaHistogram.partial > 0, `${entry.id}: soft alpha survives`);
  assert(entry.alphaBounds.x === 0 && entry.alphaBounds.y === 0 && entry.alphaBounds.w === entry.width && entry.alphaBounds.h === entry.height, `${entry.id}: crop is tight`);
}
console.log(JSON.stringify({ pass: true, assets: Object.keys(registry).length, groundPlaneOnly: true }, null, 2));
