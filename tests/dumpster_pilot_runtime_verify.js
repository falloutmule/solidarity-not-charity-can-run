'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'js', 'game-11-section-3b.js');
const tiledPath = path.join(root, 'authoring', 'levels', 'dumpster-pilot', 'dumpster-pilot.tmj');
const game = { authoredLevelId: 'district-1-authored-v1', authoredLevelSchema: 'snc-authored-level-static-v1', authoredStaticSha256: 'stale' };
const messages = [];
const sandbox = {
  Array, Boolean, Error, Math, Number, Object, String,
  WALL: { CONCRETE: 8, BRICK: 2, BUILDING: 1 },
  BITMAP_BUILDING_ASSET_REGISTRY: { dumpster_001: { id: 'dumpster_001', renderMode: 'importedWholeFaceAsset', footprint: { wCells: 1, hCells: 2 }, heightScale: 0.5 } },
  game,
  player: {},
  dbg: {},
  setMsg: (message) => messages.push(message),
  crClearBuildingModules: (width, height) => {
    game.buildingRegistry = {};
    game.buildingGrid = Array.from({ length: height }, () => new Array(width).fill(null));
    game.buildingMaterialGrid = Array.from({ length: height }, () => new Array(width).fill(null));
    game.buildingMaterialComponents = {};
    game._nextBuildingId = 1;
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(`${fs.readFileSync(sourcePath, 'utf8')}\nglobalThis.__dumpsterPilot = { CUSTOM_LEVELS, genDumpsterPilot };`, sandbox, { filename: sourcePath });

const definition = sandbox.__dumpsterPilot.CUSTOM_LEVELS.dumpster_pilot;
assert(definition, 'Dumpster Pilot must be a normal Special Level');
assert.equal(definition.generator, sandbox.__dumpsterPilot.genDumpsterPilot);
definition.generator();

assert.equal(game.MAP_W, 8);
assert.equal(game.MAP_H, 8);
assert.equal(game.authoredLevelId, null, 'pilot must not inherit District 1 save identity');
assert.equal(game.authoredLevelSchema, null);
assert.equal(game.authoredStaticSha256, null);
assert.equal(game.map[3][3], sandbox.WALL.BUILDING);
assert.equal(game.map[4][3], sandbox.WALL.BUILDING);
assert.equal(Object.keys(game.buildingRegistry).length, 1);
const building = game.buildingRegistry[1];
assert.deepEqual(JSON.parse(JSON.stringify(building.footprint)), { widthCells: 1, depthCells: 2 });
assert.equal(building.assetId, 'dumpster_001');
assert.equal(building.renderMode, 'importedWholeFaceAsset');
assert.equal(building.rotation, 0);
assert.equal(building.heightScale, 0.5);
assert.deepEqual(JSON.parse(JSON.stringify(game.buildingGrid[3][3])), { bid: 1, lx: 0, ly: 0 });
assert.deepEqual(JSON.parse(JSON.stringify(game.buildingGrid[4][3])), { bid: 1, lx: 0, ly: 1 });
assert.equal(game.map[Math.floor(sandbox.player.y)][Math.floor(sandbox.player.x)], 0, 'player start must be walkable');
assert.deepEqual(JSON.parse(JSON.stringify(game.npcs)), [{ x: 3.5, y: 2.5, kind: 'family', helped: false }],
  'pilot must place an ordinary world sprite behind the short dumpster');
assert.deepEqual(JSON.parse(JSON.stringify(game.exit)), { x: 3.5, y: 2.5, active: true },
  'pilot must place tall world content beyond the short dumpster');
assert(messages.some((message) => message.includes('Dumpster Pilot')));

const tiled = JSON.parse(fs.readFileSync(tiledPath, 'utf8'));
const object = tiled.layers.find((layer) => layer.name === 'Buildings').objects[0];
const valueOf = (name) => object.properties.find((property) => property.name === name).value;
assert.equal(building.x, object.x / tiled.tilewidth, 'runtime x must follow the Tiled placement');
assert.equal(building.y, object.y / tiled.tileheight, 'runtime y must follow the Tiled placement');
assert.equal(building.assetId, valueOf('assetId'));
assert.equal(building.widthCells, valueOf('widthCells'));
assert.equal(building.depthCells, valueOf('depthCells'));
assert.equal(building.heightScale, valueOf('heightScale'));

process.stdout.write(`${JSON.stringify({ pass: true, level: definition.id, assetId: building.assetId, footprint: building.footprint })}\n`);
