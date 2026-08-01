'use strict';

// Focused visual-review evidence. It serves the canonical single-file build and
// captures 400x844 portrait poses without adding any runtime-only test surface.
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'index.html');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'world-1-level-1-visual-refinement', 'visual-capture.json'));

function assertOutputPath(target) {
  const evidenceRoot = path.join(root, 'test-results');
  const relative = path.relative(evidenceRoot, target);
  assert(relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative), 'output must stay below ignored test-results');
}
function serve(html) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      if(pathname === '/' || pathname === '/index.html') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        response.end(html); return;
      }
      response.writeHead(404); response.end('not found');
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}
async function main() {
  assertOutputPath(output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const observed = { consoleErrors: [], pageErrors: [], externalRequests: [] };
  const result = { pass: false, screenshots: [], observed, checks: {}, errors: [] };
  let server, browser, context, page;
  try {
    ({ server, url: result.url } = await serve(fs.readFileSync(artifact, 'utf8')));
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 400, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('console', (message) => { if(message.type() === 'error') observed.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => observed.pageErrors.push(String(error.stack || error)));
    page.on('request', (request) => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) observed.externalRequests.push(request.url()); });
    await page.goto(result.url + '?mobile=on&portraitlayout=1', { waitUntil: 'load' });
    await page.waitForSelector('[data-action="title-start"]', { state: 'visible', timeout: 10000 });
    await page.locator('[data-action="title-start"]').click();
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().runtime.state === 'play');
    await page.waitForSelector('#cronboardok', { state: 'visible', timeout: 10000 });
    await page.locator('#cronboardok').click();
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    await page.waitForFunction(() => Object.values(window.SOLID_HEIGHT_ASSET_REGISTRY || {}).every((asset) => Object.values(asset.materialLoadStates || {}).every((state) => state.status === 'loaded')));

    async function capture(name, pose) {
      const screenshotPath = path.join(path.dirname(output), `${name}.png`);
      const state = await page.evaluate((nextPose) => {
        player.x = nextPose.x; player.y = nextPose.y; player.angle = nextPose.angle;
        showMinimap = true;
        return { x: player.x, y: player.y, angle: player.angle, portalActive: !!(game.exit && game.exit.active), helped: game.helped, delivered: game.delivered };
      }, pose);
      await page.waitForTimeout(140);
      await page.screenshot({ path: screenshotPath });
      result.screenshots.push({ name, file: path.relative(root, screenshotPath).replace(/\\/g, '/'), state });
    }

    await capture('01-start-stand-minimap', { x: 20.5, y: 14.5, angle: -Math.PI / 2 });
    await capture('02-central-planter-cluster', { x: 7.8, y: 13.4, angle: Math.atan2(10.5 - 13.4, 10.8 - 7.8) });
    await capture('03-outer-planter-cluster', { x: 26.0, y: 15.5, angle: Math.atan2(12.6 - 15.5, 29.6 - 26.0) });
    await capture('04-central-route', { x: 13.5, y: 14.5, angle: 0 });
    await capture('05-outer-route-market', { x: 34.0, y: 16.0, angle: -Math.PI / 2 });
    await capture('06-neighbor-delivery-area', { x: 8.5, y: 12.5, angle: -Math.PI / 2 });
    await capture('07-family-delivery-area', { x: 20.5, y: 6.5, angle: -Math.PI / 2 });
    await capture('08-elder-delivery-area', { x: 32.5, y: 15.5, angle: -Math.PI / 2 });
    await capture('09-inactive-portal-at-stand', { x: 20.5, y: 14.5, angle: -Math.PI / 2 });

    result.delivery = await page.evaluate(() => {
      for(const kind of ['hungry', 'family', 'elder']) {
        const npc = game.npcs.find((candidate) => candidate.kind === kind && !candidate.helped);
        if(!npc) throw new Error(`missing recipient ${kind}`);
        player.x = npc.x; player.y = npc.y; player.cans = npc.need; player.giveCD = 0; game.aimNpc = npc;
        giveCan();
      }
      return { helped: game.helped, delivered: game.delivered, portalActive: !!game.exit.active };
    });
    await capture('10-active-portal-at-stand', { x: 20.5, y: 14.5, angle: -Math.PI / 2 });
    result.checks = {
      exactPortraitViewport: true,
      captures: result.screenshots.length === 10,
      minimapVisible: await page.locator('#view').evaluate(() => typeof showMinimap === 'boolean' && showMinimap === true),
      inactivePortalCaptured: result.screenshots.find((entry) => entry.name === '09-inactive-portal-at-stand').state.portalActive === false,
      finalDeliveryActivatesPortal: result.delivery.helped === 3 && result.delivery.delivered === 5 && result.delivery.portalActive === true,
      activePortalCaptured: result.screenshots.find((entry) => entry.name === '10-active-portal-at-stand').state.portalActive === true,
      noErrors: observed.consoleErrors.length === 0 && observed.pageErrors.length === 0 && observed.externalRequests.length === 0
    };
    result.pass = Object.values(result.checks).every(Boolean);
  } catch(error) { result.errors.push(String(error.stack || error)); }
  finally {
    for(const resource of [page, context, browser]) if(resource) await resource.close();
    if(server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  if(result.errors.length) result.pass = false;
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ pass: result.pass, output: path.relative(root, output), checks: result.checks, errors: result.errors }));
  if(!result.pass) process.exitCode = 1;
}
main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
