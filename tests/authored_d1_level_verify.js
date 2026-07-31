'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const levelPath = path.join(root, 'src/levels/district-01-authored.js');
const runtimePath = path.join(root, 'src/js/game-09a-authored-level-runtime.js');
const actionPath = path.join(root, 'src/js/game-19-section-10-gameplay-actions.js');
const updatePath = path.join(root, 'src/js/game-20-section-11-update-input.js');
const mobileInputPath = path.join(root, 'src/js/game-06-section-2b-mobile-touch-input.js');
const mobileMenuPath = path.join(root, 'src/js/game-07-section-2c-responsive-mobile-menu-html-overlay.js');
const mainLoopPath = path.join(root, 'src/js/game-22-section-13-main-loop.js');

function loadWorld(){
  const sandbox = {
    Object, Array, JSON, Number, String, Math, Uint16Array, Uint8Array, Map, Set, Error, TextEncoder,
    WALL: { BUILDING: 1, CONCRETE: 8 }, cfg: { baseTime: 95 },
    game: {}, player: { x: -1, y: -1, angle: 0, maxCans: 10, cans: 0 },
    CR_VERTICAL_PROFILE_IDS: { EMPTY: 0, FULL_LEGACY: 2 },
    SOLID_HEIGHT_ASSET_REGISTRY: { low_block_concrete_001: { id: 'low_block_concrete_001', renderMode: 'solidHeightfield' } },
    crHeightfieldProfileForSolidAsset: () => ({ id: 3 })
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(levelPath, 'utf8'), sandbox, { filename: levelPath });
  vm.runInContext(fs.readFileSync(runtimePath, 'utf8'), sandbox, { filename: runtimePath });
  return sandbox;
}
function flood(map, sx, sy){
  const seen = new Set([`${sx},${sy}`]), stack = [[sx, sy]];
  while(stack.length){
    const [x, y] = stack.pop();
    for(const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
      const key = `${nx},${ny}`;
      if(nx < 0 || ny < 0 || ny >= map.length || nx >= map[0].length || map[ny][nx] !== 0 || seen.has(key)) continue;
      seen.add(key); stack.push([nx, ny]);
    }
  }
  return seen;
}

const sandbox = loadWorld();
const definition = sandbox.sncGetAuthoredLevelDefinition('district-1-authored-v1');
assert(definition, 'District 1 authored definition exists');
assert.strictEqual(definition.name, 'World 1, Level 1 — The Stand');
assert.strictEqual(definition.canSockets.length, 9, 'nine valid sockets are authored');
assert.strictEqual(definition.pickupCount, 5, 'five sockets are selected per run');
assert.deepStrictEqual(JSON.parse(JSON.stringify(definition.npcs.map(n => n.need))), [1,3,1], 'recipient needs are 1/3/1');
assert.strictEqual(definition.requiredCans, 5);
assert.strictEqual(definition.carryingCapacity, 3);
assert.strictEqual(definition.timerExpiryPolicy, 'continue');
assert(fs.readFileSync(updatePath, 'utf8').includes("if(game.timerExpiryPolicy === 'continue') game.timeLeft = 0;"), 'expired The Stand timer clamps without ending the run');
assert(fs.readFileSync(mobileInputPath, 'utf8').includes("typeof DEBUG !== 'undefined' && DEBUG"), 'normal portrait menu hides the build identifier outside debug mode');
assert(fs.readFileSync(mobileMenuPath, 'utf8').includes("typeof DEBUG !== 'undefined' && DEBUG ? `<div class=\"rclose\""), 'title build identifier remains debug-only');
assert(fs.readFileSync(mainLoopPath, 'utf8').includes("if(!crGalleryHudActive()){\n    if(typeof DEBUG !== 'undefined' && DEBUG){") && fs.readFileSync(mainLoopPath, 'utf8').includes("if(typeof DEBUG !== 'undefined' && DEBUG){\n    ctx.fillStyle = '#4a4035';"), 'portrait dashboard build identifiers remain debug-only');
assert.strictEqual(definition.environmentObjects.length, 6, 'two three-block planter clusters are authored');
assert(definition.environmentObjects.every(row => row.assetId === 'low_block_concrete_001'), 'accepted low-block asset is used');
assert.deepStrictEqual(Array.from(definition.buildings, row => row.assetId), ['custom_next_001', 'strip_mall_001'], 'stand and outer-route market use supported bitmap buildings');
const signboards = definition.props.filter(row => row.kind === 'signboard');
assert.deepStrictEqual(JSON.parse(JSON.stringify(signboards.map(row => [row.assetId, row.signSizeClass]))), [
  ['sign_snc_can_station_001', 'landmark'], ['sign_drop_off_cans_001', 'tall'], ['sign_neighbor_1_can_001', 'standard'],
  ['sign_family_3_cans_001', 'standard'], ['sign_summer_loop_market_001', 'landmark'], ['sign_neighbor_1_can_001', 'standard']
], 'all authored signboards map to the supplied runtime art and data-level size classes');
assert.strictEqual(signboards.filter(row => row.assetId === 'sign_neighbor_1_can_001').length, 2, 'one-can sign serves both individual recipient stops');
assert.deepStrictEqual(Array.from(definition.environmentObjects, row => `${row.x},${row.y}`), ['10,10', '10,12', '12,10', '28,12', '30,12', '30,14'], 'planter clusters preserve open gaps between their visible ends');
const foliage = definition.props.filter(row => row.assetId && row.assetId.startsWith('foliage_'));
assert.strictEqual(foliage.length, 17, 'The Stand uses a restrained authored foliage set');
assert.deepStrictEqual(Array.from(new Set(foliage.map(row => row.assetId))).sort(), [
  'foliage_bush_low_001', 'foliage_grass_patch_long_001', 'foliage_grass_tuft_medium_001', 'foliage_groundcover_wide_001',
  'foliage_tree_low_canopy_001', 'foliage_tree_round_large_001', 'foliage_tree_slender_001'
], 'authored foliage maps only to the selected runtime assets');
assert.strictEqual(foliage.filter(row => row.assetId.startsWith('foliage_tree_')).length, 4, 'four trees create route landmarks without a forest');
assert(foliage.every(row => definition.mapRows[Math.floor(row.y)][Math.floor(row.x)] === '0'), 'decorative foliage never claims a collision cell');

const canonical = sandbox.sncCanonicalizeAuthoredStatic(sandbox.sncBuildLockedStaticLevel(definition));
assert.strictEqual(Buffer.byteLength(canonical), 6937, 'static byte identity is locked');
assert.strictEqual(crypto.createHash('sha256').update(canonical).digest('hex'), 'c0b10dd27ac969ce3209556839fc0d8048a8820f36c46c051bb97ae84fc863fb', 'static hash identity is locked');
assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.sncValidateAuthoredLevelDefinition(definition))), { pass: true, errors: [] });

for(const seed of [1, 2468, 717, 9001]){
  const first = sandbox.sncSelectedCanSockets(definition.id, seed);
  const second = sandbox.sncSelectedCanSockets(definition.id, seed);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(second)), 'socket selection is deterministic');
  assert.strictEqual(first.length, 5, 'exactly five cans spawn');
  assert.strictEqual(new Set(first.map(row => row.id)).size, 5, 'selected sockets are unique');
  assert(first.every(row => definition.canSockets.some(socket => socket.id === row.id && socket.x === row.x && socket.y === row.y) && row.amt === 1), 'selected sockets are authored and one-can');
}

const prepared = sandbox.sncPrepareAuthoredLevelState(definition.id, { seed: 2468, modifier: 'clear' });
assert(prepared && prepared.validated, 'The Stand prepares without mutating live state');
assert.strictEqual(prepared.carryingCapacity, 3);
assert.strictEqual(prepared.requiredCans, 5);
assert.strictEqual(prepared.verticalProfileGrid.length, 800, 'heightfield profile grid covers The Stand');
assert.strictEqual(Array.from(prepared.verticalProfileGrid).filter(id => id === 3).length, 6, 'six half-height low blocks are profiled');
assert.strictEqual(sandbox.sncCommitAuthoredLevelState(prepared), true, 'The Stand commits');
const game = sandbox.game, player = sandbox.player;
assert.strictEqual(player.maxCans, 3, 'D1 capacity is capped at three');
assert.strictEqual(game.pickups.length, 5);
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.npcs.map(n => n.need))), [1,3,1]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.exit)), { x: 20.5, y: 10.7, active: false });

const reachable = flood(game.map, player.x | 0, player.y | 0);
for(const entity of [...game.pickups, ...game.npcs, game.exit]) assert(reachable.has(`${entity.x|0},${entity.y|0}`), `reachable objective at ${entity.x},${entity.y}`);
for(const [x, y] of [[11,10],[15,12],[24,12],[29,10],[5,5],[34,15],[2,10],[37,10],[20,2],[20,17]]) assert(reachable.has(`${x},${y}`), `usable central or outer loop marker ${x},${y}`);

const overlay = sandbox.sncCaptureAuthoredMutableOverlay(definition.id);
overlay.pickups[0].taken = true; overlay.npcs[1].helped = true; overlay.exit.active = true;
const checked = sandbox.sncValidateAuthoredMutableOverlay(definition.id, overlay, game.seed);
assert(checked.pass, 'seeded authored overlay validates');
assert(sandbox.sncInstallAuthoredLevel(definition.id, { seed: game.seed, modifier: 'clear' }), 'seeded authored world reconstructs');
assert(sandbox.sncApplyAuthoredMutableOverlay(definition.id, checked.value, game.seed), 'seeded authored overlay reapplies');
assert.strictEqual(game.pickups.filter(row => row.taken).length, 1);
assert.strictEqual(game.npcs.filter(row => row.helped).length, 1);

const actionSandbox = {
  Math, Number, Object, Array, Set, Map, console, innerWidth: 400, innerHeight: 800, STATE: { UPGRADE: 'upgrade' }, state: 'play', RNG: () => 0.5,
  game: { pickups: [], popups: [], run: { cansDelivered: 0, helpedByKind: {} }, flash: 0, handoffFx: 0, totalScore: 0, scoreMult: 1, quota: 3, requiredCans: 5, helped: 0, delivered: 0, exit: { x: 1, y: 1, active: false } },
  player: { cans: 0, giveCD: 0, baseGiveCD: 0.45, handoffBonus: 0 },
  SAVE: { save(){} }, addPopup(){}, crTriggerSoundCue(){}, npcMechanicKind(kind){ return kind; }, setMsg(){}, interactionLineClear(){ return { clear: true }; }, pickHallThankLine(){ return ''; }, completeDistrict(){ actionSandbox.completed = true; }, completed: false
};
actionSandbox.globalThis = actionSandbox; actionSandbox.window = actionSandbox; vm.createContext(actionSandbox);
vm.runInContext(`${fs.readFileSync(actionPath, 'utf8')}\nglobalThis.__giveCan=giveCan; globalThis.__tickExit=tickExit;`, actionSandbox, { filename: actionPath });
actionSandbox.player.x = 1; actionSandbox.player.y = 1; actionSandbox.__tickExit();
assert.strictEqual(actionSandbox.completed, false, 'inactive portal cannot finish early');
for(const npc of [{ kind: 'hungry', need: 1 }, { kind: 'family', need: 3 }, { kind: 'elder', need: 1 }]){
  actionSandbox.player.cans = npc.need; actionSandbox.player.giveCD = 0; actionSandbox.game.aimNpc = npc; actionSandbox.__giveCan();
}
assert.strictEqual(actionSandbox.game.delivered, 5, 'delivery totals exactly five cans');
assert.strictEqual(actionSandbox.game.helped, 3, 'all three recipients are helped');
assert.strictEqual(actionSandbox.game.exit.active, true, 'final delivery activates portal');
actionSandbox.player.x = 1; actionSandbox.player.y = 1; actionSandbox.__tickExit();
assert.strictEqual(actionSandbox.state, 'upgrade', 'entering active portal completes level');

console.log(JSON.stringify({ pass: true, level: definition.name, staticBytes: Buffer.byteLength(canonical), reachableCells: reachable.size, selectedCans: game.pickups.length, lowBlocks: definition.environmentObjects.length }, null, 2));
