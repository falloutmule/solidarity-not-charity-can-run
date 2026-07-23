'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const facadeSourcePath = path.join(root, 'src', 'js', 'game-09c-section-facadeskins1-bitmap-facades.js');
const artifactPath = path.join(root, 'index.html');
const retiredGlobal = 'window.CR_BITMAP_FACADE_SKINS_V1';

for (const file of [facadeSourcePath, artifactPath]) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!source.includes(retiredGlobal), `retired faÃ§ade global remains in ${path.relative(root, file)}`);
}

const facadeSource = fs.readFileSync(facadeSourcePath, 'utf8');
assert(facadeSource.includes('const CR_BITMAP_FACADE_SKINS_V1='), 'lexical faÃ§ade skin data must remain');
assert(facadeSource.includes('function crDrawBitmapFacadeSkinWallColumn('), 'faÃ§ade skin renderer must remain');

console.log(JSON.stringify({ check: 'facade-global-retirement', pass: true }));
