'use strict';
const { assert, requireSource } = require('./heightfield_test_helpers');
const fixture = requireSource('src/js/game-11-section-3b.js', [
  "const alignedBehindBlock = { x: 11.5, y: 5.7 };",
  "const lateralLane = { x: 14.5, y: 9.5 };",
  "const canPosition = occlusionSubject === 'can' ? alignedBehindBlock : lateralLane;",
  "const npcPosition = occlusionSubject === 'npc' ? alignedBehindBlock : lateralLane;",
  "'can-side': [14.2, 5.7, 11.5, 5.7]"
]);
assert(fixture.includes("params.get('hftarget') === 'npc' ? 'npc' : 'can'"), 'fixture selects one occlusion subject per lane');
const renderer = requireSource('src/js/game-16d-heightfield-renderer.js', ['canVisiblePixels', 'canOccludedPixels', 'npcVisiblePixels', 'npcOccludedPixels', 'const heightfieldGroundY = crProjectWorldZToScreenY(0, depth, CR_HEIGHTFIELD_CAMERA.eyeZ);']);
assert(renderer.includes("crHeightfieldDrawSprite('can'"), 'can uses the same depth-tested sprite path');
assert(renderer.includes("crHeightfieldDrawSprite('npc'"), 'NPC uses the same depth-tested sprite path');
console.log(JSON.stringify({ pass: true, check: 'aligned can and independent NPC occlusion fixture' }));
