'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'src', 'js', 'game-14-section-5b-local-persistence.js'), 'utf8');
const OPTIONS_LOAD = '\noptions.load();';
const end = SOURCE.indexOf(OPTIONS_LOAD);
assert(end > 0, 'options initialization boundary must exist');
const OPTIONS_MODULE = `${SOURCE.slice(0, end)}\noptions.load();\nglobalThis.__sncOptions = options;\n`;

function nearestStep(value, steps){
  return steps.reduce((best, step) => Math.abs(step - value) < Math.abs(best - value) ? step : best, steps[0]);
}

function boot(storage){
  const sandbox = {
    console, JSON, Math, Object, Number, String, Array,
    SAVE_VERSION: 1,
    LOOK_SPEED_STEPS: [0.5, 0.75, 1, 1.5, 2, 2.5, 3],
    JOY_SIZE_STEPS: [80, 90, 100, 110, 120, 130, 140, 150, 165, 180, 200, 220],
    BTN_SIZE_STEPS: [60, 70, 80, 85, 95, 100, 110, 120, 130, 145, 160, 175],
    LOOK_PAD_SIZE_STEPS: [72, 88, 100, 112, 128, 144, 160, 176, 200, 220, 240],
    CONTROL_Y_STEPS: [120, 0, -120, -240],
    OPACITY_STEPS: [0.30, 0.45, 0.60, 0.75],
    MINIMAP_SIZE_STEPS: [68, 82, 96, 110],
    DEADZONE_STEPS: [4, 8, 12, 16],
    LEGACY_LOOK_TO_SPEED: { low:0.75, med:1, high:1.5, fast:2.5 },
    LEGACY_SIZE_TO_JOY: { small:90, med:110, large:165 },
    LEGACY_SIZE_TO_BTN: { small:70, med:85, large:120 },
    LEGACY_OPACITY: { low:0.30, med:0.60, high:0.75 },
    LEGACY_MAP_SIZE: { small:68, med:82, large:96 },
    LEGACY_DEADZONE: { low:4, med:8, high:12 },
    BASE_MOBILE_TURN_SENS: 0.0062,
    lookSensFromSpeed: (value) => 0.0062 * (Number(value) || 1),
    nearestStep,
    sanitizeRunnerName: (value) => String(value || 'RUNNER'),
    localStorage: {
      getItem(key){ return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value){ storage.set(key, String(value)); },
      removeItem(key){ storage.delete(key); },
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(OPTIONS_MODULE, sandbox, { filename:'game-14-section-5b-local-persistence.js' });
  return sandbox.__sncOptions;
}

const storage = new Map();
const first = boot(storage);
first.joySizePx = 165;
first.buttonSizePx = 145;
first.lookSizePx = 176;
first.controlsYOffsetPx = -120;
first.save();

const saved = JSON.parse(storage.get('cannedRun.settings.v1'));
assert.deepStrictEqual(
  { joySizePx:saved.joySizePx, buttonSizePx:saved.buttonSizePx, lookSizePx:saved.lookSizePx, controlsYOffsetPx:saved.controlsYOffsetPx },
  { joySizePx:165, buttonSizePx:145, lookSizePx:176, controlsYOffsetPx:-120 },
  'saved options must record selected control sizes and dock height',
);

const reloaded = boot(storage);
assert.deepStrictEqual(
  { joySizePx:reloaded.joySizePx, buttonSizePx:reloaded.buttonSizePx, lookSizePx:reloaded.lookSizePx, controlsYOffsetPx:reloaded.controlsYOffsetPx },
  { joySizePx:165, buttonSizePx:145, lookSizePx:176, controlsYOffsetPx:-120 },
  'a fresh runtime must restore selected control sizes and dock height',
);

console.log(JSON.stringify({ check:'mobile-options-persistence', pass:true, savedControls:{ joySizePx:saved.joySizePx, buttonSizePx:saved.buttonSizePx, lookSizePx:saved.lookSizePx, controlsYOffsetPx:saved.controlsYOffsetPx } }));
