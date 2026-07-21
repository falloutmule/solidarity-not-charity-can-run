'use strict';

/**
 * One-session ordinary-game smoke for the authored District 1 candidate.
 *
 * This is intentionally not a historical self-check and does not use query parameters,
 * proof modes, debug routes, custom-level routes, direct run-start APIs, camera search,
 * or a screenshot gallery. Run only after rebuilding root index.html.
 */
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TEST_RESULTS = path.join(ROOT, 'test-results');
const DEFAULT_RUN_ROOT = path.join(TEST_RESULTS, 'authored-d1-smoke-runs');
const ARTIFACT = path.join(ROOT, 'index.html');
const LEVEL_ID = 'district-1-authored-v1';
const LEVEL_SCHEMA = 'snc-authored-level-static-v1';
const STATIC_BYTES = 3516;
const STATIC_SHA256 = '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82';
const ASSET_ID = 'custom_next_001';
const ASSET_BYTES = 185412;
const ASSET_SHA256 = 'bffb437c0c6772669233bd58124cded53fe8e32faa9b0e3c96736c4f87ec140c';
const SAVE_KEY = 'cannedRun.save.v1';
const PREFLIGHT_ONLY = process.argv.includes('--preflight-only');

function relativeDisplay(target) {
  return path.relative(ROOT, target).replace(/\\/g, '/');
}

function isStrictDescendant(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function gitIgnored(target) {
  const relative = relativeDisplay(target);
  const check = spawnSync('git', ['check-ignore', '-q', '--no-index', '--', relative], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (check.error) throw new Error(`Unable to verify ignored smoke path: ${check.error.message}`);
  return check.status === 0;
}

function uniqueRunName() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${stamp}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
}

function createRunDirectory() {
  const requested = process.env.CR_SMOKE_RUN_DIR || null;
  const target = requested
    ? path.resolve(ROOT, requested)
    : path.join(DEFAULT_RUN_ROOT, uniqueRunName());
  if (!isStrictDescendant(TEST_RESULTS, target)) {
    throw new Error(`CR_SMOKE_RUN_DIR must be a strict descendant of test-results: ${requested || target}`);
  }
  if (!gitIgnored(target)) {
    throw new Error(`Smoke run directory is not ignored by Git: ${relativeDisplay(target)}`);
  }
  if (fs.existsSync(target)) {
    throw new Error(`Smoke run directory already exists; refusing to overwrite: ${relativeDisplay(target)}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.mkdirSync(target, { recursive: false });
  fs.writeFileSync(path.join(target, '.run-created'), 'authored District 1 ordinary-game smoke\n', 'utf8');
  return { dir: target, requested, relative: relativeDisplay(target) };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function countLiteral(source, literal) {
  return source.split(literal).length - 1;
}

function preflight(run) {
  const manifest = readJson(path.join(ROOT, 'src', 'build-manifest.json'));
  const metadata = readJson(path.join(ROOT, 'project-metadata.json'));
  const pkg = readJson(path.join(ROOT, 'package.json'));
  const sourceBuild = fs.readFileSync(path.join(ROOT, 'src', 'js', 'game-06-section-2b-mobile-touch-input.js'), 'utf8');
  const citySource = fs.readFileSync(path.join(ROOT, 'src', 'js', 'game-09-section-3-city-generation.js'), 'utf8');
  const rendererSource = fs.readFileSync(path.join(ROOT, 'src', 'js', 'game-16-section-7-render.js'), 'utf8');
  const minimapSource = fs.readFileSync(path.join(ROOT, 'src', 'js', 'game-17-section-8-minimap.js'), 'utf8');
  const gameStateSource = fs.readFileSync(path.join(ROOT, 'src', 'js', 'game-05-section-2-game-state.js'), 'utf8');
  const inputSource = fs.readFileSync(path.join(ROOT, 'src', 'js', 'game-20-section-11-update-input.js'), 'utf8');
  const collisionSource = fs.readFileSync(path.join(ROOT, 'src', 'js', 'game-12-section-4-collision-walk-helpers.js'), 'utf8');
  const levelSource = fs.readFileSync(path.join(ROOT, 'src', 'levels', 'district-01-authored.js'), 'utf8');
  const smokeSource = fs.readFileSync(__filename, 'utf8');
  assert(fs.existsSync(ARTIFACT), 'rebuilt root index.html must exist before the one browser launch');
  const artifact = fs.readFileSync(ARTIFACT, 'utf8');
  const normalizedArtifact = artifact.replace(/\r\n/g, '\n');
  const buildId = metadata.runtime && metadata.runtime.buildId;

  const customIndex = manifest.scripts.indexOf('src/imported-handoff-assets/custom_next_001.asset.js');
  const levelIndex = manifest.scripts.indexOf('src/levels/district-01-authored.js');
  const cityIndex = manifest.scripts.indexOf('src/js/game-09-section-3-city-generation.js');
  const runtimeIndex = manifest.scripts.indexOf('src/js/game-09a-authored-level-runtime.js');
  const persistenceIndex = manifest.scripts.indexOf('src/js/game-14-section-5b-local-persistence.js');
  assert(customIndex >= 0, 'custom bitmap asset must be in the build manifest');
  assert.strictEqual(levelIndex, customIndex + 1, 'authored level data must immediately follow the custom asset');
  assert.strictEqual(cityIndex, levelIndex + 1, 'city generation must immediately follow authored level data');
  assert.strictEqual(runtimeIndex, cityIndex + 1, 'authored runtime must immediately follow city generation');
  assert(persistenceIndex > runtimeIndex, 'persistence must load after the authored reconstruction API');

  assert.strictEqual(typeof buildId, 'string', 'metadata BUILD_ID must be a string');
  assert(buildId.length > 0, 'metadata BUILD_ID must not be empty');
  assert.deepStrictEqual(metadata.authoredLevels && metadata.authoredLevels.district1, {
    levelId: LEVEL_ID,
    schema: LEVEL_SCHEMA,
    staticByteLength: STATIC_BYTES,
    staticSha256: STATIC_SHA256,
  }, 'authored District 1 metadata mismatch');
  assert.deepStrictEqual(metadata.artifact, {
    path: 'index.html',
    byteLength: 1302797,
    sha256: '316fca1b500e4077a3619ee2b1be5e04309fc08c9e14cfe9377bc4be8ebffb82',
  }, 'canonical artifact metadata mismatch');
  assert.deepStrictEqual(metadata.distribution, {
    provider: 'github-pages',
    url: 'https://falloutmule.github.io/solidarity-not-charity-can-run/',
    source: { branch: 'main', path: '/' },
  }, 'Pages distribution metadata mismatch');
  assert.deepStrictEqual(metadata.selection && metadata.selection.farField && metadata.selection.farField.modes, {
    ffres: '400', ffangle: 'interp', ffproj: 'subpixel',
  }, 'selected far-field mode metadata mismatch');
  assert.strictEqual(metadata.selection && metadata.selection.farField && metadata.selection.farField.status, 'selected', 'far-field selection must remain selected');
  assert.strictEqual(metadata.acceptance && metadata.acceptance.samsungSmoothness && metadata.acceptance.samsungSmoothness.status, 'failed', 'Samsung smoothness must remain recorded as failed');
  assert.strictEqual(metadata.acceptance && metadata.acceptance.userVisual && metadata.acceptance.userVisual.status, 'pending', 'user visual acceptance must remain pending');
  assert.strictEqual(metadata.art.custom_next_001.approvalStatus, 'pending_art_review', 'asset approval must remain pending');
  assert.deepStrictEqual(metadata.art.custom_next_001.atlas, {
    width: 1280,
    height: 160,
    byteLength: ASSET_BYTES,
    sha256: ASSET_SHA256,
  }, 'exact bitmap asset metadata mismatch');

  assert.strictEqual(pkg.scripts['test:authored-d1'], 'node tests/authored_d1_level_verify.js');
  assert.strictEqual(pkg.scripts['test:authored-d1-save'], 'node tests/authored_d1_save_load_verify.js');
  assert.strictEqual(pkg.scripts['test:authored-d1-smoke'], 'node tests/authored_d1_ordinary_game_smoke.js');
  assert(sourceBuild.includes(`var BUILD_ID = '${buildId}'`), 'source BUILD_ID declaration mismatch');
  assert(sourceBuild.includes('FEEL2_PORTRAIT_LOOK_SOFTEN'), 'portrait look policy is missing');
  assert(citySource.includes('sncInstallAuthoredLevel'), 'ordinary District 1 city route is not authored');
  assert(rendererSource.indexOf('const bitmapHandled') < rendererSource.indexOf('} else if(crDrawPrefabFaceColumn'), 'generic bitmap renderer must precede procedural/prefab fallback');
  assert(minimapSource.includes('panel: { x: mr.x, y: mr.y, w: mr.w, h: mr.h }'), 'canonical minimap cache must declare panel x/y/w/h');
  assert(minimapSource.includes('draw: { ox, oy, W, H, cell: d.cell, scale: d.scale }'), 'canonical minimap cache must declare draw ox/oy/W/H/cell/scale');
  assert(minimapSource.includes('map: { w: game.MAP_W, h: game.MAP_H, aspect:'), 'canonical minimap cache must declare map w/h/aspect');
  assert(smokeSource.includes("if (typeof portraitMinimapDrawCache === 'undefined' || !portraitMinimapDrawCache) return false;"), 'smoke must wait for a semantic minimap cache predicate');
  assert(smokeSource.includes('const minimap = await page.evaluate(() => {'), 'smoke must snapshot minimap cache in a separate page.evaluate call');
  assert(smokeSource.includes('const cacheSnapshot = JSON.parse(JSON.stringify(cache));'), 'smoke minimap evidence must contain a deep serializable cache snapshot');
  assert(smokeSource.includes('const imageData = canvasContext.getImageData('), 'smoke minimap evidence must sample the actual canvas draw rectangle');
  assert(!/const\s+minimap\s*=\s*await\s+page\.waitForFunction/.test(smokeSource), 'waitForFunction boolean handle must not be treated as minimap data');
  assert(!/\.then\s*\(\s*handle\s*=>\s*handle\.jsonValue\s*\(\s*\)\s*\)/.test(smokeSource), 'waitForFunction result must not be decoded as the minimap cache');

  assert(inputSource.includes("semanticActions.moveFwd = !!(keys['KeyW']"), 'ordinary KeyW must map to moveFwd');
  assert(inputSource.includes("semanticActions.turnLeft = !!(keys['KeyQ']"), 'ordinary KeyQ must map to turnLeft');
  assert(inputSource.includes("semanticActions.turnRight = !!(keys['KeyE']"), 'ordinary KeyE must map to turnRight');
  assert(inputSource.includes('const turn=2.4*dt;'), 'ordinary turn-rate assumption must remain 2.4 radians/second');
  assert(gameStateSource.includes('walkSpeed:3.0'), 'ordinary walk-speed assumption must remain 3.0 world units/second');
  assert(inputSource.includes('let spd = (sprinting?cfg.sprintSpeed:cfg.walkSpeed);'), 'ordinary movement must use cfg.walkSpeed without sprint');
  assert(inputSource.includes('const mv=spd*dt;'), 'ordinary movement quantum must be speed times dt');
  assert(inputSource.includes('const moveRes = movePlayerWithCollision(dx, dy);'), 'ordinary update must route movement through collision');
  assert(collisionSource.includes('const r=0.22;'), 'canStand radius assumption must remain 0.22');
  assert(collisionSource.includes('const CR_MOVE_SUBSTEP_MAX = 0.12;'), 'collision substep assumption must remain 0.12');
  assert(collisionSource.includes('if(canStand(player.x + sx, player.y)) player.x += sx;'), 'collision must gate x movement with canStand');
  assert(collisionSource.includes('if(canStand(player.x, player.y + sy)) player.y += sy;'), 'collision must gate y movement with canStand');
  assert(levelSource.includes("streetLayoutMeta: { roadY0: 8, roadY1: 11, GW: 40, GH: 20 }"), 'authored south boundary must remain y=8');
  assert(levelSource.includes('x: 11.0') && levelSource.includes('y: 10.5') && levelSource.includes('angleRadians: -1.5707963267948966'), 'authored start pose assumption changed');
  assert(levelSource.includes("'8000000011111100000000000000000000000008'"), 'authored building footprint rows changed');
  assert.strictEqual(MOVEMENT_DT, 1 / 60, 'smoke movement dt must remain 1/60');
  assert.strictEqual(MOVE_QUANTUM, 0.05, 'source-derived ordinary movement quantum must remain 0.05');
  assert.deepStrictEqual(COLLISION_STOP_BAND, [8.22, 8.27], 'source-derived collision stop band changed');
  const diagnosticFields = ['startPose', 'finalPose', 'startAngle', 'finalAngle', 'desiredAngle', 'minTargetDistance', 'finalTargetDistance', 'totalDistance', 'nonzeroStepCount', 'zeroStepCount', 'lastSemanticAction', 'lastRawInput', 'lastMoveDebug', 'visitedCells', 'solidEntry', 'ownerEntry', 'occupiedOwnerCellsEntered', 'target', 'boundary', 'dt', 'elapsed', 'stepCount', 'lastAction'];
  for (const field of diagnosticFields) assert(smokeSource.includes(`${field}:`), `smoke diagnostic field missing: ${field}`);
  assert(String(turnOrdinaryTo).includes('throwMovementError') && String(driveOrdinaryTo).includes('throwMovementError') && String(proveSouthCollision).includes('throwMovementError') && String(collectPickupOrdinarily).includes('throwMovementError') && String(sampleBuildingFaceOrdinarily).includes('error.smokeDiagnostics'), 'every bounded movement/turn helper must attach smokeDiagnostics before throwing');
  assert(smokeSource.includes('error.smokeDiagnostics'), 'main catch must preserve movement diagnostics in result.json');
  assert(!smokeSource.includes('drive' + 'Until('), 'heading-assuming hardcoded movement helper must remain removed');
  assert(!smokeSource.includes('pose.y <= ' + '8.24'), 'impossible collision gate must remain removed');
  assert.strictEqual(countLiteral(smokeSource, 'main()' + '.catch'), 1, 'smoke must have one fail-closed main entry and no retry entry');

  assert(artifact.includes(`var BUILD_ID = '${buildId}'`), 'root artifact is stale or has the wrong BUILD_ID');
  assert(artifact.includes(`rmenu:'title-start'`), 'ordinary title New Run action declaration is absent from the root artifact');
  assert(artifact.includes(`rmenu:'title-continue'`), 'ordinary title Continue action declaration is absent from the root artifact');
  assert(artifact.includes(LEVEL_ID), 'authored level ID is absent from the root artifact');
  assert(artifact.includes(STATIC_SHA256), 'authored static hash is absent from the root artifact');
  assert(artifact.includes(ASSET_SHA256), 'exact bitmap asset hash is absent from the root artifact');
  assert.strictEqual((smokeSource.match(/chromium\.launch\s*\(/g) || []).length, 1, 'smoke must contain exactly one Chromium launch');
  assert.strictEqual((smokeSource.match(/browser\.newContext\s*\(/g) || []).length, 1, 'smoke must contain exactly one browser context creation');
  assert.strictEqual((smokeSource.match(/context\.newPage\s*\(/g) || []).length, 1, 'smoke must contain exactly one page creation');
  assert.strictEqual((smokeSource.match(/page\.screenshot\s*\(/g) || []).length, 1, 'smoke must contain exactly one minimum screenshot site');
  assert(smokeSource.indexOf('if (PRE' + 'FLIGHT_ONLY)') < smokeSource.indexOf('const local = await ' + 'startServer()'), 'preflight-only must exit before server startup');
  assert(fs.existsSync(chromium.executablePath()), `Chromium executable is missing: ${chromium.executablePath()}`);

  const details = {
    pass: true,
    buildId,
    runDirectory: run.relative,
    artifact: relativeDisplay(ARTIFACT),
    artifactBytes: Buffer.byteLength(normalizedArtifact),
    artifactSha256: crypto.createHash('sha256').update(normalizedArtifact).digest('hex'),
    manifestIndices: { customIndex, levelIndex, cityIndex, runtimeIndex, persistenceIndex },
    ordinaryActions: ['[data-action=title-start]', '[data-action=title-continue]'],
    browserBudget: { launches: 1, contexts: 1, pages: 1, screenshotSites: 1, automaticRetries: 0, fallbackLaunches: 0 },
    movementAssumptions: { dt: MOVEMENT_DT, turnRate: 2.4, turnQuantum: TURN_QUANTUM, walkSpeed: 3.0, moveQuantum: MOVE_QUANTUM, canStandRadius: CAN_STAND_RADIUS, buildingSouthBoundaryY: BUILDING_SOUTH_BOUNDARY_Y, collisionStopBand: COLLISION_STOP_BAND },
    movementDiagnosticsFields: diagnosticFields,
  };
  fs.writeFileSync(path.join(run.dir, 'preflight.json'), JSON.stringify(details, null, 2) + '\n', 'utf8');
  return details;
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

async function startServer() {
  const server = http.createServer((request, response) => {
    try {
      const parsed = new URL(request.url, 'http://127.0.0.1');
      if (parsed.pathname === '/favicon.ico') {
        response.writeHead(204, { 'Cache-Control': 'no-store' });
        response.end();
        return;
      }
      const requested = parsed.pathname === '/' ? ARTIFACT : path.resolve(ROOT, `.${decodeURIComponent(parsed.pathname)}`);
      if (requested !== ARTIFACT && !isStrictDescendant(ROOT, requested)) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('forbidden');
        return;
      }
      if (!fs.existsSync(requested) || !fs.statSync(requested).isFile()) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': contentType(requested),
        'Cache-Control': 'no-store',
        'Cross-Origin-Resource-Policy': 'same-origin',
      });
      fs.createReadStream(requested).pipe(response);
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(String(error && error.message ? error.message : error));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}/` };
}

function probeServer(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let bytes = 0;
      response.on('data', chunk => { bytes += chunk.length; });
      response.on('end', () => {
        if (response.statusCode !== 200 || bytes < 1000) reject(new Error(`local artifact preflight failed: HTTP ${response.statusCode}, ${bytes} bytes`));
        else resolve({ statusCode: response.statusCode, bytes });
      });
    });
    request.setTimeout(5000, () => request.destroy(new Error('local artifact preflight timed out')));
    request.on('error', reject);
  });
}

function attachObservers(page, baseUrl) {
  const baseOrigin = new URL(baseUrl).origin;
  const observed = {
    consoleErrors: [],
    pageErrors: [],
    externalRequests: [],
    requestFailures: [],
    badResponses: [],
  };
  page.on('console', message => {
    if (message.type() === 'error') observed.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => observed.pageErrors.push(String(error && error.stack ? error.stack : error)));
  page.on('request', request => {
    const url = request.url();
    if (/^https?:/i.test(url) && new URL(url).origin !== baseOrigin) {
      observed.externalRequests.push({ method: request.method(), resourceType: request.resourceType(), url });
    }
  });
  page.on('requestfailed', request => {
    observed.requestFailures.push({ url: request.url(), failure: request.failure() });
  });
  page.on('response', response => {
    if (response.status() >= 400) observed.badResponses.push({ status: response.status(), url: response.url() });
  });
  return observed;
}

function installReconstructionObserver() {
  window.__authoredD1SmokeTrace = [];
  window.__authoredD1SmokeObserverReady = false;
  const snapshotStatic = () => {
    const g = window.CR && window.CR.game;
    if (!g) return null;
    let owners = 0;
    for (const row of g.buildingGrid || []) for (const cell of row || []) if (cell && cell.bid === 1) owners++;
    return {
      levelId: g.authoredLevelId || null,
      staticSha256: g.authoredStaticSha256 || null,
      registryIds: Object.keys(g.buildingRegistry || {}),
      ownerCells: owners,
      pickup03: g.pickups && g.pickups[3] ? { id: g.pickups[3].id, taken: g.pickups[3].taken, amt: g.pickups[3].amt } : null,
    };
  };
  const timer = setInterval(() => {
    if (typeof window.sncInstallAuthoredLevel === 'function' && !window.sncInstallAuthoredLevel.__authoredD1SmokeWrapped) {
      const original = window.sncInstallAuthoredLevel;
      const wrapped = function(...args) {
        window.__authoredD1SmokeTrace.push({ event: 'install:before', levelId: args[0] });
        const value = original.apply(this, args);
        window.__authoredD1SmokeTrace.push({ event: 'install:after', returned: value, staticState: snapshotStatic() });
        return value;
      };
      wrapped.__authoredD1SmokeWrapped = true;
      window.sncInstallAuthoredLevel = wrapped;
    }
    if (typeof window.sncApplyAuthoredMutableOverlay === 'function' && !window.sncApplyAuthoredMutableOverlay.__authoredD1SmokeWrapped) {
      const original = window.sncApplyAuthoredMutableOverlay;
      const wrapped = function(...args) {
        window.__authoredD1SmokeTrace.push({ event: 'overlay:before', levelId: args[0], staticState: snapshotStatic() });
        const value = original.apply(this, args);
        window.__authoredD1SmokeTrace.push({ event: 'overlay:after', returned: value, mutableState: snapshotStatic() });
        return value;
      };
      wrapped.__authoredD1SmokeWrapped = true;
      window.sncApplyAuthoredMutableOverlay = wrapped;
    }
    window.__authoredD1SmokeObserverReady =
      !!(window.sncInstallAuthoredLevel && window.sncInstallAuthoredLevel.__authoredD1SmokeWrapped) &&
      !!(window.sncApplyAuthoredMutableOverlay && window.sncApplyAuthoredMutableOverlay.__authoredD1SmokeWrapped);
    if (window.__authoredD1SmokeObserverReady) clearInterval(timer);
  }, 0);
}

async function dismissOrdinaryOnboarding(page) {
  const visible = await page.locator('#cronboard.show').count();
  if (visible) {
    await page.locator('#cronboardok').click();
    await page.waitForFunction(() => window.CR && window.CR.onboardingOpen === false);
  }
}

const MOVEMENT_DT = 1 / 60;
const TURN_QUANTUM = 2.4 * MOVEMENT_DT;
const MOVE_QUANTUM = 3.0 * MOVEMENT_DT;
const CAN_STAND_RADIUS = 0.22;
const BUILDING_SOUTH_BOUNDARY_Y = 8;
const COLLISION_STOP_BAND = [8.22, 8.27];
const ORDINARY_KEYS = ['q', 'e', 'w', 'a', 's', 'd'];

function normalizeAngle(angle) {
  let value = angle;
  while (value <= -Math.PI) value += Math.PI * 2;
  while (value > Math.PI) value -= Math.PI * 2;
  return value;
}

async function clearOrdinaryKeys(page) {
  for (const key of ORDINARY_KEYS) await page.keyboard.up(key);
}

function newSmokeDiagnostics(label, target, desiredAngle) {
  return {
    label,
    startPose: null,
    finalPose: null,
    startAngle: null,
    finalAngle: null,
    desiredAngle: desiredAngle == null ? null : desiredAngle,
    minTargetDistance: null,
    finalTargetDistance: null,
    totalDistance: 0,
    nonzeroStepCount: 0,
    zeroStepCount: 0,
    lastSemanticAction: null,
    lastRawInput: null,
    lastMoveDebug: null,
    visitedCells: [],
    solidEntry: false,
    ownerEntry: false,
    occupiedOwnerCellsEntered: 0,
    target: target || null,
    boundary: { buildingSouthY: BUILDING_SOUTH_BOUNDARY_Y, canStandRadius: CAN_STAND_RADIUS, expectedQuantizedStopY: 8.25, acceptedStopBand: COLLISION_STOP_BAND.slice() },
    dt: MOVEMENT_DT,
    elapsed: 0,
    stepCount: 0,
    lastAction: 'created',
  };
}

function throwMovementError(message, smokeDiagnostics) {
  const error = new Error(message);
  error.smokeDiagnostics = smokeDiagnostics;
  throw error;
}

async function ordinaryStepSnapshot(page, target) {
  return page.evaluate(({ dt, targetPoint }) => {
    const before = { x: CR.player.x, y: CR.player.y, angle: CR.player.angle };
    CR.update(dt);
    const after = { x: CR.player.x, y: CR.player.y, angle: CR.player.angle };
    const tx = Math.floor(after.x);
    const ty = Math.floor(after.y);
    const owner = CR.game.buildingGrid && CR.game.buildingGrid[ty] && CR.game.buildingGrid[ty][tx];
    const solid = World.cellSolid(tx, ty);
    return {
      before,
      pose: after,
      delta: Math.hypot(after.x - before.x, after.y - before.y),
      targetDistance: targetPoint ? Math.hypot(after.x - targetPoint.x, after.y - targetPoint.y) : null,
      cell: { x: tx, y: ty, key: `${tx},${ty}`, solid, owner: owner ? { bid: owner.bid, lx: owner.lx, ly: owner.ly } : null },
      canStand: canStand(after.x, after.y),
      play: { stateIsPlay: CR.state === CR.STATE.PLAY, paused: CR.paused, onboardingOpen: CR.onboardingOpen },
      semanticAction: JSON.parse(JSON.stringify(CR.getSemanticActionMap())),
      rawInput: JSON.parse(JSON.stringify(keys)),
      moveDebug: window._moveDbg ? JSON.parse(JSON.stringify(window._moveDbg)) : null,
      pickup03Taken: !!(CR.game.pickups[3] && CR.game.pickups[3].taken),
      pickup03Amount: CR.game.pickups[3] && CR.game.pickups[3].amt,
    };
  }, { dt: MOVEMENT_DT, targetPoint: target || null });
}

function recordMovementStep(diagnostics, snapshot, action) {
  if (!diagnostics.startPose) {
    diagnostics.startPose = snapshot.before;
    diagnostics.startAngle = snapshot.before.angle;
  }
  diagnostics.finalPose = snapshot.pose;
  diagnostics.finalAngle = snapshot.pose.angle;
  diagnostics.finalTargetDistance = snapshot.targetDistance;
  if (snapshot.targetDistance != null) {
    diagnostics.minTargetDistance = diagnostics.minTargetDistance == null
      ? snapshot.targetDistance
      : Math.min(diagnostics.minTargetDistance, snapshot.targetDistance);
  }
  diagnostics.totalDistance += snapshot.delta;
  if (snapshot.delta > 1e-7) diagnostics.nonzeroStepCount++;
  else diagnostics.zeroStepCount++;
  diagnostics.lastSemanticAction = snapshot.semanticAction;
  diagnostics.lastRawInput = snapshot.rawInput;
  diagnostics.lastMoveDebug = snapshot.moveDebug;
  diagnostics.solidEntry = diagnostics.solidEntry || snapshot.cell.solid;
  diagnostics.ownerEntry = diagnostics.ownerEntry || !!snapshot.cell.owner;
  if (snapshot.cell.owner) diagnostics.occupiedOwnerCellsEntered++;
  if (!diagnostics.visitedCells.some(cell => cell.key === snapshot.cell.key)) diagnostics.visitedCells.push(snapshot.cell);
  diagnostics.stepCount++;
  diagnostics.elapsed = diagnostics.stepCount * MOVEMENT_DT;
  diagnostics.lastAction = action;
  diagnostics.finalCanStand = snapshot.canStand;
  diagnostics.finalPlay = snapshot.play;
}

function validateLivePlay(snapshot, diagnostics, label) {
  if (!snapshot.play.stateIsPlay || snapshot.play.paused || snapshot.play.onboardingOpen) {
    diagnostics.lastAction = `${label}:invalid-play-state`;
    throwMovementError(`${label} requires PLAY, unpaused, onboarding closed`, diagnostics);
  }
}

async function turnOrdinaryTo(page, desiredAngle, label, target, maxSteps = 180, tolerance = TURN_QUANTUM / 2 + 1e-6) {
  const diagnostics = newSmokeDiagnostics(label, target, normalizeAngle(desiredAngle));
  diagnostics.turnInputStepCount = 0;
  try {
    await clearOrdinaryKeys(page);
    const initialSnapshot = await ordinaryStepSnapshot(page, target);
    recordMovementStep(diagnostics, initialSnapshot, 'turn-preflight:no-key');
    validateLivePlay(initialSnapshot, diagnostics, label);
    for (let i = 0; i < maxSteps; i++) {
      const angle = await page.evaluate(() => CR.player.angle);
      const error = normalizeAngle(diagnostics.desiredAngle - angle);
      if (Math.abs(error) <= tolerance) {
        diagnostics.lastAction = `${label}:aligned`;
        return diagnostics;
      }
      const key = error < 0 ? 'q' : 'e';
      await page.keyboard.down(key);
      let snapshot;
      try {
        snapshot = await ordinaryStepSnapshot(page, target);
      } finally {
        await page.keyboard.up(key);
      }
      recordMovementStep(diagnostics, snapshot, `turn:${key === 'q' ? 'KeyQ' : 'KeyE'}`);
      diagnostics.turnInputStepCount++;
      validateLivePlay(snapshot, diagnostics, label);
    }
    diagnostics.lastAction = `${label}:turn-timeout`;
    throwMovementError(`${label} did not align within ${maxSteps} ordinary turn steps`, diagnostics);
  } catch (error) {
    if (!error.smokeDiagnostics) error.smokeDiagnostics = diagnostics;
    throw error;
  } finally {
    await clearOrdinaryKeys(page);
  }
}

async function driveOrdinaryTo(page, target, label, options = {}) {
  const maxSteps = options.maxSteps || 520;
  const tolerance = options.tolerance == null ? 0.14 : options.tolerance;
  const diagnostics = newSmokeDiagnostics(label, target, null);
  try {
    await clearOrdinaryKeys(page);
    const start = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }));
    diagnostics.startPose = start;
    diagnostics.startAngle = start.angle;
    diagnostics.desiredAngle = normalizeAngle(Math.atan2(target.y - start.y, target.x - start.x));
    diagnostics.turn = await turnOrdinaryTo(page, diagnostics.desiredAngle, `${label}:steer`, target);
    await page.keyboard.down('w');
    for (let i = 0; i < maxSteps; i++) {
      const snapshot = await ordinaryStepSnapshot(page, target);
      recordMovementStep(diagnostics, snapshot, 'drive:KeyW');
      validateLivePlay(snapshot, diagnostics, label);
      if (snapshot.cell.owner || snapshot.cell.solid) throwMovementError(`${label} entered a solid or occupied owner cell`, diagnostics);
      if (snapshot.targetDistance <= tolerance) {
        if (diagnostics.nonzeroStepCount === 0 || diagnostics.totalDistance <= 1e-7) {
          throwMovementError(`${label} reached its predicate without ordinary movement`, diagnostics);
        }
        diagnostics.lastAction = `${label}:waypoint-reached`;
        return diagnostics;
      }
      if (diagnostics.zeroStepCount >= 12) throwMovementError(`${label} was blocked before reaching its open waypoint`, diagnostics);
    }
    diagnostics.lastAction = `${label}:drive-timeout`;
    throwMovementError(`${label} did not reach its waypoint within ${maxSteps} ordinary KeyW steps`, diagnostics);
  } catch (error) {
    if (!error.smokeDiagnostics) error.smokeDiagnostics = diagnostics;
    throw error;
  } finally {
    await clearOrdinaryKeys(page);
  }
}

async function proveSouthCollision(page) {
  const target = { x: 11, y: BUILDING_SOUTH_BOUNDARY_Y, kind: 'building-south-boundary' };
  const diagnostics = newSmokeDiagnostics('south-front collision', target, null);
  try {
    await clearOrdinaryKeys(page);
    const start = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }));
    diagnostics.startPose = start;
    diagnostics.startAngle = start.angle;
    diagnostics.desiredAngle = normalizeAngle(Math.atan2(target.y - start.y, target.x - start.x));
    diagnostics.turn = await turnOrdinaryTo(page, diagnostics.desiredAngle, 'south-front collision:steer', target);
    await page.keyboard.down('w');
    let consecutiveZero = 0;
    for (let i = 0; i < 180; i++) {
      const snapshot = await ordinaryStepSnapshot(page, target);
      recordMovementStep(diagnostics, snapshot, 'collision-drive:KeyW');
      validateLivePlay(snapshot, diagnostics, 'south-front collision');
      if (snapshot.cell.owner || snapshot.cell.solid) throwMovementError('south-front collision entered a solid or occupied owner cell', diagnostics);
      consecutiveZero = snapshot.delta <= 1e-7 ? consecutiveZero + 1 : 0;
      if (diagnostics.nonzeroStepCount > 0 && consecutiveZero >= 12) {
        const y = snapshot.pose.y;
        const boundaryDistance = y - BUILDING_SOUTH_BOUNDARY_Y;
        diagnostics.finalBoundaryDistance = boundaryDistance;
        diagnostics.repeatedZeroDeltaSteps = consecutiveZero;
        const pass = diagnostics.totalDistance > 0 && diagnostics.nonzeroStepCount > 0 &&
          diagnostics.zeroStepCount >= 12 && snapshot.canStand && !snapshot.cell.solid && !snapshot.cell.owner &&
          y >= COLLISION_STOP_BAND[0] && y <= COLLISION_STOP_BAND[1] &&
          boundaryDistance <= 0.27 && diagnostics.occupiedOwnerCellsEntered === 0;
        if (!pass) throwMovementError('south-front collision stop failed source-derived clearance and quantization gates', diagnostics);
        diagnostics.lastAction = 'south-front collision:repeated-zero-delta-stop';
        return diagnostics;
      }
    }
    diagnostics.lastAction = 'south-front collision:timeout';
    throwMovementError('south-front collision did not produce movement followed by repeated zero-delta KeyW steps', diagnostics);
  } catch (error) {
    if (!error.smokeDiagnostics) error.smokeDiagnostics = diagnostics;
    throw error;
  } finally {
    await clearOrdinaryKeys(page);
  }
}

async function collectPickupOrdinarily(page, target, label) {
  const diagnostics = await driveOrdinaryTo(page, target, label, { tolerance: 0.18, maxSteps: 520 });
  const collected = await page.evaluate(() => !!(CR.game.pickups[3] && CR.game.pickups[3].taken));
  if (!collected) {
    diagnostics.lastAction = `${label}:pickup-not-collected`;
    throwMovementError(`${label} reached pickup-03 without ordinary tick collection`, diagnostics);
  }
  diagnostics.pickup03Taken = true;
  return diagnostics;
}

async function sampleBuildingFaceOrdinarily(page, expectedFace, label) {
  const pose = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y }));
  const buildingCenter = { x: 11, y: 6.5 };
  const desiredAngle = Math.atan2(buildingCenter.y - pose.y, buildingCenter.x - pose.x);
  const turn = await turnOrdinaryTo(page, desiredAngle, `${label}:turn-toward-building`, buildingCenter);
  try {
    await page.evaluate(() => {
      window.__authoredD1RendererRecords = [];
      drawScene();
    });
    await page.waitForFunction(() => (window.__authoredD1RendererRecords || []).some(row => row && row.center), null, { timeout: 3000 });
    const sample = await page.evaluate((face) => {
      const records = (window.__authoredD1RendererRecords || []).filter(row => row && row.center);
      const matching = records.find(row => row.worldFace === face) || records[0] || null;
      return {
        matching,
        recordCount: (window.__authoredD1RendererRecords || []).length,
        rendererRecords: records.slice(0, 12),
        pose: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
        play: { stateIsPlay: CR.state === CR.STATE.PLAY, paused: CR.paused, onboardingOpen: CR.onboardingOpen },
      };
    }, expectedFace);
    return { turn, sample };
  } catch (error) {
    turn.lastAction = `${label}:render-sample-error`;
    turn.expectedFace = expectedFace;
    if (!error.smokeDiagnostics) error.smokeDiagnostics = turn;
    throw error;
  } finally {
    await clearOrdinaryKeys(page);
  }
}

async function main() {
  let run;
  try {
    run = createRunDirectory();
  } catch (error) {
    console.error(`FAIL authored District 1 smoke preflight: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const result = {
    schemaVersion: 1,
    test: 'authored-d1-ordinary-game-smoke',
    technicalScreeningOnly: true,
    userVisualAcceptance: 'pending',
    runDirectory: run.relative,
    startedAt: new Date().toISOString(),
    pass: false,
    preflight: null,
    serverProbe: null,
    assertions: {},
    evidence: {},
    observers: null,
    cleanup: { page: false, context: false, browser: false, server: false },
    errors: [],
  };

  let server;
  let browser;
  let context;
  let page;
  let observed;
  try {
    result.preflight = preflight(run);
    const buildId = result.preflight.buildId;
    if (PREFLIGHT_ONLY) {
      const preflightResult = {
        pass: true,
        mode: 'preflight-only',
        browserFree: true,
        browserSessionsConsumed: 0,
        serverStarted: false,
        chromiumLaunched: false,
        runDirectory: run.relative,
        preflight: result.preflight,
        finishedAt: new Date().toISOString(),
      };
      const preflightResultPath = path.join(run.dir, 'preflight-result.json');
      fs.writeFileSync(preflightResultPath, JSON.stringify(preflightResult, null, 2) + '\n', 'utf8');
      console.log(JSON.stringify({ pass: true, mode: 'preflight-only', browserSessionsConsumed: 0, serverStarted: false, chromiumLaunched: false, result: relativeDisplay(preflightResultPath) }));
      return;
    }
    const local = await startServer();
    server = local.server;
    const baseUrl = local.baseUrl;
    assert.strictEqual(new URL(baseUrl).search, '', 'ordinary smoke URL must not have a query string');
    assert.strictEqual(new URL(baseUrl).hash, '', 'ordinary smoke URL must not have a hash');
    result.serverProbe = await probeServer(baseUrl);

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    page = await context.newPage();
    observed = attachObservers(page, baseUrl);
    await page.addInitScript(installReconstructionObserver);

    const check = (name, condition, evidence) => {
      result.assertions[name] = { pass: !!condition, evidence: evidence === undefined ? null : evidence };
      if (!condition) {
        const findDiagnostics = value => {
          if (!value || typeof value !== 'object') return null;
          if (Object.prototype.hasOwnProperty.call(value, 'startPose') && Object.prototype.hasOwnProperty.call(value, 'lastAction')) return value;
          for (const nested of Object.values(value)) {
            const found = findDiagnostics(nested);
            if (found) return found;
          }
          return null;
        };
        const error = new assert.AssertionError({ message: name, actual: condition, expected: true, operator: '==' });
        error.smokeDiagnostics = findDiagnostics(evidence);
        throw error;
      }
    };

    await page.goto(baseUrl, { waitUntil: 'load', timeout: 15000 });
    await page.waitForFunction(() => window.CR && window.BUILD_ID, null, { timeout: 10000 });
    await page.waitForFunction(() => window.__authoredD1SmokeObserverReady === true, null, { timeout: 5000 });
    await page.waitForSelector('[data-action="title-start"]', { state: 'visible', timeout: 5000 });
    const titlePreflight = await page.evaluate(() => ({
      stateIsTitle: CR.state === CR.STATE.TITLE,
      selectedDistrict: CR.crGetSelectedStartDistrict(),
      actionCount: document.querySelectorAll('[data-action="title-start"]').length,
      url: location.href,
      search: location.search,
      hash: location.hash,
    }));
    check('ordinary title menu ready', titlePreflight.stateIsTitle && titlePreflight.selectedDistrict === 1 && titlePreflight.actionCount === 1, titlePreflight);
    check('no proof debug custom query', titlePreflight.search === '' && titlePreflight.hash === '', titlePreflight.url);

    await page.locator('[data-action="title-start"]').click();
    await page.waitForFunction(() => window.CR && CR.state === CR.STATE.PLAY, null, { timeout: 10000 });
    await dismissOrdinaryOnboarding(page);
    await page.waitForFunction(() => CR.state === CR.STATE.PLAY && !CR.paused && !CR.onboardingOpen, null, { timeout: 5000 });
    await page.waitForFunction(() => typeof CUSTOM_NEXT_001_LOAD_STATE !== 'undefined' && CUSTOM_NEXT_001_LOAD_STATE.status === 'loaded', null, { timeout: 10000 });

    const initial = await page.evaluate(({ levelId, staticSha, assetId, assetBytes, assetSha, buildId }) => {
      const g = CR.game;
      const p = CR.player;
      const registry = Object.values(g.buildingRegistry || {});
      const ownerCells = [];
      for (let y = 0; y < (g.buildingGrid || []).length; y++) {
        for (let x = 0; x < (g.buildingGrid[y] || []).length; x++) {
          const cell = g.buildingGrid[y][x];
          if (cell) ownerCells.push({ x, y, ...cell });
        }
      }
      const forbiddenPlacementFields = registry.flatMap(entry => Object.keys(entry).filter(key => /proof|slot|zone|placeholder|mid/i.test(key)));
      const reach = CR.gridReachableFrom(p.x, p.y, { maxCells: 5000 });
      const perimeter = [];
      for (let x = 7; x <= 14; x++) { perimeter.push([x, 4], [x, 8]); }
      for (let y = 5; y <= 7; y++) { perimeter.push([7, y], [14, y]); }
      const uniquePerimeter = [...new Map(perimeter.map(cell => [cell.join(','), cell])).values()];
      const identity = sncAuthoredStaticIdentity(levelId);
      const asset = lookupBitmapBuildingAsset(assetId);
      const runtimeErrors = (window.__crRuntimeErrors || []).slice();
      return {
        buildId: window.BUILD_ID,
        crBuildId: CR.BUILD_ID,
        state: CR.state,
        stateIsPlay: CR.state === CR.STATE.PLAY,
        paused: CR.paused,
        levelId: g.authoredLevelId,
        levelSchema: g.authoredLevelSchema,
        staticSha256: g.authoredStaticSha256,
        identity,
        pose: { x: p.x, y: p.y, angle: p.angle },
        map: { width: g.MAP_W, height: g.MAP_H, rows: g.map.length, rowWidth: g.map[0].length },
        registry,
        registryCount: registry.length,
        ownerCells,
        ownerCellCount: ownerCells.length,
        forbiddenPlacementFields,
        nextBuildingId: g._nextBuildingId,
        counts: { pickups: g.pickups.length, npcs: g.npcs.length, props: g.props.length },
        quota: g.quota,
        exit: g.exit,
        reach: { pass: reach.pass, count: reach.count, errors: reach.errors },
        perimeterCount: uniquePerimeter.length,
        perimeterReachable: uniquePerimeter.every(([x, y]) => !!reach.reachable[`${y},${x}`]),
        asset: asset && {
          id: asset.id,
          renderMode: asset.renderMode,
          approvalStatus: asset.approvalStatus,
          byteLength: asset.atlas.byteLength,
          sha256: asset.atlas.sha256,
          width: asset.atlas.width,
          height: asset.atlas.height,
          loadState: CUSTOM_NEXT_001_LOAD_STATE.status,
        },
        expected: { levelId, staticSha, assetId, assetBytes, assetSha, buildId },
        runtimeErrors,
      };
    }, { levelId: LEVEL_ID, staticSha: STATIC_SHA256, assetId: ASSET_ID, assetBytes: ASSET_BYTES, assetSha: ASSET_SHA256, buildId });
    result.evidence.initial = initial;
    check('runtime BUILD_ID parity', initial.buildId === buildId && initial.crBuildId === buildId, initial);
    check('ordinary authored D1 active', initial.stateIsPlay && initial.paused === false && initial.levelId === LEVEL_ID && initial.levelSchema === LEVEL_SCHEMA, initial);
    check('exact static identity', initial.staticSha256 === STATIC_SHA256 && initial.identity && initial.identity.schema === LEVEL_SCHEMA && initial.identity.byteLength === STATIC_BYTES && initial.identity.sha256 === STATIC_SHA256, initial.identity);
    check('exact spawn pose', initial.pose.x === 11 && initial.pose.y === 10.5 && Math.abs(initial.pose.angle + Math.PI / 2) < 1e-12, initial.pose);
    check('exact authored grid', initial.map.width === 40 && initial.map.height === 20 && initial.map.rows === 20 && initial.map.rowWidth === 40, initial.map);
    check('exact single bitmap registry', initial.registryCount === 1 && initial.registry[0].bid === 1 && initial.registry[0].id === 'district-1-main-landmark' && initial.registry[0].assetId === ASSET_ID && initial.registry[0].renderMode === 'importedWholeFaceAsset' && initial.nextBuildingId === 2 && initial.forbiddenPlacementFields.length === 0, initial.registry);
    check('exact 18-cell owner grid', initial.ownerCellCount === 18 && initial.ownerCells.every(cell => cell.bid === 1 && cell.x === 8 + cell.lx && cell.y === 5 + cell.ly && Object.keys(cell).sort().join(',') === 'bid,lx,ly,x,y'), initial.ownerCells);
    check('exact authored entities quota exit', initial.counts.pickups === 10 && initial.counts.npcs === 6 && initial.counts.props === 12 && initial.quota === 4 && initial.exit.x === 36.5 && initial.exit.y === 17 && initial.exit.active === false, { counts: initial.counts, quota: initial.quota, exit: initial.exit });
    check('accessible exact perimeter', initial.reach.pass && initial.reach.count === 666 && initial.perimeterCount === 22 && initial.perimeterReachable, { reach: initial.reach, perimeterCount: initial.perimeterCount });
    check('exact bitmap loaded', initial.asset && initial.asset.id === ASSET_ID && initial.asset.renderMode === 'importedWholeFaceAsset' && initial.asset.approvalStatus === 'pending_art_review' && initial.asset.byteLength === ASSET_BYTES && initial.asset.sha256 === ASSET_SHA256 && initial.asset.width === 1280 && initial.asset.height === 160 && initial.asset.loadState === 'loaded', initial.asset);

    const rendererInstall = await page.evaluate(() => {
      const original = window.drawWholeFaceBitmapBuildingColumn;
      if (typeof original !== 'function') return { pass: false, reason: 'generic renderer missing' };
      const originalSource = String(original);
      window.__authoredD1RendererRecords = [];
      window.drawWholeFaceBitmapBuildingColumn = function(hit, placement) {
        const handled = original.apply(this, arguments);
        let detail = null;
        try {
          const asset = lookupBitmapBuildingAsset(placement.assetId);
          const worldFace = resolveBitmapWorldFace(hit.side, hit.stepX, hit.stepY);
          const localFace = inverseRotateBitmapFace(worldFace, placement.rotation || 0);
          const local = resolveBitmapLocalHit(hit.cell, localFace, placement.rotation || 0, Number(hit.wallFraction), placement.w, placement.h);
          const descriptor = asset.faces[localFace];
          let canonicalU = orientBitmapCanonicalU(localFace, local.localAlong, descriptor.sourceUDirection || descriptor.sourceLeftToRightWorldDirection);
          if (descriptor.mirror === true) canonicalU = 1 - canonicalU;
          canonicalU = Math.max(0, Math.min(1 - Number.EPSILON, canonicalU));
          const face = getBitmapFaceCanvas(asset, localFace);
          detail = {
            handled,
            col: hit.col,
            center: typeof RW !== 'undefined' && hit.col === Math.floor(RW / 2),
            bid: placement.bid,
            assetId: placement.assetId,
            worldFace,
            localFace,
            lx: hit.cell.lx,
            ly: hit.cell.ly,
            localAlong: local.localAlong,
            canonicalU,
            sourceX: face ? Math.floor(canonicalU * face.width) : null,
            faceWidth: face ? face.width : null,
          };
        } catch (error) {
          detail = { handled, error: String(error && error.message ? error.message : error) };
        }
        window.__authoredD1RendererRecords.push(detail);
        if (window.__authoredD1RendererRecords.length > 4000) window.__authoredD1RendererRecords.splice(0, 2000);
        return handled;
      };
      return {
        pass: true,
        sourceHasAssetSpecificBranch: originalSource.includes('custom_next_001'),
        drawSceneRoutesBitmapFirst: String(drawScene).indexOf('drawWholeFaceBitmapBuildingColumn') < String(drawScene).indexOf('crDrawPrefabFaceColumn'),
      };
    });
    check('generic renderer instrumented', rendererInstall.pass && !rendererInstall.sourceHasAssetSpecificBranch && rendererInstall.drawSceneRoutesBitmapFirst, rendererInstall);
    await page.waitForFunction(() => (window.__authoredD1RendererRecords || []).length >= 40, null, { timeout: 5000 });

    const renderer = await page.evaluate(() => {
      const records = (window.__authoredD1RendererRecords || []).filter(Boolean);
      const front = records.filter(row => row.localFace === 'south' && row.worldFace === 'south');
      const asset = lookupBitmapBuildingAsset('custom_next_001');
      const face = getBitmapFaceCanvas(asset, 'south');
      const samples = [];
      for (let lx = 0; lx < 6; lx++) {
        for (const fraction of [0, 0.5, 1 - 1e-9]) {
          const local = resolveBitmapLocalHit({ lx, ly: 2 }, 'south', 0, fraction, 6, 3);
          const u = orientBitmapCanonicalU('south', local.localAlong, asset.faces.south.sourceUDirection || asset.faces.south.sourceLeftToRightWorldDirection);
          samples.push({ lx, fraction, u, sourceX: Math.floor(Math.max(0, Math.min(1 - Number.EPSILON, u)) * face.width) });
        }
      }
      const boundaryGaps = [];
      for (let lx = 0; lx < 5; lx++) {
        const left = samples.find(row => row.lx === lx && row.fraction > 0.9);
        const right = samples.find(row => row.lx === lx + 1 && row.fraction === 0);
        boundaryGaps.push(right.sourceX - left.sourceX);
      }
      return {
        recordCount: records.length,
        frontCount: front.length,
        allHandled: records.every(row => row.handled === true && !row.error),
        centerFront: front.some(row => row.center && row.bid === 1 && row.assetId === 'custom_next_001'),
        observedFrontLocalCells: [...new Set(front.map(row => row.lx))].sort((a, b) => a - b),
        observedFrontSourceRange: front.length ? [Math.min(...front.map(row => row.sourceX)), Math.max(...front.map(row => row.sourceX))] : null,
        samples,
        boundaryGaps,
        sourceMonotonic: samples.every((row, index) => index === 0 || row.sourceX >= samples[index - 1].sourceX),
        fullFrontSpan: samples[0].sourceX === 0 && samples[samples.length - 1].sourceX === face.width - 1,
        noProceduralFallbackContract: String(drawScene).includes('if(bitmapHandled)') && String(drawScene).indexOf('if(bitmapHandled)') < String(drawScene).indexOf('crDrawPrefabFaceColumn'),
      };
    });
    result.evidence.renderer = renderer;
    check('center immediately hits south front', renderer.centerFront, renderer);
    check('generic bitmap renderer active without procedural fallback', renderer.recordCount >= 40 && renderer.allHandled && renderer.noProceduralFallbackContract, renderer);
    check('continuous front source-U', renderer.sourceMonotonic && renderer.fullFrontSpan && renderer.boundaryGaps.every(gap => gap >= 0 && gap <= 1), renderer);

    await page.waitForFunction(() => {
      if (typeof portraitMinimapDrawCache === 'undefined' || !portraitMinimapDrawCache) return false;
      const { panel, draw, map } = portraitMinimapDrawCache;
      const finite = value => Number.isFinite(value);
      return !!panel && !!draw && !!map &&
        map.w === 40 && map.h === 20 &&
        [panel.x, panel.y, panel.w, panel.h, draw.ox, draw.oy, draw.W, draw.H, draw.cell, draw.scale].every(finite) &&
        panel.w > 0 && panel.h > 0 && draw.W > 0 && draw.H > 0 && draw.cell > 0 && draw.scale > 0;
    }, null, { timeout: 5000 });
    const minimap = await page.evaluate(() => {
      const cache = typeof portraitMinimapDrawCache === 'undefined' ? null : portraitMinimapDrawCache;
      if (!cache || !cache.draw) return { cache: null, pixels: null };
      const cacheSnapshot = JSON.parse(JSON.stringify(cache));
      const canvas = document.getElementById('view');
      const canvasContext = canvas && canvas.getContext('2d');
      if (!canvasContext) return { cache: cacheSnapshot, pixels: null };

      const x0 = Math.max(0, Math.floor(cache.draw.ox));
      const y0 = Math.max(0, Math.floor(cache.draw.oy));
      const x1 = Math.min(canvas.width, Math.ceil(cache.draw.ox + cache.draw.W));
      const y1 = Math.min(canvas.height, Math.ceil(cache.draw.oy + cache.draw.H));
      const pixelWidth = Math.max(0, x1 - x0);
      const pixelHeight = Math.max(0, y1 - y0);
      if (!pixelWidth || !pixelHeight) {
        return { cache: cacheSnapshot, pixels: { x: x0, y: y0, width: pixelWidth, height: pixelHeight, sampleCount: 0 } };
      }

      const imageData = canvasContext.getImageData(x0, y0, pixelWidth, pixelHeight);
      const probe = document.createElement('canvas');
      probe.width = probe.height = 1;
      const probeContext = probe.getContext('2d');
      probeContext.fillStyle = MINIMAP_FLOOR;
      probeContext.fillRect(0, 0, 1, 1);
      const backgroundRgba = Array.from(probeContext.getImageData(0, 0, 1, 1).data);
      const pack = (r, g, b, a) => (((r << 24) | (g << 16) | (b << 8) | a) >>> 0);
      const background = pack(...backgroundRgba);
      const columns = Math.min(64, pixelWidth);
      const rows = Math.min(32, pixelHeight);
      const colors = new Map();
      let opaqueSamples = 0;
      let nonBackgroundSamples = 0;
      for (let row = 0; row < rows; row++) {
        const py = Math.min(pixelHeight - 1, Math.floor((row + 0.5) * pixelHeight / rows));
        for (let column = 0; column < columns; column++) {
          const px = Math.min(pixelWidth - 1, Math.floor((column + 0.5) * pixelWidth / columns));
          const offset = (py * pixelWidth + px) * 4;
          const color = pack(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2], imageData.data[offset + 3]);
          colors.set(color, (colors.get(color) || 0) + 1);
          if (imageData.data[offset + 3] > 0) opaqueSamples++;
          if (color !== background) nonBackgroundSamples++;
        }
      }
      const sampleCount = columns * rows;
      return {
        cache: cacheSnapshot,
        pixels: {
          x: x0,
          y: y0,
          width: pixelWidth,
          height: pixelHeight,
          sampleCount,
          opaqueSamples,
          nonBackgroundSamples,
          distinctColorCount: colors.size,
          dominantColorSamples: Math.max(...colors.values()),
          backgroundRgba,
        },
      };
    });
    const minimapCache = minimap.cache;
    const minimapPanel = minimapCache && minimapCache.panel;
    const minimapDraw = minimapCache && minimapCache.draw;
    const minimapMap = minimapCache && minimapCache.map;
    const minimapPixels = minimap.pixels;
    const finite = value => Number.isFinite(value);
    const containmentTolerance = 1; // computePortraitMinimapDraw rounds ox/oy to whole pixels while W/H remain fractional.
    const widthRelationTolerance = minimapDraw ? Math.max(1e-6, Math.abs(minimapDraw.W) * 1e-9) : 0;
    const heightRelationTolerance = minimapDraw ? Math.max(1e-6, Math.abs(minimapDraw.H) * 1e-9) : 0;
    const minimapSemanticPass = !!minimapCache && !!minimapPanel && !!minimapDraw && !!minimapMap && !!minimapPixels &&
      minimapMap.w === 40 && minimapMap.h === 20 &&
      [minimapPanel.x, minimapPanel.y, minimapPanel.w, minimapPanel.h, minimapDraw.ox, minimapDraw.oy, minimapDraw.W, minimapDraw.H, minimapDraw.cell, minimapDraw.scale].every(finite) &&
      minimapPanel.w > 0 && minimapPanel.h > 0 && minimapDraw.W > 0 && minimapDraw.H > 0 && minimapDraw.cell > 0 && minimapDraw.scale > 0 &&
      minimapDraw.ox >= minimapPanel.x - containmentTolerance && minimapDraw.oy >= minimapPanel.y - containmentTolerance &&
      minimapDraw.ox + minimapDraw.W <= minimapPanel.x + minimapPanel.w + containmentTolerance &&
      minimapDraw.oy + minimapDraw.H <= minimapPanel.y + minimapPanel.h + containmentTolerance &&
      Math.abs(minimapDraw.W - minimapMap.w * minimapDraw.cell) <= widthRelationTolerance &&
      Math.abs(minimapDraw.H - minimapMap.h * minimapDraw.cell) <= heightRelationTolerance &&
      minimapPixels.width > 0 && minimapPixels.height > 0 && minimapPixels.sampleCount > 0 &&
      minimapPixels.opaqueSamples === minimapPixels.sampleCount && minimapPixels.distinctColorCount >= 3 &&
      minimapPixels.nonBackgroundSamples >= 3 && minimapPixels.dominantColorSamples < minimapPixels.sampleCount;
    check('minimap draws authored 40x20 map', minimapSemanticPass, minimap);

    const screenshotPath = path.join(run.dir, 'ordinary-authored-d1.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.evidence.screenshot = relativeDisplay(screenshotPath);
    check('minimum screenshot captured', fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 1000, { path: relativeDisplay(screenshotPath), bytes: fs.statSync(screenshotPath).size });

    const lookBefore = await page.evaluate(() => CR.player.angle);
    const lookRightTarget = normalizeAngle(lookBefore + 0.32);
    const lookedRight = await turnOrdinaryTo(page, lookRightTarget, 'ordinary look right', null, 24);
    const lookedAngle = await page.evaluate(() => CR.player.angle);
    check('look through real keyboard and update path', lookedRight.turnInputStepCount > 0 && normalizeAngle(lookedAngle - lookBefore) > 0.2, { before: lookBefore, after: lookedAngle, diagnostics: lookedRight });
    const lookedBack = await turnOrdinaryTo(page, lookBefore, 'ordinary look reverse', null, 24);
    const lookRestored = await page.evaluate(() => CR.player.angle);
    check('look can reverse through real input', lookedBack.turnInputStepCount > 0 && Math.abs(normalizeAngle(lookRestored - lookBefore)) <= TURN_QUANTUM / 2 + 1e-6, { before: lookBefore, restored: lookRestored, diagnostics: lookedBack });

    const collisionApproach = await proveSouthCollision(page);
    result.evidence.movement = { collision: collisionApproach, route: [] };
    check('movement through real keyboard and update path', collisionApproach.nonzeroStepCount > 0 && collisionApproach.totalDistance > 1, collisionApproach);
    check('building collision blocks footprint entry', collisionApproach.repeatedZeroDeltaSteps >= 12 && collisionApproach.occupiedOwnerCellsEntered === 0 && !collisionApproach.solidEntry && !collisionApproach.ownerEntry && collisionApproach.finalCanStand && collisionApproach.finalPose.y >= 8.22 && collisionApproach.finalPose.y <= 8.27 && collisionApproach.finalBoundaryDistance <= 0.27, collisionApproach);

    const southwest = await driveOrdinaryTo(page, { x: 7.5, y: 8.5, name: 'southwest-open' }, 'south to southwest open waypoint', { tolerance: 0.16 });
    const westMid = await driveOrdinaryTo(page, { x: 7.5, y: 6.5, name: 'west-mid-open' }, 'southwest to west-mid open waypoint', { tolerance: 0.16 });
    result.evidence.movement.route.push(southwest, westMid);
    const westFace = await sampleBuildingFaceOrdinarily(page, 'west', 'west-mid renderer sample');
    const westRecord = westFace.sample.matching;
    check('south to west face transition through ordinary movement', southwest.nonzeroStepCount > 0 && westMid.nonzeroStepCount > 0 && westRecord && westRecord.handled === true && westRecord.bid === 1 && westRecord.assetId === ASSET_ID && westRecord.worldFace === 'west' && westRecord.localFace === 'west' && westFace.sample.play.stateIsPlay && !westFace.sample.play.paused && !westFace.sample.play.onboardingOpen, { southwest, westMid, westFace });

    const northwest = await driveOrdinaryTo(page, { x: 7.5, y: 4.5, name: 'northwest-open' }, 'west-mid to northwest open waypoint', { tolerance: 0.16 });
    const northMid = await driveOrdinaryTo(page, { x: 11, y: 4.5, name: 'north-mid-open' }, 'northwest to north-mid open waypoint', { tolerance: 0.16 });
    result.evidence.movement.route.push(northwest, northMid);
    const northFace = await sampleBuildingFaceOrdinarily(page, 'north', 'north-mid renderer sample');
    const northRecord = northFace.sample.matching;
    check('west to north face transition through ordinary movement', northwest.nonzeroStepCount > 0 && northMid.nonzeroStepCount > 0 && northRecord && northRecord.handled === true && northRecord.bid === 1 && northRecord.assetId === ASSET_ID && northRecord.worldFace === 'north' && northRecord.localFace === 'north' && northFace.sample.play.stateIsPlay && !northFace.sample.play.paused && !northFace.sample.play.onboardingOpen, { northwest, northMid, northFace });
    check('changed faces preserve generic asset render mode without fallback', westRecord && northRecord && westRecord.bid === northRecord.bid && westRecord.assetId === northRecord.assetId && westRecord.handled && northRecord.handled && renderer.noProceduralFallbackContract && initial.registry[0].renderMode === 'importedWholeFaceAsset' && initial.registry[0].rotation === 0, { westRecord, northRecord, registry: initial.registry[0], rendererContract: renderer.noProceduralFallbackContract });
    check('actual perimeter movement rounds at least two corners', [southwest, westMid, northwest, northMid].every(step => step.nonzeroStepCount > 0 && step.totalDistance > 0 && !step.solidEntry && !step.ownerEntry), { southwest, westMid, northwest, northMid });

    const northeast = await driveOrdinaryTo(page, { x: 14.5, y: 4.5, name: 'northeast-open' }, 'north-mid to northeast open waypoint', { tolerance: 0.16 });
    const eastSouth = await driveOrdinaryTo(page, { x: 14.5, y: 8.5, name: 'east-south-open' }, 'northeast to east-south open waypoint', { tolerance: 0.16 });
    const pickupTravel = await collectPickupOrdinarily(page, { x: 16.5, y: 10.5, name: 'pickup-03-authored' }, 'ordinary route to pickup-03');
    result.evidence.movement.route.push(northeast, eastSouth, pickupTravel);
    const collected = await page.evaluate(() => ({
      pickup: { id: CR.game.pickups[3].id, taken: CR.game.pickups[3].taken, amt: CR.game.pickups[3].amt },
      cans: CR.player.cans,
      runCansCollected: CR.game.run.cansCollected,
      pose: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
    }));
    check('one pickup collected through ordinary update path', collected.pickup.id === 'pickup-03' && collected.pickup.taken === true && collected.cans >= 2 && collected.runCansCollected >= 2, { pickupTravel, collected });

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => CR.state === CR.STATE.PLAY && CR.paused === true, null, { timeout: 3000 });
    const saved = await page.evaluate((key) => {
      const value = JSON.parse(localStorage.getItem(key));
      return {
        exists: !!value,
        authoredLevelId: value && value.authoredLevelId,
        authoredLevelSchema: value && value.authoredLevelSchema,
        authoredStaticSha256: value && value.authoredStaticSha256,
        pickup03: value && value.authoredOverlay && value.authoredOverlay.pickups[3],
        playerCans: value && value.cans,
        px: value && value.px,
        py: value && value.py,
      };
    }, SAVE_KEY);
    result.evidence.saved = saved;
    check('ordinary pause path writes authored save identity', saved.exists && saved.authoredLevelId === LEVEL_ID && saved.authoredLevelSchema === LEVEL_SCHEMA && saved.authoredStaticSha256 === STATIC_SHA256 && saved.pickup03 && saved.pickup03.id === 'pickup-03' && saved.pickup03.taken === true, saved);

    await page.reload({ waitUntil: 'load', timeout: 15000 });
    await page.waitForFunction(() => window.CR && window.__authoredD1SmokeObserverReady === true, null, { timeout: 10000 });
    await page.waitForSelector('[data-action="title-continue"]', { state: 'visible', timeout: 5000 });
    const continueTitle = await page.evaluate(() => ({
      stateIsTitle: CR.state === CR.STATE.TITLE,
      hasValidSave: CR.SAVE.hasValid(),
      continueCount: document.querySelectorAll('[data-action="title-continue"]').length,
      trace: window.__authoredD1SmokeTrace.slice(),
    }));
    check('ordinary Continue offered after same-page reload', continueTitle.stateIsTitle && continueTitle.hasValidSave && continueTitle.continueCount === 1, continueTitle);
    await page.locator('[data-action="title-continue"]').click();
    await page.waitForFunction(() => CR.state === CR.STATE.PLAY && !CR.paused, null, { timeout: 10000 });

    const continued = await page.evaluate(() => {
      const g = CR.game;
      let ownerCells = 0;
      for (const row of g.buildingGrid || []) for (const cell of row || []) if (cell && cell.bid === 1) ownerCells++;
      return {
        trace: window.__authoredD1SmokeTrace.slice(),
        levelId: g.authoredLevelId,
        staticSha256: g.authoredStaticSha256,
        registryCount: Object.keys(g.buildingRegistry || {}).length,
        ownerCells,
        pickup03: g.pickups[3] && { id: g.pickups[3].id, taken: g.pickups[3].taken, amt: g.pickups[3].amt },
        playerCans: CR.player.cans,
        pose: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
        runtimeErrors: (window.__crRuntimeErrors || []).slice(),
      };
    });
    result.evidence.continued = continued;
    const installAfterIndex = continued.trace.findIndex(row => row.event === 'install:after');
    const overlayBeforeIndex = continued.trace.findIndex(row => row.event === 'overlay:before');
    const staticAtOverlay = overlayBeforeIndex >= 0 && continued.trace[overlayBeforeIndex].staticState;
    check('continue reconstructs static before mutable overlay', installAfterIndex >= 0 && overlayBeforeIndex > installAfterIndex && staticAtOverlay && staticAtOverlay.levelId === LEVEL_ID && staticAtOverlay.staticSha256 === STATIC_SHA256 && staticAtOverlay.registryIds.length === 1 && staticAtOverlay.registryIds[0] === '1' && staticAtOverlay.ownerCells === 18 && staticAtOverlay.pickup03.taken === false, continued.trace);
    check('continued static ownership exact', continued.levelId === LEVEL_ID && continued.staticSha256 === STATIC_SHA256 && continued.registryCount === 1 && continued.ownerCells === 18, continued);
    check('collected pickup progress persists', continued.pickup03 && continued.pickup03.id === 'pickup-03' && continued.pickup03.taken === true && continued.playerCans === saved.playerCans, continued);
    check('no runtime-captured errors', initial.runtimeErrors.length === 0 && continued.runtimeErrors.length === 0, { initial: initial.runtimeErrors, continued: continued.runtimeErrors });
  } catch (error) {
    result.errors.push({
      message: String(error && error.message ? error.message : error),
      stack: String(error && error.stack ? error.stack : error),
      smokeDiagnostics: error && error.smokeDiagnostics ? error.smokeDiagnostics : null,
    });
  } finally {
    if (page) {
      try { await page.close(); result.cleanup.page = true; } catch (error) { result.errors.push({ message: `page close failed: ${error.message}` }); }
    }
    if (context) {
      try { await context.close(); result.cleanup.context = true; } catch (error) { result.errors.push({ message: `context close failed: ${error.message}` }); }
    }
    if (browser) {
      try { await browser.close(); result.cleanup.browser = true; } catch (error) { result.errors.push({ message: `browser close failed: ${error.message}` }); }
    }
    if (server) {
      try {
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        result.cleanup.server = true;
      } catch (error) { result.errors.push({ message: `server close failed: ${error.message}` }); }
    }
  }

  result.observers = observed || {
    consoleErrors: [], pageErrors: [], externalRequests: [], requestFailures: [], badResponses: [],
  };
  if (result.observers.consoleErrors.length) result.errors.push({ message: 'console errors observed', values: result.observers.consoleErrors });
  if (result.observers.pageErrors.length) result.errors.push({ message: 'page errors observed', values: result.observers.pageErrors });
  if (result.observers.externalRequests.length) result.errors.push({ message: 'external requests observed', values: result.observers.externalRequests });
  if (result.observers.requestFailures.length) result.errors.push({ message: 'request failures observed', values: result.observers.requestFailures });
  if (result.observers.badResponses.length) result.errors.push({ message: 'HTTP error responses observed', values: result.observers.badResponses });
  const allAssertionsPassed = Object.values(result.assertions).length > 0 && Object.values(result.assertions).every(entry => entry.pass === true);
  result.pass = result.errors.length === 0 && allAssertionsPassed && Object.values(result.cleanup).every(Boolean);
  result.finishedAt = new Date().toISOString();
  const resultPath = path.join(run.dir, 'result.json');
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ pass: result.pass, result: relativeDisplay(resultPath), screenshot: result.evidence.screenshot || null, errors: result.errors }));
  if (!result.pass) process.exitCode = 1;
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
