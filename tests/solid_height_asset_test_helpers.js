'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { compileBuilding, SOLID_HEIGHT_FACE_ORDER } = require('../tools/building-asset-compiler');

const ROOT = path.resolve(__dirname, '..');
const BUILDING_DIR = path.join(ROOT, 'authoring', 'buildings', 'low_block_concrete_001');

function compiledAsset() { return compileBuilding(BUILDING_DIR); }
function alphaHistogram(filePath) {
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const histogram = { transparent: 0, partial: 0, opaque: 0 };
  for (let offset = 3; offset < png.data.length; offset += 4) {
    const alpha = png.data[offset];
    if (alpha === 0) histogram.transparent += 1;
    else if (alpha === 255) histogram.opaque += 1;
    else histogram.partial += 1;
  }
  return { width: png.width, height: png.height, ...histogram };
}
function sourceFacePath(face) { return path.join(BUILDING_DIR, 'source', `${face}.png`); }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }

module.exports = { assert, fs, path, ROOT, BUILDING_DIR, SOLID_HEIGHT_FACE_ORDER, compiledAsset, alphaHistogram, sourceFacePath, sha256 };
