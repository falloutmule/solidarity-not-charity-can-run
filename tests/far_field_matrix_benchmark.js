'use strict';

const assert = require('assert');
const fs = require('fs');

const ROUTE = Object.freeze([
  Object.freeze({
    id: 'near-building-straight', durationMs: 10000,
    startPose: Object.freeze({ x: 6.5, y: 9, angle: 0 }),
    controls: Object.freeze({ forward: 0.2, strafe: 0, lookRadiansPerSecond: 0 }),
    transition: 'ordinary-movement-no-teleport'
  }),
  Object.freeze({
    id: 'near-building-move-look', durationMs: 10000,
    startPose: Object.freeze({ x: 6.5, y: 9, angle: 0 }),
    controls: Object.freeze({ forward: 0.16, strafe: 0, lookRadiansPerSecond: 0.08 }),
    transition: 'ordinary-movement-no-teleport'
  }),
  Object.freeze({
    id: 'open-area-straight', durationMs: 15000,
    startPose: Object.freeze({ x: 20, y: 10.5, angle: 0 }),
    controls: Object.freeze({ forward: 0.35, strafe: 0, lookRadiansPerSecond: 0 }),
    transition: 'ordinary-movement-no-teleport'
  }),
  Object.freeze({
    id: 'open-area-move-look', durationMs: 15000,
    startPose: Object.freeze({ x: 20, y: 14, angle: 0 }),
    controls: Object.freeze({ forward: 0.2, strafe: 0, lookRadiansPerSecond: -0.08 }),
    transition: 'ordinary-movement-no-teleport'
  }),
  Object.freeze({
    id: 'open-area-turn', durationMs: 10000,
    startPose: Object.freeze({ x: 28, y: 10.5, angle: Math.PI }),
    controls: Object.freeze({ forward: 0, strafe: 0, lookRadiansPerSecond: 0.24 }),
    transition: 'ordinary-movement-no-teleport'
  })
]);

function selected(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function resolveMatrixConfigurations(input) {
  const options = input || {};
  const selectedResolution = selected(String(options.selectedResolution || ''), ['320', '400', '480'], '400');
  const selectedAngle = selected(String(options.selectedAngle || ''), ['raw', 'interp', 'smooth'], 'interp');
  return [
    { id: 'A', ffres: '320', ffangle: 'raw', ffproj: 'legacy' },
    { id: 'B', ffres: '400', ffangle: 'raw', ffproj: 'legacy' },
    { id: 'C', ffres: '480', ffangle: 'raw', ffproj: 'legacy' },
    { id: 'D', ffres: selectedResolution, ffangle: 'interp', ffproj: 'legacy' },
    { id: 'E', ffres: selectedResolution, ffangle: 'smooth', ffproj: 'legacy' },
    { id: 'F', ffres: selectedResolution, ffangle: selectedAngle, ffproj: 'subpixel' }
  ].map(Object.freeze);
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function objectFields(source, keys) {
  const value = source && typeof source === 'object' ? source : {};
  const out = {};
  for (const key of keys) out[key] = finiteOrNull(value[key]);
  return out;
}

function buildMatrixReport(config, metrics) {
  if (!config || !/^[A-F]$/.test(String(config.id))) throw new TypeError('valid A-F configuration required');
  const value = metrics && typeof metrics === 'object' ? metrics : {};
  const errors = Array.isArray(value.errors) ? value.errors.map(String) : [];
  return {
    mode: {
      configuration: config.id,
      ffres: config.ffres,
      ffangle: config.ffangle,
      ffproj: config.ffproj,
      internalResolution: config.ffres === '480' ? { width: 480, height: 300 } :
        config.ffres === '400' ? { width: 400, height: 250 } : { width: 320, height: 200 },
      route: ROUTE.map(segment => ({
        id: segment.id,
        durationMs: segment.durationMs,
        startPose: Object.assign({}, segment.startPose),
        transition: segment.transition
      }))
    },
    frame: objectFields(value.frame, ['average', 'p95', 'worst', 'over33', 'over50', 'samples']),
    scene: objectFields(value.scene, ['average', 'p95', 'worst', 'wallColumnsPerFrame', 'spriteColumnsDrawn']),
    simulation: objectFields(value.simulation, ['drops', 'stepFrames0', 'stepFrames1', 'stepFrames2', 'stepFrames3Plus']),
    angle: objectFields(value.angle, [
      'rawLookEvents', 'lookEventGapMean', 'lookEventGapP95', 'renderAngleDeltaAverage',
      'renderAngleDeltaP95', 'repeatedRenderAngleFramesDuringActiveLook', 'largestRenderAngleJump'
    ]),
    projection: objectFields(value.projection, [
      'distantSpriteCount', 'meanProjectedWidth', 'meanFractionalScreenX', 'legacySnapCount',
      'subpixelMovementCount', 'repeatedProjectedXFramesWhileMoving', 'farFieldSampleFrames',
      'distantEdgeJumpEstimate', 'largeAreaFrames'
    ]),
    errors,
    externalRequests: finiteOrNull(value.externalRequests),
    gameplayStateHash: typeof value.gameplayStateHash === 'string' && value.gameplayStateHash ?
      value.gameplayStateHash : null
  };
}

function fixtureMetrics(config, index) {
  return {
    frame: { average: 10 + index, p95: 12 + index, worst: 16 + index, over33: 0, over50: 0, samples: 60 },
    scene: { average: 2 + index / 10, p95: 3 + index / 10, worst: 4 + index / 10,
      wallColumnsPerFrame: Number(config.ffres), spriteColumnsDrawn: 100 + index },
    simulation: { drops: 0, stepFrames0: 20, stepFrames1: 40, stepFrames2: 0, stepFrames3Plus: 0 },
    angle: { rawLookEvents: index, lookEventGapMean: 10, lookEventGapP95: 12,
      renderAngleDeltaAverage: 0.01, renderAngleDeltaP95: 0.02,
      repeatedRenderAngleFramesDuringActiveLook: 0, largestRenderAngleJump: 0.02 },
    projection: { distantSpriteCount: 2, meanProjectedWidth: 3, meanFractionalScreenX: 0.25,
      legacySnapCount: config.ffproj === 'legacy' ? 1 : 0,
      subpixelMovementCount: config.ffproj === 'subpixel' ? 1 : 0,
      repeatedProjectedXFramesWhileMoving: 0, farFieldSampleFrames: 60,
      distantEdgeJumpEstimate: 1, largeAreaFrames: 30 },
    errors: [], externalRequests: 0,
    gameplayStateHash: `deterministic-fixture-${config.id}`
  };
}

function parseArg(name) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find(arg => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

function selfTest() {
  const configs = resolveMatrixConfigurations({ selectedResolution: '400', selectedAngle: 'interp' });
  assert.strictEqual(configs.length, 6);
  assert.strictEqual(ROUTE.reduce((sum, segment) => sum + segment.durationMs, 0), 60000);
  assert(ROUTE.every(segment => segment.transition === 'ordinary-movement-no-teleport'));
  const reports = configs.map((config, index) => buildMatrixReport(config, fixtureMetrics(config, index)));
  assert.strictEqual(reports.length, 6);
  assert(reports.every(report => report.errors.length === 0 && report.externalRequests === 0));
  assert(!/NaN|Infinity/.test(JSON.stringify(reports)));
  console.log('far_field_matrix_benchmark: SELF-TEST PASS (deterministic fixture, 6 reports)');
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) {
    selfTest();
  } else {
    const configs = resolveMatrixConfigurations({
      selectedResolution: parseArg('selected-resolution'),
      selectedAngle: parseArg('selected-angle')
    });
    if (process.argv.includes('--fixture')) {
      configs.forEach((config, index) => console.log(JSON.stringify(buildMatrixReport(config, fixtureMetrics(config, index)))));
    } else {
      const id = String(parseArg('config') || '').toUpperCase();
      const config = configs.find(item => item.id === id);
      const inputPath = parseArg('input');
      if (!config || !inputPath) {
        console.error('usage: node tests/far_field_matrix_benchmark.js --self-test | --fixture [--selected-resolution=400 --selected-angle=interp] | --config=A --input=metrics.json');
        process.exitCode = 2;
      } else {
        const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        console.log(JSON.stringify(buildMatrixReport(config, input)));
      }
    }
  }
}

module.exports = { ROUTE, resolveMatrixConfigurations, buildMatrixReport };
