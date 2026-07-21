/**
 * Playwright + Node observer for SNC Can Run.
 * Tests the RELEASE ARTIFACT (root index.html by default; CR_RELEASE_ARTIFACT=dist for dist/index.html).
 * Run from repo root: node tests/run_selfcheck_playwright.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, spawnSync, execSync } = require('child_process');
const crypto = require('crypto');
const zlib = require('zlib');
const { chromium, devices } = require('playwright');
const buildTool = require('../tools/build-single-file.js');

const ROOT = path.resolve(__dirname, '..');
const SELF_CHECK_ROOT = path.join(ROOT, 'test-results', 'selfcheck-runs');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
let activeRun = null;

function isStrictDescendant(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function isSelfcheckContainer(root, target) {
  return target === root || isStrictDescendant(root, target);
}

function selfcheckContainmentError(value) {
  return new Error(`Self-check output directory must be a strict descendant of test-results/selfcheck-runs: ${value}`);
}

function displayPath(target) {
  return path.relative(ROOT, target).replace(/\\/g, '/');
}

function resolveSelfcheckRun({ requested = null, automaticRoot = SELF_CHECK_ROOT } = {}) {
  const requestedValue = requested || process.env.CR_SELFCHECK_OUTPUT_DIR || process.env.CR_SELFCHECK_RUN_DIR || null;
  const automatic = !requestedValue;
  const selfcheckRoot = path.resolve(SELF_CHECK_ROOT);
  const requestedPath = requestedValue ? path.resolve(ROOT, requestedValue) : path.resolve(automaticRoot);
  if (!automatic && !isStrictDescendant(selfcheckRoot, requestedPath)) throw selfcheckContainmentError(requestedValue);
  if (automatic && !isSelfcheckContainer(selfcheckRoot, requestedPath)) throw selfcheckContainmentError(displayPath(requestedPath));
  if (!automatic) {
    if (fs.existsSync(requestedPath)) throw new Error(`Self-check output directory already exists; refusing to overwrite: ${displayPath(requestedPath)}`);
    fs.mkdirSync(path.dirname(requestedPath), { recursive: true });
    fs.mkdirSync(requestedPath, { recursive: false });
    return { id: path.basename(requestedPath), dir: requestedPath, requested: requestedValue, automatic: false, collisionSuffix: null, startedAt: new Date().toISOString() };
  }
  fs.mkdirSync(requestedPath, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const git = getGitCommitShort() || 'nogit';
  const base = `${stamp}-${git}-${process.pid}`;
  for (let suffix = 0; suffix < 1000; suffix++) {
    const id = suffix === 0 ? base : `${base}-${suffix}-${crypto.randomBytes(2).toString('hex')}`;
    const dir = path.join(requestedPath, id);
    if (!isStrictDescendant(selfcheckRoot, dir)) throw selfcheckContainmentError(displayPath(dir));
    try {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, '.run-created'), 'selfcheck isolated output\n', 'utf8');
      return { id, dir, requested: null, automatic: true, collisionSuffix: suffix || null, startedAt: new Date().toISOString() };
    } catch (err) {
      if (err && err.code === 'EEXIST') continue;
      throw err;
    }
  }
  throw new Error('Unable to create a unique self-check output directory after 1000 attempts');
}

function runOutputPath(nameOrPath) {
  if (!activeRun) throw new Error(`Self-check output path requested before run initialization: ${nameOrPath}`);
  const candidate = path.isAbsolute(nameOrPath) ? nameOrPath : path.join(activeRun.dir, nameOrPath);
  const name = path.basename(candidate);
  const output = path.resolve(activeRun.dir, name);
  if (!output.startsWith(`${activeRun.dir}${path.sep}`)) throw new Error(`Self-check output path escapes run directory: ${nameOrPath}`);
  return output;
}

function collectRunArtifacts(run) {
  const byPath = new Map();
  const collect = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(absolute);
    const relative = path.relative(run.dir, absolute).replace(/\\/g, '/');
    if (relative === 'manifest.json' || relative.startsWith('.')) return;
    byPath.set(relative, { path: relative, kind: relative.endsWith('.png') ? 'screenshot' : relative.includes('summary') ? 'summary' : relative.includes('source-build') ? 'build-proof' : 'proof', producingSection: null });
  });
  collect(run.dir);
  for (const section of activeSectionRecorder?.sections || []) {
    for (const proofPath of section.proofPaths || []) {
      const relative = proofPath.replace(/\\/g, '/');
      if (byPath.has(relative)) byPath.get(relative).producingSection = section.name;
    }
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function finalizeRunManifest(run, result = {}) {
  const manifest = {
    schemaVersion: 1,
    runId: run.id,
    startedAt: run.startedAt,
    finishedAt: new Date().toISOString(),
    gitCommit: getGitCommitShort(),
    requestedDirectory: run.requested,
    resolvedDirectory: displayPath(run.dir),
    automatic: run.automatic,
    automaticCollisionSuffix: run.collisionSuffix,
    releaseArtifact: process.env.CR_RELEASE_ARTIFACT === 'dist' ? 'dist/index.html' : 'index.html',
    pass: result.pass === true,
    exitCode: result.exitCode ?? 1,
    summaryPath: result.summaryPath ? path.relative(run.dir, result.summaryPath).replace(/\\/g, '/') : null,
    artifacts: collectRunArtifacts(run),
  };
  const output = runOutputPath('manifest.json');
  const temporary = `${output}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.renameSync(temporary, output);
  return manifest;
}

/**
 * Release artifact under test — must match what GitHub Pages serves.
 * Set CR_RELEASE_ARTIFACT=dist to test dist/index.html when a build pipeline exists.
 */
function resolveReleaseArtifactPath() {
  const rootIndex = path.join(ROOT, 'index.html');
  const distIndex = path.join(ROOT, 'dist', 'index.html');
  if (process.env.CR_RELEASE_ARTIFACT === 'dist' && fs.existsSync(distIndex)) return distIndex;
  return rootIndex;
}

function getGitCommitShort() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (_e) {
    return null;
  }
}

const EXPECTED_SECTION_IDS = Object.freeze([
  'constitution static checks', 'source build pipeline', 'setup static server', 'setup chromium browser',
  'setup browser context', 'setup browser page and observers', 'viewport layout pixel7-portrait',
  'viewport layout pixel7-landscape', 'viewport layout travislike-portrait', 'viewport layout desktop-smoke',
  'browser smoke and animation frame', 'full runtime self-check', 'raycaster invariant self-check',
  'viewport authority self-check', 'semanticAction', 'inputGuard', 'worldAdapter', 'worldAdapterPhase1',
  'worldAdapterPhase2', 'fixedStepBaseline', 'fixedStepSimulation', 'raycastDebug', 'spriteOcclusionVisual',
  'spriteOcclusionScreenshot', 'singleMaterialBuildingTextures', 'walltextures2ScaleVariation',
  'walltextures3Ownership', 'walltextures4Shape', 'decalIntegration1', 'decalIntegration2',
  'decalIntegration3Visual', 'decalIntegration4MaterialIdentity', 'facadeSkins1', 'dock', 'pointer',
  'resilience', 'saveLoad', 'audio', 'viewportSafeArea', 'portraitUsability', 'optionsCleanup',
  'decorativeProps', 'streetBlockLevel', 'd1ParkLandmark', 'buildingModuleFacade', 'facadePackBridge',
  'facadePackV2Safe', 'fpvGroundPlaneAlignment', 'd2D3FacadeReadabilityFinal', 'buildingSmoothStyle',
  'continuousFacadeTexture', 'spriteGroundAnchor', 'facadeArtVocabulary', 'facadeCompositionReadability',
  'fpvFacadeTargetPolish', 'fpvWallLineArtifactFix', 'fpvStreetShimmerFix', 'streetReadabilityMinimap',
  'earlyDistrictProgression', 'levelSelector', 'buildingScalePolish', 'mobileControlReliability',
  'declarativeControls', 'movementCollision', 'reachability', 'proceduralLevelValidation',
  'fullRunProgression', 'harnessIsolation', 'renderFailure', 'hallE2E', 'visual', 'visualRectangle',
  'soundFeedback', 'network result', 'self-check overlay result', 'release artifact result',
  'overall aggregate assertions',
]);

let activeSectionRecorder = null;

function writeProof(name, data) {
  const p = runOutputPath(name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  activeSectionRecorder?.recordProof(p);
  return p;
}

function firstFailingAssertion(value) {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value.errors) && value.errors.length) return String(value.errors[0]);
  if (Array.isArray(value.failures) && value.failures.length) return JSON.stringify(value.failures[0]);
  if (value.pass === false) return 'section returned pass: false';
  return null;
}

function validateSaveLoadProof(value) {
  let receivedType = 'unknown';
  let observedPass;
  const errors = [];
  try {
    receivedType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    if (isObject) observedPass = value.pass;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`save/load proof has invalid type ${receivedType}; expected a non-null, non-array object (observed pass: ${String(observedPass)})`);
    } else {
      const has = (field) => Object.prototype.hasOwnProperty.call(value, field);
      if (!has('pass') || value.pass === undefined) errors.push(`save/load proof missing required field pass (observed pass: ${String(value.pass)})`);
      else if (value.pass !== true) errors.push(`save/load proof observed pass ${String(value.pass)}; expected true`);
      if (!has('loaded')) errors.push('save/load proof missing required field loaded');
      else if (value.loaded !== true) errors.push(`save/load proof has malformed loaded value ${String(value.loaded)}; expected true`);
      if (!has('x')) errors.push('save/load proof missing required field x');
      else if (!Number.isFinite(value.x)) errors.push(`save/load proof has malformed x value ${String(value.x)}; expected a finite number`);
      if (!has('savedX')) errors.push('save/load proof missing required field savedX');
      else if (!Number.isFinite(value.savedX)) errors.push(`save/load proof has malformed savedX value ${String(value.savedX)}; expected a finite number`);
      if (!has('errors')) errors.push('save/load proof missing required field errors');
      else if (!Array.isArray(value.errors)) errors.push(`save/load proof has malformed errors type ${typeof value.errors}; expected an array`);
    }
  } catch (err) {
    errors.push(`save/load proof validation could not inspect malformed ${receivedType} input: ${String(err?.message || err)}`);
  }
  return { pass: errors.length === 0, errors, receivedType, observedPass };
}

function observerCounts(net) {
  return {
    console: net?.consoleErrors?.length || 0,
    page: net?.pageErrors?.length || 0,
    external: net?.externalRequests?.length || 0,
  };
}

class SectionRecorder {
  constructor(expectedSectionIds = EXPECTED_SECTION_IDS) {
    this.expectedSectionIds = [...expectedSectionIds];
    this.expectedSectionIdSet = new Set(this.expectedSectionIds);
    if (this.expectedSectionIdSet.size !== this.expectedSectionIds.length) {
      throw new Error('Expected section registry contains duplicate IDs');
    }
    this.registeredSectionIds = new Set();
    this.sections = [];
    this.active = null;
    this.fatalError = null;
  }

  recordProof(proofPath) {
    if (this.active) this.active.proofPaths.push(activeRun
      ? path.relative(activeRun.dir, proofPath).replace(/\\/g, '/')
      : path.relative(ROOT, proofPath).replace(/\\/g, '/'));
  }

  async run(name, net, fn) {
    if (!this.expectedSectionIdSet.has(name)) {
      throw new Error(`Missing expected section ID: ${name}`);
    }
    if (this.registeredSectionIds.has(name)) {
      throw new Error(`Duplicate section ID: ${name}`);
    }
    this.registeredSectionIds.add(name);
    const section = {
      name,
      startedAt: new Date().toISOString(),
      durationMs: null,
      pass: false,
      error: null,
      stack: null,
      proofPaths: [],
      firstFailingAssertion: null,
      observerCounts: observerCounts(net),
    };
    const started = Date.now();
    this.sections.push(section);
    const previous = this.active;
    this.active = section;
    try {
      if (process.env.CR_SELFCHECK_INTENTIONAL_FAILURE_SECTION === name) {
        throw new Error(`Intentional self-check recorder failure for section: ${name}`);
      }
      const value = await fn();
      section.firstFailingAssertion = firstFailingAssertion(value);
      section.pass = section.firstFailingAssertion === null;
      if (!section.pass) section.error = section.firstFailingAssertion;
      return value;
    } catch (err) {
      section.error = String(err?.message || err);
      section.stack = String(err?.stack || err);
      section.firstFailingAssertion = section.error;
      section.pass = false;
      throw err;
    } finally {
      section.durationMs = Date.now() - started;
      section.observerCounts = observerCounts(net);
      this.active = previous;
    }
  }

  fail(name, err, net) {
    this.fatalError = { name, error: String(err?.message || err), stack: String(err?.stack || err) };
    if (!this.sections.some((section) => section.name === name)) {
      this.sections.push({
        name,
        startedAt: new Date().toISOString(),
        durationMs: 0,
        pass: false,
        error: this.fatalError.error,
        stack: this.fatalError.stack,
        proofPaths: [],
        firstFailingAssertion: this.fatalError.error,
        observerCounts: observerCounts(net),
      });
    }
  }

  compactSummary(net) {
    const missingExpectedSectionIds = this.expectedSectionIds.filter((name) => !this.registeredSectionIds.has(name));
    const failedSections = this.sections.filter((section) => !section.pass).map((section) => ({
      name: section.name,
      error: section.error,
      stack: section.stack,
      firstFailingAssertion: section.firstFailingAssertion,
    }));
    return {
      pass: failedSections.length === 0 && missingExpectedSectionIds.length === 0,
      failedSections,
      sections: this.sections,
      expectedSectionIds: this.expectedSectionIds,
      registeredSectionIds: [...this.registeredSectionIds],
      missingExpectedSectionIds,
      observerCounts: observerCounts(net),
      fatalError: this.fatalError,
    };
  }
}

function runSaveLoadValidationMetaTest() {
  const invoke = (value) => {
    try { return validateSaveLoadProof(value); } catch (err) {
      return { pass: false, errors: [`save/load validator threw: ${String(err?.message || err)}`] };
    }
  };
  const hasError = (result, condition) => result.pass === false
    && Array.isArray(result.errors)
    && result.errors.some((error) => /save\/load/i.test(String(error)) && condition.test(String(error)));
  const saveLoadValidAccepted = invoke({ pass: true, loaded: true, x: 1, savedX: 1, errors: [] }).pass === true;
  const saveLoadFalseRejected = hasError(invoke({ pass: false }), /observed pass|pass/i);
  const saveLoadMissingPassRejected = hasError(invoke({}), /missing.*pass/i);
  const saveLoadUndefinedRejected = hasError(invoke({ pass: undefined }), /missing.*pass|undefined/i);
  const saveLoadNullRejected = hasError(invoke(null), /type|null/i);
  const saveLoadMalformedRejected = [undefined, true, [], 'pass'].every((value) => hasError(invoke(value), /type|undefined|malformed/i));
  const saveLoadIncompleteRejected = hasError(invoke({ pass: true, loaded: true, x: 1, savedX: 1 }), /missing.*errors/i);
  const saveLoadMalformedFieldRejected = hasError(invoke({ pass: true, loaded: true, x: Infinity, savedX: 1, errors: [] }), /malformed.*x|finite/i);
  const pass = saveLoadValidAccepted && saveLoadFalseRejected && saveLoadMissingPassRejected
    && saveLoadUndefinedRejected && saveLoadNullRejected && saveLoadMalformedRejected
    && saveLoadIncompleteRejected && saveLoadMalformedFieldRejected;
  console.log(JSON.stringify({
    metaTest: 'save-load-proof-validator', pass, saveLoadValidAccepted, saveLoadFalseRejected,
    saveLoadMissingPassRejected, saveLoadUndefinedRejected, saveLoadNullRejected,
    saveLoadMalformedRejected, saveLoadIncompleteRejected, saveLoadMalformedFieldRejected,
  }));
  return pass;
}

async function runRecorderMetaTest() {
  const previousRun = activeRun;
  const createdRun = !activeRun;
  if (createdRun) activeRun = resolveSelfcheckRun();
  try {
  const net = { consoleErrors: ['console'], pageErrors: ['page'], externalRequests: ['external'] };
  const registryRecorder = new SectionRecorder();
  for (const id of EXPECTED_SECTION_IDS) await registryRecorder.run(id, net, async () => ({ pass: true }));
  const registrySummary = registryRecorder.compactSummary(net);

  const failureRecorder = new SectionRecorder(['intentional-failure']);
  let caught = null;
  try {
    await failureRecorder.run('intentional-failure', net, async () => {
      failureRecorder.recordProof(runOutputPath('proof-meta-intentional-failure.json'));
      throw new Error('intentional recorder meta-test failure');
    });
  } catch (err) {
    caught = err;
  }
  const summary = failureRecorder.compactSummary(net);
  const section = summary.sections[0];

  const missingRecorder = new SectionRecorder(['known']);
  let missingRejected = false;
  try { await missingRecorder.run('missing', net, async () => ({ pass: true })); } catch (err) {
    missingRejected = String(err.message).includes('Missing expected section ID: missing');
  }

  const duplicateRecorder = new SectionRecorder(['duplicate']);
  await duplicateRecorder.run('duplicate', net, async () => ({ pass: true }));
  let duplicateRejected = false;
  try { await duplicateRecorder.run('duplicate', net, async () => ({ pass: true })); } catch (err) {
    duplicateRejected = String(err.message).includes('Duplicate section ID: duplicate');
  }

  const registryComplete = registrySummary.pass === true
    && registrySummary.registeredSectionIds.length === EXPECTED_SECTION_IDS.length
    && registrySummary.missingExpectedSectionIds.length === 0;
  const intentionalFailureRecorded = !!caught && summary.pass === false && summary.failedSections.length === 1
    && section.name === 'intentional-failure' && section.error === 'intentional recorder meta-test failure'
    && section.stack.includes('intentional recorder meta-test failure') && section.durationMs !== null
    && section.firstFailingAssertion === 'intentional recorder meta-test failure'
    && section.proofPaths.includes('proof-meta-intentional-failure.json')
    && section.observerCounts.console === 1 && section.observerCounts.page === 1 && section.observerCounts.external === 1
    && summary.failedSections[0].name === 'intentional-failure'
    && failureRecorder.active === null;
  const pass = registryComplete && missingRejected && duplicateRejected && intentionalFailureRecorded;
  console.log(JSON.stringify({
    metaTest: 'section-recorder-registry-and-failure', pass, registryComplete, missingRejected,
    duplicateRejected, intentionalFailureRecorded, summary,
  }));
  return pass;
  } finally {
    if (createdRun) activeRun = previousRun;
  }
}

function createSourceFixture(run) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build-manifest.json'), 'utf8'));
  const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replaceAll(String.fromCharCode(13) + String.fromCharCode(10), '\n');
  const html = read(manifest.template)
    .replace('{{STYLES}}', manifest.styles.map(read).join('\n').replace(/\n$/, ''))
    .replace('{{BODY}}', read(manifest.body).replace(/\n$/, ''))
    .replace('{{SCRIPT}}', manifest.scripts.map(read).join('').replace(/\n+$/, '\n'));
  const fixturePath = path.join(run.dir, 'source-fixture-selfcheck.html');
  fs.writeFileSync(fixturePath, html.endsWith('\n') ? html : `${html}\n`, 'utf8');
  return fixturePath;
}

function selfCheckTerminalState(state) {
  return ['passed', 'failed', 'timed_out'].includes(state);
}

async function waitForSelfCheckCompletion(page, net, timeoutMs = 15000) {
  const started = Date.now();
  try {
    const completion = await page.evaluate(async (timeout) => {
      const lifecycle = window.__crSelfCheckLifecycle;
      if (!lifecycle || !window.__crSelfCheckDone || typeof window.__crSelfCheckDone.then !== 'function') {
        return { contractMissing: true, lifecycle: lifecycle || null };
      }
      return Promise.race([
        window.__crSelfCheckDone.then((payload) => ({ payload, lifecycle: window.__crSelfCheckLifecycle })),
        new Promise((resolve) => setTimeout(() => resolve({ timedOut: true, lifecycle: window.__crSelfCheckLifecycle }), timeout)),
      ]);
    }, timeoutMs);
    const elapsedMs = Date.now() - started;
    if (completion.timedOut) {
      const lifecycle = await page.evaluate(() => {
        const value = window.__crSelfCheckLifecycle;
        if (value && !['passed', 'failed', 'timed_out'].includes(value.state)) {
          value.state = 'timed_out';
          value.completedAt = Date.now();
          value.lastProgressAt = value.completedAt;
        }
        if (typeof window.crResolveBrowserSelfCheckDone === 'function') window.crResolveBrowserSelfCheckDone();
        return value || null;
      });
      const timeoutDiagnostics = {
        pass: false, timedOut: true, currentSection: lifecycle?.currentSection || null,
        lastCompletedSection: lifecycle?.lastCompletedSection || null, lastProgressAt: lifecycle?.lastProgressAt || null,
        elapsedMs, consoleErrors: net?.consoleErrors || [], pageErrors: net?.pageErrors || [],
        externalRequests: net?.externalRequests || [], lifecycle, runDir: activeRun ? displayPath(activeRun.dir) : null,
      };
      writeProof('proof-selfcheck-timeout.json', timeoutDiagnostics);
      return { ...completion, lifecycle, elapsedMs, timeoutDiagnostics };
    }
    return { ...completion, elapsedMs, completionState: completion.payload?.state || completion.lifecycle?.state || null };
  } catch (err) {
    return { error: String(err?.message || err), elapsedMs: Date.now() - started, lifecycle: null };
  }
}

async function withSourceFixtureBrowser(label, fn) {
  const tempRoot = path.join(SELF_CHECK_ROOT, `${label}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`);
  const run = resolveSelfcheckRun({ requested: tempRoot });
  const previousRun = activeRun;
  const previousRecorder = activeSectionRecorder;
  activeRun = run;
  activeSectionRecorder = null;
  let srv = null;
  let browser = null;
  let context = null;
  try {
    const fixturePath = createSourceFixture(run);
    srv = await startStaticServer(resolveReleaseArtifactPath());
    browser = await chromium.launch();
    context = await browser.newContext();
    const page = await context.newPage();
    const net = await attachObservers(page);
    const fixtureUrl = `${BASE}/${displayPath(fixturePath)}`;
    return await fn({ page, net, fixtureUrl, run, fixturePath });
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    if (srv) await new Promise((resolve, reject) => srv.close((err) => err ? reject(err) : resolve()));
    activeSectionRecorder = previousRecorder;
    activeRun = previousRun;
  }
}

async function runSelfCheckCompletionMetaTest() {
  const result = await withSourceFixtureBrowser('completion-meta', async ({ page, net, fixtureUrl, run, fixturePath }) => {
    await page.goto(`${fixtureUrl}?selfcheck=1&mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
    const startedRunning = await page.waitForFunction(() => window.__crSelfCheckLifecycle?.state === 'running', null, { timeout: 5000 }).then(() => true).catch(() => false);
    const success = await waitForSelfCheckCompletion(page, net, 20000);
    const successOnce = await page.evaluate(async () => {
      let count = 0;
      await window.__crSelfCheckDone.then(() => { count++; });
      await window.__crSelfCheckDone.then(() => { count++; });
      return count === 2;
    }).catch(() => false);
    await page.goto(`${fixtureUrl}?selfcheck=1&selfcheckfailmeta=1`, { waitUntil: 'domcontentloaded' });
    const failure = await waitForSelfCheckCompletion(page, net, 5000);
    const failureOnce = await page.evaluate(async () => {
      let count = 0;
      await window.__crSelfCheckDone.then(() => { count++; });
      await window.__crSelfCheckDone.then(() => { count++; });
      return count === 2;
    }).catch(() => false);
    await page.goto(`${fixtureUrl}?mobile=on`, { waitUntil: 'domcontentloaded' });
    const missingContractRejected = await page.evaluate(() => !window.__crSelfCheckLifecycle && !window.__crSelfCheckDone);
    const successLifecycle = success.lifecycle || success.payload?.lifecycle || null;
    const failureLifecycle = failure.lifecycle || failure.payload?.lifecycle || null;
    const pass = startedRunning && selfCheckTerminalState(success.completionState) && successOnce
      && failure.completionState === 'failed' && failureOnce && missingContractRejected
      && selfCheckTerminalState(successLifecycle?.state) && successLifecycle?.completedSections?.length > 0
      && (!successLifecycle?.error || (successLifecycle.error.message && successLifecycle.error.stack))
      && failureLifecycle?.failedSection && failureLifecycle?.error?.message && Boolean(failureLifecycle?.completedAt);
    const proof = { metaTest: 'source-fixture-selfcheck-completion', pass, sourceFixture: displayPath(fixturePath), runDir: displayPath(run.dir), startedRunning, success, failure, successOnce, failureOnce, missingContractRejected };
    writeProof('proof-selfcheck-completion-meta.json', proof);
    return proof;
  });
  console.log(JSON.stringify(result));
  return typeof result.pass === 'boolean' && result.pass === true;
}

async function runSelfCheckHangMetaTest() {
  const result = await withSourceFixtureBrowser('hang-meta', async ({ page, net, fixtureUrl, run, fixturePath }) => {
    await page.goto(`${fixtureUrl}?selfcheck=1&selfcheckhangmeta=1`, { waitUntil: 'domcontentloaded' });
    const hangObserved = await page.waitForFunction(() => window.__crSelfCheckLifecycle?.currentSection === 'hang-meta-section', null, { timeout: 5000 }).then(() => true).catch(() => false);
    const completion = await waitForSelfCheckCompletion(page, net, 700);
    const timeoutProofPath = path.join(run.dir, 'proof-selfcheck-timeout.json');
    const timeoutProof = fs.existsSync(timeoutProofPath) ? JSON.parse(fs.readFileSync(timeoutProofPath, 'utf8')) : null;
    const pass = hangObserved && completion.timedOut === true && completion.lifecycle?.currentSection === 'hang-meta-section'
      && completion.lifecycle?.state === 'timed_out' && timeoutProof?.timedOut === true
      && timeoutProof?.currentSection === 'hang-meta-section' && timeoutProof?.runDir === displayPath(run.dir)
      && Array.isArray(timeoutProof?.consoleErrors) && Array.isArray(timeoutProof?.pageErrors) && Array.isArray(timeoutProof?.externalRequests);
    const proof = { metaTest: 'source-fixture-selfcheck-hang', pass, sourceFixture: displayPath(fixturePath), runDir: displayPath(run.dir), hangObserved, completion, timeoutProofPath: displayPath(timeoutProofPath), timeoutProof };
    writeProof('proof-selfcheck-hang-meta.json', proof);
    return proof;
  });
  console.log(JSON.stringify(result));
  return result.pass;
}

async function runOutputRoutingMetaTest() {
  if (process.env.CR_SELFCHECK_OUTPUT_META_TEST_CHILD_ASSERT === '1') return true;
  const hashFile = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const rootIndexPath = path.join(ROOT, 'index.html');
  const rootBuildProofPath = path.join(ROOT, 'proof-source-build-manifest.json');
  const rootIndexHashBefore = hashFile(rootIndexPath);
  const rootBuildProofHashBefore = hashFile(rootBuildProofPath);
  const rootProofHashes = execSync("git ls-files 'proof-*' | xargs -r sha256sum", { cwd: ROOT, encoding: 'utf8' });
  const strictContainmentMessage = 'must be a strict descendant of test-results/selfcheck-runs';
  const rejectedRequests = ['arbitrary-inside-repo', 'test-results/../escape-but-inside'];
  const modeDispatchRejections = rejectedRequests.map((requested) => {
    const target = path.resolve(ROOT, requested);
    const existedBefore = fs.existsSync(target);
    const child = spawnSync(process.execPath, [__filename], {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        CR_SELFCHECK_OUTPUT_META_TEST: '1',
        CR_SELFCHECK_OUTPUT_META_TEST_CHILD_ASSERT: '1',
        CR_SELFCHECK_RUN_DIR: requested,
      },
    });
    const output = `${child.stdout || ''}${child.stderr || ''}`;
    return {
      requested,
      rejected: child.status !== 0 && output.includes(strictContainmentMessage),
      noWrite: fs.existsSync(target) === existedBefore,
    };
  });
  const builderRejections = rejectedRequests.map((requested) => {
    const target = path.resolve(ROOT, requested);
    const existedBefore = fs.existsSync(target);
    let message = '';
    try {
      execSync('node tools/build-single-file.js --check', {
        cwd: ROOT, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, CR_SELFCHECK_RUN_DIR: requested },
      });
    } catch (err) {
      message = `${err.stderr || ''}${err.stdout || ''}${err.message || ''}`;
    }
    return { requested, rejected: message.includes(strictContainmentMessage), noWrite: fs.existsSync(target) === existedBefore };
  });
  if (!builderRejections.every((result) => result.rejected && result.noWrite)) {
    console.log(JSON.stringify({ metaTest: 'output-routing', pass: false, phase: 'builder-strict-containment', builderRejections }));
    return false;
  }
  fs.mkdirSync(SELF_CHECK_ROOT, { recursive: true });
  const tempRoot = fs.mkdtempSync(path.join(SELF_CHECK_ROOT, `output-meta-${process.pid}-`));
  const explicit = path.join(tempRoot, 'explicit-run');

  let automaticOne = null;
  let automaticTwo = null;
  try {
    automaticOne = resolveSelfcheckRun({ requested: null, automaticRoot: tempRoot });
    automaticTwo = resolveSelfcheckRun({ requested: null, automaticRoot: tempRoot });
    fs.mkdirSync(explicit, { recursive: false });
    fs.writeFileSync(path.join(explicit, 'sentinel.txt'), 'do not overwrite', 'utf8');
    let collisionRejected = false;
    try { resolveSelfcheckRun({ requested: explicit }); } catch (err) {
      collisionRejected = String(err.message).includes('already exists');
    }
    const runnerRejections = rejectedRequests.map((requested) => {
      const target = path.resolve(ROOT, requested);
      const existedBefore = fs.existsSync(target);
      let message = '';
      try { resolveSelfcheckRun({ requested }); } catch (err) { message = String(err.message || err); }
      return { requested, rejected: message.includes(strictContainmentMessage), noWrite: fs.existsSync(target) === existedBefore };
    });
    let escapeRejected = false;
    try { resolveSelfcheckRun({ requested: '../outside-selfcheck' }); } catch (err) {
      escapeRejected = String(err.message).includes(strictContainmentMessage);
    }

    const run = resolveSelfcheckRun({ requested: path.join(tempRoot, 'routed-run') });
    activeRun = run;
    writeProof('proof-output-meta.json', { pass: true });
    fs.writeFileSync(runOutputPath('proof-output-meta.png'), 'not a real screenshot', 'utf8');
    const canonicalCheck = spawnSync(process.execPath, ['tools/build-single-file.js', '--check'], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, CR_SELFCHECK_RUN_DIR: run.dir },
    });
    const canonicalSynchronizedCasePass = canonicalCheck.status === 0;

    const fixtureRoot = path.join(tempRoot, 'disposable-stale-fixture');
    fs.mkdirSync(fixtureRoot, { recursive: false });
    const copyIntoFixture = (relative) => {
      const destination = path.join(fixtureRoot, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(ROOT, relative), destination, fs.constants.COPYFILE_EXCL);
    };
    copyIntoFixture('tools/build-single-file.js');
    copyIntoFixture('project-metadata.json');
    const buildManifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'build-manifest.json'), 'utf8'));
    copyIntoFixture('src/build-manifest.json');
    [...new Set([buildManifest.template, ...buildManifest.styles, buildManifest.body, ...buildManifest.scripts])].forEach(copyIntoFixture);
    copyIntoFixture(buildManifest.output || 'index.html');
    fs.appendFileSync(path.join(fixtureRoot, buildManifest.output || 'index.html'), '\n<!-- intentional stale output-routing fixture -->\n', 'utf8');
    const fixtureRunDir = path.join(fixtureRoot, 'test-results', 'selfcheck-runs', 'stale-check');
    fs.mkdirSync(fixtureRunDir, { recursive: true });
    const staleCheck = spawnSync(process.execPath, ['tools/build-single-file.js', '--check'], {
      cwd: fixtureRoot, encoding: 'utf8', env: { ...process.env, CR_SELFCHECK_RUN_DIR: fixtureRunDir },
    });
    const staleProofPath = path.join(fixtureRunDir, 'proof-source-build-manifest.json');
    const staleProof = fs.existsSync(staleProofPath) ? JSON.parse(fs.readFileSync(staleProofPath, 'utf8')) : null;
    const disposableStaleFixtureRejected = staleCheck.status !== 0 && staleProof?.check === 'fail'
      && String(staleProof.reason || '').includes('out of sync');

    const recorder = new SectionRecorder(['intentional-failure']);
    try { await recorder.run('intentional-failure', null, async () => { throw new Error('intentional output routing failure'); }); } catch (_err) {}
    const summary = recorder.compactSummary(null);
    writeProof('proof-playwright-summary.json', summary);
    finalizeRunManifest(run, { pass: false, exitCode: 1, summaryPath: runOutputPath('proof-playwright-summary.json') });
    const manifest = JSON.parse(fs.readFileSync(path.join(run.dir, 'manifest.json'), 'utf8'));
    const files = fs.readdirSync(run.dir);
    const rootIndexHashStable = rootIndexHashBefore === hashFile(rootIndexPath);
    const rootBuildProofHashStable = rootBuildProofHashBefore === hashFile(rootBuildProofPath);
    const rootProofHashesAfter = execSync("git ls-files 'proof-*' | xargs -r sha256sum", { cwd: ROOT, encoding: 'utf8' });
    const strictDescendantContainment = modeDispatchRejections.every((result) => result.rejected && result.noWrite)
      && builderRejections.every((result) => result.rejected && result.noWrite)
      && runnerRejections.every((result) => result.rejected && result.noWrite);
    const collisionRefused = collisionRejected && fs.readFileSync(path.join(explicit, 'sentinel.txt'), 'utf8') === 'do not overwrite';
    const runLocalBuildProof = files.includes('proof-source-build-manifest.json') && isStrictDescendant(run.dir, path.join(run.dir, 'proof-source-build-manifest.json'));
    const manifestContained = manifest.pass === false && manifest.exitCode === 1
      && manifest.artifacts.every((artifact) => !artifact.path.startsWith('../') && !path.isAbsolute(artifact.path));
    const failureProofContained = isStrictDescendant(SELF_CHECK_ROOT, staleProofPath) && isStrictDescendant(fixtureRunDir, staleProofPath);
    const pass = canonicalSynchronizedCasePass && disposableStaleFixtureRejected
      && rootIndexHashStable && rootBuildProofHashStable && rootProofHashes === rootProofHashesAfter
      && strictDescendantContainment && escapeRejected
      && automaticOne.dir !== automaticTwo.dir && fs.existsSync(path.join(automaticOne.dir, '.run-created'))
      && collisionRefused && files.includes('proof-output-meta.json') && files.includes('proof-output-meta.png')
      && runLocalBuildProof && files.includes('proof-playwright-summary.json') && manifestContained && failureProofContained;
    const proof = {
      metaTest: 'output-routing', pass, canonicalSynchronizedCasePass, disposableStaleFixtureRejected,
      rootIndexHashStable, rootBuildProofHashStable, strictDescendantContainment, escapeRejected,
      collisionRefused, automaticUniqueCollisionRetry: automaticOne.dir !== automaticTwo.dir,
      runLocalBuildProof, manifestContained, failureProofContained,
      canonicalCheckExitCode: canonicalCheck.status, staleFixtureCheckExitCode: staleCheck.status,
      automaticOne: automaticOne.id, automaticTwo: automaticTwo.id,
      modeDispatchRejections, builderRejections, runnerRejections, files,
    };
    fs.writeFileSync(path.join(run.dir, 'proof-output-meta-result.json'), JSON.stringify(proof, null, 2) + '\n', 'utf8');
    console.log(JSON.stringify(proof));
    return pass;
  } finally {
    activeRun = null;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function runCanonicalMetadataMetaTest() {
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snc-metadata-meta-'));
  const canonicalMetadata = (buildId = 'meta-test-build') => ({
    schemaVersion: 3,
    project: { id: 'solidarity-not-charity-can-run', name: 'Solidarity Not Charity Can Run' },
    runtime: {
      buildId,
      sourcePolicy: 'build-manifest',
      releaseArtifact: 'index.html',
    },
    artifact: { path: 'index.html', byteLength: 1, sha256: '0'.repeat(64) },
    distribution: {
      provider: 'github-pages',
      url: 'https://falloutmule.github.io/solidarity-not-charity-can-run/',
      source: { branch: 'main', path: '/' },
    },
    selection: {
      farField: {
        candidate: 'meta-test', status: 'selected', basis: 'metadata fixture',
        evidence: 'docs/development/PERFORMANCE.md',
        modes: { ffres: '400', ffangle: 'interp', ffproj: 'subpixel' },
      },
    },
    acceptance: {
      samsungSmoothness: {
        target: 'Samsung Internet', status: 'failed', scope: 'MOVE plus LOOK fixture',
        evidence: 'docs/development/PERFORMANCE.md',
      },
      userVisual: { status: 'pending', scope: 'No general visual acceptance in fixture.' },
    },
    art: {
      custom_next_001: {
        version: '001', approvalStatus: 'pending_art_review', renderMode: 'exact_asset',
        footprintCells: { w: 6, h: 3 },
      },
    },
  });
  const results = {
    actualCanonical: false, constAccepted: false, letAccepted: false, varAccepted: false,
    missingFileRejected: false, malformedJsonRejected: false, schemaVersionRejected: false,
    emptyBuildIdRejected: false, artifactMetadataRejected: false, manifestArtifactRejected: false,
    metadataSourceMismatchRejected: false, sourceArtifactMismatchRejected: false,
    metadataArtifactMismatchRejected: false, approvalChangeRejected: false, footprintRejected: false,
    diagnosticsIncludeObservedIdentity: false, historicalIdsNotRequired: false, pendingReviewPreserved: false,
  };
  const writeFixture = (metadata = canonicalMetadata(), sourceDeclaration = 'const', artifactBuildId = metadata.runtime.buildId, manifestOutput = 'index.html', syncArtifact = true) => {
    const fixtureMetadata = JSON.parse(JSON.stringify(metadata));
    const artifactText = `<script>${sourceDeclaration} BUILD_ID = '${artifactBuildId}';</script>\n`;
    if (syncArtifact) {
      fixtureMetadata.artifact = {
        path: 'index.html',
        byteLength: Buffer.byteLength(artifactText),
        sha256: crypto.createHash('sha256').update(artifactText).digest('hex'),
      };
    }
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs', 'development'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'docs', 'development', 'PERFORMANCE.md'), '# Fixture\n', 'utf8');
    fs.writeFileSync(path.join(tmp, 'project-metadata.json'), JSON.stringify(fixtureMetadata), 'utf8');
    fs.writeFileSync(path.join(tmp, 'src', 'runtime.js'), `${sourceDeclaration} BUILD_ID = '${metadata.runtime.buildId}';\n`, 'utf8');
    fs.writeFileSync(path.join(tmp, 'index.html'), artifactText, 'utf8');
    fs.writeFileSync(path.join(tmp, 'src', 'build-manifest.json'), JSON.stringify({ output: manifestOutput, scripts: ['src/runtime.js'] }), 'utf8');
  };
  const rejects = (prepare, expected) => {
    prepare();
    try {
      buildTool.validateProjectMetadata(buildTool.loadProjectMetadata(tmp), tmp);
      return false;
    } catch (err) {
      const message = String(err.message || err);
      return expected.every((part) => message.includes(part));
    }
  };
  try {
    const canonical = buildTool.loadProjectMetadata(ROOT);
    const canonicalIdentity = buildTool.validateProjectMetadata(canonical, ROOT);
    results.actualCanonical = canonical.schemaVersion === 3 && canonical.runtime.buildId === 'farfieldsmooth1';
    results.pendingReviewPreserved = canonical.art.custom_next_001.approvalStatus === 'pending_art_review'
      && canonical.acceptance.samsungSmoothness.status === 'failed' && canonical.acceptance.userVisual.status === 'pending';
    for (const declaration of ['const', 'let', 'var']) {
      writeFixture(canonicalMetadata(), declaration);
      buildTool.validateProjectMetadata(buildTool.loadProjectMetadata(tmp), tmp);
      results[`${declaration}Accepted`] = true;
    }
    results.missingFileRejected = rejects(() => {
      fs.rmSync(path.join(tmp, 'project-metadata.json'), { force: true });
    }, ['metadata=', 'source=', 'artifact=']);
    results.malformedJsonRejected = rejects(() => {
      fs.writeFileSync(path.join(tmp, 'project-metadata.json'), '{bad json', 'utf8');
    }, ['metadata=', 'source=', 'artifact=']);
    results.schemaVersionRejected = rejects(() => {
      const m = canonicalMetadata(); m.schemaVersion = 1.5; writeFixture(m);
    }, ['schemaVersion', 'metadata=', 'source=', 'artifact=']);
    results.emptyBuildIdRejected = rejects(() => {
      const m = canonicalMetadata(''); writeFixture(m);
    }, ['runtime.buildId', 'metadata=', 'source=', 'artifact=']);
    results.artifactMetadataRejected = rejects(() => {
      const m = canonicalMetadata(); m.artifact.sha256 = 'BAD'; writeFixture(m, 'const', m.runtime.buildId, 'index.html', false);
    }, ['artifact', 'metadata=', 'source=', 'artifact=']);
    results.manifestArtifactRejected = rejects(() => writeFixture(canonicalMetadata(), 'const', 'meta-test-build', 'dist/index.html'), ['releaseArtifact', 'metadata=', 'source=', 'artifact=']);
    results.metadataSourceMismatchRejected = rejects(() => writeFixture(canonicalMetadata('metadata-id'), 'const', 'source-id'), ['metadata=metadata-id', 'source=metadata-id', 'artifact=source-id']);
    results.sourceArtifactMismatchRejected = rejects(() => writeFixture(canonicalMetadata(), 'let', 'artifact-id'), ['metadata=meta-test-build', 'source=meta-test-build', 'artifact=artifact-id']);
    results.metadataArtifactMismatchRejected = rejects(() => writeFixture(canonicalMetadata('metadata-id'), 'var', 'artifact-id'), ['metadata=metadata-id', 'source=metadata-id', 'artifact=artifact-id']);
    results.approvalChangeRejected = rejects(() => {
      const m = canonicalMetadata(); m.art.custom_next_001.approvalStatus = 'approved'; writeFixture(m);
    }, ['approvalStatus', 'metadata=', 'source=', 'artifact=']);
    results.footprintRejected = rejects(() => {
      const m = canonicalMetadata(); m.art.custom_next_001.footprintCells = { w: 6 }; writeFixture(m);
    }, ['footprintCells', 'metadata=', 'source=', 'artifact=']);
    results.diagnosticsIncludeObservedIdentity = canonicalIdentity.diagnostics.metadata === 'farfieldsmooth1'
      && canonicalIdentity.diagnostics.source === 'farfieldsmooth1' && canonicalIdentity.diagnostics.artifact === 'farfieldsmooth1';
    writeFixture(canonicalMetadata('not-a-historical-id'), 'const');
    results.historicalIdsNotRequired = buildTool.validateProjectMetadata(buildTool.loadProjectMetadata(tmp), tmp).diagnostics.metadata === 'not-a-historical-id';
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const pass = Object.values(results).every(Boolean);
  console.log(JSON.stringify({ metaTest: 'canonical-metadata-build-id-parity', pass, results }));
  return pass;
}

function artifactSourceForStaticChecks(src) {
  const start = src.indexOf('AI-SAFE SINGLE-FILE CONSTITUTION');
  const end = src.indexOf('========================================================================== */', start);
  if (start >= 0 && end > start) {
    return src.slice(0, start) + src.slice(end + '========================================================================== */'.length);
  }
  return src;
}

function runAiSafeConstitutionCheck(artifactPath) {
  const srcRaw = fs.readFileSync(artifactPath, 'utf8');
  const src = artifactSourceForStaticChecks(srcRaw);
  const errors = [];
  const checks = {};
  const policyPath = path.join(ROOT, 'SOURCE_RELEASE_POLICY.md');
  const srcReadme = path.join(ROOT, 'src', 'README.md');

  checks.hasConstitution = srcRaw.includes('AI-SAFE SINGLE-FILE CONSTITUTION');
  checks.BUILD_ID = /(?:const|let|var)\s+BUILD_ID\s*=\s*['"][^'"]+['"]/.test(src);
  checks.SAVE_VERSION = /const\s+SAVE_VERSION\s*=/.test(src);
  checks.windowCR = /globalThis\.CR\s*=\s*window\.CR\s*=/.test(src);
  checks.noEval = !/\beval\s*\(/.test(src);
  checks.noExternalScript = !/<script[^>]+src\s*=\s*["']https?:/i.test(src);
  checks.noExternalStylesheet = !/<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']https?:/i.test(src);
  const onclickHits = (src.match(/\bonclick\s*=/gi) || []).length;
  checks.noInlineOnclick = onclickHits === 0;
  checks.titleSolidarity = /<title>\s*Solidarity Not Charity Can Run\s*<\/title>/i.test(srcRaw);
  checks.sourceReleasePolicy = fs.existsSync(policyPath);
  checks.srcScaffoldReadme = fs.existsSync(srcReadme);

  const rulePhrases = {
    namedSections: 'Named section edits only',
    saveVersionRule: 'SAVE_VERSION bump',
    oneWayFlow: 'INPUT → ACTIONS → SIMULATION → RENDER',
    noRenderMutation: 'Render code must not mutate gameplay state',
    kanbanOneCard: 'One Kanban card at a time',
    playwrightHarness: 'Playwright harness',
    harnessIsolated: 'state-isolated',
    singleFileArtifact: 'single-file HTML',
    noTravisHarnessBugs: 'harness can test',
  };
  checks.constitutionRules = {};
  for (const [k, phrase] of Object.entries(rulePhrases)) {
    const ok = srcRaw.includes(phrase);
    checks.constitutionRules[k] = ok;
    if (!ok) errors.push('constitution rule phrase missing: ' + k);
  }

  if (!checks.hasConstitution) errors.push('missing AI-SAFE SINGLE-FILE CONSTITUTION');
  if (!checks.BUILD_ID) errors.push('missing BUILD_ID');
  if (!checks.SAVE_VERSION) errors.push('missing SAVE_VERSION');
  if (!checks.windowCR) errors.push('missing window.CR export');
  if (!checks.noEval) errors.push('eval() found');
  if (!checks.noExternalScript) errors.push('external script src');
  if (!checks.noExternalStylesheet) errors.push('external stylesheet');
  if (!checks.noInlineOnclick) errors.push('inline onclick count ' + onclickHits);
  if (!checks.titleSolidarity) errors.push('title must be Solidarity Not Charity Can Run');
  if (!checks.sourceReleasePolicy) errors.push('missing SOURCE_RELEASE_POLICY.md');
  if (!checks.srcScaffoldReadme) errors.push('missing src/README.md scaffold');

  const markers = [
    'CANVAS / RESOLUTION',
    'GAME STATE',
    'MOBILE / TOUCH INPUT',
    'CITY GENERATION',
    'CUSTOM LEVELS',
    'COLLISION',
    'AUDIO',
    'LOCAL PERSISTENCE',
    'PROCEDURAL ASSETS',
    'RENDER',
    'MINIMAP',
    'HUD',
    'GAMEPLAY ACTIONS',
    'UPDATE + INPUT',
    'OVERLAYS',
    'MAIN LOOP',
  ];
  const sectionHits = {};
  for (const m of markers) {
    const ok = src.includes(m);
    sectionHits[m] = ok;
    if (!ok) errors.push('section marker missing: ' + m);
  }

  const distDir = path.join(ROOT, 'dist');
  checks.distExists = fs.existsSync(distDir);
  checks.distSingleFile = true;
  if (checks.distExists) {
    const distFiles = fs.readdirSync(distDir).filter((f) => !f.startsWith('.'));
    checks.distFileCount = distFiles.length;
    checks.distSingleFile = distFiles.length === 1 && distFiles[0] === 'index.html';
    if (!checks.distSingleFile) errors.push('dist/ must contain only index.html when present');
  }

  const pass = errors.length === 0;
  const result = {
    pass,
    checks,
    sectionHits,
    constitutionRules: checks.constitutionRules,
    errors,
    artifactPath,
    policyPath: checks.sourceReleasePolicy ? policyPath : null,
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-ai-safe-constitution.json', result);
  writeProof('proof-constitution-check.json', { pass, checks, sectionHits, errors, file: artifactPath });
  return result;
}

/** @deprecated name — use runAiSafeConstitutionCheck */
function runConstitutionCheck(artifactPath) {
  return runAiSafeConstitutionCheck(artifactPath);
}

function runReleaseArtifactCheck(artifactPath, opts) {
  const src = fs.readFileSync(artifactPath, 'utf8');
  const errors = [];
  const rel = path.relative(ROOT, artifactPath).replace(/\\/g, '/');
  const isSingleHtml = rel === 'index.html' || rel === 'dist/index.html';
  const externalScript = /<script[^>]+src\s*=\s*["']https?:/i.test(src);
  const externalCss = /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']https?:/i.test(src);
  const buildMatch = src.match(/(?:const|let|var)\s+BUILD_ID\s*=\s*['"]([^'"]+)['"]/);
  const buildId = buildMatch ? buildMatch[1] : null;

  if (!isSingleHtml) errors.push('artifact must be root index.html or dist/index.html');
  if (externalScript) errors.push('release artifact has external script');
  if (externalCss) errors.push('release artifact has external stylesheet');

  const pass =
    errors.length === 0 &&
    opts.playwrightPass === true &&
    opts.fullSelfCheckPass === true &&
    opts.externalRequestCount === 0 &&
    opts.consoleErrorCount === 0 &&
    opts.pageErrorCount === 0;

  const result = {
    pass,
    artifactPath: rel,
    artifactAbsolute: artifactPath,
    githubPagesServes: rel === 'index.html' ? 'root index.html' : rel,
    singleFile: isSingleHtml && !externalScript && !externalCss,
    runtimeDependencyCheck: { externalScript, externalCss },
    externalRequestCount: opts.externalRequestCount,
    consoleErrorCount: opts.consoleErrorCount,
    pageErrorCount: opts.pageErrorCount,
    fullSelfCheck: opts.fullSelfCheck,
    playwrightSummaryPass: opts.playwrightPass,
    buildId,
    commitHash: opts.commitHash,
    errors,
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-release-artifact.json', result);
  return result;
}

function startStaticServer(releaseArtifactPath) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath;
      if (urlPath === '/' || urlPath === '/index.html') {
        filePath = releaseArtifactPath;
      } else {
        filePath = path.join(ROOT, urlPath.replace(/^\//, ''));
      }
      if (!filePath.startsWith(ROOT) && filePath !== releaseArtifactPath) {
        res.writeHead(403); res.end(); return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(PORT, '127.0.0.1', () => resolve(srv));
    srv.on('error', reject);
  });
}

async function attachObservers(page) {
  const state = {
    consoleErrors: [],
    pageErrors: [],
    requestFailed: [],
    externalRequests: [],
    networkLog: [],
  };
  page.on('console', msg => {
    if (msg.type() === 'error') state.consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => state.pageErrors.push(String(err)));
  page.on('requestfailed', req => {
    state.requestFailed.push({ url: req.url(), failure: req.failure() && req.failure().errorText });
  });
  page.on('request', req => {
    const u = req.url();
    const allowed =
      u.startsWith(BASE) ||
      u.startsWith('data:') ||
      u.startsWith('blob:') ||
      u === 'about:blank';
    if (!allowed) state.externalRequests.push(u);
    state.networkLog.push({ url: u, external: !allowed });
  });
  return state;
}

async function waitGameReady(page) {
  await page.waitForFunction(() => window.CR && typeof CR.startRun === 'function', null, { timeout: 20000 });
  await page.waitForSelector('#view', { timeout: 10000 });
  await page.waitForTimeout(400);
}

async function canvasNonBlank(page) {
  return page.evaluate(() => {
    const v = document.getElementById('view');
    if (!v || !v.width || !v.height) return { ok: false, reason: 'no canvas size' };
    const cx = v.getContext('2d');
    const img = cx.getImageData(0, 0, Math.min(64, v.width), Math.min(64, v.height)).data;
    let n = 0;
    for (let i = 0; i < img.length; i += 4) if (img[i] || img[i + 1] || img[i + 2]) n++;
    return { ok: n > 0, nonblack: n, w: v.width, h: v.height };
  });
}

async function rafAdvances(page) {
  return page.evaluate(async () => {
    CR.startRun(42);
    const px0 = CR.player.x;
    await new Promise(r => setTimeout(r, 400));
    const px1 = CR.player.x;
    return { rafOk: true, playerXDelta: Math.abs(px1 - px0), state: CR.state };
  });
}

async function runViewportLayout(page, label, viewport, screenshotName) {
  await page.setViewportSize(viewport);
  const url = `${BASE}/index.html?mobile=on&portraitlayout=1&v=selfharness`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  await page.evaluate(() => {
    CR.setMobileMode(true);
    CR.applyMobileControlSettings();
  });
  const layout = await page.evaluate(() => CR.runLayoutSelfCheck());
  const shot = runOutputPath(screenshotName);
  await page.screenshot({ path: shot, fullPage: false });
  const inViewport = await page.evaluate(() => {
    const ids = ['ml', 'mg', 'ms', 'mlookpad', 'mportmenu', 'view'];
    const vw = innerWidth, vh = innerHeight;
    return ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return { id, missing: true };
      const b = el.getBoundingClientRect();
      return {
        id,
        visible: b.width > 0 && b.height > 0,
        inView: b.bottom > 0 && b.right > 0 && b.top < vh && b.left < vw,
      };
    });
  });
  return { label, viewport, layoutPass: layout.pass, layout, inViewport, screenshot: screenshotName };
}

async function controlDockRegression(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/index.html?mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  const result = await page.evaluate(async () => {
    const snap = y => {
      CR.options.controlsYOffsetPx = y;
      CR.options.save();
      CR.applyMobileControlSettings();
      CR.syncPortraitMenuLabel?.();
      const r = id => {
        const el = document.getElementById(id);
        const b = el.getBoundingClientRect();
        const menu = document.getElementById('mportmenu');
        return {
          top: Math.round(b.top),
          left: Math.round(b.left),
          menuText: menu ? menu.textContent : '',
        };
      };
      const canvas = document.getElementById('view').getBoundingClientRect();
      return {
        y,
        ml: r('ml'),
        mg: r('mg'),
        ms: r('ms'),
        mlookpad: r('mlookpad'),
        mportmenu: r('mportmenu'),
        canvas: { top: Math.round(canvas.top), height: Math.round(canvas.height) },
        layout: CR.portraitLayout(),
      };
    };
    CR.startRun(42);
    const mid = snap(0);
    const high = snap(-120);
    const very = snap(-240);
    const moveDelta = mid.ml.top - high.ml.top;
    const menuDelta = mid.mportmenu.top - high.mportmenu.top;
    const menuTextStable = mid.mportmenu.menuText === high.mportmenu.menuText && mid.mportmenu.menuText === very.mportmenu.menuText;
    const minimapStable = mid.layout.minimapRect.y === very.layout.minimapRect.y;
    const pass = moveDelta >= 20 && Math.abs(menuDelta) < 1 && menuTextStable && minimapStable
      && mid.canvas.top === very.canvas.top;
    return { pass, moveDelta, menuDelta, menuTextStable, minimapStable, mid, high, very };
  });
  writeProof('proof-control-dock-playwright.json', result);
  return result;
}

async function pointerTorture(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/index.html?mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  const result = await page.evaluate(() => {
    const out = { pass: false, errors: [], checks: {} };
    CR.startRun(42);
    const ml = document.getElementById('ml');
    const lpad = document.getElementById('mlookpad');
    const br = ml.getBoundingClientRect();
    const cx = br.left + br.width / 2;
    const cy = br.top + br.height / 2;
    const pe = (el, type, x, y, pid) => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: pid,
      pointerType: 'touch', isPrimary: true, buttons: type === 'pointerdown' ? 1 : 0,
    }));
    const px0 = CR.player.x;
    pe(ml, 'pointerdown', cx, cy, 1);
    pe(ml, 'pointermove', cx, cy - 40, 1);
    pe(ml, 'pointermove', cx + 150, cy + 150, 1);
    out.checks.joyActive = joy.active;
    pe(ml, 'pointerup', cx + 150, cy + 150, 1);
    out.checks.joyCleared = !joy.active;
    out.checks.inpCleared = !inp.fwd && !inp.back && !inp.left && !inp.right;
    const angle0 = CR.player.angle;
    const lbr = lpad.getBoundingClientRect();
    const lx = lbr.left + lbr.width / 2;
    lpad.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, clientX: lx, clientY: lbr.top + 10,
      pointerId: 2, pointerType: 'mouse', isPrimary: true, buttons: 1,
    }));
    lpad.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, cancelable: true, clientX: lx + 35, clientY: lbr.top + 10,
      pointerId: 2, pointerType: 'mouse', isPrimary: true, buttons: 1,
    }));
    if (typeof CR.crApplyPendingInputActions === 'function') CR.crApplyPendingInputActions();
    out.checks.lookAngle = Math.abs(CR.player.angle - angle0) > 0.005;
    lpad.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, clientX: lx + 35, clientY: lbr.top + 10,
      pointerId: 2, pointerType: 'mouse', buttons: 0,
    }));
    out.pass = out.checks.joyActive && out.checks.joyCleared && out.checks.inpCleared && out.checks.lookAngle;
    if (!out.pass) out.errors.push('pointer torture checks failed');
    return out;
  });
  writeProof('proof-pointer-torture.json', result);
  return result;
}

async function viewportResilience(page) {
  const heights = [844, 720, 932];
  const rows = [];
  for (const h of heights) {
    await page.setViewportSize({ width: 390, height: h });
    await page.goto(`${BASE}/index.html?mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
    await waitGameReady(page);
    const row = await page.evaluate(() => {
      const layout = CR.runLayoutSelfCheck();
      const menu = document.getElementById('mportmenu');
      const b = menu && menu.getBoundingClientRect();
      return {
        h: innerHeight,
        layoutPass: layout.pass,
        menuVisible: !!(b && b.height > 0 && b.bottom <= innerHeight + 2),
        controlsVisible: ['ml', 'mlookpad'].every(id => {
          const el = document.getElementById(id);
          const r = el.getBoundingClientRect();
          return r.height > 0 && r.bottom <= innerHeight + 4;
        }),
        runtimeErrors: (window.__crRuntimeErrors || []).length,
      };
    });
    rows.push(row);
  }
  const pass = rows.every(r => r.layoutPass && r.menuVisible && r.controlsVisible && r.runtimeErrors === 0);
  const result = { pass, rows };
  writeProof('proof-viewport-resilience.json', result);
  return result;
}

async function saveLoadRoundtrip(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/index.html?mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  const result = await page.evaluate(() => {
    const out = { pass: false, errors: [] };
    try {
      localStorage.removeItem('cannedRun.save.v1');
      CR.startRun(4242);
      const px0 = CR.player.x;
      CR.player.x += 0.35;
      CR.SAVE.save();
      const blob = localStorage.getItem('cannedRun.save.v1');
      if (!blob) { out.errors.push('save not in localStorage'); return out; }
      const savedX = CR.player.x;
      location.reload();
      return { reload: true, savedX, seed: 4242 };
    } catch (e) {
      out.errors.push(String(e));
      return out;
    }
  });
  if (result.reload) {
    await waitGameReady(page);
    const after = await page.evaluate((savedX) => {
      const ok = CR.SAVE.load();
      return {
        pass: ok && Math.abs(CR.player.x - savedX) < 0.01,
        loaded: ok,
        x: CR.player.x,
        savedX,
        errors: (window.__crRuntimeErrors || []).map(e => e.message),
      };
    }, result.savedX);
    writeProof('proof-save-load-roundtrip.json', { ...result, after });
    return after;
  }
  writeProof('proof-save-load-roundtrip.json', result);
  return result;
}

async function audioUnlock(page) {
  await page.goto(`${BASE}/index.html?mobile=on`, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  const result = await page.evaluate(async () => {
    const before = CR.getAudioUnlockProof();
    await CR.resumeAudioContext();
    const view = document.getElementById('view');
    view.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch' }));
    view.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch' }));
    let beepOk = true;
    try { beep(440, 0.02, 'sine', 0.01); } catch (e) { beepOk = false; }
    const after = CR.getAudioUnlockProof();
    return { pass: beepOk && !after.lastError, before, after, beepOk };
  });
  writeProof('proof-audio-unlock.json', result);
  return result;
}

async function visualRegressionShots(page) {
  const shots = [];
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  const scenarios = [
    { name: 'normal', file: 'proof-visual-normal.png', setup: 'CR.startRun(42)' },
    { name: 'hall', file: 'proof-visual-hall.png', setup: "CR.startCustomLevel('hall_of_servants')" },
    {
      name: 'exit-ready',
      file: 'proof-visual-exit-ready.png',
      setup: "CR.startRun(42);CR.game.helped=CR.game.quota;if(CR.game.exit)CR.game.exit.active=true;",
    },
    {
      name: 'give-target',
      file: 'proof-visual-give-target.png',
      setup: "CR.startRun(42);var n=CR.game.npcs.find(function(x){return !x.helped;});if(n){CR.player.x=n.x-0.55;CR.player.y=n.y;CR.player.cans=Math.max(n.need+2,8);CR.player.dir=Math.atan2(n.y-CR.player.y,n.x-CR.player.x);CR.game.aimNpc=n;}",
    },
    { name: 'onboarding', file: 'proof-visual-onboarding.png', setup: 'CR.showOnboardingHelp()' },
    { name: 'normal-seed42', url: baseUrl, setup: 'CR.startRun(42)' },
    { name: 'snc-hall', url: baseUrl, setup: "CR.startCustomLevel('hall_of_servants')" },
    { name: 'options', url: baseUrl, setup: "CR.state='options'" },
    { name: 'dock-mid', url: baseUrl, setup: 'CR.options.controlsYOffsetPx=0;CR.applyMobileControlSettings();CR.startRun(42)' },
    { name: 'dock-high', url: baseUrl, setup: 'CR.options.controlsYOffsetPx=-120;CR.applyMobileControlSettings();CR.startRun(42)' },
  ];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const sc of scenarios) {
    const url = sc.url || baseUrl;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await waitGameReady(page);
    await page.evaluate(sc.setup);
    await page.waitForTimeout(500);
    const blank = await canvasNonBlank(page);
    const file = sc.file || `proof-visual-${sc.name}.png`;
    await page.screenshot({ path: runOutputPath(file) });
    shots.push({ scenario: sc.name, file, blankOk: blank.ok, canvas: blank });
  }
  const crVisual = await page.evaluate(() => {
    window.__crRuntimeErrors = window.__crRuntimeErrors || [];
    return CR.runVisualReadabilitySelfCheck();
  });
  const index = {
    pass: shots.every((s) => s.blankOk) && crVisual.pass === true,
    shots,
    visualReadabilitySelfCheck: crVisual,
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-visual-regression-index.json', index);
  writeProof('proof-visual-readability-selfcheck.json', crVisual);
  return index;
}

async function visualRectangleProofShots(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  const shots = [];
  const scenarios = [
    { file: 'proof-visualfix-normal.png', setup: 'CR.startRun(42)' },
    { file: 'proof-visualfix-turn-left.png', setup: 'CR.startRun(42);CR.player.angle-=0.85;CR.player.dir=CR.player.angle;' },
    { file: 'proof-visualfix-turn-right.png', setup: 'CR.startRun(42);CR.player.angle+=0.85;CR.player.dir=CR.player.angle;' },
  ];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const sc of scenarios) {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await waitGameReady(page);
    await page.evaluate(sc.setup);
    await page.waitForTimeout(500);
    const blank = await canvasNonBlank(page);
    await page.screenshot({ path: runOutputPath(sc.file) });
    shots.push({ file: sc.file, blankOk: blank.ok });
  }
  const crRect = await page.evaluate(() => {
    window.__crRuntimeErrors = window.__crRuntimeErrors || [];
    return CR.runVisualRectangleRegressionSelfCheck();
  });
  writeProof('proof-visual-rectangle-regression-selfcheck.json', crRect);
  return {
    pass: shots.every((s) => s.blankOk) && crRect.pass === true,
    shots,
    crVisualRectangleRegression: crRect,
  };
}

async function soundFeedbackProofShots(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 390, height: 844 });
  const shots = [];
  const scenarios = [
    { file: 'proof-feedback-can.png', fn: "CR.startRun(42);CR.crTriggerSoundCue('canCollect',{forceHud:true});" },
    { file: 'proof-feedback-exit-ready.png', fn: "CR.startRun(42);CR.crTriggerSoundCue('quotaExitReady',{forceHud:true});" },
    { file: 'proof-feedback-give-blocked.png', fn: "CR.startRun(42);CR.crTriggerSoundCue('giveBlocked',{forceHud:true});" },
    { file: 'proof-feedback-district-complete.png', fn: "CR.startRun(42);CR.crTriggerSoundCue('districtComplete',{forceHud:true});" },
  ];
  for (const sc of scenarios) {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await waitGameReady(page);
    await page.evaluate(sc.fn);
    await page.waitForTimeout(450);
    const blank = await canvasNonBlank(page);
    await page.screenshot({ path: runOutputPath(sc.file) });
    shots.push({ file: sc.file, blankOk: blank.ok });
  }
  const crSound = await page.evaluate(() => {
    window.__crRuntimeErrors = window.__crRuntimeErrors || [];
    return CR.runSoundFeedbackSelfCheck();
  });
  writeProof('proof-sound-feedback.json', crSound);
  writeProof('proof-sound-feedback-selfcheck.json', crSound);
  return {
    pass: shots.every((s) => s.blankOk) && crSound.pass === true,
    shots,
    crSoundFeedback: crSound,
  };
}

async function viewportSafeAreaSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  const scenarios = [
    { label: 'pixel7-portrait', viewport: { width: 412, height: 915 }, shot: 'proof-viewport-pixel7-portrait.png' },
    { label: 'pixel7-landscape', viewport: { width: 915, height: 412 }, shot: 'proof-viewport-pixel7-landscape.png' },
    { label: 'travislike-portrait', viewport: { width: 360, height: 800 }, shot: null },
    { label: 'short-portrait-urlbar', viewport: { width: 390, height: 720 }, shot: 'proof-viewport-short-portrait.png' },
    { label: 'tall-portrait-no-urlbar', viewport: { width: 390, height: 900 }, shot: 'proof-viewport-tall-portrait.png' },
    { label: 'fullscreen-like', viewport: { width: 390, height: 844 }, shot: null },
  ];
  const results = [];
  let optionsShotDone = false;

  for (const sc of scenarios) {
    const url = sc.label === 'pixel7-landscape'
      ? `${BASE}/index.html?mobile=on`
      : baseUrl;
    await page.setViewportSize(sc.viewport);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await waitGameReady(page);
    await page.evaluate(() => {
      window.__crRuntimeErrors = window.__crRuntimeErrors || [];
      CR.setMobileMode(true);
      CR.syncVisualViewportShell();
      CR.startRun(77);
      CR.state = 'play';
      CR.paused = false;
      CR.applyMobileControlSettings();
    });
    await page.waitForTimeout(350);

    const check1 = await page.evaluate(() => CR.runViewportSafeAreaSelfCheck());
    await page.setViewportSize({ width: sc.viewport.width, height: Math.max(400, sc.viewport.height - 40) });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      CR.syncVisualViewportShell();
      CR.applyMobileControlSettings();
    });
    const check2 = await page.evaluate(() => CR.runViewportSafeAreaSelfCheck());
    const fp = await page.evaluate(() => CR.crPublicStateFingerprint());

    if (sc.shot) {
      await page.screenshot({ path: runOutputPath(sc.shot) });
    }

    if (!optionsShotDone && sc.label === 'travislike-portrait') {
      await page.evaluate(() => {
        CR.state = 'options';
        if (typeof drawMobileMenu === 'function') drawMobileMenu();
        const r = document.getElementById('rmenu');
        if (r) r.scrollTop = r.scrollHeight;
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: runOutputPath('proof-options-back-reachable.png') });
      optionsShotDone = true;
    }

    results.push({
      label: sc.label,
      viewport: sc.viewport,
      pass: check1.pass === true && check2.pass === true && fpIsPublicSafe(fp),
      checkInitial: check1,
      checkAfterResize: check2,
      fingerprint: fp,
      shot: sc.shot,
    });
  }

  const pass = results.every((r) => r.pass);
  const proof = {
    pass,
    build: results[0]?.checkInitial?.build || null,
    scenarios: results,
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-viewport-safearea.json', proof);
  return { pass, proof, results };
}

async function mobileControlReliabilitySection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  await page.evaluate(() => {
    CR.setMobileMode(true);
    CR.startRun(88);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    CR.applyMobileControlSettings();
  });

  const rel = await page.evaluate(() => CR.runMobileControlReliabilitySelfCheck());

  await page.evaluate(() => {
    CR.startRun(88);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    const ml = document.getElementById('ml');
    const lpad = document.getElementById('mlookpad');
    const mbr = ml.getBoundingClientRect();
    const cx = mbr.left + mbr.width * 0.5;
    const cy = mbr.top + mbr.height * 0.5;
    CR.crDispatchPointer(ml, 'pointerdown', cx, cy, 42, 'touch');
    CR.crDispatchPointer(ml, 'pointermove', cx, cy - 35, 42, 'touch');
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: runOutputPath('proof-control-move-drag.png') });

  await page.evaluate(() => {
    const ml = document.getElementById('ml');
    const mbr = ml.getBoundingClientRect();
    const cx = mbr.left + mbr.width * 0.5;
    const cy = mbr.top + mbr.height * 0.5;
    CR.crDispatchPointer(ml, 'pointerup', cx, cy - 35, 42, 'touch');
    const lpad = document.getElementById('mlookpad');
    const lbr = lpad.getBoundingClientRect();
    const lx = lbr.left + lbr.width * 0.5;
    const ly = lbr.top + lbr.height * 0.5;
    CR.crDispatchPointer(lpad, 'pointerdown', lx, ly, 44, 'touch');
    CR.crDispatchPointer(lpad, 'pointermove', lx + 40, ly, 44, 'touch');
    CR.crDispatchPointer(lpad, 'pointerup', lx + 40, ly, 44, 'touch');
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: runOutputPath('proof-control-look-drag.png') });

  await page.evaluate(() => {
    const mportmenu = document.getElementById('mportmenu');
    if (mportmenu) {
      const r = mportmenu.getBoundingClientRect();
      CR.crDispatchTouch(mportmenu, 'touchstart', r.left + r.width / 2, r.top + 8, 66);
      CR.crDispatchTouch(mportmenu, 'touchend', r.left + r.width / 2, r.top + 8, 66);
    }
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: runOutputPath('proof-control-menu-open.png') });

  const stuck = await page.evaluate(() => ({
    joyActive: CR.getDebugState().joy.active,
  }));

  const pass = rel.pass === true && !stuck.joyActive;

  const proof = {
    pass,
    build: rel.build,
    reliability: rel,
    stuckAfterTorture: stuck,
    screenshots: ['proof-control-move-drag.png', 'proof-control-look-drag.png', 'proof-control-menu-open.png'],
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-mobile-control-reliability.json', proof);
  writeProof('proof-pointer-events-log.json', { checks: rel.checks, evidence: rel.evidence, stuck });
  return { pass, proof, reliability: rel };
}

async function declarativeControlsSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  await page.evaluate(() => {
    CR.setMobileMode(true);
    localStorage.removeItem(CR.CR_CONTROLS_LS_KEY);
    CR.startRun(88);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    CR.applyMobileControlSettings();
  });
  await page.screenshot({ path: runOutputPath('proof-control-edit-default.png') });

  const resizeProof = await page.evaluate(() => {
    CR.crPrepareSelfCheckPortrait();
    localStorage.removeItem(CR.CR_CONTROLS_LS_KEY);
    CR.crEnterControlEditMode();
    const ml = document.getElementById('ml');
    const mg = document.getElementById('mg');
    return { moveW0: ml.offsetWidth, giveW0: mg.offsetWidth };
  });
  await page.screenshot({ path: runOutputPath('proof-control-resize-move-before.png') });
  const moveResize = await page.evaluate(() => {
    const ml = document.getElementById('ml');
    const w0 = ml.offsetWidth;
    CR.crStepEditControlSize('move', 1);
    CR.crStepEditControlSize('move', 1);
    return { moveWAfter: ml.offsetWidth, moveGrew: ml.offsetWidth > w0 + 4 };
  });
  await page.screenshot({ path: runOutputPath('proof-control-resize-move-after.png') });
  await page.screenshot({ path: runOutputPath('proof-control-resize-button-before.png') });
  const giveResize = await page.evaluate(() => {
    const mg = document.getElementById('mg');
    const w0 = mg.offsetWidth;
    CR.crSelectEditControl('give');
    CR.crStepEditControlSize('give', 1);
    CR.crStepEditControlSize('give', 1);
    return { giveWAfter: mg.offsetWidth, giveGrew: mg.offsetWidth > w0 + 3 };
  });
  await page.screenshot({ path: runOutputPath('proof-control-resize-button-after.png') });
  await page.evaluate(() => CR.crFinishControlEditMode(false));
  Object.assign(resizeProof, moveResize, giveResize);

  const optionsEdit = await page.evaluate(() => {
    CR.crPrepareSelfCheckPortrait();
    CR.options.mobileControls = 'on';
    CR.state = CR.STATE.OPTIONS;
    CR.paused = false;
    CR.drawMobileMenu();
    const rmenu = document.getElementById('rmenu');
    const beforeVisible = !!(rmenu && !rmenu.classList.contains('in'));
    CR.rmenuAction('option-edit-controls');
    CR.drawMobileMenu();
    const ml = document.getElementById('ml');
    const bar = document.getElementById('crCtrlEditBar');
    const mbr0 = ml.getBoundingClientRect();
    const x0 = mbr0.left + 12;
    const y0 = mbr0.top + 12;
    CR.crDispatchPointer(ml, 'pointerdown', x0, y0, 211, 'touch');
    CR.crDispatchPointer(ml, 'pointermove', x0 + 36, y0 - 28, 211, 'touch');
    CR.crDispatchPointer(ml, 'pointerup', x0 + 36, y0 - 28, 211, 'touch');
    CR.applyMobileControlSettings();
    const mbr1 = ml.getBoundingClientRect();
    CR.crFinishControlEditMode(false);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    CR.applyMobileControlSettings();
    return {
      beforeVisible,
      optionsHidden: !!(rmenu && rmenu.classList.contains('in')),
      editBarDisplay: bar ? bar.style.display : '',
      moveSize: ml ? { w: ml.offsetWidth, h: ml.offsetHeight, display: ml.style.display } : null,
      moved: Math.abs(mbr1.left - mbr0.left) > 6 || Math.abs(mbr1.top - mbr0.top) > 6,
    };
  });

  const decl = await page.evaluate(() => CR.runDeclarativeControlsSelfCheck());

  await page.evaluate(() => {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const ml = document.getElementById('ml');
    const r = ml.getBoundingClientRect();
    CR.crPersistControlOverrides({
      v: 1,
      overrides: {
        move: { x: 0.04, y: 0.68, w: r.width / cw, h: r.height / ch },
      },
    });
    CR.applyMobileControlSettings();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: runOutputPath('proof-control-edit-moved.png') });

  const hit = await page.evaluate(() => {
    const L = CR.portraitLayout(undefined, { skipMinimapClamp: true });
    const ml = document.getElementById('ml');
    const br = ml.getBoundingClientRect();
    const cx = br.left + br.width * 0.5;
    const cy = br.top + br.height * 0.5;
    return { hits: CR.crControlHitTest(cx, cy, L), left: br.left };
  });

  await page.evaluate(() => {
    CR.crResetControlLayoutOverrides();
    CR.applyMobileControlSettings();
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-control-edit-reset.png') });

  await page.evaluate(() => {
    CR.startRun(88);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    const ml = document.getElementById('ml');
    const mbr = ml.getBoundingClientRect();
    const cx = mbr.left + mbr.width * 0.5;
    const cy = mbr.top + mbr.height * 0.5;
    CR.crDispatchPointer(ml, 'pointerdown', cx, cy, 201, 'touch');
    CR.crDispatchPointer(ml, 'pointercancel', cx, cy, 201, 'touch');
  });

  const stuck = await page.evaluate(() => ({
    joyActive: CR.getDebugState().joy.active,
    build: typeof BUILD_ID !== 'undefined' ? BUILD_ID : CR.runDeclarativeControlsSelfCheck().build,
  }));

  const pass = decl.pass === true && stuck.joyActive === false;

  const proof = {
    pass,
    build: decl.build,
    declarative: decl,
    optionsEditPath: optionsEdit,
    resizeProof,
    hitTest: hit,
    stuckAfterCancel: stuck,
    screenshots: [
      'proof-control-edit-default.png',
      'proof-control-resize-move-before.png',
      'proof-control-resize-move-after.png',
      'proof-control-resize-button-before.png',
      'proof-control-resize-button-after.png',
      'proof-control-edit-moved.png',
      'proof-control-edit-reset.png',
    ],
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-declarative-controls.json', proof);
  writeProof('proof-edit-controls-resize.json', {
    pass: decl.pass === true && resizeProof.moveGrew === true && resizeProof.giveGrew === true,
    build: decl.build,
    resizeProof,
    declarativeChecks: decl.checks,
    timestamp: new Date().toISOString(),
  });
  writeProof('proof-control-hit-test.json', hit);
  return { pass, proof, declarative: decl };
}

async function movementCollisionSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const fpBefore = await page.evaluate(() => CR.crPublicStateFingerprint());

  const mov = await page.evaluate(() => CR.runMovementCollisionSelfCheck());

  await page.evaluate(() => {
    CR.startRun(88);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-collision-corridor.png') });

  const isoOk = await page.evaluate(() => CR.crFingerprintPublicSafe(CR.crPublicStateFingerprint()));

  const pass = mov.pass === true && isoOk !== false;

  const proof = {
    pass,
    build: mov.build,
    movementCollision: mov,
    harnessStateOk: isoOk,
    screenshots: ['proof-collision-corridor.png'],
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-movement-collision.json', proof);
  return { pass, proof, movementCollision: mov };
}

async function reachabilitySection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const reach = await page.evaluate(() => CR.runReachabilitySelfCheck());

  await page.evaluate(() => {
    CR.startCustomLevel('hall_of_servants');
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: runOutputPath('proof-reachability-hall.png') });

  await page.evaluate(() => {
    CR.crHarnessInstallMicroMap([
      '#######',
      '#.....#',
      '#.#.#.#',
      '#.....#',
      '#.....#',
      '#######',
    ]);
    CR.player.x = 1.5;
    CR.player.y = 2.5;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-reachability-wallblocked.png') });

  const isoOk = await page.evaluate(() => CR.crFingerprintPublicSafe(CR.crPublicStateFingerprint()));
  const pass = reach.pass === true && isoOk !== false;

  const proof = {
    pass,
    build: reach.build,
    reachability: reach,
    harnessStateOk: isoOk,
    screenshots: ['proof-reachability-hall.png', 'proof-reachability-wallblocked.png'],
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-reachability.json', proof);
  return { pass, proof, reachability: reach };
}

async function proceduralLevelValidationSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const proc = await page.evaluate(() => CR.runProceduralLevelValidationSelfCheck());
  const isoOk = await page.evaluate(() => CR.crFingerprintPublicSafe(CR.crPublicStateFingerprint()));

  if (proc.failures && proc.failures.length) {
    writeProof('proof-procedural-failures.json', { failures: proc.failures, timestamp: new Date().toISOString() });
  }

  const pass = proc.pass === true && isoOk !== false;
  const proof = {
    pass,
    build: proc.build,
    proceduralLevelValidation: proc,
    harnessStateOk: isoOk,
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-procedural-level-validation.json', proof);
  return { pass, proof, proceduralLevelValidation: proc };
}

async function fullRunProgressionSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const fr = await page.evaluate(() => CR.runFullRunProgressionSelfCheck());
  const isoOk = await page.evaluate(() => CR.crFingerprintPublicSafe(CR.crPublicStateFingerprint()));

  const proof = {
    pass: fr.pass === true && isoOk !== false,
    build: fr.build,
    fullRunProgression: fr,
    harnessStateOk: isoOk,
    timestamp: new Date().toISOString(),
  };
  if (fr.measurements && fr.measurements.beforeLoadState) {
    writeProof('proof-full-run-before-save.json', fr.measurements.beforeLoadState);
  }
  if (fr.measurements && fr.measurements.afterLoadState) {
    writeProof('proof-full-run-after-load.json', fr.measurements.afterLoadState);
  }
  writeProof('proof-full-run-progression.json', proof);
  try {
    await page.screenshot({ path: runOutputPath('proof-full-run-complete.png') });
    proof.screenshot = 'proof-full-run-complete.png';
  } catch (_e) {}
  return { pass: proof.pass, proof, fullRunProgression: fr };
}

async function decorativePropsSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const dp = await page.evaluate(() => CR.runDecorativePropsSelfCheck());

  await page.evaluate(() => {
    CR.startRun(424242);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: runOutputPath('proof-decorative-props-world.png') });

  await page.evaluate(() => {
    CR.player.x = 12.5;
    CR.player.y = 8.5;
    CR.player.angle = 0.4;
    CR.player.dir = 0.4;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-decorative-props-closeup.png') });

  const isoOk = await page.evaluate(() => CR.crFingerprintPublicSafe(CR.crPublicStateFingerprint()));
  const pass = dp.pass === true && isoOk !== false;
  const proof = {
    pass,
    build: dp.build,
    decorativeProps: dp,
    harnessStateOk: isoOk,
    screenshots: ['proof-decorative-props-world.png', 'proof-decorative-props-closeup.png'],
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-decorative-props.json', proof);
  return { pass, proof, decorativeProps: dp };
}

async function d1ParkLandmarkSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const d1 = await page.evaluate(() => CR.runD1ParkLandmarkSelfCheck());
  writeProof('proof-d1-park-landmark.json', d1);

  await page.evaluate(() => {
    CR.startRun(880101);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: runOutputPath('proof-d1-park-landmark-fpv.png') });
  await page.screenshot({ path: runOutputPath('proof-d1-park-landmark-minimap.png') });

  const isoOk = await page.evaluate(() => CR.crFingerprintPublicSafe(CR.crPublicStateFingerprint()));
  const pass = d1.pass === true && isoOk !== false;
  const proof = {
    pass,
    build: d1.build,
    d1ParkLandmark: d1,
    harnessStateOk: isoOk,
    screenshots: ['proof-d1-park-landmark-fpv.png', 'proof-d1-park-landmark-minimap.png'],
    timestamp: new Date().toISOString(),
  };
  return { pass, proof, d1ParkLandmark: d1 };
}

async function earlyDistrictProgressionSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const ed = await page.evaluate(() => CR.runEarlyDistrictProgressionSelfCheck());
  writeProof('proof-early-district-progression.json', ed);

  const shots = [
    { seed: 880101, file: 'proof-d1-park-plaza.png' },
    { seed: 880102, file: 'proof-d2-storefront-street.png' },
    { seed: 880103, file: 'proof-d3-alley-street.png' },
    { seed: 880104, file: 'proof-d4-service-pockets.png' },
  ];
  for (const s of shots) {
    await page.evaluate((seed) => {
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
    }, s.seed);
    await page.waitForTimeout(120);
    await page.screenshot({ path: runOutputPath(s.file) });
  }

  const isoOk = await page.evaluate(() => CR.crFingerprintPublicSafe(CR.crPublicStateFingerprint()));
  const pass = ed.pass === true && isoOk !== false;
  return {
    pass,
    proof: {
      pass,
      build: ed.build,
      earlyDistrictProgression: ed,
      harnessStateOk: isoOk,
      screenshots: shots.map((s) => s.file),
      timestamp: new Date().toISOString(),
    },
    earlyDistrictProgression: ed,
  };
}

async function levelSelectorSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const menuProof = await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(1);
    CR.state = CR.STATE.TITLE;
    CR.paused = false;
    if (typeof drawMobileMenu === 'function') drawMobileMenu();
    const labels = CR.crTitleMenuSelectableRows().map((it) => CR.titleMenuRowLabel(it));
    const cycle = [];
    for (let i = 0; i < 5; i++) cycle.push('D' + CR.crCycleSelectedStartDistrict());
    return {
      labels,
      cycle: cycle.join('→'),
      rmenuHtml: document.getElementById('rmenu')?.innerHTML || '',
    };
  });
  await page.screenshot({ path: runOutputPath('proof-level-selector-menu.png') });

  const ls = await page.evaluate(() => CR.runLevelSelectorSelfCheck());
  writeProof('proof-level-selector.json', ls);

  const districtShots = [
    { d: 1, seed: 881101, file: 'proof-level-selector-d1.png' },
    { d: 2, seed: 881102, file: 'proof-level-selector-d2.png' },
    { d: 3, seed: 881103, file: 'proof-level-selector-d3.png' },
    { d: 4, seed: 881104, file: 'proof-level-selector-d4.png' },
  ];
  for (const s of districtShots) {
    await page.evaluate(({ d, seed }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
    }, s);
    await page.waitForTimeout(120);
    await page.screenshot({ path: runOutputPath(s.file) });
  }

  const pass =
    ls.pass === true &&
    menuProof.labels[0] === 'NEW RUN' &&
    (menuProof.labels[1] || '').indexOf('START DISTRICT: D') === 0 &&
    menuProof.cycle === 'D2→D3→D4→D1→D2' &&
    menuProof.rmenuHtml.indexOf('title-cycle-district') >= 0;

  return {
    pass,
    proof: {
      pass,
      build: ls.build,
      levelSelector: ls,
      menuProof,
      screenshots: ['proof-level-selector-menu.png', ...districtShots.map((s) => s.file)],
      timestamp: new Date().toISOString(),
    },
    levelSelector: ls,
  };
}

async function fpvStreetShimmerFixSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const sf = await page.evaluate(() => CR.runFpvStreetShimmerFixSelfCheck());
  writeProof('proof-fpv-street-shimmer-fix.json', sf);

  const shots = [
    { d: 2, seed: 890301, file: 'proof-fpv-street-shimmer-d2.png' },
    { d: 3, seed: 890302, file: 'proof-fpv-street-shimmer-d3.png' },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.player !== 'undefined') CR.player.angle = Math.PI / 2;
    }, s);
    await page.waitForTimeout(160);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(890301);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-streetread-minimap-preserved.png') });

  return { pass: sf.pass === true, fpvStreetShimmerFix: sf };
}

async function fpvFacadeTargetPolishSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const ff = await page.evaluate(() => CR.runFpvFacadeTargetPolishSelfCheck());
  writeProof('proof-fpv-facade-target-polish.json', ff);

  const shots = [
    { d: 1, seed: 890501, file: 'proof-facadefix-d1.png', angle: 0 },
    { d: 2, seed: 890502, file: 'proof-facadefix-d2-storefront.png', angle: Math.PI / 2 },
    { d: 3, seed: 890503, file: 'proof-facadefix-d3-alley.png', angle: Math.PI * 0.75 },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, angle }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.player !== 'undefined') CR.player.angle = angle;
    }, s);
    await page.waitForTimeout(200);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(890502);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-facadefix-minimap-preserved.png') });

  return { pass: ff.pass === true, fpvFacadeTargetPolish: ff };
}

async function buildingModuleFacadeSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const bm = await page.evaluate(() => CR.runBuildingModuleFacadeSelfCheck());
  writeProof('proof-building-module-facade.json', bm);

  const shots = [
    { d: 2, seed: 890602, file: 'proof-modules-d2-storefront-front.png', angle: Math.PI / 2 },
    { d: 3, seed: 890603, file: 'proof-modules-d3-side-back-alley.png', angle: Math.PI * 0.78 },
    { d: 1, seed: 890601, file: 'proof-modules-d1-pavilion.png', angle: 0 },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, angle }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.player !== 'undefined') CR.player.angle = angle;
    }, s);
    await page.waitForTimeout(200);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(890602);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-modules-minimap-preserved.png') });

  return { pass: bm.pass === true, buildingModuleFacade: bm };
}

async function facadePackBridgeSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const fp = await page.evaluate(() => CR.runFacadePackBridgeSelfCheck());
  writeProof('proof-facade-pack-bridge.json', fp);

  const roleDebug = await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(902002);
    CR.state = CR.STATE.PLAY;
    let hit = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !hit; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !hit; x++) {
        if (!CR.game.buildingGrid[y][x]) continue;
        for (const face of ['north', 'south', 'east', 'west']) {
          const d = CR.crDebugDescribeFacadeHit(x, y, face);
          if (d.role && d.role.indexOf('storefront') === 0) {
            hit = d;
            break;
          }
        }
      }
    }
    CR.crSetSelectedStartDistrict(3);
    CR.startRun(902003);
    let hit3 = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !hit3; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !hit3; x++) {
        if (!CR.game.buildingGrid[y][x]) continue;
        for (const face of ['north', 'east', 'west']) {
          const d = CR.crDebugDescribeFacadeHit(x, y, face);
          if (d.role && (d.role === 'blank_brick' || d.role === 'service_wall' || d.role === 'side_door')) {
            hit3 = d;
            break;
          }
        }
      }
    }
    return { d2: hit, d3: hit3, packVersion: (typeof CR_FACADE_PACK !== 'undefined' && CR_FACADE_PACK.version) || null };
  });
  roleDebug.packVersion = roleDebug.packVersion || (await page.evaluate(() => CR_FACADE_PACK && CR_FACADE_PACK.version));
  writeProof('proof-facadepack-role-debug.json', roleDebug);

  const shots = [
    { d: 2, seed: 902102, file: 'proof-facadepack-d2-storefront-front.png', angle: Math.PI / 2 },
    { d: 3, seed: 902103, file: 'proof-facadepack-d3-side-back-alley.png', angle: Math.PI * 0.82 },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, angle }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.player !== 'undefined') CR.player.angle = angle;
    }, s);
    await page.waitForTimeout(220);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(902102);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-facadepack-minimap-preserved.png') });

  return { pass: fp.pass === true, facadePackBridge: fp };
}

async function facadePackV2SafeSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const v2 = await page.evaluate(() => CR.runFacadePackV2SafeModuleSelfCheck());
  writeProof('proof-facadev2safe-modules.json', v2);

  const roleDebug = await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(902201);
    CR.state = CR.STATE.PLAY;
    let boarded = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !boarded; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !boarded; x++) {
        if (!CR.game.buildingGrid[y][x] || CR.game.buildingGrid[y][x].mid !== 'boarded_shop_3x2') continue;
        for (const face of ['south', 'north']) {
          const d = CR.crDebugDescribeFacadeHit(x, y, face);
          if (d.role && (d.role.indexOf('boarded') >= 0 || d.role === 'storefront_door')) {
            boarded = d;
            break;
          }
        }
      }
    }
    CR.crSetSelectedStartDistrict(3);
    CR.startRun(902203);
    CR.state = CR.STATE.PLAY;
    let garage = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !garage; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !garage; x++) {
        if (!CR.game.buildingGrid[y][x] || CR.game.buildingGrid[y][x].mid !== 'garage_service_4x2') continue;
        for (const face of ['south', 'north', 'east']) {
          const d = CR.crDebugDescribeFacadeHit(x, y, face);
          if (d.role && (d.role.indexOf('garage') >= 0 || d.role === 'service_door' || d.role === 'blank_concrete')) {
            garage = d;
            break;
          }
        }
      }
    }
    const mods = (typeof CR_FACADE_PACK !== 'undefined' && CR_FACADE_PACK.modules) ? Object.keys(CR_FACADE_PACK.modules) : [];
    const labOnly = ['two_story_storefront_4x2_visual', 'walkin_storefront_4x3', 'corner_shop_L'];
    const labOnlyInGameplay = labOnly.filter((id) => mods.indexOf(id) >= 0);
    return {
      boarded,
      garage,
      packVersion: CR_FACADE_PACK && CR_FACADE_PACK.version,
      moduleList: mods,
      labOnlyNotImported: labOnlyInGameplay.length === 0,
    };
  });
  writeProof('proof-facadev2safe-role-debug.json', roleDebug);

  const shots = [
    { d: 2, seed: 902201, file: 'proof-facadev2safe-d2-boarded-shop.png', angle: Math.PI / 2 },
    { d: 3, seed: 902203, file: 'proof-facadev2safe-d3-garage-service.png', angle: Math.PI * 0.82 },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, angle }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.player !== 'undefined') CR.player.angle = angle;
    }, s);
    await page.waitForTimeout(220);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(902201);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-facadev2safe-minimap-preserved.png') });

  return { pass: v2.pass === true, facadePackV2Safe: v2 };
}

async function fpvGroundPlaneAlignmentSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const result = await page.evaluate(() => {
    const r = CR.runFpvGroundPlaneAlignmentSelfCheck();
    const debug = CR.crDebugGroundPlaneAlignment();
    return { pass: r.pass === true && debug.pass === true, selfcheck: r, debug };
  });
  writeProof('proof-groundplane-alignment.json', result.selfcheck);
  writeProof('proof-groundplane-debug.json', result.debug);

  const shots = [
    { d: 2, seed: 903202, file: 'proof-groundplane-d2-npc-storefront.png', mode: 'npc', mids: ['storefront_4x2', 'storefront_3x2', 'boarded_shop_3x2'] },
    { d: 2, seed: 903202, file: 'proof-groundplane-d2-can-storefront.png', mode: 'can', mids: ['storefront_4x2', 'storefront_3x2', 'boarded_shop_3x2'] },
    { d: 3, seed: 903203, file: 'proof-groundplane-d3-garage-service.png', mode: 'garage', mids: ['garage_service_4x2'] },
    { d: 1, seed: 903101, file: 'proof-groundplane-d1-pavilion.png', mode: 'pavilion', mids: ['restroom_pavilion'] },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, mode, mids }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      const G = CR.game;
      function isRoad(x, y) {
        return x >= 1 && y >= 1 && x < G.MAP_W - 1 && y < G.MAP_H - 1 && G.map[y] && G.map[y][x] === 0;
      }
      function findTarget() {
        let fallback = null;
        for (let y = 1; y < G.MAP_H - 5; y++) {
          for (let x = 1; x < G.MAP_W - 1; x++) {
            const c = G.buildingGrid && G.buildingGrid[y] && G.buildingGrid[y][x];
            if (!c || mids.indexOf(c.mid) < 0) continue;
            fallback = fallback || { x, y, mid: c.mid };
            if (isRoad(x, y + 1) && isRoad(x, y + 2) && isRoad(x, y + 3)) return { x, y, mid: c.mid };
          }
        }
        return fallback;
      }
      const t = findTarget();
      if (t) {
        const px = t.x + 0.5;
        const py = Math.min(G.MAP_H - 2.2, t.y + 3.35);
        const oy = Math.min(G.MAP_H - 2.6, t.y + 1.28);
        CR.player.x = px;
        CR.player.y = py;
        CR.player.angle = -Math.PI / 2;
        if (mode === 'npc') {
          G.npcs = [{ x: px, y: oy, kind: 'hungry', need: 1, helped: false, wob: 0, thank: '' }];
          G.pickups = [];
        } else if (mode === 'can') {
          G.pickups = [{ x: px, y: oy, taken: false, amt: 2, wob: 0 }];
          G.npcs = [];
        } else if (mode === 'pavilion') {
          G.pickups = [{ x: px, y: oy, taken: false, amt: 2, wob: 0 }];
        }
        if (typeof window.updateAim === 'function') window.updateAim();
      }
    }, s);
    await page.waitForTimeout(260);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(903202);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: runOutputPath('proof-groundplane-minimap-preserved.png') });

  return { pass: !!result.pass, errors: result.selfcheck.errors || [], screenshots: shots.map(s => s.file).concat(['proof-groundplane-minimap-preserved.png']) };
}

async function d2D3FacadeReadabilityFinalSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const result = await page.evaluate(() => {
    const selfcheck = CR.runD2D3FacadeReadabilityFinalSelfCheck();
    const debug = CR.crDebugFacadeReadabilityFinal();
    return { pass: selfcheck.pass === true && debug.pass === true, selfcheck, debug };
  });
  writeProof('proof-facadefinal-readability.json', result.selfcheck);
  writeProof('proof-facadefinal-debug.json', result.debug);

  const shots = [
    { d: 2, seed: 914201, file: 'proof-facadefinal-d2-storefront.png', mode: 'storefront' },
    { d: 2, seed: 914201, file: 'proof-facadefinal-d2-boarded-shop.png', mode: 'boarded' },
    { d: 3, seed: 914203, file: 'proof-facadefinal-d3-garage-service.png', mode: 'garage' },
    { d: 3, seed: 914203, file: 'proof-facadefinal-d3-side-back.png', mode: 'side' },
    { d: 1, seed: 914101, file: 'proof-facadefinal-d1-preserved.png', mode: 'd1' },
    { d: 2, seed: 914201, file: 'proof-facadefinal-groundplane-preserved.png', mode: 'ground' },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, mode }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      const G = CR.game;
      function roleOk(role) {
        if (mode === 'storefront') return role === 'storefront_window' || role === 'storefront_door' || role === 'storefront_sign';
        if (mode === 'boarded') return role === 'boarded_window' || role === 'storefront_door';
        if (mode === 'garage') return role === 'garage_bay' || role === 'service_door' || role === 'utility_wall';
        if (mode === 'side') return role === 'side_door' || role === 'service_wall' || role === 'blank_brick' || role === 'blank_concrete' || role === 'utility_wall';
        if (mode === 'd1') return role === 'storefront_window' || role === 'storefront_door' || role === 'mural_wall' || role === 'utility_wall';
        return role === 'storefront_window' || role === 'storefront_door' || role === 'boarded_window';
      }
      function moduleOk(mid) {
        if (mode === 'storefront' || mode === 'ground') return mid === 'storefront_4x2' || mid === 'storefront_3x2';
        if (mode === 'boarded') return mid === 'boarded_shop_3x2';
        if (mode === 'garage') return mid === 'garage_service_4x2';
        if (mode === 'side') return mid === 'garage_service_4x2' || mid === 'blank_service_block' || mid === 'storefront_4x2' || mid === 'storefront_3x2';
        if (mode === 'd1') return mid === 'restroom_pavilion';
        return false;
      }
      const preferredFaces = mode === 'side' ? ['east','west','north','south'] : ['south','north','east','west'];
      let target = null;
      for (let y = 1; y < G.MAP_H - 1 && !target; y++) {
        for (let x = 1; x < G.MAP_W - 1 && !target; x++) {
          const c = G.buildingGrid && G.buildingGrid[y] && G.buildingGrid[y][x];
          if (!c || !moduleOk(c.mid)) continue;
          for (const face of preferredFaces) {
            const desc = CR.crDebugDescribeFacadeHit(x, y, face);
            if (desc && roleOk(desc.role)) { target = { x, y, face, mid: c.mid, role: desc.role }; break; }
          }
        }
      }
      function placeFor(t) {
        if (!t) return false;
        const dirs = {
          south: { dx: 0, dy: 1, angle: -Math.PI / 2 },
          north: { dx: 0, dy: -1, angle: Math.PI / 2 },
          east: { dx: 1, dy: 0, angle: Math.PI },
          west: { dx: -1, dy: 0, angle: 0 },
        };
        const dir = dirs[t.face] || dirs.south;
        for (const dist of [3.2, 2.6, 2.0, 1.45, 3.8, 4.4]) {
          const px = t.x + 0.5 + dir.dx * dist;
          const py = t.y + 0.5 + dir.dy * dist;
          if (px > 1 && py > 1 && px < G.MAP_W - 1 && py < G.MAP_H - 1 && (typeof canStand !== 'function' || canStand(px, py))) {
            CR.player.x = px;
            CR.player.y = py;
            CR.player.angle = dir.angle;
            CR.player.dir = dir.angle;
            return true;
          }
        }
        CR.player.x = Math.max(1.5, Math.min(G.MAP_W - 1.5, t.x + 0.5 + dir.dx * 2.6));
        CR.player.y = Math.max(1.5, Math.min(G.MAP_H - 1.5, t.y + 0.5 + dir.dy * 2.6));
        CR.player.angle = dir.angle;
        CR.player.dir = dir.angle;
        return true;
      }
      placeFor(target);
      if (mode === 'ground' && target) {
        const dirs = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] };
        const dxy = dirs[target.face] || [0, 1];
        const ox = target.x + 0.5 + dxy[0] * 1.08;
        const oy = target.y + 0.5 + dxy[1] * 1.08;
        G.npcs = [{ x: ox - dxy[1] * 0.18, y: oy + dxy[0] * 0.18, kind: 'hungry', need: 1, helped: false, wob: 0, thank: '' }];
        G.pickups = [{ x: ox + dxy[1] * 0.26, y: oy - dxy[0] * 0.26, taken: false, amt: 2, wob: 0 }];
      }
      if (typeof window.updateAim === 'function') window.updateAim();
    }, s);
    await page.waitForTimeout(260);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(914201);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: runOutputPath('proof-facadefinal-minimap-preserved.png') });

  return { pass: !!result.pass, errors: result.selfcheck.errors || [], screenshots: shots.map(s => s.file).concat(['proof-facadefinal-minimap-preserved.png']) };
}

async function walltextures2ScaleVariationSection(page) {
  const result = await page.evaluate(() => CR.runWalltextures2ScaleVariationSelfCheck());
  writeProof('proof-walltextures2-scale-variation.json', result);

  const mats = [
    { key: 'stucco', file: 'proof-walltextures2-stucco.png' },
    { key: 'red_brick', file: 'proof-walltextures2-red-brick.png' },
    { key: 'light_gray_cinderblock', file: 'proof-walltextures2-cinderblock.png' },
    { key: 'aluminum_siding', file: 'proof-walltextures2-aluminum-siding.png' },
  ];
  for (const m of mats) {
    await page.evaluate((materialKey) => {
      CR.crInstallMaterialTextureBenchScene(materialKey);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, m.key);
    await page.waitForTimeout(280);
    await page.screenshot({ path: runOutputPath(m.file) });
  }

  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(880102);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
    const G = CR.game;
    let best = { y: Math.floor(G.MAP_H / 2), score: -1 };
    for (let y = 1; y < G.MAP_H - 1; y++) {
      let score = 0;
      for (let x = 2; x < G.MAP_W - 2; x++) {
        if (x > 1 && y > 1 && x < G.MAP_W - 1 && y < G.MAP_H - 1) score++;
      }
      if (score > best.score) best = { y, score };
    }
    CR.player.x = 4.5;
    CR.player.y = best.y + 0.5;
    CR.player.angle = 0;
    CR.player.dir = 0;
    if (typeof drawScene === 'function') drawScene(performance.now());
  });
  await page.waitForTimeout(280);
  await page.screenshot({ path: runOutputPath('proof-walltextures2-mixed-street.png') });

  await page.evaluate(() => {
    if (typeof drawMinimap === 'function') drawMinimap();
    if (typeof drawScene === 'function') drawScene(performance.now());
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: runOutputPath('proof-walltextures2-minimap-preserved.png') });

  return {
    pass: result.pass === true,
    errors: result.errors || [],
    screenshots: mats.map((m) => m.file).concat([
      'proof-walltextures2-mixed-street.png',
      'proof-walltextures2-minimap-preserved.png',
    ]),
  };
}

async function walltextures3WholeBuildingTextureOwnershipSection(page) {
  const result = await page.evaluate(() => CR.runWalltextures3WholeBuildingTextureOwnershipSelfCheck());
  writeProof('proof-walltextures3-whole-building-texture-ownership.json', result);

  async function frameDistrict(d, seed, mode) {
    await page.evaluate(({ d, seed, mode }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      const G = CR.game;
      const map = G.map || [];
      let bestRow = Math.floor(G.MAP_H / 2);
      let bestScore = -1;
      for (let y = 1; y < G.MAP_H - 1; y++) {
        let score = 0;
        for (let x = 2; x < G.MAP_W - 2; x++) {
          const wt = map[y] && map[y][x];
          if (wt > 0) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestRow = y;
        }
      }
      CR.player.x = mode === 'corner' ? 6.5 : 4.5;
      CR.player.y = bestRow + 0.5;
      CR.player.angle = mode === 'corner' ? Math.PI / 2 : 0;
      CR.player.dir = CR.player.angle;
      if (typeof window.updateAim === 'function') window.updateAim();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, { d, seed, mode });
    await page.waitForTimeout(280);
  }

  const shots = [
    { d: 2, seed: 290144176, file: 'proof-walltextures3-d2-long-wall.png', mode: 'long' },
    { d: 2, seed: 290144176, file: 'proof-walltextures3-d2-corner.png', mode: 'corner' },
    { d: 3, seed: 880103, file: 'proof-walltextures3-d3-long-wall.png', mode: 'long' },
  ];
  for (const s of shots) {
    await frameDistrict(s.d, s.seed, s.mode);
    await page.screenshot({ path: runOutputPath(s.file) });
  }

  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(290144176);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    if (typeof drawMinimap === 'function') drawMinimap();
    if (typeof drawScene === 'function') drawScene(performance.now());
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: runOutputPath('proof-walltextures3-minimap-preserved.png') });

  return {
    pass: result.pass === true,
    errors: result.errors || [],
    screenshots: shots.map((s) => s.file).concat(['proof-walltextures3-minimap-preserved.png']),
  };
}

async function walltextures4MaterialShapeReadabilitySection(page) {
  await page.setViewportSize({ width: 412, height: 915 });
  const result = await page.evaluate(() => CR.runWalltextures4MaterialShapeReadabilitySelfCheck());
  writeProof('proof-walltextures4-material-shape-readability.json', result);

  async function benchShot(materialKey, file) {
    await page.evaluate((materialKey) => {
      CR.crInstallMaterialTextureBenchScene(materialKey);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, materialKey);
    await page.waitForTimeout(280);
    await page.screenshot({ path: runOutputPath(file) });
  }

  await benchShot('light_gray_cinderblock', 'proof-walltextures4-cinderblock-phone-proxy.png');
  await benchShot('aluminum_siding', 'proof-walltextures4-siding-phone-proxy.png');

  async function frameDistrict(d, seed, mode) {
    await page.evaluate(({ d, seed, mode }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      const G = CR.game;
      const map = G.map || [];
      let bestRow = Math.floor(G.MAP_H / 2);
      let bestScore = -1;
      for (let y = 1; y < G.MAP_H - 1; y++) {
        let score = 0;
        for (let x = 2; x < G.MAP_W - 2; x++) {
          const wt = map[y] && map[y][x];
          if (wt > 0) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestRow = y;
        }
      }
      CR.player.x = mode === 'corner' ? 6.5 : 4.5;
      CR.player.y = bestRow + 0.5;
      CR.player.angle = mode === 'corner' ? Math.PI / 2 : 0;
      CR.player.dir = CR.player.angle;
      if (typeof window.updateAim === 'function') window.updateAim();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, { d, seed, mode });
    await page.waitForTimeout(280);
  }

  await frameDistrict(2, 290144176, 'long');
  await page.screenshot({ path: runOutputPath('proof-walltextures4-d2-long-wall.png') });
  await frameDistrict(2, 290144176, 'corner');
  await page.screenshot({ path: runOutputPath('proof-walltextures4-corner-material-continuity.png') });

  return {
    pass: result.pass === true,
    errors: result.errors || [],
    screenshots: [
      'proof-walltextures4-cinderblock-phone-proxy.png',
      'proof-walltextures4-siding-phone-proxy.png',
      'proof-walltextures4-d2-long-wall.png',
      'proof-walltextures4-corner-material-continuity.png',
    ],
  };
}

async function decalIntegration1Section(page) {
  await page.setViewportSize({ width: 412, height: 915 });
  const result = await page.evaluate(() => CR.runDecalIntegration1SelfCheck());
  writeProof('proof-decalintegration1.json', result);

  // Screenshots: storefront with sign + glass door/window
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(290144176);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
    const G = CR.game;
    const map = G.map || [];
    let bestRow = Math.floor(G.MAP_H / 2);
    let bestScore = -1;
    for (let y = 1; y < G.MAP_H - 1; y++) {
      let score = 0;
      for (let x = 2; x < G.MAP_W - 2; x++) {
        const wt = map[y] && map[y][x];
        if (wt > 0) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestRow = y;
      }
    }
    CR.player.x = 4.5;
    CR.player.y = bestRow + 0.5;
    CR.player.angle = 0;
    CR.player.dir = 0;
    if (typeof window.updateAim === 'function') window.updateAim();
    if (typeof drawScene === 'function') drawScene(performance.now());
  });
  await page.waitForTimeout(280);
  await page.screenshot({ path: runOutputPath('proof-decalintegration1-d2-storefront.png') });

  // Residential wall screenshot (D1)
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(1);
    CR.startRun(880101);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
    const G = CR.game;
    const map = G.map || [];
    let bestRow = Math.floor(G.MAP_H / 2);
    let bestScore = -1;
    for (let y = 1; y < G.MAP_H - 1; y++) {
      let score = 0;
      for (let x = 2; x < G.MAP_W - 2; x++) {
        const wt = map[y] && map[y][x];
        if (wt > 0) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestRow = y;
      }
    }
    CR.player.x = 4.5;
    CR.player.y = bestRow + 0.5;
    CR.player.angle = 0;
    CR.player.dir = 0;
    if (typeof window.updateAim === 'function') window.updateAim();
    if (typeof drawScene === 'function') drawScene(performance.now());
  });
  await page.waitForTimeout(280);
  await page.screenshot({ path: runOutputPath('proof-decalintegration1-d1-residential.png') });

  // Service/alley screenshot (D3)
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(3);
    CR.startRun(903203);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
    const G = CR.game;
    const map = G.map || [];
    let bestRow = Math.floor(G.MAP_H / 2);
    let bestScore = -1;
    for (let y = 1; y < G.MAP_H - 1; y++) {
      let score = 0;
      for (let x = 2; x < G.MAP_W - 2; x++) {
        const wt = map[y] && map[y][x];
        if (wt > 0) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestRow = y;
      }
    }
    CR.player.x = 4.5;
    CR.player.y = bestRow + 0.5;
    CR.player.angle = 0;
    CR.player.dir = 0;
    if (typeof window.updateAim === 'function') window.updateAim();
    if (typeof drawScene === 'function') drawScene(performance.now());
  });
  await page.waitForTimeout(280);
  await page.screenshot({ path: runOutputPath('proof-decalintegration1-d3-service.png') });

  return {
    pass: result.pass === true,
    errors: result.errors || [],
    screenshots: [
      'proof-decalintegration1-d2-storefront.png',
      'proof-decalintegration1-d1-residential.png',
      'proof-decalintegration1-d3-service.png',
    ],
  };
}

async function decalIntegration3VisualSection(page) {
  await page.setViewportSize({ width: 412, height: 915 });
  const result = await page.evaluate(() => CR.runDecalIntegration3VisualSelfCheck());
  writeProof('proof-decalintegration3-visual.json', result);

  async function benchShot(materialKey, file) {
    await page.evaluate((materialKey) => {
      CR.crInstallMaterialTextureBenchScene(materialKey);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, materialKey);
    await page.waitForTimeout(280);
    await page.screenshot({ path: runOutputPath(file) });
  }

  async function frameDistrict(d, seed, file, angle) {
    await page.evaluate(({ d, seed, angle }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      const G = CR.game;
      const map = G.map || [];
      let bestRow = Math.floor(G.MAP_H / 2);
      let bestScore = -1;
      for (let y = 1; y < G.MAP_H - 1; y++) {
        let score = 0;
        for (let x = 2; x < G.MAP_W - 2; x++) {
          const wt = map[y] && map[y][x];
          if (wt > 0) score++;
        }
        if (score > bestScore) { bestScore = score; bestRow = y; }
      }
      CR.player.x = 4.5;
      CR.player.y = bestRow + 0.5;
      CR.player.angle = angle || 0;
      CR.player.dir = angle || 0;
      if (typeof window.updateAim === 'function') window.updateAim();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, { d, seed, angle });
    await page.waitForTimeout(280);
    await page.screenshot({ path: runOutputPath(file) });
  }

  await frameDistrict(2, 290144176, 'proof-decalintegration3-d2-long-wall.png', 0);
  await frameDistrict(2, 290144176, 'proof-decalintegration3-d2-storefront-facade.png', 1.57);
  await benchShot('red_brick', 'proof-decalintegration3-d2-brick-stability-a.png');
  await benchShot('red_brick', 'proof-decalintegration3-d2-brick-stability-b.png');
  await frameDistrict(1, 880101, 'proof-decalintegration3-d1-residential-facade.png', 0);
  await frameDistrict(3, 123456789, 'proof-decalintegration3-d3-service-facade.png', 0);

  return {
    pass: result.pass === true,
    errors: result.errors || [],
    metrics: result.metrics || {},
    screenshots: result.screenshots || [],
  };
}

async function decalIntegration4MaterialIdentitySection(page) {
  await page.setViewportSize({ width: 412, height: 915 });
  const result = await page.evaluate(() => CR.runDecalIntegration4MaterialIdentitySelfCheck());
  writeProof('proof-decalintegration4-material-identity.json', result);

  async function benchShot(materialKey, file) {
    await page.evaluate((materialKey) => {
      CR.crInstallMaterialTextureBenchScene(materialKey);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, materialKey);
    await page.waitForTimeout(280);
    await page.screenshot({ path: runOutputPath(file) });
  }

  await benchShot('red_brick', 'proof-decalintegration4-brick-identity.png');
  await benchShot('light_gray_cinderblock', 'proof-decalintegration4-cinderblock-identity.png');
  await benchShot('red_brick', 'proof-decalintegration4-brick-vs-cinder-side-by-side-a.png');
  await page.evaluate(() => {
    CR.crInstallMaterialTextureBenchScene('light_gray_cinderblock');
    if (typeof drawScene === 'function') drawScene(performance.now());
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: runOutputPath('proof-decalintegration4-brick-vs-cinder-side-by-side.png') });

  return {
    pass: result.pass === true,
    errors: result.errors || [],
    metrics: result.metrics || {},
    screenshots: result.screenshots || [],
  };
}

async function facadeSkins1Section(page) {
  await page.setViewportSize({ width: 412, height: 915 });
  const result = await page.evaluate(() => CR.runFacadeSkins1SelfCheck());
  writeProof('proof-facadeskins1.json', result);

  async function skinShot(mode, file) {
    await page.evaluate((mode) => {
      if (typeof CR.crInstallFacadeSkinProofScene === 'function') CR.crInstallFacadeSkinProofScene(mode);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, mode);
    await page.waitForTimeout(320);
    await page.screenshot({ path: runOutputPath(file) });
  }

  await skinShot('storefront', 'proof-facadeskins1-storefront-front.png');
  await skinShot('house', 'proof-facadeskins1-house-front.png');
  await skinShot('service', 'proof-facadeskins1-service-front.png');
  await skinShot('longface', 'proof-facadeskins1-long-face-no-repeat.png');

  return {
    pass: result.pass === true,
    errors: result.errors || [],
    metrics: result.metrics || {},
    screenshots: result.metrics && result.metrics.screenshotFiles ? result.metrics.screenshotFiles : [],
  };
}


async function decalIntegration2Section(page) {
  await page.setViewportSize({ width: 412, height: 915 });
  const result = await page.evaluate(() => CR.runDecalIntegration2SelfCheck());
  writeProof('proof-decalintegration2.json', result);

  // Material stability bench shots
  async function benchShot(materialKey, file) {
    await page.evaluate((materialKey) => {
      CR.crInstallMaterialTextureBenchScene(materialKey);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, materialKey);
    await page.waitForTimeout(280);
    await page.screenshot({ path: runOutputPath(file) });
  }
  await benchShot('red_brick', 'proof-decalintegration2-material-stability-brick.png');
  await benchShot('aluminum_siding', 'proof-decalintegration2-material-stability-siding.png');

  // D2 storefront with visible decals
  async function frameDistrict(d, seed, file) {
    await page.evaluate(({ d, seed }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      const G = CR.game;
      const map = G.map || [];
      let bestRow = Math.floor(G.MAP_H / 2);
      let bestScore = -1;
      for (let y = 1; y < G.MAP_H - 1; y++) {
        let score = 0;
        for (let x = 2; x < G.MAP_W - 2; x++) {
          const wt = map[y] && map[y][x];
          if (wt > 0) score++;
        }
        if (score > bestScore) { bestScore = score; bestRow = y; }
      }
      CR.player.x = 4.5;
      CR.player.y = bestRow + 0.5;
      CR.player.angle = 0;
      CR.player.dir = 0;
      if (typeof window.updateAim === 'function') window.updateAim();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, { d, seed });
    await page.waitForTimeout(280);
    await page.screenshot({ path: runOutputPath(file) });
  }

  await frameDistrict(2, 290144176, 'proof-decalintegration2-d2-storefront-visible-decals.png');
  await frameDistrict(2, 290144176, 'proof-decalintegration2-d2-component-decals.png');
  await frameDistrict(1, 880101, 'proof-decalintegration2-d1-residential-decals.png');

  return {
    pass: result.pass === true,
    errors: result.errors || [],
    screenshots: [
      'proof-decalintegration2-material-stability-brick.png',
      'proof-decalintegration2-material-stability-siding.png',
      'proof-decalintegration2-d2-storefront-visible-decals.png',
      'proof-decalintegration2-d2-component-decals.png',
      'proof-decalintegration2-d1-residential-decals.png',
    ],
  };
}

async function singleMaterialBuildingTextureSection(page) {
  const result = await page.evaluate(() => CR.runSingleMaterialBuildingTextureSelfCheck());
  writeProof('proof-single-material-building-textures.json', result);

  const shots = [
    { d: 1, seed: 880101, file: 'proof-single-material-d1.png' },
    { d: 2, seed: 880102, file: 'proof-single-material-d2.png' },
    { d: 3, seed: 903203, file: 'proof-single-material-d3.png' },
    { d: 4, seed: 934204, file: 'proof-single-material-d4.png' },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.dismissOnboardingHelp === 'function') CR.dismissOnboardingHelp();
      const G = CR.game;
      function standOk(x, y) {
        return x > 1 && y > 1 && x < G.MAP_W - 1 && y < G.MAP_H - 1 && (typeof canStand !== 'function' || canStand(x, y));
      }
      let best = { y: Math.floor(G.MAP_H / 2), score: -1 };
      for (let y = 1; y < G.MAP_H - 1; y++) {
        let score = 0;
        for (let x = 2; x < G.MAP_W - 2; x++) if (standOk(x + 0.5, y + 0.5)) score++;
        if (score > best.score) best = { y, score };
      }
      CR.player.x = 3.5;
      CR.player.y = best.y + 0.5;
      CR.player.angle = 0;
      CR.player.dir = 0;
      if (typeof window.updateAim === 'function') window.updateAim();
      if (typeof drawScene === 'function') drawScene(performance.now());
    }, s);
    await page.waitForTimeout(280);
    await page.screenshot({ path: runOutputPath(s.file) });
  }

  return { pass: result.pass === true, errors: result.errors || [], screenshots: shots.map((s) => s.file) };
}

async function buildingSmoothStyleSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const result = await page.evaluate(() => {
    const selfcheck = CR.runBuildingSmoothStyleSelfCheck();
    const debug = CR.crDebugBuildingSmoothStyle();
    return { pass: selfcheck.pass === true && debug.pass === true, selfcheck, debug };
  });
  writeProof('proof-buildingsmooth-style.json', result.selfcheck);
  writeProof('proof-buildingsmooth-debug.json', result.debug);

  const shots = [
    { d: 2, seed: 924201, file: 'proof-buildingsmooth-d2-road-view.png', mode: 'road' },
    { d: 2, seed: 924201, file: 'proof-buildingsmooth-d2-close-wall.png', mode: 'close' },
    { d: 2, seed: 924201, file: 'proof-buildingsmooth-d2-storefront.png', mode: 'storefront' },
    { d: 2, seed: 924201, file: 'proof-buildingsmooth-d2-boarded-shop.png', mode: 'boarded' },
    { d: 3, seed: 924203, file: 'proof-buildingsmooth-d3-garage-service.png', mode: 'garage' },
    { d: 3, seed: 924203, file: 'proof-buildingsmooth-d3-side-wall.png', mode: 'side' },
    { d: 1, seed: 924101, file: 'proof-buildingsmooth-d1-preserved.png', mode: 'd1' },
    { d: 2, seed: 924201, file: 'proof-buildingsmooth-groundplane-preserved.png', mode: 'ground' },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, mode }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      const G = CR.game;
      function standOk(x, y) {
        return x > 1 && y > 1 && x < G.MAP_W - 1 && y < G.MAP_H - 1 && (typeof canStand !== 'function' || canStand(x, y));
      }
      if (mode === 'road') {
        let best = { y: Math.floor(G.MAP_H / 2), score: -1 };
        for (let y = 1; y < G.MAP_H - 1; y++) {
          let score = 0;
          for (let x = 2; x < G.MAP_W - 2; x++) if (standOk(x + 0.5, y + 0.5)) score++;
          if (score > best.score) best = { y, score };
        }
        CR.player.x = 3.5;
        CR.player.y = best.y + 0.5;
        CR.player.angle = 0;
        CR.player.dir = 0;
        return;
      }
      function roleOk(role) {
        if (mode === 'storefront' || mode === 'close') return role === 'storefront_window' || role === 'storefront_door' || role === 'storefront_sign';
        if (mode === 'boarded') return role === 'boarded_window' || role === 'storefront_door';
        if (mode === 'garage') return role === 'garage_bay' || role === 'service_door' || role === 'utility_wall';
        if (mode === 'side') return role === 'side_door' || role === 'service_wall' || role === 'blank_brick' || role === 'blank_concrete' || role === 'utility_wall';
        if (mode === 'd1') return role === 'storefront_window' || role === 'storefront_door' || role === 'mural_wall' || role === 'utility_wall';
        return role === 'storefront_window' || role === 'storefront_door' || role === 'boarded_window';
      }
      function moduleOk(mid) {
        if (mode === 'storefront' || mode === 'close' || mode === 'ground') return mid === 'storefront_4x2' || mid === 'storefront_3x2';
        if (mode === 'boarded') return mid === 'boarded_shop_3x2';
        if (mode === 'garage') return mid === 'garage_service_4x2';
        if (mode === 'side') return mid === 'garage_service_4x2' || mid === 'blank_service_block' || mid === 'storefront_4x2' || mid === 'storefront_3x2';
        if (mode === 'd1') return mid === 'restroom_pavilion';
        return false;
      }
      const preferredFaces = mode === 'side' ? ['east','west','north','south'] : ['south','north','east','west'];
      let target = null;
      for (let y = 1; y < G.MAP_H - 1 && !target; y++) {
        for (let x = 1; x < G.MAP_W - 1 && !target; x++) {
          const c = G.buildingGrid && G.buildingGrid[y] && G.buildingGrid[y][x];
          if (!c || !moduleOk(c.mid)) continue;
          for (const face of preferredFaces) {
            const desc = CR.crDebugDescribeFacadeHit(x, y, face);
            if (desc && roleOk(desc.role)) { target = { x, y, face, mid: c.mid, role: desc.role }; break; }
          }
        }
      }
      function placeFor(t) {
        if (!t) return false;
        const dirs = {
          south: { dx: 0, dy: 1, angle: -Math.PI / 2 },
          north: { dx: 0, dy: -1, angle: Math.PI / 2 },
          east: { dx: 1, dy: 0, angle: Math.PI },
          west: { dx: -1, dy: 0, angle: 0 },
        };
        const dir = dirs[t.face] || dirs.south;
        const distances = mode === 'close' ? [1.25, 1.45, 1.7, 2.0, 2.4, 3.0] : [3.2, 2.6, 2.0, 1.45, 3.8, 4.4];
        for (const dist of distances) {
          const px = t.x + 0.5 + dir.dx * dist;
          const py = t.y + 0.5 + dir.dy * dist;
          if (standOk(px, py)) {
            CR.player.x = px;
            CR.player.y = py;
            CR.player.angle = dir.angle;
            CR.player.dir = dir.angle;
            return true;
          }
        }
        CR.player.x = Math.max(1.5, Math.min(G.MAP_W - 1.5, t.x + 0.5 + dir.dx * 2.0));
        CR.player.y = Math.max(1.5, Math.min(G.MAP_H - 1.5, t.y + 0.5 + dir.dy * 2.0));
        CR.player.angle = dir.angle;
        CR.player.dir = dir.angle;
        return true;
      }
      placeFor(target);
      if (mode === 'ground' && target) {
        const dirs = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] };
        const dxy = dirs[target.face] || [0, 1];
        const ox = target.x + 0.5 + dxy[0] * 1.08;
        const oy = target.y + 0.5 + dxy[1] * 1.08;
        G.npcs = [{ x: ox - dxy[1] * 0.18, y: oy + dxy[0] * 0.18, kind: 'hungry', need: 1, helped: false, wob: 0, thank: '' }];
        G.pickups = [{ x: ox + dxy[1] * 0.26, y: oy - dxy[0] * 0.26, taken: false, amt: 2, wob: 0 }];
      }
      if (typeof window.updateAim === 'function') window.updateAim();
    }, s);
    await page.waitForTimeout(260);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(924201);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: runOutputPath('proof-buildingsmooth-minimap-preserved.png') });

  return { pass: !!result.pass, errors: result.selfcheck.errors || [], screenshots: shots.map(s => s.file).concat(['proof-buildingsmooth-minimap-preserved.png']) };
}

async function continuousFacadeTextureSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const result = await page.evaluate(() => {
    const selfcheck = CR.runContinuousFacadeTextureSelfCheck();
    const debug = CR.crDebugContinuousFacadeTexture();
    return { pass: selfcheck.pass === true && debug.pass === true, selfcheck, debug };
  });
  writeProof('proof-facadetexture-continuous.json', result.selfcheck);
  writeProof('proof-facadetexture-debug.json', result.debug);

  const shots = [
    { d: 2, seed: 934201, file: 'proof-facadetexture-d2-road-view.png', mode: 'road' },
    { d: 2, seed: 934201, file: 'proof-facadetexture-d2-close-wall.png', mode: 'close' },
    { d: 2, seed: 934201, file: 'proof-facadetexture-d2-storefront.png', mode: 'storefront' },
    { d: 2, seed: 934201, file: 'proof-facadetexture-d2-boarded-shop.png', mode: 'boarded' },
    { d: 3, seed: 934203, file: 'proof-facadetexture-d3-garage-service.png', mode: 'garage' },
    { d: 3, seed: 934203, file: 'proof-facadetexture-d3-side-wall.png', mode: 'side' },
    { d: 1, seed: 934101, file: 'proof-facadetexture-d1-preserved.png', mode: 'd1' },
    { d: 2, seed: 934201, file: 'proof-facadetexture-groundplane-preserved.png', mode: 'ground' },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, mode }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      const G = CR.game;
      function standOk(x, y) {
        return x > 1 && y > 1 && x < G.MAP_W - 1 && y < G.MAP_H - 1 && (typeof canStand !== 'function' || canStand(x, y));
      }
      if (mode === 'road') {
        let best = { y: Math.floor(G.MAP_H / 2), score: -1 };
        for (let y = 1; y < G.MAP_H - 1; y++) {
          let score = 0;
          for (let x = 2; x < G.MAP_W - 2; x++) if (standOk(x + 0.5, y + 0.5)) score++;
          if (score > best.score) best = { y, score };
        }
        CR.player.x = 3.5;
        CR.player.y = best.y + 0.5;
        CR.player.angle = 0;
        CR.player.dir = 0;
        return;
      }
      function roleOk(role) {
        if (mode === 'storefront' || mode === 'close') return role === 'storefront_window' || role === 'storefront_door' || role === 'storefront_sign';
        if (mode === 'boarded') return role === 'boarded_window' || role === 'storefront_door';
        if (mode === 'garage') return role === 'garage_bay' || role === 'service_door' || role === 'utility_wall';
        if (mode === 'side') return role === 'side_door' || role === 'service_wall' || role === 'blank_brick' || role === 'blank_concrete' || role === 'utility_wall';
        if (mode === 'd1') return role === 'storefront_window' || role === 'storefront_door' || role === 'mural_wall' || role === 'utility_wall';
        return role === 'storefront_window' || role === 'storefront_door' || role === 'boarded_window';
      }
      function moduleOk(mid) {
        if (mode === 'storefront' || mode === 'close' || mode === 'ground') return mid === 'storefront_4x2' || mid === 'storefront_3x2';
        if (mode === 'boarded') return mid === 'boarded_shop_3x2';
        if (mode === 'garage') return mid === 'garage_service_4x2';
        if (mode === 'side') return mid === 'garage_service_4x2' || mid === 'blank_service_block' || mid === 'storefront_4x2' || mid === 'storefront_3x2';
        if (mode === 'd1') return mid === 'restroom_pavilion';
        return false;
      }
      const preferredFaces = mode === 'side' ? ['east','west','north','south'] : ['south','north','east','west'];
      let target = null;
      for (let y = 1; y < G.MAP_H - 1 && !target; y++) {
        for (let x = 1; x < G.MAP_W - 1 && !target; x++) {
          const c = G.buildingGrid && G.buildingGrid[y] && G.buildingGrid[y][x];
          if (!c || !moduleOk(c.mid)) continue;
          for (const face of preferredFaces) {
            const desc = CR.crDebugDescribeFacadeHit(x, y, face);
            if (desc && roleOk(desc.role)) { target = { x, y, face, mid: c.mid, role: desc.role }; break; }
          }
        }
      }
      function placeFor(t) {
        if (!t) return false;
        const dirs = {
          south: { dx: 0, dy: 1, angle: -Math.PI / 2 },
          north: { dx: 0, dy: -1, angle: Math.PI / 2 },
          east: { dx: 1, dy: 0, angle: Math.PI },
          west: { dx: -1, dy: 0, angle: 0 },
        };
        const dir = dirs[t.face] || dirs.south;
        const distances = mode === 'close' ? [1.18, 1.35, 1.55, 1.85, 2.25, 3.0] : [3.2, 2.6, 2.0, 1.45, 3.8, 4.4];
        for (const dist of distances) {
          const px = t.x + 0.5 + dir.dx * dist;
          const py = t.y + 0.5 + dir.dy * dist;
          if (standOk(px, py)) {
            CR.player.x = px;
            CR.player.y = py;
            CR.player.angle = dir.angle;
            CR.player.dir = dir.angle;
            return true;
          }
        }
        CR.player.x = Math.max(1.5, Math.min(G.MAP_W - 1.5, t.x + 0.5 + dir.dx * 2.0));
        CR.player.y = Math.max(1.5, Math.min(G.MAP_H - 1.5, t.y + 0.5 + dir.dy * 2.0));
        CR.player.angle = dir.angle;
        CR.player.dir = dir.angle;
        return true;
      }
      placeFor(target);
      if (mode === 'ground' && target) {
        const dirs = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] };
        const dxy = dirs[target.face] || [0, 1];
        const ox = target.x + 0.5 + dxy[0] * 1.08;
        const oy = target.y + 0.5 + dxy[1] * 1.08;
        G.npcs = [{ x: ox - dxy[1] * 0.18, y: oy + dxy[0] * 0.18, kind: 'hungry', need: 1, helped: false, wob: 0, thank: '' }];
        G.pickups = [{ x: ox + dxy[1] * 0.26, y: oy - dxy[0] * 0.26, taken: false, amt: 2, wob: 0 }];
      }
      if (typeof window.updateAim === 'function') window.updateAim();
    }, s);
    await page.waitForTimeout(260);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(934201);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: runOutputPath('proof-facadetexture-minimap-preserved.png') });

  return { pass: !!result.pass, errors: result.selfcheck.errors || [], screenshots: shots.map(s => s.file).concat(['proof-facadetexture-minimap-preserved.png']) };
}

async function spriteGroundAnchorSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => {
    const CR = window.CR;
    const out = { pass: false, checks: {}, evidence: {}, errors: [] };
    try {
      const r = CR.runSpriteGroundAnchorSelfCheck();
      out.pass = !!r.pass;
      out.checks = r.checks || {};
      out.evidence = r.evidence || {};
      out.errors = r.errors || [];
    } catch (e) {
      out.errors.push(String(e && e.message ? e.message : e));
    }
    return out;
  });
  const setupScene = (district, seed, angle, fixture = null) => page.evaluate(async ({ district, seed, angle, fixture }) => {
    const CR = window.CR;
    const authoritativeState = () => {
      const registry = CR.game.buildingRegistry || {};
      const buildings = Object.keys(registry).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).map((key) => {
        const building = registry[key] || {};
        return {
          key, bid: building.bid ?? null, assetId: building.assetId ?? null, kind: building.kind ?? null,
          mid: building.mid ?? null, x0: building.x0 ?? null, y0: building.y0 ?? null,
          w: building.w ?? null, h: building.h ?? null, renderMode: building.renderMode ?? null,
          faces: building.faces ? Object.keys(building.faces).sort().map((face) => [face, building.faces[face]]) : [],
        };
      });
      const registeredCells = [];
      for (let y = 0; y < (CR.game.buildingGrid || []).length; y++) {
        for (let x = 0; x < (CR.game.buildingGrid[y] || []).length; x++) {
          const cell = CR.game.buildingGrid[y][x];
          if (cell) registeredCells.push({ x, y, bid: cell.bid ?? null, mid: cell.mid ?? null });
        }
      }
      return {
        npcs: (CR.game.npcs || []).map((npc, index) => ({ index, id: npc.id ?? null, kind: npc.kind ?? null, x: npc.x, y: npc.y, helped: !!npc.helped, need: npc.need ?? null })),
        pickups: (CR.game.pickups || []).map((pickup, index) => ({ index, id: pickup.id ?? null, kind: pickup.kind ?? 'can', x: pickup.x, y: pickup.y, taken: !!pickup.taken, amt: pickup.amt ?? null })),
        props: (CR.game.props || []).map((prop, index) => ({ index, id: prop.id ?? null, type: prop.type ?? prop.kind ?? null, x: prop.x, y: prop.y, state: prop.state ?? null })),
        buildings,
        registeredCells,
      };
    };
    const hashState = async (value) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    };
    CR.crSetSelectedStartDistrict(district);
    CR.startRun(seed);
    const before = authoritativeState();
    const beforeHash = await hashState(before);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
    CR.player.x = fixture?.player?.x ?? 20;
    CR.player.y = fixture?.player?.y ?? 10;
    CR.player.angle = fixture?.player?.angle ?? angle;
    angle = CR.player.angle;
    if (typeof CR.drawScene === 'function') CR.drawScene(performance.now());
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const debug = CR.crDebugSpriteProjection();
    const selectedDistrict = CR.crGetSelectedStartDistrict();
    debug.naturalScene = {
      selectedDistrict,
      district: CR.game.district,
      seed: CR.game.seed,
      player: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
      npcs: (CR.game.npcs || []).map((npc, index) => ({ index, x: npc.x, y: npc.y, helped: !!npc.helped })),
      pickups: (CR.game.pickups || []).map((can, index) => ({ index, x: can.x, y: can.y, taken: !!can.taken })),
      aimNpc: CR.game.aimNpc ? { x: CR.game.aimNpc.x, y: CR.game.aimNpc.y } : null,
    };
    debug.supportedSetup = {
      selectedDistrict,
      district: CR.game.district,
      seed: CR.game.seed,
      startRunCompleted: CR.game.district === district && CR.game.seed === seed
        && Array.isArray(CR.game.map) && CR.game.map.length > 0 && CR.player && Number.isFinite(CR.player.x),
    };
    debug.authoritativeBefore = { state: before, hash: beforeHash };
    if (!fixture?.target) return debug;
    const target = fixture.target;
    const targetCell = CR.game.buildingGrid?.[target.y]?.[target.x] || null;
    const targetRegistry = targetCell && CR.game.buildingRegistry?.[targetCell.bid];
    const targetDescriptor = CR.crDebugDescribeFacadeHit(target.x, target.y, target.face);
    const targetCenter = {
      x: targetRegistry ? targetRegistry.x0 + targetRegistry.w / 2 : target.x + 0.5,
      y: targetRegistry ? targetRegistry.y0 + targetRegistry.h / 2 : target.y + 0.5,
    };
    const targetDistance = Math.hypot(targetCenter.x - CR.player.x, targetCenter.y - CR.player.y);
    const naturalGroundedCompanions = (debug.samples || []).filter((sample) =>
      (sample.kind.startsWith('npc:') || sample.kind === 'can' || sample.kind.startsWith('prop:'))
      && sample.screenX >= 0 && sample.screenX <= 320 && sample.depth > 0 && sample.depth < targetDistance
      && sample.groundedDelta === 0 && sample.isGroundAnchored === true);
    const expectedAngle = Math.atan2(targetCenter.y - CR.player.y, targetCenter.x - CR.player.x);
    const facingDelta = Math.atan2(Math.sin(CR.player.angle - expectedAngle), Math.cos(CR.player.angle - expectedAngle));
    const facadeCells = [];
    if (targetRegistry) {
      if (target.face === 'north' || target.face === 'south') {
        const y = target.face === 'north' ? targetRegistry.y0 : targetRegistry.y0 + targetRegistry.h - 1;
        for (let x = targetRegistry.x0; x < targetRegistry.x0 + targetRegistry.w; x++) facadeCells.push({ x, y });
      } else {
        const x = target.face === 'west' ? targetRegistry.x0 : targetRegistry.x0 + targetRegistry.w - 1;
        for (let y = targetRegistry.y0; y < targetRegistry.y0 + targetRegistry.h; y++) facadeCells.push({ x, y });
      }
    }
    const outside = (cell) => target.face === 'north' ? { x: cell.x, y: cell.y - 1 }
      : target.face === 'south' ? { x: cell.x, y: cell.y + 1 }
      : target.face === 'west' ? { x: cell.x - 1, y: cell.y }
      : { x: cell.x + 1, y: cell.y };
    const cameraSideOpen = facadeCells.length > 0 && facadeCells.every((cell) => {
      const adjacent = outside(cell);
      return CR.game.buildingGrid?.[cell.y]?.[cell.x]?.bid === targetRegistry.bid
        && CR.game.map?.[adjacent.y]?.[adjacent.x] === 0;
    });
    const authoritativeGarage = !!(targetRegistry
      && targetRegistry.assetId === target.assetId
      && targetRegistry.renderMode === 'importedWholeFaceAsset'
      && targetRegistry.faces?.[target.face]
      && targetDescriptor?.buildingId === targetRegistry.bid
      && targetDescriptor?.faceDirection === target.face
      && targetDescriptor?.baseTextureKey);
    const semanticPass = authoritativeGarage && cameraSideOpen
      && Math.abs(facingDelta) < 1e-9 && naturalGroundedCompanions.length > 0;
    debug.fixture = {
      selectedDistrict,
      district: CR.game.district,
      seed: CR.game.seed,
      player: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
      target: {
        fixtureIdentity: target.assetId,
        runtimeIdentity: targetRegistry?.assetId || null,
        x: target.x, y: target.y, face: target.face,
        mapValue: CR.game.map?.[target.y]?.[target.x] ?? null,
        cameraSideOpen,
        facadeCells,
        registry: targetRegistry ? {
          bid: targetRegistry.bid, assetId: targetRegistry.assetId, kind: targetRegistry.kind,
          x0: targetRegistry.x0, y0: targetRegistry.y0, w: targetRegistry.w, h: targetRegistry.h,
          renderMode: targetRegistry.renderMode, faceAsset: targetRegistry.faces?.[target.face] || null,
        } : null,
        descriptor: targetDescriptor || null,
      },
      cameraFacing: { expectedAngle, facingDelta, pass: Math.abs(facingDelta) < 1e-9 },
      naturalGroundedCompanion: { pass: naturalGroundedCompanions.length > 0, samples: naturalGroundedCompanions },
      semanticValidation: {
        result: semanticPass ? 'pass' : 'fail',
        predicate: {
          authoritativeGarage, cameraSideOpen,
          cameraFacing: Math.abs(facingDelta) < 1e-9,
          naturalGroundedHumanOrObject: naturalGroundedCompanions.length > 0,
        },
        basis: 'authoritative small_service_001 registry identity and north-face descriptor, fully open visible facade side, exact camera-facing pose, and a naturally generated grounded human/object sample in front of the facade',
        independentVisualCheckRequired: true,
      },
    };
    return debug;
  }, { district, seed, angle, fixture });
  const snapshotScene = () => page.evaluate(async () => {
    const CR = window.CR;
    const registry = CR.game.buildingRegistry || {};
    const buildings = Object.keys(registry).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).map((key) => {
      const building = registry[key] || {};
      return {
        key, bid: building.bid ?? null, assetId: building.assetId ?? null, kind: building.kind ?? null,
        mid: building.mid ?? null, x0: building.x0 ?? null, y0: building.y0 ?? null,
        w: building.w ?? null, h: building.h ?? null, renderMode: building.renderMode ?? null,
        faces: building.faces ? Object.keys(building.faces).sort().map((face) => [face, building.faces[face]]) : [],
      };
    });
    const registeredCells = [];
    for (let y = 0; y < (CR.game.buildingGrid || []).length; y++) {
      for (let x = 0; x < (CR.game.buildingGrid[y] || []).length; x++) {
        const cell = CR.game.buildingGrid[y][x];
        if (cell) registeredCells.push({ x, y, bid: cell.bid ?? null, mid: cell.mid ?? null });
      }
    }
    const state = {
      npcs: (CR.game.npcs || []).map((npc, index) => ({ index, id: npc.id ?? null, kind: npc.kind ?? null, x: npc.x, y: npc.y, helped: !!npc.helped, need: npc.need ?? null })),
      pickups: (CR.game.pickups || []).map((pickup, index) => ({ index, id: pickup.id ?? null, kind: pickup.kind ?? 'can', x: pickup.x, y: pickup.y, taken: !!pickup.taken, amt: pickup.amt ?? null })),
      props: (CR.game.props || []).map((prop, index) => ({ index, id: prop.id ?? null, type: prop.type ?? prop.kind ?? null, x: prop.x, y: prop.y, state: prop.state ?? null })),
      buildings,
      registeredCells,
    };
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(state)));
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return { state, hash };
  });
  const captureView = async (file, region = 'fpv', projection = null, fixtureGuard = null) => {
    const capture = await page.evaluate(({ captureRegion, projectionSample, guard }) => {
      if (guard) {
        const actual = {
          selectedDistrict: CR.crGetSelectedStartDistrict(), district: CR.game.district, seed: CR.game.seed,
          player: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
        };
        const poseExact = actual.selectedDistrict === guard.district && actual.district === guard.district
          && actual.seed === guard.seed && actual.player.x === guard.player.x
          && actual.player.y === guard.player.y && actual.player.angle === guard.player.angle;
        let objectExact = true;
        if (guard.can) {
          const can = (CR.game.pickups || [])[guard.can.index];
          objectExact = !!can && can.x === guard.can.x && can.y === guard.can.y && !!can.taken === guard.can.taken
            && Math.hypot(can.x - actual.player.x, can.y - actual.player.y) === guard.distance;
        }
        if (!poseExact || !objectExact) throw new Error(`Capture-time fixture guard failed for ${captureRegion}`);
      }
      const source = document.getElementById('view');
      if (!source || source.width <= 0 || source.height <= 0) throw new Error('#view has no capturable bitmap');
      if (captureRegion === 'full') return {
        dataUrl: source.toDataURL('image/png'),
        cropBounds: { x: 0, y: 0, w: source.width, h: source.height },
        canvasBounds: { x: 0, y: 0, w: source.width, h: source.height },
      };
      const layout = CR.portraitLayout();
      let requested = captureRegion === 'minimap' ? layout.minimapRect : layout.fpvRect;
      if (captureRegion === 'projection') {
        if (!projectionSample) throw new Error('Projection crop requires a debug sample');
        const fpv = layout.fpvRect;
        const scaleX = fpv.w / 320;
        const scaleY = fpv.h / 200;
        const centerX = fpv.x + projectionSample.screenX * scaleX;
        const topY = fpv.y + projectionSample.topY * scaleY;
        const feetY = fpv.y + projectionSample.feetY * scaleY;
        const subjectW = Math.max(20, projectionSample.screenW * scaleX);
        const subjectH = Math.max(20, feetY - topY);
        requested = {
          x: centerX - Math.max(48, subjectW * 2.2),
          y: topY - Math.max(28, subjectH * 0.8),
          w: Math.max(96, subjectW * 4.4),
          h: Math.max(96, subjectH * 3.0),
        };
        requested.x = Math.max(fpv.x, Math.min(requested.x, fpv.x + fpv.w - requested.w));
        requested.y = Math.max(fpv.y, Math.min(requested.y, fpv.y + fpv.h - requested.h));
      }
      const x = Math.max(0, Math.floor(requested.x));
      const y = Math.max(0, Math.floor(requested.y));
      const w = Math.min(source.width - x, Math.max(1, Math.ceil(requested.w)));
      const h = Math.min(source.height - y, Math.max(1, Math.ceil(requested.h)));
      if (w <= 0 || h <= 0) throw new Error(`Invalid ${captureRegion} canvas crop ${x},${y},${w},${h}`);
      const crop = document.createElement('canvas');
      crop.width = w;
      crop.height = h;
      crop.getContext('2d').drawImage(source, x, y, w, h, 0, 0, w, h);
      return {
        dataUrl: crop.toDataURL('image/png'),
        cropBounds: { x, y, w, h },
        fixtureComputedBounds: { x, y, w, h },
        requestedBounds: { x: requested.x, y: requested.y, w: requested.w, h: requested.h },
        canvasBounds: { x: 0, y: 0, w: source.width, h: source.height },
        fullyInsideView: x >= 0 && y >= 0 && x + w <= source.width && y + h <= source.height,
      };
    }, { captureRegion: region, projectionSample: projection, guard: fixtureGuard });
    const output = runOutputPath(file);
    fs.writeFileSync(output, Buffer.from(capture.dataUrl.slice(capture.dataUrl.indexOf(',') + 1), 'base64'));
    activeSectionRecorder?.recordProof(output);
    return {
      file, region, cropBounds: capture.cropBounds,
      fixtureComputedBounds: capture.fixtureComputedBounds || capture.cropBounds,
      requestedBounds: capture.requestedBounds || capture.cropBounds,
      canvasBounds: capture.canvasBounds,
      boundsExact: JSON.stringify(capture.cropBounds) === JSON.stringify(capture.fixtureComputedBounds || capture.cropBounds),
      fullyInsideView: capture.fullyInsideView !== false,
    };
  };
  result.d1Debug = await setupScene(1, 903101, 0);
  result.d1Capture = await captureView('proof-spriteground-d1-grounded.png');
  const d1After = await snapshotScene();
  result.d1Nonmutation = {
    beforeHash: result.d1Debug.authoritativeBefore.hash,
    afterHash: d1After.hash,
    exactEqual: JSON.stringify(result.d1Debug.authoritativeBefore.state) === JSON.stringify(d1After.state),
  };
  result.d1Nonmutation.pass = result.d1Nonmutation.exactEqual
    && result.d1Nonmutation.beforeHash === result.d1Nonmutation.afterHash;
  const d1Grounded = (result.d1Debug.samples || []).some((sample) =>
    (sample.kind.startsWith('npc:') || sample.kind === 'can') && sample.screenX >= 0 && sample.screenX <= 320
      && sample.isGroundAnchored === true && sample.groundedDelta === 0);
  result.d1Semantic = { pass: d1Grounded, naturalGroundedHumanOrCan: d1Grounded };
  result.d2Debug = await setupScene(2, 903202, -Math.PI / 2);
  const d2NpcActual = await page.evaluate(() => ({
    selectedDistrict: CR.crGetSelectedStartDistrict(),
    district: CR.game.district,
    seed: CR.game.seed,
    player: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
    groundedNpcVisible: (CR.crDebugSpriteProjection().samples || []).some((sample) =>
      sample.kind.startsWith('npc:') && sample.screenX >= 0 && sample.screenX <= 320
        && sample.isGroundAnchored === true && sample.groundedDelta === 0),
  }));
  const d2NpcExactPose = d2NpcActual.selectedDistrict === 2 && d2NpcActual.district === 2
    && d2NpcActual.seed === 903202 && d2NpcActual.player.x === 20 && d2NpcActual.player.y === 10
    && d2NpcActual.player.angle === -Math.PI / 2;
  if (!d2NpcExactPose) throw new Error('D2 NPC/storefront runtime pose differs from authorized fixture');
  result.d2NpcFixture = {
    ...d2NpcActual,
    exactPose: d2NpcExactPose,
    semanticPass: d2NpcExactPose && d2NpcActual.groundedNpcVisible,
    capture: await captureView('proof-spriteground-d2-npc-storefront.png', 'fpv', null, {
      district: 2, seed: 903202, player: { x: 20, y: 10, angle: -Math.PI / 2 },
    }),
  };
  result.d2CanFixture = await page.evaluate(async () => {
    const CR = window.CR;
    const objectState = () => ({
      npcs: (CR.game.npcs || []).map((npc, index) => ({ index, x: npc.x, y: npc.y, helped: !!npc.helped })),
      pickups: (CR.game.pickups || []).map((can, index) => ({ index, x: can.x, y: can.y, taken: !!can.taken })),
      props: (CR.game.props || []).map((prop, index) => ({ index, x: prop.x, y: prop.y, type: prop.type || null })),
    });
    const hashState = async (value) => {
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    };
    const actualBefore = {
      selectedDistrict: CR.crGetSelectedStartDistrict(), district: CR.game.district, seed: CR.game.seed,
      player: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
    };
    const before = objectState();
    const beforeHash = await hashState(before);
    const can = (CR.game.pickups || [])[1] || null;
    const naturalCanExact = !!can && can.x === 33.5 && can.y === 11.5 && !can.taken;
    if (!naturalCanExact) throw new Error('D2 authorized natural can index 1 at (33.5,11.5), untaken, is absent');
    const player = { x: 30.5, y: 11.5, angle: 0 };
    const playerCell = CR.game.map?.[Math.floor(player.y)]?.[Math.floor(player.x)] ?? null;
    const distance = Math.hypot(can.x - player.x, can.y - player.y);
    const losSteps = Math.ceil(distance * 20);
    let unobstructedLos = playerCell === 0;
    for (let index = 1; unobstructedLos && index < losSteps; index++) {
      const t = index / losSteps;
      const x = player.x + (can.x - player.x) * t;
      const y = player.y + (can.y - player.y) * t;
      if (CR.game.map?.[Math.floor(y)]?.[Math.floor(x)] !== 0) unobstructedLos = false;
    }
    CR.player.x = player.x;
    CR.player.y = player.y;
    CR.player.angle = player.angle;
    if (typeof CR.drawScene === 'function') CR.drawScene(performance.now());
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const actual = {
      selectedDistrict: CR.crGetSelectedStartDistrict(), district: CR.game.district, seed: CR.game.seed,
      player: { x: CR.player.x, y: CR.player.y, angle: CR.player.angle },
    };
    const debug = CR.crDebugSpriteProjection();
    const projection = (debug.samples || [])
      .filter((sample) => sample.kind === 'can' && sample.screenX >= 0 && sample.screenX <= 320
        && Math.abs(sample.depth - distance) < 1e-9)
      .sort((a, b) => Math.abs(a.screenX - 160) - Math.abs(b.screenX - 160))[0] || null;
    const after = objectState();
    const afterHash = await hashState(after);
    const coordinatesEqual = JSON.stringify(before) === JSON.stringify(after);
    const noInteractionOverlay = !CR.game.aimNpc && !CR.game.msg;
    const exactPoseAndObject = actualBefore.selectedDistrict === 2 && actualBefore.district === 2
      && actualBefore.seed === 903202 && actual.selectedDistrict === 2 && actual.district === 2
      && actual.seed === 903202 && actual.player.x === 30.5 && actual.player.y === 11.5
      && actual.player.angle === 0 && (CR.game.pickups || []).indexOf(can) === 1
      && can.x === 33.5 && can.y === 11.5 && !can.taken && distance === 3;
    const semanticPass = exactPoseAndObject && !!projection && playerCell === 0 && unobstructedLos && coordinatesEqual
      && beforeHash === afterHash && projection.isGroundAnchored === true && projection.groundedDelta === 0
      && projection.screenX >= 20 && projection.screenX <= 300 && noInteractionOverlay;
    return {
      selectedDistrict: actual.selectedDistrict,
      district: actual.district,
      seed: actual.seed,
      naturalCan: { index: (CR.game.pickups || []).indexOf(can), x: can.x, y: can.y, taken: !!can.taken },
      player: actual.player,
      playerCell,
      distance,
      unobstructedLos,
      projection,
      objectCoordinates: { beforeHash, afterHash, equal: coordinatesEqual },
      noInteractionOverlay,
      semanticValidation: {
        result: semanticPass ? 'pass' : 'fail',
        predicate: {
          exactDistrictSeedPlayerPose: exactPoseAndObject,
          naturalCanIndexIdentityCoordinatesUntaken: naturalCanExact && (CR.game.pickups || []).indexOf(can) === 1,
          cameraDistanceExactlyThree: distance === 3,
          naturalCanPresent: naturalCanExact,
          playerCellOpen: playerCell === 0,
          unobstructedLos,
          projectionInFrame: !!projection && projection.screenX >= 20 && projection.screenX <= 300,
          grounded: !!projection && projection.isGroundAnchored === true && projection.groundedDelta === 0,
          objectCoordinatesEqual: coordinatesEqual && beforeHash === afterHash,
          noInteractionOverlay,
        },
        basis: 'existing district-2 seed-903202 can at (33.5,11.5), fixture-only player/camera pose, open player cell, unobstructed sampled line of sight, grounded centered projection, unchanged NPC/pickup/prop coordinates and flags, and no interaction prompt',
        independentVisualCheckRequired: true,
      },
    };
  });
  if (result.d2CanFixture.semanticValidation.result !== 'pass') {
    throw new Error('D2 natural-can camera-pose semantic predicate failed');
  }
  result.d2CanFixture.capture = await captureView(
    'proof-spriteground-d2-can-grounded.png', 'projection', result.d2CanFixture.projection,
    {
      district: 2, seed: 903202, player: { x: 30.5, y: 11.5, angle: 0 },
      can: { index: 1, x: 33.5, y: 11.5, taken: false }, distance: 3,
    },
  );
  const d2After = await snapshotScene();
  result.d2Nonmutation = {
    beforeHash: result.d2Debug.authoritativeBefore.hash,
    afterHash: d2After.hash,
    exactEqual: JSON.stringify(result.d2Debug.authoritativeBefore.state) === JSON.stringify(d2After.state),
  };
  result.d2Nonmutation.pass = result.d2Nonmutation.exactEqual
    && result.d2Nonmutation.beforeHash === result.d2Nonmutation.afterHash;
  result.d3Debug = await setupScene(3, 903013, Math.PI / 2, {
    player: { x: 13, y: 9.5, angle: Math.PI / 2 },
    target: { assetId: 'small_service_001', x: 12, y: 13, face: 'north' },
  });
  const d3Capture = await captureView('proof-spriteground-d3-garage-human-scale.png', 'fpv', null, {
    district: 3, seed: 903013, player: { x: 13, y: 9.5, angle: Math.PI / 2 },
  });
  result.d3Fixture = { ...result.d3Debug.fixture, capture: d3Capture };
  const minimapCapture = await captureView('proof-spriteground-minimap-preserved.png', 'minimap', null, {
    district: 3, seed: 903013, player: { x: 13, y: 9.5, angle: Math.PI / 2 },
  });
  const d3ExactState = result.d3Debug.supportedSetup.selectedDistrict === 3
    && result.d3Debug.supportedSetup.district === 3 && result.d3Debug.supportedSetup.seed === 903013
    && result.d3Debug.supportedSetup.startRunCompleted === true
    && result.d3Debug.naturalScene.player.x === 13 && result.d3Debug.naturalScene.player.y === 9.5
    && result.d3Debug.naturalScene.player.angle === Math.PI / 2;
  const d3TargetPass = result.d3Fixture?.semanticValidation?.result === 'pass'
    && result.d3Fixture?.target?.runtimeIdentity === 'small_service_001'
    && result.d3Fixture?.target?.x === 12 && result.d3Fixture?.target?.y === 13
    && result.d3Fixture?.target?.face === 'north';
  const noD2FixtureLeakage = d3ExactState
    && !(result.d3Debug.naturalScene.player.x === 30.5 && result.d3Debug.naturalScene.player.y === 11.5
      && result.d3Debug.naturalScene.player.angle === 0);
  result.postD2CanState = {
    explicitlyReestablished: d3ExactState && d3TargetPass && noD2FixtureLeakage,
    supportedSetup: result.d3Debug.supportedSetup,
    noD2FixtureLeakage,
    district: result.d3Debug.naturalScene.district,
    seed: result.d3Debug.naturalScene.seed,
    player: result.d3Debug.naturalScene.player,
    minimapCapture,
  };
  writeProof('proof-sprite-ground-anchor.json', result);
  writeProof('proof-spriteground-debug.json', result.d2Debug || {});
  const d2CanSemanticPass = result.d2CanFixture?.semanticValidation?.result === 'pass';
  const d3SemanticPass = result.d3Fixture?.semanticValidation?.result === 'pass';
  const sceneNonmutationPass = result.d1Nonmutation.pass === true && result.d2Nonmutation.pass === true;
  const d2NpcSemanticPass = result.d2NpcFixture.exactPose === true && result.d2NpcFixture.semanticPass === true;
  const d3ReestablishmentPass = result.postD2CanState.explicitlyReestablished === true;
  const runtimeAcceptance = {
    spriteGroundAnchor: !!result.pass,
    d1Semantic: result.d1Semantic.pass === true,
    d2NpcExactPoseAndSemantic: d2NpcSemanticPass,
    d2CanExactPoseObjectDistanceAndSemantic: d2CanSemanticPass,
    d1D2Nonmutation: sceneNonmutationPass,
    d3IndependentReestablishment: d3ReestablishmentPass,
    authoritativeD3GarageTarget: d3SemanticPass,
  };
  runtimeAcceptance.pass = Object.values(runtimeAcceptance).every((value) => value === true);
  if (!d2CanSemanticPass) result.errors.push('D2 natural-can camera-pose semantic predicate failed');
  if (!d3SemanticPass) result.errors.push('D3 authoritative garage/service semantic predicate failed');
  if (!d2NpcSemanticPass) result.errors.push('D2 NPC/storefront exact runtime pose or semantic predicate failed');
  if (!sceneNonmutationPass) result.errors.push('D1/D2 authoritative generated object state mutated during captures');
  if (!d3ReestablishmentPass) result.errors.push('D3 supported setup was not independently re-established');
  return {
    pass: runtimeAcceptance.pass,
    errors: result.errors,
    focusedD2NpcFixture: result.d2NpcFixture,
    focusedD2CanFixture: result.d2CanFixture,
    focusedD3Fixture: result.d3Fixture,
    focusedPostD2CanState: result.postD2CanState,
    focusedD1Semantic: result.d1Semantic,
    focusedSceneNonmutation: { pass: sceneNonmutationPass, d1: result.d1Nonmutation, d2: result.d2Nonmutation },
    focusedRuntimeAcceptance: runtimeAcceptance,
  };
}

async function facadeArtVocabularySection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;

  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const av = await page.evaluate(() => CR.runFacadeArtVocabularySelfCheck());
  writeProof('proof-facade-art-vocabulary.json', av);

  const roleDebug = await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(904201);
    CR.state = CR.STATE.PLAY;
    let storefront = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !storefront; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !storefront; x++) {
        if (!CR.game.buildingGrid[y][x]) continue;
        const mid = CR.game.buildingGrid[y][x].mid;
        if (mid !== 'storefront_4x2' && mid !== 'storefront_3x2') continue;
        storefront = CR.crDebugDescribeFacadeHit(x, y, 'south');
      }
    }
    let boarded = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !boarded; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !boarded; x++) {
        if (!CR.game.buildingGrid[y][x] || CR.game.buildingGrid[y][x].mid !== 'boarded_shop_3x2') continue;
        boarded = CR.crDebugDescribeFacadeHit(x, y, 'south');
      }
    }
    CR.crSetSelectedStartDistrict(3);
    CR.startRun(904203);
    CR.state = CR.STATE.PLAY;
    let garage = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !garage; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !garage; x++) {
        if (!CR.game.buildingGrid[y][x] || CR.game.buildingGrid[y][x].mid !== 'garage_service_4x2') continue;
        garage = CR.crDebugDescribeFacadeHit(x, y, 'south');
      }
    }
    let side = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !side; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !side; x++) {
        if (!CR.game.buildingGrid[y][x]) continue;
        side = CR.crDebugDescribeFacadeHit(x, y, 'east');
        if (side.role) break;
      }
    }
    return {
      BUILD_ID: CR.BUILD_ID,
      packVersion: CR_FACADE_PACK && CR_FACADE_PACK.version,
      moduleList: Object.keys(CR_FACADE_PACK.modules || {}),
      roleList: Object.keys(CR_FACADE_PACK.roles || {}),
      storefront,
      boarded,
      garage,
      side,
    };
  });
  writeProof('proof-facadeart-role-debug.json', roleDebug);

  const shots = [
    { d: 1, seed: 904101, file: 'proof-facadeart-d1-identity.png', angle: 0 },
    { d: 2, seed: 904201, file: 'proof-facadeart-d2-storefront-human-scale.png', angle: Math.PI / 2 },
    { d: 2, seed: 904202, file: 'proof-facadeart-d2-boarded-shop-human-scale.png', angle: Math.PI * 0.45 },
    { d: 3, seed: 904203, file: 'proof-facadeart-d3-garage-service-human-scale.png', angle: Math.PI / 2 },
    { d: 3, seed: 904204, file: 'proof-facadeart-d3-side-back-quiet.png', angle: Math.PI * 0.82 },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, angle }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.player !== 'undefined') CR.player.angle = angle;
    }, s);
    await page.waitForTimeout(220);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(904201);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-facadeart-minimap-preserved.png') });

  return { pass: av.pass === true, facadeArtVocabulary: av };
}

async function facadeCompositionReadabilitySection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const fc = await page.evaluate(() => CR.runFacadeCompositionReadabilitySelfCheck());
  writeProof('proof-facade-composition-readability.json', fc);

  const roleDebug = await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(903201);
    CR.state = CR.STATE.PLAY;
    let storefront = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !storefront; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !storefront; x++) {
        if (!CR.game.buildingGrid[y][x]) continue;
        const mid = CR.game.buildingGrid[y][x].mid;
        if (mid !== 'storefront_4x2' && mid !== 'storefront_3x2') continue;
        storefront = CR.crDebugDescribeFacadeHit(x, y, 'south');
      }
    }
    let boarded = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !boarded; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !boarded; x++) {
        if (!CR.game.buildingGrid[y][x] || CR.game.buildingGrid[y][x].mid !== 'boarded_shop_3x2') continue;
        boarded = CR.crDebugDescribeFacadeHit(x, y, 'south');
      }
    }
    CR.crSetSelectedStartDistrict(3);
    CR.startRun(903203);
    CR.state = CR.STATE.PLAY;
    let garage = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !garage; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !garage; x++) {
        if (!CR.game.buildingGrid[y][x] || CR.game.buildingGrid[y][x].mid !== 'garage_service_4x2') continue;
        garage = CR.crDebugDescribeFacadeHit(x, y, 'south');
      }
    }
    let side = null;
    for (let y = 1; y < CR.game.MAP_H - 1 && !side; y++) {
      for (let x = 1; x < CR.game.MAP_W - 1 && !side; x++) {
        if (!CR.game.buildingGrid[y][x]) continue;
        side = CR.crDebugDescribeFacadeHit(x, y, 'east');
        if (side.role) break;
      }
    }
    return {
      BUILD_ID: CR.BUILD_ID,
      packVersion: CR_FACADE_PACK && CR_FACADE_PACK.version,
      moduleList: Object.keys(CR_FACADE_PACK.modules || {}),
      storefront,
      boarded,
      garage,
      side,
    };
  });
  writeProof('proof-facadecompose-role-debug.json', roleDebug);

  const shots = [
    { d: 1, seed: 903101, file: 'proof-facadecompose-d1-identity.png', angle: 0 },
    { d: 2, seed: 903201, file: 'proof-facadecompose-d2-storefront.png', angle: Math.PI / 2 },
    { d: 2, seed: 903202, file: 'proof-facadecompose-d2-boarded-shop.png', angle: Math.PI * 0.45 },
    { d: 3, seed: 903203, file: 'proof-facadecompose-d3-garage-service.png', angle: Math.PI / 2 },
    { d: 3, seed: 903204, file: 'proof-facadecompose-d3-side-back.png', angle: Math.PI * 0.82 },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, angle }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.player !== 'undefined') CR.player.angle = angle;
    }, s);
    await page.waitForTimeout(220);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(903201);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-facadecompose-minimap-preserved.png') });

  return { pass: fc.pass === true, facadeCompositionReadability: fc };
}

async function fpvWallLineArtifactFixSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const wf = await page.evaluate(() => CR.runFpvWallLineArtifactFixSelfCheck());
  writeProof('proof-fpv-wall-line-artifact-fix.json', wf);

  const shots = [
    { d: 1, seed: 890401, file: 'proof-fpv-wallfix-d1.png', angle: 0 },
    { d: 2, seed: 890402, file: 'proof-fpv-wallfix-d2-storefront.png', angle: Math.PI / 2 },
    { d: 3, seed: 890403, file: 'proof-fpv-wallfix-d3-alley.png', angle: Math.PI * 0.75 },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed, angle }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
      if (typeof CR.player !== 'undefined') CR.player.angle = angle;
    }, s);
    await page.waitForTimeout(180);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(890402);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-wallfix-minimap-preserved.png') });

  return { pass: wf.pass === true, fpvWallLineArtifactFix: wf };
}

async function streetReadabilityMinimapSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const sr = await page.evaluate(() => CR.runStreetReadabilityMinimapSelfCheck());
  writeProof('proof-street-readability-minimap.json', sr);

  const shots = [
    { d: 1, seed: 890201, file: 'proof-street-readability-d1.png' },
    { d: 2, seed: 890202, file: 'proof-street-readability-d2.png' },
    { d: 3, seed: 890203, file: 'proof-street-readability-d3.png' },
    { d: 4, seed: 890204, file: 'proof-street-readability-d4.png' },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
    }, s);
    await page.waitForTimeout(140);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(2);
    CR.startRun(890202);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-street-readability-minimap.png') });

  return { pass: sr.pass === true, streetReadabilityMinimap: sr };
}

async function buildingScalePolishSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const bs = await page.evaluate(() => CR.runBuildingScalePolishSelfCheck());
  writeProof('proof-building-scale-polish.json', bs);

  const shots = [
    { d: 1, seed: 880101, file: 'proof-building-scale-d1.png' },
    { d: 2, seed: 880102, file: 'proof-building-scale-d2.png' },
    { d: 3, seed: 880103, file: 'proof-building-scale-d3.png' },
    { d: 4, seed: 880104, file: 'proof-building-scale-d4.png' },
  ];
  for (const s of shots) {
    await page.evaluate(({ d, seed }) => {
      CR.crSetSelectedStartDistrict(d);
      CR.startRun(seed);
      CR.state = CR.STATE.PLAY;
      CR.paused = false;
    }, s);
    await page.waitForTimeout(140);
    await page.screenshot({ path: runOutputPath(s.file) });
  }
  await page.evaluate(() => {
    CR.crSetSelectedStartDistrict(1);
    CR.state = CR.STATE.TITLE;
    if (typeof drawMobileMenu === 'function') drawMobileMenu();
  });
  await page.screenshot({ path: runOutputPath('proof-building-scale-minimap.png') });

  return { pass: bs.pass === true, buildingScalePolish: bs };
}

async function streetBlockLevelSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const sb = await page.evaluate(() => CR.runStreetBlockLevelSelfCheck());
  writeProof('proof-street-block-level.json', sb);

  await page.evaluate(() => {
    CR.startRun(880101);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: runOutputPath('proof-street-block-d1.png') });

  await page.evaluate(() => {
    CR.startRun(880103);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: runOutputPath('proof-street-block-d3.png') });

  await page.evaluate(() => {
    CR.startRun(880102);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-street-block-d2.png') });

  await page.evaluate(() => {
    CR.startRun(880104);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: runOutputPath('proof-street-block-minimap.png') });

  const isoOk = await page.evaluate(() => CR.crFingerprintPublicSafe(CR.crPublicStateFingerprint()));
  const pass = sb.pass === true && isoOk !== false;
  const proof = {
    pass,
    build: sb.build,
    streetBlockLevel: sb,
    harnessStateOk: isoOk,
    screenshots: [
      'proof-street-block-d1.png',
      'proof-street-block-d2.png',
      'proof-street-block-d3.png',
      'proof-street-block-minimap.png',
    ],
    timestamp: new Date().toISOString(),
  };
  return { pass, proof, streetBlockLevel: sb };
}

async function optionsCleanupSection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  await page.evaluate(() => {
    CR.setMobileMode(true);
    CR.state = CR.STATE.TITLE;
    CR.drawMobileMenu();
    CR.rmenuAction('title-options');
    CR.drawMobileMenu();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: runOutputPath('proof-options-cleanup-menu.png') });
  const oc = await page.evaluate(() => CR.runOptionsCleanupSelfCheck());
  await page.evaluate(() => {
    CR.state = CR.STATE.TITLE;
    CR.drawMobileMenu();
    CR.rmenuAction('title-options');
    CR.drawMobileMenu();
    CR.rmenuAction('option-edit-controls');
    CR.drawMobileMenu();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: runOutputPath('proof-options-cleanup-edit-controls.png') });
  const proof = {
    pass: oc.pass === true,
    build: oc.build,
    optionsCleanup: oc,
    screenshots: ['proof-options-cleanup-menu.png', 'proof-options-cleanup-edit-controls.png'],
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-options-cleanup.json', proof);
  return { pass: proof.pass, proof, optionsCleanup: oc };
}

async function portraitUsabilitySection(page) {
  const baseUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  const presetList = [
    { key: 'low', y: 120, shot: 'proof-usability-low.png' },
    { key: 'mid', y: 0, shot: 'proof-usability-mid.png' },
    { key: 'high', y: -120, shot: 'proof-usability-high.png' },
    { key: 'veryHigh', y: -240, shot: 'proof-usability-very-high.png' },
  ];
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  await page.evaluate(() => {
    CR.setMobileMode(true);
    CR.startRun(88);
    CR.state = CR.STATE.PLAY;
    CR.paused = false;
  });

  for (const p of presetList) {
    await page.evaluate((y) => {
      CR.options.controlsYOffsetPx = y;
      CR.applyMobileControlSettings();
      if (typeof drawMobileMenu === 'function') drawMobileMenu();
    }, p.y);
    await page.waitForTimeout(200);
    await page.screenshot({ path: runOutputPath(p.shot) });
  }

  const usability = await page.evaluate(() => CR.runPortraitUsabilitySelfCheck());
  const settingsSafety = await page.evaluate(() => CR.runSettingsSafetySelfCheck());

  await page.goto(`${BASE}/index.html?mobile=on&portraitlayout=1&resetcontrols=1`, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  await page.evaluate(() => {
    CR.setMobileMode(true);
    CR.startRun(88);
    CR.state = CR.STATE.PLAY;
    CR.applyMobileControlSettings();
    if (typeof drawMobileMenu === 'function') drawMobileMenu();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: runOutputPath('proof-resetcontrols-safe.png') });
  const resetProof = await page.evaluate(() => ({
    controlsYOffsetPx: CR.options.controlsYOffsetPx,
    overlapPass: CR.runPortraitUsabilitySelfCheck().pass,
    settingsPass: CR.runSettingsSafetySelfCheck().pass,
  }));

  await page.goto(`${BASE}/index.html?selfcheck=1&mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  const afterHarness = await page.evaluate(() => ({
    controlsYOffsetPx: CR.options.controlsYOffsetPx,
    overlapPass: CR.crMinimapOverlapPass ? CR.crMinimapOverlapPass(CR.portraitLayout(CR.options.controlsYOffsetPx)) : true,
  }));

  const pass =
    usability.pass === true &&
    settingsSafety.pass === true &&
    resetProof.controlsYOffsetPx === 0 &&
    resetProof.overlapPass === true &&
    resetProof.settingsPass === true &&
    afterHarness.overlapPass === true;

  const proof = {
    pass,
    build: usability.build,
    usability,
    settingsSafety: { pass: settingsSafety.pass === true, ...settingsSafety },
    resetProof,
    afterHarness,
    screenshots: presetList.map((p) => p.shot).concat(['proof-resetcontrols-safe.png']),
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-portrait-usability.json', proof);
  return { pass, proof, usability, settingsSafety: { pass: settingsSafety.pass === true, checks: settingsSafety.checks } };
}

function fpIsPublicSafe(fp) {
  if (!fp) return false;
  if (fp.benchmark) return false;
  if (fp.harnessOnly) return false;
  if (fp.customLevel === 'harness_render_benchmark') return false;
  if (fp.lsHarness) return false;
  if (fp.state === 'play' && fp.mapW > 0 && fp.mapW <= 20 && fp.mapH <= 20 && fp.timeLeft >= 990 && fp.seed === 12345) return false;
  return true;
}

async function harnessIsolationSection(page) {
  const normalUrl = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(normalUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const bootFp = await page.evaluate(() => CR.crPublicStateFingerprint());
  const bootOk = fpIsPublicSafe(bootFp) && bootFp.state === 'title';

  const iso = await page.evaluate(() => {
    window.__crRuntimeErrors = window.__crRuntimeErrors || [];
    return CR.runHarnessIsolationSelfCheck();
  });
  writeProof('proof-harness-isolation.json', iso);

  await page.goto(`${BASE}/index.html?selfcheck=1&mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
  await page.screenshot({ path: runOutputPath('proof-selfcheck-restored-state.png') });
  const afterSelfcheck = await page.evaluate(() => CR.crPublicStateFingerprint());

  await page.goto(normalUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: runOutputPath('proof-normal-boot-after-selfcheck.png') });
  const afterReload = await page.evaluate(() => CR.crPublicStateFingerprint());

  const pass =
    bootOk &&
    iso.pass === true &&
    fpIsPublicSafe(afterSelfcheck) &&
    afterSelfcheck.state === 'title' &&
    fpIsPublicSafe(afterReload) &&
    afterReload.state === 'title';

  return { pass, bootOk, bootFp, iso, afterSelfcheck, afterReload };
}

async function hallE2ESection(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  const url = `${BASE}/index.html?mobile=on&portraitlayout=1&v=hall`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  await page.evaluate(() => {
    CR.setMobileMode(true);
    CR.applyMobileControlSettings();
    CR.startCustomLevel('hall_of_servants');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: runOutputPath('proof-hall-start.png') });

  const helpedSnap = await page.evaluate(() => {
    const n = game.npcs.find(x => !x.helped);
    player.cans = 10;
    player.giveCD = 0;
    player.x = n.x + 0.35;
    player.y = n.y;
    updateAim();
    giveCan();
    return {
      helped: game.helped,
      thankPopup: game.popups.filter(p => p.color === '#e8d4b0').map(p => p.text),
    };
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: runOutputPath('proof-hall-helped.png') });

  const exitSnap = await page.evaluate(() => {
    let steps = 0;
    while (game.helped < game.quota && steps < 12) {
      const n = game.npcs.find(x => !x.helped);
      if (!n) break;
      player.cans = 10;
      player.giveCD = 0;
      player.x = n.x + 0.3;
      player.y = n.y;
      updateAim();
      giveCan();
      steps++;
    }
    if (game.exit && game.exit.active) {
      player.x = game.exit.x;
      player.y = game.exit.y;
      tickExit();
    }
    return {
      helped: game.helped,
      quota: game.quota,
      exitActive: !!(game.exit && game.exit.active),
      state: CR.state,
      completed: game.run.completed,
    };
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: runOutputPath('proof-hall-exit.png') });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  const crHall = await page.evaluate(() => CR.runHallSelfCheck());

  const proof = {
    pass: crHall.pass === true,
    build: crHall.build,
    crHallSelfCheck: crHall,
    playwright: { helpedSnap, exitSnap },
    screenshots: ['proof-hall-start.png', 'proof-hall-helped.png', 'proof-hall-exit.png'],
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-hall-e2e.json', proof);
  return proof;
}

async function renderFailureSection(page) {
  const url = `${BASE}/index.html?mobile=on&portraitlayout=1`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);

  const shots = [
    ['visible_sprite', 'proof-render-visible-sprite.png'],
    ['occluded_sprite', 'proof-render-occluded-sprite.png'],
    ['can_near_wall', 'proof-render-can-near-wall.png'],
    ['npc_near_wall', 'proof-render-npc-near-wall.png'],
    ['hall_start', 'proof-render-hall-start.png'],
  ];
  const imageHashes = {};
  for (const [scene, file] of shots) {
    await page.evaluate((s) => {
      CR.setMobileMode(true);
      CR.crRenderFailureBenchScene(s);
    }, scene);
    await page.waitForTimeout(400);
    const outPath = path.join(ROOT, file);
    await page.screenshot({ path: outPath });
    const hash = await page.evaluate(() => {
      const v = document.getElementById('view');
      if (!v || !v.width) return null;
      const cx = v.getContext('2d');
      const w = Math.min(96, v.width);
      const h = Math.min(72, v.height);
      const d = cx.getImageData(Math.floor(v.width * 0.2), Math.floor(v.height * 0.15), w, h);
      let sum = 0;
      for (let i = 0; i < d.data.length; i += 4) sum += d.data[i] + d.data[i + 1] + d.data[i + 2];
      return sum;
    });
    imageHashes[file] = hash;
  }

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  const cr = await page.evaluate(() => {
    window.__crRuntimeErrors = window.__crRuntimeErrors || [];
    return CR.runRenderFailureSelfCheck();
  });

  const proof = {
    pass: cr.pass === true,
    build: cr.build,
    crRenderFailureSelfCheck: cr,
    imageHashes,
    screenshots: shots.map((s) => s[1]),
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-render-failure-guard.json', proof);
  writeProof('proof-render-image-hashes.json', { build: cr.build, hashes: imageHashes, timestamp: new Date().toISOString() });
  return proof;
}

function sourceBuildPipelineSection() {
  const errors = [];
  const manifestPath = path.join(ROOT, 'src', 'build-manifest.json');
  const buildToolPath = path.join(ROOT, 'tools', 'build-single-file.js');
  if (!fs.existsSync(manifestPath)) errors.push('missing src/build-manifest.json');
  if (!fs.existsSync(buildToolPath)) errors.push('missing tools/build-single-file.js');
  try {
    execSync('node tools/build-single-file.js --check', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    errors.push('build:check failed: ' + String(e.stderr || e.stdout || e.message).trim());
  }
  let proof = null;
  const proofPath = runOutputPath('proof-source-build-manifest.json');
  if (fs.existsSync(proofPath)) {
    try {
      proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    } catch (err) {
      errors.push('invalid proof-source-build-manifest.json');
    }
  } else {
    errors.push('missing proof-source-build-manifest.json');
  }
  let metadataIdentity = null;
  try {
    metadataIdentity = buildTool.validateProjectMetadata(buildTool.loadProjectMetadata(ROOT), ROOT);
  } catch (err) {
    errors.push(String(err.message || err));
  }
  const pass = errors.length === 0 && proof && proof.check === 'pass';
  const result = {
    pass,
    errors,
    buildId: metadataIdentity ? metadataIdentity.artifactBuildId : null,
    metadata: metadataIdentity ? {
      buildId: metadataIdentity.diagnostics.metadata,
      sourceBuildId: metadataIdentity.diagnostics.source,
      artifactBuildId: metadataIdentity.diagnostics.artifact,
    } : null,
    proofSummary: proof ? { outputSha256: proof.outputSha256, outputBytes: proof.outputBytes, check: proof.check } : null,
  };
  writeProof('proof-source-build-pipeline.json', result);

  return result;
}

function preflightSelfcheckRunDirectoryEnv() {
  const requested = process.env.CR_SELFCHECK_OUTPUT_DIR ?? process.env.CR_SELFCHECK_RUN_DIR;
  if (requested === undefined) return;
  const selfcheckRoot = path.resolve(SELF_CHECK_ROOT);
  const candidate = path.resolve(ROOT, requested);
  if (!isStrictDescendant(selfcheckRoot, candidate)) throw selfcheckContainmentError(requested);
}

const SPRITE_GROUND_REQUIRED_PNGS = Object.freeze([
  'proof-spriteground-d1-grounded.png',
  'proof-spriteground-d2-npc-storefront.png',
  'proof-spriteground-d2-can-grounded.png',
  'proof-spriteground-d3-garage-human-scale.png',
  'proof-spriteground-minimap-preserved.png',
]);

function decodePngPixels(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) throw new Error('invalid PNG signature');
  let offset = 8;
  let ihdr = null;
  const idat = [];
  let sawEnd = false;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > buffer.length) throw new Error(`truncated PNG chunk ${type}`);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') ihdr = Buffer.from(data);
    if (type === 'IDAT') idat.push(Buffer.from(data));
    if (type === 'IEND') { sawEnd = true; break; }
    offset = end;
  }
  if (!ihdr || ihdr.length !== 13 || !idat.length || !sawEnd) throw new Error('PNG is missing IHDR, IDAT, or IEND');
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 })[colorType];
  if (!width || !height || bitDepth !== 8 || !channels || interlace !== 0) {
    throw new Error(`unsupported PNG format ${width}x${height}, depth ${bitDepth}, color ${colorType}, interlace ${interlace}`);
  }
  const stride = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  if (inflated.length !== (stride + 1) * height) throw new Error('decoded PNG scanline length mismatch');
  const raw = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = inflated[y * (stride + 1)];
    if (filter > 4) throw new Error(`unsupported PNG filter ${filter}`);
    for (let x = 0; x < stride; x++) {
      const source = inflated[y * (stride + 1) + 1 + x];
      const left = x >= channels ? raw[y * stride + x - channels] : 0;
      const up = y > 0 ? raw[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? raw[(y - 1) * stride + x - channels] : 0;
      const predictor = filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2)
        : filter === 4 ? paeth(left, up, upperLeft) : 0;
      raw[y * stride + x] = (source + predictor) & 0xff;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const source = pixel * channels;
    const target = pixel * 4;
    if (colorType === 0 || colorType === 4) {
      rgba[target] = raw[source]; rgba[target + 1] = raw[source]; rgba[target + 2] = raw[source];
      rgba[target + 3] = colorType === 4 ? raw[source + 1] : 255;
    } else {
      rgba[target] = raw[source]; rgba[target + 1] = raw[source + 1]; rgba[target + 2] = raw[source + 2];
      rgba[target + 3] = colorType === 6 ? raw[source + 3] : 255;
    }
  }
  return { width, height, bitDepth, colorType, rgba };
}

function validateSpriteGroundPngs(run, sectionResult) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrType = Buffer.from('IHDR');
  const inventoryPaths = new Set(collectRunArtifacts(run).map((artifact) => artifact.path));
  const files = SPRITE_GROUND_REQUIRED_PNGS.map((name) => {
    const absolute = path.resolve(run.dir, name);
    const contained = isStrictDescendant(run.dir, absolute);
    const exists = contained && fs.existsSync(absolute) && fs.statSync(absolute).isFile();
    const buffer = exists ? fs.readFileSync(absolute) : Buffer.alloc(0);
    const bytes = buffer.length;
    const header = bytes >= 24 ? buffer.subarray(0, 24) : Buffer.alloc(0);
    const minimumHeaderValid = bytes >= 24 && header.length >= 24;
    const pngSignatureValid = minimumHeaderValid && header.subarray(0, 8).equals(signature);
    const ihdrLengthValid = minimumHeaderValid && header.readUInt32BE(8) === 13;
    const ihdrTypeValid = minimumHeaderValid && header.subarray(12, 16).equals(ihdrType);
    const ihdrValid = ihdrLengthValid && ihdrTypeValid;
    const width = pngSignatureValid && ihdrValid ? header.readUInt32BE(16) : 0;
    const height = pngSignatureValid && ihdrValid ? header.readUInt32BE(20) : 0;
    const dimensionsValid = width > 0 && height > 0;
    const inventoryListed = inventoryPaths.has(name);
    const runRelativePath = contained ? path.relative(run.dir, absolute).replace(/\\/g, '/') : null;
    const diagnostics = [];
    let pixelMetrics = null;
    if (!contained) diagnostics.push('PATH_OUTSIDE_RUN_DIRECTORY');
    if (!exists) diagnostics.push('FILE_MISSING');
    if (exists && bytes === 0) diagnostics.push('FILE_EMPTY');
    if (exists && !minimumHeaderValid) diagnostics.push('PNG_HEADER_TOO_SHORT');
    if (exists && minimumHeaderValid && !pngSignatureValid) diagnostics.push('PNG_SIGNATURE_INVALID');
    if (exists && minimumHeaderValid && !ihdrLengthValid) diagnostics.push('PNG_IHDR_LENGTH_INVALID');
    if (exists && minimumHeaderValid && !ihdrTypeValid) diagnostics.push('PNG_FIRST_CHUNK_NOT_IHDR');
    if (exists && pngSignatureValid && ihdrValid && !dimensionsValid) diagnostics.push('PNG_DIMENSIONS_ZERO');
    if (!inventoryListed) diagnostics.push('ARTIFACT_NOT_IN_INVENTORY');
    if (runRelativePath !== name) diagnostics.push('RUN_RELATIVE_PATH_MISMATCH');
    if (exists && pngSignatureValid && ihdrValid && dimensionsValid) {
      try {
        const decoded = decodePngPixels(buffer);
        const colors = new Map();
        let meaningfulPixels = 0;
        let sum = 0;
        let sumSquares = 0;
        for (let i = 0; i < decoded.rgba.length; i += 4) {
          const r = decoded.rgba[i], g = decoded.rgba[i + 1], b = decoded.rgba[i + 2], a = decoded.rgba[i + 3];
          const key = `${r},${g},${b},${a}`;
          colors.set(key, (colors.get(key) || 0) + 1);
          if (a >= 32 && r + g + b > 12) meaningfulPixels++;
          const luminance = (r + g + b) / 3;
          sum += luminance;
          sumSquares += luminance * luminance;
        }
        const pixelCount = decoded.width * decoded.height;
        const dominant = [...colors.entries()].sort((a, b) => b[1] - a[1])[0] || ['0,0,0,0', 0];
        const variance = sumSquares / pixelCount - (sum / pixelCount) ** 2;
        const minimumMeaningfulPixels = Math.max(256, Math.ceil(pixelCount * 0.05));
        const minimumDistinctColors = 16;
        const minimumVariance = 20;
        const maximumDominantFraction = 0.97;
        pixelMetrics = {
          decoded: true, pixelCount, meaningfulPixels, minimumMeaningfulPixels,
          distinctColors: colors.size, minimumDistinctColors, variance, minimumVariance,
          dominantColor: dominant[0], dominantFraction: dominant[1] / pixelCount, maximumDominantFraction,
          fileSha256: crypto.createHash('sha256').update(buffer).digest('hex'),
          decodedPixelSha256: crypto.createHash('sha256').update(decoded.rgba).digest('hex'),
        };
        pixelMetrics.nonblankPass = meaningfulPixels >= minimumMeaningfulPixels && colors.size >= minimumDistinctColors
          && variance >= minimumVariance && pixelMetrics.dominantFraction <= maximumDominantFraction;
        if (!pixelMetrics.nonblankPass) diagnostics.push('PNG_PIXEL_CONTENT_DEGENERATE');
      } catch (err) {
        diagnostics.push(`PNG_DECODE_FAILED:${String(err.message || err)}`);
      }
    }
    return {
      path: name, runRelativePath, exists, bytes, width, height, minimumHeaderValid, pngSignatureValid,
      ihdrLengthValid, ihdrTypeValid, ihdrValid, dimensionsValid, inventoryListed,
      manifestEntryReady: inventoryListed && runRelativePath === name, contained, pixelMetrics, diagnostics,
    };
  });
  const fileHashes = files.map((file) => file.pixelMetrics?.fileSha256).filter(Boolean);
  const pixelHashes = files.map((file) => file.pixelMetrics?.decodedPixelSha256).filter(Boolean);
  const uniqueFileHashes = fileHashes.length === files.length && new Set(fileHashes).size === files.length;
  const uniqueDecodedPixelHashes = pixelHashes.length === files.length && new Set(pixelHashes).size === files.length;
  if (!uniqueFileHashes || !uniqueDecodedPixelHashes) {
    files.forEach((file) => file.diagnostics.push('PNG_PAIRWISE_DISTINCTNESS_FAILED'));
  }
  const minimap = files.find((file) => file.path === 'proof-spriteground-minimap-preserved.png');
  const minimapCapture = sectionResult?.focusedPostD2CanState?.minimapCapture || null;
  let minimapSemantic = { pass: false, reason: 'minimap unavailable' };
  if (minimap?.pixelMetrics && minimapCapture) {
    const decoded = decodePngPixels(fs.readFileSync(path.join(run.dir, minimap.path)));
    const histogram = new Map();
    for (let i = 0; i < decoded.rgba.length; i += 4) {
      const key = `${decoded.rgba[i]},${decoded.rgba[i + 1]},${decoded.rgba[i + 2]},${decoded.rgba[i + 3]}`;
      histogram.set(key, (histogram.get(key) || 0) + 1);
    }
    const dominant = [...histogram.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '0,0,0,0';
    const background = dominant.split(',').map(Number);
    let navigationPixels = 0;
    let detailPixels = 0;
    for (let i = 0; i < decoded.rgba.length; i += 4) {
      const rgba = [decoded.rgba[i], decoded.rgba[i + 1], decoded.rgba[i + 2], decoded.rgba[i + 3]];
      const distance = Math.max(...rgba.map((value, index) => Math.abs(value - background[index])));
      if (rgba[3] < 64 || distance < 18) continue;
      const chroma = Math.max(rgba[0], rgba[1], rgba[2]) - Math.min(rgba[0], rgba[1], rgba[2]);
      if (chroma <= 24) navigationPixels++;
      else detailPixels++;
    }
    const pixelCount = decoded.width * decoded.height;
    const minimumGroupPixels = Math.max(64, Math.ceil(pixelCount * 0.002));
    const boundsExact = minimapCapture.boundsExact === true
      && JSON.stringify(minimapCapture.cropBounds) === JSON.stringify(minimapCapture.fixtureComputedBounds);
    const fullyInsideView = minimapCapture.fullyInsideView === true
      && minimapCapture.cropBounds.x >= 0 && minimapCapture.cropBounds.y >= 0
      && minimapCapture.cropBounds.x + minimapCapture.cropBounds.w <= minimapCapture.canvasBounds.w
      && minimapCapture.cropBounds.y + minimapCapture.cropBounds.h <= minimapCapture.canvasBounds.h;
    const nonBackgroundPixels = navigationPixels + detailPixels;
    const nonBackgroundPass = nonBackgroundPixels >= Math.max(256, Math.ceil(pixelCount * 0.02));
    const semanticGroupsPass = navigationPixels >= minimumGroupPixels && detailPixels >= minimumGroupPixels;
    minimapSemantic = {
      pass: boundsExact && fullyInsideView && nonBackgroundPass && semanticGroupsPass
        && minimap.pixelMetrics.nonblankPass === true && uniqueFileHashes && uniqueDecodedPixelHashes,
      boundsExact, fullyInsideView, nonBackgroundPixels, nonBackgroundPass,
      navigationPixels, detailPixels, minimumGroupPixels, semanticGroupsPass,
      notDuplicate: uniqueFileHashes && uniqueDecodedPixelHashes,
      notBlankOrOverlayDominated: minimap.pixelMetrics.nonblankPass === true,
      backgroundColor: dominant,
    };
    if (!minimapSemantic.pass) minimap.diagnostics.push('MINIMAP_SEMANTIC_VALIDATION_FAILED');
  }
  const missing = files.filter((file) => !file.exists).map((file) => file.path);
  const invalid = files.filter((file) => file.diagnostics.length > 0).map((file) => file.path);
  const structuralPass = files.every((file) => file.exists && file.bytes > 0 && file.pngSignatureValid
    && file.ihdrValid && file.dimensionsValid && file.manifestEntryReady && file.contained && file.pixelMetrics?.decoded === true);
  const allNonblank = files.every((file) => file.pixelMetrics?.nonblankPass === true);
  return {
    pass: structuralPass && allNonblank && uniqueFileHashes && uniqueDecodedPixelHashes && minimapSemantic.pass,
    structuralPass, allNonblank, uniqueFileHashes, uniqueDecodedPixelHashes,
    pairwiseDistinct: uniqueFileHashes && uniqueDecodedPixelHashes,
    minimapSemantic, files, missing, invalid,
  };
}

async function runFocusedSpriteGroundAnchor() {
  const focusedSection = process.env.CR_SELFCHECK_FOCUSED_SECTION;
  if (focusedSection !== 'spriteGroundAnchor') {
    throw new Error(`Unsupported focused self-check section: ${focusedSection}`);
  }
  const outputArgIndex = process.argv.indexOf('--output-dir');
  if (outputArgIndex >= 0 && (!process.argv[outputArgIndex + 1] || process.argv[outputArgIndex + 1].startsWith('--'))) {
    throw new Error('Missing repository-relative path after --output-dir');
  }
  const run = resolveSelfcheckRun({ requested: outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null });
  activeRun = run;
  process.env.CR_SELFCHECK_RUN_DIR = run.dir;
  console.log(`SELF-CHECK OUTPUT: ${displayPath(run.dir)} (${run.automatic ? `automatic${run.collisionSuffix ? ` collision suffix ${run.collisionSuffix}` : ''}` : 'explicit'})`);
  const recorder = new SectionRecorder(['spriteGroundAnchor']);
  activeSectionRecorder = recorder;
  let srv = null;
  let browser = null;
  let context = null;
  let net = null;
  let result = null;
  let requiredPngValidation = { pass: false, files: [], missing: [...SPRITE_GROUND_REQUIRED_PNGS], invalid: [] };
  let spriteGroundFocusedAcceptance = { pass: false };
  let exitCode = 1;
  try {
    const releaseArtifactPath = resolveReleaseArtifactPath();
    srv = await startStaticServer(releaseArtifactPath);
    browser = await chromium.launch();
    context = await browser.newContext();
    const page = await context.newPage();
    const nativeScreenshot = page.screenshot.bind(page);
    page.screenshot = async (options = {}) => {
      const output = runOutputPath(options.path || 'proof-playwright-screenshot.png');
      const screenshot = await nativeScreenshot({ ...options, path: output });
      activeSectionRecorder?.recordProof(output);
      return screenshot;
    };
    net = await attachObservers(page);
    result = await recorder.run('spriteGroundAnchor', net, () => spriteGroundAnchorSection(page));
    requiredPngValidation = validateSpriteGroundPngs(run, result);
    const counts = observerCounts(net);
    const recorderState = recorder.compactSummary(net);
    const allFiveSemanticChecks = {
      d1GroundedScene: result?.focusedD1Semantic?.pass === true,
      d2NpcStorefront: result?.focusedD2NpcFixture?.semanticPass === true,
      d2NaturalCan: result?.focusedD2CanFixture?.semanticValidation?.result === 'pass',
      d3GarageService: result?.focusedD3Fixture?.semanticValidation?.result === 'pass',
      minimap: requiredPngValidation.minimapSemantic?.pass === true,
    };
    allFiveSemanticChecks.pass = Object.values(allFiveSemanticChecks).every((value) => value === true);
    spriteGroundFocusedAcceptance = {
      spriteGroundAnchor: result?.focusedRuntimeAcceptance?.spriteGroundAnchor === true,
      d2NpcExactPose: result?.focusedD2NpcFixture?.exactPose === true,
      d2CanExactPoseObjectDistance: result?.focusedRuntimeAcceptance?.d2CanExactPoseObjectDistanceAndSemantic === true,
      d1D2Nonmutation: result?.focusedSceneNonmutation?.pass === true,
      d3IndependentReestablishment: result?.focusedRuntimeAcceptance?.d3IndependentReestablishment === true,
      authoritativeD3GarageTarget: result?.focusedRuntimeAcceptance?.authoritativeD3GarageTarget === true,
      allFivePngStructural: requiredPngValidation.structuralPass === true,
      allFivePngNonblank: requiredPngValidation.allNonblank === true,
      allFivePngPairwiseDistinct: requiredPngValidation.pairwiseDistinct === true,
      allFivePngManifestedContained: requiredPngValidation.files?.length === 5
        && requiredPngValidation.files.every((file) => file.manifestEntryReady === true && file.contained === true),
      allFiveSemanticChecks,
      observersZero: counts.console === 0 && counts.page === 0 && counts.external === 0,
      recorderExpectedRegisteredOneOfOne: recorderState.expectedSectionIds.length === 1
        && recorderState.registeredSectionIds.length === 1
        && recorderState.expectedSectionIds[0] === 'spriteGroundAnchor'
        && recorderState.registeredSectionIds[0] === 'spriteGroundAnchor',
      recorderNoMissingFailed: recorderState.pass === true && recorderState.missingExpectedSectionIds.length === 0
        && recorderState.failedSections.length === 0,
    };
    spriteGroundFocusedAcceptance.pass = Object.entries(spriteGroundFocusedAcceptance)
      .filter(([key]) => key !== 'pass')
      .every(([, value]) => value === true || value?.pass === true);
    exitCode = spriteGroundFocusedAcceptance.pass === true ? 0 : 1;
  } catch (err) {
    recorder.fail('terminal failure', err, net);
    console.error('SELF-CHECK TERMINAL FAILURE:', String(err?.stack || err));
  } finally {
    const cleanupErrors = [];
    for (const [name, resource] of [['browser context', context], ['browser', browser]]) {
      if (!resource) continue;
      try { await resource.close(); } catch (err) {
        cleanupErrors.push({ name, error: String(err?.message || err), stack: String(err?.stack || err) });
      }
    }
    if (srv) {
      try { await new Promise((resolve, reject) => srv.close((err) => err ? reject(err) : resolve())); } catch (err) {
        cleanupErrors.push({ name: 'static server', error: String(err?.message || err), stack: String(err?.stack || err) });
      }
    }
    if (cleanupErrors.length) {
      for (const cleanupError of cleanupErrors) recorder.fail(`cleanup ${cleanupError.name}`, cleanupError, net);
      exitCode = 1;
    }
    const recorderSummary = recorder.compactSummary(net);
    const finalCounts = observerCounts(net);
    spriteGroundFocusedAcceptance.observersZero = finalCounts.console === 0 && finalCounts.page === 0 && finalCounts.external === 0;
    spriteGroundFocusedAcceptance.recorderExpectedRegisteredOneOfOne = recorderSummary.expectedSectionIds.length === 1
      && recorderSummary.registeredSectionIds.length === 1
      && recorderSummary.expectedSectionIds[0] === 'spriteGroundAnchor'
      && recorderSummary.registeredSectionIds[0] === 'spriteGroundAnchor';
    spriteGroundFocusedAcceptance.recorderNoMissingFailed = recorderSummary.pass === true
      && recorderSummary.missingExpectedSectionIds.length === 0 && recorderSummary.failedSections.length === 0;
    spriteGroundFocusedAcceptance.cleanupZero = cleanupErrors.length === 0;
    spriteGroundFocusedAcceptance.pass = Object.entries(spriteGroundFocusedAcceptance)
      .filter(([key]) => key !== 'pass')
      .every(([, value]) => value === true || value?.pass === true);
    if (!spriteGroundFocusedAcceptance.pass) exitCode = 1;
    const output = {
      pass: exitCode === 0 && spriteGroundFocusedAcceptance.pass === true && recorderSummary.pass,
      focusedSection,
      releaseArtifactPath: path.relative(ROOT, resolveReleaseArtifactPath()).replace(/\\/g, '/'),
      spriteGroundAnchor: result,
      d1Semantic: result?.focusedD1Semantic || null,
      d1D2Nonmutation: result?.focusedSceneNonmutation || null,
      runtimeAcceptance: result?.focusedRuntimeAcceptance || null,
      d2NpcFixture: result?.focusedD2NpcFixture || null,
      d2CanFixture: result?.focusedD2CanFixture || null,
      d3Fixture: result?.focusedD3Fixture || null,
      postD2CanState: result?.focusedPostD2CanState || null,
      requiredPngValidation,
      spriteGroundFocusedAcceptance,
      observerCounts: finalCounts,

      sectionRecorder: recorderSummary,
      failedSections: recorderSummary.failedSections,
      cleanupErrors,
      timestamp: new Date().toISOString(),
    };
    const summaryPath = writeProof('proof-playwright-summary.json', output);
    const manifest = finalizeRunManifest(run, { pass: output.pass, exitCode, summaryPath });
    activeSectionRecorder = null;
    activeRun = null;
    console.log(JSON.stringify({ pass: output.pass, focusedSection, observerCounts: output.observerCounts, failedSections: output.failedSections, proof: 'proof-playwright-summary.json', manifest: displayPath(run.dir + path.sep + 'manifest.json'), artifacts: manifest.artifacts.length }));
  }
  return exitCode;
}

async function main() {
  const outputArgIndex = process.argv.indexOf('--output-dir');
  if (outputArgIndex >= 0 && (!process.argv[outputArgIndex + 1] || process.argv[outputArgIndex + 1].startsWith('--'))) {
    throw new Error('Missing repository-relative path after --output-dir');
  }
  const run = resolveSelfcheckRun({ requested: outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null });
  activeRun = run;
  process.env.CR_SELFCHECK_RUN_DIR = run.dir;
  console.log(`SELF-CHECK OUTPUT: ${displayPath(run.dir)} (${run.automatic ? `automatic${run.collisionSuffix ? ` collision suffix ${run.collisionSuffix}` : ''}` : 'explicit'})`);
  const recorder = new SectionRecorder();
  activeSectionRecorder = recorder;
  let srv = null;
  let browser = null;
  let context = null;
  let page = null;
  let net = null;
  let finalSummary = null;
  let exitCode = 1;
  try {
    const releaseArtifactPath = resolveReleaseArtifactPath();
    const constitution = await recorder.run('constitution static checks', net, async () => runAiSafeConstitutionCheck(releaseArtifactPath));
    const sourceBuildPipeline = await recorder.run('source build pipeline', net, async () => sourceBuildPipelineSection());
    srv = await recorder.run('setup static server', net, async () => startStaticServer(releaseArtifactPath));
    browser = await recorder.run('setup chromium browser', net, async () => chromium.launch());
    context = await recorder.run('setup browser context', net, async () => browser.newContext());
    page = await recorder.run('setup browser page and observers', net, async () => {
      const createdPage = await context.newPage();
      const nativeScreenshot = createdPage.screenshot.bind(createdPage);
      createdPage.screenshot = async (options = {}) => {
        const output = runOutputPath(options.path || 'proof-playwright-screenshot.png');
        const result = await nativeScreenshot({ ...options, path: output });
        activeSectionRecorder?.recordProof(output);
        return result;
      };
      net = await attachObservers(createdPage);
      return createdPage;
    });

  const viewports = [
    { label: 'pixel7-portrait', viewport: { width: 412, height: 915 }, shot: 'proof-playwright-pixel7-portrait.png' },
    { label: 'pixel7-landscape', viewport: { width: 915, height: 412 }, shot: 'proof-playwright-pixel7-landscape.png' },
    { label: 'travislike-portrait', viewport: { width: 360, height: 800 }, shot: 'proof-playwright-travislike-portrait.png' },
    { label: 'desktop-smoke', viewport: { width: 1280, height: 720 }, shot: 'proof-playwright-desktop-smoke.png' },
  ];
  const viewportResults = [];
  for (const v of viewports) {
    viewportResults.push(await recorder.run(`viewport layout ${v.label}`, net, () => runViewportLayout(page, v.label, v.viewport, v.shot)));
  }

  const { canvas, raf } = await recorder.run('browser smoke and animation frame', net, async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/index.html?mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
    await waitGameReady(page);
    const canvas = await canvasNonBlank(page);
    const raf = await rafAdvances(page);
    return { pass: canvas.ok && raf.rafOk, canvas, raf };
  });

  const full = await recorder.run('full runtime self-check', net, async () => {
    const result = await page.evaluate(() => {
      window.__crRuntimeErrors = window.__crRuntimeErrors || [];
      return CR.runFullSelfCheck();
    });
    writeProof('proof-full-selfcheck.json', result);
    return result;
  });

  const identityParity = {
    metadata: sourceBuildPipeline.metadata?.buildId || null,
    source: sourceBuildPipeline.metadata?.sourceBuildId || null,
    artifact: sourceBuildPipeline.metadata?.artifactBuildId || null,
    runtime: full.build || null,
  };
  identityParity.pass = identityParity.metadata === identityParity.source
    && identityParity.source === identityParity.artifact
    && identityParity.artifact === identityParity.runtime;

  const raycastInvariant = await recorder.run('raycaster invariant self-check', net, async () => {
    const result = await page.evaluate(() => {
      window.__crRuntimeErrors = window.__crRuntimeErrors || [];
      return CR.runRaycasterInvariantSelfCheck();
    });
    writeProof('proof-raycaster-invariant.json', result);
    return result;
  });

  const viewportAuthority = await recorder.run('viewport authority self-check', net, async () => {
    const result = await page.evaluate(() => {
      window.__crRuntimeErrors = window.__crRuntimeErrors || [];
      return CR.runViewportAuthoritySelfCheck();
    });
    writeProof('proof-viewport-authority.json', result);
    return result;
  });

  const semanticAction = await recorder.run('semanticAction', net, async () => {
    const result = await page.evaluate(() => CR.runSemanticActionMapSelfCheck());
    writeProof('proof-semantic-action-map.json', result);
    return result;
  });
  const inputGuard = await recorder.run('inputGuard', net, async () => {
    const result = await page.evaluate(() => CR.runInputNoDirectMutationGuardSelfCheck());
    writeProof('proof-input-no-direct-mutation.json', result);
    return result;
  });
  const worldAdapter = await recorder.run('worldAdapter', net, async () => {
    const result = await page.evaluate(() => CR.runWorldLayerAdapterSelfCheck());
    writeProof('proof-world-layer-adapter.json', result);
    return result;
  });
  const worldAdapterPhase1 = await recorder.run('worldAdapterPhase1', net, async () => {
    const result = await page.evaluate(() => CR.runWorldAdapterWiringPhase1SelfCheck());
    writeProof('proof-world-adapter-collision.json', result);
    return result;
  });
  const worldAdapterPhase2 = await recorder.run('worldAdapterPhase2', net, async () => {
    const result = await page.evaluate(() => CR.runWorldAdapterWiringPhase2SelfCheck());
    writeProof('proof-world-adapter-render.json', result);
    return result;
  });
  const fixedStepBaseline = await recorder.run('fixedStepBaseline', net, async () => {
    const result = await page.evaluate(() => CR.runFixedStepBaselineSelfCheck());
    writeProof('proof-fixed-step-baseline.json', result);
    return result;
  });
  const fixedStepSimulation = await recorder.run('fixedStepSimulation', net, async () => {
    const result = await page.evaluate(() => CR.runFixedStepSimulationSelfCheck());
    writeProof('proof-fixed-step-simulation.json', result);
    return result;
  });
  const raycastDebug = await recorder.run('raycastDebug', net, async () => {
    const result = await page.evaluate(() => {
      CR.startRun(42);
      CR.state = CR.STATE.PLAY;
      if (typeof drawScene === 'function') drawScene(performance.now());
      return CR.crDebugRaycastFrame();
    });
    writeProof('proof-raycast-debug-frame.json', result);
    return result;
  });
  const spriteOcclusionVisual = await recorder.run('spriteOcclusionVisual', net, async () => {
    const result = await page.evaluate(() => {
      const occ = CR.getOcclusionZbufferProof();
      const halo = CR.getSpriteHaloRegressionProof();
      return { pass: !!(occ && occ.predicateOk && halo && halo.spriteLoopOk), occlusion: occ, halo, build: CR.BUILD_ID, timestamp: new Date().toISOString() };
    });
    writeProof('proof-sprite-occlusion-visual.json', result);
    return result;
  });
  const spriteOcclusionScreenshot = await recorder.run('spriteOcclusionScreenshot', net, async () => {
    const spriteOcclusionShots = [
      ['visible_sprite', 'proof-sprite-visible.png'], ['occluded_sprite', 'proof-sprite-occluded.png'], ['can_near_wall', 'proof-sprite-near-wall.png'],
    ];
    for (const [scene, file] of spriteOcclusionShots) {
      await page.evaluate((s) => { CR.setMobileMode(true); CR.crRenderFailureBenchScene(s); }, scene);
      await page.waitForTimeout(300);
      await page.screenshot({ path: runOutputPath(file) });
      recorder.recordProof(runOutputPath(file));
    }
    const result = await page.evaluate(() => CR.crSpriteOcclusionScreenshotProof());
    writeProof('proof-sprite-occlusion-screenshot.json', result);
    return result;
  });

  const singleMaterialBuildingTextures = await recorder.run('singleMaterialBuildingTextures', net, () => singleMaterialBuildingTextureSection(page));
  const walltextures2ScaleVariation = await recorder.run('walltextures2ScaleVariation', net, () => walltextures2ScaleVariationSection(page));
  const walltextures3Ownership = await recorder.run('walltextures3Ownership', net, () => walltextures3WholeBuildingTextureOwnershipSection(page));
  const walltextures4Shape = await recorder.run('walltextures4Shape', net, () => walltextures4MaterialShapeReadabilitySection(page));
  const decalIntegration1 = await recorder.run('decalIntegration1', net, () => decalIntegration1Section(page));
  const decalIntegration2 = await recorder.run('decalIntegration2', net, () => decalIntegration2Section(page));
  const decalIntegration3Visual = await recorder.run('decalIntegration3Visual', net, () => decalIntegration3VisualSection(page));
  const decalIntegration4MaterialIdentity = await recorder.run('decalIntegration4MaterialIdentity', net, () => decalIntegration4MaterialIdentitySection(page));
  const facadeSkins1 = await recorder.run('facadeSkins1', net, () => facadeSkins1Section(page));

  const dock = await recorder.run('dock', net, () => controlDockRegression(page));
  const pointer = await recorder.run('pointer', net, () => pointerTorture(page));
  const resilience = await recorder.run('resilience', net, () => viewportResilience(page));
  const saveLoad = await recorder.run('saveLoad', net, () => saveLoadRoundtrip(page));
  const saveLoadValidation = validateSaveLoadProof(saveLoad);
  const audio = await recorder.run('audio', net, () => audioUnlock(page));
  const viewportSafeArea = await recorder.run('viewportSafeArea', net, () => viewportSafeAreaSection(page));
  const portraitUsability = await recorder.run('portraitUsability', net, () => portraitUsabilitySection(page));
  const optionsCleanup = await recorder.run('optionsCleanup', net, () => optionsCleanupSection(page));
  const decorativeProps = await recorder.run('decorativeProps', net, () => decorativePropsSection(page));
  const streetBlockLevel = await recorder.run('streetBlockLevel', net, () => streetBlockLevelSection(page));
  const d1ParkLandmark = await recorder.run('d1ParkLandmark', net, () => d1ParkLandmarkSection(page));
  const buildingModuleFacade = await recorder.run('buildingModuleFacade', net, () => buildingModuleFacadeSection(page));
  const facadePackBridge = await recorder.run('facadePackBridge', net, () => facadePackBridgeSection(page));
  const facadePackV2Safe = await recorder.run('facadePackV2Safe', net, () => facadePackV2SafeSection(page));
  const fpvGroundPlaneAlignment = await recorder.run('fpvGroundPlaneAlignment', net, () => fpvGroundPlaneAlignmentSection(page));
  const d2D3FacadeReadabilityFinal = await recorder.run('d2D3FacadeReadabilityFinal', net, () => d2D3FacadeReadabilityFinalSection(page));
  const buildingSmoothStyle = await recorder.run('buildingSmoothStyle', net, () => buildingSmoothStyleSection(page));
  const continuousFacadeTexture = await recorder.run('continuousFacadeTexture', net, () => continuousFacadeTextureSection(page));
  const spriteGroundAnchor = await recorder.run('spriteGroundAnchor', net, () => spriteGroundAnchorSection(page));
  const facadeArtVocabulary = await recorder.run('facadeArtVocabulary', net, () => facadeArtVocabularySection(page));
  const facadeCompositionReadability = await recorder.run('facadeCompositionReadability', net, () => facadeCompositionReadabilitySection(page));
  const fpvFacadeTargetPolish = await recorder.run('fpvFacadeTargetPolish', net, () => fpvFacadeTargetPolishSection(page));
  const fpvWallLineArtifactFix = await recorder.run('fpvWallLineArtifactFix', net, () => fpvWallLineArtifactFixSection(page));
  const fpvStreetShimmerFix = await recorder.run('fpvStreetShimmerFix', net, () => fpvStreetShimmerFixSection(page));
  const streetReadabilityMinimap = await recorder.run('streetReadabilityMinimap', net, () => streetReadabilityMinimapSection(page));
  const earlyDistrictProgression = await recorder.run('earlyDistrictProgression', net, () => earlyDistrictProgressionSection(page));
  const levelSelector = await recorder.run('levelSelector', net, () => levelSelectorSection(page));
  const buildingScalePolish = await recorder.run('buildingScalePolish', net, () => buildingScalePolishSection(page));
  const settingsSafetyPass = portraitUsability.settingsSafety?.pass === true;

  const mobileControlReliability = await recorder.run('mobileControlReliability', net, () => mobileControlReliabilitySection(page));
  const declarativeControls = await recorder.run('declarativeControls', net, () => declarativeControlsSection(page));
  const movementCollision = await recorder.run('movementCollision', net, () => movementCollisionSection(page));
  const reachability = await recorder.run('reachability', net, () => reachabilitySection(page));
  const proceduralLevelValidation = await recorder.run('proceduralLevelValidation', net, () => proceduralLevelValidationSection(page));
  const fullRunProgression = await recorder.run('fullRunProgression', net, () => fullRunProgressionSection(page));

  const harnessIsolation = await recorder.run('harnessIsolation', net, () => harnessIsolationSection(page));
  const renderFailure = await recorder.run('renderFailure', net, () => renderFailureSection(page));
  const hallE2E = await recorder.run('hallE2E', net, () => hallE2ESection(page));
  const visual = await recorder.run('visual', net, () => visualRegressionShots(page));
  const visualRectangle = await recorder.run('visualRectangle', net, () => visualRectangleProofShots(page));
  const soundFeedback = await recorder.run('soundFeedback', net, () => soundFeedbackProofShots(page));

  await recorder.run('network result', net, async () => {
    writeProof('proof-network.json', {
      pass: net.externalRequests.length === 0,
      externalCount: net.externalRequests.length,
      externalRequests: net.externalRequests.slice(0, 20),
      requestFailed: net.requestFailed,
    });
    return { pass: net.externalRequests.length === 0 };
  });

  const selfcheckOverlay = await recorder.run('self-check overlay result', net, async () => {
    await page.goto(`${BASE}/index.html?selfcheck=1&mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
    const completion = await waitForSelfCheckCompletion(page, net, 15000);
    const overlay = await page.evaluate(() => ({
      result: window.__crSelfCheckResult || null,
      overlayText: document.getElementById('crselfcheck')?.textContent || '',
      overlayVisible: getComputedStyle(document.getElementById('crselfcheck')).display !== 'none',
      lifecycle: window.__crSelfCheckLifecycle || null,
      hasCompletionPromise: !!window.__crSelfCheckDone && typeof window.__crSelfCheckDone.then === 'function',
    }));
    return {
      pass: !completion.contractMissing && !completion.timedOut && !completion.error && selfCheckTerminalState(completion.completionState),
      ...overlay, completion,
      completionContract: !completion.contractMissing && overlay.hasCompletionPromise,
      completionState: completion.completionState || overlay.lifecycle?.state || null,
      timeoutDiagnostics: completion.timeoutDiagnostics || null,
      selfCheckLifecycle: overlay.lifecycle,
    };
  });

  const consolePass = net.consoleErrors.length === 0;
  const pageErrPass = net.pageErrors.length === 0;
  const networkPass = net.externalRequests.length === 0;

  const corePass =
    constitution.pass &&
    sourceBuildPipeline.pass &&
    identityParity.pass &&
    full.pass &&
    raycastInvariant.pass === true &&
    viewportAuthority.pass === true &&
    semanticAction.pass === true &&
    inputGuard.pass === true &&
    worldAdapter.pass === true &&
    worldAdapterPhase1.pass === true &&
    worldAdapterPhase2.pass === true &&
    fixedStepBaseline.pass === true &&
    fixedStepSimulation.pass === true &&
    spriteOcclusionScreenshot.pass === true &&
    singleMaterialBuildingTextures.pass === true &&
    walltextures2ScaleVariation.pass === true &&
    walltextures3Ownership.pass === true &&
    walltextures4Shape.pass === true &&
    decalIntegration1.pass === true &&
    decalIntegration2.pass === true &&
    decalIntegration3Visual.pass === true &&
    decalIntegration4MaterialIdentity.pass === true &&
    facadeSkins1.pass === true &&
    dock.pass &&
    pointer.pass &&
    resilience.pass &&
    saveLoadValidation.pass === true &&
    audio.pass &&
    viewportSafeArea.pass &&
    portraitUsability.pass &&
    optionsCleanup.pass &&
    decorativeProps.pass &&
    streetBlockLevel.pass &&
    d1ParkLandmark.pass &&
    buildingModuleFacade.pass &&
    facadePackBridge.pass &&
    facadePackV2Safe.pass &&
    fpvGroundPlaneAlignment.pass &&
    d2D3FacadeReadabilityFinal.pass &&
    buildingSmoothStyle.pass &&
    continuousFacadeTexture.pass &&
    spriteGroundAnchor.pass &&
    facadeArtVocabulary.pass &&
    facadeCompositionReadability.pass &&
    fpvFacadeTargetPolish.pass &&
    fpvWallLineArtifactFix.pass &&
    fpvStreetShimmerFix.pass &&
    streetReadabilityMinimap.pass &&
    earlyDistrictProgression.pass &&
    levelSelector.pass &&
    buildingScalePolish.pass &&
    settingsSafetyPass &&
    mobileControlReliability.pass &&
    declarativeControls.pass &&
    movementCollision.pass &&
    reachability.pass &&
    proceduralLevelValidation.pass &&
    fullRunProgression.pass &&
    harnessIsolation.pass &&
    renderFailure.pass &&
    hallE2E.pass &&
    visual.pass &&
    visualRectangle.pass &&
    soundFeedback.pass &&
    networkPass &&
    consolePass &&
    pageErrPass &&
    canvas.ok &&
    viewportResults.every((v) => v.layoutPass);

  const releaseArtifact = await recorder.run('release artifact result', net, async () => runReleaseArtifactCheck(releaseArtifactPath, {
    playwrightPass: corePass,
    fullSelfCheckPass: full.pass === true,
    fullSelfCheck: { pass: full.pass, build: full.build },
    externalRequestCount: net.externalRequests.length,
    consoleErrorCount: net.consoleErrors.length,
    pageErrorCount: net.pageErrors.length,
    commitHash: getGitCommitShort(),
  }));

  const summary = {
    pass: corePass && releaseArtifact.pass === true,
    releaseArtifactPath: path.relative(ROOT, releaseArtifactPath).replace(/\\/g, '/'),
    githubPagesArtifact: 'index.html (repo root)',
    constitution,
    aiSafeConstitution: { pass: constitution.pass, proof: 'proof-ai-safe-constitution.json' },
    sourceBuildPipeline,
    identityParity,
    releaseArtifact,
    fullSelfCheck: { pass: full.pass, build: full.build },
    singleMaterialBuildingTextures,
    decalIntegration3Visual,
    decalIntegration4MaterialIdentity,
    facadeSkins1,
    dock,
    pointer,
    resilience,
    saveLoad,
    saveLoadValidation,
    saveLoadProof: 'proof-save-load-roundtrip.json',
    audio,
    viewportSafeArea,
    portraitUsability,
    optionsCleanup,
    decorativeProps,
    streetBlockLevel,
    d1ParkLandmark,
    buildingModuleFacade,
    facadePackBridge,
    facadePackV2Safe,
    fpvGroundPlaneAlignment,
    d2D3FacadeReadabilityFinal,
    buildingSmoothStyle,
    continuousFacadeTexture,
    spriteGroundAnchor,
    facadeArtVocabulary,
    facadeCompositionReadability,
    fpvFacadeTargetPolish,
    fpvWallLineArtifactFix,
    fpvStreetShimmerFix,
    streetReadabilityMinimap,
    earlyDistrictProgression,
    levelSelector,
    buildingScalePolish,
    settingsSafety: portraitUsability.settingsSafety || { pass: settingsSafetyPass },
    mobileControlReliability,
    movementCollision,
    reachability,
    proceduralLevelValidation,
    fullRunProgression,
    harnessIsolation,
    renderFailure,
    hallE2E,
    visual,
    visualRectangle,
    soundFeedback,
    network: { pass: networkPass, external: net.externalRequests.length },
    console: { pass: consolePass, errors: net.consoleErrors },
    pageErrors: { pass: pageErrPass, errors: net.pageErrors },
    canvas,
    raf,
    viewports: viewportResults,
    selfcheckUrl: selfcheckOverlay,
    selfCheckLifecycle: selfcheckOverlay.selfCheckLifecycle,
    completionContract: selfcheckOverlay.completionContract,
    completionState: selfcheckOverlay.completionState,
    timeoutDiagnostics: selfcheckOverlay.timeoutDiagnostics,
    timestamp: new Date().toISOString(),
  };
  await recorder.run('overall aggregate assertions', net, async () => ({
    pass: summary.pass,
    errors: saveLoadValidation.pass === true ? [] : saveLoadValidation.errors,
  }));
  finalSummary = summary;
  exitCode = summary.pass ? 0 : 1;
  } catch (err) {
    recorder.fail('terminal failure', err, net);
    exitCode = 1;
    console.error('SELF-CHECK TERMINAL FAILURE:', String(err?.stack || err));
  } finally {
    const cleanupErrors = [];
    for (const [name, resource] of [['browser context', context], ['browser', browser]]) {
      if (!resource) continue;
      try { await resource.close(); } catch (err) {
        cleanupErrors.push({ name, error: String(err?.message || err), stack: String(err?.stack || err) });
      }
    }
    if (srv) {
      try { await new Promise((resolve, reject) => srv.close((err) => err ? reject(err) : resolve())); } catch (err) {
        cleanupErrors.push({ name: 'static server', error: String(err?.message || err), stack: String(err?.stack || err) });
      }
    }
    if (cleanupErrors.length) {
      for (const cleanupError of cleanupErrors) recorder.fail(`cleanup ${cleanupError.name}`, cleanupError, net);
      exitCode = 1;
    }
    const recorderSummary = recorder.compactSummary(net);
    const output = {
      ...(finalSummary || {}),
      pass: exitCode === 0 && recorderSummary.pass,
      sectionRecorder: recorderSummary,
      failedSections: recorderSummary.failedSections,
      cleanupErrors,
      timestamp: new Date().toISOString(),
    };
    const summaryPath = writeProof('proof-playwright-summary.json', output);
    const manifest = finalizeRunManifest(run, { pass: output.pass, exitCode, summaryPath });
    activeSectionRecorder = null;
    activeRun = null;
    console.log(JSON.stringify({ pass: output.pass, failedSections: output.failedSections, proof: 'proof-playwright-summary.json', manifest: displayPath(run.dir + path.sep + 'manifest.json'), artifacts: manifest.artifacts.length }));
  }
  return exitCode;
}

try {
  preflightSelfcheckRunDirectoryEnv();
  if (process.env.CR_SELFCHECK_OUTPUT_META_TEST === '1') {
    runOutputRoutingMetaTest().then((pass) => process.exit(pass ? 0 : 1));
  } else if (process.env.CR_SELFCHECK_COMPLETION_META_TEST === '1') {
    runSelfCheckCompletionMetaTest().then((pass) => process.exit(pass ? 0 : 1));
  } else if (process.env.CR_SELFCHECK_HANG_META_TEST === '1') {
    runSelfCheckHangMetaTest().then((pass) => process.exit(pass ? 0 : 1));
  } else if (process.env.CR_SELFCHECK_META_TEST === '1') {
    Promise.all([runRecorderMetaTest(), runCanonicalMetadataMetaTest(), runSaveLoadValidationMetaTest()]).then((results) => process.exit(results.every(Boolean) ? 0 : 1));
  } else if (process.env.CR_SELFCHECK_FOCUSED_SECTION) {
    runFocusedSpriteGroundAnchor().then((exitCode) => process.exit(exitCode)).catch((err) => {
      console.error('SELF-CHECK TERMINAL FAILURE:', String(err?.stack || err));
      process.exit(1);
    });
  } else {
    main().then((exitCode) => process.exit(exitCode)).catch((err) => {
      console.error('SELF-CHECK TERMINAL FAILURE:', String(err?.stack || err));
      process.exit(1);
    });
  }
} catch (err) {
  console.error('SELF-CHECK TERMINAL FAILURE:', String(err?.stack || err));
  process.exit(1);
}
