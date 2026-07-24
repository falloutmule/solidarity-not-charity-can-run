'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { compileBuilding, emitAssetModule } = require('../tools/building-asset-compiler');
const { createFixture } = require('./building_authoring_test_helpers');

const fixture = createFixture();
const first = compileBuilding(fixture);
const second = compileBuilding(fixture);
assert.equal(first.asset.schema, 'snc-bitmap-building-asset-v1');
assert.equal(first.asset.renderMode, 'importedWholeFaceAsset');
assert.equal(first.asset.footprint.wCells, 3);
assert.equal(first.asset.footprint.hCells, 2);
assert.equal(first.asset.faces.west.reuse, 'east');
assert.equal(first.asset.faces.west.mirror, false);
assert.equal(first.asset.faceAssets.side_shared.mirrorSafe, false);
assert.equal(first.asset.atlas.sha256, second.asset.atlas.sha256);
assert.equal(emitAssetModule(first), emitAssetModule(second));
assert.ok(!emitAssetModule(first).includes('http://'));
assert.ok(!emitAssetModule(first).includes('https://'));
assert.equal(Object.keys(first.asset.source.sourceHashes).length, 3);

const invalid = JSON.parse(fs.readFileSync(path.join(fixture, 'building.json'), 'utf8'));
invalid.footprint.widthCells = 4;
fs.writeFileSync(path.join(fixture, 'building.json'), JSON.stringify(invalid), 'utf8');
assert.throws(() => compileBuilding(fixture), /front width must divide exactly|back width must match|side width must match/);

process.stdout.write(`${JSON.stringify({ pass: true, assetId: first.asset.id, atlasSha256: first.asset.atlas.sha256 })}\n`);
