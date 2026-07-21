'use strict';

/** Final candidate one-context, canonical no-query ordinary District 1 smoke. */
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

function loadChromium() {
  try { return require('playwright').chromium; }
  catch (error) { throw new Error(`Playwright dependency unavailable; run npm ci before final-artifact verification: ${error.message}`); }
}

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ARTIFACT = path.join(ROOT, 'index.html');
function defaultOutput(name) {
  return path.join(ROOT, 'test-results', 'farfield-runs', `${name}-${process.pid}-${Date.now()}.json`);
}
const DEFAULT_OUTPUT = defaultOutput('final-candidate-smoke');
const SAVE_KEY = 'cannedRun.save.v1';
const STORAGE_INIT_SENTINEL = 'snc.finalSmoke.storageInitialized';
const SCHEMA = 'snc-far-field-final-candidate-smoke-v1';
const METADATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'project-metadata.json'), 'utf8'));
const EXPECTED = Object.freeze({ buildId: METADATA.runtime.buildId, levelId: 'district-1-authored-v1', levelSchema: 'snc-authored-level-static-v1', staticSha256: '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82', bitmapSha256: 'bffb437c0c6772669233bd58124cded53fe8e32faa9b0e3c96736c4f87ec140c' });
function browserContextOptions() { return { viewport: { width: 960, height: 640 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }; }
const ROUTE_DT = 1 / 60;
const TURN_QUANTUM = 2.4 * ROUTE_DT;
const PICKUP_TARGET = Object.freeze({ id: 'pickup-03', x: 16.5, y: 10.5 });
const ROUTE = Object.freeze([
  Object.freeze({ id: 'near-building-movement', keys: Object.freeze(['w']), steps: 8, required: 'movement' }),
  Object.freeze({ id: 'near-building-move-look', keys: Object.freeze(['w', 'e']), steps: 6, required: 'move+LOOK' }),
  Object.freeze({ id: 'face-open-area', keys: Object.freeze(['e']), steps: 33, required: 'turn' }),
  Object.freeze({ id: 'open-straight', keys: Object.freeze(['w']), steps: 55, required: 'movement' }),
  Object.freeze({ id: 'open-move-look', keys: Object.freeze(['w', 'q']), steps: 6, required: 'move+LOOK' }),
  Object.freeze({ id: 'open-turn-in-place', keys: Object.freeze(['e']), steps: 6, required: 'turn' }),
  Object.freeze({ id: 'collect-authored-can', keys: Object.freeze(['q', 'e', 'w']), maxTurnSteps: 180, maxDriveSteps: 160, target: PICKUP_TARGET, tolerance: 0.18, required: 'pickup' }),
]);
function arg(name) { const prefix = `--${name}=`; const found = process.argv.slice(2).find(value => value.startsWith(prefix)); return found ? found.slice(prefix.length) : null; }
function stable(value) { if (Array.isArray(value)) return value.map(stable); if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])); return value; }
function hashJson(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function emptyObservers() { return { consoleErrors: [], pageErrors: [], externalRequests: [], requestFailures: [], badResponses: [] }; }
function observerErrors(observed) { return Object.entries(observed).flatMap(([kind, rows]) => rows.map(value => ({ kind, value }))); }
function assertFinite(value, label = 'root') { if (typeof value === 'number') assert(Number.isFinite(value), `${label} must be finite`); else if (Array.isArray(value)) value.forEach((item, i) => assertFinite(item, `${label}[${i}]`)); else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => assertFinite(item, `${label}.${key}`)); }
function validateEvidence(value) {
  assert(value && typeof value === 'object', 'evidence object required');
  const required = ['actions', 'authored', 'continued', 'fixedStep', 'modes', 'pauseResume', 'save'];
  assert.deepStrictEqual(Object.keys(value).sort(), required.sort(), 'smoke evidence schema mismatch');
  assert.deepStrictEqual(value.modes, { buildId: EXPECTED.buildId, ffangle: 'interp', ffproj: 'subpixel', ffres: '400', height: 250, width: 400 });
  assert.strictEqual(value.authored.levelId, EXPECTED.levelId);
  assert.strictEqual(value.authored.staticSha256, EXPECTED.staticSha256);
  assert.strictEqual(value.authored.bitmapSha256, EXPECTED.bitmapSha256);
  assert.strictEqual(value.fixedStep.stepDt, 1 / 60);
  assert.strictEqual(value.fixedStep.droppedFrames, 0);
  assert.strictEqual(value.actions.length, ROUTE.length);
  assert(value.actions.every((row, index) => row.id === ROUTE[index].id && (ROUTE[index].steps == null ? row.steps > 0 && row.steps <= ROUTE[index].maxTurnSteps + ROUTE[index].maxDriveSteps : row.steps === ROUTE[index].steps)), 'route action/step bounds mismatch');
  assert(value.actions.some(row => row.distance > 0), 'ordinary route must move');
  assert(value.actions.some(row => Math.abs(row.angleDelta) > 0), 'ordinary route must LOOK/turn');
  assert(value.actions.every((row, index) => ROUTE[index].required !== 'move+LOOK' || (row.distance > 0 && Math.abs(row.angleDelta) > 0)), 'move+LOOK segment must move and turn');
  assert(value.actions.every((row, index) => ROUTE[index].required !== 'movement' || row.distance > 0), 'movement segment must move');
  assert(value.actions.every((row, index) => ROUTE[index].required !== 'turn' || Math.abs(row.angleDelta) > 0), 'turn segment must turn');
  const pickupAction = value.actions.find(row => row.id === 'collect-authored-can');
  assert(pickupAction && pickupAction.pickup03Taken === true && pickupAction.distance > 0 && pickupAction.finalTargetDistance <= ROUTE[ROUTE.length - 1].tolerance, 'ordinary pickup targeting failed');
  assert(value.save.exists && value.save.authoredLevelId === EXPECTED.levelId && value.save.staticSha256 === EXPECTED.staticSha256, 'authored save identity mismatch');
  assert(value.continued.reconstructionPass && value.continued.levelId === EXPECTED.levelId && value.continued.staticSha256 === EXPECTED.staticSha256 && value.continued.stateIsPlay && value.continued.paused === false, 'continue reconstruction failed');
  assert(value.pauseResume.pauseInput === 'keyboard' && value.pauseResume.paused === true && value.pauseResume.resumed === true, 'ordinary keyboard pause/resume failed');
  assertFinite(value);
  return value;
}
function compareSavedToContinued(save, continued) {
  const mismatches = [];
  if (save.authoredLevelId !== continued.levelId) mismatches.push('levelId');
  if (save.staticSha256 !== continued.staticSha256) mismatches.push('staticSha256');
  if (save.playerCans !== continued.playerCans) mismatches.push('playerCans');
  if (save.pickup03Taken !== continued.pickup03Taken) mismatches.push('pickup03Taken');
  return { pass: mismatches.length === 0, mismatches };
}
function fixtureEvidence(overrides = {}) {
  const save = { exists: true, authoredLevelId: EXPECTED.levelId, staticSha256: EXPECTED.staticSha256, playerCans: 2, pickup03Taken: true };
  const continued = { reconstructionPass: true, levelId: EXPECTED.levelId, staticSha256: EXPECTED.staticSha256, playerCans: 2, pickup03Taken: true, stateIsPlay: true, paused: false, ownerCells: 18, registryIds: ['1'] };
  return Object.assign({
    modes: { buildId: EXPECTED.buildId, ffres: '400', ffangle: 'interp', ffproj: 'subpixel', width: 400, height: 250 },
    authored: { levelId: EXPECTED.levelId, levelSchema: EXPECTED.levelSchema, staticSha256: EXPECTED.staticSha256, bitmapSha256: EXPECTED.bitmapSha256, ownerCells: 18, registryIds: ['1'] },
    fixedStep: { stepDt: 1 / 60, droppedFrames: 0, accumulator: 0 },
    actions: ROUTE.map((row, index) => ({ id: row.id, steps: row.steps || 12, distance: row.keys.includes('w') ? 0.2 + index : 0, angleDelta: row.keys.includes('q') || row.keys.includes('e') ? 0.04 * (row.steps || 2) : 0, collisionBlockedSteps: index === 0 ? 2 : 0, ...(row.required === 'pickup' ? { pickup03Taken: true, finalTargetDistance: 0.1, target: row.target } : {}) })),
    pauseResume: { pauseInput: 'keyboard', paused: true, resumed: true },
    save, continued,
  }, overrides);
}
function envelope({ evidence = null, observers = emptyObservers(), errors = [] } = {}) {
  const observed = observerErrors(observers);
  let schemaPass = false;
  try { if (evidence) { validateEvidence(evidence); schemaPass = true; } } catch (error) { errors = errors.concat({ message: error.message, category: 'schema' }); }
  const reconstruction = evidence ? compareSavedToContinued(evidence.save, evidence.continued) : null;
  return { schema: SCHEMA, generatedAt: new Date().toISOString(), pass: schemaPass && reconstruction.pass && errors.length === 0 && observed.length === 0, process: { browserLaunches: 1, contexts: 1, pages: 1, viewport: { width: 960, height: 640 }, dpr: 1 }, route: { canonicalNoQuery: true, district: 1, ordinaryInput: true, fixture: false, teleport: false, steps: ROUTE }, evidence, reconstruction, observers, errors: errors.concat(observed) };
}
function selfTest() {
  assert.deepStrictEqual(browserContextOptions(), { viewport: { width: 960, height: 640 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, 'ordinary title startup requires the mobile/touch context while preserving viewport and DPR');
  assert.strictEqual(ROUTE.length, 7);
  assert.deepStrictEqual([...new Set(ROUTE.map(row => row.required))].sort(), ['move+LOOK', 'movement', 'pickup', 'turn'].sort());
  assert.deepStrictEqual(PICKUP_TARGET, { id: 'pickup-03', x: 16.5, y: 10.5 }, 'authored pickup target drifted');
  for (const row of ROUTE) {
    if (row.steps != null) assert(Number.isInteger(row.steps) && row.steps > 0 && row.steps <= 120, `${row.id} fixed-step bound invalid`);
    else {
      assert(Number.isInteger(row.maxTurnSteps) && row.maxTurnSteps > 0 && row.maxTurnSteps <= 180, `${row.id} turn bound invalid`);
      assert(Number.isInteger(row.maxDriveSteps) && row.maxDriveSteps > 0 && row.maxDriveSteps <= 160, `${row.id} drive bound invalid`);
      assert(row.target && Number.isFinite(row.target.x) && Number.isFinite(row.target.y) && row.target.x >= 0 && row.target.x < 40 && row.target.y >= 0 && row.target.y < 20, `${row.id} target invalid`);
      assert(row.tolerance > 0 && row.tolerance <= 0.25, `${row.id} tolerance invalid`);
    }
  }
  const routeSource = [String(runRoute), String(stepOrdinary), String(collectAuthoredPickup)].join('\n');
  assert(!routeSource.includes('player.' + 'x=') && !routeSource.includes('player.' + 'x ='), 'route must not write player x');
  assert(!routeSource.includes('player.' + 'y=') && !routeSource.includes('player.' + 'y ='), 'route must not write player y');
  assert(!routeSource.includes('.taken' + ' =') && !routeSource.includes('.taken' + '='), 'route must not write pickup state');
  assert(routeSource.includes('page.keyboard.down') && routeSource.includes('CR.update'), 'route must use real keyboard plus CR.update');
  const pauseSource = String(pauseResume);
  assert(pauseSource.includes("page.keyboard.press('Escape')"), 'required pause must use real Playwright keyboard input');
  assert(!pauseSource.includes('dispatchEvent'), 'required pause must not synthesize a DOM click');
  const good = fixtureEvidence(); validateEvidence(good);
  assert(compareSavedToContinued(good.save, good.continued).pass);
  assert(envelope({ evidence: good }).pass, 'valid fixture envelope must pass');
  const badContinue = Object.assign({}, good.continued, { playerCans: 1 });
  assert.deepStrictEqual(compareSavedToContinued(good.save, badContinue).mismatches, ['playerCans']);
  const observed = emptyObservers(); observed.consoleErrors.push('fixture console error');
  assert.strictEqual(envelope({ evidence: good, observers: observed }).pass, false, 'observer error must fail closed');
  assert.strictEqual(envelope({ evidence: Object.assign({}, good, { fixedStep: Object.assign({}, good.fixedStep, { droppedFrames: 1 }) }) }).pass, false, 'drop must fail schema');
  assert.throws(() => assertFinite({ bad: NaN }), /finite/);
  const fakeStorage = () => {
    const values = new Map();
    return { clearCount: 0, clear() { this.clearCount++; values.clear(); }, getItem(key) { return values.has(key) ? values.get(key) : null; }, setItem(key, value) { values.set(key, String(value)); } };
  };
  const originalRandom = Math.random;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  try {
    globalThis.localStorage = fakeStorage(); globalThis.sessionStorage = fakeStorage();
    localStorage.setItem('stale', 'value'); sessionStorage.setItem('stale', 'value');
    seededInit(STORAGE_INIT_SENTINEL);
    assert.strictEqual(localStorage.getItem('stale'), null, 'first initialization must clear local storage');
    assert.strictEqual(sessionStorage.getItem('stale'), null, 'first initialization must clear session storage');
    localStorage.setItem(SAVE_KEY, 'saved'); seededInit(STORAGE_INIT_SENTINEL);
    assert.strictEqual(localStorage.getItem(SAVE_KEY), 'saved', 'reload initialization must preserve the save');
    assert.strictEqual(localStorage.clearCount, 1, 'local storage must clear exactly once');
    assert.strictEqual(sessionStorage.clearCount, 1, 'session storage must clear exactly once');
  } finally {
    Math.random = originalRandom;
    if (originalLocalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalLocalStorage;
    if (originalSessionStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = originalSessionStorage;
  }
  console.log('far_field_final_candidate_smoke: SELF-TEST PASS (route, schema, comparator, error paths, once-only storage clearing)');
}
function attachObservers(page, origin) {
  const out = emptyObservers();
  page.on('console', message => { if (message.type() === 'error') out.consoleErrors.push(message.text()); });
  page.on('pageerror', error => out.pageErrors.push(String(error.stack || error)));
  page.on('request', request => { const url = request.url(); if (/^https?:/i.test(url) && new URL(url).origin !== origin) out.externalRequests.push(url); });
  page.on('requestfailed', request => out.requestFailures.push({ url: request.url(), failure: request.failure() }));
  page.on('response', response => { if (response.status() >= 400) out.badResponses.push({ url: response.url(), status: response.status() }); });
  return out;
}
async function startServer(artifact) {
  const bytes = fs.readFileSync(artifact);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    if (url.pathname !== '/') { response.writeHead(404); response.end('not found'); return; }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(bytes);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/`, bytes };
}
function seededInit(storageInitSentinel) { let state = 0x51c0ffee; Math.random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 0x100000000; }; if (sessionStorage.getItem(storageInitSentinel) !== '1') { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem(storageInitSentinel, '1'); } }
async function startOrdinary(page, url) {
  await page.goto(url, { waitUntil: 'load', timeout: 15000 });
  await page.waitForFunction(() => window.CR && document.querySelector('[data-action="title-start"]'), null, { timeout: 10000 });
  await page.locator('[data-action="title-start"]').click();
  await page.waitForFunction(() => CR.state === CR.STATE.PLAY, null, { timeout: 10000 });
  if (await page.locator('#cronboard.show').count()) await page.locator('#cronboardok').click();
  await page.waitForFunction(() => CR.state === CR.STATE.PLAY && !CR.paused && !CR.onboardingOpen, null, { timeout: 5000 });
}
async function stabilizeDeterministicRoute(page) {
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    CR.crResetFixedStepSimulation('final-smoke-route');
    crResetRenderAngleHistory('final-smoke-route');
  });
}
function normalizeAngle(value) {
  let angle = value;
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}
async function clearRouteKeys(page) {
  for (const key of ['q', 'e', 'w']) await page.keyboard.up(key);
}
async function stepOrdinary(page, target = null) {
  return page.evaluate(({ dt, targetPoint }) => {
    const before = { x: CR.player.x, y: CR.player.y, angle: CR.player.angle };
    CR.update(dt);
    const pose = { x: CR.player.x, y: CR.player.y, angle: CR.player.angle };
    const pickup = CR.game.pickups[3];
    return {
      before,
      pose,
      distance: Math.hypot(pose.x - before.x, pose.y - before.y),
      targetDistance: targetPoint ? Math.hypot(pose.x - targetPoint.x, pose.y - targetPoint.y) : null,
      stateIsPlay: CR.state === CR.STATE.PLAY,
      paused: CR.paused,
      pickup03: pickup ? { id: pickup.id, x: pickup.x, y: pickup.y, taken: !!pickup.taken } : null,
    };
  }, { dt: ROUTE_DT, targetPoint: target });
}
function routeFailure(message, diagnostics) {
  const error = new Error(`${message}: ${JSON.stringify(diagnostics)}`);
  error.routeDiagnostics = diagnostics;
  throw error;
}
async function collectAuthoredPickup(page, segment, completedActions) {
  const diagnostics = {
    id: segment.id,
    target: segment.target,
    tolerance: segment.tolerance,
    dt: ROUTE_DT,
    maxTurnSteps: segment.maxTurnSteps,
    maxDriveSteps: segment.maxDriveSteps,
    startPose: null,
    finalPose: null,
    desiredAngle: null,
    turnSteps: 0,
    driveSteps: 0,
    nonzeroDriveSteps: 0,
    blockedDriveSteps: 0,
    totalDistance: 0,
    minTargetDistance: null,
    finalTargetDistance: null,
    pickup03Taken: false,
    completedActions,
    lastAction: 'created',
  };
  try {
    await clearRouteKeys(page);
    const authored = await page.evaluate(() => {
      const pickup = CR.game.pickups[3];
      return pickup ? { id: pickup.id, x: pickup.x, y: pickup.y, taken: !!pickup.taken } : null;
    });
    if (!authored || authored.id !== segment.target.id || authored.x !== segment.target.x || authored.y !== segment.target.y || authored.taken) {
      diagnostics.authoredPickup = authored;
      routeFailure('authored pickup-03 target mismatch', diagnostics);
    }
    const start = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }));
    diagnostics.startPose = start;
    diagnostics.desiredAngle = normalizeAngle(Math.atan2(segment.target.y - start.y, segment.target.x - start.x));
    for (let i = 0; i < segment.maxTurnSteps; i++) {
      const pose = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }));
      const error = normalizeAngle(diagnostics.desiredAngle - pose.angle);
      if (Math.abs(error) <= TURN_QUANTUM / 2 + 1e-6) break;
      const key = error < 0 ? 'q' : 'e';
      await page.keyboard.down(key);
      let snapshot;
      try { snapshot = await stepOrdinary(page, segment.target); }
      finally { await page.keyboard.up(key); }
      diagnostics.turnSteps++;
      diagnostics.finalPose = snapshot.pose;
      diagnostics.finalTargetDistance = snapshot.targetDistance;
      diagnostics.lastAction = `turn:${key}`;
      if (!snapshot.stateIsPlay || snapshot.paused) routeFailure('pickup turn left ordinary PLAY state', diagnostics);
      if (i === segment.maxTurnSteps - 1) routeFailure('pickup turn exceeded bounded steps', diagnostics);
    }
    await page.keyboard.down('w');
    for (let i = 0; i < segment.maxDriveSteps; i++) {
      const snapshot = await stepOrdinary(page, segment.target);
      diagnostics.driveSteps++;
      diagnostics.finalPose = snapshot.pose;
      diagnostics.finalTargetDistance = snapshot.targetDistance;
      diagnostics.minTargetDistance = diagnostics.minTargetDistance == null ? snapshot.targetDistance : Math.min(diagnostics.minTargetDistance, snapshot.targetDistance);
      diagnostics.totalDistance += snapshot.distance;
      diagnostics.pickup03Taken = !!(snapshot.pickup03 && snapshot.pickup03.taken);
      if (snapshot.distance > 1e-9) diagnostics.nonzeroDriveSteps++;
      else diagnostics.blockedDriveSteps++;
      diagnostics.lastAction = 'drive:w';
      if (!snapshot.stateIsPlay || snapshot.paused) routeFailure('pickup drive left ordinary PLAY state', diagnostics);
      if (snapshot.targetDistance <= segment.tolerance) {
        if (!diagnostics.pickup03Taken) routeFailure('reached authored pickup target without normal update collection', diagnostics);
        if (diagnostics.nonzeroDriveSteps === 0 || diagnostics.totalDistance <= 0) routeFailure('pickup route reached target without ordinary movement', diagnostics);
        diagnostics.lastAction = 'pickup-collected';
        return {
          id: segment.id,
          steps: diagnostics.turnSteps + diagnostics.driveSteps,
          distance: diagnostics.totalDistance,
          angleDelta: normalizeAngle(diagnostics.finalPose.angle - diagnostics.startPose.angle),
          collisionBlockedSteps: diagnostics.blockedDriveSteps,
          target: segment.target,
          finalTargetDistance: diagnostics.finalTargetDistance,
          pickup03Taken: true,
          diagnostics,
        };
      }
      if (diagnostics.blockedDriveSteps >= 12) routeFailure('pickup drive blocked before target', diagnostics);
    }
    routeFailure('pickup drive exceeded bounded steps', diagnostics);
  } catch (error) {
    if (!error.routeDiagnostics) error.routeDiagnostics = diagnostics;
    throw error;
  } finally {
    await clearRouteKeys(page);
  }
}
async function runRoute(page) {
  await stabilizeDeterministicRoute(page);
  const results = [];
  for (const segment of ROUTE) {
    if (segment.target) {
      results.push(await collectAuthoredPickup(page, segment, results.slice()));
      continue;
    }
    const start = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }));
    for (const key of segment.keys) await page.keyboard.down(key);
    let collisionBlockedSteps = 0;
    let totalDistance = 0;
    try {
      for (let step = 0; step < segment.steps; step++) {
        const snapshot = await stepOrdinary(page);
        totalDistance += snapshot.distance;
        if (segment.keys.includes('w') && snapshot.distance < 1e-9) collisionBlockedSteps++;
        if (!snapshot.stateIsPlay || snapshot.paused) routeFailure(`${segment.id} left ordinary PLAY state`, { segment, step, snapshot, completedActions: results });
      }
    } finally {
      for (const key of segment.keys) await page.keyboard.up(key);
    }
    const end = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }));
    results.push({ id: segment.id, steps: segment.steps, distance: totalDistance, angleDelta: normalizeAngle(end.angle - start.angle), collisionBlockedSteps, startPose: start, finalPose: end });
  }
  return results;
}
async function runtimeSnapshot(page) {
  return page.evaluate(expected => {
    const profile = crGetRenderProfile(); let ownerCells = 0;
    for (const row of CR.game.buildingGrid || []) for (const cell of row || []) if (cell && cell.bid === 1) ownerCells++;
    const asset = lookupBitmapBuildingAsset('custom_next_001');
    const fixed = CR.crGetFixedStepState();
    return {
      modes: { buildId: String(window.BUILD_ID), ffres: String(profile.id), ffangle: crGetSelectedRenderAngleMode(), ffproj: crResolveFarFieldProjectionMode(), width: RW, height: RH },
      authored: { levelId: CR.game.authoredLevelId, levelSchema: CR.game.authoredLevelSchema, staticSha256: CR.game.authoredStaticSha256, bitmapSha256: asset && asset.atlas && asset.atlas.sha256, ownerCells, registryIds: Object.keys(CR.game.buildingRegistry || {}) },
      fixedStep: { stepDt: fixed.stepDt, droppedFrames: fixed.droppedFrames, accumulator: fixed.accumulator },
      player: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
      angleStats: crGetRenderAngleStats(), pickup03Taken: !!(CR.game.pickups[3] && CR.game.pickups[3].taken), playerCans: CR.player.cans,
      expected
    };
  }, EXPECTED);
}
async function pauseResume(page) {
  await page.keyboard.press('Escape'); await page.waitForFunction(() => CR.paused === true);
  const paused = await page.evaluate(() => CR.paused === true);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => CR.paused === false);
  const resumed = await page.evaluate(() => CR.paused === false && CR.state === CR.STATE.PLAY);
  return { pauseInput: 'keyboard', paused, resumed };
}
async function saveAndContinue(page, url) {
  await page.keyboard.press('Escape'); await page.waitForFunction(() => CR.paused === true);
  const save = await page.evaluate(key => { const row = JSON.parse(localStorage.getItem(key)); return { exists: !!row, authoredLevelId: row && row.authoredLevelId, staticSha256: row && row.authoredStaticSha256, playerCans: row && row.cans, pickup03Taken: !!(row && row.authoredOverlay && row.authoredOverlay.pickups[3] && row.authoredOverlay.pickups[3].taken) }; }, SAVE_KEY);
  await page.reload({ waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('[data-action="title-continue"]', { state: 'visible', timeout: 10000 });
  await page.locator('[data-action="title-continue"]').click(); await page.waitForFunction(() => CR.state === CR.STATE.PLAY && !CR.paused, null, { timeout: 10000 });
  const continued = await page.evaluate(() => { let ownerCells = 0; for (const row of CR.game.buildingGrid || []) for (const cell of row || []) if (cell && cell.bid === 1) ownerCells++; const stateIsPlay = CR.state === CR.STATE.PLAY; const paused = CR.paused; return { reconstructionPass: CR.game.authoredLevelId === 'district-1-authored-v1' && CR.game.authoredStaticSha256 === '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82' && stateIsPlay && !paused, levelId: CR.game.authoredLevelId, staticSha256: CR.game.authoredStaticSha256, playerCans: CR.player.cans, pickup03Taken: !!(CR.game.pickups[3] && CR.game.pickups[3].taken), stateIsPlay, paused, ownerCells, registryIds: Object.keys(CR.game.buildingRegistry || {}) }; });
  assert.strictEqual(new URL(page.url()).search, '', `continue route acquired query: ${page.url()}`);
  return { save, continued };
}
async function run() {
  const output = path.resolve(arg('output') || process.env.CR_FARFIELD_SMOKE_OUTPUT || DEFAULT_OUTPUT);
  const artifact = path.resolve(arg('artifact') || DEFAULT_ARTIFACT); const suppliedUrl = arg('url');
  let local = null, browser = null, context = null; let report = envelope();
  try {
    let url;
    if (suppliedUrl) { url = new URL(suppliedUrl).href; assert.strictEqual(new URL(url).search, '', '--url must be canonical and query-free'); }
    else { local = await startServer(artifact); url = local.url; }
    const chromium = loadChromium();
    browser = await chromium.launch({ headless: true }); context = await browser.newContext(browserContextOptions());
    const page = await context.newPage(); const observers = attachObservers(page, new URL(url).origin); await page.addInitScript(seededInit, STORAGE_INIT_SENTINEL);
    await startOrdinary(page, url); const initial = await runtimeSnapshot(page); const actions = await runRoute(page);
    assert(initial.pickup03Taken === false, 'pickup-03 must begin uncollected');
    const afterRoute = await runtimeSnapshot(page); assert(afterRoute.pickup03Taken === true, `ordinary route did not collect pickup-03: ${JSON.stringify({ actions, afterRoute })}`);
    const pause = await pauseResume(page); const persisted = await saveAndContinue(page, url); const final = await runtimeSnapshot(page);
    const evidence = { modes: final.modes, authored: final.authored, fixedStep: final.fixedStep, actions, pauseResume: pause, save: persisted.save, continued: persisted.continued };
    report = envelope({ evidence, observers });
    report.target = { artifact: suppliedUrl ? null : artifact, url: suppliedUrl || null, artifactBytes: local ? local.bytes.length : null, artifactSha256: local ? crypto.createHash('sha256').update(local.bytes).digest('hex') : null, evidenceSha256: hashJson(evidence) };
  } catch (error) { report.errors.push({ message: String(error.message || error), stack: String(error.stack || error), routeDiagnostics: error.routeDiagnostics || null }); report.pass = false; }
  finally {
    if (context) await context.close().catch(error => report.errors.push({ message: `context close: ${error.message}` }));
    if (browser) await browser.close().catch(error => report.errors.push({ message: `browser close: ${error.message}` }));
    if (local) await new Promise(resolve => local.server.close(resolve));
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ pass: report.pass, output, errors: report.errors, reconstruction: report.reconstruction })); if (!report.pass) process.exitCode = 1;
}

if (require.main === module) { if (process.argv.includes('--self-test')) selfTest(); else run().catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { ROUTE, SCHEMA, validateEvidence, compareSavedToContinued, envelope };
