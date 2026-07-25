'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'index.html');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'project-metadata.json'), 'utf8'));
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'runtime-asset-gallery', `smoke-${process.pid}.json`));

function serve(html){
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      if(pathname === '/' || pathname === '/index.html') { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); return; }
      response.writeHead(404); response.end('not found');
    });
    server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}
async function main(){
  assert(output.startsWith(path.join(root, 'test-results') + path.sep), 'run output stays ignored');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const observed = { consoleErrors: [], pageErrors: [], externalRequests: [] };
  const result = { pass: false, checks: {}, observed, errors: [] };
  let server, browser, context, page;
  try {
    ({ server, url: result.url } = await serve(fs.readFileSync(artifact, 'utf8')));
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('console', (message) => { if(message.type() === 'error') observed.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => observed.pageErrors.push(String(error.stack || error)));
    page.on('request', (request) => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) observed.externalRequests.push(request.url()); });
    await page.goto(result.url, { waitUntil: 'load' });
    await page.waitForSelector('[data-action="title-start"]');
    const beforeSave = '{"gallery":"sentinel"}';
    await page.evaluate((value) => { localStorage.setItem('cannedRun.save.v1', value); localStorage.setItem('__rag_gallery_sentinel', value); }, beforeSave);
    await page.goto(result.url + '?assetgallery=1', { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().runtime.assetGallery && window.SNCDiagnostics.getSnapshot().runtime.assetGallery.active === true);
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    const beforeMove = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    await page.keyboard.press('p');
    await page.waitForTimeout(80);
    await page.keyboard.press('p');
    await page.keyboard.press('r');
    await page.waitForTimeout(80);
    await page.keyboard.down('w');
    await page.waitForTimeout(1000);
    await page.keyboard.up('w');
    await page.waitForTimeout(150);
    const afterMove = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    await page.screenshot({ path: path.join(path.dirname(output), 'gallery-portrait.png') });
    const afterSave = await page.evaluate(() => ({ saved: localStorage.getItem('cannedRun.save.v1'), sentinel: localStorage.getItem('__rag_gallery_sentinel') }));
    result.snapshot = afterMove;
    result.checks.galleryPlay = afterMove.runtime.state === 'play' && afterMove.runtime.customLevel === 'asset-gallery-v1';
    result.checks.galleryReadonly = afterMove.runtime.assetGallery && afterMove.runtime.assetGallery.exhibitCount === 13;
    result.checks.focusLabel = afterMove.runtime.assetGallery && afterMove.runtime.assetGallery.focusId === 'gallery-prop-bench-001';
    result.checks.normalControlsMove = Math.hypot(afterMove.runtime.player.x - beforeMove.runtime.player.x, afterMove.runtime.player.y - beforeMove.runtime.player.y) > 0.3;
    result.checks.saveUntouched = afterSave.saved === beforeSave && afterSave.sentinel === beforeSave;
    result.checks.keyboardIsolation = afterMove.runtime.customLevel === 'asset-gallery-v1' && afterMove.runtime.state === 'play';
    result.checks.buildIdentity = afterMove.buildId === metadata.runtime.buildId;
    result.checks.noErrors = observed.consoleErrors.length === 0 && observed.pageErrors.length === 0 && observed.externalRequests.length === 0;
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
