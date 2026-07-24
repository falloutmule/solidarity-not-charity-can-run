'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'index.html');
const runDir = path.join(root, 'test-results', 'alpha-cutout-raycaster', `run-${process.pid}`);
const cases = [
  ...['front', 'side', 'oblique', 'near', 'far'].map((view) => ({ view, rotation: 0 })),
  ...[1, 2, 3].map((rotation) => ({ view: 'front', rotation }))
];

async function serve(html) {
  const server = http.createServer((request, response) => {
    if (new URL(request.url, 'http://127.0.0.1').pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }
    response.writeHead(404); response.end('not found');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

async function main() {
  const html = fs.readFileSync(artifact, 'utf8');
  const result = { pass: false, views: {}, pageErrors: [], consoleErrors: [], externalRequests: [], cadence: null };
  let browser; let context; let server;
  try {
    ({ server, url: result.url } = await serve(html));
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const origin = new URL(result.url).origin;
    for (const testCase of cases) {
      const { view, rotation } = testCase;
      const caseId = `${view}-r${rotation}`;
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__sncImageDataReads = 0;
        for (const prototype of [
          globalThis.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype,
          globalThis.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype
        ]) {
          if (!prototype || typeof prototype.getImageData !== 'function' || prototype.__sncReadWrapped) continue;
          const original = prototype.getImageData;
          Object.defineProperty(prototype, '__sncReadWrapped', { value: true });
          prototype.getImageData = function(...args) {
            window.__sncImageDataReads++;
            return original.apply(this, args);
          };
        }
      });
      page.on('pageerror', (error) => result.pageErrors.push(`${caseId}: ${String(error.stack || error)}`));
      page.on('console', (message) => { if (message.type() === 'error') result.consoleErrors.push(`${caseId}: ${message.text()}`); });
      page.on('request', (request) => { if (/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.externalRequests.push(`${caseId}: ${request.url()}`); });
      await page.goto(`${result.url}?cutoutproof=1&cutoutnosprites=1&cutoutview=${view}&cutoutrotation=${rotation}`, { waitUntil: 'load', timeout: 15000 });
      await page.locator('[data-action="custom-level-dumpster_pilot"]').click();
      await page.waitForFunction(() => {
        const proof = window.SNCDiagnostics.getSnapshot().alphaCutout;
        return proof && proof.enabled && proof.opaquePixels > 0 && proof.transparentPixels > 0 && proof.sampleOpaque && proof.sampleTransparent;
      }, null, { timeout: 10000 });
      const proof = await page.evaluate(() => window.SNCDiagnostics.getSnapshot().alphaCutout);
      assert.equal(proof.opaqueDepthWrites, proof.opaquePixels, `${caseId}: each opaque cutout sample must write front depth`);
      assert.equal(proof.transparentDepthPreserved, proof.transparentPixels, `${caseId}: transparent cutout samples must preserve background depth`);
      assert(proof.backgroundDepthWrites > 0, `${caseId}: actual ray continuation must render a background wall`);
      assert(proof.sampleOpaque.depthAfter < proof.sampleOpaque.depthBefore, `${caseId}: opaque sample must own nearer depth`);
      assert.equal(proof.sampleTransparent.depthAfter, proof.sampleTransparent.depthBefore, `${caseId}: transparent sample must retain background depth`);
      const readsAfterWarmup = await page.evaluate(() => window.__sncImageDataReads);
      await page.waitForTimeout(500);
      const readsAfterSteadyFrames = await page.evaluate(() => window.__sncImageDataReads);
      assert.equal(readsAfterSteadyFrames, readsAfterWarmup, `${caseId}: normal frames must not perform recurring canvas pixel readback`);
      const normalPixels = await page.evaluate(({ opaque, transparent }) => {
        const read = (sample) => Array.from(bctx.getImageData(sample.col, sample.y, 1, 1).data);
        return { opaque:read(opaque), transparent:read(transparent) };
      }, { opaque:proof.sampleOpaque, transparent:proof.sampleTransparent });

      const hidden = await context.newPage();
      hidden.on('pageerror', (error) => result.pageErrors.push(`${caseId}-hidden: ${String(error.stack || error)}`));
      hidden.on('console', (message) => { if (message.type() === 'error') result.consoleErrors.push(`${caseId}-hidden: ${message.text()}`); });
      hidden.on('request', (request) => { if (/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.externalRequests.push(`${caseId}-hidden: ${request.url()}`); });
      await hidden.goto(`${result.url}?cutoutproof=1&cutoutnosprites=1&cutouthidden=1&cutoutview=${view}&cutoutrotation=${rotation}`, { waitUntil:'load', timeout:15000 });
      await hidden.locator('[data-action="custom-level-dumpster_pilot"]').click();
      await hidden.waitForFunction(() => window.SNCDiagnostics.getSnapshot().runtime.state === 'play', null, { timeout:10000 });
      await hidden.waitForTimeout(250);
      const backgroundPixels = await hidden.evaluate(({ opaque, transparent }) => {
        const read = (sample) => Array.from(bctx.getImageData(sample.col, sample.y, 1, 1).data);
        return { opaque:read(opaque), transparent:read(transparent) };
      }, { opaque:proof.sampleOpaque, transparent:proof.sampleTransparent });
      assert.deepEqual(normalPixels.transparent, backgroundPixels.transparent, `${caseId}: transparent silhouette pixels must exactly preserve final rendered background`);
      assert.notDeepEqual(normalPixels.opaque, backgroundPixels.opaque, `${caseId}: opaque body/lid pixels must replace the final rendered background`);
      await hidden.close();

      if(!result.cadence){
        result.cadence = await page.evaluate(() => new Promise((resolve) => {
          const times = [];
          const start = performance.now();
          function sample(timestamp){
            times.push(timestamp);
            if(times.length < 61){ requestAnimationFrame(sample); return; }
            const intervals = times.slice(1).map((value, index) => value - times[index]).sort((a, b) => a - b);
            resolve({
              elapsedMs: performance.now() - start,
              medianMs: intervals[Math.floor(intervals.length * 0.5)],
              p95Ms: intervals[Math.floor(intervals.length * 0.95)],
              framesPerSecond: 1000 / (intervals.reduce((sum, value) => sum + value, 0) / intervals.length)
            });
          }
          requestAnimationFrame(sample);
        }));
        assert(result.cadence.framesPerSecond >= 30, `steady alpha-cutout rendering must remain above 30 FPS in the browser smoke: ${JSON.stringify(result.cadence)}`);
      }
      result.views[caseId] = { ...proof, imageDataReadsAfterWarmup:readsAfterWarmup, imageDataReadsAfterSteadyFrames:readsAfterSteadyFrames, normalPixels, backgroundPixels };
      await page.screenshot({ path: path.join(runDir, `${caseId}.png`), fullPage: true });
      await page.close();
    }
    const spritePage = await context.newPage();
    spritePage.on('pageerror', (error) => result.pageErrors.push(`sprite-proof: ${String(error.stack || error)}`));
    spritePage.on('console', (message) => { if (message.type() === 'error') result.consoleErrors.push(`sprite-proof: ${message.text()}`); });
    spritePage.on('request', (request) => { if (/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.externalRequests.push(`sprite-proof: ${request.url()}`); });
    await spritePage.goto(`${result.url}?cutoutproof=1&cutoutview=front&cutoutrotation=0`, { waitUntil:'load', timeout:15000 });
    await spritePage.locator('[data-action="custom-level-dumpster_pilot"]').click();
    await spritePage.waitForFunction(() => {
      const proof = window.SNCDiagnostics.getSnapshot().alphaCutout;
      return proof && proof.spriteVisibleThroughTransparentPixels > 0 && proof.spriteHiddenBehindOpaquePixels > 0;
    }, null, { timeout:10000 });
    result.spriteProof = await spritePage.evaluate(() => window.SNCDiagnostics.getSnapshot().alphaCutout);
    assert(result.spriteProof.spriteVisibleThroughTransparentPixels > 0, 'a sprite behind the dumpster must be visible through transparent cutout pixels');
    assert(result.spriteProof.spriteHiddenBehindOpaquePixels > 0, 'a sprite behind the dumpster must be hidden by opaque cutout pixels');
    await spritePage.close();
    assert.equal(result.pageErrors.length, 0, `page errors: ${result.pageErrors.join('; ')}`);
    assert.equal(result.consoleErrors.length, 0, `console errors: ${result.consoleErrors.join('; ')}`);
    assert.equal(result.externalRequests.length, 0, `external requests: ${result.externalRequests.join('; ')}`);
    result.pass = true;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, 'result.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
  }
  process.stdout.write(`${JSON.stringify({ pass: result.pass, output: path.relative(root, path.join(runDir, 'result.json')), views: Object.keys(result.views) })}\n`);
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
