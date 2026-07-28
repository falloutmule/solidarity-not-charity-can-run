'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const load = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(load('authoring/characters/character-assets-v2.json'));
const core = load('src/js/game-15a-variable-height-core.js');
const renderer = load('src/js/game-16d-heightfield-renderer.js');
const sprites = load('src/js/game-11-section-3b.js');
const compiler = load('tools/build-runtime-character-assets.py');

assert.strictEqual(manifest.assets.length, 16, 'approved cast remains complete');
const standing = manifest.assets.filter((asset) => asset.worldHeightClass === 'standingComposite');
const slumped = manifest.assets.filter((asset) => asset.worldHeightClass === 'seatedSlumped');
assert.strictEqual(standing.length, 15, 'all non-seated cast assets use standingComposite');
assert.strictEqual(slumped.length, 1, 'one seated asset uses seatedSlumped');
assert.strictEqual(slumped[0].assetId, 'npc_unhoused_slumped_001', 'the accepted seated asset retains its class');
assert.strictEqual(slumped[0].groundContactSourceY, 182, 'the accepted seated contact row remains explicit');
for(const asset of manifest.assets){
  assert.strictEqual(Object.hasOwn(asset, 'worldHeight'), false, `${asset.assetId}: source manifest has no per-asset worldHeight`);
  assert(asset.worldHeightClass === 'standingComposite' || asset.worldHeightClass === 'seatedSlumped', `${asset.assetId}: valid shared height class`);
  assert.strictEqual(asset.displayHeightScale, asset.worldHeightClass === 'seatedSlumped' ? 0.45 : 0.62, `${asset.assetId}: legacy display scale remains independent`);
}

assert(compiler.includes("'standingComposite': 0.78"), 'compiler owns standingComposite physical height');
assert(compiler.includes("'seatedSlumped': 0.68"), 'compiler owns seatedSlumped physical height');
assert(compiler.includes("if 'worldHeight' in asset:"), 'compiler rejects conflicting source world-height authority');
assert(compiler.includes('unknown worldHeightClass'), 'compiler rejects unknown classes');
assert(compiler.includes("'worldHeightClass': asset['worldHeightClass']"), 'compiler emits the resolved class to runtime records');

class MockImage {
  set src(value){ this._src = value; this.complete = true; this.naturalWidth = 1; }
  get src(){ return this._src; }
}
const sandbox = { Image: MockImage }; sandbox.globalThis = sandbox;
vm.runInNewContext(load('src/imported-handoff-assets/runtime-character-gallery-assets.js'), sandbox);
assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.SNC_CHARACTER_WORLD_HEIGHT_CLASSES)), { standingComposite: 0.78, seatedSlumped: 0.68 }, 'generated registry exposes the two authoritative classes');
const records = Object.values(sandbox.SNC_RUNTIME_ASSET_REGISTRY);
assert.strictEqual(records.filter((record) => record.worldHeightClass === 'standingComposite' && record.worldHeight === 0.78).length, 15, 'all standing/composite runtime records resolve to 0.78');
assert.strictEqual(records.filter((record) => record.worldHeightClass === 'seatedSlumped' && record.worldHeight === 0.68).length, 1, 'seated runtime record resolves to 0.68');
const runtimeSlumped = sandbox.SNC_RUNTIME_ASSET_REGISTRY.npc_unhoused_slumped_001;
assert.strictEqual(runtimeSlumped.groundContactSourceY, 182, 'runtime seated record preserves its generic pivot metadata');

assert(core.includes('Object.freeze({ eyeZ: 0.68 })'), 'camera eye height remains fixed');
assert(core.includes('CR_HEIGHTFIELD_SPRITE_WORLD_HEIGHTS = Object.freeze({ can: 0.40 })'), 'can uses the shared readable physical height');
assert(core.includes('const screenH = projectedTopToGround;'), 'independent vertical pivot preserves screen scale');
assert(core.includes('const scalePerSourcePixel = screenH / bounds.sourceHeight;'), 'source crop scale stays independent of contact row');
assert(core.includes('const topY = groundScreenY - sourcePixelsAboveGround * scalePerSourcePixel;'), 'contact row moves only the vertical pivot');
assert(!core.includes('npc_unhoused_slumped_001'), 'core has no asset-ID grounding branch');
assert(renderer.includes("crHeightfieldSpriteWorldHeight('npc', npc)"), 'NPC renderer consumes resolved world height');
assert(renderer.includes("crHeightfieldSpriteWorldHeight('can', can)"), 'can renderer consumes the shared world height');
assert(!renderer.includes('npc_unhoused_slumped_001'), 'renderer has no asset-ID height branch');

assert(sprites.includes("params.get('hfclasssweep') === '1'"), 'internal class sweep is query gated');
for(const retiredRoute of ['hfcastreview', 'hfcanreview', 'hfcastpage', 'reviewWorldHeight', 'CR_HEIGHTFIELD_CAN_SCALE_REVIEW_V1']) assert(!sprites.includes(retiredRoute), `${retiredRoute}: temporary comparison data is retired`);
assert(sprites.includes('worldHeightClass: assets[index].worldHeightClass'), 'internal sweep reports generated class metadata without instance overrides');

const can = 0.40, halfBlock = 0.50, cameraEyeZ = 0.68;
assert(can < halfBlock, 'can remains physically shorter than the half block');
assert(standing.every((asset) => asset.displayHeightScale !== 0.78), 'legacy display height stays separate from standing world height');
assert(runtimeSlumped.worldHeight > halfBlock && runtimeSlumped.worldHeight < 0.78, 'seated physical height remains between block and standing class');

console.log(JSON.stringify({ pass: true, approvedCast: records.length, standingComposite: standing.length, seatedSlumped: slumped.length, canWorldHeight: can, cameraEyeZ }));
