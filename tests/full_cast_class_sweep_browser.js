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
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'full-cast-class-sweep', `browser-${process.pid}.json`));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'authoring/characters/character-assets-v2.json'), 'utf8'));
const approvedIds = manifest.assets.map((asset) => asset.assetId).sort();

function serve(html){
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
    server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

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
    await page.goto(`${result.url}?heightfield=1&hfclasssweep=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration && window.SNCDiagnostics.getSnapshot().heightfield.calibration.mode === 'internal-full-cast-class-sweep');
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    await page.waitForTimeout(200);
    const snapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const screenshot = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), 'full-cast-equal-depth.png') });
    const calibration = snapshot.heightfield.calibration;
    const cast = calibration.subjects.filter((subject) => subject.kind === 'npc');
    const can = calibration.subjects.find((subject) => subject.id === 'can-reference');
    const depths = cast.map((subject) => subject.cameraDepth);
    result.measurements = { calibration, screenshotSha256: crypto.createHash('sha256').update(screenshot).digest('hex') };
    result.checks.route = snapshot.runtime.customLevel === 'heightfield_proof' && calibration.pose === 'equal-depth-overview';
    result.checks.approvedCast = cast.length === 16 && cast.map((subject) => subject.id).join(',') === approvedIds.join(',');
    result.checks.equalDepth = Math.max(...depths) - Math.min(...depths) < 1e-9;
    result.checks.classResolution = cast.filter((subject) => subject.worldHeightClass === 'standingComposite' && subject.worldHeight === 0.78).length === 15 &&
      cast.filter((subject) => subject.worldHeightClass === 'seatedSlumped' && subject.worldHeight === 0.68).length === 1;
    result.checks.groundedAndCropped = cast.every((subject) => subject.visibleBounds && subject.visibleBounds.physicalContactOpaquePixels > 0 && subject.visibleBounds.groundingErrorPixels <= 1 && subject.visibleBounds.alphaBounds.w > 0 && subject.visibleBounds.alphaBounds.h > 0);
    result.checks.references = calibration.references && calibration.references.cameraEyeZ === 0.68 && calibration.references.halfBlockHeight === 0.5 && calibration.references.fullWallHeight === 1.0 &&
      can && can.worldHeight === 0.40 && can.worldHeight < calibration.references.halfBlockHeight && can.visibleBounds && can.visibleBounds.groundingErrorPixels <= 1;
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
