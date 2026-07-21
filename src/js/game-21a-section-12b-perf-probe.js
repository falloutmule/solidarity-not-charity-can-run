// ---------------------------------------------------------------------------
// SECTION 12b — GATED PERF PROBE OVERLAY (?perfprobe=1 only)
// ---------------------------------------------------------------------------
const CR_PERF_PROBE = new URLSearchParams(location.search).get('perfprobe') === '1';

let _crPerfInstalled = false;
let _crPerf = null;
let _crPerfLastFrameNow = 0;
let _crPerfLastHudAt = 0;
let _crPerfSnap = null;
let _crPerfMobileBaseline = null;
let _crPerfAngleBaseline = null;
let _crPerfProjectionBaseline = null;
let _crPerfMotionBaseline = null;

function _crPerfReadFarFieldIdentity() {
  let profile = null;
  let angle = 'raw';
  let projection = 'legacy';
  if (typeof crGetRenderProfile === 'function') {
    try { profile = crGetRenderProfile(); } catch (e) { profile = null; }
  }
  const profileId = profile && (profile.id === '320' || profile.id === '400' || profile.id === '480') ?
    profile.id : '320';
  const fallbackDimensions = profileId === '480' ? [480, 300] : profileId === '400' ? [400, 250] : [320, 200];
  const width = fallbackDimensions[0];
  const height = fallbackDimensions[1];

  if (typeof crGetSelectedRenderAngleMode === 'function') {
    try {
      const value = crGetSelectedRenderAngleMode();
      if (value === 'raw' || value === 'interp' || value === 'smooth') angle = value;
    } catch (e) {}
  }
  if (typeof crResolveFarFieldProjectionMode === 'function') {
    try {
      const value = crResolveFarFieldProjectionMode();
      if (value === 'legacy' || value === 'subpixel') projection = value;
    } catch (e) {}
  }
  return {
    ffres: profileId,
    ffangle: angle,
    ffproj: projection,
    internalResolution: { width, height },
  };
}

function _crPerfEmptyBuckets() {
  return {
    under9_5: 0,
    from9_5To13_5: 0,
    from13_5To20: 0,
    from20To33: 0,
    from33To50: 0,
    over50: 0,
  };
}

const CR_PERF_LONG_FRAME_THRESHOLD_MS = 33;
const CR_PERF_PHASE_KEYS = [
  'simulation', 'scene', 'minimap', 'chrome', 'hud', 'mobileMenu', 'mobileLayout', 'bitmap'
];

function _crPerfEmptyFramePhases() {
  const phases = {};
  for (const key of CR_PERF_PHASE_KEYS) phases[key] = 0;
  return phases;
}

function _crPerfRecordFramePhase(key, elapsed) {
  if (!_crPerf || !_crPerf.framePhases || !Object.prototype.hasOwnProperty.call(_crPerf.framePhases, key)) return;
  _crPerf.framePhases[key] += Math.max(0, _crPerfFinite(elapsed));
}

function _crPerfRecordLongFrameCorrelation(gap) {
  if (!_crPerf || !_crPerf.framePhases || gap <= CR_PERF_LONG_FRAME_THRESHOLD_MS) return;
  _crPerfCap(_crPerf.longFrameGaps, gap, 720);
  for (const key of CR_PERF_PHASE_KEYS) {
    _crPerfCap(_crPerf.longFramePhases[key], _crPerf.framePhases[key], 720);
  }
}

function _crPerfReadMobileStats() {
  if (typeof crGetMobileUiSyncStats !== 'function') return null;
  try {
    const value = crGetMobileUiSyncStats();
    return value && typeof value === 'object' ? value : null;
  } catch (e) {
    return null;
  }
}

function _crPerfReadAngleStats() {
  if (typeof crGetRenderAngleCadenceStats !== 'function') return null;
  try {
    const value = crGetRenderAngleCadenceStats();
    if (!value || typeof value !== 'object' || !Array.isArray(value.lookEventGaps) ||
        !Array.isArray(value.renderAngleDeltas)) return null;
    const counters = [value.rawLookEvents, value.repeatedRenderAngleFramesDuringActiveLook];
    if (counters.some((item) => !Number.isFinite(Number(item)) || Number(item) < 0)) return null;
    if (value.lookEventGaps.some((item) => !Number.isFinite(Number(item)) || Number(item) < 0) ||
        value.renderAngleDeltas.some((item) => !Number.isFinite(Number(item)) || Number(item) < 0)) return null;
    return {
      rawLookEvents: Number(value.rawLookEvents),
      lookEventGaps: value.lookEventGaps.map(Number),
      renderAngleDeltas: value.renderAngleDeltas.map(Number),
      repeatedRenderAngleFramesDuringActiveLook: Number(value.repeatedRenderAngleFramesDuringActiveLook),
    };
  } catch (e) {
    return null;
  }
}

function _crPerfReadFinitePeer(functionName, keys) {
  const fn = globalThis[functionName];
  if (typeof fn !== 'function') return null;
  try {
    const value = fn();
    if (!value || typeof value !== 'object') return null;
    const out = {};
    for (const key of keys) {
      const number = Number(value[key]);
      if (!Number.isFinite(number) || number < 0) return null;
      out[key] = number;
    }
    return out;
  } catch (e) {
    return null;
  }
}

function _crPerfReadProjectionStats() {
  return _crPerfReadFinitePeer('crGetProjectionQuantizationStats', [
    'projectedSpriteCount', 'distantSpriteCount', 'projectedWidthSum',
    'fractionalScreenXSum', 'legacySnapCount', 'subpixelMovementCount',
    'repeatedProjectedXFramesWhileMoving'
  ]);
}

function _crPerfReadMotionStats() {
  return _crPerfReadFinitePeer('crGetFarFieldMotionStats', [
    'sampleFrames', 'openAreaFrames', 'distantEdgeJumpTotal',
    'distantEdgeJumpSamples', 'wallColumnsDrawn', 'spriteColumnsDrawn'
  ]);
}

function _crPerfFinite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function _crPerfCounterDelta(current, baseline, key) {
  if (!current) return 0;
  return Math.max(0, _crPerfFinite(current[key]) - _crPerfFinite(baseline && baseline[key]));
}

function crPerfProbeReset() {
  if (!CR_PERF_PROBE) return;
  _crPerf = {
    frameMs: [],
    frameBuckets: _crPerfEmptyBuckets(),
    over33: 0,
    over50: 0,
    drawSceneMs: [],
    minimapMs: [],
    chromeMs: [],
    hudMs: [],
    simulationMs: [],
    simulationTotal: 0,
    simulationCalls: 0,
    simulationWorst: 0,
    stepFrames0: 0,
    stepFrames1: 0,
    stepFrames2: 0,
    stepFrames3Plus: 0,
    fixedStepDrops: 0,
    accumulatorAlphaTotal: 0,
    accumulatorAlphaCount: 0,
    accumulatorAlphaMin: null,
    accumulatorAlphaMax: null,
    alphaTotal: 0,
    alphaCount: 0,
    alphaMin: null,
    alphaMax: null,
    interpolationActive: false,
    interpolatedFrames: 0,
    zeroStepInterpolatedFrames: 0,
    repeatedRenderPoseFrames: 0,
    renderDeltaTotal: 0,
    renderDeltaCount: 0,
    renderDeltaWorst: 0,
    renderDeltaDiscontinuityWorst: 0,
    lastRenderDelta: null,
    lastRenderPose: null,
    lastAuthoritativePose: null,
    lastFrameSteps: 0,
    mobileMenuMs: [],
    mobileMenuTotal: 0,
    mobileMenuCalls: 0,
    mobileLayoutMs: [],
    mobileLayoutTotal: 0,
    mobileLayoutCalls: 0,
    bitmapMs: [],
    bitmapTotal: 0,
    bitmapCalls: 0,
    bitmapHandled: 0,
    bitmapFailureColumns: null,
    framePhases: _crPerfEmptyFramePhases(),
    longFrameGaps: [],
    longFramePhases: Object.fromEntries(CR_PERF_PHASE_KEYS.map((key) => [key, []])),
    spriteCount: 0,
    framesSampled: 0,
  };
  _crPerfMobileBaseline = _crPerfReadMobileStats();
  _crPerfAngleBaseline = _crPerfReadAngleStats();
  _crPerfProjectionBaseline = _crPerfReadProjectionStats();
  _crPerfMotionBaseline = _crPerfReadMotionStats();
  _crPerfLastFrameNow = 0;
  _crPerfLastHudAt = 0;
  _crPerfSnap = null;
}

function _crPerfCap(arr, value, max) {
  const finite = _crPerfFinite(value);
  arr.push(finite);
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
  return { avg: sum / arr.length, p95: _crPerfPct(sorted, 95), worst, n: arr.length };
}

function _crPerfBuildAngleReport(current) {
  const unavailable = {
    rawLookEvents: null,
    lookEventGapMean: null,
    lookEventGapP95: null,
    renderAngleDeltaAverage: null,
    renderAngleDeltaP95: null,
    repeatedRenderAngleFramesDuringActiveLook: null,
    largestRenderAngleJump: null,
  };
  const baseline = _crPerfAngleBaseline;
  if (!current || !baseline || current.rawLookEvents < baseline.rawLookEvents ||
      current.repeatedRenderAngleFramesDuringActiveLook < baseline.repeatedRenderAngleFramesDuringActiveLook ||
      current.lookEventGaps.length < baseline.lookEventGaps.length ||
      current.renderAngleDeltas.length < baseline.renderAngleDeltas.length) return unavailable;
  const gaps = current.lookEventGaps.slice(baseline.lookEventGaps.length).slice(-720);
  const deltas = current.renderAngleDeltas.slice(baseline.renderAngleDeltas.length).slice(-720);
  const gapSummary = _crPerfSummarize(gaps);
  const deltaSummary = _crPerfSummarize(deltas);
  return {
    rawLookEvents: current.rawLookEvents - baseline.rawLookEvents,
    lookEventGapMean: gaps.length ? _crPerfRound(gapSummary.avg, 4) : null,
    lookEventGapP95: gaps.length ? _crPerfRound(gapSummary.p95, 4) : null,
    renderAngleDeltaAverage: deltas.length ? _crPerfRound(deltaSummary.avg, 6) : null,
    renderAngleDeltaP95: deltas.length ? _crPerfRound(deltaSummary.p95, 6) : null,
    repeatedRenderAngleFramesDuringActiveLook:
      current.repeatedRenderAngleFramesDuringActiveLook - baseline.repeatedRenderAngleFramesDuringActiveLook,
    largestRenderAngleJump: deltas.length ? _crPerfRound(deltaSummary.worst, 6) : null,
  };
}

function _crPerfAllMonotonic(current, baseline, keys) {
  return !!current && !!baseline && keys.every((key) => current[key] >= baseline[key]);
}

function _crPerfBuildProjectionReport(current) {
  const unavailable = {
    distantSpriteCount: null,
    meanProjectedWidth: null,
    meanFractionalScreenX: null,
    legacySnapCount: null,
    subpixelMovementCount: null,
    repeatedProjectedXFramesWhileMoving: null,
  };
  const keys = ['projectedSpriteCount', 'distantSpriteCount', 'projectedWidthSum',
    'fractionalScreenXSum', 'legacySnapCount', 'subpixelMovementCount',
    'repeatedProjectedXFramesWhileMoving'];
  const baseline = _crPerfProjectionBaseline;
  if (!_crPerfAllMonotonic(current, baseline, keys)) return unavailable;
  const projected = current.projectedSpriteCount - baseline.projectedSpriteCount;
  return {
    distantSpriteCount: current.distantSpriteCount - baseline.distantSpriteCount,
    meanProjectedWidth: projected ? _crPerfRound(
      (current.projectedWidthSum - baseline.projectedWidthSum) / projected, 6) : null,
    meanFractionalScreenX: projected ? _crPerfRound(
      (current.fractionalScreenXSum - baseline.fractionalScreenXSum) / projected, 6) : null,
    legacySnapCount: current.legacySnapCount - baseline.legacySnapCount,
    subpixelMovementCount: current.subpixelMovementCount - baseline.subpixelMovementCount,
    repeatedProjectedXFramesWhileMoving:
      current.repeatedProjectedXFramesWhileMoving - baseline.repeatedProjectedXFramesWhileMoving,
  };
}

function _crPerfBuildMotionReport(current) {
  const unavailable = {
    wallColumnsPerFrame: null,
    spriteColumnsDrawn: null,
    farFieldSampleFrames: null,
    distantEdgeJumpEstimate: null,
    subpixelUsage: null,
    largeAreaSceneClassification: null,
    largeAreaFrames: null,
  };
  const keys = ['sampleFrames', 'openAreaFrames', 'distantEdgeJumpTotal',
    'distantEdgeJumpSamples', 'wallColumnsDrawn', 'spriteColumnsDrawn'];
  const baseline = _crPerfMotionBaseline;
  if (!_crPerfAllMonotonic(current, baseline, keys)) return unavailable;
  const frames = current.sampleFrames - baseline.sampleFrames;
  const openFrames = current.openAreaFrames - baseline.openAreaFrames;
  const jumpSamples = current.distantEdgeJumpSamples - baseline.distantEdgeJumpSamples;
  const projection = _crPerfBuildProjectionReport(_crPerfReadProjectionStats());
  return {
    wallColumnsPerFrame: frames ? _crPerfRound(
      (current.wallColumnsDrawn - baseline.wallColumnsDrawn) / frames, 4) : null,
    spriteColumnsDrawn: current.spriteColumnsDrawn - baseline.spriteColumnsDrawn,
    farFieldSampleFrames: frames,
    distantEdgeJumpEstimate: jumpSamples ? _crPerfRound(
      (current.distantEdgeJumpTotal - baseline.distantEdgeJumpTotal) / jumpSamples, 6) : null,
    subpixelUsage: projection.subpixelMovementCount,
    largeAreaSceneClassification: frames ?
      (openFrames / frames >= 0.5 ? 'large-open-area' : 'mixed-or-near') : null,
    largeAreaFrames: openFrames,
  };
}

function _crPerfTimeCall(original, receiver, args, sampleArray, totalKey, countKey, phaseKey) {
  const started = performance.now();
  try {
    return original.apply(receiver, args);
  } finally {
    const elapsed = Math.max(0, _crPerfFinite(performance.now() - started));
    _crPerfCap(sampleArray, elapsed, 720);
    if (phaseKey) _crPerfRecordFramePhase(phaseKey, elapsed);
    if (totalKey) _crPerf[totalKey] += elapsed;
    if (countKey) _crPerf[countKey]++;
  }
}

function _crPerfBuildLongFrameCorrelation() {
  const gaps = _crPerfSummarize(_crPerf.longFrameGaps);
  const summarizePhase = (keys) => {
    const values = [];
    for (let i = 0; i < _crPerf.longFrameGaps.length; i++) {
      let total = 0;
      for (const key of keys) total += _crPerfFinite(_crPerf.longFramePhases[key][i]);
      values.push(total);
    }
    const summary = _crPerfSummarize(values);
    return { p95: _crPerfRound(summary.p95), worst: _crPerfRound(summary.worst) };
  };
  return {
    thresholdMs: CR_PERF_LONG_FRAME_THRESHOLD_MS,
    samples: gaps.n,
    gapMs: { p95: _crPerfRound(gaps.p95), worst: _crPerfRound(gaps.worst) },
    precedingPhaseMs: {
      simulation: summarizePhase(['simulation']),
      scene: summarizePhase(['scene']),
      ui: summarizePhase(['minimap', 'chrome', 'hud', 'mobileMenu']),
      bitmap: summarizePhase(['bitmap']),
      mobileLayout: summarizePhase(['mobileLayout']),
    },
  };
}

function _crPerfRecordInterpolation() {
  if (!_crPerf || typeof crGetInterpolatedRenderPose !== 'function') return;
  _crPerf.interpolationActive = true;
  let pose;
  try {
    pose = crGetInterpolatedRenderPose();
  } catch (e) {
    return;
  }
  if (!pose || !Number.isFinite(Number(pose.x)) || !Number.isFinite(Number(pose.y))) return;

  let alpha = Number(pose.alpha);
  if (!Number.isFinite(alpha) && typeof crGetRenderInterpolationAlpha === 'function') {
    try { alpha = Number(crGetRenderInterpolationAlpha()); } catch (e) { alpha = NaN; }
  }
  if (Number.isFinite(alpha)) {
    _crPerf.alphaTotal += alpha;
    _crPerf.alphaCount++;
    _crPerf.alphaMin = _crPerf.alphaMin == null ? alpha : Math.min(_crPerf.alphaMin, alpha);
    _crPerf.alphaMax = _crPerf.alphaMax == null ? alpha : Math.max(_crPerf.alphaMax, alpha);
  }

  if (pose.interpolatedPosition !== true) return;
  _crPerf.interpolatedFrames++;
  const current = { x: Number(pose.x), y: Number(pose.y) };
  const authoritative = {
    x: Number.isFinite(Number(pose.authoritativeX)) ? Number(pose.authoritativeX) : current.x,
    y: Number.isFinite(Number(pose.authoritativeY)) ? Number(pose.authoritativeY) : current.y,
  };
  if (_crPerf.lastRenderPose) {
    const dx = current.x - _crPerf.lastRenderPose.x;
    const dy = current.y - _crPerf.lastRenderPose.y;
    const delta = Math.hypot(dx, dy);
    const authoritativeMoved = !_crPerf.lastAuthoritativePose ||
      Math.hypot(authoritative.x - _crPerf.lastAuthoritativePose.x,
        authoritative.y - _crPerf.lastAuthoritativePose.y) > 1e-9 ||
      Math.hypot(Number(pose.authoritativeX) - Number(pose.previousX),
        Number(pose.authoritativeY) - Number(pose.previousY)) > 1e-9;
    if (authoritativeMoved) {
      if (delta <= 1e-9) _crPerf.repeatedRenderPoseFrames++;
      _crPerf.renderDeltaTotal += delta;
      _crPerf.renderDeltaCount++;
      _crPerf.renderDeltaWorst = Math.max(_crPerf.renderDeltaWorst, delta);
      if (_crPerf.lastRenderDelta != null) {
        _crPerf.renderDeltaDiscontinuityWorst = Math.max(
          _crPerf.renderDeltaDiscontinuityWorst,
          Math.abs(delta - _crPerf.lastRenderDelta)
        );
      }
      _crPerf.lastRenderDelta = delta;
      if (_crPerf.lastFrameSteps === 0 && delta > 1e-9) {
        _crPerf.zeroStepInterpolatedFrames++;
      }
    }
  }
  _crPerf.lastRenderPose = current;
  _crPerf.lastAuthoritativePose = authoritative;
}

function crPerfProbeEnsureInstalled() {
  if (!CR_PERF_PROBE || _crPerfInstalled) return;
  _crPerfInstalled = true;
  crPerfProbeReset();

  if (typeof drawScene === 'function') {
    const original = drawScene;
    drawScene = function () {
      const result = _crPerfTimeCall(original, this, arguments, _crPerf.drawSceneMs, null, null, 'scene');
      try {
        const props = (game.props && game.props.length) || 0;
        const npcs = (game.npcs && game.npcs.filter((n) => !n.helped).length) || 0;
        const cans = (game.pickups && game.pickups.filter((item) => !item.taken).length) || 0;
        _crPerf.spriteCount = props + npcs + cans + (game.exit ? 1 : 0);
      } catch (e) {}
      _crPerfRecordInterpolation();
      return result;
    };
  }
  if (typeof drawMinap === 'function') {
    const original = drawMinap;
    drawMinap = function () {
      return _crPerfTimeCall(original, this, arguments, _crPerf.minimapMs, null, null, 'minimap');
    };
  }
  if (typeof drawPortraitDashboardChrome === 'function') {
    const original = drawPortraitDashboardChrome;
    drawPortraitDashboardChrome = function () {
      return _crPerfTimeCall(original, this, arguments, _crPerf.chromeMs, null, null, 'chrome');
    };
  }
  if (typeof drawHUD === 'function') {
    const original = drawHUD;
    drawHUD = function () {
      return _crPerfTimeCall(original, this, arguments, _crPerf.hudMs, null, null, 'hud');
    };
  }
  if (typeof crStepSimulationFixed === 'function') {
    const original = crStepSimulationFixed;
    crStepSimulationFixed = function () {
      let beforeDrops = null;
      let fixedStepDt = null;
      if (typeof crGetFixedStepState === 'function') {
        try {
          const fixedState = crGetFixedStepState();
          beforeDrops = _crPerfFinite(fixedState.droppedFrames);
          if (Number(fixedState.stepDt) > 0) fixedStepDt = Number(fixedState.stepDt);
        } catch (e) {}
      }
      const started = performance.now();
      let result;
      try {
        result = original.apply(this, arguments);
        return result;
      } finally {
        const elapsed = Math.max(0, _crPerfFinite(performance.now() - started));
        _crPerfCap(_crPerf.simulationMs, elapsed, 720);
        _crPerfRecordFramePhase('simulation', elapsed);
        _crPerf.simulationTotal += elapsed;
        _crPerf.simulationCalls++;
        _crPerf.simulationWorst = Math.max(_crPerf.simulationWorst, elapsed);
        if (result && Number.isFinite(Number(result.steps))) {
          const steps = Math.max(0, Math.floor(Number(result.steps)));
          _crPerf.lastFrameSteps = steps;
          if (steps === 0) _crPerf.stepFrames0++;
          else if (steps === 1) _crPerf.stepFrames1++;
          else if (steps === 2) _crPerf.stepFrames2++;
          else _crPerf.stepFrames3Plus++;
          const afterDrops = _crPerfFinite(result.droppedFrames);
          if (beforeDrops != null) _crPerf.fixedStepDrops += Math.max(0, afterDrops - beforeDrops);
          if (fixedStepDt && Number.isFinite(Number(result.accumulator))) {
            const accumulatorAlpha = Math.max(0, Number(result.accumulator) / fixedStepDt);
            _crPerf.accumulatorAlphaTotal += accumulatorAlpha;
            _crPerf.accumulatorAlphaCount++;
            _crPerf.accumulatorAlphaMin = _crPerf.accumulatorAlphaMin == null ? accumulatorAlpha :
              Math.min(_crPerf.accumulatorAlphaMin, accumulatorAlpha);
            _crPerf.accumulatorAlphaMax = _crPerf.accumulatorAlphaMax == null ? accumulatorAlpha :
              Math.max(_crPerf.accumulatorAlphaMax, accumulatorAlpha);
          }
        }
      }
    };
  }
  if (typeof drawMobileMenu === 'function') {
    const original = drawMobileMenu;
    drawMobileMenu = function () {
      return _crPerfTimeCall(
        original, this, arguments, _crPerf.mobileMenuMs, 'mobileMenuTotal', 'mobileMenuCalls', 'mobileMenu'
      );
    };
  }
  if (typeof applyMobileControlSettings === 'function') {
    const original = applyMobileControlSettings;
    applyMobileControlSettings = function () {
      return _crPerfTimeCall(
        original, this, arguments, _crPerf.mobileLayoutMs, 'mobileLayoutTotal', 'mobileLayoutCalls', 'mobileLayout'
      );
    };
  }
  if (typeof drawWholeFaceBitmapBuildingColumn === 'function') {
    const original = drawWholeFaceBitmapBuildingColumn;
    drawWholeFaceBitmapBuildingColumn = function () {
      const started = performance.now();
      let result;
      try {
        result = original.apply(this, arguments);
        return result;
      } finally {
        const elapsed = Math.max(0, _crPerfFinite(performance.now() - started));
        _crPerfCap(_crPerf.bitmapMs, elapsed, 1440);
        _crPerfRecordFramePhase('bitmap', elapsed);
        _crPerf.bitmapTotal += elapsed;
        _crPerf.bitmapCalls++;
        if (result === true) _crPerf.bitmapHandled++;
      }
    };
  }

  if (globalThis.CR && typeof globalThis.CR === 'object') {
    globalThis.CR.crPerfProbeGetReport = crPerfProbeGetReport;
    globalThis.CR.crPerfProbeReset = crPerfProbeReset;
  }

  const viewEl = document.getElementById('view');
  if (viewEl) {
    viewEl.addEventListener('pointerdown', (event) => {
      if (state !== STATE.PLAY) return;
      const rect = viewEl.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x <= 172 && y <= 156) crPerfProbeReset();
    }, { passive: true });
  }
}

function crPerfProbeFrameStart(now) {
  if (!CR_PERF_PROBE || !_crPerf) return;
  if (_crPerfLastFrameNow > 0 && state === STATE.PLAY && !paused) {
    const gap = now - _crPerfLastFrameNow;
    if (gap > 0 && gap < 500) {
      _crPerfCap(_crPerf.frameMs, gap, 720);
      _crPerf.framesSampled++;
      if (gap > 33) _crPerf.over33++;
      if (gap > 50) _crPerf.over50++;
      _crPerfRecordLongFrameCorrelation(gap);
      if (gap < 9.5) _crPerf.frameBuckets.under9_5++;
      else if (gap < 13.5) _crPerf.frameBuckets.from9_5To13_5++;
      else if (gap < 20) _crPerf.frameBuckets.from13_5To20++;
      else if (gap < 33) _crPerf.frameBuckets.from20To33++;
      else if (gap <= 50) _crPerf.frameBuckets.from33To50++;
      else _crPerf.frameBuckets.over50++;
    }
  }
  _crPerfLastFrameNow = now;
  _crPerf.framePhases = _crPerfEmptyFramePhases();
}

function _crPerfRound(value, digits) {
  const scale = Math.pow(10, digits == null ? 2 : digits);
  return Math.round(_crPerfFinite(value) * scale) / scale;
}

function crPerfProbeRefreshSnap(now, force) {
  if (!CR_PERF_PROBE || !_crPerf) return;
  if (!force && _crPerfLastHudAt && now - _crPerfLastHudAt < 500) return;
  _crPerfLastHudAt = now;

  const frame = _crPerfSummarize(_crPerf.frameMs);
  const scene = _crPerfSummarize(_crPerf.drawSceneMs);
  const minimapSummary = _crPerfSummarize(_crPerf.minimapMs);
  const chromeSummary = _crPerfSummarize(_crPerf.chromeMs);
  const hudSummary = _crPerfSummarize(_crPerf.hudMs);
  const simulation = _crPerfSummarize(_crPerf.simulationMs);
  const mobileMenu = _crPerfSummarize(_crPerf.mobileMenuMs);
  const mobileLayout = _crPerfSummarize(_crPerf.mobileLayoutMs);
  const bitmap = _crPerfSummarize(_crPerf.bitmapMs);
  const longFrame = _crPerfBuildLongFrameCorrelation();
  const mobileStats = _crPerfReadMobileStats();
  const farFieldIdentity = _crPerfReadFarFieldIdentity();
  const angleReport = _crPerfBuildAngleReport(_crPerfReadAngleStats());
  const projectionReport = _crPerfBuildProjectionReport(_crPerfReadProjectionStats());
  const motionReport = _crPerfBuildMotionReport(_crPerfReadMotionStats());

  let district = '?';
  let seed = '?';
  try {
    district = String(game.district != null ? game.district : crGetSelectedStartDistrict());
    seed = String(game.seed != null ? game.seed : '');
  } catch (e) {}
  const mob = typeof mobileMode !== 'undefined' && mobileMode ? 'mob' : 'desk';
  const portrait =
    typeof isMobilePortrait === 'function' && isMobilePortrait() ? 'port' :
      typeof crIsPortraitLayout === 'function' && crIsPortraitLayout() ? 'port' : 'land';
  const externalLayoutFlushes = mobileStats ?
    _crPerfCounterDelta(mobileStats, _crPerfMobileBaseline, 'layoutFlushes') : null;

  _crPerfSnap = {
    BUILD_ID: typeof BUILD_ID !== 'undefined' ? String(BUILD_ID) : '?',
    ffres: farFieldIdentity.ffres,
    ffangle: farFieldIdentity.ffangle,
    ffproj: farFieldIdentity.ffproj,
    internalResolution: farFieldIdentity.internalResolution,
    rawLookEvents: angleReport.rawLookEvents,
    lookEventGapMean: angleReport.lookEventGapMean,
    lookEventGapP95: angleReport.lookEventGapP95,
    renderAngleDeltaAverage: angleReport.renderAngleDeltaAverage,
    renderAngleDeltaP95: angleReport.renderAngleDeltaP95,
    repeatedRenderAngleFramesDuringActiveLook: angleReport.repeatedRenderAngleFramesDuringActiveLook,
    largestRenderAngleJump: angleReport.largestRenderAngleJump,
    wallColumnsPerFrame: motionReport.wallColumnsPerFrame,
    spriteColumnsDrawn: motionReport.spriteColumnsDrawn,
    farFieldSampleFrames: motionReport.farFieldSampleFrames,
    distantEdgeJumpEstimate: motionReport.distantEdgeJumpEstimate,
    subpixelUsage: motionReport.subpixelUsage,
    largeAreaSceneClassification: motionReport.largeAreaSceneClassification,
    largeAreaFrames: motionReport.largeAreaFrames,
    projection: projectionReport,
    fps: _crPerfRound(frame.avg > 0 ? 1000 / frame.avg : 0, 1),
    frameAvg: _crPerfRound(frame.avg),
    frameP95: _crPerfRound(frame.p95),
    frameWorst: _crPerfRound(frame.worst),
    over33: _crPerf.over33,
    over50: _crPerf.over50,
    simulationTotal: _crPerfRound(_crPerf.simulationTotal),
    simulationAvg: _crPerfRound(_crPerf.simulationCalls ? _crPerf.simulationTotal / _crPerf.simulationCalls : 0),
    simulationP95: _crPerfRound(simulation.p95),
    simulationWorst: _crPerfRound(_crPerf.simulationWorst),
    stepFrames0: _crPerf.stepFrames0,
    stepFrames1: _crPerf.stepFrames1,
    stepFrames2: _crPerf.stepFrames2,
    stepFrames3Plus: _crPerf.stepFrames3Plus,
    fixedStepDrops: _crPerf.fixedStepDrops,
    accumulatorAlphaAvg: _crPerfRound(_crPerf.accumulatorAlphaCount ?
      _crPerf.accumulatorAlphaTotal / _crPerf.accumulatorAlphaCount : 0, 4),
    accumulatorAlphaMin: _crPerf.accumulatorAlphaMin == null ? 0 :
      _crPerfRound(_crPerf.accumulatorAlphaMin, 4),
    accumulatorAlphaMax: _crPerf.accumulatorAlphaMax == null ? 0 :
      _crPerfRound(_crPerf.accumulatorAlphaMax, 4),
    interpolationActive: _crPerf.interpolationActive ||
      (typeof crGetInterpolatedRenderPose === 'function' &&
        typeof crGetRenderInterpolationAlpha === 'function'),
    interpolationAlphaAvg: _crPerfRound(_crPerf.alphaCount ? _crPerf.alphaTotal / _crPerf.alphaCount : 0, 4),
    interpolationAlphaMin: _crPerf.alphaMin == null ? 0 : _crPerfRound(_crPerf.alphaMin, 4),
    interpolationAlphaMax: _crPerf.alphaMax == null ? 0 : _crPerfRound(_crPerf.alphaMax, 4),
    interpolatedFrames: _crPerf.interpolatedFrames,
    zeroStepInterpolatedFrames: _crPerf.zeroStepInterpolatedFrames,
    repeatedRenderPoseFrames: _crPerf.repeatedRenderPoseFrames,
    renderDeltaAvg: _crPerfRound(_crPerf.renderDeltaCount ? _crPerf.renderDeltaTotal / _crPerf.renderDeltaCount : 0, 4),
    renderDeltaWorst: _crPerfRound(_crPerf.renderDeltaWorst, 4),
    renderDeltaDiscontinuityWorst: _crPerfRound(_crPerf.renderDeltaDiscontinuityWorst, 4),
    drawScene: _crPerfRound(scene.avg),
    minimap: _crPerfRound(minimapSummary.avg),
    chrome: _crPerfRound(chromeSummary.avg),
    hud: _crPerfRound(hudSummary.avg),
    mobileMenuTotal: _crPerfRound(_crPerf.mobileMenuTotal),
    mobileMenuAvg: _crPerfRound(_crPerf.mobileMenuCalls ? _crPerf.mobileMenuTotal / _crPerf.mobileMenuCalls : mobileMenu.avg),
    mobileMenuCalls: _crPerf.mobileMenuCalls,
    drawMobileMenuCalls: _crPerf.mobileMenuCalls,
    mobileMenuDomWorkCalls: _crPerfCounterDelta(mobileStats, _crPerfMobileBaseline, 'uiFlushes'),
    mobileLayoutTotal: _crPerfRound(_crPerf.mobileLayoutTotal),
    mobileLayoutAvg: _crPerfRound(_crPerf.mobileLayoutCalls ? _crPerf.mobileLayoutTotal / _crPerf.mobileLayoutCalls : mobileLayout.avg),
    applyMobileControlSettingsCalls: _crPerf.mobileLayoutCalls,
    mobileLayoutFlushes: externalLayoutFlushes == null ? _crPerf.mobileLayoutCalls : externalLayoutFlushes,
    mobileStableEarlyOuts: _crPerfCounterDelta(mobileStats, _crPerfMobileBaseline, 'stableEarlyOuts'),
    safeAreaReads: _crPerfCounterDelta(mobileStats, _crPerfMobileBaseline, 'safeAreaReads'),
    overrideStorageReads: _crPerfCounterDelta(mobileStats, _crPerfMobileBaseline, 'overrideStorageReads'),
    bitmapTotal: _crPerfRound(_crPerf.bitmapTotal),
    bitmapAvg: _crPerfRound(_crPerf.bitmapCalls ? _crPerf.bitmapTotal / _crPerf.bitmapCalls : 0),
    bitmapP95: _crPerfRound(bitmap.p95),
    bitmapColumns: _crPerf.bitmapHandled,
    bitmapCalls: _crPerf.bitmapCalls,
    bitmapHandledCalls: _crPerf.bitmapHandled,
    bitmapFailureColumns: _crPerf.bitmapFailureColumns,
    longFrame,
    frameBuckets: Object.assign({}, _crPerf.frameBuckets),
    sprites: _crPerf.spriteCount,
    district,
    seed,
    canvas: typeof view !== 'undefined' && view ? view.width + 'x' + view.height : '?',
    css: typeof view !== 'undefined' && view ? Math.round(view.clientWidth) + 'x' + Math.round(view.clientHeight) : '?',
    dpr: _crPerfRound(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 2),
    layout: mob + '/' + portrait,
    frameSamples: _crPerf.frameMs.length,
    framesSampled: _crPerf.framesSampled,
  };
}

function crPerfProbeDrawOverlay(ctx, now) {
  if (!CR_PERF_PROBE || !_crPerf) return;
  crPerfProbeRefreshSnap(now, false);
  if (!_crPerfSnap) return;
  const s = _crPerfSnap;
  const buckets = s.frameBuckets;
  const lines = [
    'perf ' + s.BUILD_ID,
    'fps ' + s.fps + ' a/p/w ' + s.frameAvg + '/' + s.frameP95 + '/' + s.frameWorst,
    '>33/50 ' + s.over33 + '/' + s.over50,
    'sim a/p/w ' + s.simulationAvg + '/' + s.simulationP95 + '/' + s.simulationWorst,
    'steps 0/1/2/3+ ' + s.stepFrames0 + '/' + s.stepFrames1 + '/' + s.stepFrames2 + '/' + s.stepFrames3Plus,
    'drops ' + s.fixedStepDrops + ' alpha ' + s.interpolationAlphaAvg,
    'interp ' + (s.interpolationActive ? 'on ' : 'off ') + s.interpolatedFrames + ' z ' + s.zeroStepInterpolatedFrames,
    'repeat ' + s.repeatedRenderPoseFrames + ' d ' + s.renderDeltaAvg + '/' + s.renderDeltaWorst,
    'scene/map ' + s.drawScene + '/' + s.minimap + ' hud ' + s.hud,
    'mobile ' + s.mobileMenuAvg + '/' + s.mobileLayoutAvg + ' f/e ' + s.mobileLayoutFlushes + '/' + s.mobileStableEarlyOuts,
    'bitmap ' + s.bitmapAvg + '/' + s.bitmapP95 + ' n ' + s.bitmapColumns,
    'lf n/g ' + s.longFrame.samples + ' ' + s.longFrame.gapMs.p95 + '/' + s.longFrame.gapMs.worst + ' (CR report p/w)',
    'bkt ' + buckets.under9_5 + '/' + buckets.from9_5To13_5 + '/' + buckets.from13_5To20 + '/' + buckets.from20To33 + '/' + buckets.from33To50 + '/' + buckets.over50,
    'spr ' + s.sprites + ' D' + s.district + ' seed ' + s.seed,
    s.canvas + ' css ' + s.css + ' dpr ' + s.dpr,
    s.layout + ' tap TL reset',
  ];
  // The additional LOOK line needs 188px of internal height including padding.
  // Keep the compact 320x180 overlay unchanged.
  const roomForLongFrameDetail = typeof view !== 'undefined' && view && Number(view.height) >= 200;
  if (roomForLongFrameDetail) {
    lines.splice(13, 0,
      'look n/g ' + (s.rawLookEvents == null ? '?' : s.rawLookEvents) + '/' +
        (s.lookEventGapP95 == null ? '?' : s.lookEventGapP95) + ' d ' +
        (s.renderAngleDeltaP95 == null ? '?' : s.renderAngleDeltaP95) + '/' +
        (s.largestRenderAngleJump == null ? '?' : s.largestRenderAngleJump) + ' r ' +
        (s.repeatedRenderAngleFramesDuringActiveLook == null ? '?' : s.repeatedRenderAngleFramesDuringActiveLook),
      'lf p/w S' + s.longFrame.precedingPhaseMs.simulation.p95 + '/' + s.longFrame.precedingPhaseMs.simulation.worst +
      ' R' + s.longFrame.precedingPhaseMs.scene.p95 + '/' + s.longFrame.precedingPhaseMs.scene.worst +
      ' U' + s.longFrame.precedingPhaseMs.ui.p95 + '/' + s.longFrame.precedingPhaseMs.ui.worst
    );
  }
  const pad = 4;
  const lineHeight = 10;
  const width = roomForLongFrameDetail ? 202 : 168;
  const height = pad * 2 + lines.length * lineHeight;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  ctx.fillRect(pad, pad, width, height);
  ctx.font = '8px monospace';
  ctx.fillStyle = '#8fdc8f';
  ctx.textBaseline = 'top';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], pad + 4, pad + 4 + i * lineHeight);
  ctx.restore();
}

function crPerfProbeGetReport() {
  if (!CR_PERF_PROBE || !_crPerf) return null;
  crPerfProbeRefreshSnap(performance.now(), true);
  return Object.assign({}, _crPerfSnap, { frameBuckets: Object.assign({}, _crPerfSnap.frameBuckets) });
}

if (CR_PERF_PROBE && new URLSearchParams(location.search).has('perfreset')) crPerfProbeReset();
