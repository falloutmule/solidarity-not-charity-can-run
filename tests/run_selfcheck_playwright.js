/**
 * Playwright + Node observer for SNC Can Run (single-file index.html).
 * Run from repo root: node tests/run_selfcheck_playwright.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'index.html');
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

function writeProof(name, data) {
  const p = path.join(ROOT, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  return p;
}

function runConstitutionCheck() {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  const errors = [];
  const checks = {};
  checks.hasConstitution = src.includes('AI-SAFE SINGLE-FILE CONSTITUTION');
  checks.BUILD_ID = /const\s+BUILD_ID\s*=\s*['"][^'"]+['"]/.test(src);
  checks.SAVE_VERSION = /const\s+SAVE_VERSION\s*=/.test(src);
  checks.windowCR = /globalThis\.CR\s*=\s*window\.CR\s*=/.test(src);
  checks.noEval = !/\beval\s*\(/.test(src);
  checks.noExternalScript = !/<script[^>]+src\s*=\s*["']https?:/i.test(src);
  checks.noExternalStylesheet = !/<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']https?:/i.test(src);
  const onclickHits = (src.match(/\bonclick\s*=/gi) || []).length;
  checks.noInlineOnclick = onclickHits === 0;
  if (!checks.hasConstitution) errors.push('missing AI-SAFE SINGLE-FILE CONSTITUTION');
  if (!checks.BUILD_ID) errors.push('missing BUILD_ID');
  if (!checks.SAVE_VERSION) errors.push('missing SAVE_VERSION');
  if (!checks.windowCR) errors.push('missing window.CR export');
  if (!checks.noEval) errors.push('eval() found');
  if (!checks.noExternalScript) errors.push('external script src');
  if (!checks.noExternalStylesheet) errors.push('external stylesheet');
  if (!checks.noInlineOnclick) errors.push('inline onclick count ' + onclickHits);
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
  const pass = errors.length === 0;
  const result = { pass, checks, sectionHits, errors, file: INDEX_PATH };
  writeProof('proof-constitution-check.json', result);
  return result;
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, ''));
      if (!filePath.startsWith(ROOT)) {
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

async function main() {
  const constitution = runConstitutionCheck();
  const srv = await startStaticServer();
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

  const summary = {
    pass:
      constitution.pass &&
      full.pass &&
      dock.pass &&
      pointer.pass &&
      resilience.pass &&
      (saveLoad.pass !== false) &&
      audio.pass &&
      visual.pass &&
      networkPass &&
      consolePass &&
      pageErrPass &&
      canvas.ok &&
      viewportResults.every(v => v.layoutPass),
    constitution,
    fullSelfCheck: { pass: full.pass, build: full.build },
    dock,
    pointer,
    resilience,
    saveLoad,
    audio,
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