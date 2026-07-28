'use strict';
const { assert, requireSource } = require('./heightfield_test_helpers');
const source = requireSource('src/js/game-16d-heightfield-renderer.js', ['capacity: 80', 'const profile =', 'if(profile.topLevel === 0) continue;', 'if(crHeightfieldTopZ(profile) >= 1', 'for(let i = count - 1; i >= 0; i--)']);
assert(!source.includes('getImageData('), 'heightfield DDA does not read canvas pixels');
console.log(JSON.stringify({ pass: true, check: 'continued multi-height DDA' }));
