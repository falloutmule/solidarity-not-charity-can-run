'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { compileBuilding } = require('../tools/building-asset-compiler');
const { createFixture } = require('./building_authoring_test_helpers');

const root = path.resolve(__dirname, '..');
const bitmapSource = fs.readFileSync(path.join(root, 'src', 'js', 'game-16a-bitmap-building-renderer.js'), 'utf8');

const sandbox = { Object, Number };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(bitmapSource, sandbox, { filename: 'game-16a-bitmap-building-renderer.js' });
assert.equal(sandbox.resolveBitmapBuildingHeightScale({}, {}), 1, 'absent heightScale preserves full-height assets');
assert.equal(sandbox.resolveBitmapBuildingHeightScale({}, { heightScale: 0.5 }), 0.5, 'asset heightScale applies when placement omits it');
assert.equal(sandbox.resolveBitmapBuildingHeightScale({ heightScale: 0.75 }, { heightScale: 0.5 }), 0.75, 'placement may override asset heightScale');
assert.equal(sandbox.resolveBitmapBuildingHeightScale({ heightScale: 0 }, { heightScale: 0.5 }), 1, 'invalid placement heightScale fails safe');

const fixture = createFixture();
const manifestPath = path.join(fixture, 'building.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.heightScale = 0.5;
manifest.alphaCutout = true;
manifest.topCap = 'none';
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
const compiled = compileBuilding(fixture);
assert.equal(compiled.asset.heightScale, 0.5, 'compiler must preserve optional heightScale');
assert.equal(compiled.asset.alphaCutout, true, 'compiler must preserve alpha-cutout metadata');
assert.equal(compiled.asset.topCap, 'none', 'compiler must preserve explicit cutout cap policy');

process.stdout.write(`${JSON.stringify({ pass: true, heightScale: compiled.asset.heightScale, defaultHeightScale: 1 })}\n`);
