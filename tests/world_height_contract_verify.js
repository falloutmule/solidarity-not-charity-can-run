'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const load = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(load('authoring/characters/character-assets-v2.json'));
const selectedStanding = manifest.assets.find((asset) => asset.assetId === 'npc_unhoused_work_jacket_001');
const slumped = manifest.assets.find((asset) => asset.assetId === 'npc_unhoused_slumped_001');
const unclassifiedComposites = manifest.assets.filter((asset) => asset.assetId !== 'npc_unhoused_work_jacket_001' && asset.assetId !== 'npc_unhoused_slumped_001');

assert(selectedStanding && slumped && unclassifiedComposites.length === 14, 'approved cast remains complete');
assert.strictEqual(selectedStanding.displayHeightScale, 0.62, 'selected standing legacy display height remains approved');
assert.strictEqual(selectedStanding.worldHeight, 0.78, 'Samsung-selected work-jacket standing height is locked');
assert.notStrictEqual(selectedStanding.displayHeightScale, selectedStanding.worldHeight, 'selected standing display and world heights remain distinct');
for(const asset of unclassifiedComposites){
  assert.strictEqual(asset.displayHeightScale, 0.62, `${asset.assetId}: legacy display height remains approved`);
  assert.strictEqual(asset.worldHeight, 0.96, `${asset.assetId}: unclassified composite height remains unchanged`);
  assert.notStrictEqual(asset.displayHeightScale, asset.worldHeight, `${asset.assetId}: display and world heights are distinct`);
}
assert.strictEqual(slumped.displayHeightScale, 0.45, 'slumped legacy display height remains approved');
assert.strictEqual(slumped.worldHeight, 0.68, 'slumped physical height is calibrated');
assert.strictEqual(slumped.groundContactSourceY, 184, 'slumped physical contact row is explicit runtime metadata');
assert.strictEqual(slumped.runtimeSha256, '0124303d47ccc1fbf0c0f4fd729ad9d82f3e0339cf4e21ee6b0c6f5dcd8b8895', 'slumped PNG bytes remain locked');

const core = load('src/js/game-15a-variable-height-core.js');
const renderer = load('src/js/game-16d-heightfield-renderer.js');
const sprites = load('src/js/game-11-section-3b.js');
const gallery = load('src/js/game-21b-asset-gallery-mode.js');
assert(core.includes('eyeZ: 0.68'), 'camera eye height remains fixed');
assert(core.includes('CR_HEIGHTFIELD_SPRITE_WORLD_HEIGHTS = Object.freeze({ can: 0.26 })'), 'can has the repaired explicit physical height contract');
assert(core.includes('function crHeightfieldPhysicalSpriteBounds'), 'heightfield sprites resolve generic physical visible bounds');
assert(core.includes('function crHeightfieldGroundContactSourceY'), 'heightfield sprites resolve a generic physical contact row');
assert(core.includes('entry && Number.isInteger(entry.groundContactSourceY)'), 'runtime asset metadata has first priority for contact rows');
assert(core.includes('obj && Number.isInteger(obj.groundContactSourceY)'), 'query-only instance metadata is the generic second contact-row source');
assert(core.includes('bounds.y + bounds.h'), 'alpha-bound bottom remains the generic fallback contact row');
assert(core.includes('function crProjectHeightfieldVisibleSprite'), 'heightfield sprite projection owns a visible-bounds path');
assert(core.includes('sourcePixelsAboveGround'), 'projection scales from visible top to the resolved physical contact row');
assert(core.includes('projectedTopToGround'), 'worldHeight remains the visible top-to-ground distance');
assert(core.includes('function crHeightfieldProjectedContactEvidence'), 'grounding diagnostics sample actual projected alpha pixels');
assert(core.includes('sourceOpaquePixelsBelowContact'), 'grounding diagnostics record authored opaque pixels below the physical contact row');
assert(!core.includes('Math.ceil(proj.bottomY) - 1'), 'diagnostics do not falsely certify the destination rectangle bottom as contact');
assert(!core.includes('npc_unhoused_slumped_001'), 'core contains no seated-asset-specific contact branch');
assert(sprites.includes("const field = space === 'world' ? 'worldHeight' : 'displayHeightScale';"), 'NPC contract selects a declared height space');
assert(sprites.includes("if(entity && Number.isFinite(entity.worldHeight) && entity.worldHeight > 0) return entity.worldHeight;"), 'query calibration may select an explicit generic physical height');
assert(sprites.includes("if(kind === 'can') return CR_HEIGHTFIELD_SPRITE_WORLD_HEIGHTS.can;"), 'can world height uses the shared physical contract');
assert(renderer.includes("crHeightfieldSpriteWorldHeight('npc', npc)"), 'heightfield NPC rendering consumes world height');
assert(renderer.includes("crHeightfieldSpriteWorldHeight('can', can)"), 'heightfield can rendering consumes world height');
assert(renderer.includes('crHeightfieldPhysicalSpriteBounds(kind, obj, tex, hp)'), 'all heightfield billboard kinds share one bounds resolver');
assert(renderer.includes('crProjectHeightfieldVisibleSprite(obj, tex, hp, depth, hscr, bounds)'), 'all heightfield billboard kinds share one visible-bounds projector');
assert(renderer.includes('crHeightfieldRecordSpriteProjection(kind, obj, tex, proj)'), 'renderer records alpha-backed contact evidence through the generic projector');
assert(!renderer.includes('crProjectBillboardSprite'), 'heightfield does not use the legacy full-canvas billboard projector');
assert(!renderer.includes('npc_unhoused_slumped_001'), 'renderer contains no slumped-asset-specific grounding route');
assert(renderer.includes('proj.sourceY + (runStart - top) / proj.screenH * proj.sourceHeight'), 'drawImage source sampling uses the same visible-bounds coordinate system as alpha lookup');
assert(!renderer.includes('HEIGHT.can'), 'heightfield can rendering does not use the legacy display scalar');
assert(!gallery.includes('worldHeight:'), 'no Gallery environment fixture owns a physical-height override');
assert(sprites.includes("params.get('hfcalibration') === '1'"), 'calibration scene is query gated');
assert(sprites.includes("id: 'half-block'") && sprites.includes("id: 'full-wall'"), 'calibration scene includes both geometry references');
assert(sprites.includes("params.get('hfselectedreview') === '1'"), 'selected standing and seated review remains query gated');

class MockImage { set src(value){ this._src = value; this.complete = true; this.naturalWidth = 1; } get src(){ return this._src; } }
const runtimeSource = load('src/imported-handoff-assets/runtime-character-gallery-assets.js');
const sandbox = { Image: MockImage }; sandbox.globalThis = sandbox;
vm.runInNewContext(runtimeSource, sandbox);
const runtimeStanding = sandbox.SNC_RUNTIME_ASSET_REGISTRY[selectedStanding.assetId];
const runtimeSlumped = sandbox.SNC_RUNTIME_ASSET_REGISTRY[slumped.assetId];
assert.strictEqual(runtimeStanding.worldHeight, 0.78, 'generated work-jacket runtime record resolves the selected standing height');
assert.strictEqual(runtimeSlumped.worldHeight, 0.68, 'generated seated runtime record retains physical size');
assert.strictEqual(runtimeSlumped.groundContactSourceY, 184, 'generated seated runtime record carries generic contact metadata');

const eyeZ = 0.68, halfBlock = 0.5, can = 0.26;
assert(selectedStanding.worldHeight > eyeZ, 'selected standing world height exceeds the camera eye');
assert(can < halfBlock, 'can remains shorter than the half block');
assert(slumped.worldHeight > halfBlock && slumped.worldHeight < selectedStanding.worldHeight, 'slumped person is physically between block and selected standing heights');

for(const asset of manifest.assets){
  const bounds = asset.runtimeAlphaBounds, size = asset.runtimeSize;
  assert(bounds && size, `${asset.assetId}: runtime bounds metadata exists`);
  assert(bounds.x >= 0 && bounds.y >= 0 && bounds.w > 0 && bounds.h > 0, `${asset.assetId}: alpha bounds are positive and in range`);
  assert(bounds.x + bounds.w <= size.width && bounds.y + bounds.h <= size.height, `${asset.assetId}: alpha bounds stay inside the source canvas`);
  assert(bounds.y + bounds.h <= size.height, `${asset.assetId}: visible alpha bottom is a valid physical ground line`);
  if(asset.groundContactSourceY !== undefined) assert(bounds.y < asset.groundContactSourceY && asset.groundContactSourceY <= bounds.y + bounds.h, `${asset.assetId}: explicit contact row remains inside visible source bounds`);
}
assert(sprites.includes("params.get('hfcancomparison') === '1'"), 'one artifact exposes the three-can calibration comparison');
assert(sprites.includes("worldHeight: 0.24") && sprites.includes("worldHeight: 0.26") && sprites.includes("worldHeight: 0.28"), 'comparison has the requested explicit physical heights');

console.log(JSON.stringify({ pass: true, standingWorldHeight: selectedStanding.worldHeight, slumpedWorldHeight: slumped.worldHeight, canWorldHeight: can, cameraEyeZ: eyeZ }));
