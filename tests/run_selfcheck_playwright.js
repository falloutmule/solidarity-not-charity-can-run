/**
 * Playwright + Node observer for SNC Can Run.
 * Tests the RELEASE ARTIFACT (root index.html by default; CR_RELEASE_ARTIFACT=dist for dist/index.html).
 * Run from repo root: node tests/run_selfcheck_playwright.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

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

function writeProof(name, data) {
  const p = path.join(ROOT, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  return p;
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
  checks.BUILD_ID = /const\s+BUILD_ID\s*=\s*['"][^'"]+['"]/.test(src);
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
  const buildMatch = src.match(/const\s+BUILD_ID\s*=\s*['"]([^'"]+)['"]/);
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
  const shot = path.join(ROOT, screenshotName);
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
  const scenarios = [
    { name: 'normal-seed42', url: `${BASE}/index.html?mobile=on&portraitlayout=1`, setup: 'CR.startRun(42)' },
    { name: 'snc-hall', url: `${BASE}/index.html?mobile=on&portraitlayout=1`, setup: "CR.startCustomLevel('hall_of_servants')" },
    { name: 'options', url: `${BASE}/index.html?mobile=on&portraitlayout=1`, setup: "CR.state='options'" },
    { name: 'dock-mid', url: `${BASE}/index.html?mobile=on&portraitlayout=1`, setup: 'CR.options.controlsYOffsetPx=0;CR.applyMobileControlSettings();CR.startRun(42)' },
    { name: 'dock-high', url: `${BASE}/index.html?mobile=on&portraitlayout=1`, setup: 'CR.options.controlsYOffsetPx=-120;CR.applyMobileControlSettings();CR.startRun(42)' },
  ];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const sc of scenarios) {
    await page.goto(sc.url, { waitUntil: 'domcontentloaded' });
    await waitGameReady(page);
    await page.evaluate(sc.setup);
    await page.waitForTimeout(500);
    const blank = await canvasNonBlank(page);
    const file = `proof-visual-${sc.name}.png`;
    await page.screenshot({ path: path.join(ROOT, file) });
    shots.push({ scenario: sc.name, file, blankOk: blank.ok, canvas: blank });
  }
  const index = { pass: shots.every(s => s.blankOk), shots, timestamp: new Date().toISOString() };
  writeProof('proof-visual-regression-index.json', index);
  return index;
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
      await page.screenshot({ path: path.join(ROOT, sc.shot) });
    }

    if (!optionsShotDone && sc.label === 'travislike-portrait') {
      await page.evaluate(() => {
        CR.state = 'options';
        if (typeof drawMobileMenu === 'function') drawMobileMenu();
        const r = document.getElementById('rmenu');
        if (r) r.scrollTop = r.scrollHeight;
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(ROOT, 'proof-options-back-reachable.png') });
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
  await page.screenshot({ path: path.join(ROOT, 'proof-control-move-drag.png') });

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
  await page.screenshot({ path: path.join(ROOT, 'proof-control-look-drag.png') });

  await page.evaluate(() => {
    const mportmenu = document.getElementById('mportmenu');
    if (mportmenu) {
      const r = mportmenu.getBoundingClientRect();
      CR.crDispatchTouch(mportmenu, 'touchstart', r.left + r.width / 2, r.top + 8, 66);
      CR.crDispatchTouch(mportmenu, 'touchend', r.left + r.width / 2, r.top + 8, 66);
    }
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ROOT, 'proof-control-menu-open.png') });

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
  await page.screenshot({ path: path.join(ROOT, 'proof-collision-corridor.png') });

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
    await page.screenshot({ path: path.join(ROOT, p.shot) });
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
  await page.screenshot({ path: path.join(ROOT, 'proof-resetcontrols-safe.png') });
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
  await page.screenshot({ path: path.join(ROOT, 'proof-selfcheck-restored-state.png') });
  const afterSelfcheck = await page.evaluate(() => CR.crPublicStateFingerprint());

  await page.goto(normalUrl, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ROOT, 'proof-normal-boot-after-selfcheck.png') });
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
  await page.screenshot({ path: path.join(ROOT, 'proof-hall-start.png') });

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
  await page.screenshot({ path: path.join(ROOT, 'proof-hall-helped.png') });

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
  await page.screenshot({ path: path.join(ROOT, 'proof-hall-exit.png') });

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

async function main() {
  const releaseArtifactPath = resolveReleaseArtifactPath();
  const constitution = runAiSafeConstitutionCheck(releaseArtifactPath);
  const srv = await startStaticServer(releaseArtifactPath);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const net = await attachObservers(page);

  const viewports = [
    { label: 'pixel7-portrait', viewport: { width: 412, height: 915 }, shot: 'proof-playwright-pixel7-portrait.png' },
    { label: 'pixel7-landscape', viewport: { width: 915, height: 412 }, shot: 'proof-playwright-pixel7-landscape.png' },
    { label: 'travislike-portrait', viewport: { width: 360, height: 800 }, shot: 'proof-playwright-travislike-portrait.png' },
    { label: 'desktop-smoke', viewport: { width: 1280, height: 720 }, shot: 'proof-playwright-desktop-smoke.png' },
  ];
  const viewportResults = [];
  for (const v of viewports) {
    viewportResults.push(await runViewportLayout(page, v.label, v.viewport, v.shot));
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/index.html?mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
  await waitGameReady(page);
  const canvas = await canvasNonBlank(page);
  const raf = await rafAdvances(page);

  const full = await page.evaluate(() => {
    window.__crRuntimeErrors = window.__crRuntimeErrors || [];
    return CR.runFullSelfCheck();
  });
  writeProof('proof-full-selfcheck.json', full);

  const dock = await controlDockRegression(page);
  const pointer = await pointerTorture(page);
  const resilience = await viewportResilience(page);
  const saveLoad = await saveLoadRoundtrip(page);
  const audio = await audioUnlock(page);
  const viewportSafeArea = await viewportSafeAreaSection(page);
  const portraitUsability = await portraitUsabilitySection(page);
  const settingsSafetyPass = portraitUsability.settingsSafety?.pass === true;

  const mobileControlReliability = await mobileControlReliabilitySection(page);
  const movementCollision = await movementCollisionSection(page);

  const harnessIsolation = await harnessIsolationSection(page);
  const renderFailure = await renderFailureSection(page);
  const hallE2E = await hallE2ESection(page);
  const visual = await visualRegressionShots(page);

  writeProof('proof-network.json', {
    pass: net.externalRequests.length === 0,
    externalCount: net.externalRequests.length,
    externalRequests: net.externalRequests.slice(0, 20),
    requestFailed: net.requestFailed,
  });

  const selfcheckUrl = await page.goto(`${BASE}/index.html?selfcheck=1&mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const selfcheckOverlay = await page.evaluate(() => ({
    result: window.__crSelfCheckResult || null,
    overlayText: document.getElementById('crselfcheck')?.textContent || '',
    overlayVisible: getComputedStyle(document.getElementById('crselfcheck')).display !== 'none',
  }));

  const consolePass = net.consoleErrors.length === 0;
  const pageErrPass = net.pageErrors.length === 0;
  const networkPass = net.externalRequests.length === 0;

  const corePass =
    constitution.pass &&
    full.pass &&
    dock.pass &&
    pointer.pass &&
    resilience.pass &&
    (saveLoad.pass !== false) &&
    audio.pass &&
    viewportSafeArea.pass &&
    portraitUsability.pass &&
    settingsSafetyPass &&
    mobileControlReliability.pass &&
    movementCollision.pass &&
    harnessIsolation.pass &&
    renderFailure.pass &&
    hallE2E.pass &&
    visual.pass &&
    networkPass &&
    consolePass &&
    pageErrPass &&
    canvas.ok &&
    viewportResults.every((v) => v.layoutPass);

  const releaseArtifact = runReleaseArtifactCheck(releaseArtifactPath, {
    playwrightPass: corePass,
    fullSelfCheckPass: full.pass === true,
    fullSelfCheck: { pass: full.pass, build: full.build },
    externalRequestCount: net.externalRequests.length,
    consoleErrorCount: net.consoleErrors.length,
    pageErrorCount: net.pageErrors.length,
    commitHash: getGitCommitShort(),
  });

  const summary = {
    pass: corePass && releaseArtifact.pass === true,
    releaseArtifactPath: path.relative(ROOT, releaseArtifactPath).replace(/\\/g, '/'),
    githubPagesArtifact: 'index.html (repo root)',
    constitution,
    aiSafeConstitution: { pass: constitution.pass, proof: 'proof-ai-safe-constitution.json' },
    releaseArtifact,
    fullSelfCheck: { pass: full.pass, build: full.build },
    dock,
    pointer,
    resilience,
    saveLoad,
    audio,
    viewportSafeArea,
    portraitUsability,
    settingsSafety: portraitUsability.settingsSafety || { pass: settingsSafetyPass },
    mobileControlReliability,
    movementCollision,
    harnessIsolation,
    renderFailure,
    hallE2E,
    visual,
    network: { pass: networkPass, external: net.externalRequests.length },
    console: { pass: consolePass, errors: net.consoleErrors },
    pageErrors: { pass: pageErrPass, errors: net.pageErrors },
    canvas,
    raf,
    viewports: viewportResults,
    selfcheckUrl: selfcheckOverlay,
    timestamp: new Date().toISOString(),
  };
  writeProof('proof-playwright-summary.json', summary);

  await browser.close();
  srv.close();

  console.log(JSON.stringify({ pass: summary.pass, proofs: 'proof-*.json in repo root' }));
  process.exit(summary.pass ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});