'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'docs/development/SNC-VISUAL-LOCKS-001.json'), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileHash = (relativePath) => sha256(fs.readFileSync(path.join(root, relativePath)));

assert.strictEqual(lock.baseCommit, '7a8a931a1479c991d5aed32012a9d1f9c1fe6e8a', 'visual lock must name the Samsung-accepted source');
for(const [relativePath, expectedHash] of Object.entries(lock.protectedFiles)){
  assert.strictEqual(fileHash(relativePath), expectedHash, `${relativePath}: protected file hash changed`);
}
const artifact = fs.readFileSync(path.join(root, lock.candidateArtifact.path));
assert.strictEqual(artifact.length, lock.candidateArtifact.byteLength, 'candidate root artifact byte length changed');
assert.strictEqual(sha256(artifact), lock.candidateArtifact.sha256, 'candidate root artifact hash changed');

const characterManifest = JSON.parse(fs.readFileSync(path.join(root, 'authoring/characters/character-assets-v2.json'), 'utf8'));
const slumped = characterManifest.assets.find((asset) => asset.assetId === lock.locks.slumpedAssetId);
const standingReference = characterManifest.assets.find((asset) => asset.assetId === lock.locks.standingCompositeReferenceAssetId);
assert(slumped, 'locked seated asset exists');
assert(standingReference, 'Samsung-selected standing reference asset exists');
assert.strictEqual(slumped.worldHeightClass, 'seatedSlumped', 'locked seated class changed');
assert.strictEqual(slumped.groundContactSourceY, lock.locks.slumpedGroundContactSourceY, 'locked seated source contact row changed');
assert.strictEqual(standingReference.worldHeightClass, 'standingComposite', 'Samsung-selected standing reference class changed');
assert.strictEqual(characterManifest.assets.filter((asset) => asset.worldHeightClass === 'standingComposite').length, 15, 'standing/composite class membership changed');
assert.strictEqual(characterManifest.assets.filter((asset) => asset.worldHeightClass === 'seatedSlumped').length, 1, 'seated class membership changed');
assert(characterManifest.assets.every((asset) => !Object.hasOwn(asset, 'worldHeight')), 'source manifest regained a per-asset world-height authority');
assert.strictEqual(sha256(JSON.stringify(slumped)), lock.protectedRecords.slumpedManifestRecordSha256, 'locked seated manifest record changed');

class MockImage {
  set src(value){ this._src = value; this.complete = true; this.naturalWidth = 1; }
  get src(){ return this._src; }
}
const runtimeSource = fs.readFileSync(path.join(root, 'src/imported-handoff-assets/runtime-character-gallery-assets.js'), 'utf8');
const sandbox = { Image: MockImage }; sandbox.globalThis = sandbox;
vm.runInNewContext(runtimeSource, sandbox);
const runtimeSlumped = sandbox.SNC_RUNTIME_ASSET_REGISTRY[lock.locks.slumpedAssetId];
const runtimeStandingReference = sandbox.SNC_RUNTIME_ASSET_REGISTRY[lock.locks.standingCompositeReferenceAssetId];
const { image, ...runtimeSlumpedMetadata } = runtimeSlumped;
assert.strictEqual(runtimeSlumpedMetadata.worldHeight, lock.locks.slumpedWorldHeight, 'locked seated runtime height changed');
assert.strictEqual(runtimeSlumpedMetadata.groundContactSourceY, lock.locks.slumpedGroundContactSourceY, 'locked seated runtime source contact row changed');
assert.strictEqual(runtimeStandingReference.worldHeight, lock.locks.standingCompositeWorldHeight, 'Samsung-selected standing class height changed');
assert.strictEqual(runtimeStandingReference.worldHeightClass, 'standingComposite', 'Samsung-selected standing runtime class changed');
assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.SNC_CHARACTER_WORLD_HEIGHT_CLASSES)), { standingComposite: lock.locks.standingCompositeWorldHeight, seatedSlumped: lock.locks.slumpedWorldHeight }, 'generated class registry changed');
assert.strictEqual(sha256(JSON.stringify(runtimeSlumpedMetadata)), lock.protectedRecords.slumpedRuntimeRecordSha256, 'locked seated runtime record changed');

const core = fs.readFileSync(path.join(root, 'src/js/game-15a-variable-height-core.js'), 'utf8');
assert(core.includes('Object.freeze({ eyeZ: 0.68 })'), 'camera eye lock changed');
const canHeightMatch = core.match(/CR_HEIGHTFIELD_SPRITE_WORLD_HEIGHTS = Object\.freeze\(\{ can: ([\d.]+) \}\)/);
assert(canHeightMatch && Number(canHeightMatch[1]) === lock.locks.canWorldHeight, 'locked can physical height changed');
assert(core.includes('new Float32Array([0.0, 0.5, 1.0])'), 'height table lock changed');
const lowBlock = JSON.parse(fs.readFileSync(path.join(root, 'authoring/buildings/low_block_concrete_001/building.json'), 'utf8'));
assert.strictEqual(lowBlock.solidTopLevel, 1, 'half-block top level changed');
assert.strictEqual(lowBlock.collision, 'solid', 'half-block collision changed');

console.log(JSON.stringify({ pass: true, baseCommit: lock.baseCommit, artifactSha256: lock.candidateArtifact.sha256, slumpedWorldHeight: runtimeSlumped.worldHeight, slumpedGroundContactSourceY: slumped.groundContactSourceY }));
