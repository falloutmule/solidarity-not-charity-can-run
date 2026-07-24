'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..');

function makePng(width, height, color) {
  const image = new PNG({ width, height, colorType: 6, inputColorType: 6, inputHasAlpha: true });
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = (width * y + x) * 4;
    image.data[offset] = (color[0] + x * 7) % 256;
    image.data[offset + 1] = (color[1] + y * 11) % 256;
    image.data[offset + 2] = color[2];
    image.data[offset + 3] = 255;
  }
  return PNG.sync.write(image, { colorType: 6, inputColorType: 6, inputHasAlpha: true, deflateLevel: 9, deflateStrategy: 3 });
}

function createFixture({ directional = false, west = false } = {}) {
  const runId = crypto.randomBytes(6).toString('hex');
  const directory = path.join(ROOT, 'test-results', 'building-authoring-fixture', runId);
  const sourceDir = path.join(directory, 'source');
  fs.mkdirSync(sourceDir, { recursive: true });
  const manifest = { schema: 'snc-building-source-v1', id: 'fixture_dumpster_001', footprint: { widthCells: 1, depthCells: 2 } };
  if (directional) {
    const files = {
      front: { width: 96, height: 32, color: [202, 93, 42] },
      side: { width: 64, height: 32, color: [52, 152, 114] },
      back: { width: 96, height: 32, color: [55, 84, 154] }
    };
    if (west) files.west = { width: 64, height: 32, color: [156, 89, 153] };
    for (const [name, spec] of Object.entries(files)) fs.writeFileSync(path.join(sourceDir, `${name}.png`), makePng(spec.width, spec.height, spec.color));
    manifest.footprint = { widthCells: 3, depthCells: 2 };
    manifest.faces = Object.fromEntries(Object.keys(files).map((name) => [name, `source/${name}.png`]));
  } else {
    fs.writeFileSync(path.join(sourceDir, 'face.png'), makePng(128, 128, [52, 112, 70]));
    manifest.face = 'source/face.png';
  }
  fs.writeFileSync(path.join(directory, 'building.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return directory;
}

module.exports = { ROOT, createFixture, makePng };
