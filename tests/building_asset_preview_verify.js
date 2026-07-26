'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runPreview } = require('../tools/building-asset-preview');
const { ROOT, createFixture } = require('./building_authoring_test_helpers');

const fixture = createFixture();
const output = path.join(ROOT, 'test-results', 'building-preview-verify', 'preview.html');
const result = runPreview(fixture, output);
const html = fs.readFileSync(output, 'utf8');
assert.equal(result.assetId, 'fixture_dumpster_001');
for (const rotation of [0, 1, 2, 3]) assert.ok(html.includes(`rotationQ ${rotation}`));
assert.ok(html.includes(result.atlasSha256));
assert.ok(html.includes('Packed atlas'));
assert.ok(html.includes('west'));
assert.ok(html.includes('single-reusable-face'));
assert.ok(html.includes('<td>east</td>'));
assert.ok(!html.includes('http://'));
assert.ok(!html.includes('https://'));
process.stdout.write(`${JSON.stringify({ pass: true, output: path.relative(ROOT, output).replace(/\\/g, '/') })}\n`);
