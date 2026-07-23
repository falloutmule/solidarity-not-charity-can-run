'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const menuSourcePath = path.join(root, 'src', 'js', 'game-07-section-2c-responsive-mobile-menu-html-overlay.js');
const artifactPath = path.join(root, 'index.html');
const retiredAlias = 'window._rmenuAction';

for (const file of [menuSourcePath, artifactPath]) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!source.includes(retiredAlias), `retired mobile-menu alias remains in ${path.relative(root, file)}`);
}

const menuSource = fs.readFileSync(menuSourcePath, 'utf8');
assert(menuSource.includes('function rmenuAction(action){'), 'lexical mobile-menu action owner must remain');
assert(menuSource.includes('function drawMobileMenu(){'), 'mobile-menu renderer must remain');

console.log(JSON.stringify({ check: 'mobile-menu-alias-retirement', pass: true }));
