// -----------------------------------------------------------------------
// FAR-FIELD LAB — RENDER-ONLY ANGLE MODES
// -----------------------------------------------------------------------
// Exponential smoothing time constant. This is a Lane-B behavior constant:
// changing it after acceptance requires a new interface/behavior review.
const CR_RENDER_ANGLE_SMOOTH_TAU_SECONDS = 0.045;
const CR_RENDER_ANGLE_MAX_DT_SECONDS = 0.1;
const CR_RENDER_ANGLE_SAMPLE_CAP = 512;
const CR_RENDER_ANGLE_MODES = Object.freeze(['raw', 'interp', 'smooth']);

function crNormalizeRenderAngle(value){
  const angle = Number(value);
  if(!Number.isFinite(angle)) return 0;
  const twoPi = Math.PI * 2;
  return ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
}

function crShortestAngleDelta(from, to){
  return ((to - from + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

function crResolveRenderAngleMode(params){
  let query = params;
  if(!query || typeof query.get !== 'function'){
    try {
      const search = typeof location !== 'undefined' && location ? location.search : '';
      query = new URLSearchParams(search || '');
    } catch(_e){
      return 'interp';
    }
  }
  let value;
  try { value = query.get('ffangle'); } catch(_e){ return 'interp'; }
  return CR_RENDER_ANGLE_MODES.indexOf(value) >= 0 ? value : 'interp';
}

const _crSelectedRenderAngleMode = crResolveRenderAngleMode();
let _crRenderAngleResetCount = 0;
let _crRenderAngleSmoothed = 0;
let _crRenderAngleLastNow = null;
let _crRenderAnglePendingAuthorityAt = null;
let _crRenderAngleLastRendered = null;
let _crRenderAngleStats = null;

function crRenderAngleProfilerActive(){
  try { return typeof CR_PERF_PROBE !== 'undefined' && !!CR_PERF_PROBE; } catch(_e){ return false; }
}

function crRenderAngleNowMs(){
  try {
    if(typeof performance !== 'undefined' && performance && typeof performance.now === 'function'){
      const now = Number(performance.now());
      if(Number.isFinite(now)) return now;
    }
  } catch(_e){}
  return null;
}

function crClearRenderAngleStats(){
  _crRenderAngleStats = {
    rawSamples: 0, interpolatedSamples: 0, smoothedSamples: 0,
    authoritativeChanges: 0, renderedResponses: 0,
    inputToAuthoritySamples: 0, inputToAuthorityLatencyTotalMs: 0, inputToAuthorityLatencyMaxMs: 0,
    authorityToRenderSamples: 0, authorityToRenderLatencyTotalMs: 0, authorityToRenderLatencyMaxMs: 0,
    authoritativeAngles: [], authoritativeTimestamps: [],
    renderedAngles: [], renderTimestamps: [],
  };
  _crRenderAnglePendingAuthorityAt = null;
  _crRenderAngleLastRendered = null;
}

function crPushBoundedAngleSample(angles, timestamps, angle, timestamp){
  angles.push(angle);
  timestamps.push(timestamp);
  if(angles.length > CR_RENDER_ANGLE_SAMPLE_CAP){
    const excess = angles.length - CR_RENDER_ANGLE_SAMPLE_CAP;
    angles.splice(0, excess);
    timestamps.splice(0, excess);
  }
}

function crRecordRenderedAngle(angle, sampleKind){
  if(!crRenderAngleProfilerActive() || !_crRenderAngleStats) return;
  if(sampleKind === 'raw') _crRenderAngleStats.rawSamples++;
  else if(sampleKind === 'interp') _crRenderAngleStats.interpolatedSamples++;
  else if(sampleKind === 'smooth') _crRenderAngleStats.smoothedSamples++;
  const normalized = crNormalizeRenderAngle(angle);
  const sampledNow = crRenderAngleNowMs();
  const renderTimestamp = sampledNow === null ? 0 : sampledNow;
  crPushBoundedAngleSample(_crRenderAngleStats.renderedAngles, _crRenderAngleStats.renderTimestamps, normalized, renderTimestamp);
  const moved = _crRenderAngleLastRendered === null || Math.abs(crShortestAngleDelta(_crRenderAngleLastRendered, normalized)) > 1e-12;
  if(moved && _crRenderAnglePendingAuthorityAt !== null){
    const latency = Math.max(0, renderTimestamp - _crRenderAnglePendingAuthorityAt);
    _crRenderAngleStats.renderedResponses++;
    _crRenderAngleStats.authorityToRenderSamples++;
    _crRenderAngleStats.authorityToRenderLatencyTotalMs += latency;
    _crRenderAngleStats.authorityToRenderLatencyMaxMs = Math.max(_crRenderAngleStats.authorityToRenderLatencyMaxMs, latency);
    _crRenderAnglePendingAuthorityAt = null;
  }
  _crRenderAngleLastRendered = normalized;
}

function crRecordAuthoritativeAngleChange(eventTimestamp, appliedTimestamp, before, after){
  if(!crRenderAngleProfilerActive() || !_crRenderAngleStats) return;
  const delta = crShortestAngleDelta(crNormalizeRenderAngle(before), crNormalizeRenderAngle(after));
  if(!Number.isFinite(delta) || Math.abs(delta) <= 1e-12) return;
  const applied = Number(appliedTimestamp);
  const eventAt = Number(eventTimestamp);
  const safeApplied = Number.isFinite(applied) ? applied : (crRenderAngleNowMs() || 0);
  const latency = Number.isFinite(eventAt) ? Math.max(0, safeApplied - eventAt) : 0;
  const authoritativeAngle = crNormalizeRenderAngle(after);
  crPushBoundedAngleSample(_crRenderAngleStats.authoritativeAngles, _crRenderAngleStats.authoritativeTimestamps, authoritativeAngle, safeApplied);
  _crRenderAngleStats.authoritativeChanges++;
  _crRenderAngleStats.inputToAuthoritySamples++;
  _crRenderAngleStats.inputToAuthorityLatencyTotalMs += latency;
  _crRenderAngleStats.inputToAuthorityLatencyMaxMs = Math.max(_crRenderAngleStats.inputToAuthorityLatencyMaxMs, latency);
  _crRenderAnglePendingAuthorityAt = safeApplied;
}

function crGetRenderAngleStats(){
  const stats = _crRenderAngleStats || {};
  const inputCount = Number(stats.inputToAuthoritySamples) || 0;
  const renderCount = Number(stats.authorityToRenderSamples) || 0;
  return Object.freeze({
    mode: crGetSelectedRenderAngleMode(),
    tauSeconds: CR_RENDER_ANGLE_SMOOTH_TAU_SECONDS,
    resetCount: _crRenderAngleResetCount,
    rawSamples: Number(stats.rawSamples) || 0,
    interpolatedSamples: Number(stats.interpolatedSamples) || 0,
    smoothedSamples: Number(stats.smoothedSamples) || 0,
    authoritativeChanges: Number(stats.authoritativeChanges) || 0,
    renderedResponses: Number(stats.renderedResponses) || 0,
    inputToAuthoritySamples: inputCount,
    inputToAuthorityLatencyMeanMs: inputCount ? stats.inputToAuthorityLatencyTotalMs / inputCount : null,
    inputToAuthorityLatencyMaxMs: Number(stats.inputToAuthorityLatencyMaxMs) || 0,
    authorityToRenderSamples: renderCount,
    authorityToRenderLatencyMeanMs: renderCount ? stats.authorityToRenderLatencyTotalMs / renderCount : null,
    authorityToRenderLatencyMaxMs: Number(stats.authorityToRenderLatencyMaxMs) || 0,
    authoritativeAngles: Object.freeze((stats.authoritativeAngles || []).slice()),
    authoritativeTimestamps: Object.freeze((stats.authoritativeTimestamps || []).slice()),
    renderedAngles: Object.freeze((stats.renderedAngles || []).slice()),
    renderTimestamps: Object.freeze((stats.renderTimestamps || []).slice()),
  });
}

function crReadAuthoritativeAngle(){
  try {
    if(typeof player !== 'undefined' && player && Number.isFinite(player.angle)) return crNormalizeRenderAngle(player.angle);
  } catch(_e){}
  return Number.isFinite(_crRenderAngleSmoothed) ? crNormalizeRenderAngle(_crRenderAngleSmoothed) : 0;
}

function crGetSelectedRenderAngleMode(){ return _crSelectedRenderAngleMode; }
function crGetRawRenderAngle(){
  const angle = crReadAuthoritativeAngle();
  crRecordRenderedAngle(angle, 'raw');
  return angle;
}

function crGetInterpolatedRenderAngle(){
  const raw = crReadAuthoritativeAngle();
  let previous = raw;
  let current = raw;
  let alpha = 0;
  try {
    if(typeof crRenderPosePrevious !== 'undefined' && crRenderPosePrevious && Number.isFinite(crRenderPosePrevious.angle)){
      previous = crNormalizeRenderAngle(crRenderPosePrevious.angle);
    }
    if(typeof crRenderPoseCurrent !== 'undefined' && crRenderPoseCurrent && Number.isFinite(crRenderPoseCurrent.angle)){
      current = crNormalizeRenderAngle(crRenderPoseCurrent.angle);
    }
    if(typeof crGetRenderInterpolationAlpha === 'function') alpha = Number(crGetRenderInterpolationAlpha());
  } catch(_e){ return raw; }
  if(!Number.isFinite(alpha)) alpha = 0;
  alpha = Math.max(0, Math.min(1, alpha));
  const angle = crNormalizeRenderAngle(previous + crShortestAngleDelta(previous, current) * alpha);
  crRecordRenderedAngle(angle, 'interp');
  return angle;
}

function crGetSmoothedRenderAngle(){
  const raw = crReadAuthoritativeAngle();
  const now = crRenderAngleNowMs();
  let dt = 1 / 60;
  if(now !== null && _crRenderAngleLastNow !== null) dt = (now - _crRenderAngleLastNow) / 1000;
  if(!Number.isFinite(dt) || dt < 0) dt = 0;
  dt = Math.max(0, Math.min(CR_RENDER_ANGLE_MAX_DT_SECONDS, dt));
  _crRenderAngleLastNow = now;
  const delta = crShortestAngleDelta(_crRenderAngleSmoothed, raw);
  if(!Number.isFinite(delta)){
    crResetRenderAngleHistory('non-finite-sample');
    return _crRenderAngleSmoothed;
  }
  if(Math.abs(delta) <= 1e-12){
    _crRenderAngleSmoothed = raw;
  } else if(dt > 0){
    const k = 1 - Math.exp(-dt / CR_RENDER_ANGLE_SMOOTH_TAU_SECONDS);
    _crRenderAngleSmoothed = crNormalizeRenderAngle(_crRenderAngleSmoothed + delta * k);
  }
  crRecordRenderedAngle(_crRenderAngleSmoothed, 'smooth');
  return _crRenderAngleSmoothed;
}

function crResetRenderAngleHistory(reason){
  const angle = crReadAuthoritativeAngle();
  _crRenderAngleSmoothed = angle;
  _crRenderAngleLastNow = null;
  _crRenderAngleResetCount++;
  crClearRenderAngleStats();
  try {
    if(typeof crResetRawTouchLookStats === 'function') crResetRawTouchLookStats();
  } catch(_e){}
  return Object.freeze({
    reason: typeof reason === 'string' && reason.length ? reason : 'unspecified',
    angle,
    resetCount: _crRenderAngleResetCount,
  });
}

crResetRenderAngleHistory('initialization');
