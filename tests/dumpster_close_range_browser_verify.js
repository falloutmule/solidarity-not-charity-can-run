'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'index.html');
const runDir = path.join(root, 'test-results', 'dumpster-close-range', `run-${process.pid}`);

async function serve(html){
  const server = http.createServer((request, response) => {
    if(new URL(request.url, 'http://127.0.0.1').pathname === '/'){
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }
    response.writeHead(404);
    response.end('not found');
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

async function main(){
  const html = fs.readFileSync(artifact, 'utf8');
  const result = {
    pass: false,
    pageErrors: [],
    consoleErrors: [],
    externalRequests: [],
    diagnosticsBefore: null,
    diagnosticsAfterLiveFrames: null,
    faceProbe: null
  };
  let browser;
  let context;
  let server;
  try {
    ({ server, url: result.url } = await serve(html));
    browser = await chromium.launch();
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('pageerror', (error) => result.pageErrors.push(String(error.stack || error)));
    page.on('console', (message) => { if(message.type() === 'error') result.consoleErrors.push(message.text()); });
    page.on('request', (request) => {
      if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.externalRequests.push(request.url());
    });

    // Normal visual mode: proof-mode striped walls must not disguise the close-range result.
    await page.goto(result.url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForFunction(() => {
      const asset = window.BITMAP_BUILDING_ASSET_REGISTRY && window.BITMAP_BUILDING_ASSET_REGISTRY.dumpster_001;
      return asset && asset.loadState && asset.loadState.status === 'loaded';
    }, null, { timeout: 10000 });
    await page.locator('[data-action="custom-level-dumpster_pilot"]').click();
    await page.waitForFunction(() => window.SNCDiagnostics.getSnapshot().runtime.state === 'play', null, { timeout: 10000 });

    result.diagnosticsBefore = await page.evaluate(() => crGetSinglePlaneCutoutDiagnostics());
    await page.evaluate(() => {
      player.x = 2.55;
      player.y = 5.45;
      player.angle = Math.atan2(4 - player.y, 3.5 - player.x);
      if(typeof crResetRenderPoseHistory === 'function') crResetRenderPoseHistory('dumpster-close-range-regression');
      else if(typeof crResetRenderAngleHistory === 'function') crResetRenderAngleHistory('dumpster-close-range-regression');
    });

    const beforeCount = Number(result.diagnosticsBefore && result.diagnosticsBefore.lookupCount) || 0;
    await page.waitForFunction((baseline) => {
      const diagnostics = crGetSinglePlaneCutoutDiagnostics();
      return diagnostics && diagnostics.active && diagnostics.lookupCount > baseline &&
        diagnostics.selectedWorldFace === 'west' && diagnostics.selectedLocalFace === 'west';
    }, beforeCount, { timeout: 10000 });
    await page.evaluate(() => new Promise((resolve) => {
      let frames = 0;
      function next(){ if(++frames >= 12) resolve(); else requestAnimationFrame(next); }
      requestAnimationFrame(next);
    }));
    result.diagnosticsAfterLiveFrames = await page.evaluate(() => crGetSinglePlaneCutoutDiagnostics());

    // Probe the exact variant used by the live renderer after the live lookup count advanced.
    result.faceProbe = await page.evaluate(() => {
      const placement = game.buildingRegistry[1];
      const cell = game.buildingGrid[4][3];
      const west = resolveWholeFaceBitmapBuildingColumn({
        side: 0, stepX: 1, stepY: -1, cell, wallFraction: 0.5
      }, placement);
      const south = resolveWholeFaceBitmapBuildingColumn({
        side: 1, stepX: 1, stepY: -1, cell, wallFraction: 0.5
      }, placement);
      return {
        west: west ? {
          localFace: west.localFace,
          opaqueRunCount: Array.isArray(west.opaqueRuns) ? west.opaqueRuns.length : null,
          faceWidth: west.face && west.face.width,
          faceHeight: west.face && west.face.height
        } : null,
        south: south ? {
          localFace: south.localFace,
          opaqueRunCount: Array.isArray(south.opaqueRuns) ? south.opaqueRuns.length : null,
          faceWidth: south.face && south.face.width,
          faceHeight: south.face && south.face.height
        } : null,
        diagnostics: crGetSinglePlaneCutoutDiagnostics()
      };
    });

    const live = result.diagnosticsAfterLiveFrames;
    assert(live && live.active, `live registry getter did not activate: ${JSON.stringify(result)}`);
    assert(live.lookupCount > beforeCount, `live ray loop did not read the directional asset: ${JSON.stringify(result)}`);
    assert.equal(live.selectedWorldFace, 'west');
    assert.equal(live.selectedLocalFace, 'west');
    assert(result.faceProbe.west && result.faceProbe.south, `directional face probe failed: ${JSON.stringify(result.faceProbe)}`);
    assert(result.faceProbe.west.opaqueRunCount > 0, `selected west face must retain the dumpster: ${JSON.stringify(result.faceProbe)}`);
    assert.equal(result.faceProbe.south.opaqueRunCount, 0, `adjacent south face must be fully transparent: ${JSON.stringify(result.faceProbe)}`);
    assert.equal(result.faceProbe.south.faceWidth, 1, 'suppressed face must resolve to the one-pixel transparent atlas slice');
    assert.equal(result.faceProbe.south.faceHeight, 1, 'suppressed face must resolve to the one-pixel transparent atlas slice');
    assert.equal(result.pageErrors.length, 0, `page errors: ${result.pageErrors.join('; ')}`);
    assert.equal(result.consoleErrors.length, 0, `console errors: ${result.consoleErrors.join('; ')}`);
    assert.equal(result.externalRequests.length, 0, `external requests: ${result.externalRequests.join('; ')}`);

    fs.mkdirSync(runDir, { recursive: true });
    await page.screenshot({ path: path.join(runDir, 'close-corner-mobile.png'), fullPage: true });
    result.pass = true;
    await page.close();
  } finally {
    if(context) await context.close();
    if(browser) await browser.close();
    if(server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'result.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
  }

  process.stdout.write(`${JSON.stringify({
    pass: result.pass,
    output: path.relative(root, path.join(runDir, 'result.json')),
    lookupCount: result.diagnosticsAfterLiveFrames && result.diagnosticsAfterLiveFrames.lookupCount,
    selectedWorldFace: result.diagnosticsAfterLiveFrames && result.diagnosticsAfterLiveFrames.selectedWorldFace,
    westOpaqueRuns: result.faceProbe && result.faceProbe.west && result.faceProbe.west.opaqueRunCount,
    southOpaqueRuns: result.faceProbe && result.faceProbe.south && result.faceProbe.south.opaqueRunCount
  })}\n`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
