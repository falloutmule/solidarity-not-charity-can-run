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

assert.strictEqual(lock.baseCommit, '42ae5341827ad092ced4659834bcf5b78da2a23d', 'visual lock must name the accepted baseline');
for(const [relativePath, expectedHash] of Object.entries(lock.protectedFiles)){
  assert.strictEqual(fileHash(relativePath), expectedHash, `${relativePath}: protected file hash changed`);
}
const artifact = fs.readFileSync(path.join(root, lock.acceptedArtifact.path));
assert.strictEqual(artifact.length, lock.acceptedArtifact.byteLength, 'accepted root artifact byte length changed');
assert.strictEqual(sha256(artifact), lock.acceptedArtifact.sha256, 'accepted root artifact hash changed');

const characterManifest = JSON.parse(fs.readFileSync(path.join(root, 'authoring/characters/character-assets-v2.json'), 'utf8'));
const slumped = characterManifest.assets.find((asset) => asset.assetId === lock.locks.slumpedAssetId);
const selectedStanding = characterManifest.assets.find((asset) => asset.assetId === lock.locks.standingSelection.assetId);
assert(slumped, 'locked seated asset exists');
assert(selectedStanding, 'Samsung-selected standing asset exists');
assert.strictEqual(slumped.worldHeight, lock.locks.slumpedWorldHeight, 'locked seated physical height changed');
assert.strictEqual(selectedStanding.worldHeight, lock.locks.standingSelection.worldHeight, 'Samsung-selected standing physical height changed');
assert.strictEqual(sha256(JSON.stringify(slumped)), lock.protectedRecords.slumpedManifestRecordSha256, 'locked seated manifest record changed');

class MockImage {
  set src(value){ this._src = value; this.complete = true; this.naturalWidth = 1; }
  get src(){ return this._src; }
}
const runtimeSource = fs.readFileSync(path.join(root, 'src/imported-handoff-assets/runtime-character-gallery-assets.js'), 'utf8');
const sandbox = { Image: MockImage }; sandbox.globalThis = sandbox;
vm.runInNewContext(runtimeSource, sandbox);
const runtimeSlumped = sandbox.SNC_RUNTIME_ASSET_REGISTRY[lock.locks.slumpedAssetId];
const runtimeSelectedStanding = sandbox.SNC_RUNTIME_ASSET_REGISTRY[lock.locks.standingSelection.assetId];
const { image, ...runtimeSlumpedMetadata } = runtimeSlumped;
assert.strictEqual(runtimeSlumpedMetadata.worldHeight, lock.locks.slumpedWorldHeight, 'locked seated runtime height changed');
assert.strictEqual(runtimeSelectedStanding.worldHeight, lock.locks.standingSelection.worldHeight, 'Samsung-selected standing runtime height changed');
assert.strictEqual(sha256(JSON.stringify(runtimeSlumpedMetadata)), lock.protectedRecords.slumpedRuntimeRecordSha256, 'locked seated runtime record changed');

const core = fs.readFileSync(path.join(root, 'src/js/game-15a-variable-height-core.js'), 'utf8');
assert(core.includes('Object.freeze({ eyeZ: 0.68 })'), 'camera eye lock changed');
assert(core.includes('new Float32Array([0.0, 0.5, 1.0])'), 'height table lock changed');
const lowBlock = JSON.parse(fs.readFileSync(path.join(root, 'authoring/buildings/low_block_concrete_001/building.json'), 'utf8'));
assert.strictEqual(lowBlock.solidTopLevel, 1, 'half-block top level changed');
assert.strictEqual(lowBlock.collision, 'solid', 'half-block collision changed');

console.log(JSON.stringify({ pass: true, baseCommit: lock.baseCommit, artifactSha256: lock.acceptedArtifact.sha256, slumpedWorldHeight: slumped.worldHeight }));
