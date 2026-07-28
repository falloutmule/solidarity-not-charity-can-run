'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'index.html');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'physical-cast-scale-review', `browser-${process.pid}.json`));
const castAssetIds = [
  'npc_volunteer_elder_cane_001', 'npc_volunteer_tote_001', 'npc_volunteer_miguel_001', 'npc_household_parent_child_001',
  'npc_civilian_backpack_youth_001', 'npc_civilian_beanie_messenger_001', 'npc_civilian_grocery_carrier_001', 'npc_household_dog_walker_001',
  'npc_unhoused_dog_companion_001', 'npc_unhoused_bicycle_001', 'npc_unhoused_cane_001', 'npc_unhoused_work_jacket_001',
  'npc_unhoused_dyed_hair_001', 'npc_unhoused_blanket_wrap_001', 'npc_unhoused_slumped_001', 'npc_unhoused_cart_001'
];
const castReviewHeights = new Map([
  ['npc_volunteer_elder_cane_001', 0.78], ['npc_volunteer_tote_001', 0.78], ['npc_volunteer_miguel_001', 0.78], ['npc_household_parent_child_001', 0.96],
  ['npc_civilian_backpack_youth_001', 0.96], ['npc_civilian_beanie_messenger_001', 0.78], ['npc_civilian_grocery_carrier_001', 0.78], ['npc_household_dog_walker_001', 0.96],
  ['npc_unhoused_dog_companion_001', 0.96], ['npc_unhoused_bicycle_001', 0.96], ['npc_unhoused_cane_001', 0.78], ['npc_unhoused_work_jacket_001', 0.78],
  ['npc_unhoused_dyed_hair_001', 0.78], ['npc_unhoused_blanket_wrap_001', 0.78], ['npc_unhoused_slumped_001', 0.68], ['npc_unhoused_cart_001', 0.96]
]);

function serve(html){
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
    server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}
const subject = (calibration, id) => calibration.subjects.find((entry) => entry.id === id);

async function main(){
  assert(output.startsWith(path.join(root, 'test-results') + path.sep), 'output remains ignored');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const result = { pass: false, checks: {}, observed: { pageErrors: [], consoleErrors: [], externalRequests: [] }, measurements: {}, errors: [] };
  let server, browser, context, page;
  try {
    ({ server, url: result.url } = await serve(fs.readFileSync(artifact, 'utf8')));
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('console', (message) => { if(message.type() === 'error') result.observed.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => result.observed.pageErrors.push(String(error.stack || error)));
    page.on('request', (request) => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.observed.externalRequests.push(request.url()); });
    await page.goto(`${result.url}?heightfield=1&hfcastreview=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration && window.SNCDiagnostics.getSnapshot().heightfield.calibration.subjects.length === 16);
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    await page.waitForTimeout(180);
    const castSnapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const castPng = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), 'full-cast-equal-depth.png') });
    const castPages = [];
    for(let pageIndex = 1; pageIndex <= 4; pageIndex++){
      await page.goto(`${result.url}?heightfield=1&hfcastreview=1&hfcastpage=${pageIndex}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration && window.SNCDiagnostics.getSnapshot().heightfield.calibration.subjects.length === 4);
      await page.waitForTimeout(120);
      const snapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
      const png = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), `full-cast-page-${pageIndex}.png`) });
      castPages.push({ pageIndex, calibration: snapshot.heightfield.calibration, screenshotSha256: crypto.createHash('sha256').update(png).digest('hex') });
    }
    await page.goto(`${result.url}?heightfield=1&hfcanreview=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration && window.SNCDiagnostics.getSnapshot().heightfield.calibration.subjects.length === 4);
    await page.waitForTimeout(180);
    const canSnapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const canPng = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), 'can-equal-depth.png') });
    const cast = castSnapshot.heightfield.calibration;
    const cans = canSnapshot.heightfield.calibration;
    const castSubjects = cast.subjects;
    const canSubjects = cans.subjects.filter((entry) => entry.kind === 'can');
    const block = subject(cans, 'half-block');
    result.measurements = { cast, castPages, cans, screenshots: { castSha256: crypto.createHash('sha256').update(castPng).digest('hex'), canSha256: crypto.createHash('sha256').update(canPng).digest('hex') } };
    result.checks.castRoute = castSnapshot.runtime.customLevel === 'heightfield_proof' && cast.pose === 'equal-depth-overview';
    result.checks.fullCast = castSubjects.length === 16 && castSubjects.map((entry) => entry.id).join(',') === castAssetIds.join(',');
    result.checks.castEqualDepth = Math.max(...castSubjects.map((entry) => entry.cameraDepth)) - Math.min(...castSubjects.map((entry) => entry.cameraDepth)) < 1e-9;
    result.checks.castRuntimeHeights = castSubjects.every((entry) => entry.worldHeight === castReviewHeights.get(entry.id));
    result.checks.castVisibleContact = castSubjects.every((entry) => entry.visibleBounds && entry.visibleBounds.physicalContactOpaquePixels > 0 && Number.isFinite(entry.visibleBounds.projectedGroundY));
    result.checks.castInspectionPages = castPages.length === 4 && castPages.every(({ pageIndex, calibration }) => {
      const pageSubjects = calibration.subjects;
      const pageIds = castAssetIds.slice((pageIndex - 1) * 4, pageIndex * 4);
      const depths = pageSubjects.map((entry) => entry.cameraDepth);
      return calibration.pose === `equal-depth-page-${pageIndex}` && pageSubjects.map((entry) => entry.id).join(',') === pageIds.join(',') &&
        Math.max(...depths) - Math.min(...depths) < 1e-9 && pageSubjects.every((entry) => entry.visibleBounds && entry.visibleBounds.physicalContactOpaquePixels > 0);
    });
    result.checks.canRoute = canSnapshot.runtime.customLevel === 'heightfield_proof' && cans.pose === 'equal-depth-overview';
    result.checks.canCandidates = canSubjects.map((entry) => entry.worldHeight).join(',') === '0.36,0.4,0.44';
    result.checks.canEqualDepth = Math.max(...canSubjects.map((entry) => entry.cameraDepth)) - Math.min(...canSubjects.map((entry) => entry.cameraDepth)) < 1e-9;
    result.checks.canOrder = canSubjects[0].projectedPixelHeight < canSubjects[1].projectedPixelHeight && canSubjects[1].projectedPixelHeight < canSubjects[2].projectedPixelHeight;
    result.checks.canGrounding = canSubjects.every((entry) => entry.visibleBounds && entry.visibleBounds.physicalContactOpaquePixels > 0 && entry.visibleBounds.groundingErrorPixels <= 1);
    result.checks.canBelowBlock = block && block.worldHeight === 0.5 && canSubjects.every((entry) => entry.worldHeight < block.worldHeight);
    result.checks.noErrors = Object.values(result.observed).every((items) => items.length === 0);
    result.pass = Object.values(result.checks).every(Boolean);
  } catch(error) { result.errors.push(String(error.stack || error)); }
  finally {
    for(const resource of [page, context, browser]) if(resource) await resource.close();
    if(server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  if(result.errors.length) result.pass = false;
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ pass: result.pass, checks: result.checks, output: path.relative(root, output), errors: result.errors }));
  if(!result.pass) process.exitCode = 1;
}
main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
