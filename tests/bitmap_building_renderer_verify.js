'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rendererPath = path.join(root, 'src/js/game-16a-bitmap-building-renderer.js');
const baseRendererPath = path.join(root, 'src/js/game-16-section-7-render.js');
const oldAdapterPath = path.join(root, 'src/js/game-16a-custom-next-001-runtime-integration.js');
const manifestPath = path.join(root, 'src/build-manifest.json');

assert(fs.existsSync(rendererPath), 'generic bitmap renderer module must exist');
const source = fs.readFileSync(rendererPath, 'utf8');
const baseSource = fs.readFileSync(baseRendererPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const forbiddenProductionTerms = [
  'custom_next_001', 'slot_02', 'd1ProofSlotId', 'd1CustomProofSlot',
  'proofZone', 'building_6x3'
];
for (const term of forbiddenProductionTerms) {
  assert(!source.includes(term), `generic renderer must not contain production-specific term ${term}`);
}

let canvasSerial = 0;
let failCanvasCreation = false;
const extractionCalls = [];
function makeCanvas(width, height) {
  const context = {
    imageSmoothingEnabled: true,
    drawImage(...args) {
      extractionCalls.push({ canvasId: canvas._id, smoothing: this.imageSmoothingEnabled, args });
    }
  };
  const canvas = {
    _id: ++canvasSerial,
    width,
    height,
    getContext(kind) { return kind === '2d' ? context : null; }
  };
  return canvas;
}

const registry = Object.create(null);
const sandbox = {
  console,
  BITMAP_BUILDING_ASSET_REGISTRY: registry,
  OffscreenCanvas: function(width, height) {
    if (failCanvasCreation) throw new Error('synthetic canvas failure');
    return makeCanvas(width, height);
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: rendererPath });

const requiredFunctions = [
  'lookupBitmapBuildingAsset', 'resolveBitmapWorldFace',
  'inverseRotateBitmapFace', 'resolveBitmapLocalHit',
  'orientBitmapCanonicalU', 'getBitmapFaceCanvas',
  'resolveBitmapBuildingHeightScale',
  'drawBitmapFaceColumn', 'drawBitmapFailureColumn',
  'drawWholeFaceBitmapBuildingColumn'
];
for (const name of requiredFunctions) assert.strictEqual(typeof sandbox[name], 'function', `${name} must be exported globally`);

function descriptor(assetRef, x, width, options = {}) {
  return {
    assetRef,
    slice: { x, y: 0, width, height: 11 },
    spanCells: options.spanCells || 1,
    sourceUDirection: options.sourceUDirection,
    mirror: options.mirror === true
  };
}

function makeAsset(id, options = {}) {
  const image = options.image || { complete: true, naturalWidth: 92, naturalHeight: 11 };
  return {
    schema: 'snc-bitmap-building-asset-v1',
    id,
    version: options.version || 'fixture-v1',
    renderMode: 'importedWholeFaceAsset',
    footprint: { widthCells: 5, depthCells: 2 },
    atlas: { width: 92, height: 11, sha256: options.sha256 || `${id}-atlas`, image },
    loadState: { status: options.status || 'loaded', image },
    mirrorSafe: options.mirrorSafe === true,
    faces: options.faces || {
      south: descriptor('front', 0, 31, { spanCells: 5, sourceUDirection: 'increasing' }),
      east: descriptor('shared-side', 31, 13, { spanCells: 2, sourceUDirection: 'decreasing' }),
      north: descriptor('back', 44, 35, { spanCells: 5, sourceUDirection: 'decreasing' }),
      west: { assetRef: 'shared-side', reuse: 'east', spanCells: 2, sourceUDirection: 'increasing', mirror: false }
    }
  };
}

registry['fixture-wide-5x2'] = makeAsset('fixture-wide-5x2');
assert.strictEqual(sandbox.lookupBitmapBuildingAsset('fixture-wide-5x2').id, 'fixture-wide-5x2', 'arbitrary registry IDs must resolve');
assert.strictEqual(sandbox.resolveBitmapBuildingHeightScale({}, registry['fixture-wide-5x2']), 1,
  'heightScale must default to full-height behavior when absent');
assert.strictEqual(sandbox.resolveBitmapBuildingHeightScale({ heightScale: 0.5 }, registry['fixture-wide-5x2']), 0.5,
  'placement heightScale must select grounded short-wall geometry');
assert.strictEqual(sandbox.resolveBitmapBuildingHeightScale({ heightScale: 2 }, registry['fixture-wide-5x2']), 1,
  'invalid heightScale must fail safe to the full-height default');

const expectedMappings = [
  [0, 'south', 'south', 'x', false, false],
  [0, 'east',  'east',  'y', false, true],
  [0, 'north', 'north', 'x', false, true],
  [0, 'west',  'west',  'y', false, false],
  [1, 'south', 'east',  'y', true,  true],
  [1, 'east',  'north', 'x', false, true],
  [1, 'north', 'west',  'y', true,  false],
  [1, 'west',  'south', 'x', false, false],
  [2, 'south', 'north', 'x', true,  true],
  [2, 'east',  'west',  'y', true,  false],
  [2, 'north', 'south', 'x', true,  false],
  [2, 'west',  'east',  'y', true,  true],
  [3, 'south', 'west',  'y', false, false],
  [3, 'east',  'south', 'x', true,  false],
  [3, 'north', 'east',  'y', false, true],
  [3, 'west',  'north', 'x', true,  true]
];
let mappingAssertions = 0;
for (const [rotation, worldFace, localFace, axis, reverseFraction, reverseCanonical] of expectedMappings) {
  assert.strictEqual(sandbox.inverseRotateBitmapFace(worldFace, rotation), localFace,
    `rotation ${rotation}, ${worldFace} local face`);
  const cell = { lx: 3, ly: 1 };
  for (const fraction of [0.001, 0.5, 0.999]) {
    const hit = sandbox.resolveBitmapLocalHit(cell, localFace, rotation, fraction, 5, 2);
    assert.strictEqual(hit.axis, axis, `rotation ${rotation}, ${worldFace} axis`);
    const expectedP = reverseFraction ? 1 - fraction : fraction;
    const expectedAlong = axis === 'x' ? (cell.lx + expectedP) / 5 : (cell.ly + expectedP) / 2;
    assert(Math.abs(hit.localAlong - expectedAlong) < 1e-12,
      `rotation ${rotation}, ${worldFace} fraction direction at ${fraction}`);
    const canonical = sandbox.orientBitmapCanonicalU(localFace, hit.localAlong);
    const expectedU = reverseCanonical ? 1 - expectedAlong : expectedAlong;
    assert(Math.abs(canonical - expectedU) < 1e-12,
      `rotation ${rotation}, ${worldFace} canonical U at ${fraction}`);
  }
  mappingAssertions++;
}
assert.strictEqual(mappingAssertions, 16, 'all 16 rotation/world-face mappings must execute');

assert.strictEqual(sandbox.resolveBitmapWorldFace(0, 1, 0), 'west');
assert.strictEqual(sandbox.resolveBitmapWorldFace(0, -1, 0), 'east');
assert.strictEqual(sandbox.resolveBitmapWorldFace(1, 0, 1), 'north');
assert.strictEqual(sandbox.resolveBitmapWorldFace(1, 0, -1), 'south');

function destinationContext(initialSmoothing = true) {
  const calls = [];
  return {
    calls,
    imageSmoothingEnabled: initialSmoothing,
    fillStyle: '',
    save() { calls.push(['save']); this._saved = this.imageSmoothingEnabled; },
    restore() { calls.push(['restore']); this.imageSmoothingEnabled = this._saved; },
    drawImage(...args) { calls.push(['drawImage', this.imageSmoothingEnabled, ...args]); },
    fillRect(...args) { calls.push(['fillRect', this.fillStyle, ...args]); }
  };
}

function drawFixture(assetId, overrides = {}) {
  const ctx = overrides.ctx || destinationContext(true);
  const placement = Object.assign({
    assetId,
    renderMode: 'importedWholeFaceAsset',
    rotation: 0,
    widthCells: 5,
    depthCells: 2
  }, overrides.placement || {});
  const hit = Object.assign({
    ctx, col: 7, drawStart: 10, sliceH: 30,
    cell: { lx: 0, ly: 0 }, side: 1, stepX: 0, stepY: -1,
    wallFraction: 0.5
  }, overrides.hit || {});
  return { handled: sandbox.drawWholeFaceBitmapBuildingColumn(hit, placement), ctx };
}

let result = drawFixture('fixture-wide-5x2');
assert.strictEqual(result.handled, true, 'loaded bitmap owner must be handled');
const destinationDraw = result.ctx.calls.find(call => call[0] === 'drawImage');
assert(destinationDraw, 'loaded bitmap owner must draw a source column');
assert.strictEqual(destinationDraw[1], false, 'destination draw must disable smoothing');
assert.deepStrictEqual(result.ctx.calls.map(call => call[0]), ['save', 'drawImage', 'restore'], 'destination smoothing must use save/draw/restore');
assert.strictEqual(result.ctx.imageSmoothingEnabled, true, 'destination smoothing state must be restored');
assert(extractionCalls.every(call => call.smoothing === false), 'face extraction must disable smoothing');
assert(Number.isInteger(destinationDraw[3]), 'source X must be an integer');
assert(destinationDraw[3] >= 0 && destinationDraw[3] < destinationDraw[2].width, 'source X must be clamped inside face width');

// Generic assetRef indirection supports immutable shared face-assets without production IDs.
const indirectAsset = makeAsset('fixture-indirect-face-assets');
indirectAsset.faceAssets = {
  indirectFront: { slice: { x: 4, y: 0, w: 23, h: 11 } },
  indirectSide: { slice: { x: 31, y: 0, w: 13, h: 11 } }
};
indirectAsset.faces.south = { assetRef: 'indirectFront', spanCells: 5, mirror: false };
indirectAsset.faces.east = { assetRef: 'indirectSide', spanCells: 2, mirror: false };
indirectAsset.faces.west = { assetRef: 'indirectSide', spanCells: 2, mirror: false };
registry[indirectAsset.id] = indirectAsset;
result = drawFixture(indirectAsset.id);
const indirectDraw = result.ctx.calls.find(call => call[0] === 'drawImage');
assert(indirectDraw, 'assetRef-indirected face descriptor must draw');
assert.strictEqual(indirectDraw[2].width, 23, 'assetRef-indirected slice width must be used');

// Exact upper endpoint clamps to the final legal integer source column.
result = drawFixture('fixture-wide-5x2', { hit: { cell: { lx: 4, ly: 0 }, wallFraction: 1 } });
const endpointDraw = result.ctx.calls.find(call => call[0] === 'drawImage');
assert.strictEqual(endpointDraw[3], endpointDraw[2].width - 1, 'canonical U=1 must clamp to width-1');

// Reuse resolves the east slice for west without adding an inferred mirror.
result = drawFixture('fixture-wide-5x2', { hit: { side: 0, stepX: 1, stepY: 0, cell: { lx: 0, ly: 0 }, wallFraction: 0.2 } });
const reusedDraw = result.ctx.calls.find(call => call[0] === 'drawImage');
assert.strictEqual(reusedDraw[2].width, 13, 'west must reuse the shared side slice');
assert.strictEqual(reusedDraw[3], 1, 'mirrorSafe:false shared face must use geometry-aware U without inferred mirror');

// Explicit mirror is applied once, and only on a mirror-safe synthetic fixture.
const mirrorAsset = makeAsset('fixture-mirror-safe', { mirrorSafe: true });
mirrorAsset.faces.south = descriptor('front-mirrored', 0, 31, { spanCells: 5, sourceUDirection: 'increasing', mirror: true });
registry[mirrorAsset.id] = mirrorAsset;
result = drawFixture(mirrorAsset.id, { hit: { wallFraction: 0.2 } });
const mirroredDraw = result.ctx.calls.find(call => call[0] === 'drawImage');
assert.strictEqual(mirroredDraw[3], 29, 'explicit mirror must transform continuous whole-face U exactly once');

const reversedSourceAsset = makeAsset('fixture-declared-source-direction');
reversedSourceAsset.faces.south = descriptor('front-reversed', 0, 31, {
  spanCells: 5, sourceUDirection: 'x_decreasing'
});
registry[reversedSourceAsset.id] = reversedSourceAsset;
result = drawFixture(reversedSourceAsset.id, { hit: { wallFraction: 0.2 } });
const reversedSourceDraw = result.ctx.calls.find(call => call[0] === 'drawImage');
assert.strictEqual(reversedSourceDraw[3], 29, 'declared canonical source-U direction must orient the source before mirroring');

const unsafeMirror = makeAsset('fixture-unsafe-mirror');
unsafeMirror.faces.south = descriptor('unsafe', 0, 31, { spanCells: 5, sourceUDirection: 'increasing', mirror: true });
registry[unsafeMirror.id] = unsafeMirror;
result = drawFixture(unsafeMirror.id);
assert.strictEqual(result.handled, true, 'unsafe mirror failure must remain owned');
assert(result.ctx.calls.some(call => call[0] === 'fillRect'), 'unsafe mirror must fail visibly rather than mirror');
assert(!result.ctx.calls.some(call => call[0] === 'drawImage'), 'mirrorSafe:false must reject explicit mirror drawing');

// Generic immutable cache identity separates asset, atlas, slice, face/ref, and mirror mode.
const cacheStart = canvasSerial;
const cacheA = makeAsset('cache-a', { sha256: 'atlas-a' });
const cacheB = makeAsset('cache-b', { sha256: 'atlas-a' });
const cacheC = makeAsset('cache-a-new-atlas', { sha256: 'atlas-b' });
cacheC.id = 'cache-a';
cacheC.faces.south = descriptor('other-ref', 1, 30, { spanCells: 5, sourceUDirection: 'increasing' });
registry['cache-a'] = cacheA;
registry['cache-b'] = cacheB;
drawFixture('cache-a');
drawFixture('cache-a');
drawFixture('cache-b');
registry['cache-a'] = cacheC;
drawFixture('cache-a');
assert.strictEqual(canvasSerial - cacheStart, 3, 'cache must reuse exact identity and separate asset/atlas/slice/ref identities');

const failureFixtures = [
  ['registry lookup', 'missing-registry-id', null],
  ['invalid schema', 'fail-schema', (() => { const a = makeAsset('fail-schema'); a.schema = 'wrong-schema'; return a; })()],
  ['atlas pending', 'fail-pending', makeAsset('fail-pending', { status: 'pending' })],
  ['atlas failed', 'fail-loaded', makeAsset('fail-loaded', { status: 'failed' })],
  ['dimension mismatch', 'fail-dimensions', makeAsset('fail-dimensions', { image: { complete: true, naturalWidth: 91, naturalHeight: 11 } })],
  ['face descriptor missing', 'fail-face', (() => { const a = makeAsset('fail-face'); delete a.faces.south; return a; })()],
  ['slice invalid', 'fail-slice', (() => { const a = makeAsset('fail-slice'); a.faces.south.slice.width = 200; return a; })()]
];
let failureAssertions = 0;
for (const [label, id, asset] of failureFixtures) {
  if (asset) registry[id] = asset;
  result = drawFixture(id);
  assert.strictEqual(result.handled, true, `${label} must remain handled`);
  assert(result.ctx.calls.some(call => call[0] === 'fillRect'), `${label} must draw a visible failure column`);
  assert(!result.ctx.calls.some(call => call[0] === 'drawImage'), `${label} must not draw/fall through`);
  failureAssertions++;
}
const canvasFailureAsset = makeAsset('fail-canvas');
registry[canvasFailureAsset.id] = canvasFailureAsset;
failCanvasCreation = true;
result = drawFixture(canvasFailureAsset.id);
failCanvasCreation = false;
assert.strictEqual(result.handled, true, 'face canvas creation failure must remain handled');
assert(result.ctx.calls.some(call => call[0] === 'fillRect'), 'face canvas creation failure must draw visibly');
failureAssertions++;
assert.strictEqual(failureAssertions, 8, 'every locked bitmap dependency failure must be exercised');

const nonOwnerCtx = destinationContext();
assert.strictEqual(sandbox.drawWholeFaceBitmapBuildingColumn({ ctx: nonOwnerCtx }, { renderMode: 'procedural' }), false,
  'non-bitmap owners must preserve existing fallback behavior');
assert.strictEqual(nonOwnerCtx.calls.length, 0, 'non-bitmap owner must not draw');

assert(!fs.existsSync(oldAdapterPath), 'old asset-specific adapter must be removed');
const baseEntry = 'src/js/game-16-section-7-render.js';
const farFieldEntry = 'src/js/game-16b-far-field-projection.js';
const genericEntry = 'src/js/game-16a-bitmap-building-renderer.js';
assert.strictEqual(manifest.scripts.filter(entry => entry === baseEntry).length, 1, 'manifest must include base renderer exactly once');
assert.strictEqual(manifest.scripts.filter(entry => entry === genericEntry).length, 1, 'manifest must include generic renderer exactly once');
assert.strictEqual(manifest.scripts.some(entry => entry.includes('game-16a-custom-next-001-runtime-integration.js')), false,
  'manifest must remove old adapter');
const baseIndex = manifest.scripts.indexOf(baseEntry);
const farFieldCount = manifest.scripts.filter(entry => entry === farFieldEntry).length;
if (farFieldCount > 0) {
  assert.strictEqual(farFieldCount, 1, 'manifest must include far-field projection exactly once when present');
  const farFieldIndex = manifest.scripts.indexOf(farFieldEntry);
  assert.strictEqual(farFieldIndex, baseIndex + 1, 'far-field projection must immediately follow the base renderer');
  assert.strictEqual(manifest.scripts.indexOf(genericEntry), farFieldIndex + 1, 'generic renderer must immediately follow far-field projection');
} else {
  assert.strictEqual(manifest.scripts.indexOf(genericEntry), baseIndex + 1, 'generic renderer must preserve the locked post-base-renderer manifest position');
}

const delegateIndex = baseSource.indexOf('drawWholeFaceBitmapBuildingColumn(');
const facadeResolveIndex = baseSource.indexOf('crResolveBuildingFaceRole(', delegateIndex);
const materialDrawIndex = baseSource.indexOf('crDrawBuildingMaterialWallColumn(', delegateIndex);
assert(delegateIndex >= 0, 'base renderer must delegate to generic bitmap renderer');
assert(facadeResolveIndex > delegateIndex, 'bitmap delegation must occur before procedural facade resolution');
assert(materialDrawIndex > delegateIndex, 'bitmap delegation must occur before procedural material drawing');
assert(baseSource.includes('zbuffer[col]=d'), 'base renderer must preserve z-buffer authority');

console.log(`PASS bitmap building renderer: ${mappingAssertions} mappings, ${failureAssertions} visible handled failures, manifest generic adapter exact`);
