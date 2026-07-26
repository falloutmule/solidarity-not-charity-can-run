'use strict';
const { assert, requireSource } = require('./heightfield_test_helpers');
const source = requireSource('src/js/game-16d-heightfield-renderer.js', ['capacity: 80', 'const profile =', 'if(profile.topLevel === CR_VERTICAL_PROFILE_IDS.EMPTY) continue;', 'if(profile.topLevel === CR_VERTICAL_PROFILE_IDS.FULL_LEGACY', 'for(let i = count - 1; i >= 0; i--)']);
assert(!source.includes('getImageData('), 'heightfield DDA does not read canvas pixels');
console.log(JSON.stringify({ pass: true, check: 'continued multi-height DDA' }));
