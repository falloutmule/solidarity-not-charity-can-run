'use strict';

const { assert, fs, path, ROOT, BUILDING_DIR, SOLID_HEIGHT_FACE_ORDER, compiledAsset } = require('./solid_height_asset_test_helpers');
const { compileBuilding } = require('../tools/building-asset-compiler');

const manifest = JSON.parse(fs.readFileSync(path.join(BUILDING_DIR, 'building.json'), 'utf8'));
assert.strictEqual(manifest.schema, 'snc-solid-height-asset-v1');
assert.strictEqual(manifest.id, 'low_block_concrete_001');
assert.strictEqual(manifest.renderMode, 'solidHeightfield');
assert.deepStrictEqual(manifest.footprint, { widthCells: 1, depthCells: 1 });
assert.strictEqual(manifest.solidTopLevel, 1);
assert.strictEqual(manifest.collision, 'solid');
assert.strictEqual(manifest.alphaMode, 'opaque');
assert.strictEqual(manifest.filter, 'nearest');
assert.strictEqual(manifest.rotationMode, 'quarterTurns');
assert.deepStrictEqual(Object.keys(manifest.faces), SOLID_HEIGHT_FACE_ORDER);
const compiled = compiledAsset();
assert.strictEqual(compiled.asset.schema, 'snc-solid-height-runtime-v1');
assert.strictEqual(compiled.asset.compiledHash.length, 64);
const fixtureRoot = path.join(ROOT, 'test-results', 'solid-height-asset-manifest-fixture');
fs.mkdirSync(fixtureRoot, { recursive: true });
const fixture = fs.mkdtempSync(path.join(fixtureRoot, 'case-'));
fs.cpSync(BUILDING_DIR, fixture, { recursive: true });
function expectInvalid(mutator, pattern) {
  const candidate = JSON.parse(fs.readFileSync(path.join(fixture, 'building.json'), 'utf8'));
  mutator(candidate);
  fs.writeFileSync(path.join(fixture, 'building.json'), JSON.stringify(candidate), 'utf8');
  assert.throws(() => compileBuilding(fixture), pattern);
  fs.writeFileSync(path.join(fixture, 'building.json'), JSON.stringify(manifest), 'utf8');
}
expectInvalid((candidate) => { candidate.alphaCutout = false; }, /unknown solid-height building\.json property/);
expectInvalid((candidate) => { delete candidate.faces.top; }, /exactly five entries/);
expectInvalid((candidate) => { candidate.solidTopLevel = 2; }, /accepted half-height level 1/);
expectInvalid((candidate) => { candidate.cameraFacing = false; }, /unknown solid-height building\.json property/);
expectInvalid((candidate) => { candidate.faces.east = candidate.faces.north; }, /five independent source files/);
process.stdout.write(`${JSON.stringify({ pass: true, assetId: manifest.id, schema: compiled.asset.schema })}\n`);
