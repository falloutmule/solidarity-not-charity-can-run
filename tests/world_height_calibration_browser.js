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
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'world-height-calibration', `browser-${process.pid}.json`));

function serve(html){
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
    server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}
function byId(calibration, id){ return calibration.subjects.find((subject) => subject.id === id); }

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
    await page.goto(`${result.url}?heightfield=1&hfcalibration=1&hfcalpose=equal-depth`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration);
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    await page.waitForTimeout(160);
    const equal = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const equalShot = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), 'lineup-equal-depth.png') });
    await page.goto(`${result.url}?heightfield=1&hfcalibration=1&hfcalpose=standing-close`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration && window.SNCDiagnostics.getSnapshot().heightfield.calibration.pose === 'standing-close');
    await page.waitForTimeout(160);
    const close = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const closeShot = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), 'standing-close.png') });
    await page.goto(`${result.url}?heightfield=1&hfcalibration=1&hfcalpose=equal-depth&hfcancomparison=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const calibration = window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration;
      return calibration && calibration.subjects.some((subject) => subject.id === 'can-036') && calibration.subjects.some((subject) => subject.id === 'can-044');
    });
    await page.waitForTimeout(160);
    const comparison = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const comparisonShot = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), 'can-size-comparison.png') });
    const calibration = equal.heightfield.calibration;
    const standing = byId(calibration, 'standing');
    const slumped = byId(calibration, 'slumped');
    const can = byId(calibration, 'can');
    const halfBlock = byId(calibration, 'half-block');
    const fullWall = byId(calibration, 'full-wall');
    const subjects = [standing, slumped, can, halfBlock, fullWall];
    const depths = subjects.map((subject) => subject.cameraDepth);
    const closeStanding = byId(close.heightfield.calibration, 'standing');
    const comparisonCalibration = comparison.heightfield.calibration;
    const comparisonCans = ['can-036', 'can-040', 'can-044'].map((id) => byId(comparisonCalibration, id));
    result.measurements.equalDepth = calibration;
    result.measurements.standingClose = close.heightfield.calibration;
    result.measurements.canComparison = comparisonCalibration;
    result.measurements.screenshots = {
      equalDepthSha256: crypto.createHash('sha256').update(equalShot).digest('hex'),
      standingCloseSha256: crypto.createHash('sha256').update(closeShot).digest('hex'),
      canComparisonSha256: crypto.createHash('sha256').update(comparisonShot).digest('hex')
    };
    result.checks.queryGate = equal.runtime.customLevel === 'heightfield_proof' && calibration.pose === 'equal-depth';
    result.checks.equalDepth = Math.max(...depths) - Math.min(...depths) < 1e-9;
    result.checks.worldOrder = standing.worldHeight > halfBlock.worldHeight && slumped.worldHeight > halfBlock.worldHeight && can.worldHeight < halfBlock.worldHeight && fullWall.worldHeight === 1;
    result.checks.standingEyeLevel = Math.abs(standing.topScreenY - 125) < 1e-9 && standing.worldHeight === equal.heightfield.cameraZ;
    result.checks.grounded = subjects.every((subject) => Math.abs(subject.groundScreenY - subjects[0].groundScreenY) < 1e-9);
    result.checks.visibleBounds = [standing, slumped, can].every((subject) => {
      const bounds = subject.visibleBounds;
      return bounds && bounds.sourceCanvasWidth > 0 && bounds.sourceCanvasHeight > 0 && bounds.alphaBounds.x >= 0 && bounds.alphaBounds.y >= 0 &&
        bounds.alphaBounds.x + bounds.alphaBounds.w <= bounds.sourceCanvasWidth && bounds.alphaBounds.y + bounds.alphaBounds.h <= bounds.sourceCanvasHeight &&
        bounds.groundSourceY === bounds.alphaBounds.y + bounds.alphaBounds.h && bounds.groundSourceY <= bounds.sourceCanvasHeight;
    });
    result.checks.visibleGrounding = [standing, slumped, can].every((subject) => subject.visibleBounds && Math.abs(subject.visibleBounds.projectedGroundY - subject.groundScreenY) < 1e-9 && subject.visibleBounds.groundingErrorPixels <= 1);
    result.checks.canComparison = comparisonCans.every(Boolean) && comparisonCans.map((subject) => subject.worldHeight).join(',') === '0.36,0.4,0.44' &&
      comparisonCans.every((subject) => subject.visibleBounds && subject.visibleBounds.groundingErrorPixels <= 1) &&
      comparisonCans[0].projectedPixelHeight < comparisonCans[1].projectedPixelHeight && comparisonCans[1].projectedPixelHeight < comparisonCans[2].projectedPixelHeight;
    result.checks.projectedOrder = standing.projectedPixelHeight > halfBlock.projectedPixelHeight && slumped.projectedPixelHeight > can.projectedPixelHeight && fullWall.projectedPixelHeight > standing.projectedPixelHeight;
    result.checks.closeRange = closeStanding.projectedPixelHeight > standing.projectedPixelHeight * 2 && Math.abs(closeStanding.topScreenY - 125) < 1e-9;
    result.checks.heightfield = equal.heightfield.enabled === true && equal.heightfield.worldDepthWrites > 0;
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
