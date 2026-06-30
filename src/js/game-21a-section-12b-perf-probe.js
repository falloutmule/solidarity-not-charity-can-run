// ---------------------------------------------------------------------------
// SECTION 12b — GATED PERF PROBE OVERLAY (?perfprobe=1 only)
// ---------------------------------------------------------------------------
const CR_PERF_PROBE = new URLSearchParams(location.search).get('perfprobe') === '1';

let _crPerfInstalled = false;
let _crPerf = null;
let _crPerfLastFrameNow = 0;
let _crPerfLastHudAt = 0;
let _crPerfSnap = null;

function crPerfProbeReset() {
  _crPerf = {
    frameMs: [],
    over33: 0,
    over50: 0,
    drawSceneMs: [],
    minimapMs: [],
    chromeMs: [],
    hudMs: [],
    spriteCount: 0,
    framesSampled: 0,
  };
  _crPerfLastFrameNow = 0;
  _crPerfLastHudAt = 0;
  _crPerfSnap = null;
}

function _crPerfCap(arr, v, max) {
  arr.push(v);
  if (arr.length > max) arr.shift();
}

function _crPerfPct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

function _crPerfSummarize(arr) {
  if (!arr.length) return { avg: 0, p95: 0, worst: 0, n: 0 };
  let sum = 0;
  let worst = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (arr[i] > worst) worst = arr[i];
  }
  const sorted = arr.slice().sort((a, b) => a - b);
  return {
    avg: sum / arr.length,
    p95: _crPerfPct(sorted, 95),
    worst,
    n: arr.length,
  };
}

function crPerfProbeEnsureInstalled() {
  if (!CR_PERF_PROBE || _crPerfInstalled) return;
  _crPerfInstalled = true;
  crPerfProbeReset();

  if (typeof drawScene === 'function') {
    const orig = drawScene;
    drawScene = function (now) {
      const t0 = performance.now();
      orig(now);
      _crPerfCap(_crPerf.drawSceneMs, performance.now() - t0, 240);
      try {
        const props = (game.props && game.props.length) || 0;
        const npcs = (game.npcs && game.npcs.filter((n) => !n.helped).length) || 0;
        const cans = (game.pickups && game.pickups.filter((c) => !c.taken).length) || 0;
        _crPerf.spriteCount = props + npcs + cans + (game.exit ? 1 : 0);
      } catch (e) {}
    };
  }
  if (typeof drawMinap === 'function') {
    const orig = drawMinap;
    drawMinap = function () {
      const t0 = performance.now();
      orig();
      _crPerfCap(_crPerf.minimapMs, performance.now() - t0, 240);
    };
  }
  if (typeof drawPortraitDashboardChrome === 'function') {
    const orig = drawPortraitDashboardChrome;
    drawPortraitDashboardChrome = function () {
      const t0 = performance.now();
      orig();
      _crPerfCap(_crPerf.chromeMs, performance.now() - t0, 240);
    };
  }
  if (typeof drawHUD === 'function') {
    const orig = drawHUD;
    drawHUD = function (now) {
      const t0 = performance.now();
      orig(now);
      _crPerfCap(_crPerf.hudMs, performance.now() - t0, 240);
    };
  }

  const viewEl = document.getElementById('view');
  if (viewEl) {
    viewEl.addEventListener(
      'pointerdown',
      (ev) => {
        if (!CR_PERF_PROBE || state !== STATE.PLAY) return;
        const r = viewEl.getBoundingClientRect();
        const x = ev.clientX - r.left;
        const y = ev.clientY - r.top;
        if (x <= 172 && y <= 132) {
          crPerfProbeReset();
          _crPerfInstalled = true;
        }
      },
      { passive: true }
    );
  }
}

function crPerfProbeFrameStart(now) {
  if (!CR_PERF_PROBE || !_crPerf) return;
  if (_crPerfLastFrameNow > 0 && state === STATE.PLAY && !paused) {
    const gap = now - _crPerfLastFrameNow;
    if (gap > 0 && gap < 500) {
      _crPerfCap(_crPerf.frameMs, gap, 360);
      _crPerf.framesSampled++;
      if (gap > 33) _crPerf.over33++;
      if (gap > 50) _crPerf.over50++;
    }
  }
  _crPerfLastFrameNow = now;
}

function crPerfProbeRefreshSnap(now) {
  if (!CR_PERF_PROBE || !_crPerf) return;
  if (_crPerfLastHudAt && now - _crPerfLastHudAt < 500) return;
  _crPerfLastHudAt = now;

  const frame = _crPerfSummarize(_crPerf.frameMs);
  const ds = _crPerfSummarize(_crPerf.drawSceneMs);
  const mm = _crPerfSummarize(_crPerf.minimapMs);
  const ch = _crPerfSummarize(_crPerf.chromeMs);
  const hud = _crPerfSummarize(_crPerf.hudMs);
  const fps = frame.avg > 0 ? 1000 / frame.avg : 0;

  let district = '?';
  let seed = '?';
  try {
    district = String(game.district != null ? game.district : crGetSelectedStartDistrict());
    seed = String(game.seed != null ? game.seed : '');
  } catch (e) {}

  const mob = typeof mobileMode !== 'undefined' && mobileMode ? 'mob' : 'desk';
  const port =
    typeof isMobilePortrait === 'function' && isMobilePortrait()
      ? 'port'
      : typeof crIsPortraitLayout === 'function' && crIsPortraitLayout()
        ? 'port'
        : 'land';

  _crPerfSnap = {
    BUILD_ID: typeof BUILD_ID !== 'undefined' ? BUILD_ID : '?',
    fps: fps.toFixed(1),
    frameAvg: frame.avg.toFixed(2),
    frameP95: frame.p95.toFixed(2),
    frameWorst: frame.worst.toFixed(2),
    over33: _crPerf.over33,
    over50: _crPerf.over50,
    drawScene: ds.avg.toFixed(2),
    minimap: mm.avg.toFixed(2),
    chrome: ch.avg.toFixed(2),
    hud: hud.avg.toFixed(2),
    sprites: _crPerf.spriteCount,
    district,
    seed,
    canvas: view ? view.width + 'x' + view.height : '?',
    css: view ? Math.round(view.clientWidth) + 'x' + Math.round(view.clientHeight) : '?',
    dpr: (devicePixelRatio || 1).toFixed(2),
    layout: mob + '/' + port,
    tap: 'tap TL reset',
  };
}

function crPerfProbeDrawOverlay(ctx, now) {
  if (!CR_PERF_PROBE || !_crPerf) return;
  crPerfProbeRefreshSnap(now);
  if (!_crPerfSnap) return;

  const s = _crPerfSnap;
  const lines = [
    'perf ' + s.BUILD_ID,
    'fps ' + s.fps + ' avg ' + s.frameAvg + 'ms',
    'p95 ' + s.frameP95 + ' worst ' + s.frameWorst,
    '>33ms ' + s.over33 + ' >50ms ' + s.over50,
    'scene ' + s.drawScene + ' map ' + s.minimap,
    'chrome ' + s.chrome + ' hud ' + s.hud,
    'spr ' + s.sprites + ' D' + s.district + ' seed ' + s.seed,
    s.canvas + ' css ' + s.css + ' dpr ' + s.dpr,
    s.layout + ' ' + s.tap,
  ];

  const pad = 4;
  const lh = 10;
  const w = 168;
  const h = pad * 2 + lines.length * lh;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(pad, pad, w, h);
  ctx.font = '9px monospace';
  ctx.fillStyle = '#8fdc8f';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], pad + 4, pad + 4 + i * lh);
  }
  ctx.restore();
}

function crPerfProbeGetReport() {
  if (!CR_PERF_PROBE || !_crPerf) return null;
  crPerfProbeRefreshSnap(performance.now());
  return Object.assign({}, _crPerfSnap, {
    frameSamples: _crPerf.frameMs.length,
    framesSampled: _crPerf.framesSampled,
  });
}

if (CR_PERF_PROBE && new URLSearchParams(location.search).has('perfreset')) {
  crPerfProbeReset();
}