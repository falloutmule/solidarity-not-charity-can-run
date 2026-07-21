'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const probePath = path.join(root, 'src/js/game-21a-section-12b-perf-probe.js');
const source = fs.readFileSync(probePath, 'utf8');

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeContext(search, peers) {
  let clock = 0;
  const listeners = [];
  const context = Object.assign({
    URLSearchParams,
    location: { search },
    performance: { now: () => ++clock },
    devicePixelRatio: 2,
    state: 1,
    paused: false,
    STATE: { PLAY: 1 },
    BUILD_ID: 'far-field-profiler-test',
    RW: 320,
    RH: 200,
    player: { x: 11, y: 10.5, angle: -Math.PI / 2 },
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
    crStepSimulationFixed(dt) { return { dt, steps: 1, accumulator: 0, droppedFrames: 0 }; },
    crGetFixedStepState() { return { droppedFrames: 0, stepDt: 1 / 60 }; },
    drawMobileMenu() { return 'menu'; },
    applyMobileControlSettings() { return 'layout'; },
    drawWholeFaceBitmapBuildingColumn() { return true; },
    CR: {}
  }, peers || {});
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: probePath });
  return { context, listeners };
}

// SNC-FARFIELD-040: identity falls back independently and reads guarded profile peers.
{
  const fallback = makeContext('?perfprobe=1').context;
  fallback.crPerfProbeEnsureInstalled();
  const report = fallback.crPerfProbeGetReport();
  assert.strictEqual(report.ffres, '320');
  assert.strictEqual(report.ffangle, 'raw');
  assert.strictEqual(report.ffproj, 'legacy');
  assert.deepStrictEqual(plain(report.internalResolution), { width: 320, height: 200 });

  const peer = makeContext('?perfprobe=1', {
    crGetRenderProfile: () => Object.freeze({ id: '480', width: 480, height: 300, scale: 1.5 }),
    crGetSelectedRenderAngleMode: () => 'smooth',
    crResolveFarFieldProjectionMode: () => 'subpixel'
  }).context;
  peer.crPerfProbeEnsureInstalled();
  const selected = peer.crPerfProbeGetReport();
  assert.strictEqual(selected.ffres, '480');
  assert.strictEqual(selected.ffangle, 'smooth');
  assert.strictEqual(selected.ffproj, 'subpixel');
  assert.deepStrictEqual(plain(selected.internalResolution), { width: 480, height: 300 });
}

// SNC-FARFIELD-041: angular cadence comes from a guarded peer sample API and is reset-relative.
{
  let angleStats = {
    rawLookEvents: 10,
    lookEventGaps: [8, 12],
    renderAngleDeltas: [0.01, 0.03],
    repeatedRenderAngleFramesDuringActiveLook: 2,
    largestRenderAngleJump: 0.03
  };
  const c = makeContext('?perfprobe=1', {
    crGetRenderAngleCadenceStats: () => Object.assign({}, angleStats, {
      lookEventGaps: angleStats.lookEventGaps.slice(),
      renderAngleDeltas: angleStats.renderAngleDeltas.slice()
    })
  }).context;
  c.crPerfProbeEnsureInstalled();
  c.crPerfProbeReset();
  angleStats = {
    rawLookEvents: 13,
    lookEventGaps: [8, 12, 10, 20],
    renderAngleDeltas: [0.01, 0.03, 0.02, 0, 0.04],
    repeatedRenderAngleFramesDuringActiveLook: 3,
    largestRenderAngleJump: 0.04
  };
  const report = c.crPerfProbeGetReport();
  assert.strictEqual(report.rawLookEvents, 3);
  assert.strictEqual(report.lookEventGapMean, 15);
  assert.strictEqual(report.lookEventGapP95, 20);
  assert.strictEqual(report.renderAngleDeltaAverage, 0.02);
  assert.strictEqual(report.renderAngleDeltaP95, 0.04);
  assert.strictEqual(report.repeatedRenderAngleFramesDuringActiveLook, 1);
  assert.strictEqual(report.largestRenderAngleJump, 0.04);

  delete c.crGetRenderAngleCadenceStats;
  const unavailable = c.crPerfProbeGetReport();
  for (const key of ['rawLookEvents', 'lookEventGapMean', 'lookEventGapP95',
    'renderAngleDeltaAverage', 'renderAngleDeltaP95',
    'repeatedRenderAngleFramesDuringActiveLook', 'largestRenderAngleJump']) {
    assert.strictEqual(unavailable[key], null, `${key} must be null when angle peer is unavailable`);
  }
}

// SNC-FARFIELD-042: projection and deterministic open-area motion counters are peer-owned deltas.
{
  let projectionStats = {
    mode: 'subpixel', depthThreshold: 8, projectedSpriteCount: 20,
    distantSpriteCount: 10, projectedWidthSum: 40, fractionalScreenXSum: 2,
    legacySnapCount: 1, subpixelMovementCount: 4,
    repeatedProjectedXFramesWhileMoving: 3
  };
  let motionStats = {
    sampleFrames: 100, openAreaFrames: 40, distantEdgeJumpTotal: 12,
    distantEdgeJumpSamples: 6, wallColumnsDrawn: 32000, spriteColumnsDrawn: 500
  };
  const c = makeContext('?perfprobe=1', {
    crGetProjectionQuantizationStats: () => Object.assign({}, projectionStats),
    crGetFarFieldMotionStats: () => Object.assign({}, motionStats)
  }).context;
  c.crPerfProbeEnsureInstalled();
  c.crPerfProbeReset();
  projectionStats = {
    mode: 'subpixel', depthThreshold: 8, projectedSpriteCount: 25,
    distantSpriteCount: 15, projectedWidthSum: 55, fractionalScreenXSum: 3.5,
    legacySnapCount: 2, subpixelMovementCount: 7,
    repeatedProjectedXFramesWhileMoving: 5
  };
  motionStats = {
    sampleFrames: 104, openAreaFrames: 43, distantEdgeJumpTotal: 18,
    distantEdgeJumpSamples: 9, wallColumnsDrawn: 33280, spriteColumnsDrawn: 560
  };
  const report = c.crPerfProbeGetReport();
  assert.strictEqual(report.wallColumnsPerFrame, 320);
  assert.strictEqual(report.spriteColumnsDrawn, 60);
  assert.strictEqual(report.farFieldSampleFrames, 4);
  assert.strictEqual(report.distantEdgeJumpEstimate, 2);
  assert.strictEqual(report.subpixelUsage, 3);
  assert.strictEqual(report.largeAreaSceneClassification, 'large-open-area');
  assert.strictEqual(report.largeAreaFrames, 3);
  assert.deepStrictEqual(plain(report.projection), {
    distantSpriteCount: 5,
    meanProjectedWidth: 3,
    meanFractionalScreenX: 0.3,
    legacySnapCount: 1,
    subpixelMovementCount: 3,
    repeatedProjectedXFramesWhileMoving: 2
  });

  c.crGetProjectionQuantizationStats = () => { throw new Error('peer absent'); };
  c.crGetFarFieldMotionStats = () => ({ sampleFrames: 1 });
  const unavailable = c.crPerfProbeGetReport();
  assert(Object.values(unavailable.projection).every(value => value === null));
  for (const key of ['wallColumnsPerFrame', 'spriteColumnsDrawn', 'farFieldSampleFrames',
    'distantEdgeJumpEstimate', 'subpixelUsage', 'largeAreaSceneClassification', 'largeAreaFrames']) {
    assert.strictEqual(unavailable[key], null, `${key} must fail closed`);
  }
}

// SNC-FARFIELD-043/044: matrix harness locks the ordinary-D1 route and A-F JSON schema.
{
  const matrix = require('./far_field_matrix_benchmark.js');
  assert.deepStrictEqual(matrix.ROUTE.map(segment => segment.id), [
    'near-building-straight', 'near-building-move-look', 'open-area-straight',
    'open-area-move-look', 'open-area-turn'
  ]);
  assert.deepStrictEqual(matrix.ROUTE.map(segment => segment.durationMs), [10000, 10000, 15000, 15000, 10000]);
  assert(matrix.ROUTE.every(segment => segment.transition === 'ordinary-movement-no-teleport'));
  const configs = matrix.resolveMatrixConfigurations({ selectedResolution: '400', selectedAngle: 'interp' });
  assert.deepStrictEqual(configs.map(item => `${item.id}:${item.ffres}/${item.ffangle}/${item.ffproj}`), [
    'A:320/raw/legacy', 'B:400/raw/legacy', 'C:480/raw/legacy',
    'D:400/interp/legacy', 'E:400/smooth/legacy', 'F:400/interp/subpixel'
  ]);
  const report = matrix.buildMatrixReport(configs[0], {});
  assert.deepStrictEqual(Object.keys(report), [
    'mode', 'frame', 'scene', 'simulation', 'angle', 'projection',
    'errors', 'externalRequests', 'gameplayStateHash'
  ]);
  assert.strictEqual(JSON.stringify(report).includes('NaN'), false);
}

// SNC-FARFIELD-045: malformed peer identity cannot create arbitrary dimensions or labels.
{
  const c = makeContext('?perfprobe=1', {
    crGetRenderProfile: () => ({ id: '480', width: 999, height: 1, scale: 99 }),
    crGetSelectedRenderAngleMode: () => 'SMOOTH',
    crResolveFarFieldProjectionMode: () => 'subpixel-ish'
  }).context;
  c.crPerfProbeEnsureInstalled();
  const report = c.crPerfProbeGetReport();
  assert.deepStrictEqual(plain(report.internalResolution), { width: 480, height: 300 });
  assert.strictEqual(report.ffangle, 'raw');
  assert.strictEqual(report.ffproj, 'legacy');
}

console.log('far_field_profiler_verify: PASS');
