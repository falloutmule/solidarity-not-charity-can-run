'use strict';

const { assert, compiledAsset } = require('./solid_height_asset_test_helpers');

const asset = compiledAsset().asset;
const top = asset.materials.top;
assert.ok(top, 'compiled asset requires an explicit top material');
assert.strictEqual(top.face, 'top');
assert.strictEqual(top.width, 64);
assert.strictEqual(top.height, 64);
assert.strictEqual(top.opaque, true);
assert.strictEqual(top.filter, 'nearest');
assert.ok(top.dataUri.startsWith('data:image/png;base64,'));
process.stdout.write(`${JSON.stringify({ pass: true, topSha256: top.sha256 })}\n`);
