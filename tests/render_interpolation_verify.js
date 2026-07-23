'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const mainLoopPath = path.join(root, 'src/js/game-22-section-13-main-loop.js');
const renderPath = path.join(root, 'src/js/game-16-section-7-render.js');
const mainSource = fs.readFileSync(mainLoopPath, 'utf8');
const renderSource = fs.readFileSync(renderPath, 'utf8');

const apiNames = [
  'crResetRenderPoseHistory',
  'crCaptureSimulationPoseBeforeStep',
  'crCaptureSimulationPoseAfterStep',
  'crGetRenderInterpolationAlpha',
  'crGetInterpolatedRenderPose',
];
for (const name of apiNames) {
  assert(mainSource.includes(`function ${name}(`), `locked interpolation API missing: ${name}`);
}

const fixedStart = mainSource.indexOf('const CR_FIXED_STEP_DT = 1 / 60;');
const fixedEnd = mainSource.indexOf('let last=performance.now();', fixedStart);
assert(fixedStart >= 0 && fixedEnd > fixedStart, 'fixed-step source section must be extractable');
const fixedSource = mainSource.slice(fixedStart, fixedEnd);

function createRuntime() {
  const visibilityHandlers = [];
  const sandbox = {
    console,
    Math,
    Number,
    player: { x: 0, y: 0, angle: 0, collisionTouches: 0 },
    game: { district: 1 },
    STATE: { TITLE: 'title', PLAY: 'play', UPGRADE: 'upgrade', RESULTS: 'results' },
    state: 'play',
    paused: false,
    document: {
      hidden: false,
      addEventListener(type, fn) {
        if (type === 'visibilitychange') visibilityHandlers.push(fn);
      },
    },
    update(dt) {
      sandbox.player.x += 3 * dt;
      sandbox.player.y += 1.5 * dt;
      sandbox.player.collisionTouches += 1;
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${fixedSource}\n;globalThis.__interpolationApi = { ${apiNames.join(', ')}, crResetFixedStepSimulation, crStepSimulationFixed, crGetFixedStepState };`, sandbox, { filename: mainLoopPath });
  sandbox.visibilityHandlers = visibilityHandlers;
  sandbox.api = sandbox.__interpolationApi;
  sandbox.api.crResetFixedStepSimulation();
  return sandbox;
}

function baselineStep(state, frameDt) {
  const dt = !Number.isFinite(frameDt) || frameDt < 0 ? 0 : Math.min(frameDt, 0.25);
  state.accumulator += dt;
  let steps = 0;
  while (state.accumulator >= 1 / 60 && steps < 5) {
    state.x += 3 / 60;
    state.y += 1.5 / 60;
    state.collisionTouches += 1;
    state.accumulator -= 1 / 60;
    steps++;
  }
  if (steps >= 5 && state.accumulator >= 1 / 60) {
    state.droppedFrames++;
    state.accumulator = 0;
  }
  return steps;
}

function cadenceFrames(kind) {
  if (Array.isArray(kind)) return Array.from({ length: 120 }, (_, i) => kind[i % kind.length] / 1000);
  return Array.from({ length: Math.round(kind * 1.25) }, () => 1 / kind);
}

function runCadence(label, frameDts) {
  const runtime = createRuntime();
  const baseline = { x: 0, y: 0, collisionTouches: 0, accumulator: 0, droppedFrames: 0 };
  const candidatePositions = [];
  const baselinePositions = [];
  const zeroStepMovement = [];
  let previousRenderX = null;

  for (const dt of frameDts) {
    const fixed = runtime.api.crStepSimulationFixed(dt);
    baselineStep(baseline, dt);
    const pose = runtime.api.crGetInterpolatedRenderPose();

    assert(Number.isFinite(pose.x) && Number.isFinite(pose.y), `${label}: finite render position`);
    assert(pose.alpha >= 0 && pose.alpha < 1, `${label}: alpha is clamped to [0, 1)`);
    const loX = Math.min(pose.previousX, pose.authoritativeX) - 1e-12;
    const hiX = Math.max(pose.previousX, pose.authoritativeX) + 1e-12;
    const loY = Math.min(pose.previousY, pose.authoritativeY) - 1e-12;
    const hiY = Math.max(pose.previousY, pose.authoritativeY) + 1e-12;
    assert(pose.x >= loX && pose.x <= hiX, `${label}: x stays inside completed-step pair`);
    assert(pose.y >= loY && pose.y <= hiY, `${label}: y stays inside completed-step pair`);
    if (previousRenderX !== null) assert(pose.x + 1e-12 >= previousRenderX, `${label}: steady render motion is monotonic`);
    if (fixed.steps === 0 && previousRenderX !== null && pose.x > previousRenderX + 1e-12) zeroStepMovement.push(pose.x - previousRenderX);

    candidatePositions.push(pose.x);
    baselinePositions.push(runtime.player.x);
    previousRenderX = pose.x;
  }

  assert(Math.abs(runtime.player.x - baseline.x) < 1e-10, `${label}: authoritative x matches non-interpolated baseline`);
  assert(Math.abs(runtime.player.y - baseline.y) < 1e-10, `${label}: authoritative y matches non-interpolated baseline`);
  assert.strictEqual(runtime.player.collisionTouches, baseline.collisionTouches, `${label}: collision/gameplay update count unchanged`);

  const repeats = values => values.slice(1).reduce((n, value, i) => n + (Math.abs(value - values[i]) < 1e-12 ? 1 : 0), 0);
  return {
    runtime,
    zeroStepMovement: zeroStepMovement.length,
    candidateRepeats: repeats(candidatePositions),
    baselineRepeats: repeats(baselinePositions),
    lastPose: runtime.api.crGetInterpolatedRenderPose(),
  };
}

const cadenceResults = new Map();
for (const hz of [60, 72, 90, 120, 144]) {
  cadenceResults.set(`${hz} Hz`, runCadence(`${hz} Hz`, cadenceFrames(hz)));
}
cadenceResults.set('irregular 8/12/16/8/17 ms', runCadence('irregular', cadenceFrames([8, 12, 16, 8, 17])));
cadenceResults.set('one 40 ms frame', runCadence('40 ms', [1 / 60, 1 / 60, 0.040, 1 / 120, 1 / 120]));
assert.strictEqual(cadenceResults.get('one 40 ms frame').runtime.api.crGetFixedStepState().droppedFrames, 0, '40 ms frame requires no fixed-step drop');

for (const hz of [72, 90, 120, 144]) {
  const result = cadenceResults.get(`${hz} Hz`);
  assert(result.zeroStepMovement > 0, `${hz} Hz: zero-step frames receive interpolated movement`);
  assert(result.candidateRepeats < result.baselineRepeats, `${hz} Hz: interpolation reduces repeated render positions`);
}
const sixty = cadenceResults.get('60 Hz');
assert(Math.abs(sixty.runtime.player.x - sixty.lastPose.x) <= 3 / 60 + 1e-10, '60 Hz render remains within one accepted movement quantum');

// A clamped 300 ms frame also exceeds the five-step budget. It must not blend across either boundary.
{
  const runtime = createRuntime();
  const baseline = { x: 0, y: 0, collisionTouches: 0, accumulator: 0, droppedFrames: 0 };
  for (const dt of [1 / 60, 1 / 120]) {
    runtime.api.crStepSimulationFixed(dt);
    baselineStep(baseline, dt);
  }
  const result = runtime.api.crStepSimulationFixed(0.300);
  baselineStep(baseline, 0.300);
  const pose = runtime.api.crGetInterpolatedRenderPose();
  assert.strictEqual(result.dt, 0.25, '300 ms frame is clamped to 250 ms');
  assert.strictEqual(result.steps, 5, 'clamped frame keeps five-step maximum');
  assert.strictEqual(result.droppedFrames, 1, 'backlog drop counter increments');
  assert.strictEqual(runtime.player.x, baseline.x, 'clamped frame authoritative x matches baseline');
  assert.strictEqual(runtime.player.collisionTouches, baseline.collisionTouches, 'clamped frame gameplay update count matches baseline');
  assert.strictEqual(pose.x, runtime.player.x, 'clamped/dropped boundary renders authoritative x');
  assert.strictEqual(pose.y, runtime.player.y, 'clamped/dropped boundary renders authoritative y');
  assert.strictEqual(pose.previousX, runtime.player.x, 'history is collapsed after a drop');
  assert.strictEqual(pose.alpha, 0, 'drop clears accumulator alpha');
}

// Reset, load/teleport, lifecycle, and visibility discontinuities begin from one authoritative pose.
{
  const runtime = createRuntime();
  runtime.api.crStepSimulationFixed(1 / 60);
  runtime.player.x = 50;
  runtime.player.y = 40;
  runtime.api.crResetRenderPoseHistory();
  let pose = runtime.api.crGetInterpolatedRenderPose();
  assert.deepStrictEqual([pose.previousX, pose.previousY, pose.x, pose.y], [50, 40, 50, 40], 'load/new-run reset has no visual jump');

  runtime.player.x = 70;
  runtime.player.y = 60;
  runtime.api.crStepSimulationFixed(1 / 60);
  pose = runtime.api.crGetInterpolatedRenderPose();
  assert.strictEqual(pose.previousX, 70, 'direct teleport is detected before the next fixed update');
  assert(pose.x >= 70 && pose.x <= runtime.player.x, 'post-teleport interpolation starts at teleported pose');

  runtime.state = runtime.STATE.TITLE;
  pose = runtime.api.crGetInterpolatedRenderPose();
  assert.strictEqual(pose.x, runtime.player.x, 'leaving PLAY collapses history');
  runtime.player.x = 80;
  runtime.state = runtime.STATE.PLAY;
  pose = runtime.api.crGetInterpolatedRenderPose();
  assert.strictEqual(pose.x, 80, 'entering PLAY collapses history');

  runtime.player.x = 90;
  runtime.game.district = 2;
  pose = runtime.api.crGetInterpolatedRenderPose();
  assert.strictEqual(pose.x, 90, 'District transition collapses history');

  runtime.update = dt => {
    runtime.player.x += 3 * dt;
    runtime.state = runtime.STATE.RESULTS;
  };
  runtime.api.crStepSimulationFixed(1 / 60);
  pose = runtime.api.crGetInterpolatedRenderPose();
  assert.strictEqual(pose.x, runtime.player.x, 'state transition inside a fixed update collapses history');

  runtime.player.x = 100;
  runtime.document.hidden = true;
  for (const handler of runtime.visibilityHandlers) handler();
  pose = runtime.api.crGetInterpolatedRenderPose();
  assert.strictEqual(pose.x, 100, 'visibility hide collapses history');
  runtime.player.x = 101;
  runtime.document.hidden = false;
  for (const handler of runtime.visibilityHandlers) handler();
  pose = runtime.api.crGetInterpolatedRenderPose();
  assert.strictEqual(pose.x, 101, 'visibility restore collapses history');
}

// Angle policy is authoritative and immediate even on a zero-step rendered frame.
{
  const runtime = createRuntime();
  runtime.api.crStepSimulationFixed(1 / 60);
  runtime.player.angle = 1.2345;
  runtime.api.crStepSimulationFixed(1 / 240);
  assert.strictEqual(runtime.api.crGetInterpolatedRenderPose().angle, 1.2345, 'touch/keyboard look is never one-step delayed');
}

// Locked fixed-step gameplay invariants remain unchanged.
{
  const runtime = createRuntime();
  const fixed = runtime.api.crGetFixedStepState();
  assert.strictEqual(fixed.stepDt, 1 / 60, 'fixed simulation timestep remains 1/60');
  assert.strictEqual(fixed.maxStepsPerFrame, 5, 'five-step maximum remains locked');
}

// Renderer consumes one consistent supplied scene pose and never overwrites player state.
assert(/function drawScene\(now,\s*renderPose\)/.test(renderSource), 'drawScene accepts renderPose');
assert(renderSource.includes('const px=renderPose ? renderPose.x : player.x'), 'scene x resolves from supplied render pose');
assert(renderSource.includes('py=renderPose ? renderPose.y : player.y'), 'scene y resolves from supplied render pose');
assert(renderSource.includes('a=renderPose ? renderPose.angle : player.angle'), 'scene angle resolves from supplied render pose');
assert(!/player\.(?:x|y)\s*=/.test(renderSource), 'renderer source never mutates player position');
assert(mainSource.includes('drawScene(now, renderPose)'), 'frame passes one resolved pose to scene rendering');

{
  const gradient = { addColorStop() {} };
  const bctx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'createLinearGradient') return () => gradient;
      if (!(prop in target)) target[prop] = () => {};
      return target[prop];
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  const sandbox = {
    console, Math,
    WALL: { BUILDING: 1, BRICK: 2, GLASS: 3, GARAGE: 4, CONCRETE: 5, SIGNAGE: 6, MURAL: 7 },
    game: { modifier: 'clear', props: [], pickups: [], npcs: [], exit: null, quota: 0, helped: 0 },
    player: { x: 7, y: 8, angle: 0.25, cans: 0 },
    cfg: { fov: 0.66 }, bctx, skyBuilt: 'clear', skyCanvas: {}, RH: 200, RW: 0,
    crDrawFpvStreetReadabilityCues() {},
    SNCHarnessAdapter: { captureVisualSnapshot() {}, captureSpriteGroundSnapshot() {} },
    dbg: {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${renderSource}\n;globalThis.__drawScene = drawScene;`, sandbox, { filename: renderPath });
  const before = JSON.stringify(sandbox.player);
  sandbox.__drawScene(123, { x: 6.5, y: 7.5, angle: 1.5 });
  assert.strictEqual(JSON.stringify(sandbox.player), before, 'draw interpolation does not mutate player');
}

console.log(JSON.stringify({
  pass: true,
  cadences: [...Array.from(cadenceResults.keys()), 'one clamped 300 ms frame'],
  highRefresh: [72, 90, 120, 144].map(hz => ({
    hz,
    zeroStepInterpolatedFrames: cadenceResults.get(`${hz} Hz`).zeroStepMovement,
    candidateRepeats: cadenceResults.get(`${hz} Hz`).candidateRepeats,
    baselineRepeats: cadenceResults.get(`${hz} Hz`).baselineRepeats,
  })),
  authoritativeStateParity: true,
  collisionGameplayParity: true,
  lifecycleResets: ['boot/reset', 'new run/restart/load/teleport detection', 'state leave/enter PLAY', 'District transition', 'visibility hide/restore', 'frame clamp', 'fixed-step drop', 'harness restore'],
  anglePolicy: 'authoritative immediate',
}, null, 2));
