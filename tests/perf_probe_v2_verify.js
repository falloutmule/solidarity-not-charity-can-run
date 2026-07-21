'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const probePath = path.join(root, 'src/js/game-21a-section-12b-perf-probe.js');
const source = fs.readFileSync(probePath, 'utf8');

function makeContext(search) {
  let clock = 0;
  const listeners = [];
  const context = {
    URLSearchParams,
    location: { search },
    performance: { now: () => ++clock },
    devicePixelRatio: 2,
    state: 1,
    paused: false,
    STATE: { PLAY: 1 },
    BUILD_ID: 'test-build',
    game: { district: 1, seed: 42, props: [], npcs: [], pickups: [], exit: null },
    view: { width: 320, height: 180, clientWidth: 320, clientHeight: 180 },
    mobileMode: false,
    isMobilePortrait: () => false,
    crIsPortraitLayout: () => false,
    crGetSelectedStartDistrict: () => 1,
    document: {
      getElementById(id) {
        if (id !== 'view') return null;
        return {
          addEventListener(type, fn) { listeners.push([type, fn]); },
          getBoundingClientRect() { return { left: 0, top: 0 }; }
        };
      }
    },
    drawScene() { return 'scene'; },
    drawMinap() { return 'map'; },
    drawPortraitDashboardChrome() { return 'chrome'; },
    drawHUD() { return 'hud'; },
    crStepSimulationFixed(dt) {
      return { dt, steps: 1, accumulator: 0, droppedFrames: 0 };
    },
    crGetFixedStepState() { return { droppedFrames: 0, stepDt: 1 / 60 }; },
    drawMobileMenu() { return 'menu'; },
    applyMobileControlSettings() { return 'layout'; },
    drawWholeFaceBitmapBuildingColumn() { return true; },
    CR: {}
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: probePath });
  return context;
}

// Dormant means no wrapping, listeners, state/report allocation, or gameplay mutation.
{
  const c = makeContext('');
  const originals = [c.drawScene, c.crStepSimulationFixed, c.drawMobileMenu,
    c.applyMobileControlSettings, c.drawWholeFaceBitmapBuildingColumn];
  const stateBefore = JSON.stringify(c.game);
  c.crPerfProbeEnsureInstalled();
  assert.deepStrictEqual(
    [c.drawScene, c.crStepSimulationFixed, c.drawMobileMenu,
      c.applyMobileControlSettings, c.drawWholeFaceBitmapBuildingColumn],
    originals,
    'disabled probe must not wrap runtime functions'
  );
  assert.strictEqual(c.crPerfProbeGetReport(), null);
  assert.strictEqual(JSON.stringify(c.game), stateBefore, 'disabled probe must not mutate gameplay state');
  assert.strictEqual(c.CR.crPerfProbeGetReport, undefined, 'disabled probe must not alter CR API');
}

const c = makeContext('?perfprobe=1');
const gameplayBefore = JSON.stringify(c.game);
let receiver;
c.drawScene = function(a, b) { receiver = this; return a + b; };
c.drawMinap = function() { return 17; };
c.drawPortraitDashboardChrome = function() { return 18; };
c.drawHUD = function() { return 19; };
c.drawMobileMenu = function() { return 20; };
c.applyMobileControlSettings = function() { return 21; };
c.drawWholeFaceBitmapBuildingColumn = function() { return true; };
let stepPlan = [0, 1, 2, 3, 7];
let dropped = 0;
c.crGetFixedStepState = () => ({ droppedFrames: dropped, stepDt: 1 / 60 });
c.crStepSimulationFixed = function(dt) {
  receiver = this;
  const steps = stepPlan.shift();
  if (steps === 7) dropped++;
  return { dt, steps, accumulator: dt / 2, droppedFrames: dropped };
};
c.crPerfProbeEnsureInstalled();
assert.strictEqual(typeof c.CR.crPerfProbeGetReport, 'function', 'report must be exposed through CR');

const owner = { marker: true };
assert.strictEqual(c.drawScene.call(owner, 2, 3), 5, 'scene wrapper return value');
assert.strictEqual(receiver, owner, 'wrapper must preserve this');
assert.strictEqual(c.drawMinap(), 17);
assert.strictEqual(c.drawPortraitDashboardChrome(), 18);
assert.strictEqual(c.drawHUD(), 19);
assert.strictEqual(c.drawMobileMenu(), 20);
assert.strictEqual(c.applyMobileControlSettings(), 21);
assert.strictEqual(c.drawWholeFaceBitmapBuildingColumn(), true);
for (const dt of [0.001, 0.002, 0.003, 0.004, 0.005]) c.crStepSimulationFixed.call(owner, dt);
assert.strictEqual(receiver, owner, 'simulation wrapper must preserve this');

// Frame bucket boundaries: one sample in every required bucket.
for (const now of [100, 109, 119, 134, 159, 199, 250]) c.crPerfProbeFrameStart(now);
let report = c.CR.crPerfProbeGetReport();
assert.strictEqual(report.stepFrames0, 1);
assert.strictEqual(report.stepFrames1, 1);
assert.strictEqual(report.stepFrames2, 1);
assert.strictEqual(report.stepFrames3Plus, 2);
assert.strictEqual(report.fixedStepDrops, 1);
assert(report.accumulatorAlphaAvg > 0, 'accumulator alpha must be measured before interpolation lands');
assert.deepStrictEqual(JSON.parse(JSON.stringify(report.frameBuckets)), {
  under9_5: 1,
  from9_5To13_5: 1,
  from13_5To20: 1,
  from20To33: 1,
  from33To50: 1,
  over50: 1
});
assert.strictEqual(report.interpolationActive, false);
assert.strictEqual(report.interpolatedFrames, 0);
assert.strictEqual(report.zeroStepInterpolatedFrames, 0);
assert.strictEqual(report.repeatedRenderPoseFrames, 0);
assert.strictEqual(report.renderDeltaAvg, 0);
assert.strictEqual(report.renderDeltaWorst, 0);
assert.strictEqual(report.mobileLayoutFlushes, 1, 'legacy apply call is a layout flush');
assert.strictEqual(report.mobileStableEarlyOuts, 0, 'early-outs must not be inferred');
assert.strictEqual(JSON.stringify(c.game), gameplayBefore, 'enabled probe must not mutate gameplay state');

// A long delivery gap is correlated with timings from the immediately preceding frame.
const correlation = makeContext('?perfprobe=1');
correlation.crPerfProbeEnsureInstalled();
correlation.crPerfProbeFrameStart(100);
correlation.crStepSimulationFixed(0.016);
correlation.drawScene(100);
correlation.drawMinap();
correlation.drawPortraitDashboardChrome();
correlation.drawHUD();
correlation.drawMobileMenu();
correlation.crPerfProbeFrameStart(145);
const correlationReport = correlation.CR.crPerfProbeGetReport();
assert.strictEqual(correlationReport.longFrame.thresholdMs, 33);
assert.strictEqual(correlationReport.longFrame.samples, 1);
assert.strictEqual(correlationReport.longFrame.gapMs.worst, 45);
assert(correlationReport.longFrame.precedingPhaseMs.simulation.p95 > 0);
assert(correlationReport.longFrame.precedingPhaseMs.scene.p95 > 0);
assert(correlationReport.longFrame.precedingPhaseMs.ui.p95 > 0);

// Lane C counters remain truthful and distinct when its API is available.
let mobileStats = {
  drawCalls: 10, stableEarlyOuts: 3, uiFlushes: 2, layoutFlushes: 1,
  domWrites: 4, styleWrites: 5, safeAreaReads: 6, overrideStorageReads: 7
};
c.crGetMobileUiSyncStats = () => Object.assign({}, mobileStats);
c.crPerfProbeReset();
mobileStats = {
  drawCalls: 16, stableEarlyOuts: 8, uiFlushes: 3, layoutFlushes: 3,
  domWrites: 9, styleWrites: 11, safeAreaReads: 7, overrideStorageReads: 9
};
report = c.CR.crPerfProbeGetReport();
assert.strictEqual(report.mobileStableEarlyOuts, 5);
assert.strictEqual(report.mobileLayoutFlushes, 2);
assert.strictEqual(report.mobileMenuDomWorkCalls, 1);
assert.strictEqual(report.safeAreaReads, 1);
assert.strictEqual(report.overrideStorageReads, 2);

// Every v2 wrapper propagates the original error unchanged.
const boom = new Error('expected wrapper failure');
for (const name of ['crStepSimulationFixed', 'drawMobileMenu',
  'applyMobileControlSettings', 'drawWholeFaceBitmapBuildingColumn']) {
  const errorContext = makeContext('?perfprobe=1');
  errorContext[name] = function() { throw boom; };
  errorContext.crPerfProbeEnsureInstalled();
  assert.throws(() => errorContext[name](), err => err === boom, `${name} must propagate errors`);
}

// Interpolation sampling uses the locked API without touching player/game state.
const interp = makeContext('?perfprobe=1');
let poseIndex = 0;
const poses = [
  { x: 0, y: 0, alpha: 0.2, interpolatedPosition: true, authoritativeX: 1, authoritativeY: 0, previousX: 0, previousY: 0 },
  { x: 0.5, y: 0, alpha: 0.5, interpolatedPosition: true, authoritativeX: 1, authoritativeY: 0, previousX: 0, previousY: 0 },
  { x: 1, y: 0, alpha: 0.8, interpolatedPosition: true, authoritativeX: 2, authoritativeY: 0, previousX: 1, previousY: 0 }
];
interp.crGetInterpolatedRenderPose = () => poses[Math.min(poseIndex++, poses.length - 1)];
interp.crGetRenderInterpolationAlpha = () => poses[Math.max(0, poseIndex - 1)].alpha;
interp.crStepSimulationFixed = dt => ({ dt, steps: 0, accumulator: dt, droppedFrames: 0 });
interp.crPerfProbeEnsureInstalled();
for (let i = 0; i < 3; i++) { interp.crStepSimulationFixed(0.01); interp.drawScene(10 + i); }
const interpReport = interp.CR.crPerfProbeGetReport();
assert.strictEqual(interpReport.interpolationActive, true);
assert.strictEqual(interpReport.interpolatedFrames, 3);
assert.strictEqual(interpReport.zeroStepInterpolatedFrames, 2);
assert(interpReport.interpolationAlphaAvg > 0 && interpReport.interpolationAlphaAvg < 1);
assert(interpReport.renderDeltaAvg > 0);

// Report is plain JSON-safe data: no non-finite numbers, functions, DOM nodes, or cycles.
const json = JSON.stringify(interpReport);
assert(!/NaN|Infinity/.test(json));
const parsed = JSON.parse(json);
(function inspect(value) {
  if (!value || typeof value !== 'object') {
    assert.notStrictEqual(typeof value, 'function');
    if (typeof value === 'number') assert(Number.isFinite(value));
    return;
  }
  for (const item of Object.values(value)) inspect(item);
})(parsed);

// Overlay must fit the 320x180 internal FPV buffer.
const rects = [];
const overlayCtx = {
  lines: [], save() {}, restore() {}, setTransform() {}, fillText(text) { this.lines.push(text); },
  fillRect(x, y, w, h) { rects.push({ x, y, w, h }); },
  set fillStyle(v) {}, set font(v) {}, set textBaseline(v) {}
};
interp.crPerfProbeDrawOverlay(overlayCtx, 1000);
assert(rects.length > 0);
assert(rects.every(r => r.x >= 0 && r.y >= 0 && r.x + r.w <= 320 && r.y + r.h <= 180),
  'overlay must remain within internal FPV bounds');
assert(overlayCtx.lines.some(line => line.startsWith('lf n/g ')), 'compact overlay must expose long-frame gaps');
assert(!overlayCtx.lines.some(line => line.startsWith('lf p/w ')), 'compact overlay omits detail when there is no room');

interp.view.height = 250;
const detailedOverlayCtx = {
  lines: [], save() {}, restore() {}, setTransform() {}, fillText(text) { this.lines.push(text); },
  fillRect() {}, set fillStyle(v) {}, set font(v) {}, set textBaseline(v) {}
};
interp.crPerfProbeDrawOverlay(detailedOverlayCtx, 1600);
assert(detailedOverlayCtx.lines.some(line => line.startsWith('lf p/w ')), 'roomy overlay exposes correlated phase p95/worst');

interp.crPerfProbeReset();
const reset = interp.CR.crPerfProbeGetReport();
for (const field of ['stepFrames0', 'stepFrames1', 'stepFrames2', 'stepFrames3Plus',
  'fixedStepDrops', 'accumulatorAlphaAvg', 'accumulatorAlphaMin', 'accumulatorAlphaMax',
  'interpolatedFrames', 'zeroStepInterpolatedFrames',
  'repeatedRenderPoseFrames', 'renderDeltaAvg', 'renderDeltaWorst', 'bitmapColumns']) {
  assert.strictEqual(reset[field], 0, `reset must clear ${field}`);
}
assert.strictEqual(reset.longFrame.samples, 0, 'reset must clear long-frame correlation samples');
assert.deepStrictEqual(JSON.parse(JSON.stringify(reset.frameBuckets)), {
  under9_5: 0, from9_5To13_5: 0, from13_5To20: 0,
  from20To33: 0, from33To50: 0, over50: 0
});

console.log('perf_probe_v2_verify: PASS');
