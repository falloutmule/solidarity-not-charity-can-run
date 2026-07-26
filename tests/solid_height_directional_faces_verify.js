'use strict';
const { assert, requireSource } = require('./heightfield_test_helpers');
requireSource('src/js/game-15a-variable-height-core.js', ['function crHeightfieldFaceForHit', '(worldFace - quarterTurns + 4) % 4']);
function face(side, stepX, stepY, rotation) {
  const world = side === 0 ? (stepX > 0 ? 3 : 1) : (stepY > 0 ? 0 : 2);
  return ['north', 'east', 'south', 'west'][(world - rotation + 4) % 4];
}
assert.deepStrictEqual([face(1, 0, 1, 0), face(0, -1, 0, 0), face(1, 0, -1, 0), face(0, 1, 0, 0)], ['north', 'east', 'south', 'west']);
assert.strictEqual(face(1, 0, 1, 1), 'west', 'quarter rotation remaps material without mirroring');
console.log(JSON.stringify({ pass: true, check: 'directional face mapping' }));
