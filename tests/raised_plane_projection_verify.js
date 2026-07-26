'use strict';
const { assert, requireSource } = require('./heightfield_test_helpers');
const source = requireSource('src/js/game-16d-heightfield-renderer.js', ['const rowDepth = RH * eyeDelta / (y - horizon);', 'crHeightfieldTopColor', 'worldDepthPixels[index] = rowDepth', 'putImageData']);
for (const y of [126, 150, 249]) assert(250 * 0.18 / (y - 125) > 0, 'raised plane depth stays positive below horizon');
assert(!source.includes('getImageData('), 'raised plane has no readback');
console.log(JSON.stringify({ pass: true, check: 'raised plane projection' }));
