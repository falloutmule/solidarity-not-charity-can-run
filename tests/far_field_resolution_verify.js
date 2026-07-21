'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const profilesPath = path.join(root, 'src/js/game-01a-render-resolution-profiles.js');

// RED/GREEN slice 1: canonical profiles and strict query selection.
assert(fs.existsSync(profilesPath), 'resolution profile module must exist');
const source = fs.readFileSync(profilesPath, 'utf8');
const sandbox = {
  console,
  URLSearchParams,
  location: { search: '' },
  Object, Array, Number, String, Math, Float32Array
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: profilesPath });

const expected = {
  '320': { id: '320', width: 320, height: 200, scale: 1 },
  '400': { id: '400', width: 400, height: 250, scale: 1.25 },
  '480': { id: '480', width: 480, height: 300, scale: 1.5 }
};
for (const [id, profile] of Object.entries(expected)) {
  const resolved = sandbox.crResolveRenderProfile(new URLSearchParams(`ffres=${id}`));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(resolved)), profile, `${id} exact profile`);
  assert(Object.isFrozen(resolved), `${id} profile frozen`);
  assert.deepStrictEqual(Object.keys(resolved), ['id', 'width', 'height', 'scale'], `${id} exact enumerable keys`);
  assert.strictEqual(resolved.width / resolved.height, 1.6, `${id} 16:10 aspect`);
}
assert.strictEqual(sandbox.crResolveRenderProfile().id, '400', 'no-query location selects 400 default');
assert.strictEqual(
  sandbox.crResolveRenderProfile(),
  sandbox.crResolveRenderProfile(new URLSearchParams('ffres=400')),
  'no-query default is the explicit 400 profile'
);
const strictQueryCases = [
  ['', '400'],
  ['ffres=', '400'],
  ['ffres=0400', '400'],
  ['ffres=400x250', '400'],
  ['ffres=480%20', '400'],
  ['ffres=FOO', '400'],
  ['ffres=400&ffres=480', '400'],
  ['ffres=480&ffres=320', '480'],
  ['ffres=FOO&ffres=480', '400']
];
for (const [query, expectedId] of strictQueryCases) {
  assert.strictEqual(sandbox.crResolveRenderProfile(new URLSearchParams(query)).id, expectedId, `strict fallback/first value: ${query}`);
}
assert.strictEqual(sandbox.crResolveRenderProfile({ get: 'not-a-function' }).id, '400', 'invalid params object falls back to 400');
assert.strictEqual(sandbox.crResolveRenderProfile({ get() { throw new Error('bad params'); } }).id, '400', 'throwing params falls back to 400');
assert.strictEqual(sandbox.crGetRenderProfile().id, '400', 'initial no-query selection resolves 400 default');
assert.doesNotThrow(() => sandbox.crResolveRenderProfile(null), 'null resolution remains safe');

// RED/GREEN slice 2: target rebuild is atomic, complete, and idempotent.
function makeCanvas() {
  const context = {
    imageSmoothingEnabled: true,
    drawImage() {}, fillRect() {}, clearRect() {}, getImageData() { return { data: new Uint8ClampedArray(4) }; }
  };
  return { width: 0, height: 0, style: {}, getContext(kind) { assert.strictEqual(kind, '2d'); return context; }, _context: context };
}
const view = makeCanvas();
let createdCanvases = 0;
const runtime = {
  console, URLSearchParams, Object, Array, Number, String, Math, Float32Array, Uint8ClampedArray,
  location: { search: '' },
  document: {
    getElementById(id) { assert.strictEqual(id, 'view'); return view; },
    createElement(tag) { assert.strictEqual(tag, 'canvas'); createdCanvases++; return makeCanvas(); }
  },
  cfg: { fov: 0.66, walkSpeed: 2.4 },
  game: { sentinel: 'gameplay-unchanged' },
  player: { x: 11, y: 10.5, angle: -Math.PI / 2 }
};
runtime.globalThis = runtime;
runtime.window = runtime;
vm.createContext(runtime);
const canvasSource = fs.readFileSync(path.join(root, 'src/js/game-01-section-0-canvas-resolution.js'), 'utf8');
vm.runInContext(canvasSource, runtime, { filename: 'game-01-section-0-canvas-resolution.js' });
vm.runInContext(source, runtime, { filename: profilesPath });
vm.runInContext("let skyCanvas={width:320,height:100}; let skyBuilt='clear';", runtime);
const invariantBefore = JSON.stringify({ cfg: runtime.cfg, game: runtime.game, player: runtime.player, viewWidth: view.width, viewHeight: view.height, style: view.style });
assert.doesNotThrow(() => runtime.crApplyRenderProfile(Object.defineProperty({}, 'id', { get() { throw new Error('bad profile'); } })),
  'invalid profile getters fall back without throwing');
assert.strictEqual(runtime.crGetRenderProfile().id, '400', 'invalid profile getter selects 400 fallback');
assert.strictEqual(runtime.crApplyRenderProfile(null).id, '400', 'missing programmatic profile selects 400 fallback');

const p400 = runtime.crApplyRenderProfile({ id: '400', width: 1, height: 1, scale: 99 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(p400)), expected['400'], 'caller dimensions are ignored');
let target = vm.runInContext('({RW,RH,bufWidth:buf.width,bufHeight:buf.height,zbufferLength:zbuffer.length,smoothing:bctx.imageSmoothingEnabled,skyCanvas,skyBuilt})', runtime);
assert.deepStrictEqual({ RW: target.RW, RH: target.RH, bufWidth: target.bufWidth, bufHeight: target.bufHeight, zbufferLength: target.zbufferLength },
  { RW: 400, RH: 250, bufWidth: 400, bufHeight: 250, zbufferLength: 400 }, '400 targets rebuilt together');
assert.strictEqual(target.smoothing, false, 'internal target nearest-neighbor sampling');
assert.strictEqual(target.skyCanvas, null, 'dimension-dependent sky canvas invalidated');
assert.strictEqual(target.skyBuilt, null, 'sky build key invalidated');
assert.strictEqual(createdCanvases, 2, 'one initial canvas plus one profile rebuild');
const firstBuffer = vm.runInContext('buf', runtime);
const firstZbuffer = vm.runInContext('zbuffer', runtime);
runtime.crApplyRenderProfile(runtime.crGetRenderProfile());
assert.strictEqual(createdCanvases, 2, 'same profile does not recreate targets');
assert.strictEqual(vm.runInContext('buf', runtime), firstBuffer, 'buffer identity stable between frames/calls');
assert.strictEqual(vm.runInContext('zbuffer', runtime), firstZbuffer, 'z-buffer identity stable between frames/calls');

const proof480 = runtime.crResetRenderTargets({ id: '480', width: 999 });
assert(Object.isFrozen(proof480), 'target proof frozen');
assert.deepStrictEqual(Object.keys(proof480), ['profile', 'bufferWidth', 'bufferHeight', 'zbufferLength', 'skyInvalidated', 'rebuilt'], 'target proof exact keys');
assert.deepStrictEqual(JSON.parse(JSON.stringify(proof480)), {
  profile: expected['480'], bufferWidth: 480, bufferHeight: 300, zbufferLength: 480, skyInvalidated: true, rebuilt: true
}, '480 target proof values');
target = JSON.parse(JSON.stringify(vm.runInContext('({RW,RH,bufWidth:buf.width,bufHeight:buf.height,zbufferLength:zbuffer.length})', runtime)));
assert.deepStrictEqual(target, { RW: 480, RH: 300, bufWidth: 480, bufHeight: 300, zbufferLength: 480 }, 'direct reset valid dimensions');
assert.strictEqual(JSON.stringify({ cfg: runtime.cfg, game: runtime.game, player: runtime.player, viewWidth: view.width, viewHeight: view.height, style: view.style }), invariantBefore,
  'FOV, gameplay, player, and CSS viewport authority unchanged');

// RED/GREEN slice 3: profile proof/counters and synthetic render safety.
const syntheticCosts = {};
for (const id of ['320', '400', '480']) {
  runtime.crApplyRenderProfile({ id });
  const profile = runtime.crGetRenderProfile();
  const stats = runtime.crGetRenderResolutionStats();
  assert(Object.isFrozen(stats), `${id} stats frozen`);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(stats)), {
    profileId: id,
    internalWidth: profile.width,
    internalHeight: profile.height,
    wallColumnsPerFrame: profile.width,
    spriteColumnsDrawn: null,
    sceneAverage: null,
    sceneP95: null,
    sceneWorst: null,
    frameP95: null,
    targetRebuildCount: id === '320' ? 3 : (id === '400' ? 4 : 5)
  }, `${id} truthful resolution counters`);

  const centerRay = Math.floor(profile.width / 2);
  assert(centerRay >= 0 && centerRay < profile.width, `${id} center ray valid`);
  let operations = 0;
  for (let col = 0; col < profile.width; col++) {
    const cameraX = 2 * col / profile.width - 1;
    assert(Number.isFinite(cameraX) && cameraX >= -1 && cameraX < 1, `${id} wall camera ray finite/in range`);
    operations++;
  }
  const depth = 8;
  const screenH = profile.height / depth;
  const screenW = screenH;
  const screenX = profile.width / 2;
  const left = Math.floor(screenX - screenW / 2);
  const right = Math.ceil(screenX + screenW / 2);
  assert(Number.isFinite(screenX) && screenW > 0 && screenH > 0, `${id} sprite projection finite`);
  for (let col = left; col < right; col++) {
    if (col < 0 || col >= profile.width) continue;
    assert(col < vm.runInContext('zbuffer.length', runtime), `${id} sprite z-buffer access in bounds`);
    operations++;
  }
  syntheticCosts[id] = operations;
}
const ratio400 = syntheticCosts['400'] / syntheticCosts['320'];
const ratio480 = syntheticCosts['480'] / syntheticCosts['320'];
assert(ratio400 <= 1.7, `400 synthetic cost ratio ${ratio400} <= 1.7`);
assert(ratio480 <= 2.5, `480 synthetic cost ratio ${ratio480} <= 2.5`);

// Query is URL-only and genuinely protected repository authority is byte-identical to the base.
assert(!/localStorage\s*\.|\bSAVE\b|ffres\s*[:=]\s*['\"]/.test(source), 'profile module has no persistence/save path');
const game06 = fs.readFileSync(path.join(root, 'src/js/game-06-section-2b-mobile-touch-input.js'), 'utf8').replace(/\r\n/g, '\n');
const game22 = fs.readFileSync(path.join(root, 'src/js/game-22-section-13-main-loop.js'), 'utf8').replace(/\r\n/g, '\n');
assert(game06.includes("var BUILD_ID = 'farfieldsmooth1'"), 'current mobile-input coordinator BUILD_ID retained');
assert(game06.includes('function crResetPauseRenderHistory(reason)'), 'current mobile-input pause reset helper retained');
assert(/const CR_FIXED_STEP_DT\s*=\s*1\s*\/\s*60\s*;/.test(game22), 'fixed-step cadence remains exactly 1/60');
assert(game22.includes("crApplyRenderProfile(typeof crGetRenderProfile === 'function' ? crGetRenderProfile() : null)"), 'selected render profile initializes through the current runtime hook');
for (const required of ['function crGetInterpolatedRenderPose()', 'function crRenderPoseLifecycleChanged()', 'function crCaptureSimulationPoseBeforeStep()', 'function crCaptureSimulationPoseAfterStep()']) {
  assert(game22.includes(required), `${required} position interpolation/lifecycle behavior remains present`);
}

const authoredSource = fs.readFileSync(path.join(root, 'src/levels/district-01-authored.js'), 'utf8');
assert(authoredSource.includes("district-1-authored-v1"), 'authored D1 identity retained');
assert(authoredSource.includes('98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82'), 'authored static SHA retained');
const assetSource = fs.readFileSync(path.join(root, 'src/imported-handoff-assets/custom_next_001.asset.js'), 'utf8');
const dataUri = assetSource.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
assert(dataUri, 'canonical bitmap data URI present');
const bitmapBytes = Buffer.from(dataUri[1], 'base64');
assert.strictEqual(bitmapBytes.length, 185412, 'canonical bitmap byte length');
assert.strictEqual(crypto.createHash('sha256').update(bitmapBytes).digest('hex'), 'bffb437c0c6772669233bd58124cded53fe8e32faa9b0e3c96736c4f87ec140c', 'canonical bitmap SHA-256');

console.log(`far_field_resolution_verify: PASS profiles=320,400,480 costRatios=400:${ratio400.toFixed(6)},480:${ratio480.toFixed(6)} selfContained=true`);


