/**
 * Visual proof capture: solidwalls-frontproof1 (Playwright-only harness).
 * Usage: node tests/capture_solidwalls_frontproof.js [--only angle,minimap]
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'file:///' + ROOT.replace(/\\/g, '/');
const HARNESS = 'solidwalls-frontproof1';

const SCREENSHOTS = [
  { key: 'phone', file: 'proof-solidwalls-frontwall-phone.png', note: 'Portrait FPV with building wall centered ahead' },
  { key: 'close', file: 'proof-solidwalls-frontwall-close.png', note: 'Close frontal wall — opaque fill' },
  { key: 'angle', file: 'proof-solidwalls-frontwall-angle.png', note: 'Angled front + side wall materials' },
  { key: 'minimap', file: 'proof-solidwalls-frontwall-minimap.png', note: 'Minimap + test block (canvas only)' },
];

function parseOnlyArg() {
  const idx = process.argv.indexOf('--only');
  if (idx < 0) return null;
  const raw = process.argv[idx + 1] || '';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

async function ensurePlayNoMenuOverlay(page) {
  return page.evaluate(() => {
    state = STATE.PLAY;
    paused = false;
    onboardingOpen = false;
    confirmAction = null;
    if (typeof clearInputState === 'function') clearInputState();
    if (typeof dismissOnboardingHelp === 'function') dismissOnboardingHelp(false);
    if (typeof syncOnboardingPanel === 'function') syncOnboardingPanel();
    const cron = document.getElementById('cronboard');
    if (cron) cron.classList.remove('open');
    if (typeof rmenuClearForGameplay === 'function') rmenuClearForGameplay();
    const rmenu = document.getElementById('rmenu');
    if (rmenu) {
      rmenu.classList.add('in');
      rmenu.innerHTML = '';
      rmenu.classList.remove('options-tune');
    }
    if (inp) {
      inp.pause = false;
      inp._lastPause = true;
      inp.map = false;
      inp._lastMap = true;
    }
    if (game.run) {
      game.run.harnessOnly = false;
      game.run.active = true;
    }
    const mportmenu = document.getElementById('mportmenu');
    if (mportmenu) mportmenu.style.visibility = 'hidden';
    return {
      state,
      paused,
      onboardingOpen,
      rmenuHidden: rmenu ? rmenu.classList.contains('in') : null,
      rmenuLen: rmenu ? rmenu.innerHTML.length : null,
    };
  });
}

/** Full gameplay paint (phone/close). */
async function paintPlayFrame(page) {
  return page.evaluate(() => {
    const t = performance.now();
    if (typeof drawScene === 'function') drawScene(t);
    if (!ctx || !view) return { ok: false, error: 'no ctx/view' };
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, view.width, view.height);
    const lay = playfieldLayout();
    ctx.drawImage(buf, lay.ox, lay.oy, lay.dw, lay.dh);
    if (state === STATE.PLAY && !options.reduceFx) {
      ctx.fillStyle = 'rgba(220,180,120,0.05)';
      ctx.fillRect(0, 0, view.width, view.height);
    }
    if (state === STATE.PLAY && !paused) {
      if (typeof drawPortraitDashboardChrome === 'function') drawPortraitDashboardChrome();
      if (typeof drawHUD === 'function') drawHUD(t);
      if (typeof drawMinap === 'function') drawMinap();
    }
    if (typeof drawOverlays === 'function') drawOverlays();
    if (typeof drawMobileMenu === 'function') drawMobileMenu();
    return { ok: true };
  });
}

/** Proof paint: no pause/title HTML menu refresh, no overlay dim menus on canvas. */
async function paintProofFrame(page, { minimap = true } = {}) {
  return page.evaluate(({ minimap }) => {
    const t = performance.now();
    if (typeof drawScene === 'function') drawScene(t);
    if (!ctx || !view) return { ok: false, error: 'no ctx/view' };
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, view.width, view.height);
    const lay = playfieldLayout();
    ctx.drawImage(buf, lay.ox, lay.oy, lay.dw, lay.dh);
    if (state === STATE.PLAY && !options.reduceFx) {
      ctx.fillStyle = 'rgba(220,180,120,0.05)';
      ctx.fillRect(0, 0, view.width, view.height);
    }
    if (state === STATE.PLAY && !paused) {
      if (typeof drawPortraitDashboardChrome === 'function') drawPortraitDashboardChrome();
      if (typeof drawHUD === 'function') drawHUD(t);
      if (minimap && typeof drawMinap === 'function') drawMinap();
    }
    return { ok: true, mode: 'proof' };
  }, { minimap });
}

async function readGuards(page, { strictMenu = false } = {}) {
  return page.evaluate(({ strictMenu }) => {
    const errors = [];
    if (BUILD_ID !== 'solidwalls1') errors.push('BUILD_ID mismatch: ' + BUILD_ID);
    if (typeof CR_SOLID_WALLS_OPAQUE_BASELINE === 'undefined') errors.push('CR_SOLID_WALLS_OPAQUE_BASELINE missing');
    else if (CR_SOLID_WALLS_OPAQUE_BASELINE !== 1) errors.push('CR_SOLID_WALLS_OPAQUE_BASELINE !== 1');
    if (state !== STATE.PLAY) errors.push('state is not PLAY: ' + state);
    if (paused) errors.push('paused is true');

    const r = document.getElementById('rmenu');
    const rText = r ? (r.textContent || '').trim() : '';
    const rmenuTitleVisible =
      !!r &&
      !r.classList.contains('in') &&
      r.innerHTML.trim().length > 0 &&
      (rText.includes('NEW RUN') ||
        rText.includes('Solidarity Not Charity Can Run') ||
        rText.includes('START NEW RUN'));
    const rmenuPauseVisible =
      !!r &&
      !r.classList.contains('in') &&
      r.innerHTML.trim().length > 0 &&
      (rText.includes('RESUME') ||
        rText.includes('RESTART RUN') ||
        rText.includes('MAIN MENU') ||
        rText.includes('OPTIONS / HELP'));
    const rmenuAnyOverlay = rmenuTitleVisible || rmenuPauseVisible;

    if (rmenuAnyOverlay) errors.push('HTML menu overlay (#rmenu) visible: ' + rText.slice(0, 80));

    const cron = document.getElementById('cronboard');
    const cronOpen = !!(cron && cron.classList.contains('open'));
    if (cronOpen) errors.push('cronboard onboarding open');

    let canvasSamples = null;
    let fpvLike = false;
    if (ctx && view && typeof playfieldLayout === 'function') {
      const lay = playfieldLayout();
      const sample = (fx, fy) => {
        const x = Math.max(0, Math.min(view.width - 1, Math.floor(lay.ox + lay.dw * fx)));
        const y = Math.max(0, Math.min(view.height - 1, Math.floor(lay.oy + lay.dh * fy)));
        const d = ctx.getImageData(x, y, 1, 1).data;
        return [d[0], d[1], d[2], d[3]];
      };
      canvasSamples = {
        fpvSky: sample(0.5, 0.12),
        fpvCenter: sample(0.5, 0.55),
        fpvFloor: sample(0.5, 0.88),
        canvasCorner: (() => {
          const d = ctx.getImageData(4, 4, 1, 1).data;
          return [d[0], d[1], d[2], d[3]];
        })(),
      };
      const corner = canvasSamples.canvasCorner;
      const titleMenuCanvas =
        corner[0] >= 24 && corner[0] <= 28 && corner[1] >= 18 && corner[1] <= 22 && corner[2] >= 14 && corner[2] <= 18;
      fpvLike = !titleMenuCanvas && !rmenuAnyOverlay && state === STATE.PLAY && !paused;
      if (!fpvLike) errors.push('canvas/menu still looks like TITLE or paused overlay');
    } else {
      errors.push('cannot sample canvas');
    }

    const stateNames = {};
    for (const k of Object.keys(STATE || {})) stateNames[STATE[k]] = k;

    return {
      ok: errors.length === 0,
      errors,
      strictMenu,
      BUILD_ID,
      state,
      stateName: stateNames[state] || state,
      paused,
      CR_SOLID_WALLS_OPAQUE_BASELINE:
        typeof CR_SOLID_WALLS_OPAQUE_BASELINE !== 'undefined' ? CR_SOLID_WALLS_OPAQUE_BASELINE : null,
      rmenuTitleVisible,
      rmenuPauseVisible,
      rmenuAnyOverlay,
      rmenuHasInClass: r ? r.classList.contains('in') : null,
      rmenuInnerLen: r ? r.innerHTML.trim().length : null,
      cronOpen,
      canvasSamples,
      fpvLike,
      player: { x: player.x, y: player.y, angle: player.angle },
      harnessApplied: typeof CR_SOLIDWALLS_FRONTPROOF_NAME !== 'undefined',
      harnessName: typeof CR_SOLIDWALLS_FRONTPROOF_NAME !== 'undefined' ? CR_SOLIDWALLS_FRONTPROOF_NAME : null,
    };
  }, { strictMenu });
}

async function bootPortrait(page) {
  await page.goto(`${BASE}/index.html?mobile=on&portraitlayout=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof startRun === 'function' && typeof drawScene === 'function', null, {
    timeout: 25000,
  });
  await page.waitForSelector('#view', { timeout: 10000 });
  await page.waitForTimeout(400);
}

async function enterFrontProof(page, district, seed) {
  return page.evaluate(({ district, seed }) => {
    if (typeof crSetSelectedStartDistrict === 'function') crSetSelectedStartDistrict(district);
    startRun(seed);
    state = STATE.PLAY;
    paused = false;
    onboardingOpen = false;
    if (typeof dismissOnboardingHelp === 'function') dismissOnboardingHelp(false);
    if (typeof syncOnboardingPanel === 'function') syncOnboardingPanel();
    const cron = document.getElementById('cronboard');
    if (cron) cron.classList.remove('open');
    if (typeof rmenuClearForGameplay === 'function') rmenuClearForGameplay();
    const rmenu = document.getElementById('rmenu');
    if (rmenu) {
      rmenu.classList.add('in');
      rmenu.innerHTML = '';
    }
    if (typeof resize === 'function') resize();
    const applied =
      typeof crApplySolidwallsFrontProofHarness === 'function'
        ? crApplySolidwallsFrontProofHarness({ keepEntities: true })
        : { ok: false, error: 'missing harness' };
    if (game.run) {
      game.run.harnessOnly = false;
      game.run.active = true;
    }
    state = STATE.PLAY;
    paused = false;
    return { applied, state };
  }, { district, seed });
}

async function settleVisual(page, frames, paintFn) {
  for (let i = 0; i < frames; i++) {
    await ensurePlayNoMenuOverlay(page);
    await page.evaluate(() => update(1 / 30));
    await paintFn(page);
    await page.waitForTimeout(60);
  }
}

async function captureProofShot(page, absPath, label, { minimap = true } = {}) {
  await ensurePlayNoMenuOverlay(page);
  await paintProofFrame(page, { minimap });
  const guards = await readGuards(page, { strictMenu: true });
  if (!guards || !guards.ok) {
    const errList = guards && guards.errors ? guards.errors.join('; ') : 'readGuards returned no data';
    throw new Error(`Guards failed before ${label}: ${errList}`);
  }
  await page.locator('#view').screenshot({ path: absPath });
  const stat = fs.statSync(absPath);
  return { file: path.basename(absPath), label, guards, bytes: stat.size, mtime: stat.mtime.toISOString() };
}

async function main() {
  const only = parseOnlyArg();
  const runStarted = new Date().toISOString();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await bootPortrait(page);

  const boot = await enterFrontProof(page, 1, 902101);
  await settleVisual(page, 4, paintPlayFrame);

  const abs = (f) => path.join(ROOT, f);
  const captures = [];

  const want = (key) => !only || only.has(key);

  if (only && !only.has('phone') && !only.has('close')) {
    // partial recapture: stay on default harness pose until angle/minimap blocks
  } else if (want('phone')) {
    await captureProofShot(page, abs(SCREENSHOTS[0].file), SCREENSHOTS[0].key, { minimap: true });
    captures.push({ ...SCREENSHOTS[0], mtime: fs.statSync(abs(SCREENSHOTS[0].file)).mtime.toISOString() });
  }

  if (want('close')) {
    await page.evaluate(() => {
      player.x = 6.2;
      player.y = (game.roadY0 + game.roadY1) / 2 + 0.5;
      player.angle = 0;
      if (typeof player.dir === 'number') player.dir = 0;
    });
    await settleVisual(page, 3, paintPlayFrame);
    await captureProofShot(page, abs(SCREENSHOTS[1].file), SCREENSHOTS[1].key, { minimap: true });
    captures.push({ ...SCREENSHOTS[1], mtime: fs.statSync(abs(SCREENSHOTS[1].file)).mtime.toISOString() });
  } else if (only) {
    await page.evaluate(() => {
      player.x = 6.2;
      player.y = (game.roadY0 + game.roadY1) / 2 + 0.5;
      player.angle = 0;
      if (typeof player.dir === 'number') player.dir = 0;
    });
    await settleVisual(page, 2, paintPlayFrame);
  }

  if (want('angle')) {
    await page.evaluate(() => {
      const py = (game.roadY0 + game.roadY1) / 2 + 0.5;
      player.x = 6.5;
      player.y = py + 0.35;
      player.angle = Math.PI / 5;
      if (typeof player.dir === 'number') player.dir = player.angle;
      showMinimap = false;
    });
    const cap = await captureProofShot(page, abs(SCREENSHOTS[2].file), SCREENSHOTS[2].key, { minimap: false });
    captures.push({ ...SCREENSHOTS[2], ...cap });
  }

  if (want('minimap')) {
    await page.evaluate(() => {
      showMinimap = true;
    });
    const cap = await captureProofShot(page, abs(SCREENSHOTS[3].file), SCREENSHOTS[3].key, { minimap: true });
    captures.push({ ...SCREENSHOTS[3], ...cap });
  }

  const finalGuards = await readGuards(page, { strictMenu: true });
  const touched = SCREENSHOTS.filter((s) => want(s.key)).map((s) => s.file);

  const out = {
    pass: boot.applied && boot.applied.ok === true && finalGuards.ok === true,
    onlyMode: only ? [...only] : null,
    touchedScreenshots: touched,
    BUILD_ID: finalGuards.BUILD_ID,
    state: finalGuards.state,
    harnessName: HARNESS,
    regenerationTag: 'ANGLE+MINIMAP FIX: no menu overlay, proof paint path',
    captures,
    runStarted,
    runFinished: new Date().toISOString(),
    boot,
  };

  const prevPath = path.join(ROOT, 'proof-solidwalls-frontproof-debug.json');
  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(prevPath, 'utf8'));
  } catch (_) {}
  fs.writeFileSync(prevPath, JSON.stringify({ ...prev, ...out }, null, 2));
  console.log(JSON.stringify(out));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});