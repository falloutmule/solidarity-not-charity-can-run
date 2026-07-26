'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const assetPath = path.join(root, 'src', 'imported-handoff-assets', 'dumpster_001.asset.js');
const compatibilityPath = path.join(root, 'src', 'js', 'game-21c-short-building-gallery-compat.js');
const FACE_DIRS = ['south', 'east', 'north', 'west'];

const placement = {
  bid: 1,
  id: 'dumpster-pilot',
  assetId: 'dumpster_001',
  x: 3, y: 3, x0: 3, y0: 3,
  widthCells: 1, depthCells: 2,
  w: 1, h: 2,
  footprint: { widthCells: 1, depthCells: 2 },
  rotation: 0
};

const sandbox = {
  Object, Set, Number, Math,
  game: { buildingRegistry: { 1: placement } },
  player: { x: 2.55, y: 5.45 },
  npcSpriteHeight(){ return 1; },
  inverseRotateBitmapFace(worldFace, rotationQ){
    const index = FACE_DIRS.indexOf(worldFace);
    const q = ((rotationQ | 0) % 4 + 4) % 4;
    return index < 0 ? null : FACE_DIRS[(index + q) % 4];
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(assetPath, 'utf8'), sandbox, { filename: assetPath });

const registry = sandbox.BITMAP_BUILDING_ASSET_REGISTRY;
const original = registry.dumpster_001;
assert(original, 'generated dumpster asset must register before compatibility installation');
const atlasBytes = Buffer.from(original.atlas.dataUri.split(',')[1], 'base64');
const atlas = PNG.sync.read(atlasBytes);
assert.equal(atlas.data[3], 0, 'top-left atlas pixel used for suppressed faces must be fully transparent');

vm.runInContext(fs.readFileSync(compatibilityPath, 'utf8'), sandbox, { filename: compatibilityPath });
const descriptor = Object.getOwnPropertyDescriptor(registry, 'dumpster_001');
assert(descriptor && typeof descriptor.get === 'function', 'dumpster registry entry must become a live directional getter');

function suppressedFaces(asset){
  return FACE_DIRS.filter((face) => asset.faces[face] && asset.faces[face].role === 'single-plane-suppressed');
}

let variant = registry.dumpster_001;
assert.notStrictEqual(variant, original, 'active dumpster placement must receive a directional variant');
assert.equal(variant.singlePlaneCutout, true);
assert.equal(variant.selectedLocalFace, 'west');
assert.deepEqual(suppressedFaces(variant).sort(), ['east', 'north', 'south']);
assert.notEqual(variant.faces.west.role, 'single-plane-suppressed');
assert.equal(variant.faces.west.reuse, undefined, 'visible reused face must be resolved before other faces are suppressed');
for(const face of suppressedFaces(variant)){
  assert.deepEqual(JSON.parse(JSON.stringify(variant.faces[face].slice)), { x:0, y:0, w:1, h:1 });
}
let diagnostics = sandbox.crGetSinglePlaneCutoutDiagnostics();
assert.equal(diagnostics.active, true);
assert.equal(diagnostics.selectedWorldFace, 'west');
assert.equal(diagnostics.selectedLocalFace, 'west');
assert(diagnostics.lookupCount > 0);

sandbox.player.x = 3.5;
sandbox.player.y = 5.7;
variant = registry.dumpster_001;
assert.equal(variant.selectedLocalFace, 'south');
assert.deepEqual(suppressedFaces(variant).sort(), ['east', 'north', 'west']);
assert.notEqual(variant.faces.south.role, 'single-plane-suppressed');
diagnostics = sandbox.crGetSinglePlaneCutoutDiagnostics();
assert.equal(diagnostics.selectedWorldFace, 'south');
assert.equal(diagnostics.selectedLocalFace, 'south');

placement.rotation = 1;
sandbox.player.x = 2.55;
sandbox.player.y = 4;
variant = registry.dumpster_001;
assert.equal(sandbox.crGetSinglePlaneCutoutDiagnostics().selectedWorldFace, 'west');
assert.equal(variant.selectedLocalFace, 'south', 'quarter-turn placement must convert selected world face to local face');
placement.rotation = 0;

sandbox.game.buildingRegistry = {};
assert.strictEqual(registry.dumpster_001, original, 'without an active placement the canonical asset must remain available');

process.stdout.write(`${JSON.stringify({
  pass: true,
  transparentPixelAlpha: atlas.data[3],
  selectedWorldFace: diagnostics.selectedWorldFace,
  selectedLocalFace: diagnostics.selectedLocalFace,
  lookupCount: diagnostics.lookupCount
})}\n`);
