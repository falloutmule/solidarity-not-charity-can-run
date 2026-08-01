'use strict';

const { assert, fs, path, ROOT, BUILDING_DIR, SOLID_HEIGHT_FACE_ORDER, alphaHistogram, sourceFacePath, compiledAsset } = require('./solid_height_asset_test_helpers');
const { PNG } = require('pngjs');
const { compileBuilding } = require('../tools/building-asset-compiler');

const asset = compiledAsset().asset;
for (const face of SOLID_HEIGHT_FACE_ORDER) {
  const histogram = alphaHistogram(sourceFacePath(face));
  assert.deepStrictEqual(histogram, { width: 64, height: 64, transparent: 0, partial: 0, opaque: 4096 }, `${face} source alpha contract`);
  assert.strictEqual(asset.materials[face].opaque, true, `${face} compiled material opacity`);
}
const fixtureRoot = path.join(ROOT, 'test-results', 'solid-height-asset-opacity-fixture');
fs.mkdirSync(fixtureRoot, { recursive: true });
const fixture = fs.mkdtempSync(path.join(fixtureRoot, 'case-'));
fs.cpSync(BUILDING_DIR, fixture, { recursive: true });
const facePath = path.join(fixture, 'source', 'north.png');
const png = PNG.sync.read(fs.readFileSync(facePath));
png.data[3] = 254;
fs.writeFileSync(facePath, PNG.sync.write(png));
assert.throws(() => compileBuilding(fixture), /faces\.north must be fully opaque/);
process.stdout.write(`${JSON.stringify({ pass: true, check: 'five authored opaque face textures' })}\n`);
