'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'pr29-seated-anchor-display-delta-008', 'seated-anchor-display-delta-browser.json'));
assert(output.startsWith(path.join(root, 'test-results') + path.sep), 'browser evidence remains ignored');
const serve = (html) => new Promise((resolve, reject) => {
  const server = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
  server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
});
const expectedRows = Object.freeze({ 'seated-anchor-a': 182, 'seated-anchor-b': 159, 'seated-anchor-c': 140 });
const expectedDisplayDeltas = Object.freeze({ 'seated-anchor-a': 0, 'seated-anchor-b': 4, 'seated-anchor-c': 8 });
const markerColors = Object.freeze({ 'seated-anchor-a': [255, 225, 76], 'seated-anchor-b': [255, 154, 61], 'seated-anchor-c': [255, 78, 203] });

function writeNearestNeighborShoeCrops(crops, outputPath){
  const scale = 4, gap = 8, titleHeight = 8;
  const width = crops.reduce((total, crop) => total + crop.width * scale, 0) + gap * (crops.length + 1);
  const height = Math.max(...crops.map((crop) => crop.height)) * scale + titleHeight + gap * 2;
  const image = new PNG({ width, height });
  image.data.fill(0);
  let xOffset = gap;
  for(const crop of crops){
    const color = markerColors[crop.id];
    for(let y = 0; y < titleHeight; y++) for(let x = 0; x < crop.width * scale; x++){
      const index = ((gap + y) * width + xOffset + x) * 4;
      image.data[index] = color[0]; image.data[index + 1] = color[1]; image.data[index + 2] = color[2]; image.data[index + 3] = 255;
    }
    for(let sy = 0; sy < crop.height; sy++) for(let sx = 0; sx < crop.width; sx++){
      const source = (sy * crop.width + sx) * 4;
      for(let oy = 0; oy < scale; oy++) for(let ox = 0; ox < scale; ox++){
        const target = ((gap + titleHeight + sy * scale + oy) * width + xOffset + sx * scale + ox) * 4;
        image.data[target] = crop.data[source]; image.data[target + 1] = crop.data[source + 1]; image.data[target + 2] = crop.data[source + 2]; image.data[target + 3] = crop.data[source + 3];
      }
    }
    xOffset += crop.width * scale + gap;
  }
  fs.writeFileSync(outputPath, PNG.sync.write(image));
}

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
    await page.goto(`${result.url}?heightfield=1&hfcalibration=1&hfseatedanchordisplaydelta=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration && window.SNCDiagnostics.getSnapshot().heightfield.calibration.subjects.length === 3);
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    await page.waitForFunction(() => window.SNCSeatedAnchorDiagnostics && window.SNCSeatedAnchorDiagnostics.mode === 'seated-anchor-display-delta' && window.SNCSeatedAnchorDiagnostics.markers.length === 3);
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
    const shoeEvidence = await page.evaluate(() => {
      const snapshot = window.SNCDiagnostics.getSnapshot();
      const subjects = snapshot.heightfield.calibration.subjects;
      const registry = window.SNC_RUNTIME_ASSET_REGISTRY;
      const shoeSourceRow = 181, shoeSourceMinRow = shoeSourceRow - 8;
      return subjects.map((subject) => {
        const bounds = subject.visibleBounds;
        const image = registry.npc_unhoused_slumped_001.image;
        const mask = crHeightfieldSpriteAlphaMask(image);
        let opaqueShoeSourcePixels = 0;
        for(let y = shoeSourceMinRow; y <= shoeSourceRow; y++) for(let x = bounds.alphaBounds.x; x < bounds.alphaBounds.x + bounds.alphaBounds.w; x++) if(mask.alpha[(y * mask.width + x) * 4 + 3] > 0) opaqueShoeSourcePixels++;
        let actualOpaqueShoeDestinationY = -1;
        for(let y = Math.floor(bounds.visibleTopScreenY); y < Math.ceil(bounds.screenBottomY); y++){
          const sourceY = Math.max(bounds.alphaBounds.y, Math.min(bounds.alphaBounds.y + bounds.alphaBounds.h - 1, (bounds.alphaBounds.y + (y - bounds.visibleTopScreenY) / bounds.screenH * bounds.alphaBounds.h) | 0));
          if(sourceY >= shoeSourceMinRow && sourceY <= shoeSourceRow && opaqueShoeSourcePixels > 0) actualOpaqueShoeDestinationY = y;
        }
        return {
          id: subject.id, opaqueShoeSourcePixels, actualOpaqueShoeDestinationY,
          shoeGroundingErrorPixels: actualOpaqueShoeDestinationY < 0 ? Infinity : Math.abs((actualOpaqueShoeDestinationY + 1) - Math.round(bounds.projectedGroundY)),
          lowestPhysicalContactDestinationY: bounds.lowestPhysicalContactDestinationY,
          groundingErrorPixels: bounds.groundingErrorPixels
        };
      });
    });
    const crops = await page.evaluate((markers) => {
      const canvas = bctx.canvas, context = bctx, halfWidth = 20, aboveGround = 30, belowGround = 14;
      return markers.map((marker) => {
        const x = Math.max(0, Math.min(canvas.width - halfWidth * 2, marker.screenCenterX - halfWidth));
        const y = Math.max(0, Math.min(canvas.height - (aboveGround + belowGround), marker.projectedGroundY - aboveGround));
        const width = halfWidth * 2, height = aboveGround + belowGround;
        return { id: marker.id, x, y, width, height, data: Array.from(context.getImageData(x, y, width, height).data) };
      });
    }, markerPixels);
    const worldScreenshotPath = path.join(path.dirname(output), 'seated-anchor-equal-depth-world.png');
    const browserScreenshotPath = path.join(path.dirname(output), 'seated-anchor-equal-depth-browser.png');
    const shoeCropsPath = path.join(path.dirname(output), 'seated-anchor-shoe-crops-4x.png');
    const worldScreenshot = await page.locator('#view').screenshot({ path: worldScreenshotPath });
    const browserScreenshot = await page.screenshot({ path: browserScreenshotPath });
    writeNearestNeighborShoeCrops(crops, shoeCropsPath);
    const calibration = snapshot.heightfield.calibration;
    const subjects = calibration.subjects;
    const markers = Object.fromEntries(markerPixels.map((marker) => [marker.id, marker]));
    const shoes = Object.fromEntries(shoeEvidence.map((shoe) => [shoe.id, shoe]));
    const baseShoeY = shoes['seated-anchor-a'].actualOpaqueShoeDestinationY;
    const actualDisplayDeltas = Object.fromEntries(shoeEvidence.map((shoe) => [shoe.id, shoe.actualOpaqueShoeDestinationY - baseShoeY]));
    result.measurements = {
      pose: calibration.pose,
      sourceProjection: await page.evaluate(() => window.SNCSeatedAnchorDiagnostics.sourceProjection), markers: markerPixels,
      subjects: subjects.map((subject) => ({
        id: subject.id, worldHeight: subject.worldHeight, cameraDepth: subject.cameraDepth,
        projectedGroundY: markers[subject.id].projectedGroundY, projectedPixelHeight: subject.projectedPixelHeight,
        groundContactSourceY: subject.visibleBounds.groundSourceY,
        sourceDeltaFromA: markers[subject.id].sourceDelta,
        targetInternalPixelDelta: markers[subject.id].targetInternalPixelDelta,
        actualOpaqueShoeSourcePixels: shoes[subject.id].opaqueShoeSourcePixels,
        actualLowestOpaqueShoeY: shoes[subject.id].actualOpaqueShoeDestinationY,
        actualDisplayDeltaFromA: actualDisplayDeltas[subject.id],
        shoeGroundingErrorPixels: shoes[subject.id].shoeGroundingErrorPixels,
        lowestVisibleFootContactY: shoes[subject.id].lowestPhysicalContactDestinationY,
        groundingErrorPixels: shoes[subject.id].groundingErrorPixels
      })),
      markerPixels,
      worldScreenshotSha256: crypto.createHash('sha256').update(worldScreenshot).digest('hex'),
      browserScreenshotSha256: crypto.createHash('sha256').update(browserScreenshot).digest('hex'),
      shoeCrops: crops.map(({ data, ...crop }) => crop),
      shoeCropsSha256: crypto.createHash('sha256').update(fs.readFileSync(shoeCropsPath)).digest('hex')
    };
    result.checks.queryOnlyMode = (await page.evaluate(() => window.SNCSeatedAnchorDiagnostics.mode)) === 'seated-anchor-display-delta' && calibration.pose === 'equal-depth' && markerPixels.length === 3;
    result.checks.exactCandidates = subjects.length === 3 && subjects.every((subject) => subject.kind === 'npc' && subject.worldHeight === 0.68 && subject.visibleBounds.groundSourceY === expectedRows[subject.id]);
    result.checks.equalDepth = subjects.every((subject) => Math.abs(subject.cameraDepth - subjects[0].cameraDepth) < 1e-9);
    result.checks.actualOpaqueFootContact = subjects.every((subject) => {
      return shoes[subject.id].opaqueShoeSourcePixels > 0 && shoes[subject.id].actualOpaqueShoeDestinationY >= 0 && subject.visibleBounds.physicalContactOpaquePixels > 0;
    });
    result.checks.targetDisplayDifferences = Object.keys(expectedDisplayDeltas).every((id) => actualDisplayDeltas[id] === expectedDisplayDeltas[id]) && actualDisplayDeltas['seated-anchor-b'] >= 4 && actualDisplayDeltas['seated-anchor-c'] >= 8;
    result.checks.shortMarkers = markerPixels.every((marker) => marker.exactPixels >= marker.paintedPixels && marker.paintedPixels === marker.width * 2);
    result.checks.labelsOutsideWorldImage = await page.evaluate(() => {
      const labels = document.getElementById('crSeatedAnchorDisplayLabels');
      return Boolean(labels && labels.parentElement === document.body && !document.getElementById('view').contains(labels) && /A .*row 182/.test(labels.textContent) && /B .*\+4px/.test(labels.textContent) && /C .*\+8px/.test(labels.textContent));
    });
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
