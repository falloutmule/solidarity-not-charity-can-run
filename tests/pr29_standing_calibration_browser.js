'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const artifactArg = process.argv.find((arg) => arg.startsWith('--artifact='));
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const artifact = path.resolve(root, artifactArg ? artifactArg.slice('--artifact='.length) : path.join('test-results', 'pr29-scale-lock-recovery-005', 'calibration-artifact', 'index.html'));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'pr29-scale-lock-recovery-005', 'standing-calibration-browser.json'));
assert(artifact.startsWith(path.join(root, 'test-results') + path.sep), 'browser test only serves the calibration artifact');
assert(output.startsWith(path.join(root, 'test-results') + path.sep), 'browser proof remains ignored');
const serve = (html) => new Promise((resolve, reject) => {
  const server = http.createServer((request, response) => { response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); });
  server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
});
const byId = (calibration, id) => calibration.subjects.find((subject) => subject.id === id);
const fixtureSource = fs.readFileSync(artifact, 'utf8');

async function main(){
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const result = { pass: false, checks: {}, observed: { pageErrors: [], consoleErrors: [], externalRequests: [] }, measurements: {}, errors: [] };
  let server, browser, context, page;
  try {
    ({ server, url: result.url } = await serve(fs.readFileSync(artifact, 'utf8')));
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    page = await context.newPage();
    const origin = new URL(result.url).origin;
    page.on('console', (message) => { if(message.type() === 'error') result.observed.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => result.observed.pageErrors.push(String(error.stack || error)));
    page.on('request', (request) => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) result.observed.externalRequests.push(request.url()); });
    await page.goto(`${result.url}?heightfield=1&hfcalibration=1&hfstandingcomparison=1&hfcalpose=equal-depth`, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const calibration = window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration;
      return calibration && calibration.subjects.some((subject) => subject.id === 'standing-078') && calibration.subjects.some((subject) => subject.id === 'standing-086');
    });
    await page.waitForFunction(() => Object.values(window.SNC_RUNTIME_ASSET_REGISTRY || {}).every((entry) => entry.image.complete && entry.image.naturalWidth > 0));
    await page.waitForTimeout(160);
    const comparison = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const screenshot = await page.locator('#view').screenshot({ path: path.join(path.dirname(output), 'standing-size-comparison.png') });
    await page.goto(`${result.url}?heightfield=1&hfcalibration=1&hfcalpose=equal-depth`, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const calibration = window.SNCDiagnostics && window.SNCDiagnostics.getSnapshot().heightfield.calibration;
      return calibration && calibration.subjects.some((subject) => subject.id === 'standing') && !calibration.subjects.some((subject) => subject.id === 'standing-078');
    });
    await page.waitForTimeout(160);
    const baseline = await page.evaluate(() => window.SNCDiagnostics.getSnapshot());
    const calibration = comparison.heightfield.calibration;
    const candidates = ['standing-078', 'standing-082', 'standing-086'].map((id) => byId(calibration, id));
    const slumped = byId(calibration, 'slumped');
    const baselineStanding = byId(baseline.heightfield.calibration, 'standing');
    const baselineSlumped = byId(baseline.heightfield.calibration, 'slumped');
    result.measurements.comparison = calibration;
    result.measurements.baseline = baseline.heightfield.calibration;
    result.measurements.screenshotSha256 = crypto.createHash('sha256').update(screenshot).digest('hex');
    result.checks.queryGate = comparison.runtime.customLevel === 'heightfield_proof' && candidates.every(Boolean) && baseline.runtime.customLevel === 'heightfield_proof' && !baseline.heightfield.calibration.subjects.some((subject) => subject.id === 'standing-078');
    result.checks.candidateValues = candidates.every(Boolean) && candidates.map((subject) => subject.worldHeight).join(',') === '0.78,0.82,0.86';
    result.checks.equalDepth = [...candidates, slumped].every((subject) => Math.abs(subject.cameraDepth - candidates[0].cameraDepth) < 1e-9);
    result.checks.sameStandingAsset = fixtureSource.includes("const standing = { calibrationId: 'standing', id: 'calibration-standing', assetId: 'npc_unhoused_work_jacket_001'") && fixtureSource.includes("assetId: standing.assetId, kind: standing.kind") && candidates.every((subject) => subject.visibleBounds && subject.visibleBounds.sourceCanvasWidth === candidates[0].visibleBounds.sourceCanvasWidth && subject.visibleBounds.sourceCanvasHeight === candidates[0].visibleBounds.sourceCanvasHeight);
    result.checks.groundContact = [...candidates, slumped].every((subject) => subject.visibleBounds && subject.visibleBounds.groundingErrorPixels <= 1) && [...candidates, slumped].every((subject) => Math.abs(subject.groundScreenY - candidates[0].groundScreenY) < 1e-9);
    result.checks.sameStandingBounds = candidates.every((subject) => JSON.stringify(subject.visibleBounds.alphaBounds) === JSON.stringify(candidates[0].visibleBounds.alphaBounds));
    result.checks.lockedSlumped = slumped && slumped.worldHeight === 0.68 && baselineSlumped && baselineSlumped.worldHeight === 0.68;
    result.checks.noCanCandidates = !calibration.subjects.some((subject) => subject.kind === 'can');
    result.checks.overridesDisappear = baselineStanding && baselineStanding.worldHeight === 0.96 && !baseline.heightfield.calibration.subjects.some((subject) => subject.id === 'standing-078');
    result.checks.noErrors = Object.values(result.observed).every((items) => items.length === 0);
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
