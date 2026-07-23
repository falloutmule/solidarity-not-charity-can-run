'use strict';

/**
 * Production release smoke. This deliberately uses only normal DOM/input
 * behavior and SNCDiagnostics' read-only snapshot; test-harness CR APIs are
 * exercised only by the run-local self-check artifact.
 */
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'index.html');
const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, 'project-metadata.json'), 'utf8'));
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(ROOT, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'minimal-release', `production-smoke-${process.pid}.json`));

function assertOutputPath(target) {
  const root = path.join(ROOT, 'test-results');
  const relative = path.relative(root, target);
  assert(relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative), 'output must be below ignored test-results');
}

async function serve(html) {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/' || pathname === '/index.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end(html);
      return;
    }
    response.writeHead(404); response.end('not found');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

async function main() {
  assertOutputPath(output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const html = fs.readFileSync(ARTIFACT, 'utf8');
  assert(!html.includes('globalThis.CR = window.CR'), 'production artifact must not expose mutable CR');
  assert(!html.includes('runFullSelfCheck'), 'production artifact must not include self-check lifecycle');
  assert(!html.includes('__crVisualQaReady'), 'production artifact must not include visual-QA route');
  const observed = { consoleErrors: [], pageErrors: [], externalRequests: [] };
  let browser; let context; let page; let server;
  const result = { pass: false, buildId: metadata.runtime.buildId, observed, checks: {}, diagnostics: null, errors: [] };
  try {
    ({ server, url: result.url } = await serve(html));
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('console', (message) => { if (message.type() === 'error') observed.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => observed.pageErrors.push(String(error.stack || error)));
    page.on('request', (request) => { if (/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) observed.externalRequests.push(request.url()); });
    await page.goto(result.url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForSelector('[data-action="title-start"]', { state: 'visible', timeout: 10000 });
    result.checks.noMutableCr = await page.evaluate(() => !Object.prototype.hasOwnProperty.call(window, 'CR'));
    result.checks.diagnosticsAvailable = await page.evaluate(() => !!window.SNCDiagnostics && typeof window.SNCDiagnostics.getSnapshot === 'function');
    await page.locator('[data-action="title-start"]').click();
    await page.waitForTimeout(350);
    await page.keyboard.down('w');
    await page.keyboard.down('e');
    await page.waitForTimeout(700);
    await page.keyboard.up('e');
    await page.keyboard.up('w');
    result.diagnostics = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    result.checks.playReached = result.diagnostics.runtime.state === 'play';
    result.checks.hudVisible = await page.locator('#view').evaluate((canvas) => canvas.width > 0 && canvas.height > 0 && canvas.getContext('2d').getImageData(0, 0, Math.min(48, canvas.width), Math.min(48, canvas.height)).data.some((value) => value !== 0));
    result.checks.buildId = result.diagnostics.buildId === metadata.runtime.buildId;
    result.checks.fixedStep = result.diagnostics.fixedStep.enabled === true && result.diagnostics.fixedStep.stepDt === (1 / 60);
    result.checks.noErrors = observed.consoleErrors.length === 0 && observed.pageErrors.length === 0 && observed.externalRequests.length === 0;
    result.pass = Object.values(result.checks).every(Boolean);
  } catch (error) {
    result.errors.push(String(error.stack || error));
  } finally {
    for (const resource of [page, context, browser]) if (resource) await resource.close();
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  if (result.errors.length) result.pass = false;
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ pass: result.pass, output: path.relative(ROOT, output), checks: result.checks, errors: result.errors }));
  if (!result.pass) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
