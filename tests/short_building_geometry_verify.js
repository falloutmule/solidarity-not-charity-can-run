'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { compileBuilding } = require('../tools/building-asset-compiler');
const { createFixture } = require('./building_authoring_test_helpers');

const root = path.resolve(__dirname, '..');
const compilerSource = fs.readFileSync(path.join(root, 'tools', 'building-asset-compiler.js'), 'utf8');
const bitmapSource = fs.readFileSync(path.join(root, 'src', 'js', 'game-16a-bitmap-building-renderer.js'), 'utf8');
const sceneSource = fs.readFileSync(path.join(root, 'src', 'js', 'game-16-section-7-render.js'), 'utf8');

assert(!compilerSource.includes('upperHalfTransparency'), 'the compiler must not require transparent upper-half padding');
assert(sceneSource.includes('const renderDrawStart = bitmapHeightScale < 1 ? drawEnd - renderSliceH : drawStart;'),
  'short bitmap geometry must anchor its bottom at the existing wall floor');
assert(sceneSource.includes('wallOcclusion.short[col] = bitmapHeightScale < 1 ? 1 : 0;'),
  'wall rendering must record which columns have short vertical occlusion');
assert(sceneSource.includes('const visibleBottom = spriteBehindWall ? Math.min(top + screenH, wallOcclusion.top[col]) : top + screenH;'),
  'sprites behind a short obstacle must be clipped only below its top edge');
assert(sceneSource.includes('!hasShortOcclusion && farFieldProjection'),
  'far-field sprite runs must fall back to vertically clipped columns behind a short obstacle');

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
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
const compiled = compileBuilding(fixture);
assert.equal(compiled.asset.heightScale, 0.5, 'compiler must preserve optional heightScale');
assert.equal(compiled.asset.atlas.height, 256, 'short geometry must not depend on transparent atlas padding');

process.stdout.write(`${JSON.stringify({ pass: true, heightScale: compiled.asset.heightScale, defaultHeightScale: 1 })}\n`);
