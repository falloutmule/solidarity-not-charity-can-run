'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/js/game-14-section-5b-local-persistence.js'), 'utf8');
const activeSaveSource = source.slice(source.indexOf('// --- ACTIVE RUN SAVE'));
assert(activeSaveSource.startsWith('// --- ACTIVE RUN SAVE'), 'active save section is present');
assert(source.includes('sncValidateAuthoredMutableOverlay(CR_AUTHORED_D1_ID,s.authoredOverlay,s.seed)'), 'save validation retains deterministic seed');
assert(source.includes('s.maxCans !== 3'), 'D1 save validation preserves three-can cap');

function fixture(){
  const storage = new Map();
  const sandbox = {
    Object, Array, JSON, Number, String, Math, Date, Map, Set,
    SAVE_VERSION: 1, K: { save: 'save' }, STATE: { PLAY: 'play', UPGRADE: 'upgrade' }, state: 'play', paused: false,
    profile: { name: 'RUNNER' }, window: {},
    game: {
      seed: 2468, district: 1, totalScore: 0, modifier: 'clear', scoreMult: 1, timeLeft: 0, quota: 3, helped: 0, delivered: 0,
      authoredLevelId: 'district-1-authored-v1', authoredLevelSchema: 'snc-authored-level-static-v2', authoredStaticSha256: '0aecc59907b843abb990500694b452025589a877b46494d6428712dfc18912af',
      run: { active: true, startedAt: 1, seedUsed: 2468, modifierUsed: 'clear', cansCollected: 2, cansDelivered: 2, helpedByKind: { hungry: 1, family: 0, elder: 0, volunteer: 0 }, upgradesChosen: 0, highestDistrict: 1, runTime: 4, completed: false, leaderboardRank: null }
    },
    player: { x: 20.5, y: 14.5, angle: -Math.PI / 2, cans: 2, stamina: 60, maxCans: 3, maxStamina: 60, giveRange: 1.4, regenBonus: 0, minimapLevel: 1, radar: false, handoffBonus: 0, upgrades: { pack: 0, sprint: 0, hand: 0, map: 0, radar: 0 } },
    SNC_AUTHORED_LEVEL_SCHEMA: 'snc-authored-level-static-v2', SNC_AUTHORED_LEVEL_STATIC_BYTES: 8288, SNC_AUTHORED_LEVEL_STATIC_SHA256: '0aecc59907b843abb990500694b452025589a877b46494d6428712dfc18912af',
    lsGet(key){ return storage.has(key) ? JSON.parse(storage.get(key)) : null; }, lsSet(key, value){ storage.set(key, JSON.stringify(value)); return true; }, lsDel(key){ storage.delete(key); },
    crSavePayloadIsHarness(){ return false; }, addEventListener(){},
    sncCaptureAuthoredMutableOverlay(){ return { schema: 'snc-authored-save-overlay-v2', pickups: [{ id: 'can-socket-00', taken: false, amt: 1 }, { id: 'can-socket-01', taken: true, amt: 1 }, { id: 'can-socket-02', taken: false, amt: 1 }, { id: 'can-socket-03', taken: false, amt: 1 }, { id: 'can-socket-04', taken: false, amt: 1 }], npcs: [{ id: 'npc-00', helped: false }, { id: 'npc-01', helped: false }, { id: 'npc-02', helped: false }], exit: { active: false } }; },
    sncValidateAuthoredMutableOverlay(id, overlay, seed){ return id === 'district-1-authored-v1' && seed === 2468 && overlay && overlay.schema === 'snc-authored-save-overlay-v2' ? { pass: true, value: overlay } : { pass: false, value: null }; },
    sncAuthoredStaticIdentity(){ return { schema: 'snc-authored-level-static-v2', byteLength: 8288, sha256: '0aecc59907b843abb990500694b452025589a877b46494d6428712dfc18912af' }; },
    sncInstallAuthoredLevel(){ sandbox.installed = true; return true; }, sncApplyAuthoredMutableOverlay(){ sandbox.applied = true; return true; }, installed: false, applied: false
  };
  sandbox.globalThis = sandbox; sandbox.window = sandbox;
  vm.createContext(sandbox); vm.runInContext(`${activeSaveSource}\nglobalThis.__SAVE = SAVE;`, sandbox, { filename: 'active-save.js' });
  return { sandbox, storage };
}

const { sandbox, storage } = fixture();
const payload = sandbox.__SAVE.serialize();
assert.strictEqual(payload.authoredLevelId, 'district-1-authored-v1');
assert.strictEqual(payload.authoredLevelSchema, 'snc-authored-level-static-v2');
assert.strictEqual(payload.authoredStaticSha256, '0aecc59907b843abb990500694b452025589a877b46494d6428712dfc18912af');
assert.strictEqual(payload.maxCans, 3);
assert(!Object.prototype.hasOwnProperty.call(payload, 'map'), 'authored save does not serialize static map authority');
sandbox.__SAVE.save();
assert(storage.has('save'), 'save writes active D1 state');
assert.strictEqual(sandbox.__SAVE.load(), true, 'valid D1 save loads');
assert.strictEqual(sandbox.installed, true, 'load reconstructs immutable world');
assert.strictEqual(sandbox.applied, true, 'load applies mutable overlay after reconstruction');

const tampered = JSON.parse(storage.get('save')); tampered.maxCans = 10; storage.set('save', JSON.stringify(tampered));
assert.strictEqual(sandbox.__SAVE.load(), false, 'wrong carrying capacity fails closed');
sandbox.__SAVE.clear(); assert.strictEqual(storage.has('save'), false, 'reset clears active save');

console.log(JSON.stringify({ pass: true, schema: payload.authoredLevelSchema, capacity: payload.maxCans, seededOverlay: true }, null, 2));
