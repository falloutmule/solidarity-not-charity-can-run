'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'src/js/game-16b-far-field-projection.js');
assert(fs.existsSync(modulePath), 'far-field projection module must exist');
const source = fs.readFileSync(modulePath, 'utf8');

function load(search = '') {
  const storageCalls = [];
  const sandbox = {
    console,
    Math,
    Number,
    Object,
    Array,
    Map,
    URLSearchParams,
    location: { search },
    localStorage: {
      getItem(...args) { storageCalls.push(['getItem', ...args]); return null; },
      setItem(...args) { storageCalls.push(['setItem', ...args]); },
      removeItem(...args) { storageCalls.push(['removeItem', ...args]); }
    }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: modulePath });
  return { sandbox, storageCalls };
}

// RED/GREEN slice 1: strict final default, diagnostics, and session-lifetime query selection.
{
  const canonical = load();
  const explicitSubpixel = load('?ffproj=subpixel&ffproj=legacy');
  const explicitLegacy = load('?ffproj=legacy&ffproj=subpixel');
  assert.strictEqual(typeof canonical.sandbox.crResolveFarFieldProjectionMode, 'function');
  assert.strictEqual(canonical.sandbox.crResolveFarFieldProjectionMode(), 'subpixel', 'no-query projection defaults to subpixel');
  assert.strictEqual(explicitSubpixel.sandbox.crResolveFarFieldProjectionMode(), 'subpixel');
  assert.strictEqual(explicitLegacy.sandbox.crResolveFarFieldProjectionMode(), 'legacy', 'explicit legacy remains diagnostic');
  assert.strictEqual(canonical.sandbox.crResolveFarFieldProjectionMode(new URLSearchParams('ffproj=subpixel&ffproj=legacy')), 'subpixel');
  assert.strictEqual(canonical.sandbox.crResolveFarFieldProjectionMode(new URLSearchParams('ffproj=legacy&ffproj=subpixel')), 'legacy');
  for (const invalid of ['', 'SUBPIXEL', ' subpixel', 'subpixel ', '1', 'smooth']) {
    assert.strictEqual(canonical.sandbox.crResolveFarFieldProjectionMode(new URLSearchParams(`ffproj=${encodeURIComponent(invalid)}`)), 'subpixel');
  }
  assert.strictEqual(canonical.sandbox.crResolveFarFieldProjectionMode({ get: null }), 'subpixel');
  assert.strictEqual(canonical.sandbox.crResolveFarFieldProjectionMode({ get() { throw new Error('query unavailable'); } }), 'subpixel');
  canonical.sandbox.location.search = '?ffproj=legacy';
  assert.strictEqual(canonical.sandbox.crResolveFarFieldProjectionMode(), 'subpixel', 'selection must not reread location');
  assert.deepStrictEqual(canonical.storageCalls, [], 'ffproj must never touch localStorage');
  assert.deepStrictEqual(explicitSubpixel.storageCalls, [], 'explicit ffproj must never touch localStorage');
  assert.deepStrictEqual(explicitLegacy.storageCalls, [], 'legacy diagnostic must never touch localStorage');
}

function projection(overrides = {}) {
  return Object.assign({
    screenX: 100.25,
    screenW: 5.5,
    screenH: 20,
    groundBottomY: 120.5,
    topY: 100.5,
    feetY: 120.5,
    footAnchor: 45,
    yoffUsed: 0,
    isGroundAnchored: true,
    groundedDelta: 0,
    floating: false
  }, overrides);
}

function project(sandbox, overrides = {}) {
  return sandbox.crProjectFarFieldSprite(Object.assign({
    projection: projection(),
    depth: 8,
    textureWidth: 16,
    renderWidth: 320,
    moving: false,
    spriteKey: 'sprite-1'
  }, overrides));
}

// RED/GREEN slice 2: exact legacy/subpixel classification and frozen visual bounds.
{
  const canonical = load().sandbox;
  const legacy = load('?ffproj=legacy').sandbox;
  const nearSubpixel = load('?ffproj=subpixel').sandbox;
  const farSubpixel = load('?ffproj=subpixel').sandbox;
  const canonicalResult = project(canonical);
  const legacyResult = project(legacy);
  const nearResult = project(nearSubpixel, { depth: 7.999 });
  const subpixelResult = project(farSubpixel);
  const expectedKeys = [
    'mode', 'distant', 'depth', 'screenX', 'screenW', 'screenH', 'topY',
    'groundBottomY', 'visualLeft', 'visualRight', 'visualWidth',
    'occlusionStartCol', 'occlusionEndCol', 'sourceWidth'
  ].sort();

  assert.deepStrictEqual(Object.keys(legacyResult).sort(), expectedKeys, 'projection return shape must be exact');
  assert(Object.isFrozen(legacyResult), 'projection result must be frozen');
  assert.strictEqual(legacyResult.mode, 'legacy');
  assert.strictEqual(legacyResult.distant, true);
  assert.strictEqual(legacyResult.visualLeft, 97);
  assert.strictEqual(legacyResult.visualRight, 103);
  assert.strictEqual(legacyResult.visualWidth, 6);
  assert.strictEqual(nearResult.mode, 'legacy', 'near sprites always preserve legacy mapping');
  assert.strictEqual(nearResult.distant, false);
  assert.strictEqual(subpixelResult.mode, 'subpixel');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(canonicalResult)), JSON.parse(JSON.stringify(subpixelResult)),
    'no-query distant projection must match explicit subpixel geometry');
  assert.strictEqual(subpixelResult.visualLeft, 97.5);
  assert.strictEqual(subpixelResult.visualRight, 103);
  assert.strictEqual(subpixelResult.visualWidth, 5.5);
  assert.strictEqual(subpixelResult.occlusionStartCol, 97);
  assert.strictEqual(subpixelResult.occlusionEndCol, 103);
  assert.strictEqual(project(farSubpixel, { projection: projection({ screenX: -1, screenW: 1 }) }).occlusionEndCol, 0, 'coverage clips to left edge');
  assert.strictEqual(project(farSubpixel, { projection: projection({ screenX: 320.75, screenW: 1 }) }).occlusionStartCol, 320, 'coverage clips to right edge');
}

// Invalid or non-finite geometry fails closed without throwing.
{
  const sandbox = load('?ffproj=subpixel').sandbox;
  const invalidInputs = [
    null,
    {},
    { projection: projection(), depth: NaN, textureWidth: 16, renderWidth: 320 },
    { projection: projection({ screenX: Infinity }), depth: 8, textureWidth: 16, renderWidth: 320 },
    { projection: projection({ screenW: 0 }), depth: 8, textureWidth: 16, renderWidth: 320 },
    { projection: projection({ topY: NaN }), depth: 8, textureWidth: 16, renderWidth: 320 },
    { projection: projection(), depth: 8, textureWidth: 0, renderWidth: 320 },
    { projection: projection(), depth: 8, textureWidth: 16, renderWidth: 320.5 }
  ];
  for (const input of invalidInputs) assert.strictEqual(sandbox.crProjectFarFieldSprite(input), null);
}

// RED/GREEN slice 3: legacy parity and deterministic fragmented subpixel visible runs.
{
  const legacy = load('?ffproj=legacy').sandbox;
  const subpixel = load('?ffproj=subpixel').sandbox;
  assert.strictEqual(typeof subpixel.crBuildFarFieldSpriteDrawRuns, 'function');
  assert.strictEqual(typeof subpixel.crDrawFarFieldSpriteRuns, 'function');

  const legacyProjection = project(legacy, { projection: projection({ screenX: 13.25, screenW: 6 }) });
  const legacyZ = Array(320).fill(Infinity);
  legacyZ[12] = 8;
  const legacyRuns = legacy.crBuildFarFieldSpriteDrawRuns(legacyProjection, legacyZ);
  const expectedLegacy = [];
  const L = 13.25 - 3;
  for (let col = Math.floor(L); col < Math.ceil(L + 6); col++) {
    if (col < 0 || col >= 320 || 8 >= legacyZ[col]) continue;
    const srcX = Math.max(0, Math.min(15, (((col - L) / 6) * 16) | 0));
    expectedLegacy.push({ col, srcX });
  }
  assert.deepStrictEqual(JSON.parse(JSON.stringify(legacyRuns.map(run => ({ col: run.startCol, srcX: run.sourceLeft })))), expectedLegacy,
    'legacy helper must preserve the existing integer-column/source-X formula exactly');
  assert(legacyRuns.every(run => run.endCol === run.startCol + 1 && run.destLeft === run.startCol && run.destWidth === 1 && run.sourceWidth === 1),
    'legacy draws remain one source column to one integer destination column');

  const projected = project(subpixel, {
    projection: projection({ screenX: 13.25, screenW: 6 }),
    textureWidth: 12
  });
  const zbuffer = Array(320).fill(7);
  for (const col of [10, 11, 13, 15, 16]) zbuffer[col] = 9;
  zbuffer[12] = 8; // equality is intentionally occluded.
  const runs = subpixel.crBuildFarFieldSpriteDrawRuns(projected, zbuffer);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(runs.map(run => [run.startCol, run.endCol]))), [[10, 12], [13, 14], [15, 17]],
    'fragmented visible columns must coalesce into deterministic contiguous runs');
  const expectedRects = [
    [10.25, 12, 0, 3.5],
    [13, 14, 5.5, 7.5],
    [15, 16.25, 9.5, 12]
  ];
  runs.forEach((run, index) => {
    const [destLeft, destRight, sourceLeft, sourceRight] = expectedRects[index];
    assert(Math.abs(run.destLeft - destLeft) < 1e-12);
    assert(Math.abs(run.destRight - destRight) < 1e-12);
    assert(Math.abs(run.sourceLeft - sourceLeft) < 1e-12);
    assert(Math.abs(run.sourceRight - sourceRight) < 1e-12);
    assert(run.destWidth > 0 && run.sourceWidth > 0, 'draw widths must be positive');
    assert(run.sourceLeft >= 0 && run.sourceRight <= projected.sourceWidth, 'source rectangle remains in bounds');
    assert(Object.isFrozen(run), 'run records must be frozen');
  });
  assert(Object.isFrozen(runs), 'run list must be frozen');
  assert(!runs.some(run => run.startCol <= 12 && run.endCol > 12), 'equality-occluded column must never draw through');
  assert(!runs.some(run => run.startCol <= 14 && run.endCol > 14), 'nearer wall column must never draw through');

  const calls = [];
  const ctx = {
    imageSmoothingEnabled: true,
    drawImage(...args) { calls.push(['drawImage', ...args]); },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    clearRect(...args) { calls.push(['clearRect', ...args]); }
  };
  const texture = Object.freeze({ width: 12, height: 24, transparentPixels: true });
  assert.strictEqual(subpixel.crDrawFarFieldSpriteRuns(ctx, texture, projected, zbuffer), 3);
  assert.strictEqual(ctx.imageSmoothingEnabled, false, 'pixel-art source sampling must remain nearest-neighbor');
  assert.strictEqual(calls.filter(call => call[0] === 'drawImage').length, 3, 'exactly one draw per visible run');
  assert.strictEqual(calls.some(call => call[0] === 'fillRect'), false, 'no halo/full bounding-box fill is allowed');
  assert.strictEqual(calls.some(call => call[0] === 'clearRect'), false, 'transparent source pixels require no destructive backing-box operation');
  calls.filter(call => call[0] === 'drawImage').forEach((call, index) => {
    const run = runs[index];
    assert.strictEqual(call[1], texture, 'the transparent nearest-neighbor source is passed directly to drawImage');
    assert.deepStrictEqual(call.slice(2), [run.sourceLeft, 0, run.sourceWidth, 24, run.destLeft, projected.topY, run.destWidth, projected.screenH]);
  });

  const fullyOccluded = Array(320).fill(8);
  assert.strictEqual(subpixel.crBuildFarFieldSpriteDrawRuns(projected, fullyOccluded).length, 0, 'equality everywhere draws nothing');
}

// Lateral and forward samples retain exact floating geometry without width quantization.
{
  const sandbox = load('?ffproj=subpixel').sandbox;
  const lateralA = project(sandbox, { projection: projection({ screenX: 100.1, screenW: 3.125 }) });
  const lateralB = project(sandbox, { projection: projection({ screenX: 100.2, screenW: 3.125 }), spriteKey: 'sprite-2' });
  const forward = project(sandbox, { projection: projection({ screenX: 100.2, screenW: 3.1875 }), spriteKey: 'sprite-3' });
  assert(Math.abs((lateralB.visualLeft - lateralA.visualLeft) - 0.1) < 1e-12, 'subpixel lateral movement remains fractional');
  assert.strictEqual(lateralA.visualWidth, 3.125);
  assert.strictEqual(lateralB.visualWidth, 3.125, 'lateral motion keeps projected width stable');
  assert.strictEqual(forward.visualWidth, 3.1875, 'forward motion preserves continuous projected-width change');
}

// RED/GREEN slice 4: cumulative telemetry records only successful deterministic samples.
{
  const legacy = load('?ffproj=legacy').sandbox;
  assert.strictEqual(typeof legacy.crGetProjectionQuantizationStats, 'function');
  const statsKeys = [
    'mode', 'depthThreshold', 'projectedSpriteCount', 'distantSpriteCount',
    'projectedWidthSum', 'fractionalScreenXSum', 'legacySnapCount',
    'subpixelMovementCount', 'repeatedProjectedXFramesWhileMoving'
  ].sort();
  const zero = legacy.crGetProjectionQuantizationStats();
  assert.deepStrictEqual(Object.keys(zero).sort(), statsKeys);
  assert(Object.isFrozen(zero), 'telemetry snapshots must be frozen');
  assert.strictEqual(zero.mode, 'legacy');
  assert.strictEqual(zero.depthThreshold, 8);
  assert.strictEqual(zero.projectedSpriteCount, 0);
  assert.strictEqual(legacy.crProjectFarFieldSprite({ projection: projection({ screenX: NaN }), depth: 8, textureWidth: 16, renderWidth: 320, moving: true, spriteKey: 'bad' }), null);
  assert.strictEqual(legacy.crGetProjectionQuantizationStats().projectedSpriteCount, 0, 'invalid geometry increments no success counters');

  project(legacy, { projection: projection({ screenX: 100.1, screenW: 3 }), moving: true, spriteKey: 'moving' });
  project(legacy, { projection: projection({ screenX: 100.2, screenW: 3 }), moving: true, spriteKey: 'moving' });
  project(legacy, { projection: projection({ screenX: 100.2, screenW: 3 }), moving: true, spriteKey: 'moving' });
  const legacyStats = legacy.crGetProjectionQuantizationStats();
  assert.strictEqual(legacyStats.projectedSpriteCount, 3);
  assert.strictEqual(legacyStats.distantSpriteCount, 3);
  assert.strictEqual(legacyStats.projectedWidthSum, 9);
  assert(Math.abs(legacyStats.fractionalScreenXSum - 0.5) < 1e-12);
  assert.strictEqual(legacyStats.legacySnapCount, 1, 'changed float with unchanged legacy placement is one snap');
  assert.strictEqual(legacyStats.subpixelMovementCount, 0);
  assert.strictEqual(legacyStats.repeatedProjectedXFramesWhileMoving, 2, 'legacy representation repeated twice while moving');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(legacy.crGetProjectionQuantizationStats())), JSON.parse(JSON.stringify(legacyStats)),
    'stats reads are side-effect free and cumulative');

  const subpixel = load('?ffproj=subpixel').sandbox;
  project(subpixel, { projection: projection({ screenX: 80.1, screenW: 2.5 }), moving: true, spriteKey: 'moving' });
  project(subpixel, { projection: projection({ screenX: 80.2, screenW: 2.5 }), moving: true, spriteKey: 'moving' });
  project(subpixel, { projection: projection({ screenX: 80.2, screenW: 2.5 }), moving: true, spriteKey: 'moving' });
  project(subpixel, { projection: projection({ screenX: 40.4, screenW: 7 }), depth: 7.5, moving: true, spriteKey: 'near' });
  const subpixelStats = subpixel.crGetProjectionQuantizationStats();
  assert.strictEqual(subpixelStats.mode, 'subpixel');
  assert.strictEqual(subpixelStats.projectedSpriteCount, 4);
  assert.strictEqual(subpixelStats.distantSpriteCount, 3);
  assert.strictEqual(subpixelStats.subpixelMovementCount, 1);
  assert.strictEqual(subpixelStats.legacySnapCount, 0);
  assert.strictEqual(subpixelStats.repeatedProjectedXFramesWhileMoving, 1);
  for (const [key, value] of Object.entries(subpixelStats)) {
    if (key !== 'mode') assert(Number.isFinite(value) && value >= 0, `${key} must be finite and nonnegative`);
  }
}

// RED/GREEN slice 5: exhaustive coverage ownership, nonmutation, and source-scope isolation.
{
  const sandbox = load('?ffproj=subpixel').sandbox;
  for (let mask = 0; mask < 64; mask++) {
    const projected = project(sandbox, {
      projection: projection({ screenX: 13.25, screenW: 6 }),
      spriteKey: `mask-${mask}`
    });
    const zbuffer = Array(320).fill(7);
    for (let offset = 0; offset < 6; offset++) if (mask & (1 << offset)) zbuffer[10 + offset] = 9;
    const beforeZ = zbuffer.slice();
    const runs = sandbox.crBuildFarFieldSpriteDrawRuns(projected, zbuffer);
    assert.deepStrictEqual(zbuffer, beforeZ, `mask ${mask}: z-buffer must not mutate`);
    for (let col = 10; col <= 16; col++) {
      const owners = runs.filter(run => run.startCol <= col && col < run.endCol).length;
      const expectedVisible = projected.depth < zbuffer[col];
      assert.strictEqual(owners, expectedVisible ? 1 : 0, `mask ${mask}, col ${col}: no hole, duplicate, or draw-through`);
    }
    let priorDestRight = -Infinity;
    let priorSourceRight = -Infinity;
    for (const run of runs) {
      assert(run.destLeft >= priorDestRight, `mask ${mask}: destination runs never overlap`);
      assert(run.sourceLeft >= priorSourceRight, `mask ${mask}: source runs remain monotonic`);
      const expectedSourceLeft = (run.destLeft - 10.25) / 6 * 16;
      const expectedSourceRight = (run.destRight - 10.25) / 6 * 16;
      assert(Math.abs(run.sourceLeft - expectedSourceLeft) < 1e-12, `mask ${mask}: affine source-left mapping`);
      assert(Math.abs(run.sourceRight - expectedSourceRight) < 1e-12, `mask ${mask}: affine source-right mapping`);
      priorDestRight = run.destRight;
      priorSourceRight = run.sourceRight;
    }
  }

  const gameplay = { player: { x: 4, y: 5, angle: 0.25 }, game: { helped: 2, quota: 4 }, save: { version: 1 } };
  const input = {
    projection: projection({ screenX: 12.4, screenW: 4.25 }),
    depth: 9,
    textureWidth: 16,
    renderWidth: 320,
    moving: true,
    spriteKey: 'nonmutation'
  };
  const texture = { width: 16, height: 32, gameplay };
  const zbuffer = Array(320).fill(10);
  const before = JSON.stringify({ gameplay, input, texture, zbuffer });
  const projected = sandbox.crProjectFarFieldSprite(input);
  sandbox.crDrawFarFieldSpriteRuns({ imageSmoothingEnabled: true, drawImage() {} }, texture, projected, zbuffer);
  assert.strictEqual(JSON.stringify({ gameplay, input, texture, zbuffer }), before,
    'projection/draw helpers must not mutate gameplay, world inputs, texture, or z-buffer');
  assert.strictEqual(sandbox.crDrawFarFieldSpriteRuns({ imageSmoothingEnabled: true, drawImage() {} }, texture, null, zbuffer), 0,
    'invalid projected geometry must fail closed before dereference or draw');
}

{
  const buildingPath = path.join(root, 'src/js/game-16a-bitmap-building-renderer.js');
  const buildingSource = fs.readFileSync(buildingPath, 'utf8').replace(/\r\n/g, '\n');
  assert.strictEqual(crypto.createHash('sha256').update(buildingSource).digest('hex'),
    '8330f6ddbe6e21b56efcc13e7adb348c4ff85945a70798a707d48f6fc547fcbb',
    'generic bitmap building renderer must match the locked height-scale-aware base');
  for (const forbidden of [
    'drawWholeFaceBitmapBuildingColumn', 'crDrawBuildingMaterialWallColumn',
    'crDrawComposedFacadeFaceColumn', 'player.', 'game.', 'wallDrawStart', 'zbuffer[col]='
  ]) {
    assert(!source.includes(forbidden), `projection owner must not absorb building/world/gameplay/wall authority: ${forbidden}`);
  }
  const baseRenderer = fs.readFileSync(path.join(root, 'src/js/game-16-section-7-render.js'), 'utf8');
  assert(baseRenderer.includes('zbuffer[col]=d'), 'wall renderer retains z-buffer write authority');
  assert(baseRenderer.indexOf('drawWholeFaceBitmapBuildingColumn(') < baseRenderer.indexOf('crDrawBuildingMaterialWallColumn('),
    'bitmap building delegation remains before procedural building rendering');
}

console.log('PASS far-field projection: strict query, legacy parity, subpixel runs, telemetry, and invariants');
