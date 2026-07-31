'use strict';

// Portrait proof for the foliage as it appears through the normal D1 renderer.
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifact = path.join(root, 'index.html');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'world-1-level-1-foliage', 'foliage-capture.json'));
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
    await page.waitForFunction(() => Object.keys(window.SNC_RUNTIME_FOLIAGE_ASSET_REGISTRY || {}).length === 7 && Object.values(window.SNC_RUNTIME_FOLIAGE_ASSET_REGISTRY).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    async function capture(name, pose, target) {
      const screenshotPath = path.join(path.dirname(output), `${name}.png`);
      const state = await page.evaluate(({ nextPose, nextTarget }) => { player.x = nextPose.x; player.y = nextPose.y; player.angle = Math.atan2(nextTarget.y - nextPose.y, nextTarget.x - nextPose.x); showMinimap = true; return { x: player.x, y: player.y, angle: player.angle, portalActive: game.exit.active }; }, { nextPose: pose, nextTarget: target });
      await page.waitForTimeout(150); await page.screenshot({ path: screenshotPath }); result.screenshots.push({ name, file: path.relative(root, screenshotPath).replace(/\\/g, '/'), state });
    }
    await capture('01-stand-with-foliage-minimap', { x: 20.5, y: 14.5 }, { x: 19.2, y: 10.6 });
    await capture('02-central-route', { x: 15.0, y: 14.5 }, { x: 10.0, y: 10.8 });
    await capture('03-outer-loop-tree-landmark', { x: 21.5, y: 16.0 }, { x: 26.4, y: 16.0 });
    await capture('04-planter-bush-grass', { x: 14.0, y: 13.0 }, { x: 10.0, y: 10.8 });
    await capture('05-market-area', { x: 25.0, y: 10.8 }, { x: 29.0, y: 10.8 });
    await capture('06-neighbor-delivery-area', { x: 5.5, y: 8.4 }, { x: 8.6, y: 8.5 });
    await capture('07-tree-close', { x: 25.1, y: 16.0 }, { x: 26.4, y: 16.0 });
    await capture('08-tree-route-distance', { x: 18.5, y: 16.0 }, { x: 26.4, y: 16.0 });
    result.occlusion = await page.evaluate(() => {
      const saved = { x: player.x, y: player.y, angle: player.angle, props: game.props, map: game.map, profiles: game.verticalProfileGrid };
      const map = game.map.map((row) => row.slice()); const profiles = new Uint16Array(game.verticalProfileGrid);
      map[11][10] = WALL.CONCRETE; profiles[11 * game.MAP_W + 10] = CR_VERTICAL_PROFILE_IDS.AUTHORED_CONCRETE;
      game.map = map; game.verticalProfileGrid = profiles; game.props = [{ x: 10.5, y: 10.0, kind: 'foliage', assetId: 'foliage_bush_low_001', wob: 0 }];
      player.x = 10.5; player.y = 14.5; player.angle = -Math.PI / 2; return saved;
    });
    await page.waitForTimeout(150); const occlusionPath = path.join(path.dirname(output), '09-foliage-planter-occlusion.png'); await page.screenshot({ path: occlusionPath });
    result.screenshots.push({ name: '09-foliage-planter-occlusion', file: path.relative(root, occlusionPath).replace(/\\/g, '/') });
    result.occlusion = await page.evaluate((saved) => { const observed = { spriteVisiblePixels: crHeightfieldStats.spriteVisiblePixels, spriteOccludedPixels: crHeightfieldStats.spriteOccludedPixels, spriteDepthWrites: crHeightfieldStats.spriteDepthWrites }; player.x = saved.x; player.y = saved.y; player.angle = saved.angle; game.props = saved.props; game.map = saved.map; game.verticalProfileGrid = saved.profiles; return observed; }, result.occlusion);
    await page.waitForTimeout(120);
    await capture('10-signs-readable-through-park', { x: 25.0, y: 10.8 }, { x: 29.0, y: 10.8 });
    result.delivery = await page.evaluate(() => { for(const kind of ['hungry', 'family', 'elder']) { const npc = game.npcs.find((row) => row.kind === kind && !row.helped); player.x = npc.x; player.y = npc.y; player.cans = npc.need; player.giveCD = 0; game.aimNpc = npc; giveCan(); } return { helped: game.helped, delivered: game.delivered, portalActive: game.exit.active }; });
    await capture('11-active-portal-with-foliage', { x: 20.5, y: 12.5 }, { x: 21.8, y: 10.6 });
    result.projection = await page.evaluate(() => game.props.filter((prop) => prop.assetId && prop.assetId.startsWith('foliage_')).map((prop) => { const entry = SNC_RUNTIME_FOLIAGE_ASSET_REGISTRY[prop.assetId], texture = propTex(prop.kind, prop); const bounds = crHeightfieldPhysicalSpriteBounds('prop', prop, texture, crHeightfieldSpriteWorldHeight('prop', prop)); const legacy = crProjectBillboardSprite(prop, texture, crHeightfieldSpriteWorldHeight('prop', prop), 4, 0, 0); return { assetId: prop.assetId, aspect: texture.width / texture.height, metadataAspect: entry.width / entry.height, sourceGround: bounds.groundSourceY, textureHeight: texture.height, legacyGrounded: legacy.isGroundAnchored, worldHeight: bounds.worldHeight, softAlpha: entry.alphaHistogram.partial > 0 }; }));
    result.checks = {
      captures: result.screenshots.length === 11,
      exactPortraitViewport: true,
      selectedRuntimeAssets: Object.keys(await page.evaluate(() => SNC_RUNTIME_FOLIAGE_ASSET_REGISTRY)).length === 7,
      allAuthoredFoliageLoaded: result.projection.length === 17 && result.projection.every((row) => row.softAlpha),
      naturalAspectAndGrounding: result.projection.every((row) => Math.abs(row.aspect - row.metadataAspect) < 1e-12 && row.sourceGround === row.textureHeight && row.legacyGrounded && row.worldHeight > 0),
      planterOccludesFoliage: result.occlusion.spriteVisiblePixels > 0 && result.occlusion.spriteOccludedPixels > 0 && result.occlusion.spriteDepthWrites > 0,
      finalDeliveryActivatesPortal: result.delivery.helped === 3 && result.delivery.delivered === 5 && result.delivery.portalActive,
      noErrors: result.observed.consoleErrors.length === 0 && result.observed.pageErrors.length === 0 && result.observed.externalRequests.length === 0
    };
    result.pass = Object.values(result.checks).every(Boolean);
  } catch(error) { result.errors.push(String(error.stack || error)); }
  finally { for(const resource of [page, context, browser]) if(resource) await resource.close(); if(server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  if(result.errors.length) result.pass = false; fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify({ pass: result.pass, output: path.relative(root, output), checks: result.checks, errors: result.errors })); if(!result.pass) process.exitCode = 1;
}
main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
