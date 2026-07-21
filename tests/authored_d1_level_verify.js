'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'src/levels/district-01-authored.js');
const runtimePath = path.join(root, 'src/js/game-09a-authored-level-runtime.js');
const cityPath = path.join(root, 'src/js/game-09-section-3-city-generation.js');
const assetPath = path.join(root, 'src/imported-handoff-assets/custom_next_001.asset.js');

assert(fs.existsSync(dataPath), 'authored District 1 data module must exist');
assert(fs.existsSync(runtimePath), 'authored District 1 runtime module must exist');

const initialGame = { sentinel: 'unchanged' };
const initialPlayer = { x: -1, y: -1, angle: 99 };
const sandbox = {
  console,
  game: initialGame,
  player: initialPlayer,
  cfg: { baseTime: 95 },
  WALL: { BUILDING: 1, CONCRETE: 8 },
  Object, Array, JSON, Number, String, Math, Set, Map
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dataPath, 'utf8'), sandbox, { filename: dataPath });
vm.runInContext(fs.readFileSync(runtimePath, 'utf8'), sandbox, { filename: runtimePath });

const apiNames = [
  'sncGetAuthoredLevelDefinition', 'sncBuildLockedStaticLevel',
  'sncCanonicalizeAuthoredStatic', 'sncAuthoredStaticIdentity',
  'sncValidateAuthoredLevelDefinition', 'sncPrepareAuthoredLevelState',
  'sncCommitAuthoredLevelState', 'sncInstallAuthoredLevel',
  'sncCaptureAuthoredMutableOverlay', 'sncValidateAuthoredMutableOverlay',
  'sncApplyAuthoredMutableOverlay'
];
for (const name of apiNames) assert.strictEqual(typeof sandbox[name], 'function', `${name} global API`);
assert.strictEqual(sandbox.SNC_AUTHORED_LEVEL_ID, 'district-1-authored-v1');
assert.strictEqual(sandbox.SNC_AUTHORED_LEVEL_SCHEMA, 'snc-authored-level-static-v1');
assert.strictEqual(sandbox.SNC_AUTHORED_LEVEL_STATIC_BYTES, 3516);
assert.strictEqual(sandbox.SNC_AUTHORED_LEVEL_STATIC_SHA256, '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82');
assert.strictEqual(sandbox.SNC_AUTHORED_SAVE_SCHEMA, 'snc-authored-save-overlay-v1');

const definition = sandbox.sncGetAuthoredLevelDefinition('district-1-authored-v1');
assert.strictEqual(definition, sandbox.SNC_AUTHORED_LEVEL_01);
assert.strictEqual(sandbox.sncGetAuthoredLevelDefinition('unknown'), null);
function assertDeepFrozen(value) {
  if (!value || typeof value !== 'object') return;
  assert(Object.isFrozen(value), 'authored data must be deeply immutable');
  for (const child of Object.values(value)) assertDeepFrozen(child);
}
assertDeepFrozen(definition);

// The checked-in authored module is the public source of truth. Its locked
// identity constants preserve the approved level exactly without depending on
// a private migration proposal or a machine-specific cache path.
const lockedStatic = sandbox.sncBuildLockedStaticLevel(definition);
const canonical = sandbox.sncCanonicalizeAuthoredStatic(lockedStatic);
assert.strictEqual(Buffer.byteLength(canonical, 'utf8'), 3516, 'canonical static preimage bytes');
assert.strictEqual(crypto.createHash('sha256').update(canonical).digest('hex'), '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82', 'canonical static SHA-256');
assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.sncAuthoredStaticIdentity(definition.id))), {
  schema: 'snc-authored-level-static-v1', byteLength: 3516,
  sha256: '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82'
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.sncValidateAuthoredLevelDefinition(definition))), { pass: true, errors: [] });

const bad = JSON.parse(JSON.stringify(definition));
bad.mapRows[5] = bad.mapRows[5].replace('1', '0');
const beforeInvalid = JSON.stringify(sandbox.game);
const badValidation = sandbox.sncValidateAuthoredLevelDefinition(bad);
assert.strictEqual(badValidation.pass, false, 'drifted definition must fail validation');
assert(badValidation.errors.length > 0, 'invalid definition diagnostics');
assert.strictEqual(sandbox.sncPrepareAuthoredLevelState('unknown', { seed: 1, modifier: '' }), null);
assert.strictEqual(JSON.stringify(sandbox.game), beforeInvalid, 'failed prepare must not mutate game');

const prepared = sandbox.sncPrepareAuthoredLevelState(definition.id, { seed: 2468, modifier: 'shortage' });
assert(prepared && prepared.validated === true, 'detached state prepared');
assert.notStrictEqual(prepared.map, definition.mapRows, 'prepared map detached from definition');
assert.strictEqual(sandbox.game.sentinel, 'unchanged', 'prepare does not mutate game');
assert.strictEqual(sandbox.player.x, -1, 'prepare does not mutate player');
assert.strictEqual(prepared.scoreMult, 1.5, 'shortage score multiplier preserved');
assert.strictEqual(prepared.timeLeft, 95, 'base time policy preserved');
assert.strictEqual(sandbox.sncCommitAuthoredLevelState(prepared), true, 'prepared state commits');

const game = sandbox.game;
const player = sandbox.player;
assert.strictEqual(game.authoredLevelId, 'district-1-authored-v1');
assert.strictEqual(game.authoredLevelSchema, 'snc-authored-level-static-v1');
assert.strictEqual(game.authoredStaticSha256, '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82');
assert.strictEqual(game.seed, 2468);
assert.strictEqual(game.district, 1);
assert.strictEqual(game.modifier, 'shortage');
assert.strictEqual(game.scoreMult, 1.5);
assert.strictEqual(game.MAP_W, 40);
assert.strictEqual(game.MAP_H, 20);
assert.strictEqual(game.map.length, 20);
assert(game.map.every(row => row.length === 40), 'runtime map 40x20');
assert.strictEqual(game.wallShade.length, 20);
assert(game.wallShade.every(row => row.length === 40 && row.every(v => v === 0.5)), 'wallShade exact 20x40 neutral fill');
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.streetLayoutMeta)), { roadY0: 8, roadY1: 11, GW: 40, GH: 20 });
assert.deepStrictEqual([player.x, player.y, player.angle], [11, 10.5, -1.5707963267948966]);

const regs = Object.values(game.buildingRegistry);
assert.strictEqual(regs.length, 1, 'one building registry entry');
assert.deepStrictEqual(JSON.parse(JSON.stringify(regs[0])), {
  bid: 1, id: 'district-1-main-landmark', assetId: 'custom_next_001', renderMode: 'importedWholeFaceAsset',
  x: 8, y: 5, x0: 8, y0: 5, rotation: 0, widthCells: 6, depthCells: 3,
  w: 6, h: 3, footprint: { widthCells: 6, depthCells: 3 }, front: 'south'
});
assert.strictEqual(game._nextBuildingId, 2);
const ownerCells = [];
for (let y = 0; y < 20; y++) for (let x = 0; x < 40; x++) {
  const cell = game.buildingGrid[y][x];
  if (cell) ownerCells.push({ x, y, cell: JSON.parse(JSON.stringify(cell)) });
}
assert.strictEqual(ownerCells.length, 18, 'exactly 18 owner cells');
for (const { x, y, cell } of ownerCells) {
  assert.deepStrictEqual(cell, { bid: 1, lx: x - 8, ly: y - 5 }, 'exact local ownership');
  for (const forbidden of ['mid', 'proofZone', 'd1ProofSlotId', 'slotId', 'visualOnly']) assert(!(forbidden in cell), `owner cell excludes ${forbidden}`);
}
for (const forbidden of ['mid', 'proofZone', 'd1ProofSlotId', 'slotId', 'visualOnly']) assert(!(forbidden in regs[0]), `registry excludes ${forbidden}`);
assert.strictEqual(game.buildingMaterialGrid.length, 20);
assert(game.buildingMaterialGrid.every(row => row.length === 40 && row.every(v => v === null)), 'fresh empty material grid');
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.buildingMaterialComponents)), {});

assert.deepStrictEqual(JSON.parse(JSON.stringify(game.pickups.map(p => p.id))), Array.from({ length: 10 }, (_, i) => `pickup-${String(i).padStart(2, '0')}`));
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.npcs.map(n => n.id))), Array.from({ length: 6 }, (_, i) => `npc-${String(i).padStart(2, '0')}`));
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.props.map(p => p.id))), Array.from({ length: 12 }, (_, i) => `prop-${String(i).padStart(2, '0')}`));
assert.strictEqual(game.pickups.reduce((sum, p) => sum + p.amt, 0), 14);
assert.strictEqual(game.npcs.reduce((sum, n) => sum + n.need, 0), 10);
assert.strictEqual(game.quota, 4);
assert.strictEqual(game.helped, 0);
assert.strictEqual(game.delivered, 0);
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.exit)), { x: 36.5, y: 17, active: false });
assert.strictEqual(game.pickups.every(p => p.taken === false && p.wob === 0), true);
assert.strictEqual(game.npcs.every(n => n.helped === false && n.wob === 0 && n.thank === ''), true);
assert.strictEqual(game.props.every(p => p.wob === 0), true);
const needs = game.npcs.map(n => n.need).sort((a, b) => a - b);
assert.strictEqual(needs.slice(0, game.quota).reduce((a, b) => a + b, 0), 4, 'quota feasible with four cans');

function flood(map, sx, sy) {
  const seen = new Set([`${sx},${sy}`]);
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
      const key = `${nx},${ny}`;
      if (ny < 0 || nx < 0 || ny >= map.length || nx >= map[0].length || map[ny][nx] !== 0 || seen.has(key)) continue;
      seen.add(key); stack.push([nx, ny]);
    }
  }
  return seen;
}
const reachable = flood(game.map, player.x | 0, player.y | 0);
assert.strictEqual(reachable.size, 666, '666 reachable open cells');
const perimeter = [];
for (let x = 7; x <= 14; x++) { perimeter.push([x,4], [x,8]); }
for (let y = 5; y <= 7; y++) { perimeter.push([7,y], [14,y]); }
assert.strictEqual(perimeter.length, 22);
assert(perimeter.every(([x,y]) => game.map[y][x] === 0 && reachable.has(`${x},${y}`)), '22-cell open reachable inspection perimeter');
for (let y = 9; y >= 8; y--) assert.strictEqual(game.map[y][11], 0, 'clear spawn-to-front line of sight');

function hasClearance(x, y, radius) {
  for (let yy = Math.floor(y-radius); yy <= Math.floor(y+radius); yy++) for (let xx = Math.floor(x-radius); xx <= Math.floor(x+radius); xx++) {
    if (yy < 0 || xx < 0 || yy >= game.MAP_H || xx >= game.MAP_W || game.map[yy][xx] !== 0) {
      const nearestX = Math.max(xx, Math.min(x, xx + 1));
      const nearestY = Math.max(yy, Math.min(y, yy + 1));
      if (Math.hypot(x-nearestX, y-nearestY) < radius) return false;
    }
  }
  return true;
}
assert(hasClearance(player.x, player.y, 0.22), 'spawn clearance');
const entities = [
  ...game.pickups.map(v => [v, 0.30]), ...game.npcs.map(v => [v, 0.42]),
  ...game.props.map(v => [v, 0.28]), [game.exit, 0.50]
];
assert(entities.every(([v,r]) => game.map[v.y|0][v.x|0] === 0 && reachable.has(`${v.x|0},${v.y|0}`) && hasClearance(v.x,v.y,r)), 'all entities open, reachable, clearance-safe');
for (let i = 0; i < entities.length; i++) for (let j = i + 1; j < entities.length; j++) {
  assert(Math.hypot(entities[i][0].x-entities[j][0].x, entities[i][0].y-entities[j][0].y) >= 0.9, 'authored entities do not overlap');
}

// Ordinary collection saves after decrementing amt to zero but before setting taken.
// Capture must preserve immutable authored amounts while deriving effective taken state.
game.pickups[0].amt = 0;
game.pickups[0].taken = false;
game.pickups[1].amt = 1;
game.pickups[1].taken = false;
const pickupTimingOverlay = sandbox.sncCaptureAuthoredMutableOverlay(definition.id);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(pickupTimingOverlay.pickups.slice(0, 2))),
  [
    { id: 'pickup-00', taken: true, amt: 1 },
    { id: 'pickup-01', taken: false, amt: 2 }
  ],
  'capture derives ordinary-save timing taken state and retains immutable pickup amounts'
);
assert.strictEqual(typeof pickupTimingOverlay.pickups[0].taken, 'boolean', 'collected pickup taken is Boolean');
assert.strictEqual(typeof pickupTimingOverlay.pickups[1].taken, 'boolean', 'not-taken pickup taken is Boolean');
assert.strictEqual(
  sandbox.sncValidateAuthoredMutableOverlay(definition.id, pickupTimingOverlay).pass,
  true,
  'ordinary collected pickup capture validates against locked authored amounts'
);
const stablePickupId = game.pickups[0].id;
game.pickups[0].id = 'pickup-identity-mismatch';
assert.strictEqual(sandbox.sncCaptureAuthoredMutableOverlay(definition.id), null, 'capture fails closed on pickup identity mismatch');
game.pickups[0].id = stablePickupId;

const overlay = sandbox.sncCaptureAuthoredMutableOverlay(definition.id);
assert.strictEqual(overlay.schema, 'snc-authored-save-overlay-v1');
overlay.pickups[2].taken = true;
overlay.npcs[1].helped = true;
overlay.exit.active = true;
const validatedOverlay = sandbox.sncValidateAuthoredMutableOverlay(definition.id, overlay);
assert.strictEqual(validatedOverlay.pass, true);
assert.strictEqual(sandbox.sncInstallAuthoredLevel(definition.id, { seed: 99, modifier: 'clear' }), true, 'new/save reconstruction installer');
assert.strictEqual(sandbox.sncApplyAuthoredMutableOverlay(definition.id, validatedOverlay.value), true);
assert.strictEqual(game.pickups[2].taken, true);
assert.strictEqual(game.npcs[1].helped, true);
assert.strictEqual(game.exit.active, true);
const malformed = JSON.parse(JSON.stringify(overlay));
malformed.pickups.reverse();
assert.strictEqual(sandbox.sncValidateAuthoredMutableOverlay(definition.id, malformed).pass, false, 'reordered stable IDs fail closed');
const injectedStaticAuthority = JSON.parse(JSON.stringify(overlay));
injectedStaticAuthority.pickups[0].x = 999;
assert.strictEqual(sandbox.sncValidateAuthoredMutableOverlay(definition.id, injectedStaticAuthority).pass, false, 'overlay rejects injected authored coordinates');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} source exists`);
  let brace = source.indexOf('{', start), depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
}
const citySource = fs.readFileSync(cityPath, 'utf8');
const genCitySource = extractFunction(citySource, 'genCity');
let randomCalls = 0, installCalls = 0, grammarCalls = 0;
const routeSandbox = {
  game: {}, player: {}, cfg: { baseTime: 95 }, dbg: {}, STREET_FOOTPRINT_W: 40, STREET_FOOTPRINT_H: 20,
  SNC_AUTHORED_LEVEL_ID: 'district-1-authored-v1',
  mulberry32: () => () => { randomCalls++; return 0.5; },
  sncInstallAuthoredLevel: (id, opts) => { installCalls++; routeSandbox.game.timeLeft = 95; return id === 'district-1-authored-v1' && opts.seed === 77; },
  applyStreetBlockGrammar: () => { grammarCalls++; throw new Error('D2_PROCEDURAL_REACHED'); },
  Math, Array, Error
};
routeSandbox.globalThis = routeSandbox;
vm.createContext(routeSandbox);
vm.runInContext(`var RNG; ${genCitySource}`, routeSandbox);
routeSandbox.genCity(77, 1, 'shortage');
assert.strictEqual(installCalls, 1, 'D1 installs authored level');
assert.strictEqual(grammarCalls, 0, 'D1 bypasses procedural grammar');
assert.strictEqual(randomCalls, 0, 'D1 consumes no random values');
assert.strictEqual(routeSandbox.game.scoreMult, 1.5, 'genCity preserves shortage score multiplier before authored branch');
assert.throws(() => routeSandbox.genCity(88, 2, ''), /D2_PROCEDURAL_REACHED/, 'District 2 still reaches previous procedural body');
assert.strictEqual(grammarCalls, 1);

const authoredTexts = fs.readFileSync(dataPath, 'utf8') + fs.readFileSync(runtimePath, 'utf8');
assert.strictEqual((authoredTexts.match(/data:image\/png;base64,/g) || []).length, 0, 'authored modules do not duplicate bitmap data');
assert.strictEqual((fs.readFileSync(assetPath, 'utf8').match(/data:image\/png;base64,/g) || []).length, 1, 'canonical asset remains single bitmap authority');
assert(!/\b(?:Math\.random|RNG\s*\(|mulberry32\s*\()/.test(fs.readFileSync(dataPath, 'utf8')), 'declarative data has no random calls');

console.log(JSON.stringify({
  pass: true,
  levelId: game.authoredLevelId,
  staticPreimage: { bytes: Buffer.byteLength(canonical), sha256: crypto.createHash('sha256').update(canonical).digest('hex') },
  dimensions: [game.MAP_W, game.MAP_H], reachableOpenCells: reachable.size,
  buildingRegistryEntries: regs.length, ownerCells: ownerCells.length, inspectionPerimeterCells: perimeter.length,
  pickups: game.pickups.length, cans: game.pickups.reduce((n,p) => n+p.amt, 0), npcs: game.npcs.length,
  props: game.props.length, quota: game.quota, nextBuildingId: game._nextBuildingId,
  d1RandomCalls: randomCalls, d2ProceduralCalls: grammarCalls, bitmapCopiesInAuthoredModules: 0
}, null, 2));
