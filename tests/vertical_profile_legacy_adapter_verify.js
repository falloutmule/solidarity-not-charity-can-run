'use strict';
const { assert, requireSource, source } = require('./heightfield_test_helpers');
requireSource('src/js/game-15a-variable-height-core.js', ['EMPTY: 0, HALF_DEBUG: 1, FULL_LEGACY: 2', 'crHeightfieldProfileAt', 'raw === 0 ? CR_VERTICAL_PROFILE_IDS.EMPTY : CR_VERTICAL_PROFILE_IDS.FULL_LEGACY', 'CR_VERTICAL_PROFILES[id] || CR_VERTICAL_PROFILES[CR_VERTICAL_PROFILE_IDS.FULL_LEGACY]']);
const collision = source('src/js/game-12-section-4-collision-walk-helpers.js');
assert(collision.includes('return c == null || c !== 0;'), 'collision remains map-authoritative');
const proof = source('src/js/game-11-section-3b.js');
assert(proof.includes('new Uint16Array(GW * GH)') && proof.includes('map[block.y][block.x] = WALL.BRICK'), 'proof binds one solid map cell to a half profile');
console.log(JSON.stringify({ pass: true, check: 'legacy profile adapter' }));
