'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const anglePath = path.join(root, 'src/js/game-20a-render-angle-smoothing.js');
assert(fs.existsSync(anglePath), 'angle smoothing module must exist');
const angleSource = fs.readFileSync(anglePath, 'utf8');
const touchPath = path.join(root, 'src/js/game-06-section-2b-mobile-touch-input.js');
const touchSource = fs.readFileSync(touchPath, 'utf8');
const menuPath = path.join(root, 'src/js/game-07-section-2c-responsive-mobile-menu-html-overlay.js');
const menuSource = fs.readFileSync(menuPath, 'utf8');

function extractFunction(source, name){
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist in runtime source`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for(let i = bodyStart; i < source.length; i++){
    const ch = source[i];
    if(quote){
      if(escaped) escaped = false;
      else if(ch === '\\') escaped = true;
      else if(ch === quote) quote = null;
      continue;
    }
    if(ch === "'" || ch === '"' || ch === '`'){ quote = ch; continue; }
    if(ch === '{') depth++;
    else if(ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  assert.fail(`${name} must have a complete function body`);
}

function runtime(search = '', overrides = {}) {
  let now = 0;
  const sandbox = {
    Math, Number, Object, String, URLSearchParams,
    location: { search },
    player: { x: 3, y: 4, angle: 0.75 },
    performance: { now: () => now },
    CR_PERF_PROBE: true,
    crGetRenderInterpolationAlpha: () => 0.5,
    crRenderPosePrevious: { angle: 0.5 },
    crRenderPoseCurrent: { angle: 1.0 },
    ...overrides,
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${angleSource}\n;globalThis.__angleApi={crGetRawRenderAngle,crGetInterpolatedRenderAngle,crGetSmoothedRenderAngle,crGetSelectedRenderAngleMode,crResetRenderAngleHistory,crGetRenderAngleStats,crGetRenderAngleCadenceStats,crResetRenderAngleCadenceStats,crRecordAuthoritativeAngleChange};`, sandbox, { filename: anglePath });
  sandbox.api = sandbox.__angleApi;
  sandbox.setNow = value => { now = value; };
  return sandbox;
}

for (const [search, expected] of [
  ['', 'interp'], ['?ffangle=raw', 'raw'], ['?ffangle=interp', 'interp'], ['?ffangle=smooth', 'smooth'],
  ['?ffangle=SMOOTH', 'interp'], ['?ffangle=smooth%20', 'interp'], ['?ffangle=', 'interp'],
  ['?ffangle=unknown', 'interp'], ['?ffangle=interp&ffangle=smooth', 'interp'],
]) {
  assert.strictEqual(runtime(search).api.crGetSelectedRenderAngleMode(), expected, `strict mode query ${search}`);
}

{
  const r = runtime('?ffangle=raw');
  assert.strictEqual(r.api.crGetRawRenderAngle(), 0.75, 'raw mode preserves authoritative value');
  const before = JSON.stringify(r.player);
  r.api.crGetRawRenderAngle();
  assert.strictEqual(JSON.stringify(r.player), before, 'raw getter does not mutate authority');
  r.player.angle = Infinity;
  assert(Number.isFinite(r.api.crGetRawRenderAngle()), 'raw fallback is finite when authority is non-finite');
}

// SNC-PERF-015: cadence adapter is a read-only bridge from the real touch
// sample shape and render-angle history, not a perf-probe-only mock.
{
  const sectionEnd = touchSource.indexOf('let lookHintUsed = false;');
  assert(sectionEnd > 0, 'touch LOOK core is extractable for cadence integration');
  const touchCore = touchSource.slice(0, sectionEnd);
  let now = 0;
  const sandbox = {
    Math, Number, Object, String, URLSearchParams,
    location: { search: '?perfprobe=1', protocol: 'https:' },
    CR_PERF_PROBE: true,
    STATE: { PLAY: 'play' }, state: 'play', paused: false,
    player: { angle: 0 },
    performance: { now: () => now },
    mobileLookSens: () => 1,
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${touchCore}\n${angleSource}\n;globalThis.__cadenceApi={crApplyRawTouchLookDelta,crApplyPendingInputActions,crGetRenderAngleCadenceStats,crResetRenderAngleCadenceStats,crGetRawRenderAngle};`, sandbox, { filename: 'actual-cadence-sources.js' });
  const api = sandbox.__cadenceApi;
  api.crGetRawRenderAngle();
  for(const [eventAt, renderAt] of [[10, 16], [30, 33], [50, 50]]){
    now = eventAt;
    api.crApplyRawTouchLookDelta(0.1, eventAt);
    api.crApplyPendingInputActions();
    now = renderAt;
    api.crGetRawRenderAngle();
  }
  now = 60;
  api.crGetRawRenderAngle();
  const before = JSON.stringify(sandbox.player);
  const cadence = api.crGetRenderAngleCadenceStats();
  assert(Object.isFrozen(cadence), 'cadence adapter snapshot is frozen');
  assert.strictEqual(cadence.rawLookEvents, 3, 'cadence adapter reads real raw LOOK count');
  assert.deepStrictEqual(Array.from(cadence.lookEventGaps), [20, 20], 'cadence adapter preserves real touch-event gaps');
  assert.strictEqual(cadence.renderAngleDeltas.length, 4, 'cadence adapter derives every rendered-angle transition');
  assert(Math.abs(cadence.renderAngleDeltas[0] - 0.1) < 1e-12, 'cadence adapter derives rendered angle deltas');
  assert.strictEqual(cadence.renderAngleDeltas[3], 0, 'cadence adapter retains repeated rendered-angle frames');
  assert.strictEqual(cadence.repeatedRenderAngleFramesDuringActiveLook, 1, 'cadence adapter counts a repeated frame during active LOOK');
  assert.strictEqual(JSON.stringify(sandbox.player), before, 'cadence reads never mutate gameplay authority');
  api.crResetRenderAngleCadenceStats();
  const cleared = api.crGetRenderAngleCadenceStats();
  assert.strictEqual(cleared.rawLookEvents, 0, 'cadence reset clears raw LOOK history');
  assert.deepStrictEqual(Array.from(cleared.renderAngleDeltas), [], 'cadence reset clears rendered-angle history');
  assert.strictEqual(JSON.stringify(sandbox.player), before, 'cadence reset never changes gameplay authority');
}

{
  const r = runtime('?ffangle=interp');
  assert.strictEqual(r.api.crGetInterpolatedRenderAngle(), 0.75, 'midpoint interpolation uses simulation samples');
  r.crRenderPosePrevious.angle = Math.PI - 0.1;
  r.crRenderPoseCurrent.angle = -Math.PI + 0.1;
  const wrapped = r.api.crGetInterpolatedRenderAngle();
  assert(Math.abs(Math.abs(wrapped) - Math.PI) < 1e-10, 'interpolation takes shortest arc across wrap');
  assert(Math.abs(wrapped) > 3, 'interpolation never travels through zero on wrap');

  r.crGetRenderInterpolationAlpha = () => 0;
  assert(Math.abs(r.api.crGetInterpolatedRenderAngle() - (Math.PI - 0.1)) < 1e-10, 'alpha zero returns previous sample');
  r.crGetRenderInterpolationAlpha = () => 1;
  assert(Math.abs(r.api.crGetInterpolatedRenderAngle() - (-Math.PI + 0.1)) < 1e-10, 'alpha one returns current sample');
}

for (const hz of [60, 90, 120, 144]) {
  const r = runtime('?ffangle=interp');
  const before = JSON.stringify(r.player);
  for (let frame = 0; frame < hz; frame++) {
    r.crRenderPosePrevious.angle = frame * 0.01;
    r.crRenderPoseCurrent.angle = (frame + 1) * 0.01;
    r.crGetRenderInterpolationAlpha = () => (frame % 7) / 7;
    assert(Number.isFinite(r.api.crGetInterpolatedRenderAngle()), `${hz} Hz interpolation remains finite`);
  }
  assert.strictEqual(JSON.stringify(r.player), before, `${hz} Hz interpolation does not mutate gameplay authority`);
}

function runSmoothCadence(hz, seconds, target){
  const r = runtime('?ffangle=smooth');
  r.player.angle = 0;
  r.api.crResetRenderAngleHistory('cadence-start');
  r.setNow(0);
  r.api.crGetSmoothedRenderAngle();
  r.player.angle = target;
  let previous = 0;
  for(let frame = 1; frame <= Math.round(hz * seconds); frame++){
    r.setNow(frame * 1000 / hz);
    const value = r.api.crGetSmoothedRenderAngle();
    assert(Number.isFinite(value), `${hz} Hz smooth remains finite`);
    assert(value + 1e-12 >= previous && value <= target + 1e-12, `${hz} Hz smooth is monotonic and cannot overshoot`);
    previous = value;
  }
  return { r, value: previous };
}

{
  const finals = [60, 90, 120, 144].map(hz => runSmoothCadence(hz, 0.5, 1).value);
  assert(Math.max(...finals) - Math.min(...finals) < 1e-10, 'exponential smoothing is frame-rate independent');
  assert(finals[0] > 0.999, 'smooth converges without visible unbounded trail');
}

{
  const r = runtime('?ffangle=smooth');
  r.player.angle = 0;
  r.api.crResetRenderAngleHistory('turn-in-place');
  r.player.angle = 1;
  r.setNow(1000 / 120);
  const first = r.api.crGetSmoothedRenderAngle();
  assert(first > 0 && first < 1, 'smooth response begins on first rendered frame without overshoot');
  r.setNow(2000 / 120);
  const second = r.api.crGetSmoothedRenderAngle();
  assert(second > first && second < 1, 'continued turning advances monotonically');
  r.player.angle = -1;
  r.setNow(3000 / 120);
  const reversed = r.api.crGetSmoothedRenderAngle();
  assert(reversed < second && reversed > -1, 'direction reversal responds immediately without overshoot');

  for(const reason of ['visibility-hidden','visibility-restored','load','restart','level-transition','teleport','fixed-step-drop']){
    r.player.angle += 0.07;
    const record = r.api.crResetRenderAngleHistory(reason);
    assert(Object.isFrozen(record), `${reason} reset record is frozen`);
    assert.strictEqual(record.reason, reason, `${reason} reset reason preserved`);
    assert.strictEqual(record.angle, r.api.crGetSmoothedRenderAngle(), `${reason} reset snaps smoothing to authority`);
  }
}

{
  const r = runtime('?ffangle=smooth');
  r.player.angle = Math.PI - 0.05;
  r.api.crResetRenderAngleHistory('wrap');
  r.player.angle = -Math.PI + 0.05;
  r.setNow(16);
  const value = r.api.crGetSmoothedRenderAngle();
  assert(Math.abs(value) > 3, 'smooth uses shortest arc at wrap');
  const wrapDistance = Math.abs(((r.player.angle - value + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
  assert(wrapDistance < 0.1, 'wrap response remains on bounded short arc');
  const settled = r.api.crResetRenderAngleHistory('stationary');
  for(let i=0;i<120;i++){
    r.setNow(32 + i * 1000 / 144);
    assert.strictEqual(r.api.crGetSmoothedRenderAngle(), settled.angle, 'stationary target never drifts');
  }
  r.player.angle = NaN;
  r.setNow(2000);
  assert(Number.isFinite(r.api.crGetSmoothedRenderAngle()), 'non-finite authority never escapes smoothing API');
}

{
  const r = runtime('?ffangle=smooth');
  const gameplay = { x: r.player.x, y: r.player.y, savedAngle: r.player.angle, collisionHeading: r.player.angle };
  r.api.crGetSmoothedRenderAngle(); // move without look
  r.player.x += 1; r.player.y += 2;
  r.api.crGetSmoothedRenderAngle(); // movement remains outside render-angle authority
  assert.strictEqual(r.player.angle, gameplay.savedAngle, 'move without look cannot drift authoritative angle');
  r.player.angle = 0.5;
  r.setNow(8);
  r.api.crRecordAuthoritativeAngleChange(0, 8, gameplay.savedAngle, r.player.angle);
  r.setNow(16);
  r.api.crGetSmoothedRenderAngle();
  const stats = r.api.crGetRenderAngleStats();
  assert(Object.isFrozen(stats), 'angle stats snapshot is frozen');
  assert.strictEqual(stats.authoritativeChanges, 1, 'authoritative response counter records touch application');
  assert.strictEqual(stats.inputToAuthorityLatencyMaxMs, 8, 'input-to-authority latency is measured from event time');
  assert.strictEqual(stats.renderedResponses, 1, 'render response counter records first changed render angle');
  assert.deepStrictEqual(Array.from(stats.authoritativeAngles), [0.5], 'authoritative angle samples remain separate from render samples');
  assert.deepStrictEqual(Array.from(stats.authoritativeTimestamps), [8], 'authoritative samples retain their application timestamps');
  assert(stats.renderedAngles.length >= 1 && stats.renderedAngles.every(Number.isFinite), 'rendered angle samples are finite and separately exposed');
  assert.strictEqual(stats.renderedAngles.length, stats.renderTimestamps.length, 'every rendered angle has an event timestamp');
  assert(stats.authorityToRenderLatencyMaxMs <= 1000 / 60, 'authoritative-to-render response stays within one rendered frame');
  const reset = r.api.crResetRenderAngleHistory('latency-reset');
  const cleared = r.api.crGetRenderAngleStats();
  assert.strictEqual(cleared.authoritativeChanges, 0, 'history reset clears response counters');
  assert.strictEqual(cleared.authorityToRenderSamples, 0, 'history reset clears latency counters');
  assert.strictEqual(reset.angle, r.player.angle, 'reset preserves save/collision angle authority');
}

{
  const r = runtime('?ffangle=raw');
  r.api.crResetRenderAngleHistory('bounded-telemetry');
  for(let i = 0; i < 600; i++){
    r.player.angle = i * 0.001;
    r.setNow(i);
    r.api.crRecordAuthoritativeAngleChange(i, i, r.player.angle - 0.001, r.player.angle);
    r.api.crGetRawRenderAngle();
  }
  const stats = r.api.crGetRenderAngleStats();
  assert.strictEqual(stats.authoritativeAngles.length, 512, 'authoritative sample telemetry is bounded');
  assert.strictEqual(stats.authoritativeTimestamps.length, 512, 'authoritative timestamps remain paired and bounded');
  assert.strictEqual(stats.renderedAngles.length, 512, 'rendered sample telemetry is bounded');
  assert.strictEqual(stats.renderTimestamps.length, 512, 'render timestamps remain paired and bounded');
  assert(Object.isFrozen(stats.authoritativeAngles) && Object.isFrozen(stats.renderedAngles), 'angle sample snapshots are frozen');
  assert(stats.authoritativeAngles.every(Number.isFinite) && stats.authoritativeTimestamps.every(Number.isFinite), 'authoritative telemetry contains no NaN/Infinity');
  assert(stats.renderedAngles.every(Number.isFinite) && stats.renderTimestamps.every(Number.isFinite), 'render telemetry contains no NaN/Infinity');
}

function pauseTransitionRuntime(){
  const elements = new Map();
  function element(id){
    if(elements.has(id)) return elements.get(id);
    const listeners = {};
    const el = {
      id, listeners, dataset: {}, style: {},
      classList: { add(){}, remove(){}, toggle(){} },
      addEventListener(type, handler){ (listeners[type] ||= []).push(handler); },
      querySelectorAll(){ return []; },
      setPointerCapture(){}, releasePointerCapture(){},
    };
    elements.set(id, el);
    return el;
  }
  const r = runtime('?ffangle=smooth', {
    document: { getElementById: element, addEventListener(){} },
    STATE: { PLAY: 'play' }, state: 'play', paused: false,
    mobileMode: true, onboardingOpen: false, _controlEditActive: false,
    _controlEditDraft: null, _controlEditDrag: null, _controlEditSelected: 'move',
    INPUT_CONFIG: { version: 1, controls: {} }, joy: {}, tzone: {}, lookTouch: { id: null }, inp: {},
    ms_element: null,
    mobileInputActive: () => true, isMobilePortrait: () => true,
    clearInputState(){}, rmenuClearForGameplay(){}, crLoadControlOverrides: () => null,
    crMarkMobileLayoutDirty(){}, crShowControlEditChrome(){}, crSyncControlEditSelectionUI(){},
    applyMobileControlSettings(){}, setMsg(){}, drawMobileMenu(){}, showToast(){},
    crPersistControlOverrides(){}, crInvalidateControlOverrideCache(){},
    SAVE: { save(){}, clear(){} }, crTriggerSoundCue(){}, syncOnboardingPanel(){},
    crMarkMobileUiDirty(){}, rmenuHide(){},
  });
  r.crResetRenderPoseHistory = reason => {
    r.lastPauseResetReason = reason;
    return r.api.crResetRenderAngleHistory(reason);
  };
  vm.runInContext([
    extractFunction(touchSource, 'crResetPauseRenderHistory'),
    extractFunction(touchSource, 'crEnterControlEditMode'),
    extractFunction(touchSource, 'crFinishControlEditMode'),
    extractFunction(touchSource, 'bindMobileControls'),
    extractFunction(menuSource, 'rmenuAction'),
    'globalThis.__pauseApi={crEnterControlEditMode,crFinishControlEditMode,bindMobileControls,rmenuAction};',
  ].join('\n'), r, { filename: 'actual-pause-paths.js' });
  r.pauseApi = r.__pauseApi;
  r.element = element;
  return r;
}

function assertActualPauseTransition(label, invoke, expectedPaused, expectedReason){
  const r = pauseTransitionRuntime();
  r.player.angle = 0;
  r.api.crResetRenderAngleHistory(`${label}-setup`);
  r.setNow(10);
  r.api.crGetSmoothedRenderAngle();
  r.player.angle = 1;
  r.api.crRecordAuthoritativeAngleChange(5, 10, 0, 1);
  r.setNow(20);
  assert(r.api.crGetSmoothedRenderAngle() > 0 && r.api.crGetSmoothedRenderAngle() < 1, `${label} setup has live smoothing history`);
  const before = r.api.crGetRenderAngleStats();
  const authoritativeBefore = JSON.stringify(r.player);

  invoke(r);

  const after = r.api.crGetRenderAngleStats();
  assert.strictEqual(r.paused, expectedPaused, `${label} executes the real pause state transition`);
  assert.strictEqual(after.resetCount, before.resetCount + 1, `${label} increments resetCount`);
  assert.strictEqual(r.lastPauseResetReason, expectedReason, `${label} supplies the exact reset reason`);
  assert.strictEqual(vm.runInContext('_crRenderAngleSmoothed', r), r.player.angle, `${label} snaps render history to authority`);
  assert.strictEqual(vm.runInContext('_crRenderAngleLastNow', r), null, `${label} clears cadence continuity`);
  assert.deepStrictEqual(Array.from(after.authoritativeTimestamps), [], `${label} clears authoritative timestamps`);
  assert.deepStrictEqual(Array.from(after.renderTimestamps), [], `${label} clears render timestamps`);
  assert.strictEqual(JSON.stringify(r.player), authoritativeBefore, `${label} never mutates authoritative gameplay state`);
}

assertActualPauseTransition('control-edit entry', r => r.pauseApi.crEnterControlEditMode(), true, 'pause-entry');
assertActualPauseTransition('control-edit resume', r => { r.paused = true; r.pauseApi.crFinishControlEditMode(false); }, false, 'pause-resume');
assertActualPauseTransition('portrait menu pause entry', r => {
  r.pauseApi.bindMobileControls();
  const click = r.element('mportmenu').listeners.click[0];
  click({ preventDefault(){}, stopPropagation(){} });
}, true, 'pause-entry');
assertActualPauseTransition('pause menu resume', r => { r.paused = true; r.pauseApi.rmenuAction('pause-resume'); }, false, 'pause-resume');

{
  const sandbox = { Math, Number, Object, String };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${angleSource}\n;globalThis.__fallback=[crGetSelectedRenderAngleMode(),crGetRawRenderAngle(),crGetInterpolatedRenderAngle(),crGetSmoothedRenderAngle()];`, sandbox, { filename: anglePath });
  assert.strictEqual(sandbox.__fallback[0], 'interp', 'missing location/URLSearchParams falls back to interp');
  assert(sandbox.__fallback.slice(1).every(Number.isFinite), 'missing player/performance/browser globals return finite angles');
}

assert(!angleSource.includes('localStorage'), 'angle laboratory mode never persists to localStorage');
assert(!touchSource.includes("'ffangle'") && !touchSource.includes('"ffangle"'), 'touch source never persists ffangle');

{
  const sectionEnd = touchSource.indexOf('let lookHintUsed = false;');
  assert(sectionEnd > 0, 'touch LOOK core is extractable');
  const touchCore = touchSource.slice(0, sectionEnd);
  let now = 100;
  const recorded = [];
  const sandbox = {
    Math, Number, Object, String,
    window: {},
    location: { protocol: 'https:' },
    CR_PERF_PROBE: true,
    STATE: { PLAY: 'play' }, state: 'play', paused: false,
    player: { angle: 0.25 },
    performance: { now: () => now },
    mobileLookSens: () => 0.01,
    crRecordAuthoritativeAngleChange: (...args) => recorded.push(args),
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(`${touchCore}\n;globalThis.__touchApi={inp,crApplyLookPadDx,crApplyRawTouchLookDelta,crApplyPendingInputActions,crGetRawTouchLookStats,crResetRawTouchLookStats};`, sandbox, { filename: touchPath });
  const api = sandbox.__touchApi;
  for(const [dx, timestamp] of [[2, 10], [-1, 17], [3, 41], [0.1, 50]]) api.crApplyLookPadDx(dx, timestamp);
  const pending = api.crGetRawTouchLookStats();
  assert(Object.isFrozen(pending), 'raw LOOK stats snapshot is frozen');
  assert.strictEqual(pending.rawLookEvents, 3, 'deadband event is excluded from raw LOOK samples');
  assert.deepStrictEqual(Array.from(pending.eventTimestamps), [10, 17, 41], 'irregular event timestamps are preserved');
  assert.deepStrictEqual(Array.from(pending.rawDeltas), [0.02, -0.01, 0.03], 'raw touch LOOK radians are preserved');
  assert(Math.abs(api.inp.lookDeltaRad - 0.04) < 1e-12, 'raw touch deltas retain movementfeel1 accumulation');
  const before = sandbox.player.angle;
  api.crApplyPendingInputActions();
  assert(Math.abs(sandbox.player.angle - (before + 0.04)) < 1e-12, 'authoritative angle applies exact accumulated delta');
  assert.strictEqual(api.inp.lookDeltaRad, 0, 'pending delta clears after authoritative application');
  assert.strictEqual(recorded.length, 1, 'input-to-authority response is recorded once per application');
  assert.strictEqual(recorded[0][0], 10, 'oldest contributing event timestamps input latency');
  assert.strictEqual(recorded[0][1], 100, 'authoritative application timestamp is recorded');
  assert(!touchCore.includes('console.log'), 'touch sampling emits no per-event console logs');

  api.crResetRawTouchLookStats();
  assert.strictEqual(api.crGetRawTouchLookStats().rawLookEvents, 0, 'touch telemetry reset clears event counters');
  sandbox.CR_PERF_PROBE = false;
  api.crApplyRawTouchLookDelta(0.5, 120);
  assert.strictEqual(api.crGetRawTouchLookStats().rawLookEvents, 0, 'touch telemetry remains dormant without profiler');
  assert(Math.abs(api.inp.lookDeltaRad - 0.5) < 1e-12, 'dormant telemetry never gates input behavior');
}

console.log(JSON.stringify({ pass: true, modes: ['raw','interp','smooth'], cadences: [60,90,120,144], scenarios: ['move-without-look','turn-in-place','move-while-turning','reversal','pause-resume','visibility','load','restart','level-transition','teleport','fixed-step-drop','irregular-touch'] }));
