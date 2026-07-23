'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'src', 'js', 'game-06-section-2b-mobile-touch-input.js');
const artifactPath = path.join(root, 'index.html');
const retired = [
  'CR_FPV_STREET_SHIMMER_FIX',
  'CR_FPV_WALL_LINE_FIX',
  'CR_FPV_FACADE_TARGET_POLISH',
  'CR_BUILDING_MODULE_FACADE',
  'CR_FACADE_PACK_BRIDGE',
  'CR_FACADE_PACK_V2_SAFE',
  'CR_FACADE_COMPOSE_READABILITY',
  'CR_FACADE_ART_VOCABULARY',
  'CR_D2_D3_FACADE_READABILITY_FINAL',
  'CR_FPV_GROUND_PLANE_ALIGNMENT',
  'CR_SOURCE_BUILD_PIPELINE_ACTIVE',
];
for (const file of [inputPath, artifactPath]) {
  const source = fs.readFileSync(file, 'utf8');
  for (const flag of retired) assert(!source.includes(flag), `retired visual flag remains in ${path.relative(root, file)}: ${flag}`);
}
const input = fs.readFileSync(inputPath, 'utf8');
for (const live of ['CR_FPV_STREET_MATTE', 'CR_BUILDING_SMOOTH_STYLE', 'CR_FPV_WALL_TEX_COARSE', 'CR_VISUAL_READABILITY']) {
  assert(input.includes(live), `live visual owner disappeared: ${live}`);
}
console.log(JSON.stringify({ check: 'dead-visual-flags', pass: true, retired: retired.length }));
