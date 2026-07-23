'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'index.html');
const OUTPUT = path.join(ROOT, 'test-results', 'p5-003', `diagnostic-query-smoke-${process.pid}.json`);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build-manifest.json'), 'utf8'));
const productionInputs = [manifest.template, manifest.body, ...manifest.styles, ...manifest.scripts];
const retired = ['touchdebug', 'layoutdebug'];

function serve(bytes) {
  const server = http.createServer((request, response) => {
    if (new URL(request.url, 'http://127.0.0.1').pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(bytes);
      return;
    }
    response.writeHead(404); response.end('not found');
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

function observe(page, origin) {
  const observed = { consoleErrors: [], pageErrors: [], externalRequests: [] };
  page.on('console', (message) => { if (message.type() === 'error') observed.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => observed.pageErrors.push(String(error.stack || error)));
  page.on('request', (request) => {
    if (/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) observed.externalRequests.push(request.url());
  });
  return observed;
}

async function startNewRun(page) {
  await page.locator('[data-action="title-start"]').click();
  await page.waitForFunction(() => window.SNCDiagnostics.getSnapshot().runtime.state === 'play', null, { timeout: 10000 });
  if (await page.locator('#cronboard.show').count()) await page.locator('#cronboardok').click();
  await page.waitForFunction(() => {
    const runtime = window.SNCDiagnostics.getSnapshot().runtime;
    return runtime.state === 'play' && !runtime.paused;
  }, null, { timeout: 5000 });
}

async function smokeRetiredQuery(browser, url, query) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const observed = observe(page, new URL(url).origin);
  const result = { query, observed, checks: {} };
  try {
    await page.goto(`${url}?${query}=1`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForSelector('[data-action="title-start"]', { state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => !!window.SNCDiagnostics && typeof window.SNCDiagnostics.getSnapshot === 'function');
    await startNewRun(page);
    const snapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    result.checks.playReached = snapshot.runtime.state === 'play' && !snapshot.runtime.paused;
    result.checks.portraitCanvas = await page.locator('#view').evaluate((canvas) => canvas.width > 0 && canvas.height > 0);
    result.checks.noRetiredOverlay = await page.evaluate(() => !document.getElementById('touchdebug') && !document.querySelector('._ldbg'));
    result.checks.noErrors = observed.consoleErrors.length === 0 && observed.pageErrors.length === 0 && observed.externalRequests.length === 0;
  } finally {
    await context.close();
  }
  assert(Object.values(result.checks).every(Boolean), `${query} is not a harmless ignored parameter: ${JSON.stringify(result)}`);
  return result;
}

async function main() {
  for (const relativePath of productionInputs) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    for (const symbol of retired) assert(!source.includes(symbol), `retired diagnostic remains in production source: ${relativePath} (${symbol})`);
  }
  const artifact = fs.readFileSync(ARTIFACT, 'utf8');
  for (const symbol of retired) assert(!artifact.includes(symbol), `retired diagnostic remains in generated artifact: ${symbol}`);
  assert(artifact.includes('perfprobe'), 'retained perfprobe route is missing from production artifact');
  assert(artifact.includes('facadedebug'), 'retained facadedebug route is missing from production artifact');

  const { server, url } = await serve(Buffer.from(artifact));
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const query of retired) results.push(await smokeRetiredQuery(browser, url, query));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({ pass: true, results }, null, 2));
  console.log(`unowned_diagnostics_retirement_verify: PASS ${OUTPUT}`);
}

main().catch((error) => { console.error(`unowned_diagnostics_retirement_verify: FAIL ${error.stack || error}`); process.exitCode = 1; });
