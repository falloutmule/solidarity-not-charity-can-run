'use strict';

const { assert, requireSource, source } = require('./heightfield_test_helpers');

const core = requireSource('src/js/game-15a-variable-height-core.js', [
  'CR_HEIGHTFIELD_MATERIAL_IDS', 'CR_HEIGHTFIELD_MATERIALS', 'stableId: \'proof_debug_half\'',
  'function crHeightfieldMaterialAt', 'function crHeightfieldSideMaterialId',
  'function crHeightfieldTopMaterialId', 'function crHeightfieldProfileRegistryReady',
  'function crHeightfieldMaterialRegistryReady', 'function crHeightfieldHasValidProfileGrid',
  'function crHeightfieldIsActive'
]);

const activeBody = core.slice(core.indexOf('function crHeightfieldIsActive(){'), core.indexOf('function crHeightfieldClearState(){'));
assert(!activeBody.includes("customLevel === 'heightfield_proof'"), 'heightfield activation must not depend on the proof level ID');
assert(activeBody.includes('crHeightfieldHasValidProfileGrid()'), 'activation requires a valid profile grid');
assert(activeBody.includes('crHeightfieldProfileRegistryReady()'), 'activation requires the profile registry');
assert(activeBody.includes('crHeightfieldMaterialRegistryReady()'), 'activation requires the material registry');
assert(activeBody.includes('state === STATE.PLAY'), 'activation is gameplay-only');
assert(core.includes("const CR_HEIGHTFIELD_FACE_INDEX = Object.freeze({ north: 0, east: 1, south: 2, west: 3 })"),
  'side materials use one explicit local face ordering');
assert(core.includes('return crHeightfieldMaterialAt(materialId) ? materialId : null;'),
  'side material lookup rejects unknown descriptors');
assert(core.includes('return crHeightfieldMaterialAt(profile.topMaterial) ? profile.topMaterial : null;'),
  'top material lookup rejects unknown descriptors');

const renderer = source('src/js/game-16d-heightfield-renderer.js');
assert(renderer.includes('crHeightfieldDrawVerticalSegment'), 'accepted variable-height renderer remains present');
assert(renderer.includes('crHeightfieldRenderRaisedPlanes'), 'accepted raised-plane renderer remains present');
assert(renderer.includes('worldDepthPixels'), 'accepted per-pixel depth remains present');

console.log(JSON.stringify({ pass: true, check: 'generic heightfield core contract' }));
