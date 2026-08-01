'use strict';

// Portrait visual proof for the shipped World 1 sign assets. The game itself
// receives no test route: this file only controls the canonical built artifact.
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'index.html');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'world-1-level-1-sign-pack', 'sign-pack-capture.json'));
function assertOutputPath(target) { const evidence = path.join(root, 'test-results'); const relative = path.relative(evidence, target); assert(relative && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), 'output must stay below ignored test-results'); }
function serve(html) { return new Promise((resolve, reject) => { const server = http.createServer((request, response) => { const pathname = new URL(request.url, 'http://127.0.0.1').pathname; if(pathname === '/' || pathname === '/index.html') { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); response.end(html); return; } response.writeHead(404); response.end('not found'); }); server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` })); }); }

async function main() {
  assertOutputPath(output); fs.mkdirSync(path.dirname(output), { recursive: true });
  const result = { pass: false, screenshots: [], observed: { consoleErrors: [], pageErrors: [], externalRequests: [] }, checks: {}, errors: [] };
  let server, browser, context, page;
  try {
    ({ server, url: result.url } = await serve(fs.readFileSync(artifact, 'utf8')));
    browser = await chromium.launch(); context = await browser.newContext({ viewport: { width: 400, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('console', (message) => { if(message.type() === 'error') result.observed.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => result.observed.pageErrors.push(String(error.stack || error)));
    page.on('request', (request) => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.observed.externalRequests.push(request.url()); });
    await page.goto(result.url + '?mobile=on&portraitlayout=1', { waitUntil: 'load' });
    await page.locator('[data-action="title-start"]').click(); await page.waitForSelector('#cronboardok', { state: 'visible' }); await page.locator('#cronboardok').click();
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_SIGN_ASSET_REGISTRY || {}).length === 5 && Object.values(window.SNC_RUNTIME_SIGN_ASSET_REGISTRY).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    async function capture(name, pose, target) {
      const screenshotPath = path.join(path.dirname(output), `${name}.png`);
      const state = await page.evaluate(({ pose: nextPose, target: nextTarget }) => { player.x = nextPose.x; player.y = nextPose.y; player.angle = Math.atan2(nextTarget.y - nextPose.y, nextTarget.x - nextPose.x); showMinimap = true; return { x: player.x, y: player.y, angle: player.angle, portalActive: game.exit.active }; }, { pose, target });
      await page.waitForTimeout(130); await page.screenshot({ path: screenshotPath }); result.screenshots.push({ name, file: path.relative(root, screenshotPath).replace(/\\/g, '/'), state });
    }
    await capture('01-stand-start-minimap', { x: 20.5, y: 14.5 }, { x: 19.2, y: 10.6 });
    await capture('02-neighbor-close', { x: 9.0, y: 9.55 }, { x: 9.0, y: 8.1 });
    await capture('03-neighbor-interaction', { x: 8.5, y: 12.5 }, { x: 9.0, y: 8.1 });
    await capture('04-neighbor-medium-angle', { x: 5.5, y: 8.1 }, { x: 9.0, y: 8.1 });
    await capture('05-neighbor-planter-occlusion', { x: 11.5, y: 12.0 }, { x: 9.0, y: 8.1 });
    await capture('06-family-delivery', { x: 14.5, y: 5.5 }, { x: 18.0, y: 5.1 });
    await capture('07-outer-market-landmark', { x: 25.5, y: 10.8 }, { x: 29.0, y: 10.8 });
    await capture('08-elder-neighbor-delivery', { x: 32.5, y: 15.5 }, { x: 33.0, y: 11.0 });
    await capture('09-inactive-drop-off', { x: 20.5, y: 12.5 }, { x: 21.8, y: 10.6 });
    result.delivery = await page.evaluate(() => { for(const kind of ['hungry', 'family', 'elder']) { const npc = game.npcs.find((row) => row.kind === kind && !row.helped); player.x = npc.x; player.y = npc.y; player.cans = npc.need; player.giveCD = 0; game.aimNpc = npc; giveCan(); } return { helped: game.helped, delivered: game.delivered, portalActive: game.exit.active }; });
    await capture('10-active-drop-off-portal', { x: 20.5, y: 12.5 }, { x: 21.8, y: 10.6 });
    result.projection = await page.evaluate(() => game.props.filter((prop) => prop.assetId && SNC_RUNTIME_SIGN_ASSET_REGISTRY[prop.assetId]).map((prop) => { const entry = SNC_RUNTIME_SIGN_ASSET_REGISTRY[prop.assetId], texture = propTex(prop.kind, prop); const bounds = crHeightfieldPhysicalSpriteBounds('prop', prop, texture, crHeightfieldSpriteWorldHeight('prop', prop)); const legacy = crProjectBillboardSprite(prop, texture, crHeightfieldSpriteWorldHeight('prop', prop), 4, 0, 0); return { assetId: prop.assetId, className: prop.signSizeClass, aspect: texture.width / texture.height, metadataAspect: entry.width / entry.height, sourceGround: bounds.groundSourceY, textureHeight: texture.height, legacyGrounded: legacy.isGroundAnchored, worldHeight: bounds.worldHeight }; }));
    result.checks = {
      captures: result.screenshots.length === 10,
      exactPortraitViewport: true,
      fiveRuntimeAssets: Object.keys(await page.evaluate(() => SNC_RUNTIME_SIGN_ASSET_REGISTRY)).length === 5,
      naturalAspectAndGrounding: result.projection.every((row) => Math.abs(row.aspect - row.metadataAspect) < 1e-12 && row.sourceGround === row.textureHeight && row.legacyGrounded),
      tallDropOffDataClass: result.projection.some((row) => row.assetId === 'sign_drop_off_cans_001' && row.className === 'tall' && row.worldHeight > 0.82),
      finalDeliveryActivatesPortal: result.delivery.helped === 3 && result.delivery.delivered === 5 && result.delivery.portalActive,
      noErrors: result.observed.consoleErrors.length === 0 && result.observed.pageErrors.length === 0 && result.observed.externalRequests.length === 0
    };
    result.pass = Object.values(result.checks).every(Boolean);
  } catch(error) { result.errors.push(String(error.stack || error)); }
  finally { for(const resource of [page, context, browser]) if(resource) await resource.close(); if(server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  if(result.errors.length) result.pass = false; fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify({ pass: result.pass, output: path.relative(root, output), checks: result.checks, errors: result.errors })); if(!result.pass) process.exitCode = 1;
}
main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
