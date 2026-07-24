'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const TILE_SIZE = 32;
const D1_PATH = path.join(ROOT, 'src', 'levels', 'district-01-authored.js');
const BUILD_MANIFEST_PATH = path.join(ROOT, 'src', 'build-manifest.json');

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assert(value, message) { if (!value) throw new Error(message); }
function loadDistrict01() {
  const sandbox = { Object, Array, JSON, Number, String, Math };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(D1_PATH, 'utf8'), sandbox, { filename: D1_PATH });
  return clone(sandbox.SNC_AUTHORED_LEVEL_01);
}
function properties(values) { return Object.entries(values).map(([name, value]) => ({ name, type: typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string', value })); }
function valueOf(object, name) { const found = (object.properties || []).find((property) => property.name === name); return found && found.value; }
function required(object, name) { const value = valueOf(object, name); assert(value !== undefined, `${object.name || object.type} requires ${name}`); return value; }
function currentAssetIds() {
  const manifest = JSON.parse(fs.readFileSync(BUILD_MANIFEST_PATH, 'utf8'));
  const ids = new Set();
  for (const relativePath of manifest.scripts.filter((entry) => entry.startsWith('src/imported-handoff-assets/'))) {
    const text = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    const match = text.match(/"id":"([a-z][a-z0-9_]*)"/);
    if (match) ids.add(match[1]);
  }
  return ids;
}
function objectLayer(name, objects) { return { id: 0, name, type: 'objectgroup', visible: true, opacity: 1, x: 0, y: 0, offsetx: 0, offsety: 0, draworder: 'topdown', objects }; }
function makeObject(id, name, type, x, y, propertiesValue, width = 0, height = 0) { return { id, name, type, x, y, width, height, rotation: 0, visible: true, point: width === 0 && height === 0, properties: properties(propertiesValue) }; }

function exportToTiled(level) {
  const collision = level.mapRows.flatMap((row) => Array.from(row, (cell) => cell === '0' ? 0 : cell === '1' ? 1 : 2));
  let id = 1;
  const buildingObjects = level.buildings.map((building) => {
    const object = makeObject(id++, building.id, 'building', building.x * TILE_SIZE, building.y * TILE_SIZE, { assetId: building.assetId, rotationQ: building.rotation, widthCells: building.widthCells, depthCells: building.depthCells, front: building.front }, building.widthCells * TILE_SIZE, building.depthCells * TILE_SIZE);
    object.rotation = building.rotation * 90;
    return object;
  });
  const pickupObjects = level.pickups.map((item, index) => makeObject(id++, `pickup-${String(index).padStart(2, '0')}`, 'pickup', item.x * TILE_SIZE, item.y * TILE_SIZE, { amt: item.amt }));
  const npcObjects = level.npcs.map((item, index) => makeObject(id++, `npc-${String(index).padStart(2, '0')}`, 'npc', item.x * TILE_SIZE, item.y * TILE_SIZE, { kind: item.kind, need: item.need }));
  const propObjects = level.props.map((item, index) => makeObject(id++, `prop-${String(index).padStart(2, '0')}`, 'prop', item.x * TILE_SIZE, item.y * TILE_SIZE, { kind: item.kind }));
  const player = makeObject(id++, 'player-start', 'player-start', level.playerStart.x * TILE_SIZE, level.playerStart.y * TILE_SIZE, { angleRadians: level.playerStart.angleRadians, faces: level.playerStart.faces });
  const exit = makeObject(id++, 'exit', 'exit', level.exit.x * TILE_SIZE, level.exit.y * TILE_SIZE, { active: level.exit.active });
  const metadata = makeObject(id++, 'metadata', 'metadata', 0, 0, { levelId: level.id, district: level.district, quota: level.quota, timeLeftPolicy: level.timeLeftPolicy, scoreMultiplierPolicy: level.scoreMultiplierPolicy, staticSchema: level.staticSchema });
  return {
    compressionlevel: -1, infinite: false, layers: [
      { id: 1, name: 'Collision', type: 'tilelayer', visible: true, opacity: 1, x: 0, y: 0, width: level.grid.width, height: level.grid.height, data: collision, properties: properties({ sncEncoding: '0=walkable,1=building,2=concrete' }) },
      objectLayer('Buildings', buildingObjects), objectLayer('PlayerStart', [player]), objectLayer('Pickups', pickupObjects), objectLayer('NPCs', npcObjects), objectLayer('Props', propObjects), objectLayer('Exit', [exit]), objectLayer('Metadata', [metadata])
    ],
    nextlayerid: 9, nextobjectid: id, orientation: 'orthogonal', renderorder: 'right-down', tiledversion: '1.11', tileheight: TILE_SIZE, tilewidth: TILE_SIZE, type: 'map', version: '1.10', width: level.grid.width, height: level.grid.height
  };
}
function layersByName(map) { return Object.fromEntries((map.layers || []).map((layer) => [layer.name, layer])); }
function readObjects(layer, expectedType) { assert(layer && layer.type === 'objectgroup', `${expectedType} object layer is required`); return layer.objects || []; }
function fromTiled(map, baseline) {
  assert(map && map.type === 'map' && map.orientation === 'orthogonal' && map.infinite === false, 'Tiled map must be a finite orthogonal map');
  assert(map.tilewidth === TILE_SIZE && map.tileheight === TILE_SIZE, 'Tiled map grid must be 32×32');
  assert(map.width === baseline.grid.width && map.height === baseline.grid.height, 'Tiled dimensions must match the authored level');
  const layers = layersByName(map);
  const collision = layers.Collision;
  assert(collision && collision.type === 'tilelayer' && collision.data.length === map.width * map.height, 'Collision tile layer is required');
  const rows = [];
  for (let y = 0; y < map.height; y += 1) rows.push(collision.data.slice(y * map.width, (y + 1) * map.width).map((value) => value === 0 ? '0' : value === 1 ? '1' : value === 2 ? '8' : (() => { throw new Error(`unknown Collision tile value ${value}`); })()).join(''));
  const buildingObjects = readObjects(layers.Buildings, 'Buildings');
  assert(buildingObjects.length === baseline.buildings.length, 'building count must match baseline for District 1 companion import');
  const buildings = buildingObjects.map((object) => {
    assert(object.type === 'building', 'Buildings layer may contain only building objects');
    assert(object.x % TILE_SIZE === 0 && object.y % TILE_SIZE === 0, 'building must snap to the 32px grid');
    const rotation = Number(required(object, 'rotationQ'));
    assert(Number.isInteger(rotation) && rotation >= 0 && rotation <= 3, 'rotationQ must be 0..3');
    const widthCells = Number(required(object, 'widthCells')), depthCells = Number(required(object, 'depthCells'));
    assert(object.width === widthCells * TILE_SIZE && object.height === depthCells * TILE_SIZE, 'building footprint dimensions must match properties');
    const assetId = required(object, 'assetId');
    assert(currentAssetIds().has(assetId), `unknown building asset ID: ${assetId}`);
    assert(required(object, 'front'), 'building front is required');
    return { id: object.name, assetId, x: object.x / TILE_SIZE, y: object.y / TILE_SIZE, rotation, widthCells, depthCells, front: valueOf(object, 'front') };
  });
  const pointItems = (name, type, convert) => readObjects(layers[name], name).map((object) => { assert(object.type === type && object.point, `${name} must use ${type} point objects`); assert(Number.isFinite(object.x) && Number.isFinite(object.y), `${name} position must be finite`); return convert(object); });
  const player = readObjects(layers.PlayerStart, 'PlayerStart'); const exits = readObjects(layers.Exit, 'Exit'); const metadata = readObjects(layers.Metadata, 'Metadata');
  assert(player.length === 1 && exits.length === 1 && metadata.length === 1, 'PlayerStart, Exit, and Metadata require exactly one object');
  const imported = clone(baseline);
  imported.mapRows = rows; imported.buildings = buildings;
  imported.pickups = pointItems('Pickups', 'pickup', (object) => ({ x: object.x / TILE_SIZE, y: object.y / TILE_SIZE, amt: Number(required(object, 'amt')) }));
  imported.npcs = pointItems('NPCs', 'npc', (object) => ({ x: object.x / TILE_SIZE, y: object.y / TILE_SIZE, kind: required(object, 'kind'), need: Number(required(object, 'need')) }));
  imported.props = pointItems('Props', 'prop', (object) => ({ x: object.x / TILE_SIZE, y: object.y / TILE_SIZE, kind: required(object, 'kind') }));
  imported.playerStart = { x: player[0].x / TILE_SIZE, y: player[0].y / TILE_SIZE, angleRadians: Number(required(player[0], 'angleRadians')), faces: required(player[0], 'faces') };
  imported.exit = { x: exits[0].x / TILE_SIZE, y: exits[0].y / TILE_SIZE, active: Boolean(required(exits[0], 'active')) };
  for (const [name, expected] of Object.entries({ levelId: baseline.id, district: baseline.district, staticSchema: baseline.staticSchema, timeLeftPolicy: baseline.timeLeftPolicy, scoreMultiplierPolicy: baseline.scoreMultiplierPolicy })) assert(required(metadata[0], name) === expected, `Metadata ${name} does not match District 1 authority`);
  imported.quota = Number(required(metadata[0], 'quota'));
  const occupied = new Set();
  for (const building of buildings) for (let y = building.y; y < building.y + building.depthCells; y += 1) for (let x = building.x; x < building.x + building.widthCells; x += 1) { const key = `${x},${y}`; assert(rows[y] && rows[y][x] === '1', 'building footprint must own Collision building cells'); assert(!occupied.has(key), 'building footprints must not overlap'); occupied.add(key); }
  for (const entity of [imported.playerStart, imported.exit, ...imported.pickups, ...imported.npcs, ...imported.props]) { const x = Math.floor(entity.x), y = Math.floor(entity.y); assert(rows[y] && rows[y][x] === '0', 'spawn, exit, and entities must be in walkable Collision cells'); }
  return imported;
}
function canonical(value) { if (Array.isArray(value)) return value.map(canonical); if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])); return value; }
function semanticEqual(left, right) { return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right)); }

module.exports = { ROOT, TILE_SIZE, loadDistrict01, exportToTiled, fromTiled, semanticEqual };
