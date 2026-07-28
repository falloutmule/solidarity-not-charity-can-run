'use strict';

const { assert, compiledAsset } = require('./solid_height_asset_test_helpers');
const { emitAssetModule } = require('../tools/building-asset-compiler');

const first = compiledAsset();
const second = compiledAsset();
assert.strictEqual(first.asset.compiledHash, second.asset.compiledHash);
assert.deepStrictEqual(first.asset.source.sourceHashes, second.asset.source.sourceHashes);
assert.strictEqual(emitAssetModule(first), emitAssetModule(second));
process.stdout.write(`${JSON.stringify({ pass: true, compiledHash: first.asset.compiledHash })}\n`);
