'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { compileBuilding, emitAssetModule } = require('../tools/building-asset-compiler');

const root = path.resolve(__dirname, '..');
const buildingDir = path.join(root, 'authoring', 'buildings', 'dumpster_001');
const assetPath = path.join(root, 'src', 'imported-handoff-assets', 'dumpster_001.asset.js');
const tiledPath = path.join(root, 'authoring', 'levels', 'dumpster-pilot', 'dumpster-pilot.tmj');

const compiled = compileBuilding(buildingDir);
assert.equal(compiled.asset.id, 'dumpster_001');
assert.deepEqual(compiled.asset.footprint, { wCells: 1, hCells: 2 });
assert.equal(compiled.asset.heightScale, 0.3);
assert.equal(compiled.asset.alphaCutout, true);
assert.equal(compiled.asset.topCap, 'none');
assert.equal(compiled.asset.source.mode, 'single-reusable-face');
assert.deepEqual(Object.keys(compiled.asset.source.sourceHashes), ['face']);
assert.deepEqual(Object.keys(compiled.asset.faces), ['south', 'east', 'north', 'west']);
for (const direction of ['south', 'east', 'north', 'west']) assert.equal(compiled.asset.faces[direction].mirror, false,
  `dumpster ${direction} must reuse the one source face without mirroring`);
assert.equal(compiled.asset.faces.west.reuse, 'east');
assert.equal(compiled.asset.faces.west.mirror, false);
assert.equal(compiled.asset.atlas.width, 512);
assert.equal(compiled.asset.atlas.height, 256);
assert.equal(fs.readFileSync(assetPath, 'utf8'), emitAssetModule(compiled), 'generated dumpster asset must match canonical source');
function TestImage() {}
const sandbox = { Image: TestImage, Object };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(assetPath, 'utf8'), sandbox, { filename: assetPath });
assert.equal(sandbox.BITMAP_BUILDING_ASSET_REGISTRY.dumpster_001.id, 'dumpster_001');
assert.equal(sandbox.DUMPSTER_001.renderMode, 'importedWholeFaceAsset');

const map = JSON.parse(fs.readFileSync(tiledPath, 'utf8'));
assert.equal(map.tilewidth, 32);
assert.equal(map.tileheight, 32);
const collision = map.layers.find((layer) => layer.name === 'Collision');
const buildings = map.layers.find((layer) => layer.name === 'Buildings');
assert(collision && buildings);
const object = buildings.objects[0];
const property = (name) => object.properties.find((entry) => entry.name === name).value;
assert.equal(property('assetId'), 'dumpster_001');
assert.equal(property('widthCells'), 1);
assert.equal(property('depthCells'), 2);
assert.equal(property('heightScale'), 0.3);
assert.equal(object.width, 32);
assert.equal(object.height, 64);
assert.equal(collision.data.filter((value) => value === 1).length, 2);

process.stdout.write(`${JSON.stringify({
  pass: true,
  assetId: compiled.asset.id,
  footprint: compiled.asset.footprint,
  heightScale: compiled.asset.heightScale,
  atlasSha256: compiled.asset.atlas.sha256
})}\n`);
