'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const persistencePath = path.join(root, 'src/js/game-14-section-5b-local-persistence.js');
const source = fs.readFileSync(persistencePath, 'utf8');
const activeSaveSource = source.slice(source.indexOf('// --- ACTIVE RUN SAVE'));
assert(activeSaveSource.startsWith('// --- ACTIVE RUN SAVE'), 'active save section must be present');

const LEVEL_ID = 'district-1-authored-v1';
const LEVEL_SCHEMA = 'snc-authored-level-static-v1';
const STATIC_SHA = '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82';
const OVERLAY_SCHEMA = 'snc-authored-save-overlay-v1';
const pickupAmounts = [1, 2, 1, 2, 1, 2, 1, 1, 2, 1];
const pickupCoords = [[4.5,10.5],[5.5,15.5],[10.5,15.5],[16.5,10.5],[18.5,4.5],[22.5,14.5],[26.5,6.5],[30.5,11.5],[34.5,4.5],[35.5,16.5]];
const npcRecords = [[4.5,5.5,'hungry',1],[18.5,8.5,'family',3],[23.5,4.5,'elder',1],[27.5,14.5,'volunteer',1],[33.5,8.5,'hungry',1],[32.5,15.5,'family',3]];
const propRecords = [[5.5,9,'bench'],[16,5,'mural_panel'],[16,8.5,'utility_box'],[5.5,3.5,'scrub_bush'],[16.5,3,'agave'],[6.5,14,'cooler'],[18,12.5,'crate_stack'],[24,10,'shopping_cart'],[30,4,'mailbox'],[34,13,'tarp_bundle'],[21,17,'signboard'],[28,17,'sleeping_bag_pile']];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function pickupId(i) { return `pickup-${String(i).padStart(2, '0')}`; }
function npcId(i) { return `npc-${String(i).padStart(2, '0')}`; }
function propId(i) { return `prop-${String(i).padStart(2, '0')}`; }

function exactGrid() {
  const grid = Array.from({ length: 20 }, () => Array(40).fill(null));
  for (let ly = 0; ly < 3; ly++) for (let lx = 0; lx < 6; lx++) grid[5 + ly][8 + lx] = { bid: 1, lx, ly };
  return grid;
}

function installBaseline(sandbox) {
  const { game, player } = sandbox;
  game.authoredLevelId = LEVEL_ID;
  game.authoredLevelSchema = LEVEL_SCHEMA;
  game.authoredStaticSha256 = STATIC_SHA;
  game.map = Array.from({ length: 20 }, (_, y) => Array.from({ length: 40 }, (_, x) => y === 0 || y === 19 || x === 0 || x === 39 ? 8 : (x >= 8 && x <= 13 && y >= 5 && y <= 7 ? 1 : 0)));
  game.MAP_W = 40; game.MAP_H = 20;
  game.wallShade = Array.from({ length: 20 }, () => Array(40).fill(0.5));
  game.streetLayoutMeta = { roadY0: 8, roadY1: 11, GW: 40, GH: 20 };
  game.buildingRegistry = { 1: { bid: 1, id: 'district-1-main-landmark', assetId: 'custom_next_001', renderMode: 'importedWholeFaceAsset', x: 8, y: 5, x0: 8, y0: 5, rotation: 0, widthCells: 6, depthCells: 3, w: 6, h: 3, footprint: { widthCells: 6, depthCells: 3 }, front: 'south' } };
  game.buildingGrid = exactGrid();
  game._nextBuildingId = 2;
  game.pickups = pickupAmounts.map((amt, i) => ({ id: pickupId(i), x: pickupCoords[i][0], y: pickupCoords[i][1], amt, taken: false, wob: 0 }));
  game.npcs = npcRecords.map((row, i) => ({ id: npcId(i), x: row[0], y: row[1], kind: row[2], need: row[3], helped: false, wob: 0, thank: '' }));
  game.props = propRecords.map((row, i) => ({ id: propId(i), x: row[0], y: row[1], kind: row[2], wob: 0 }));
  game.exit = { x: 36.5, y: 17, active: false };
  game.quota = 4; game.helped = 0; game.delivered = 0;
  player.x = 11; player.y = 10.5; player.angle = -Math.PI / 2;
}

function makeSandbox() {
  const storage = new Map();
  const calls = [];
  const game = {
    seed: 717, district: 1, totalScore: 123, modifier: 'clear', scoreMult: 1,
    timeLeft: 77, quota: 4, helped: 1, delivered: 2,
    map: null, MAP_W: 0, MAP_H: 0, wallShade: null, pickups: [], npcs: [], props: [], exit: null,
    run: { active: true, startedAt: 10, seedUsed: 717, modifierUsed: 'clear', cansCollected: 2, cansDelivered: 2, helpedByKind: { hungry: 1, family: 0, elder: 0, volunteer: 0 }, upgradesChosen: 0, highestDistrict: 1, runTime: 12, completed: false, leaderboardRank: null }
  };
  const player = {
    x: 11, y: 10.5, angle: -Math.PI / 2, cans: 3, stamina: 41, maxCans: 10, maxStamina: 60,
    giveRange: 1.2, regenBonus: 0, minimapLevel: 1, radar: false, handoffBonus: 0,
    upgrades: { pack: 1, sprint: 0, hand: 0, map: 1, radar: 0 }
  };
  const sandbox = {
    console, game, player, profile: { name: 'RUNNER' },
    STATE: { TITLE: 'title', PLAY: 'play', UPGRADE: 'upgrade' }, state: 'play', paused: false,
    SAVE_VERSION: 1, K: { save: 'save' }, _crBlockHarnessSave: false,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    lsGet(key) { try { const value = sandbox.localStorage.getItem(key); return value ? JSON.parse(value) : null; } catch (_) { return null; } },
    lsSet(key, value) { sandbox.localStorage.setItem(key, JSON.stringify(value)); return true; },
    lsDel(key) { sandbox.localStorage.removeItem(key); },
    crSavePayloadIsHarness() { return false; },
    addEventListener() {},
    genCity() { calls.push('genCity'); throw new Error('procedural generation forbidden for authored load'); },
    sncAuthoredStaticIdentity(levelId) {
      calls.push('staticIdentity');
      return levelId === LEVEL_ID ? { schema: LEVEL_SCHEMA, byteLength: 3516, sha256: STATIC_SHA } : null;
    },
    sncCaptureAuthoredMutableOverlay(levelId) {
      calls.push('capture');
      assert.strictEqual(levelId, LEVEL_ID);
      return { schema: OVERLAY_SCHEMA, pickups: game.pickups.map(p => ({ id: p.id, taken: p.taken, amt: p.amt })), npcs: game.npcs.map(n => ({ id: n.id, helped: n.helped })), exit: { active: game.exit.active } };
    },
    sncValidateAuthoredMutableOverlay(levelId, overlay) {
      calls.push('validateOverlay');
      const pickupIds = Array.from({ length: 10 }, (_, i) => pickupId(i));
      const npcIds = Array.from({ length: 6 }, (_, i) => npcId(i));
      const pass = levelId === LEVEL_ID && !!overlay && overlay.schema === OVERLAY_SCHEMA &&
        Array.isArray(overlay.pickups) && overlay.pickups.length === 10 &&
        overlay.pickups.every((p, i) => p && p.id === pickupIds[i] && typeof p.taken === 'boolean' && p.amt === pickupAmounts[i]) &&
        new Set(overlay.pickups.map(p => p.id)).size === 10 &&
        Array.isArray(overlay.npcs) && overlay.npcs.length === 6 &&
        overlay.npcs.every((n, i) => n && n.id === npcIds[i] && typeof n.helped === 'boolean') &&
        new Set(overlay.npcs.map(n => n.id)).size === 6 &&
        overlay.exit && typeof overlay.exit.active === 'boolean';
      return { pass, errors: pass ? [] : ['invalid overlay'], value: pass ? clone(overlay) : null };
    },
    sncInstallAuthoredLevel(levelId, options) {
      calls.push('install');
      assert.strictEqual(levelId, LEVEL_ID);
      assert.deepStrictEqual(clone(options), { seed: 717, modifier: 'clear' });
      installBaseline(sandbox);
      return true;
    },
    sncApplyAuthoredMutableOverlay(levelId, overlay) {
      calls.push('applyOverlay');
      assert.strictEqual(levelId, LEVEL_ID);
      for (const saved of overlay.pickups) game.pickups.find(p => p.id === saved.id).taken = saved.taken;
      for (const saved of overlay.npcs) game.npcs.find(n => n.id === saved.id).helped = saved.helped;
      game.exit.active = overlay.exit.active;
      return true;
    }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${activeSaveSource}\n;globalThis.__SAVE = SAVE;`, sandbox, { filename: persistencePath });
  installBaseline(sandbox);
  return { sandbox, storage, calls, SAVE: sandbox.__SAVE };
}

// RED/GREEN slice 1: authored serialization and deterministic reconstruct-before-overlay load.
{
  const fixture = makeSandbox();
  const { sandbox, storage, calls, SAVE } = fixture;
  sandbox.game.pickups[1].taken = true;
  sandbox.game.npcs[4].helped = true;
  sandbox.game.exit.active = true;
  const saved = SAVE.serialize();
  assert.strictEqual(saved.authoredLevelId, LEVEL_ID, 'authored save must carry durable level ID');
  assert.strictEqual(saved.authoredLevelSchema, LEVEL_SCHEMA, 'authored save must carry static schema');
  assert.strictEqual(saved.authoredStaticSha256, STATIC_SHA, 'authored save must carry static identity');
  assert.strictEqual(saved.authoredOverlay.schema, OVERLAY_SCHEMA, 'authored save must carry exact mutable overlay');
  assert(!Object.prototype.hasOwnProperty.call(saved, 'map'), 'authored save must not serialize static map authority');
  assert(!Object.prototype.hasOwnProperty.call(saved, 'props'), 'authored save must reconstruct immutable props');

  saved.map = [['tampered-map-must-be-ignored']];
  storage.set('save', JSON.stringify(saved));
  sandbox.game.map = [['live-junk']];
  sandbox.game.buildingRegistry = {};
  sandbox.game.buildingGrid = [];
  sandbox.game.pickups = [];
  sandbox.game.npcs = [];
  sandbox.game.props = [];
  sandbox.game.exit = null;
  sandbox.player.x = -100;

  assert.strictEqual(SAVE.load(), true, 'valid authored save must load');
  assert.deepStrictEqual(calls.slice(-4), ['staticIdentity', 'validateOverlay', 'install', 'applyOverlay'], 'authored load must resolve identity, validate, reconstruct, then overlay');
  assert.strictEqual(calls.includes('genCity'), false, 'authored continue must never call genCity');
  assert.strictEqual(sandbox.game.map.length, 20, 'tampered serialized map must be ignored');
  assert.strictEqual(sandbox.game.map[5][8], 1, 'authored building geometry must be reconstructed');
  assert.deepStrictEqual(clone(sandbox.game.buildingRegistry[1]), { bid: 1, id: 'district-1-main-landmark', assetId: 'custom_next_001', renderMode: 'importedWholeFaceAsset', x: 8, y: 5, x0: 8, y0: 5, rotation: 0, widthCells: 6, depthCells: 3, w: 6, h: 3, footprint: { widthCells: 6, depthCells: 3 }, front: 'south' });
  assert.deepStrictEqual(clone(sandbox.game.buildingGrid), exactGrid(), 'exact 18-cell owner grid must be reconstructed');
  assert.strictEqual(sandbox.game.pickups[1].taken, true, 'pickup mutable state must restore by ID');
  assert.strictEqual(sandbox.game.npcs[4].helped, true, 'NPC mutable state must restore by ID');
  assert.strictEqual(sandbox.game.exit.active, true, 'exit mutable state must restore');
  assert.deepStrictEqual(clone(sandbox.game.props), propRecords.map((row, i) => ({ id: propId(i), x: row[0], y: row[1], kind: row[2], wob: 0 })), 'props must remain exact pristine authored records');
  assert.strictEqual(sandbox.player.x, 11, 'common dynamic player pose must restore after reconstruction');
}

function liveSnapshot(sandbox) {
  return clone({ game: sandbox.game, player: sandbox.player, state: sandbox.state, paused: sandbox.paused, offered: sandbox._offered || null });
}
function authoredPayload(fixture) {
  const payload = fixture.SAVE.serialize();
  fixture.calls.length = 0;
  return payload;
}
function putPayload(fixture, payload) { fixture.storage.set('save', JSON.stringify(payload)); }

// RED/GREEN slice 2: identity and overlay failures close before any live mutation.
{
  const identityCases = [
    ['unknown level ID', 'authoredLevelId', 'district-1-unknown'],
    ['schema mismatch', 'authoredLevelSchema', 'snc-authored-level-static-v2'],
    ['static hash mismatch', 'authoredStaticSha256', '0'.repeat(64)]
  ];
  for (const [label, field, value] of identityCases) {
    const fixture = makeSandbox();
    const payload = authoredPayload(fixture);
    payload[field] = value;
    putPayload(fixture, payload);
    const before = liveSnapshot(fixture.sandbox);
    assert.strictEqual(fixture.SAVE.load(), false, `${label} must fail closed`);
    assert.deepStrictEqual(liveSnapshot(fixture.sandbox), before, `${label} must not mutate live state`);
    assert.strictEqual(fixture.calls.includes('install'), false, `${label} must fail before reconstruction`);
  }

  {
    const fixture = makeSandbox();
    const payload = authoredPayload(fixture);
    fixture.sandbox.sncAuthoredStaticIdentity = () => {
      fixture.calls.push('staticIdentity');
      return { schema: LEVEL_SCHEMA, byteLength: 3516, sha256: 'f'.repeat(64) };
    };
    putPayload(fixture, payload);
    const before = liveSnapshot(fixture.sandbox);
    assert.strictEqual(fixture.SAVE.load(), false, 'runtime static definition mismatch must fail closed');
    assert.deepStrictEqual(liveSnapshot(fixture.sandbox), before, 'runtime static definition mismatch must not mutate');
    assert.strictEqual(fixture.calls.includes('install'), false, 'runtime static mismatch must fail before reconstruction');
  }

  const malformedOverlays = [
    ['missing overlay', null],
    ['reordered pickup IDs', overlay => overlay.pickups.reverse()],
    ['duplicate pickup ID', overlay => { overlay.pickups[1].id = overlay.pickups[0].id; }],
    ['unknown NPC ID', overlay => { overlay.npcs[2].id = 'npc-99'; }],
    ['pickup amount drift', overlay => { overlay.pickups[3].amt = 99; }],
    ['malformed exit', overlay => { overlay.exit.active = 'yes'; }]
  ];
  for (const [label, tamper] of malformedOverlays) {
    const fixture = makeSandbox();
    const payload = authoredPayload(fixture);
    if (tamper === null) payload.authoredOverlay = null;
    else tamper(payload.authoredOverlay);
    putPayload(fixture, payload);
    const before = liveSnapshot(fixture.sandbox);
    assert.strictEqual(fixture.SAVE.load(), false, `${label} must fail closed`);
    assert.deepStrictEqual(liveSnapshot(fixture.sandbox), before, `${label} must not mutate live state`);
    assert.strictEqual(fixture.calls.includes('install'), false, `${label} must fail before reconstruction`);
  }
}

// RED/GREEN slice 3: malformed common dynamic state is rejected before authored reconstruction.
{
  const commonCases = [
    ['player pose', payload => { payload.px = 'eleven'; }],
    ['run number', payload => { payload.timeLeft = null; }],
    ['modifier', payload => { payload.modifier = 7; }],
    ['upgrades', payload => { payload.upgrades = null; }],
    ['run object', payload => { payload.run = null; }],
    ['screen state', payload => { payload.screenState = 'results'; }],
    ['upgrade offer', payload => { payload.screenState = 'upgrade'; payload.upgradeOffered = []; }]
  ];
  for (const [label, tamper] of commonCases) {
    const fixture = makeSandbox();
    const payload = authoredPayload(fixture);
    tamper(payload);
    putPayload(fixture, payload);
    const before = liveSnapshot(fixture.sandbox);
    assert.strictEqual(fixture.SAVE.load(), false, `malformed ${label} must fail closed`);
    assert.deepStrictEqual(liveSnapshot(fixture.sandbox), before, `malformed ${label} must not partially mutate`);
    assert.strictEqual(fixture.calls.includes('install'), false, `malformed ${label} must fail before install`);
  }
}

// RED/GREEN slice 4: unexpected reconstruction/apply failures roll back atomically.
{
  for (const failurePoint of ['installIdentity', 'apply']) {
    const fixture = makeSandbox();
    const payload = authoredPayload(fixture);
    putPayload(fixture, payload);
    const before = liveSnapshot(fixture.sandbox);
    if (failurePoint === 'installIdentity') {
      fixture.sandbox.sncInstallAuthoredLevel = () => {
        fixture.calls.push('install');
        fixture.sandbox.game.map = [['partial-static']];
        fixture.sandbox.game.authoredLevelId = 'wrong-after-install';
        return true;
      };
    } else {
      fixture.sandbox.sncApplyAuthoredMutableOverlay = () => {
        fixture.calls.push('applyOverlay');
        fixture.sandbox.game.pickups[0].taken = true;
        return false;
      };
    }
    assert.strictEqual(fixture.SAVE.load(), false, `${failurePoint} failure must return false`);
    assert.deepStrictEqual(liveSnapshot(fixture.sandbox), before, `${failurePoint} failure must restore the complete live state`);
  }
}

// RED/GREEN slice 5: legacy District 1 is cleared exactly once before mutation.
{
  const fixture = makeSandbox();
  const legacy = authoredPayload(fixture);
  delete legacy.authoredLevelId;
  delete legacy.authoredLevelSchema;
  delete legacy.authoredStaticSha256;
  delete legacy.authoredOverlay;
  legacy.map = [['legacy-procedural-d1']];
  legacy.pickups = []; legacy.npcs = []; legacy.props = []; legacy.exit = null;
  putPayload(fixture, legacy);
  const before = liveSnapshot(fixture.sandbox);
  const originalClear = fixture.SAVE.clear.bind(fixture.SAVE);
  let clears = 0;
  fixture.SAVE.clear = () => { clears++; originalClear(); };
  assert.strictEqual(fixture.SAVE.load(), false, 'legacy District 1 save must be incompatible');
  assert.strictEqual(clears, 1, 'legacy District 1 rejection must clear exactly once');
  assert.strictEqual(fixture.storage.has('save'), false, 'legacy active-save key must be absent');
  assert.deepStrictEqual(liveSnapshot(fixture.sandbox), before, 'legacy rejection must occur before live mutation');
  assert.strictEqual(fixture.SAVE.load(), false, 'cleared legacy payload must provide no second load opportunity');
  assert.strictEqual(clears, 1, 'empty second load must not clear again');
}

// RED/GREEN slice 6: District 2+ retains serialized map/object semantics.
{
  const fixture = makeSandbox();
  const { sandbox, SAVE, storage, calls } = fixture;
  sandbox.game.district = 2;
  sandbox.game.map = [[8, 8], [8, 0]];
  sandbox.game.wallShade = [[0.1, 0.2], [0.3, 0.4]];
  sandbox.game.MAP_W = 2; sandbox.game.MAP_H = 2;
  sandbox.game.pickups = [{ x: 1.5, y: 1.5, taken: true, amt: 2, wob: 0.25 }];
  sandbox.game.npcs = [{ x: 1.2, y: 1.3, kind: 'elder', need: 1, helped: true, wob: 0.5, thank: 'ok' }];
  sandbox.game.props = [{ x: 1.1, y: 1.4, kind: 'bench', wob: 0.75 }];
  sandbox.game.exit = { x: 1.5, y: 1.5, active: true };
  const saved = SAVE.serialize();
  assert.strictEqual(saved.authoredLevelId, undefined, 'District 2 save must stay procedural');
  assert.deepStrictEqual(clone(saved.map), [[8, 8], [8, 0]], 'District 2 serialized map must remain available');
  storage.set('save', JSON.stringify(saved));
  sandbox.game.map = [['changed']]; sandbox.game.pickups = []; sandbox.game.npcs = []; sandbox.game.props = []; sandbox.game.exit = null;
  calls.length = 0;
  assert.strictEqual(SAVE.load(), true, 'District 2 serialized-map save must still load');
  assert.deepStrictEqual(clone(sandbox.game.map), [[8, 8], [8, 0]], 'District 2 map semantics must be restored');
  assert.deepStrictEqual(clone(sandbox.game.pickups), clone(saved.pickups), 'District 2 pickup object semantics must be restored');
  assert.strictEqual(calls.includes('install'), false, 'District 2 load must not use authored installer');
}

// Existing upgrade-screen continue semantics remain available after authored reconstruction.
{
  const fixture = makeSandbox();
  fixture.sandbox.state = fixture.sandbox.STATE.UPGRADE;
  fixture.sandbox._offered = [{ id: 'pack', name: 'PACK', desc: 'Carry more' }];
  const payload = authoredPayload(fixture);
  putPayload(fixture, payload);
  fixture.sandbox.state = fixture.sandbox.STATE.TITLE;
  fixture.sandbox._offered = null;
  assert.strictEqual(fixture.SAVE.load(), true, 'valid authored upgrade-screen save must load');
  assert.strictEqual(fixture.sandbox.state, fixture.sandbox.STATE.UPGRADE, 'upgrade screen state must restore');
  assert.deepStrictEqual(clone(fixture.sandbox._offered), [{ id: 'pack', name: 'PACK', desc: 'Carry more' }], 'upgrade offer must restore');
}

console.log('PASS authored District 1 save/load reconstruction: serialization, exact reconstruction, overlays, atomic failures, legacy rejection, District 2 path');
