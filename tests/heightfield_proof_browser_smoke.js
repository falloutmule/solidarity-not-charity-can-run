'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const artifact = path.join(ROOT, 'index.html');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(ROOT, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'raycaster-variable-height-mvp', `heightfield-smoke-${process.pid}.json`));
function serve(html) { return new Promise((resolve, reject) => {
  const server = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
  server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
}); }
async function main(){
  assert(output.startsWith(path.join(ROOT, 'test-results') + path.sep), 'output remains ignored');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const result = { pass: false, checks: {}, observed: { pageErrors: [], consoleErrors: [], externalRequests: [] }, poses: [], errors: [] };
  let server, browser, context, page;
  try {
    ({ server, url: result.url } = await serve(fs.readFileSync(artifact, 'utf8')));
    browser = await chromium.launch(); context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('console', (message) => { if(message.type() === 'error') result.observed.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => result.observed.pageErrors.push(String(error.stack || error)));
    page.on('request', (request) => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.observed.externalRequests.push(request.url()); });
    await page.goto(result.url, { waitUntil: 'load' });
    const plainSnapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const sentinel = '{"heightfield":"save-isolated"}';
    await page.evaluate((value) => localStorage.setItem('cannedRun.save.v1', value), sentinel);
    const proofCases = [
      { pose: 'south-far', rotation: 0 }, { pose: 'south-far', rotation: 1 },
      { pose: 'south-far', rotation: 2 }, { pose: 'south-far', rotation: 3 },
      { pose: 'south-near', rotation: 1 }, { pose: 'southwest-corner', rotation: 1 },
      { pose: 'southeast-corner', rotation: 1 }, { pose: 'top-oblique', rotation: 1 }
    ];
    for (const { pose, rotation } of proofCases) {
      await page.goto(`${result.url}?heightfield=1&hfpose=${pose}&hfrot=${rotation}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().runtime.customLevel === 'heightfield_proof');
      await page.waitForTimeout(150);
      const snapshot = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
      const screenshot = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), `heightfield-${pose}-r${rotation}.png`) });
      result.poses.push({ pose, rotation, screenshotSha256: crypto.createHash('sha256').update(screenshot).digest('hex'), heightfield: snapshot.heightfield, player: snapshot.runtime.player });
    }
    const mainPose = result.poses.find((entry) => entry.pose === 'south-far' && entry.rotation === 1);
    const nearPose = result.poses.find((entry) => entry.pose === 'south-near');
    const topPose = result.poses.find((entry) => entry.pose === 'top-oblique');
    const rotationPoses = result.poses.filter((entry) => entry.pose === 'south-far');
    await page.goto(`${result.url}?heightfield=1&hfpose=south-near&hfrot=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().runtime.customLevel === 'heightfield_proof');
    const beforeMove = await page.evaluate(() => window.SNCDiagnostics.getSnapshot().runtime.player);
    await page.keyboard.down('w'); await page.waitForTimeout(2000); await page.keyboard.up('w');
    const afterMove = await page.evaluate(() => ({ snapshot: window.SNCDiagnostics.getSnapshot(), saved: localStorage.getItem('cannedRun.save.v1') }));
    result.checks.queryGate = plainSnapshot.runtime.customLevel !== 'heightfield_proof';
    result.checks.proof = mainPose.heightfield.enabled === true && mainPose.heightfield.profileCells === 1;
    result.checks.depth = mainPose.heightfield.worldDepthLength === 100000 && mainPose.heightfield.worldDepthBytes === 400000 && mainPose.heightfield.worldDepthWrites > 0;
    result.checks.closeRange = nearPose.heightfield.topPixels > mainPose.heightfield.topPixels && nearPose.heightfield.verticalSegments > 0;
    result.checks.topPlane = topPose.heightfield.topPixels > 0;
    result.checks.spriteOcclusion = mainPose.heightfield.spriteVisiblePixels > 0 && mainPose.heightfield.spriteOccludedPixels > 0;
    result.checks.poses = result.poses.every((entry) => entry.heightfield.verticalSegments > 0);
    result.checks.rotations = rotationPoses.length === 4 && new Set(rotationPoses.map((entry) => entry.screenshotSha256)).size === 4;
    result.checks.collision = beforeMove.y === 8.8 && afterMove.snapshot.runtime.player.y > 8.1;
    result.checks.saveIsolation = afterMove.saved === sentinel;
    result.checks.noErrors = Object.values(result.observed).every((items) => items.length === 0);
    result.pass = Object.values(result.checks).every(Boolean);
  } catch(error) { result.errors.push(String(error.stack || error)); }
  finally { for(const resource of [page, context, browser]) if(resource) await resource.close(); if(server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  if(result.errors.length) result.pass = false;
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ pass: result.pass, checks: result.checks, output: path.relative(ROOT, output), errors: result.errors }));
  if(!result.pass) process.exitCode = 1;
}
main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
