'use strict';

const assert = require('assert');
const { loadDistrict01, exportToTiled, fromTiled, semanticEqual, TILE_SIZE } = require('../tools/tiled-level-bridge');

const baseline = loadDistrict01();
const map = exportToTiled(baseline);
assert.equal(map.orientation, 'orthogonal');
assert.equal(map.infinite, false);
assert.equal(map.tilewidth, TILE_SIZE);
assert.equal(map.layers.find((layer) => layer.name === 'Collision').data.length, baseline.grid.width * baseline.grid.height);
const imported = fromTiled(map, baseline);
assert(semanticEqual(imported, baseline), 'District 1 must round-trip semantically through Tiled JSON');
const changed = JSON.parse(JSON.stringify(map));
changed.layers.find((layer) => layer.name === 'Buildings').objects[0].properties.find((property) => property.name === 'rotationQ').value = 4;
assert.throws(() => fromTiled(changed, baseline), /rotationQ/);
process.stdout.write(`${JSON.stringify({ pass: true, levelId: baseline.id, layers: map.layers.map((layer) => layer.name) })}\n`);
