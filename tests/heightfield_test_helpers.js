'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function source(relativePath) { return fs.readFileSync(path.join(ROOT, relativePath), 'utf8'); }
function requireSource(relativePath, tokens) {
  const text = source(relativePath);
  for (const token of tokens) assert(text.includes(token), `${relativePath} missing ${token}`);
  return text;
}
function project(worldZ, depth, eyeZ, renderHeight) {
  return renderHeight * 0.5 - (worldZ - eyeZ) * renderHeight / depth;
}

module.exports = { assert, ROOT, source, requireSource, project };
