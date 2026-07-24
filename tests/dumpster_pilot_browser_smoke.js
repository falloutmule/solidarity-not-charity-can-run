'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'index.html');
const output = path.join(root, 'test-results', 'dumpster-pilot-route', `browser-smoke-${process.pid}.json`);
const screenshot = output.replace(/\.json$/, '.png');

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
  const observed = { pageErrors: [], consoleErrors: [], externalRequests: [] };
  const result = { pass: false, observed, checks: {}, errors: [] };
  let browser; let context; let page; let server;
  try {
    ({ server, url: result.url } = await serve(html));
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('pageerror', (error) => observed.pageErrors.push(String(error.stack || error)));
    page.on('console', (message) => { if (message.type() === 'error') observed.consoleErrors.push(message.text()); });
    page.on('request', (request) => { if (/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) observed.externalRequests.push(request.url()); });
    await page.goto(result.url, { waitUntil: 'load', timeout: 15000 });
    const entry = page.locator('[data-action="custom-level-dumpster_pilot"]');
    await entry.waitFor({ state: 'visible', timeout: 10000 });
    result.checks.menuEntry = await entry.innerText() === 'DUMPSTER PILOT';
    await entry.click();
    await page.waitForTimeout(500);
    const snapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    result.checks.playReached = snapshot.runtime.state === 'play';
    result.checks.canvasVisible = await page.locator('#view').evaluate((canvas) => canvas.width > 0 && canvas.height > 0 && canvas.getContext('2d').getImageData(0, 0, Math.min(64, canvas.width), Math.min(64, canvas.height)).data.some((value) => value !== 0));
    await page.screenshot({ path: screenshot, fullPage: true });
    result.screenshot = path.relative(root, screenshot);
    result.checks.clean = observed.pageErrors.length === 0 && observed.consoleErrors.length === 0 && observed.externalRequests.length === 0;
    result.pass = Object.values(result.checks).every(Boolean);
  } catch (error) {
    result.errors.push(String(error.stack || error));
  } finally {
    for (const resource of [page, context, browser]) if (resource) await resource.close();
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ pass: result.pass, output: path.relative(root, output), checks: result.checks, errors: result.errors }));
  assert(result.pass, `dumpster pilot browser smoke failed: ${result.errors.join('; ')}`);
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
