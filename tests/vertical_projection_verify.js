'use strict';
const { assert, requireSource, project } = require('./heightfield_test_helpers');
requireSource('src/js/game-15a-variable-height-core.js', ['eyeZ: 0.68', 'crProjectWorldZToScreenY', 'CR_HEIGHT_LEVELS']);
for (const depth of [0.25, 1, 4, 12]) {
  const bottom = project(0, depth, 0.68, 250);
  const top = project(1, depth, 0.68, 250);
  assert(Math.abs((bottom - top) - 250 / depth) < 1e-9, 'full-wall projection preserves height');
  assert(project(0.5, depth, 0.68, 250) > 125, 'half top remains below horizon');
}
console.log(JSON.stringify({ pass: true, check: 'vertical projection' }));
