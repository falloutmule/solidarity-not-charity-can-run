'use strict';

/** Final-artifact canonical/no-query versus explicit Option 2 browser verifier. */
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
const DEFAULT_OUTPUT = defaultOutput('default-equivalence');
const EXPECTED = Object.freeze({ buildId: 'farfieldsmooth1', levelId: 'district-1-authored-v1', staticSha256: '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82', bitmapSha256: 'bffb437c0c6772669233bd58124cded53fe8e32faa9b0e3c96736c4f87ec140c' });
const VIEWPORT = Object.freeze({ width: 960, height: 640 });
const DPR = 1;
const SEED = 0x51c0ffee;
const ROUTE = Object.freeze([
  Object.freeze({ id: 'near-building-forward', keys: Object.freeze(['w']), steps: 18 }),
  Object.freeze({ id: 'near-building-move-look', keys: Object.freeze(['w', 'e']), steps: 12 }),
  Object.freeze({ id: 'open-straight', keys: Object.freeze(['w']), steps: 20 }),
  Object.freeze({ id: 'open-move-look', keys: Object.freeze(['w', 'q']), steps: 12 }),
  Object.freeze({ id: 'turn-in-place', keys: Object.freeze(['e']), steps: 9 }),
]);
const SCHEMA = 'snc-far-field-default-equivalence-v1';

function browserContextOptions() {
  return { viewport: VIEWPORT, deviceScaleFactor: DPR, isMobile: true, hasTouch: true };
}
function capturePayload(movement) { return { expected: EXPECTED, movement }; }

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find(value => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
function hashJson(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function ensureFinite(value, label = 'root') {
  if (typeof value === 'number') assert(Number.isFinite(value), `${label} must be finite`);
  else if (Array.isArray(value)) value.forEach((item, index) => ensureFinite(item, `${label}[${index}]`));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => ensureFinite(item, `${label}.${key}`));
}
function validateCapture(value) {
  assert(value && typeof value === 'object', 'capture must be an object');
  assert.deepStrictEqual(Object.keys(value).sort(), ['angle', 'authored', 'fixedStep', 'gameplay', 'modes', 'movement', 'projection', 'scene', 'zbuffer'].sort());
  assert.deepStrictEqual(value.modes, { buildId: EXPECTED.buildId, ffangle: 'interp', ffproj: 'subpixel', ffres: '400', height: 250, width: 400 });
  assert.strictEqual(value.authored.levelId, EXPECTED.levelId);
  assert.strictEqual(value.authored.staticSha256, EXPECTED.staticSha256);
  assert.strictEqual(value.fixedStep.stepDt, 1 / 60);
  assert.strictEqual(value.fixedStep.droppedFrames, 0);
  for (const field of ['pixelSha256', 'sceneSha256']) assert(/^[0-9a-f]{64}$/.test(value.scene[field]), `scene.${field} must be sha256`);
  assert(/^[0-9a-f]{64}$/.test(value.zbuffer.sha256), 'zbuffer.sha256 must be sha256');
  ensureFinite(value);
  return value;
}
function compareCaptures(canonical, explicit) {
  validateCapture(canonical); validateCapture(explicit);
  const fields = ['modes', 'authored', 'fixedStep', 'gameplay', 'movement', 'angle', 'projection', 'scene', 'zbuffer'];
  const mismatches = [];
  for (const field of fields) {
    const a = JSON.stringify(stable(canonical[field]));
    const b = JSON.stringify(stable(explicit[field]));
    if (a !== b) mismatches.push({ field, canonical: canonical[field], explicit: explicit[field] });
  }
  return { pass: mismatches.length === 0, comparedFields: fields, canonicalHash: hashJson(canonical), explicitHash: hashJson(explicit), mismatches };
}
function fixtureCapture(overrides = {}) {
  const base = {
    modes: { buildId: EXPECTED.buildId, ffres: '400', ffangle: 'interp', ffproj: 'subpixel', width: 400, height: 250 },
    authored: { levelId: EXPECTED.levelId, staticSha256: EXPECTED.staticSha256, registryIds: ['1'], ownerCells: 18 },
    fixedStep: { stepDt: 1 / 60, accumulator: 0, droppedFrames: 0, lastFrameDt: 1 / 60 },
    gameplay: { district: 1, x: 11.5, y: 10.25, angle: -1.2, cans: 0, pickupTaken: false, state: 'PLAY', paused: false },
    movement: { route: ROUTE.map(row => ({ id: row.id, steps: row.steps, distance: row.steps / 20 })), collisionBlockedSteps: 3 },
    angle: { mode: 'interp', resetCount: 2, authoritativeChanges: 3, interpolatedSamples: 71 },
    projection: { mode: 'subpixel', projectedSpriteCount: 20, distantSpriteCount: 4, legacySnapCount: 0, subpixelMovementCount: 3, repeatedProjectedXFramesWhileMoving: 0 },
    scene: { pixelSha256: '1'.repeat(64), sceneSha256: '2'.repeat(64), sampleBytes: 4000 },
    zbuffer: { sha256: '3'.repeat(64), length: 400, finiteCount: 400 },
  };
  return Object.assign(base, overrides);
}
function selfTest() {
  assert.deepStrictEqual(browserContextOptions(), { viewport: VIEWPORT, deviceScaleFactor: DPR, isMobile: true, hasTouch: true }, 'ordinary title startup requires the mobile/touch context while preserving viewport and DPR');
  const movement = { projectionBaseline: { projectedSpriteCount: 1 }, angleBaseline: { resetCount: 2 } };
  assert.deepStrictEqual(capturePayload(movement), { expected: EXPECTED, movement }, 'page capture must explicitly serialize movement into the browser context');
  assert.strictEqual(ROUTE.length, 5);
  assert(ROUTE.every(segment => segment.steps > 0 && segment.keys.length > 0));
  assert.strictEqual(ROUTE.reduce((sum, segment) => sum + segment.steps, 0), 71);
  const a = fixtureCapture();
  assert(compareCaptures(a, JSON.parse(JSON.stringify(a))).pass, 'equal fixture must compare equal');
  const changed = fixtureCapture({ gameplay: Object.assign({}, a.gameplay, { x: a.gameplay.x + 0.05 }) });
  const mismatch = compareCaptures(a, changed);
  assert.strictEqual(mismatch.pass, false);
  assert.deepStrictEqual(mismatch.mismatches.map(row => row.field), ['gameplay']);
  assert.throws(() => validateCapture(Object.assign({}, a, { scene: { pixelSha256: 'bad', sceneSha256: '2'.repeat(64), sampleBytes: 1 } })), /sha256/);
  assert.throws(() => ensureFinite({ broken: Infinity }), /finite/);
  const failedEnvelope = buildEnvelope({ canonical: a, explicit: changed, observers: { canonical: emptyObservers(), explicit: emptyObservers() }, comparison: mismatch });
  assert.strictEqual(failedEnvelope.pass, false, 'mismatch envelope must fail closed');
  console.log('far_field_default_equivalence_verify: SELF-TEST PASS (route, schema, comparator, error paths)');
}
function emptyObservers() { return { consoleErrors: [], pageErrors: [], externalRequests: [], requestFailures: [], badResponses: [] }; }
function observerErrors(observers) { return Object.entries(observers).flatMap(([side, sets]) => Object.entries(sets).flatMap(([kind, rows]) => rows.map(value => ({ side, kind, value })))); }
function buildEnvelope({ canonical = null, explicit = null, observers = { canonical: emptyObservers(), explicit: emptyObservers() }, comparison = null, errors = [] } = {}) {
  const observedErrors = observerErrors(observers);
  return { schema: SCHEMA, generatedAt: new Date().toISOString(), pass: !!comparison && comparison.pass && errors.length === 0 && observedErrors.length === 0, process: { browserLaunches: 1, contexts: 2, pages: 2, seed: SEED, viewport: VIEWPORT, dpr: DPR }, routes: { canonical: 'no-query', explicit: 'ffres=400&ffangle=interp&ffproj=subpixel', ordinaryAuthoredD1: true, fixture: false, teleport: false }, canonical, explicit, comparison, observers, errors: errors.concat(observedErrors) };
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
function seededInit(seed) {
  let state = seed >>> 0;
  Math.random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 0x100000000; };
  localStorage.clear(); sessionStorage.clear();
}
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
  await page.waitForTimeout(50); // drain the callback scheduled before RAF was closed
  await page.evaluate(() => {
    CR.crResetFixedStepSimulation('default-equivalence-route');
    crResetRenderAngleHistory('default-equivalence-route');
  });
}
async function executeRoute(page) {
  const baseline = await page.evaluate(() => ({
    projectionBaseline: crGetProjectionQuantizationStats(), angleBaseline: crGetRenderAngleStats(),
    before: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
  }));
  const segments = [];
  for (const segment of ROUTE) {
    const start = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }));
    for (const key of segment.keys) await page.keyboard.down(key);
    try {
      await page.evaluate(async steps => {
        for (let step = 0; step < steps; step++) { CR.update(1 / 60); if ((step % 8) === 0) await new Promise(resolve => setTimeout(resolve, 0)); }
      }, segment.steps);
    } finally {
      for (const key of segment.keys) await page.keyboard.up(key);
    }
    const end = await page.evaluate(() => ({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }));
    segments.push({ id: segment.id, steps: segment.steps, distance: Math.hypot(end.x - start.x, end.y - start.y) });
  }
  const after = await page.evaluate(() => { drawScene({ x: CR.player.x, y: CR.player.y, angle: CR.player.angle }); return { x: CR.player.x, y: CR.player.y, angle: CR.player.angle }; });
  return { ...baseline, after, segments };
}
async function capture(page, movement) {
  const raw = await page.evaluate(({ expected, movement }) => {
    const digestBytes = bytes => Array.from(bytes); // SHA-256 is computed in Node from truthful bytes.
    const profile = crGetRenderProfile();
    const fixed = CR.crGetFixedStepState();
    const angleCurrent = crGetRenderAngleStats();
    const projectionCurrent = crGetProjectionQuantizationStats();
    const angle = Object.fromEntries(Object.entries(angleCurrent).map(([key, value]) => [key,
      typeof value === 'number' && typeof movement.angleBaseline[key] === 'number' ? value - movement.angleBaseline[key] : value]));
    const projection = Object.fromEntries(Object.entries(projectionCurrent).map(([key, value]) => [key,
      typeof value === 'number' && typeof movement.projectionBaseline[key] === 'number' ? value - movement.projectionBaseline[key] : value]));
    const pixels = bctx.getImageData(0, 0, RW, RH).data;
    const stride = Math.max(1, Math.floor(pixels.length / 16000));
    const pixelSample = new Uint8Array(Math.ceil(pixels.length / stride));
    for (let source = 0, target = 0; source < pixels.length; source += stride) pixelSample[target++] = pixels[source];
    const z = new Float64Array(zbuffer.length);
    let finiteCount = 0;
    for (let i = 0; i < zbuffer.length; i++) { z[i] = Number.isFinite(zbuffer[i]) ? zbuffer[i] : Number.MAX_VALUE; if (Number.isFinite(zbuffer[i])) finiteCount++; }
    let ownerCells = 0; for (const row of CR.game.buildingGrid || []) for (const cell of row || []) if (cell && cell.bid === 1) ownerCells++;
    return {
      capture: {
        modes: { buildId: String(window.BUILD_ID), ffres: String(profile.id), ffangle: crGetSelectedRenderAngleMode(), ffproj: crResolveFarFieldProjectionMode(), width: RW, height: RH },
        authored: { levelId: CR.game.authoredLevelId, staticSha256: CR.game.authoredStaticSha256, registryIds: Object.keys(CR.game.buildingRegistry || {}), ownerCells },
        fixedStep: { stepDt: fixed.stepDt, accumulator: fixed.accumulator, droppedFrames: fixed.droppedFrames, lastFrameDt: fixed.lastFrameDt },
        gameplay: { district: CR.game.district, x: CR.player.x, y: CR.player.y, angle: CR.player.angle, cans: CR.player.cans, pickupTaken: !!(CR.game.pickups[3] && CR.game.pickups[3].taken), state: CR.state, paused: CR.paused },
        movement: { route: movement.segments, collisionBlockedSteps: movement.segments.filter(row => row.distance === 0).length },
        angle, projection,
        scene: { pixelBytes: digestBytes(pixelSample), sampleBytes: pixelSample.length, sceneState: { pose: [CR.player.x, CR.player.y, CR.player.angle], map: [CR.game.MAP_W, CR.game.MAP_H], pickups: CR.game.pickups.map(item => !!item.taken) } },
        zbuffer: { bytes: digestBytes(new Uint8Array(z.buffer)), length: zbuffer.length, finiteCount },
      }, expected
    };
  }, capturePayload(movement));
  const value = raw.capture;
  value.scene.pixelSha256 = crypto.createHash('sha256').update(Buffer.from(value.scene.pixelBytes)).digest('hex'); delete value.scene.pixelBytes;
  value.scene.sceneSha256 = hashJson(value.scene.sceneState); delete value.scene.sceneState;
  value.zbuffer.sha256 = crypto.createHash('sha256').update(Buffer.from(value.zbuffer.bytes)).digest('hex'); delete value.zbuffer.bytes;
  return validateCapture(value);
}
async function run() {
  const output = path.resolve(arg('output') || process.env.CR_FARFIELD_EQUIVALENCE_OUTPUT || DEFAULT_OUTPUT);
  const artifact = path.resolve(arg('artifact') || DEFAULT_ARTIFACT);
  const suppliedUrl = arg('url');
  let local = null, browser = null;
  let report = buildEnvelope({ errors: [] });
  try {
    let baseUrl;
    if (suppliedUrl) { baseUrl = new URL(suppliedUrl).href; assert.strictEqual(new URL(baseUrl).search, '', '--url must identify a no-query artifact root'); }
    else { local = await startServer(artifact); baseUrl = local.url; }
    const explicitUrl = new URL(baseUrl); explicitUrl.search = 'ffres=400&ffangle=interp&ffproj=subpixel';
    const origin = new URL(baseUrl).origin;
    const chromium = loadChromium();
    browser = await chromium.launch({ headless: true });
    const contexts = await Promise.all([browser.newContext(browserContextOptions()), browser.newContext(browserContextOptions())]);
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    const observers = { canonical: attachObservers(pages[0], origin), explicit: attachObservers(pages[1], origin) };
    await Promise.all(pages.map(page => page.addInitScript(seededInit, SEED)));
    await Promise.all([startOrdinary(pages[0], baseUrl), startOrdinary(pages[1], explicitUrl.href)]);
    await Promise.all(pages.map(stabilizeDeterministicRoute));
    const movements = await Promise.all(pages.map(executeRoute));
    const [canonical, explicit] = await Promise.all([capture(pages[0], movements[0]), capture(pages[1], movements[1])]);
    const comparison = compareCaptures(canonical, explicit);
    report = buildEnvelope({ canonical, explicit, observers, comparison });
    report.target = { artifact: suppliedUrl ? null : artifact, url: suppliedUrl || null, artifactBytes: local ? local.bytes.length : null, artifactSha256: local ? crypto.createHash('sha256').update(local.bytes).digest('hex') : null };
    await Promise.all(contexts.map(context => context.close()));
  } catch (error) {
    report.errors.push({ message: String(error.message || error), stack: String(error.stack || error) }); report.pass = false;
  } finally {
    if (browser) await browser.close().catch(error => report.errors.push({ message: `browser close: ${error.message}` }));
    if (local) await new Promise(resolve => local.server.close(resolve));
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ pass: report.pass, output, mismatches: report.comparison ? report.comparison.mismatches.map(row => row.field) : null, errors: report.errors }));
  if (!report.pass) process.exitCode = 1;
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest(); else run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
module.exports = { ROUTE, SCHEMA, validateCapture, compareCaptures, buildEnvelope };
