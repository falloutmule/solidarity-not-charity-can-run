'use strict';

const { assert, BUILDING_DIR } = require('./solid_height_asset_test_helpers');
const { writeCompiledBuilding } = require('../tools/building-asset-compiler');

const result = writeCompiledBuilding(BUILDING_DIR, { write: false, register: false });
assert.strictEqual(result.changed, false, 'generated runtime asset must be current');
process.stdout.write(`${JSON.stringify({ pass: true, assetId: result.asset.id, output: result.outputPath })}\n`);
