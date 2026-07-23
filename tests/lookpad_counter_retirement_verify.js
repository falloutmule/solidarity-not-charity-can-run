'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'src', 'js', 'game-06-section-2b-mobile-touch-input.js');
const source = fs.readFileSync(inputPath, 'utf8');

for (const symbol of ['_crLookPadApplyCount', 'crResetLookPadApplyCount', 'crGetLookPadApplyCount']) {
  assert(!source.includes(symbol), `retired LOOK-pad instrumentation remains: ${symbol}`);
}

const start = source.indexOf('function crApplyLookPadDx(');
const end = source.indexOf('/** Apply accumulated look delta', start);
assert(start >= 0 && end > start, 'LOOK-pad apply owner must remain bounded');
const apply = source.slice(start, end);
assert(apply.includes('if(state!==STATE.PLAY || paused) return false;'), 'LOOK applies only during active PLAY');
assert(apply.includes('if(Math.abs(dx) <= 0.2) return false;'), 'LOOK deadband is unchanged');
assert(apply.includes('crApplyRawTouchLookDelta(dx * mobileLookSens(), eventTimestamp);'), 'LOOK still forwards the exact sensitivity-scaled delta');
assert(apply.includes('return true;'), 'LOOK reports accepted input');

console.log(JSON.stringify({ check: 'lookpad-counter-retirement', pass: true }));
