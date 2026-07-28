'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'pr29-seated-anchor-calibration-007', 'seated-anchor-comparison-browser.json'));
assert(output.startsWith(path.join(root, 'test-results') + path.sep), 'browser evidence remains ignored');
const serve = (html) => new Promise((resolve, reject) => {
  const server = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
  server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
});
const expectedRows = Object.freeze({ 'seated-anchor-a': 182, 'seated-anchor-b': 178, 'seated-anchor-c': 174 });
const markerColors = Object.freeze({ 'seated-anchor-a': [255, 225, 76], 'seated-anchor-b': [255, 154, 61], 'seated-anchor-c': [255, 78, 203] });

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
    await page.goto(`${result.url}?heightfield=1&hfcalibration=1&hfseatedanchorcomparison=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration && window.SNCDiagnostics.getSnapshot().heightfield.calibration.subjects.length === 3);
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    await page.waitForFunction(() => window.SNCSeatedAnchorDiagnostics && window.SNCSeatedAnchorDiagnostics.markers.length === 3);
    await page.waitForTimeout(160);
    const snapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const markerPixels = await page.evaluate((colors) => {
      const markers = window.SNCSeatedAnchorDiagnostics.markers;
      const canvas = bctx.canvas;
      const context = bctx;
      return markers.map((marker) => {
        const expected = colors[marker.id];
        let exactPixels = 0;
        for(let sampleX = marker.screenCenterX - 8; sampleX <= marker.screenCenterX + 8; sampleX++) for(let sampleY = marker.projectedGroundY; sampleY <= marker.projectedGroundY + 1; sampleY++){
          if(sampleX < 0 || sampleY < 0 || sampleX >= canvas.width || sampleY >= canvas.height) continue;
          const pixel = context.getImageData(sampleX, sampleY, 1, 1).data;
          if(pixel[0] === expected[0] && pixel[1] === expected[1] && pixel[2] === expected[2]) exactPixels++;
        }
        return { ...marker, expected, exactPixels };
      });
    }, markerColors);
    const screenshotPath = path.join(path.dirname(output), 'seated-anchor-equal-depth.png');
    const screenshot = await page.locator('#view').screenshot({ path: screenshotPath });
    const calibration = snapshot.heightfield.calibration;
    const subjects = calibration.subjects;
    const markers = Object.fromEntries(markerPixels.map((marker) => [marker.id, marker]));
    result.measurements = {
      pose: calibration.pose, markers: markerPixels,
      subjects: subjects.map((subject) => ({
        id: subject.id, worldHeight: subject.worldHeight, cameraDepth: subject.cameraDepth,
        projectedGroundY: markers[subject.id].projectedGroundY, projectedPixelHeight: subject.projectedPixelHeight,
        groundContactSourceY: subject.visibleBounds.groundSourceY,
        lowestVisibleFootContactY: subject.visibleBounds.lowestPhysicalContactDestinationY,
        groundingErrorPixels: subject.visibleBounds.groundingErrorPixels
      })),
      markerPixels, screenshotSha256: crypto.createHash('sha256').update(screenshot).digest('hex')
    };
    result.checks.queryOnlyMode = calibration.pose === 'equal-depth' && markerPixels.length === 3;
    result.checks.exactCandidates = subjects.length === 3 && subjects.every((subject) => subject.kind === 'npc' && subject.worldHeight === 0.68 && subject.visibleBounds.groundSourceY === expectedRows[subject.id]);
    result.checks.equalDepth = subjects.every((subject) => Math.abs(subject.cameraDepth - subjects[0].cameraDepth) < 1e-9);
    result.checks.actualOpaqueFootContact = subjects.every((subject) => {
      return subject.visibleBounds.physicalContactOpaquePixels > 0 && subject.visibleBounds.lowestPhysicalContactDestinationY >= 0 && subject.visibleBounds.groundingErrorPixels <= 1;
    });
    result.checks.shortMarkers = markerPixels.every((marker) => marker.exactPixels >= marker.paintedPixels && marker.paintedPixels === marker.width * 2);
    result.checks.noFullScreenGroundLine = snapshot.heightfield.groundLine === null;
    result.checks.locksUnchanged = await page.evaluate(() => {
      const registry = window.SNC_RUNTIME_ASSET_REGISTRY;
      return registry.npc_unhoused_work_jacket_001.worldHeight === 0.78 && registry.npc_unhoused_slumped_001.worldHeight === 0.68 && registry.npc_unhoused_slumped_001.groundContactSourceY === 184;
    });
    result.checks.noCansOrStandingFixture = !subjects.some((subject) => subject.id === 'standing' || subject.kind === 'can') && snapshot.runtime.canStand;
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
