'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'src/js/game-16-section-7-render.js'), 'utf8');
const forbidden = ['distance fog on sprite', 'const sf = Math.min', 'if(sf>0.02)', 'bctx.fillRect(c0, top'];
for (const token of forbidden) assert(!source.includes(token), `sprite halo regression token present: ${token}`);
for (const token of ['SPRITE HALO REGRESSION GUARD', 'no full-rect sprite fog', 'phone-visible rectangular halos']) {
  assert(source.includes(token), `sprite halo regression marker missing: ${token}`);
}
console.log(JSON.stringify({ pass: true, owner: 'game-16-section-7-render.js', forbiddenCount: forbidden.length }));
