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
  const result = { pass: false, pageErrors: [], consoleErrors: [], externalRequests: [], samples: [], diagnostics: null, resolverProbe: null };
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

    await page.goto(`${result.url}?cutoutproof=1&cutoutview=oblique&cutoutrotation=0`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForFunction(() => {
      const asset = window.BITMAP_BUILDING_ASSET_REGISTRY && window.BITMAP_BUILDING_ASSET_REGISTRY.dumpster_001;
      return asset && asset.loadState && asset.loadState.status === 'loaded';
    }, null, { timeout: 10000 });
    await page.locator('[data-action="custom-level-dumpster_pilot"]').click();
    await page.waitForFunction(() => window.SNCDiagnostics.getSnapshot().runtime.state === 'play', null, { timeout: 10000 });

    result.resolverProbe = await page.evaluate(() => {
      const asset = BITMAP_BUILDING_ASSET_REGISTRY.dumpster_001;
      const placement = game.buildingRegistry[1];
      const before = typeof crGetSinglePlaneCutoutDiagnostics === 'function' ? crGetSinglePlaneCutoutDiagnostics() : null;
      const manualWest = resolveWholeFaceBitmapBuildingColumn({
        side: 0, stepX: 1, stepY: -1, px: 2.55, py: 5.45,
        cell: game.buildingGrid[4][3], wallFraction: 0.5
      }, placement);
      const manualSouth = resolveWholeFaceBitmapBuildingColumn({
        side: 1, stepX: 1, stepY: -1, px: 2.55, py: 5.45,
        cell: game.buildingGrid[4][3], wallFraction: 0.5
      }, placement);
      const after = typeof crGetSinglePlaneCutoutDiagnostics === 'function' ? crGetSinglePlaneCutoutDiagnostics() : null;
      return {
        assetStatus: asset && asset.loadState && asset.loadState.status,
        resolverName: resolveWholeFaceBitmapBuildingColumn.name,
        resolverWrapped: String(resolveWholeFaceBitmapBuildingColumn).includes('resolveSinglePlaneCutoutColumn'),
        before,
        after,
        manualWest: manualWest ? {
          worldFace: manualWest.worldFace,
          selectedWorldFace: manualWest.selectedWorldFace,
          suppressed: manualWest.singlePlaneSuppressed,
          opaqueRunCount: Array.isArray(manualWest.opaqueRuns) ? manualWest.opaqueRuns.length : null
        } : null,
        manualSouth: manualSouth ? {
          worldFace: manualSouth.worldFace,
          selectedWorldFace: manualSouth.selectedWorldFace,
          suppressed: manualSouth.singlePlaneSuppressed,
          opaqueRunCount: Array.isArray(manualSouth.opaqueRuns) ? manualSouth.opaqueRuns.length : null
        } : null
      };
    });

    const poses = [
      { id: 'southwest-wide', x: 2.55, y: 5.45 },
      { id: 'southwest-near', x: 2.72, y: 5.22 },
      { id: 'southwest-tight', x: 2.82, y: 5.08 },
      { id: 'south-front-bias', x: 2.95, y: 5.32 }
    ];

    for(const pose of poses){
      await page.evaluate(({ x, y }) => {
        player.x = x;
        player.y = y;
        player.angle = Math.atan2(4 - player.y, 3.5 - player.x);
        if(typeof crResetRenderPoseHistory === 'function') crResetRenderPoseHistory('dumpster-close-range-regression');
        else if(typeof crResetRenderAngleHistory === 'function') crResetRenderAngleHistory('dumpster-close-range-regression');
      }, pose);
      await page.evaluate(() => new Promise((resolve) => {
        let frames = 0;
        function next(){ if(++frames >= 12) resolve(); else requestAnimationFrame(next); }
        requestAnimationFrame(next);
      }));
      const sample = await page.evaluate(() => ({
        hasDiagnostics: typeof crGetSinglePlaneCutoutDiagnostics === 'function',
        diagnostics: typeof crGetSinglePlaneCutoutDiagnostics === 'function' ? crGetSinglePlaneCutoutDiagnostics() : null,
        player: { x: player.x, y: player.y, angle: player.angle },
        runtime: window.SNCDiagnostics.getSnapshot().runtime
      }));
      result.samples.push({ id: pose.id, ...sample });
    }

    process.stdout.write(`${JSON.stringify({ resolverProbe: result.resolverProbe, closeRangeSamples: result.samples })}\n`);
    assert.equal(result.resolverProbe.assetStatus, 'loaded');
    assert.equal(result.resolverProbe.resolverWrapped, true, `single-plane resolver was not installed: ${JSON.stringify(result.resolverProbe)}`);
    assert(result.resolverProbe.manualWest && result.resolverProbe.manualSouth, `manual resolver probe failed: ${JSON.stringify(result.resolverProbe)}`);
    assert.notEqual(result.resolverProbe.manualWest.suppressed, result.resolverProbe.manualSouth.suppressed,
      `adjacent manual faces must not both remain opaque: ${JSON.stringify(result.resolverProbe)}`);

    const mixed = result.samples.find((sample) => sample.diagnostics && sample.diagnostics.active &&
      sample.diagnostics.visibleColumns > 0 && sample.diagnostics.suppressedColumns > 0);
    assert(mixed, `live ray loop did not exercise both dominant and suppressed faces: ${JSON.stringify({ probe:result.resolverProbe, samples:result.samples })}`);
    result.diagnostics = mixed.diagnostics;
    assert.equal(result.diagnostics.assetId, 'dumpster_001');
    assert(result.diagnostics.visibleColumns > 0, 'one dominant exterior plane must render opaque dumpster columns');
    assert(result.diagnostics.suppressedColumns > 0, 'the adjacent footprint plane must be transparent at a close corner');
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
    selectedWorldFace: result.diagnostics && result.diagnostics.selectedWorldFace,
    visibleColumns: result.diagnostics && result.diagnostics.visibleColumns,
    suppressedColumns: result.diagnostics && result.diagnostics.suppressedColumns
  })}\n`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
