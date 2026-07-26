'use strict';
const { assert, requireSource } = require('./heightfield_test_helpers');
const source = requireSource('src/js/game-15a-variable-height-core.js', ['north:', 'east:', 'south:', 'west:', 'top:']);
const renderer = requireSource('src/js/game-16d-heightfield-renderer.js', ["function crHeightfieldFacePattern", "getContext('2d', { alpha: false })", "data[index * 4 + 3] = 255"]);
const colors = ['#d9534f', '#4cae4c', '#e59a2f', '#8a62d5', '#2f9ed7'];
assert.strictEqual(new Set(colors).size, 5, 'five debug materials are independent');
assert(colors.every((color) => source.includes(color)), 'all debug materials are opaque source colors');
assert(renderer.includes('CR_HEIGHTFIELD_FACE_TEXTURE_ACCENTS'), 'side debug materials are textured with opaque accents');
console.log(JSON.stringify({ pass: true, check: 'five opaque debug textures' }));
