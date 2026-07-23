// -----------------------------------------------------------------------
// SECTION 2b — MOBILE / TOUCH INPUT
// -----------------------------------------------------------------------
// input abstraction: readable by game code, populated by kbd+mouse+touch
const inp = {
  fwd:false, back:false, left:false, right:false,
  turnLeft:false, turnRight:false,
  sprint:false, give:false, map:false, pause:false,
  lookDeltaRad:0,
  _active:false, // true when any touch is on screen
};
var BUILD_ID = 'chromeinput2'; window.BUILD_ID = BUILD_ID;
const CR_FPV_STREET_MATTE = true;
/** Building visual reset: smooth, low-noise wall masses with sparse readable cues. */
const CR_BUILDING_SMOOTH_STYLE = 1;
/** Continuous facade texture pass retained for compatibility/debug; calmwalls1 bypasses it visibly. */
const CR_CONTINUOUS_FACADE_TEXTURES = 1;
/** Props-first calm wall pass retained for compatibility/debug; simplewalls1 bypasses its bands visibly. */
const CR_CALM_WALLS_PROPS_FIRST = 1;
/** Simple wall baseline pass retained for compatibility/debug; flatwalls1 bypasses the entire building wall draw path above it. */
const CR_SIMPLE_WALLS_BASELINE = 1;
/** Props-first restore: simple per-material wall colors (not one flat fill). */
const CR_PROPS1_RESTORE_SIMPLE_MATERIALS = 1;
/** Props-first restore: guaranteed minimum prop density near main road / player start. */
const CR_PROPS1_RESTORE_PROP_DENSITY = 1;
/** solidwalls1: opaque hex building fills + per-segment map material grouping (no transparent wall mass). */
const CR_SOLID_WALLS_OPAQUE_BASELINE = 1;
/** Coarse FPV wall texture U sampling (reduces vertical stripe/moiré on buildings). */
const CR_FPV_WALL_TEX_COARSE = 16;
/** Visual readability contract (render/HUD only; gameplay unchanged). */
const CR_VISUAL_READABILITY = {
  style: 'visualfix1',
  floorPathStripe: false,
  entityOutlines: true,
  exitReadyCue: true,
  giveTargetHighlight: true,
};
/** Sound / HUD feedback contract (procedural Web Audio only; no external assets). */
const CR_SOUND_FEEDBACK = {
  style: 'sound1',
  webAudio: true,
  externalAssets: false,
  requiredCues: [
    'canCollect', 'giveSuccess', 'giveBlocked', 'giveUnavailable', 'quotaExitReady',
    'districtComplete', 'upgradeChosen', 'menuHelp', 'sprintDenied',
  ],
};
const IS_FILE_ORIGIN = (typeof location !== 'undefined' && location.protocol === 'file:');
const FILE_ORIGIN_SAVE_NOTE = 'Local file mode: saves may not persist. Use GitHub Pages for reliable saves.';
function fileOriginMenuNoteHTML(){
  if(!IS_FILE_ORIGIN) return '';
  return `<div class="rdesc" style="margin:10px 16px 12px;padding:8px 10px;border:1px solid rgba(180,120,60,0.5);color:#c9a060;font-size:11px;line-height:1.4;text-align:center;">${FILE_ORIGIN_SAVE_NOTE}</div>`;
}
let mobileMode = false; // true = show mobile overlay, hide desktop cursor
let mobileOverride = null; // null=auto, 'on', 'off'
let portHintShown = false;

// Joystick state
const joy = { x:0, y:0, active:false, id:null, ptrId:null, sx:0, sy:0, ang:0, dist:0 };
function applyJoyFromClient(cx, cy){
  const dx = cx - joy.sx, dy = cy - joy.sy;
  const joySize = Number(options.joySizePx)||110;
  const MAX = Math.max(32, joySize * 0.35);
  const d = Math.sqrt(dx*dx+dy*dy);
  joy.dist = Math.min(d, MAX) / MAX;
  const dead = Number(options.touchDeadzonePx)||8;
  if(d < dead){ joy.ang = 0; joy.x = 0; joy.y = 0; joy.dist = 0; }
  else {
    joy.ang = Math.atan2(dx, -dy);
    joy.x = Math.sin(joy.ang) * joy.dist;
    joy.y = Math.cos(joy.ang) * joy.dist;
  }
  updateJoyDot(joy.x, joy.y);
}
function joyStrength(){
  if(!joy.active) return 0;
  return Math.max(joy.dist||0, Math.hypot(joy.x||0, joy.y||0));
}
function mobileInputActive(){
  return mobileMode || options.mobileControls==='on' || mobileOverride==='on' || (typeof isMobile==='function' && isMobile());
}
// Turn zone state (landscape #mr)
const tzone = { active:false, id:null, lastX:0 };
// Dedicated LOOK circle (#mlookpad) — tracked by touch identifier for multi-touch
const lookTouch = { id:null, lastX:0 };
const CR_RAW_LOOK_SAMPLE_CAP = 512;
let _crRawLookDeltas = [];
let _crRawLookEventTimestamps = [];
let _crPendingLookEventTimestamp = null;
function crRawLookProfilerActive(){
  try { return typeof CR_PERF_PROBE !== 'undefined' && !!CR_PERF_PROBE; } catch(_e){ return false; }
}
function crRawLookNowMs(){
  try {
    if(typeof performance !== 'undefined' && performance && typeof performance.now === 'function'){
      const now = Number(performance.now());
      if(Number.isFinite(now)) return now;
    }
  } catch(_e){}
  return 0;
}
function crResetRawTouchLookStats(){
  _crRawLookDeltas = [];
  _crRawLookEventTimestamps = [];
  _crPendingLookEventTimestamp = null;
}
function crResetPauseRenderHistory(reason){
  try {
    if(typeof crResetRenderPoseHistory === 'function') return crResetRenderPoseHistory(reason);
    if(typeof crResetRenderAngleHistory === 'function') return crResetRenderAngleHistory(reason);
  } catch(_e){}
  return null;
}
function crGetRawTouchLookStats(){
  return Object.freeze({
    rawLookEvents: _crRawLookDeltas.length,
    rawDeltas: Object.freeze(_crRawLookDeltas.slice()),
    eventTimestamps: Object.freeze(_crRawLookEventTimestamps.slice()),
  });
}
function crApplyRawTouchLookDelta(deltaRad, eventTimestamp){
  const delta = Number(deltaRad);
  if(!Number.isFinite(delta) || delta === 0) return false;
  inp.lookDeltaRad += delta;
  if(crRawLookProfilerActive()){
    const rawTime = Number(eventTimestamp);
    const timestamp = Number.isFinite(rawTime) ? rawTime : crRawLookNowMs();
    _crRawLookDeltas.push(delta);
    _crRawLookEventTimestamps.push(timestamp);
    if(_crRawLookDeltas.length > CR_RAW_LOOK_SAMPLE_CAP){
      _crRawLookDeltas.splice(0, _crRawLookDeltas.length - CR_RAW_LOOK_SAMPLE_CAP);
      _crRawLookEventTimestamps.splice(0, _crRawLookEventTimestamps.length - CR_RAW_LOOK_SAMPLE_CAP);
    }
    if(_crPendingLookEventTimestamp === null) _crPendingLookEventTimestamp = timestamp;
  }
  return true;
}
/** Single apply site for #mlookpad horizontal look drag (deadband unchanged). */
function crApplyLookPadDx(dx, eventTimestamp){
  if(state!==STATE.PLAY || paused) return false;
  if(Math.abs(dx) <= 0.2) return false;
  crApplyRawTouchLookDelta(dx * mobileLookSens(), eventTimestamp);
  return true;
}
/** Apply accumulated look delta from input handlers (simulation step). */
function crApplyPendingInputActions(){
  if(inp.lookDeltaRad){
    const before = player.angle;
    const eventTimestamp = _crPendingLookEventTimestamp;
    const appliedTimestamp = crRawLookNowMs();
    player.angle += inp.lookDeltaRad;
    inp.lookDeltaRad = 0;
    _crPendingLookEventTimestamp = null;
    try {
      if(typeof crRecordAuthoritativeAngleChange === 'function'){
        crRecordAuthoritativeAngleChange(eventTimestamp, appliedTimestamp, before, player.angle);
      }
    } catch(_e){}
  }
}

let lookHintUsed = false;
let lookHintShownAt = 0;
const LOOK_HINT_TIMEOUT_MS = 5000;
let sprintBurstUntil = 0; // mobile sprint burst end time (seconds, performance.now/1000)
let _sprintDenyFeedbackT = 0;
let ms_element = null; // reference to SPRINT button for visual state updates
const BASE_MOBILE_TURN_SENS = 0.0062; // per-pixel rad; 1.0x ≈ prior MED. Portrait adds extra boost via mobileLookSens().
const LOOK_SPEED_STEPS = [0.75,1,1.25,1.5,2,2.5,3,4,5,6,8,10];
const PORTRAIT_LOOK_BOOST = 1.72; // small LOOK circle needs more gain than landscape drag zone
/** feel2: soften portrait LOOK ~15% vs feel1 (touch dedupe unchanged). */
const FEEL2_PORTRAIT_LOOK_SOFTEN = 0.85;
const LEGACY_LOOK_TO_SPEED = {low:0.75, med:1, high:1.5, fast:2.5};
const JOY_SIZE_STEPS = [80, 90, 100, 110, 120, 130, 140, 150, 165, 180, 200, 220];
const BTN_SIZE_STEPS = [60, 70, 80, 85, 95, 100, 110, 120, 130, 145, 160, 175];
const LOOK_PAD_SIZE_STEPS = [72, 88, 100, 112, 128, 144, 160, 176, 200, 220, 240];
/** Positive = controls lower on screen; negative = higher. */
const CONTROL_Y_STEPS = [120, 0, -120, -240];
const CR_MINIMAP_OVERLAP_SINGLE_MAX = 0.15;
const CR_MINIMAP_OVERLAP_TOTAL_MAX = 0.25;
const CR_MINIMAP_USABILITY_GAP_PX = 4;

/* SECTION: INPUT_CONFIG */
/* MOBILE LAYOUT ZONES — FPV / minimap / MENU band / control dock / stats (portrait). */
const CR_CONTROLS_LS_KEY = 'cannedRun.controls.v1';
// DEFAULT MOBILE CONTROL SCHEMA — normalized viewport fractions; legacy portraitLayout() is authoritative until user overrides.
const INPUT_CONFIG = {
  version: 1,
  controls: {
    move: { id: 'move', domId: 'ml', type: 'stick', action: 'move', zone: 'bottom-left', editable: true, minW: 0.12, minH: 0.08, sizeSteps: JOY_SIZE_STEPS },
    give: { id: 'give', domId: 'mg', type: 'button', action: 'give', zone: 'bottom-left', editable: true, minW: 0.08, minH: 0.06, sizeSteps: BTN_SIZE_STEPS },
    look: { id: 'look', domId: 'mlookpad', type: 'stick', action: 'look', zone: 'bottom-right', editable: true, minW: 0.14, minH: 0.10, sizeSteps: LOOK_PAD_SIZE_STEPS },
    sprint: { id: 'sprint', domId: 'ms', type: 'button', action: 'sprint', zone: 'bottom-right', editable: true, minW: 0.08, minH: 0.06, sizeSteps: BTN_SIZE_STEPS },
    menu: { id: 'menu', domId: 'mportmenu', type: 'button', action: 'menu', zone: 'center-band', editable: false },
  },
};
let _controlEditActive = false;
let _controlEditDraft = null;
let _controlEditDrag = null;
let _controlEditSelected = 'move';
const CR_EDITABLE_CONTROL_IDS = ['move','give','look','sprint'];
const CR_EDIT_CONTROL_LABELS = { move: 'MOVE', give: 'GIVE', look: 'LOOK', sprint: 'SPRINT' };

// MOBILE UI/LAYOUT CACHE — shared counters are consumed by the gated perf probe.
const _crMobileUiStats = {
  drawCalls: 0, stableEarlyOuts: 0, uiFlushes: 0, layoutFlushes: 0,
  domWrites: 0, styleWrites: 0,
  safeAreaReads: 0, safeAreaCacheHits: 0, safeAreaInvalidations: 0, safeAreaRevision: 0,
  overrideStorageReads: 0, overrideCacheHits: 0, overrideInvalidations: 0, overrideRevision: 0,
  lastDirtyReasons: [], lastUiKey: '', lastLayoutKey: '',
};
let _crMobileUiDirty = true;
let _crMobileLayoutDirty = true;
let _crLastMobileUiKey = '';
let _crLastMobileLayoutKey = '';
let _crTouchDeferredUi = false;
const _crIntendedStyles = new WeakMap();
const _crIntendedClasses = new WeakMap();
const _crIntendedHtml = new WeakMap();

function crRememberMobileDirtyReason(reason){
  const text = String(reason || 'unspecified');
  const reasons = _crMobileUiStats.lastDirtyReasons;
  if(reasons[reasons.length - 1] !== text) reasons.push(text);
  if(reasons.length > 12) reasons.splice(0, reasons.length - 12);
}
function crMarkMobileUiDirty(reason){
  _crMobileUiDirty = true;
  crRememberMobileDirtyReason(reason);
}
function crMarkMobileLayoutDirty(reason){
  _crMobileLayoutDirty = true;
  _crMobileUiDirty = true;
  crRememberMobileDirtyReason(reason);
}
function crWriteStyle(el, prop, value){
  if(!el) return false;
  let cache = _crIntendedStyles.get(el);
  if(!cache){ cache = Object.create(null); _crIntendedStyles.set(el, cache); }
  const want = String(value);
  if(cache[prop] === want) return false;
  cache[prop] = want;
  el.style[prop] = want;
  _crMobileUiStats.styleWrites++;
  return true;
}
function crToggleClass(el, name, on){
  if(!el) return false;
  let cache = _crIntendedClasses.get(el);
  if(!cache){ cache = Object.create(null); _crIntendedClasses.set(el, cache); }
  const want = !!on;
  if(cache[name] === want) return false;
  cache[name] = want;
  el.classList.toggle(name, want);
  _crMobileUiStats.domWrites++;
  return true;
}
function crWriteHtml(el, html){
  if(!el) return false;
  const want = String(html);
  if(_crIntendedHtml.get(el) === want) return false;
  _crIntendedHtml.set(el, want);
  el.innerHTML = want;
  _crMobileUiStats.domWrites++;
  return true;
}
function crGetMobileUiSyncStats(){
  return Object.freeze(Object.assign({}, _crMobileUiStats, {
    lastDirtyReasons: Object.freeze(_crMobileUiStats.lastDirtyReasons.slice()),
    lastUiKey: _crLastMobileUiKey,
    lastLayoutKey: _crLastMobileLayoutKey,
  }));
}

function crClamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

function crRectToNorm(rect, cw, ch){
  return {
    x: rect.left / cw,
    y: rect.top / ch,
    w: rect.width / cw,
    h: rect.height / ch,
  };
}

function crNormToRect(norm, cw, ch){
  return {
    left: Math.round(norm.x * cw),
    top: Math.round(norm.y * ch),
    width: Math.round(norm.w * cw),
    height: Math.round(norm.h * ch),
  };
}

function crSanitizeControlNorm(norm, cfg, cw, ch, sa){
  if(!norm || typeof norm !== 'object') return null;
  const minW = Math.round((cfg.minW || 0.08) * cw);
  const minH = Math.round((cfg.minH || 0.06) * ch);
  let w = crClamp(Number(norm.w) || 0, (cfg.minW || 0.08), 0.45) * cw;
  let h = crClamp(Number(norm.h) || 0, (cfg.minH || 0.06), 0.35) * ch;
  w = Math.max(minW, Math.round(w));
  h = Math.max(minH, Math.round(h));
  const padL = sa.left + 4;
  const padR = sa.right + 4;
  const padT = sa.top + 4;
  const padB = sa.bottom + 8;
  let left = Math.round((Number(norm.x) || 0) * cw);
  let top = Math.round((Number(norm.y) || 0) * ch);
  left = crClamp(left, padL, cw - padR - w);
  top = crClamp(top, padT, ch - padB - h);
  return { x: left / cw, y: top / ch, w: w / cw, h: h / ch };
}

// USER CONTROL OVERRIDES — localStorage only (not game save).
let _crOverrideCacheReady = false;
let _crOverrideCacheValue = null;
function crInvalidateControlOverrideCache(reason){
  _crOverrideCacheReady = false;
  _crOverrideCacheValue = null;
  _crMobileUiStats.overrideInvalidations++;
  _crMobileUiStats.overrideRevision++;
  crMarkMobileLayoutDirty(reason || 'control-override-invalidated');
}
function crLoadControlOverrides(){
  if(_crOverrideCacheReady){
    _crMobileUiStats.overrideCacheHits++;
    return _crOverrideCacheValue;
  }
  _crMobileUiStats.overrideStorageReads++;
  try {
    const raw = localStorage.getItem(CR_CONTROLS_LS_KEY);
    if(!raw){ _crOverrideCacheReady = true; _crOverrideCacheValue = null; return null; }
    const parsed = JSON.parse(raw);
    _crOverrideCacheValue = (!parsed || parsed.v !== INPUT_CONFIG.version || typeof parsed.overrides !== 'object') ? null : parsed;
    _crOverrideCacheReady = true;
    return _crOverrideCacheValue;
  } catch(_e){
    _crOverrideCacheReady = true;
    _crOverrideCacheValue = null;
    return null;
  }
}

function crPersistControlOverrides(bundle){
  try {
    const payload = {
      v: INPUT_CONFIG.version,
      overrides: (bundle && bundle.overrides) ? bundle.overrides : {},
      ts: Date.now(),
    };
    localStorage.setItem(CR_CONTROLS_LS_KEY, JSON.stringify(payload));
    _crOverrideCacheValue = payload;
    _crOverrideCacheReady = true;
    _crMobileUiStats.overrideRevision++;
    crMarkMobileLayoutDirty('control-override-persist');
    return true;
  } catch(_e){
    return false;
  }
}

function crClearControlOverrides(){
  try { localStorage.removeItem(CR_CONTROLS_LS_KEY); } catch(_e){}
  _controlEditDraft = null;
  crInvalidateControlOverrideCache('control-override-clear');
}

function crGetActiveControlOverrides(){
  if(_controlEditActive && _controlEditDraft) return _controlEditDraft;
  return crLoadControlOverrides();
}

function crMergedNormForControl(id, legacyRect, cw, ch, sa){
  const cfg = INPUT_CONFIG.controls[id];
  const ov = crGetActiveControlOverrides();
  const custom = ov && ov.overrides ? ov.overrides[id] : null;
  if(!custom) return crRectToNorm(legacyRect, cw, ch);
  const clean = crSanitizeControlNorm(custom, cfg, cw, ch, sa);
  return clean || crRectToNorm(legacyRect, cw, ch);
}

function crApplyUserControlOverrides(L, cw, ch, sa){
  const map = { move: 'moveRect', give: 'giveRect', look: 'lookRect', sprint: 'sprintRect' };
  const ov = crGetActiveControlOverrides();
  if(!ov || !ov.overrides || Object.keys(ov.overrides).length === 0) return L;
  const out = Object.assign({}, L);
  for(const id of Object.keys(map)){
    if(!ov.overrides[id]) continue;
    const cfg = INPUT_CONFIG.controls[id];
    const clean = crSanitizeControlNorm(ov.overrides[id], cfg, cw, ch, sa);
    if(!clean) continue;
    out[map[id]] = crNormToRect(clean, cw, ch);
  }
  return out;
}

// CONTROL HIT TESTS — schema coordinates
function crControlHitTest(clientX, clientY, layout){
  const hits = [];
  const pairs = [
    ['move', layout.moveRect], ['give', layout.giveRect], ['look', layout.lookRect],
    ['sprint', layout.sprintRect], ['menu', layout.menuRect],
  ];
  for(const [id, r] of pairs){
    if(!r) continue;
    if(clientX >= r.left && clientX <= r.left + r.width && clientY >= r.top && clientY <= r.top + r.height){
      hits.push(id);
    }
  }
  return hits;
}

// CONTROL RESET PATH
function crResetControlLayoutOverrides(){
  crClearControlOverrides();
  if(_controlEditActive){
    _controlEditDraft = { v: INPUT_CONFIG.version, overrides: {} };
  }
  crInvalidateSafeAreaCache('control-layout-reset');
  crMarkMobileLayoutDirty('control-layout-reset');
  applyMobileControlSettings();
  showToast('Controls reset to defaults', 2200);
}

function crShowControlEditChrome(show){
  const bar = document.getElementById('crCtrlEditBar');
  if(bar) crWriteStyle(bar, 'display', show ? 'flex' : 'none');
  const mob = document.getElementById('mob');
  crToggleClass(mob, 'ctrl-edit-mode', !!show);
}

function crSnapshotLayoutNorms(){
  const { cw, ch } = layoutCssSize();
  const sa = readSafeAreaInsets();
  const L0 = portraitLayout(undefined, { skipMinimapClamp: true, skipUserOverrides: true });
  const norms = {};
  for(const id of ['move','give','look','sprint']){
    const key = id + 'Rect';
    norms[id] = crRectToNorm(L0[key], cw, ch);
  }
  return { cw, ch, sa, norms, layout: L0 };
}

function crEnterControlEditMode(){
  if(!mobileInputActive()){ showToast('Enable mobile controls first', 2400); return; }
  if(!isMobilePortrait()){ showToast('EDIT CONTROLS: portrait layout only', 2600); return; }
  clearInputState();
  paused = true;
  crResetPauseRenderHistory('pause-entry');
  rmenuClearForGameplay();
  const r = document.getElementById('rmenu');
  if(r) r.classList.remove('options-tune');
  _controlEditActive = true;
  const loaded = crLoadControlOverrides();
  _controlEditDraft = loaded ? JSON.parse(JSON.stringify(loaded)) : { v: INPUT_CONFIG.version, overrides: {} };
  if(!_controlEditDraft.overrides) _controlEditDraft.overrides = {};
  _controlEditSelected = 'move';
  crMarkMobileLayoutDirty('control-edit-enter');
  crShowControlEditChrome(true);
  crSyncControlEditSelectionUI();
  applyMobileControlSettings();
  setMsg('CONTROL EDIT — tap control · SIZE −/+ · drag to move');
}

function crSelectEditControl(id){
  if(!_controlEditActive) return;
  const cfg = INPUT_CONFIG.controls[id];
  if(!cfg || !cfg.editable) return;
  _controlEditSelected = id;
  crSyncControlEditSelectionUI();
}

function crSyncControlEditSelectionUI(){
  const lbl = document.getElementById('crCtrlEditSelected');
  const name = CR_EDIT_CONTROL_LABELS[_controlEditSelected] || String(_controlEditSelected || '').toUpperCase();
  if(lbl) lbl.textContent = 'SELECTED: ' + name;
  CR_EDITABLE_CONTROL_IDS.forEach(cid => {
    const cfg = INPUT_CONFIG.controls[cid];
    const el = cfg ? document.getElementById(cfg.domId) : null;
    if(el) el.classList.toggle('ctrl-edit-selected', _controlEditActive && cid === _controlEditSelected);
  });
}

function crFinishControlEditMode(save){
  if(save && _controlEditDraft){
    crPersistControlOverrides(_controlEditDraft);
  }
  _controlEditActive = false;
  _controlEditDraft = null;
  _controlEditDrag = null;
  _controlEditSelected = 'move';
  if(!save) crInvalidateControlOverrideCache('control-edit-cancel');
  crMarkMobileLayoutDirty(save ? 'control-edit-save' : 'control-edit-cancel');
  crShowControlEditChrome(false);
  crSyncControlEditSelectionUI();
  paused = false;
  crResetPauseRenderHistory('pause-resume');
  clearInputState();
  applyMobileControlSettings();
  drawMobileMenu();
}

function crStepEditControlSize(id, dir){
  if(!_controlEditActive || !_controlEditDraft) return false;
  const cfg = INPUT_CONFIG.controls[id];
  if(!cfg || !cfg.editable) return false;
  const snap = crSnapshotLayoutNorms();
  const legacy = snap.layout[id + 'Rect'];
  const cur = _controlEditDraft.overrides[id] || crRectToNorm(legacy, snap.cw, snap.ch);
  const rect = crNormToRect(cur, snap.cw, snap.ch);
  const steps = cfg.sizeSteps || BTN_SIZE_STEPS;
  const isSquare = cfg.type === 'stick';
  const curPx = Math.max(rect.width, rect.height);
  const nextPx = cycleStepValueDir(curPx, steps, dir > 0 ? 1 : -1);
  let w = rect.width;
  let h = rect.height;
  if(isSquare){
    w = nextPx;
    h = nextPx;
  } else {
    const scale = nextPx / Math.max(1, Math.max(rect.width, rect.height));
    w = Math.round(rect.width * scale);
    h = Math.round(rect.height * scale);
  }
  _controlEditDraft.overrides[id] = crSanitizeControlNorm({
    x: rect.left / snap.cw,
    y: rect.top / snap.ch,
    w: w / snap.cw,
    h: h / snap.ch,
  }, cfg, snap.cw, snap.ch, snap.sa);
  crMarkMobileLayoutDirty('control-edit-size');
  applyMobileControlSettings();
  crSyncControlEditSelectionUI();
  return true;
}

function crCycleEditControlSize(id){
  return crStepEditControlSize(id, 1);
}

function crInstallControlEditPointerHandlers(){
  if(window._crCtrlEditHandlersInstalled) return;
  window._crCtrlEditHandlersInstalled = true;
  const editable = ['move','give','look','sprint'];
  editable.forEach(id => {
    const cfg = INPUT_CONFIG.controls[id];
    const el = document.getElementById(cfg.domId);
    if(!el) return;
    el.addEventListener('pointerdown', e => {
      if(!_controlEditActive || !cfg.editable) return;
      if(e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      e.stopPropagation();
      crSelectEditControl(id);
      const r = el.getBoundingClientRect();
      _controlEditDrag = {
        id,
        pid: e.pointerId,
        offX: e.clientX - r.left,
        offY: e.clientY - r.top,
        w: r.width,
        h: r.height,
      };
      try { el.setPointerCapture(e.pointerId); } catch(_e){}
    }, { passive: false });
    el.addEventListener('pointermove', e => {
      if(!_controlEditActive || !_controlEditDraft || !_controlEditDrag || _controlEditDrag.id !== id) return;
      if(_controlEditDrag.pid !== e.pointerId) return;
      e.preventDefault();
      const { cw, ch } = layoutCssSize();
      const sa = readSafeAreaInsets();
      const cfg = INPUT_CONFIG.controls[id];
      const left = e.clientX - _controlEditDrag.offX;
      const top = e.clientY - _controlEditDrag.offY;
      _controlEditDraft.overrides[id] = crSanitizeControlNorm({
        x: left / cw,
        y: top / ch,
        w: _controlEditDrag.w / cw,
        h: _controlEditDrag.h / ch,
      }, cfg, cw, ch, sa);
      crMarkMobileLayoutDirty('control-edit-drag');
      applyMobileControlSettings();
    }, { passive: false });
    const endDrag = e => {
      if(!_controlEditDrag || _controlEditDrag.id !== id) return;
      if(e.pointerId !== undefined && _controlEditDrag.pid !== e.pointerId) return;
      _controlEditDrag = null;
      try { el.releasePointerCapture(e.pointerId); } catch(_e){}
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  });
  document.addEventListener('DOMContentLoaded', () => {
    crWireControlEditBarButtons();
  });
  crWireControlEditBarButtons();
}
function crWireControlEditBarButtons(){
  const done = document.getElementById('crCtrlEditDone');
  const cancel = document.getElementById('crCtrlEditCancel');
  const reset = document.getElementById('crCtrlEditReset');
  const sizeDown = document.getElementById('crCtrlEditSizeDown');
  const sizeUp = document.getElementById('crCtrlEditSizeUp');
  if(!done || done._crCtrlEditWired) return;
  done._crCtrlEditWired = true;
  if(done) done.addEventListener('click', () => crFinishControlEditMode(true));
  if(cancel) cancel.addEventListener('click', () => crFinishControlEditMode(false));
  if(reset) reset.addEventListener('click', () => {
    _controlEditDraft = { v: INPUT_CONFIG.version, overrides: {} };
    crInvalidateSafeAreaCache('control-edit-reset');
    crMarkMobileLayoutDirty('control-edit-reset');
    applyMobileControlSettings();
    crSyncControlEditSelectionUI();
  });
  if(sizeDown) sizeDown.addEventListener('click', () => crStepEditControlSize(_controlEditSelected, -1));
  if(sizeUp) sizeUp.addEventListener('click', () => crStepEditControlSize(_controlEditSelected, 1));
}
crInstallControlEditPointerHandlers();

function crDomRectToXYWH(r){
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function crRectIntersectArea(a, b){
  const ax = a.x !== undefined ? a.x : a.left;
  const ay = a.y !== undefined ? a.y : a.top;
  const aw = a.w !== undefined ? a.w : a.width;
  const ah = a.h !== undefined ? a.h : a.height;
  const bx = b.x !== undefined ? b.x : b.left;
  const by = b.y !== undefined ? b.y : b.top;
  const bw = b.w !== undefined ? b.w : b.width;
  const bh = b.h !== undefined ? b.h : b.height;
  const ix = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const iy = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  return ix * iy;
}

function crMinimapOverlapMetrics(L){
  const mini = L.minimapRect;
  const miniArea = Math.max(1, mini.w * mini.h);
  const controls = [
    { id: 'move', rect: crDomRectToXYWH(L.moveRect) },
    { id: 'give', rect: crDomRectToXYWH(L.giveRect) },
    { id: 'look', rect: crDomRectToXYWH(L.lookRect) },
    { id: 'sprint', rect: crDomRectToXYWH(L.sprintRect) },
  ];
  let totalArea = 0;
  const perControl = {};
  controls.forEach(c => {
    const area = crRectIntersectArea(c.rect, mini);
    perControl[c.id] = area / miniArea;
    totalArea += area;
  });
  return {
    perControl,
    totalFraction: totalArea / miniArea,
    miniArea,
    totalArea,
  };
}

function crMinimapOverlapPass(L){
  const m = crMinimapOverlapMetrics(L);
  if(m.totalFraction > CR_MINIMAP_OVERLAP_TOTAL_MAX) return false;
  return Object.values(m.perControl).every(v => v <= CR_MINIMAP_OVERLAP_SINGLE_MAX);
}

function crApplyMinimapUsabilityClamp(moveRect, giveRect, lookRect, sprintRect, minimapRect, controlsY0, statsY){
  const rects = [moveRect, giveRect, lookRect, sprintRect];
  const minTop = minimapRect.y + minimapRect.h + CR_MINIMAP_USABILITY_GAP_PX;
  let guard = 0;
  while(guard++ < 96){
    const Ltmp = {
      minimapRect,
      moveRect, giveRect, lookRect, sprintRect,
    };
    if(crMinimapOverlapPass(Ltmp)) break;
    let highest = Infinity;
    rects.forEach(r => { if(r.top < highest) highest = r.top; });
    const shift = Math.max(6, minTop - highest);
    rects.forEach(r => { r.top += shift; });
    rects.forEach(r => {
      if(r.top + r.height > statsY - 4) r.top = Math.max(controlsY0, statsY - 4 - r.height);
    });
  }
}

function crSafeControlsYOffsetPx(requested){
  const target = nearestStep(Number(requested) || 0, CONTROL_Y_STEPS);
  const order = [...CONTROL_Y_STEPS].sort((a, b) => a - b);
  const idx = Math.max(0, order.indexOf(target));
  for(let i = idx; i < order.length; i++){
    const y = order[i];
    const L = portraitLayout(y, { skipMinimapClamp: true });
    if(crMinimapOverlapPass(L)) return y;
  }
  return 120;
}

function crMigrateUnsafeControlsYOffset(opts){
  const quiet = opts && opts.quiet;
  const req = Number(options.controlsYOffsetPx) || 0;
  if(!mobileInputActive() && !_forcePortraitLayout) return { changed: false, from: req, to: req };
  const { cw, ch } = layoutCssSize();
  if(ch <= cw && !_forcePortraitLayout) return { changed: false, from: req, to: req };
  const safe = crSafeControlsYOffsetPx(req);
  if(safe === req) return { changed: false, from: req, to: req };
  options.controlsYOffsetPx = safe;
  options.save();
  applyMobileControlSettings();
  if(!quiet){
    showToast('CONTROL DOCK HEIGHT adjusted to safe ' + controlHeightMenuLabel(safe), 2800);
  }
  return { changed: true, from: req, to: safe };
}
function controlHeightLabel(px){
  const v = Number(px) || 0;
  if(v >= 60) return 'LOW';
  if(v === 0) return 'MID';
  if(v <= -180) return 'VERY HIGH';
  return 'HIGH';
}
function controlHeightMenuLabel(px){
  const v = Number(px) || 0;
  const sign = v > 0 ? `+${v}` : String(v);
  const base = `${controlHeightLabel(v)} (${sign}px)`;
  if(v <= -180) return base + ' — clamps if overlap';
  return base;
}
const OPACITY_STEPS = [0.30,0.45,0.60,0.75];
const DEADZONE_STEPS = [4,8,12,16];
const MINIMAP_SIZE_STEPS = [68,82,96];
const LEGACY_SIZE_TO_JOY = {small:90, med:110, large:150};
const LEGACY_SIZE_TO_BTN = {small:70, med:85, large:120};
const LEGACY_OPACITY = {low:0.30, med:0.60, high:0.75};
const LEGACY_DEADZONE = {low:4, med:8, high:12};
const LEGACY_MAP_SIZE = {small:68, med:82, large:96};
function cycleValue(current, list){ const i=list.indexOf(current); return list[(i<0?0:i+1)%list.length]; }
function nearestStep(value, steps){
  let best=steps[0], bd=Infinity;
  for(const st of steps){ const d=Math.abs(st-value); if(d<bd){ bd=d; best=st; } }
  return best;
}
function cycleStepValue(current, steps){
  const raw = Number(current);
  const safe = Number.isFinite(raw) ? raw : steps[0];
  const n = nearestStep(safe, steps);
  return cycleValue(n, steps);
}
function cycleStepValueDir(current, steps, dir){
  const raw = Number(current);
  const safe = Number.isFinite(raw) ? raw : steps[0];
  const n = nearestStep(safe, steps);
  const i = steps.indexOf(n);
  const idx = i < 0 ? 0 : i;
  const step = dir > 0 ? 1 : -1;
  const nextIdx = (idx + step + steps.length) % steps.length;
  return steps[nextIdx];
}
function bumpControlHeight(){
  options.controlsYOffsetPx = cycleStepValue(options.controlsYOffsetPx, CONTROL_Y_STEPS);
  options.controlsYOffsetPx = Number(options.controlsYOffsetPx);
  options.save();
  crMarkMobileLayoutDirty('control-y-change');
  const migration = crMigrateUnsafeControlsYOffset({ quiet: true });
  if(!migration.changed) applyMobileControlSettings();
  _optionsMenuStamp++;
  const lbl = controlHeightMenuLabel(options.controlsYOffsetPx);
  setMsg('CONTROL DOCK HEIGHT: ' + lbl);
  showToast('CONTROL DOCK HEIGHT: ' + lbl, 2200);
  try { beep(520, 0.06, 'square', 0.04); } catch(_e){}
  syncPortraitMenuLabel();
  drawMobileMenu();
}
function lookSensFromSpeed(v){ return BASE_MOBILE_TURN_SENS * (Number(v)||1); }
function crPortraitLookSensMultiplier(){
  if(!mobileMode) return 1;
  if(isMobilePortrait()){
    let mult = PORTRAIT_LOOK_BOOST;
    if(BUILD_ID === 'feel2' || BUILD_ID === 'prefabgrid1' || BUILD_ID === 'stripmall001proof1' || BUILD_ID === 'authoredd1bitmap1' || BUILD_ID === 'facadeskins8b' || BUILD_ID === 'walltextures1' || BUILD_ID === 'walltextures2' || BUILD_ID === 'walltextures3' || BUILD_ID === 'walltextures4' || BUILD_ID === 'decalintegration1' || BUILD_ID === 'decalintegration2' || BUILD_ID === 'decalintegration3' || BUILD_ID === 'decalintegration4' || BUILD_ID === 'facadeskins1' || BUILD_ID === 'facadeskins2') mult *= FEEL2_PORTRAIT_LOOK_SOFTEN;
    return mult;
  }
  return 1.06;
}
function mobileLookSens(){
  const s = options.mobileTurnSens;
  if(!mobileMode) return s;
  return s * crPortraitLookSensMultiplier();
}
function crGetFeel2LookTuningProof(){
  const optSens = options.mobileTurnSens;
  const mult = crPortraitLookSensMultiplier();
  const feel1Mult = isMobilePortrait() ? PORTRAIT_LOOK_BOOST : (mobileMode ? 1.06 : 1);
  return {
    BUILD_ID,
    BASE_MOBILE_TURN_SENS,
    PORTRAIT_LOOK_BOOST,
    FEEL2_PORTRAIT_LOOK_SOFTEN: BUILD_ID === 'feel2' || BUILD_ID === 'authoredd1bitmap1' || BUILD_ID === 'walltextures1' || BUILD_ID === 'walltextures2' || BUILD_ID === 'walltextures3' || BUILD_ID === 'walltextures4' || BUILD_ID === 'decalintegration1' || BUILD_ID === 'decalintegration2' || BUILD_ID === 'decalintegration3' || BUILD_ID === 'decalintegration4' ? FEEL2_PORTRAIT_LOOK_SOFTEN : null,
    portraitLookMultiplier: mult,
    effectiveMobileLookSens: optSens * mult,
    feel1PortraitMultiplier: feel1Mult,
    percentReductionVsFeel1Portrait: BUILD_ID === 'feel2' || BUILD_ID === 'authoredd1bitmap1' || BUILD_ID === 'walltextures1' || BUILD_ID === 'walltextures2' || BUILD_ID === 'walltextures3' || BUILD_ID === 'walltextures4' || BUILD_ID === 'decalintegration1' || BUILD_ID === 'decalintegration2' || BUILD_ID === 'decalintegration3' || BUILD_ID === 'decalintegration4' ? Math.round((1 - FEEL2_PORTRAIT_LOOK_SOFTEN) * 1000) / 10 : 0,
    mobileTurnSens: optSens,
    lookSpeed: options.lookSpeed,
  };
}
function lookSpeedLabel(v){ const n=Number(v)||1; return (Number.isInteger(n)?n.toFixed(1):String(n)) + 'x'; }
function percentLabel(v){ return Math.round((Number(v)||0)*100)+'%'; }
function layoutCssSize(){
  const vv = window.visualViewport;
  let cw = Math.round((vv && vv.width) || innerWidth || view.width || 0);
  let ch = Math.round((vv && vv.height) || innerHeight || view.height || 0);
  if(mobileMode && (_forcePortraitLayout || isOrientationPortrait()) && cw > ch){
    const t = cw; cw = ch; ch = t;
  }
  return { cw, ch };
}
let _safeProbeEl;
let _crSafeAreaCache = null;
function crInvalidateSafeAreaCache(reason){
  _crSafeAreaCache = null;
  _crMobileUiStats.safeAreaInvalidations++;
  _crMobileUiStats.safeAreaRevision++;
  crMarkMobileLayoutDirty(reason || 'safe-area-invalidated');
}
/** Resolved safe-area insets (px). env() probe; 0 on desktop. CARD 6. */
function readSafeAreaInsets(){
  if(_crSafeAreaCache){
    _crMobileUiStats.safeAreaCacheHits++;
    return _crSafeAreaCache;
  }
  if(!_safeProbeEl){
    _safeProbeEl = document.createElement('div');
    _safeProbeEl.id = 'safeprobe';
    _safeProbeEl.setAttribute('aria-hidden','true');
    _safeProbeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
    document.body.appendChild(_safeProbeEl);
  }
  _crMobileUiStats.safeAreaReads++;
  const s = getComputedStyle(_safeProbeEl);
  const px = side => parseFloat(s['padding'+side]) || 0;
  _crSafeAreaCache = Object.freeze({ top: px('Top'), right: px('Right'), bottom: px('Bottom'), left: px('Left') });
  return _crSafeAreaCache;
}
function syncPortraitMenuLabel(){
  const mportmenu = document.getElementById('mportmenu');
  if(!mportmenu) return;
  const want = `<span class="mportmenu-t">MENU</span><span class="mportmenu-b">${BUILD_ID}</span>`;
  crWriteHtml(mportmenu, want);
}
function isMobilePortrait(){
  if(!mobileInputActive()) return false;
  if(_forcePortraitLayout) return true;
  const { cw, ch } = layoutCssSize();
  if(ch > cw) return true;
  return isOrientationPortrait();
}
function sanitizeRunnerName(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9 _\-.!]/g,'').replace(/\s+/g,' ').trim().slice(0,16) || 'RUNNER'; }
function editRunnerName(){
  const old = profile.name || 'RUNNER';
  let raw = old;
  try { raw = prompt('Enter runner name', old); } catch(e){ raw = old; }
  if(raw === null || raw === undefined) return old;
  profile.name = sanitizeRunnerName(raw);
  nameInput = profile.name;
  profile.save();
  drawMobileMenu();
  return profile.name;
}
function mobileSprintCost(){ return 20; }
function mobileSprintBurstSec(){ return 0.65 + Math.min(0.25, (player.upgrades.sprint||0)*0.08); }
function applyMobileControlSettings(){
  const requestedLayoutKey = typeof crBuildMobileLayoutKey === 'function' ? crBuildMobileLayoutKey() : '';
  if(requestedLayoutKey && !_crMobileLayoutDirty && requestedLayoutKey === _crLastMobileLayoutKey) return false;
  _crMobileUiStats.layoutFlushes++;
  const ids=['ml','mlookpad','mg','ms','mm','mp'];
  const els=ids.map(id=>document.getElementById(id)).filter(Boolean);
  const joySize = Number(options.joySizePx)||110;
  const btnSize = Number(options.buttonSizePx)||85;
  const alpha = Number(options.controlOpacityValue)||0.60;
  const portrait = isMobilePortrait();
  const ml=document.getElementById('ml'), mr=document.getElementById('mr'), mg=document.getElementById('mg'), ms=document.getElementById('ms');
  const mm=document.getElementById('mm'), mp=document.getElementById('mp');
  const mlookpad=document.getElementById('mlookpad');
  function placeRect(el, rect){
    if(!el || !rect) return;
    crWriteStyle(el, 'left', rect.left + 'px');
    crWriteStyle(el, 'top', rect.top + 'px');
    crWriteStyle(el, 'right', 'auto');
    crWriteStyle(el, 'bottom', 'auto');
    crWriteStyle(el, 'width', rect.width + 'px');
    crWriteStyle(el, 'height', rect.height + 'px');
    crWriteStyle(el, 'transform', 'none');
  }
  if(portrait){
    const L = portraitLayout();
    const mob = document.getElementById('mob');
    const mportmenu = document.getElementById('mportmenu');
    placeRect(ml, L.moveRect);
    placeRect(mg, L.giveRect);
    placeRect(ms, L.sprintRect);
    placeRect(mlookpad, L.lookRect);
    placeRect(mportmenu, L.menuRect);
    syncPortraitMenuLabel();
    if(mg) crWriteStyle(mg, 'fontSize', Math.max(9, Math.round(L.giveRect.width * 0.15)) + 'px');
    if(ms){ crWriteStyle(ms, 'fontSize', Math.max(8, Math.round(L.sprintRect.width * 0.14)) + 'px'); crWriteStyle(ms, 'zIndex', '19'); }
    if(mlookpad){ crWriteStyle(mlookpad, 'zIndex', '16'); crWriteStyle(mlookpad, 'fontSize', Math.max(8, Math.round(L.lookRect.width * 0.09)) + 'px'); }
    crToggleClass(mportmenu, 'por-show', true);
    crToggleClass(mob, 'portrait-hide-map', true);
    if(mm){ crWriteStyle(mm, 'display', 'none'); crWriteStyle(mm, 'pointerEvents', 'none'); }
    if(mp){ crWriteStyle(mp, 'display', 'none'); crWriteStyle(mp, 'pointerEvents', 'none'); }
  } else {
    const sa = readSafeAreaInsets();
    const mob = document.getElementById('mob');
    const mportmenu = document.getElementById('mportmenu');
    crToggleClass(mportmenu, 'por-show', false);
    crToggleClass(mob, 'portrait-hide-map', false);
    if(mm){ crWriteStyle(mm, 'display', ''); crWriteStyle(mm, 'pointerEvents', ''); }
    if(ml){
      crWriteStyle(ml, 'width', joySize+'px'); crWriteStyle(ml, 'height', joySize+'px'); crWriteStyle(ml, 'left', (20+sa.left)+'px');
      const yOff = Number(options.controlsYOffsetPx) || 0;
      crWriteStyle(ml, 'bottom', (Math.max(8, 30 - yOff) + sa.bottom) + 'px');
      crWriteStyle(ml, 'top', 'auto'); crWriteStyle(ml, 'right', 'auto'); crWriteStyle(ml, 'transform', 'none');
    }
    const lookSize = Math.min(240, Math.max(64, Math.round(Number(options.lookSizePx) || joySize * 0.72)));
    const yOffL = Number(options.controlsYOffsetPx) || 0;
    if(mlookpad){
      crWriteStyle(mlookpad, 'width', lookSize + 'px');
      crWriteStyle(mlookpad, 'height', lookSize + 'px');
      crWriteStyle(mlookpad, 'left', 'auto');
      crWriteStyle(mlookpad, 'right', (16 + sa.right) + 'px');
      crWriteStyle(mlookpad, 'bottom', (Math.max(8, 24 - yOffL) + sa.bottom) + 'px');
      crWriteStyle(mlookpad, 'top', 'auto');
      crWriteStyle(mlookpad, 'transform', 'none');
      crWriteStyle(mlookpad, 'opacity', '1');
      crWriteStyle(mlookpad, 'background', 'rgba(200,150,60,0.35)');
      crWriteStyle(mlookpad, 'border', '2px solid rgba(220,190,100,0.80)');
      crWriteStyle(mlookpad, 'color', '#e9d8b0');
    }
    [mg,ms].forEach(el=>{ if(el){ crWriteStyle(el, 'width', btnSize+'px'); crWriteStyle(el, 'height', btnSize+'px'); crWriteStyle(el, 'fontSize', Math.max(9,Math.round(btnSize*0.15))+'px'); crWriteStyle(el, 'left', 'auto'); crWriteStyle(el, 'right', (20+sa.right)+'px'); }});
    if(mg){ crWriteStyle(mg, 'top', '42%'); crWriteStyle(mg, 'bottom', 'auto'); crWriteStyle(mg, 'transform', 'translateY(calc(-50% + '+(-yOffL)+'px))'); }
    if(ms){ crWriteStyle(ms, 'top', '68%'); crWriteStyle(ms, 'right', (30+sa.right)+'px'); crWriteStyle(ms, 'transform', 'translateY(calc(-50% + '+(-yOffL)+'px))'); }
    if(mm){ crWriteStyle(mm, 'width', Math.round(btnSize*0.78)+'px'); crWriteStyle(mm, 'height', Math.round(btnSize*0.55)+'px'); crWriteStyle(mm, 'right', (8+sa.right)+'px'); crWriteStyle(mm, 'top', (12+sa.top)+'px'); crWriteStyle(mm, 'left', 'auto'); crWriteStyle(mm, 'bottom', 'auto'); crWriteStyle(mm, 'transform', 'none'); }
    if(mp){ crWriteStyle(mp, 'display', 'none'); crWriteStyle(mp, 'pointerEvents', 'none'); }
  }
  if(mr){
    if(portrait){
      crWriteStyle(mr, 'pointerEvents', 'none');
      crWriteStyle(mr, 'display', 'none');
    } else {
      crWriteStyle(mr, 'display', 'flex');
      crWriteStyle(mr, 'pointerEvents', 'auto');
      crWriteStyle(mr, 'top', '0'); crWriteStyle(mr, 'right', '0'); crWriteStyle(mr, 'bottom', 'auto'); crWriteStyle(mr, 'width', '50vw'); crWriteStyle(mr, 'height', 'var(--app-vh-px)');
    }
  }
  {
    const h = document.getElementById('mlookhint');
    if(h){ crWriteStyle(h, 'display', portrait ? 'none' : ''); }
  }
  if(mlookpad && portrait){
    crWriteStyle(mlookpad, 'opacity', '1');
    crWriteStyle(mlookpad, 'background', 'rgba(200,150,60,0.35)');
    crWriteStyle(mlookpad, 'border', '2px solid rgba(220,190,100,0.80)');
    crWriteStyle(mlookpad, 'color', '#e9d8b0');
  }
  els.forEach(el=>{ crWriteStyle(el, 'opacity', String(alpha)); });
  updateJoyDot(joy.x||0, joy.y||0);
  if(_controlEditActive) crSyncControlEditSelectionUI();
  _crMobileLayoutDirty = false;
  if(typeof crBuildMobileLayoutKey === 'function'){
    _crLastMobileLayoutKey = crBuildMobileLayoutKey();
    _crMobileUiStats.lastLayoutKey = _crLastMobileLayoutKey;
  }
  return true;
}

function dismissLookHint(){
  if(lookHintUsed) return;
  lookHintUsed = true;
  const h = document.getElementById('mlookhint');
  if(!h) return;
  crToggleClass(h, 'hide', true);
  crWriteStyle(h, 'opacity', '0');
  crWriteStyle(h, 'display', 'none');
}
let _crLookHintTimer = null;
function syncLookHintUI(){
  const h = document.getElementById('mlookhint');
  if(!h) return;
  const inPlay = mobileMode && state===STATE.PLAY && !paused;
  crWriteStyle(h, 'display', (inPlay && !lookHintUsed && !isMobilePortrait()) ? 'block' : 'none');
  if(!inPlay) return;
  crToggleClass(h, 'hide', !!lookHintUsed);
  crWriteStyle(h, 'opacity', lookHintUsed ? '0' : '1');
  if(!lookHintUsed && lookHintShownAt && !_crLookHintTimer){
    const remaining = Math.max(0, LOOK_HINT_TIMEOUT_MS - (performance.now() - lookHintShownAt));
    _crLookHintTimer = setTimeout(() => {
      _crLookHintTimer = null;
      if(!lookHintUsed){ dismissLookHint(); crMarkMobileUiDirty('look-hint-timeout'); }
    }, remaining);
  }
}

function isMobile(){
  if(mobileOverride==='on') return true;
  if(mobileOverride==='off') return false;
  return matchMedia('(pointer: coarse)').matches && innerWidth < 1100;
}
function setMobileMode(on){
  if(on===mobileMode) return;
  mobileMode = on;
  crMarkMobileLayoutDirty('mobile-mode-change');
  const mob = document.getElementById('mob');
  crToggleClass(mob, 'show', on);
  applyMobileControlSettings();
  // Fullscreen/landscape is optional; never gate play behind a recommendation screen.
  const ph = document.getElementById('porthint');
  if(ph) ph.classList.remove('show');
}

// Event-driven invalidation. Existing handlers continue to own canvas resizing;
// these listeners only invalidate Lane C caches and dirty state.
addEventListener('resize', () => {
  crInvalidateSafeAreaCache('resize');
  crMarkMobileLayoutDirty('resize');
}, { passive: true });
addEventListener('orientationchange', () => {
  crInvalidateSafeAreaCache('orientationchange');
  crMarkMobileLayoutDirty('orientationchange');
}, { passive: true });
['fullscreenchange','webkitfullscreenchange','msfullscreenchange'].forEach(ev => {
  document.addEventListener(ev, () => {
    crInvalidateSafeAreaCache(ev);
    crMarkMobileLayoutDirty(ev);
  });
});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', () => {
    crInvalidateSafeAreaCache('visual-viewport-resize');
    crMarkMobileLayoutDirty('visual-viewport-resize');
  }, { passive: true });
  window.visualViewport.addEventListener('scroll', () => {
    crInvalidateSafeAreaCache('visual-viewport-scroll');
    crMarkMobileLayoutDirty('visual-viewport-scroll');
  }, { passive: true });
}
addEventListener('storage', e => {
  if(!e || e.key === CR_CONTROLS_LS_KEY || e.key === null){
    crInvalidateControlOverrideCache('control-override-storage');
  }
  crMarkMobileUiDirty('storage-event');
});
function triggerMobileSprintBurst(){
  const ms = ms_element || document.getElementById('ms');
  const nowSec = performance.now()/1000;
  const cost = mobileSprintCost();
  if(nowSec < sprintBurstUntil) return { fired: false, reason: 'cooldown' };
  if(player.stamina >= cost){
    const stamBefore = player.stamina;
    player.stamina = Math.max(0, player.stamina - cost);
    sprintBurstUntil = nowSec + mobileSprintBurstSec();
    if(ms) ms.classList.add('pr');
    return { fired: true, stamBefore, stamAfter: player.stamina, until: sprintBurstUntil };
  }
  if(ms){ ms.classList.add('pr'); setTimeout(()=>ms.classList.remove('pr'), 120); }
  crTriggerSoundCue('sprintDenied');
  return { fired: false, reason: 'no-stamina' };
}
/**
 * Pointer Events are the authoritative mobile route when available.  Chrome
 * aligns and coalesces continuous Pointer Events, so consume its coalesced
 * samples here rather than maintaining a competing Touch Events path.
 */
function crPointerSamples(event){
  try {
    if(event && typeof event.getCoalescedEvents === 'function'){
      const samples = event.getCoalescedEvents();
      if(samples && samples.length) return Array.from(samples);
    }
  } catch(_e){}
  return event ? [event] : [];
}
function bindMobileControls(){
  const ml = document.getElementById('ml');
  const mr = document.getElementById('mr');
  const mg = document.getElementById('mg');
  const ms = document.getElementById('ms');
  const mmin = document.getElementById('mm');
  const mpa = document.getElementById('mp');
  const mportmenu = document.getElementById('mportmenu');
  const rmenu = document.getElementById('rmenu');
  ms_element = ms;
  const hasPointerEvents = typeof window.PointerEvent === 'function';
  // Do not register both APIs.  In Pointer-capable Chrome, legacy Touch
  // listeners turn the document into a non-fast-scrollable input route.
  const onMobileInput = (target, type, listener, options)=>{
    const isPointer = type.indexOf('pointer') === 0;
    if(isPointer !== hasPointerEvents) return;
    target.addEventListener(type, listener, options);
  };

  // ---- left joystick zone (pointer capture + element touchmove for WebViews) ----
  const beginJoy = (id, ptrId, cx, cy)=>{
    joy.id = id; joy.ptrId = ptrId; joy.active = true;
    joy.sx = cx; joy.sy = cy;
    applyJoyFromClient(cx, cy);
    dismissLookHint();
  };
  const endJoy = ()=>{
    joy.active=false; joy.id=null; joy.ptrId=null;
    joy.x=0; joy.y=0; joy.dist=0;
    clearMoveInput();
    updateJoyDot(0,0);
  };
  onMobileInput(ml, 'pointerdown', e=>{
    if(_controlEditActive) return;
    if(joy.active && joy.ptrId !== e.pointerId) return;
    e.preventDefault(); e.stopPropagation();
    try{ ml.setPointerCapture(e.pointerId); }catch(_e){}
    beginJoy(e.pointerId, e.pointerId, e.clientX, e.clientY);
  },{passive:false});
  onMobileInput(ml, 'pointermove', e=>{
    if(!joy.active || joy.ptrId !== e.pointerId) return;
    e.preventDefault(); e.stopPropagation();
    for(const sample of crPointerSamples(e)) applyJoyFromClient(sample.clientX, sample.clientY);
  },{passive:false});
  const joyPtrUp = e=>{
    if(joy.ptrId !== e.pointerId) return;
    e.preventDefault(); e.stopPropagation();
    try{ ml.releasePointerCapture(e.pointerId); }catch(_e){}
    endJoy();
  };
  onMobileInput(ml, 'pointerup', joyPtrUp, {passive:false});
  onMobileInput(ml, 'pointercancel', joyPtrUp, {passive:false});
  onMobileInput(ml, 'touchstart', e=>{
    e.preventDefault(); e.stopPropagation();
    const t = e.changedTouches[0];
    if(joy.active && joy.id !== null && joy.id !== t.identifier) return;
    beginJoy(t.identifier, null, t.clientX, t.clientY);
  },{passive:false});
  onMobileInput(ml, 'touchmove', e=>{
    if(!joy.active) return;
    for(const t of e.changedTouches){
      if(t.identifier !== joy.id) continue;
      e.preventDefault(); e.stopPropagation();
      applyJoyFromClient(t.clientX, t.clientY);
    }
  },{passive:false});
  onMobileInput(ml, 'touchend', e=>{
    for(const t of e.changedTouches){
      if(t.identifier === joy.id){ e.preventDefault(); e.stopPropagation(); endJoy(); }
    }
  },{passive:false});
  onMobileInput(ml, 'touchcancel', e=>{
    for(const t of e.changedTouches){
      if(t.identifier === joy.id){ e.preventDefault(); e.stopPropagation(); endJoy(); }
    }
  },{passive:false});

  // ---- right turn zone (landscape) ----
  onMobileInput(mr, 'touchstart', e=>{
    if(isMobilePortrait()) return; // guard: portrait uses mlookpad instead
    e.preventDefault(); e.stopPropagation();
    const t = e.changedTouches[0];
    tzone.id = t.identifier; tzone.active = true; tzone.lastX = t.clientX;
  },{passive:false});

  // ---- dedicated LOOK circle (#mlookpad) — works in BOTH portrait and landscape ----
  const lpad = document.getElementById('mlookpad');
  let lpadMousePtr = null;
  let lpadTouchPtr = null;
  const clearLpadPtr = (pid)=>{
    if(lpadMousePtr && lpadMousePtr.id === pid) lpadMousePtr = null;
    if(lpadTouchPtr && lpadTouchPtr.id === pid){
      lpadTouchPtr = null;
      lookTouch.id = null;
      lookTouch.lastX = 0;
    }
    if(!lpadMousePtr && !lpadTouchPtr) lpad.classList.remove('pr');
  };

  onMobileInput(lpad, 'pointerdown', e=>{
    if(_controlEditActive) return;
    e.preventDefault(); e.stopPropagation();
    if(e.pointerType === 'touch' || e.pointerType === 'pen'){
      if(lpadTouchPtr && lpadTouchPtr.id !== e.pointerId) return;
      try{ lpad.setPointerCapture(e.pointerId); }catch(_e){}
      lpadTouchPtr = { id: e.pointerId, lastX: e.clientX };
      lookTouch.id = e.pointerId;
      lookTouch.lastX = e.clientX;
      lpad.classList.add('pr');
      dismissLookHint();
      return;
    }
    if(e.pointerType === 'mouse'){
      lpadMousePtr = { id: e.pointerId, startX: e.clientX };
      lpad.classList.add('pr');
      dismissLookHint();
    }
  },{passive:false});

  onMobileInput(lpad, 'pointermove', e=>{
    if(state!==STATE.PLAY || paused) return;
    if(lpadTouchPtr && e.pointerId === lpadTouchPtr.id){
      e.preventDefault(); e.stopPropagation();
      for(const sample of crPointerSamples(e)){
        const dx = sample.clientX - lpadTouchPtr.lastX;
        if(crApplyLookPadDx(dx, sample.timeStamp)){
          lpadTouchPtr.lastX = sample.clientX;
          lookTouch.lastX = sample.clientX;
        }
      }
      return;
    }
    if(e.pointerType === 'touch') return;
    if(!lpadMousePtr || e.pointerId !== lpadMousePtr.id) return;
    e.preventDefault(); e.stopPropagation();
    const dx = e.clientX - lpadMousePtr.startX;
    if(crApplyLookPadDx(dx, e.timeStamp)) lpadMousePtr.startX = e.clientX;
  },{passive:false});

  onMobileInput(lpad, 'pointerup', e=>{
    e.preventDefault(); e.stopPropagation();
    try{ lpad.releasePointerCapture(e.pointerId); }catch(_e){}
    clearLpadPtr(e.pointerId);
  },{passive:false});
  onMobileInput(lpad, 'pointercancel', e=>{
    e.preventDefault(); e.stopPropagation();
    try{ lpad.releasePointerCapture(e.pointerId); }catch(_e){}
    clearLpadPtr(e.pointerId);
  },{passive:false});

  onMobileInput(lpad, 'touchstart', e=>{
    e.preventDefault(); e.stopPropagation();
    for(const t of e.changedTouches){
      if(lookTouch.id !== null && lookTouch.id !== t.identifier) continue;
      lookTouch.id = t.identifier;
      lookTouch.lastX = t.clientX;
      lpad.classList.add('pr');
      dismissLookHint();
      break;
    }
  },{passive:false});
  onMobileInput(lpad, 'touchcancel', e=>{
    for(const t of e.changedTouches){
      if(t.identifier === lookTouch.id){
        lookTouch.id = null; lookTouch.lastX = 0;
        lpad.classList.remove('pr');
      }
    }
  },{passive:false});

  // ---- unified pointer look for landscape #mr ----
  // Use pointer events so both touch and mouse work on #mr in landscape.
  let mrPtr = null; // {id, startX}
  onMobileInput(mr, 'pointerdown', e=>{
    if(isMobilePortrait()) return;
    if(e.pointerType === 'mouse' && !mobileMode) return;
    if(mrPtr && mrPtr.id !== e.pointerId) return;
    e.preventDefault(); e.stopPropagation();
    mrPtr = { id: e.pointerId, startX: e.clientX };
    try{ mr.setPointerCapture(e.pointerId); }catch(_e){}
    dismissLookHint();
  },{passive:false});

  onMobileInput(mr, 'pointermove', e=>{
    if(!mrPtr || e.pointerId !== mrPtr.id) return;
    if(state!==STATE.PLAY || paused) return;
    e.preventDefault(); e.stopPropagation();
    for(const sample of crPointerSamples(e)){
      const dx = sample.clientX - mrPtr.startX;
      if(Math.abs(dx) > 0.5){
        mrPtr.startX = sample.clientX;
        if(state===STATE.PLAY && !paused){
          crApplyRawTouchLookDelta(dx * mobileLookSens(), sample.timeStamp);
        }
      }
    }
  },{passive:false});

  const clearMrPtr = e=>{
    if(!mrPtr || e.pointerId !== mrPtr.id) return;
    e.preventDefault(); e.stopPropagation();
    try{ mr.releasePointerCapture(e.pointerId); }catch(_e){}
    mrPtr=null;
  };
  onMobileInput(mr, 'pointerup', clearMrPtr,{passive:false});
  onMobileInput(mr, 'pointercancel', clearMrPtr,{passive:false});

  // ---- GIVE button ----
  onMobileInput(mg, 'touchstart', e=>{
    if(_controlEditActive) return;
    e.preventDefault(); e.stopPropagation();
    inp.give = true; mg.classList.add('pr');
  },{passive:false});
  onMobileInput(mg, 'touchend', e=>{
    e.preventDefault(); e.stopPropagation();
    inp.give = false; mg.classList.remove('pr');
  },{passive:false});
  const givePtrDown = e=>{ if(_controlEditActive) return; e.preventDefault(); e.stopPropagation(); inp.give = true; mg.classList.add('pr'); };
  const givePtrUp = e=>{ if(_controlEditActive) return; e.preventDefault(); e.stopPropagation(); inp.give = false; mg.classList.remove('pr'); };
  onMobileInput(mg, 'pointerdown', givePtrDown, {passive:false});
  onMobileInput(mg, 'pointerup', givePtrUp, {passive:false});
  onMobileInput(mg, 'pointercancel', givePtrUp, {passive:false});

  // ---- SPRINT button (mobile: burst tap; desktop: Shift still works as hold) ----
  const sprintTap = e=>{
    if(_controlEditActive) return;
    e.preventDefault(); e.stopPropagation();
    triggerMobileSprintBurst();
  };
  onMobileInput(ms, 'touchstart', sprintTap,{passive:false});
  onMobileInput(ms, 'pointerdown', sprintTap,{passive:false});
  onMobileInput(ms, 'pointerup', e=>{ e.preventDefault(); e.stopPropagation(); },{passive:false});
  onMobileInput(ms, 'pointercancel', e=>{ e.preventDefault(); e.stopPropagation(); ms.classList.remove('pr'); },{passive:false});
  onMobileInput(ms, 'touchend', e=>{
    e.preventDefault(); e.stopPropagation();
    // Do NOT cancel burst on touchend — it runs its course
  },{passive:false});

  // ---- MAP button ----
  onMobileInput(mmin, 'touchstart', e=>{
    e.preventDefault(); e.stopPropagation();
    inp.map = true; mmin.classList.add('pr');
  },{passive:false});
  onMobileInput(mmin, 'touchend', e=>{
    e.preventDefault(); e.stopPropagation();
    inp.map = false; mmin.classList.remove('pr');
  },{passive:false});
  const mapPtrDown = e=>{ e.preventDefault(); e.stopPropagation(); inp.map = true; mmin.classList.add('pr'); };
  const mapPtrUp = e=>{ e.preventDefault(); e.stopPropagation(); inp.map = false; mmin.classList.remove('pr'); };
  onMobileInput(mmin, 'pointerdown', mapPtrDown,{passive:false});
  onMobileInput(mmin, 'pointerup', mapPtrUp,{passive:false});
  onMobileInput(mmin, 'pointercancel', mapPtrUp,{passive:false});

  // ---- PAUSE button (desktop landscape only; hidden on all phone UI) ----
  onMobileInput(mpa, 'touchstart', e=>{
    if(mobileMode) return;
    e.preventDefault(); e.stopPropagation();
    inp.pause = true; mpa.classList.add('pr');
  },{passive:false});
  onMobileInput(mpa, 'touchend', e=>{
    if(mobileMode) return;
    e.preventDefault(); e.stopPropagation();
    inp.pause = false; mpa.classList.remove('pr');
  },{passive:false});
  const pausePtrDown = e=>{ if(mobileMode) return; e.preventDefault(); e.stopPropagation(); inp.pause = true; mpa.classList.add('pr'); };
  const pausePtrUp = e=>{ if(mobileMode) return; e.preventDefault(); e.stopPropagation(); inp.pause = false; mpa.classList.remove('pr'); };
  onMobileInput(mpa, 'pointerdown', pausePtrDown,{passive:false});
  onMobileInput(mpa, 'pointerup', pausePtrUp,{passive:false});
  onMobileInput(mpa, 'pointercancel', pausePtrUp,{passive:false});
  if(mportmenu){
    const openPauseFromMenu = ()=>{
      if(state!==STATE.PLAY) return;
      if(onboardingOpen){
        onboardingOpen = false;
        syncOnboardingPanel();
      }
      if(!paused){
        clearInputState();
        paused=true; SAVE.save(); crTriggerSoundCue('menuHelp');
        crResetPauseRenderHistory('pause-entry');
        drawMobileMenu();
      }
    };
    onMobileInput(mportmenu, 'touchstart', e=>{
      e.preventDefault(); e.stopPropagation();
      mportmenu.classList.add('pr');
    },{passive:false});
    onMobileInput(mportmenu, 'touchend', e=>{
      e.preventDefault(); e.stopPropagation();
      mportmenu.classList.remove('pr');
      openPauseFromMenu();
    },{passive:false});
    onMobileInput(mportmenu, 'touchcancel', e=>{
      e.preventDefault(); e.stopPropagation();
      mportmenu.classList.remove('pr');
    },{passive:false});
    const menuPtrDown = e=>{ e.preventDefault(); e.stopPropagation(); mportmenu.classList.add('pr'); };
    const menuPtrUp = e=>{
      e.preventDefault(); e.stopPropagation();
      mportmenu.classList.remove('pr');
      openPauseFromMenu();
    };
    const menuPtrCancel = e=>{ e.preventDefault(); e.stopPropagation(); mportmenu.classList.remove('pr'); };
    onMobileInput(mportmenu, 'pointerdown', menuPtrDown,{passive:false});
    onMobileInput(mportmenu, 'pointerup', menuPtrUp,{passive:false});
    onMobileInput(mportmenu, 'pointercancel', menuPtrCancel,{passive:false});
    mportmenu.addEventListener('click', e=>{
      e.preventDefault(); e.stopPropagation();
      openPauseFromMenu();
    });
  }
  const clearHeldButtons=()=>{
    inp.give=false; inp.sprint=false; inp.map=false; inp.pause=false;
    [mg,ms,mmin,mpa,mportmenu].forEach(el=>{ if(el) el.classList.remove('pr'); });
  };
  [mg,ms,mmin,mpa,mportmenu].forEach(el=>{ if(!el) return; onMobileInput(el, 'touchcancel', e=>{
    e.preventDefault(); e.stopPropagation(); clearHeldButtons();
  },{passive:false}); });
  [mg,ms,mmin,mpa,mportmenu].forEach(el=>{ if(!el) return; onMobileInput(el, 'pointercancel', e=>{
    e.preventDefault(); e.stopPropagation(); clearHeldButtons();
  },{passive:false}); });

  // ---- global touchmove: route joystick, landscape turn zone, LOOK circle (multi-touch) ----
  onMobileInput(document, 'touchmove', e=>{
    let handled = false;
    const track = e.touches && e.touches.length ? e.touches : e.changedTouches;
    for(const t of track){
      if(t.identifier === joy.id && joy.active){
        handled = true;
        applyJoyFromClient(t.clientX, t.clientY);
      }
      if(t.identifier === tzone.id && tzone.active){
        handled = true;
        const dx = t.clientX - tzone.lastX;
        tzone.lastX = t.clientX;
        if(state===STATE.PLAY && !paused){
          if(Math.abs(dx) > 2) dismissLookHint();
          crApplyRawTouchLookDelta(dx * mobileLookSens(), e.timeStamp);
        }
      }
      if(lookTouch.id !== null && t.identifier === lookTouch.id){
        handled = true;
        if(state===STATE.PLAY && !paused){
          // Pointer capture on #mlookpad owns touch/pen drags; skip doc touchmove dup (Chrome Android).
          if(lpadTouchPtr === null){
            const dx = t.clientX - lookTouch.lastX;
            if(crApplyLookPadDx(dx, e.timeStamp)){
              lookTouch.lastX = t.clientX;
            }
          }
        }
      }
    }
    if(handled) e.preventDefault();
  },{passive:false});

  onMobileInput(document, 'touchend', e=>{
    for(const t of e.changedTouches){
      if(t.identifier === joy.id){ endJoy(); }
      if(t.identifier === tzone.id){ tzone.active=false; tzone.id=null; }
      if(t.identifier === lookTouch.id){
        lookTouch.id = null; lookTouch.lastX = 0;
        const lpadEl = document.getElementById('mlookpad');
        if(lpadEl) lpadEl.classList.remove('pr');
      }
    }
  },{passive:false});

  onMobileInput(document, 'touchcancel', e=>{
    for(const t of e.changedTouches){
      if(t.identifier === joy.id){ endJoy(); }
      if(t.identifier === tzone.id){ tzone.active=false; tzone.id=null; }
      if(t.identifier === lookTouch.id){
        lookTouch.id = null; lookTouch.lastX = 0;
        const lpadEl = document.getElementById('mlookpad');
        if(lpadEl) lpadEl.classList.remove('pr');
      }
    }
  },{passive:false});

  const portplay = document.getElementById('portplay');
  if(portplay){
    portplay.addEventListener('click', e=>{
      e.preventDefault();
      document.getElementById('porthint').classList.remove('show');
    });
  }

  // ---- in-game fullscreen toggle button ----
  const fsbtn = document.getElementById('fsbtn');
  if(fsbtn){
    const fsAction = e=>{ e.preventDefault(); e.stopPropagation(); toggleFullscreen(); };
    onMobileInput(fsbtn, 'touchstart', fsAction, {passive:false});
    onMobileInput(fsbtn, 'pointerdown', fsAction, {passive:false});
    fsbtn.addEventListener('click', fsAction);
  }

  // ---- responsive menu: touch-to-select on rmenu items ----
  // Mobile frame loop may redraw rmenu between touchstart and touchend.
  // Store the selected action at touchstart so the tap survives DOM rebuilds.
  rmenu._touchAction = '';
  onMobileInput(rmenu, 'touchstart', e=>{
    const el = e.target.closest('.rit');
    if(!el) return;
    e.preventDefault();
    e.stopPropagation();
    rmenu._touchAction = el.dataset.action || '';
    rmenu._touchStartY = e.changedTouches[0] ? e.changedTouches[0].clientY : 0;
    rmenu.querySelectorAll('.rit').forEach(r=>r.classList.remove('sel'));
    el.classList.add('sel');
  },{passive:false, capture:true});
  onMobileInput(rmenu, 'touchend', e=>{
    if(!rmenu._touchAction) return;
    e.preventDefault();
    e.stopPropagation();
    const action = rmenu._touchAction;
    const dy = e.changedTouches[0] ? Math.abs(e.changedTouches[0].clientY - (rmenu._touchStartY||0)) : 0;
    rmenu._touchAction = '';
    rmenu._touchStartY = 0;
    rmenu.querySelectorAll('.rit').forEach(r=>r.classList.remove('sel'));
    if(dy > 28) return;
    rmenu._lastClickAction = action;
    rmenu._lastClickAt = performance.now();
    rmenuAction(action);
  },{passive:false, capture:true});
  onMobileInput(rmenu, 'touchcancel', e=>{
    rmenu._touchAction = '';
    rmenu.querySelectorAll('.rit').forEach(r=>r.classList.remove('sel'));
  },{passive:false});
  onMobileInput(rmenu, 'pointerdown', e=>{
    const el = e.target.closest('.rit');
    if(!el) return;
    e.preventDefault(); e.stopPropagation();
    rmenu._touchAction = el.dataset.action || '';
    rmenu._touchStartY = e.clientY;
    rmenu.querySelectorAll('.rit').forEach(r=>r.classList.remove('sel'));
    el.classList.add('sel');
  },{passive:false, capture:true});
  onMobileInput(rmenu, 'pointerup', e=>{
    if(!rmenu._touchAction) return;
    e.preventDefault(); e.stopPropagation();
    const action = rmenu._touchAction;
    const dy = Math.abs(e.clientY - (rmenu._touchStartY||0));
    rmenu._touchAction = '';
    rmenu._touchStartY = 0;
    rmenu.querySelectorAll('.rit').forEach(r=>r.classList.remove('sel'));
    if(dy > 28) return;
    rmenu._lastClickAction = action;
    rmenu._lastClickAt = performance.now();
    rmenuAction(action);
  },{passive:false, capture:true});
  onMobileInput(rmenu, 'pointercancel', e=>{
    rmenu._touchAction = '';
    rmenu.querySelectorAll('.rit').forEach(r=>r.classList.remove('sel'));
  },{passive:false});
  rmenu.addEventListener('click', e=>{
    const el = e.target.closest('.rit');
    if(!el || !el.dataset.action) return;
    e.preventDefault();
    e.stopPropagation();
    if(rmenu._lastClickAction === el.dataset.action && (performance.now() - (rmenu._lastClickAt||0)) < 450) return;
    rmenu._lastClickAction = el.dataset.action;
    rmenu._lastClickAt = performance.now();
    rmenuAction(el.dataset.action);
  });
}
function updateJoyDot(nx, ny){
  const dot = document.getElementById('mjdot');
  const joySize = (typeof options!=='undefined' && options.joySizePx) ? Number(options.joySizePx) : 110;
  const travel = Math.round(joySize*0.25);
  if(dot) crWriteStyle(dot, 'transform', `translate(calc(-50% + ${nx*travel}px), calc(-50% + ${ny*travel}px))`);
}
function clearMoveInput(){
  inp.fwd = false;
  inp.back = false;
  inp.left = false;
  inp.right = false;
  inp.turnLeft = false;
  inp.turnRight = false;
}
function syncInpFromJoy(){
  // joy.x/joy.y are already normalized signed axes: y=forward, x=right.
  // Reading axes directly is clearer and avoids atan2 quadrant mistakes.
  inp.fwd = joy.y > 0.25;
  inp.back = joy.y < -0.25;
  inp.left = joy.x < -0.25;
  inp.right = joy.x > 0.25;
}
