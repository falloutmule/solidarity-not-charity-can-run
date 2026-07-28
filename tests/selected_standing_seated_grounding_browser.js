'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'pr29-standing-lock-seated-ground-fix-006', 'selected-standing-seated-grounding-browser.json'));
assert(output.startsWith(path.join(root, 'test-results') + path.sep), 'browser proof remains ignored');
const serve = (html) => new Promise((resolve, reject) => {
  const server = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
  server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
});
const subject = (calibration, id) => calibration.subjects.find((candidate) => candidate.id === id);
const waitForReview = () => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration && window.SNCDiagnostics.getSnapshot().heightfield.calibration.subjects.some((candidate) => candidate.id === 'standing') && window.SNCDiagnostics.getSnapshot().heightfield.calibration.subjects.some((candidate) => candidate.id === 'slumped');

async function main(){
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const result = { pass: false, checks: {}, observed: { pageErrors: [], consoleErrors: [], externalRequests: [] }, measurements: {}, errors: [] };
  let server, browser, context, page;
  try {
    ({ server, url: result.url } = await serve(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('console', (message) => { if(message.type() === 'error') result.observed.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => result.observed.pageErrors.push(String(error.stack || error)));
    page.on('request', (request) => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.observed.externalRequests.push(request.url()); });
    const loadPose = async (pose, screenshotName) => {
      await page.goto(`${result.url}?heightfield=1&hfcalibration=1&hfselectedreview=1&hfgroundline=1&hfcalpose=${pose}`, { waitUntil: 'load' });
      await page.waitForFunction(waitForReview);
      await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
      await page.waitForTimeout(160);
      const snapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
      const png = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), screenshotName) });
      return { snapshot, sha256: crypto.createHash('sha256').update(png).digest('hex') };
    };
    const equal = await loadPose('equal-depth', 'selected-equal-depth-groundline.png');
    const standingClose = await loadPose('standing-close', 'selected-standing-close.png');
    const seatedClose = await loadPose('seated-close', 'selected-seated-close.png');
    const seatedSide = await loadPose('seated-side', 'selected-seated-side-low-block.png');
    const calibration = equal.snapshot.heightfield.calibration;
    const standing = subject(calibration, 'standing');
    const slumped = subject(calibration, 'slumped');
    result.measurements = { equalDepth: calibration, standingClose: standingClose.snapshot.heightfield.calibration, seatedClose: seatedClose.snapshot.heightfield.calibration, seatedSide: seatedSide.snapshot.heightfield.calibration, screenshots: { equal: equal.sha256, standingClose: standingClose.sha256, seatedClose: seatedClose.sha256, seatedSide: seatedSide.sha256 } };
    const standingBounds = standing && standing.visibleBounds, slumpedBounds = slumped && slumped.visibleBounds;
    result.checks.queryGate = equal.snapshot.runtime.customLevel === 'heightfield_proof' && equal.snapshot.heightfield.groundLine && equal.snapshot.heightfield.groundLine.enabled === true;
    result.checks.selectedValues = standing && standing.worldHeight === 0.78 && slumped && slumped.worldHeight === 0.68;
    result.checks.sameDepth = standing && slumped && Math.abs(standing.cameraDepth - slumped.cameraDepth) < 1e-9;
    result.checks.noCans = !calibration.subjects.some((candidate) => candidate.kind === 'can') && equal.snapshot.runtime.canStand;
    result.checks.standingFallback = standingBounds && standingBounds.groundSourceY === standingBounds.alphaBoundBottomRow && Math.abs(standingBounds.screenH - standingBounds.projectedTopToGround) < 1e-9 && standingBounds.groundingErrorPixels <= 1;
    result.checks.seatedContact = slumpedBounds && slumpedBounds.groundSourceY === 184 && slumpedBounds.alphaBoundBottomRow === 189 && Math.abs(slumpedBounds.projectedTopToGround - slumped.projectedPixelHeight) < 1e-9 && slumpedBounds.screenH > slumpedBounds.projectedTopToGround && slumpedBounds.screenBottomY > slumpedBounds.projectedGroundY && slumpedBounds.sourceOpaquePixelsBelowContact > 0 && slumpedBounds.groundingErrorPixels <= 1;
    result.checks.contextPoses = standingClose.snapshot.heightfield.calibration.pose === 'standing-close' && seatedClose.snapshot.heightfield.calibration.pose === 'seated-close' && seatedSide.snapshot.heightfield.calibration.pose === 'seated-side';
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
