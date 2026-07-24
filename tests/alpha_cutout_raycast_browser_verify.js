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
  const result = { pass: false, views: {}, pageErrors: [], consoleErrors: [], externalRequests: [] };
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
      page.on('pageerror', (error) => result.pageErrors.push(`${caseId}: ${String(error.stack || error)}`));
      page.on('console', (message) => { if (message.type() === 'error') result.consoleErrors.push(`${caseId}: ${message.text()}`); });
      page.on('request', (request) => { if (/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.externalRequests.push(`${caseId}: ${request.url()}`); });
      await page.goto(`${result.url}?cutoutproof=1&cutoutview=${view}&cutoutrotation=${rotation}`, { waitUntil: 'load', timeout: 15000 });
      await page.locator('[data-action="custom-level-dumpster_pilot"]').click();
      await page.waitForFunction(() => {
        const proof = window.SNCDiagnostics.getSnapshot().alphaCutout;
        return proof && proof.enabled && proof.opaquePixels > 0 && proof.transparentPixels > 0 && proof.sampleOpaque && proof.sampleTransparent;
      }, null, { timeout: 10000 });
      const proof = await page.evaluate(() => window.SNCDiagnostics.getSnapshot().alphaCutout);
      assert.equal(proof.opaqueDepthWrites, proof.opaquePixels, `${caseId}: each opaque cutout sample must write front depth`);
      assert.equal(proof.transparentDepthPreserved, proof.transparentPixels, `${caseId}: transparent cutout samples must preserve background depth`);
      assert.equal(proof.transparentColorPreserved, proof.transparentPixels, `${caseId}: transparent cutout samples must preserve rendered background color`);
      assert(proof.opaqueColorReplaced > 0, `${caseId}: opaque dumpster pixels must replace the bright striped background`);
      assert(proof.backgroundDepthWrites > 0, `${caseId}: actual ray continuation must render a background wall`);
      assert(proof.sampleOpaque.depthAfter < proof.sampleOpaque.depthBefore, `${caseId}: opaque sample must own nearer depth`);
      assert.equal(proof.sampleTransparent.depthAfter, proof.sampleTransparent.depthBefore, `${caseId}: transparent sample must retain background depth`);
      assert.deepEqual(proof.sampleTransparent.composite, proof.sampleTransparent.background, `${caseId}: transparent sample must exactly retain fogged/ shaded background color`);
      assert.notDeepEqual(proof.sampleOpaque.composite, proof.sampleOpaque.background, `${caseId}: opaque body/lid sample must not leak background`);
      result.views[caseId] = proof;
      await page.screenshot({ path: path.join(runDir, `${caseId}.png`), fullPage: true });
      await page.close();
    }
    const all = Object.values(result.views);
    assert(all.some((proof) => proof.spriteVisibleThroughTransparentPixels > 0), 'a sprite behind the dumpster must be visible through transparent cutout pixels');
    assert(all.some((proof) => proof.spriteHiddenBehindOpaquePixels > 0), 'a sprite behind the dumpster must be hidden by opaque cutout pixels');
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
