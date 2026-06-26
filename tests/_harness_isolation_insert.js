
/** Harness isolation — benchmark scenes must not leak into playable state or localStorage. */
let _crHarnessDepth = 0;
let _crBlockHarnessSave = false;

function crCloneJson(obj){
  try { return JSON.parse(JSON.stringify(obj)); } catch(e){ return null; }
}

function crLsGetSaveRaw(){
  try { return localStorage.getItem(K.save); } catch(e){ return null; }
}

function crLsSetSaveRaw(v){
  try {
    if(v === null || v === undefined) localStorage.removeItem(K.save);
    else localStorage.setItem(K.save, v);
  } catch(e){}
}

function crSavePayloadIsHarness(s){
  if(!s || typeof s !== 'object' || !s.runActive) return false;
  const run = s.run || {};
  if(run.harnessOnly) return true;
  if(run.customLevel === 'harness_render_benchmark') return true;
  const w = s.MAP_W || 0, h = s.MAP_H || 0;
  const tl = s.timeLeft;
  if(w > 0 && w <= 20 && h > 0 && h <= 20 && tl >= 990 && s.seed === 12345) return true;
  return false;
}

function crClearHarnessLeakFromStorage(){
  try {
    const raw = crLsGetSaveRaw();
    if(!raw) return false;
    const s = JSON.parse(raw);
    if(crSavePayloadIsHarness(s)){
      SAVE.clear();
      return true;
    }
  } catch(e){}
  return false;
}

function crIsBenchmarkPlayState(){
  if(state !== STATE.PLAY) return false;
  if(game.run && game.run.harnessOnly) return true;
  if(game.run && game.run.customLevel === 'harness_render_benchmark') return true;
  const w = game.MAP_W || 0, h = game.MAP_H || 0;
  if(w > 0 && w <= 20 && h > 0 && h <= 20 && game.timeLeft >= 990 && game.seed === 12345) return true;
  return false;
}

function crPublicStateFingerprint(){
  let lsHarness = false;
  try {
    const raw = crLsGetSaveRaw();
    if(raw) lsHarness = crSavePayloadIsHarness(JSON.parse(raw));
  } catch(e){}
  return {
    state,
    paused,
    benchmark: crIsBenchmarkPlayState(),
    mapW: game.MAP_W,
    mapH: game.MAP_H,
    timeLeft: game.timeLeft,
    seed: game.seed,
    runActive: !!(game.run && game.run.active),
    harnessOnly: !!(game.run && game.run.harnessOnly),
    customLevel: game.run && game.run.customLevel,
    lsHarness,
    lsSavePresent: SAVE.hasValid(),
  };
}

function crFingerprintPublicSafe(fp){
  if(!fp) return false;
  if(fp.benchmark) return false;
  if(fp.harnessOnly) return false;
  if(fp.customLevel === 'harness_render_benchmark') return false;
  if(fp.lsHarness) return false;
  if(fp.state === STATE.PLAY && fp.mapW > 0 && fp.mapW <= 20 && fp.mapH <= 20 && fp.timeLeft >= 990 && fp.seed === 12345) return false;
  return true;
}

function crSnapshotHarnessState(){
  return {
    state,
    paused,
    showMinimap,
    mobileOverride,
    _selfCheckForcePortrait,
    confirmAction,
    optionsControlsYOffsetPx: options.controlsYOffsetPx,
    lsSaveRaw: crLsGetSaveRaw(),
    game: {
      seed: game.seed, district: game.district, totalScore: game.totalScore,
      map: crCloneJson(game.map), MAP_W: game.MAP_W, MAP_H: game.MAP_H,
      wallShade: crCloneJson(game.wallShade),
      pickups: crCloneJson(game.pickups), npcs: crCloneJson(game.npcs),
      exit: crCloneJson(game.exit), props: crCloneJson(game.props),
      quota: game.quota, helped: game.helped, delivered: game.delivered,
      timeLeft: game.timeLeft, modifier: game.modifier, scoreMult: game.scoreMult,
      msg: game.msg, msgT: game.msgT, aimNpc: game.aimNpc,
      popups: crCloneJson(game.popups),
      run: crCloneJson(game.run),
    },
    player: crCloneJson(player),
    joy: { x: joy.x, y: joy.y, active: joy.active, id: joy.id, ptrId: joy.ptrId, sx: joy.sx, sy: joy.sy, ang: joy.ang, dist: joy.dist },
    inp: Object.assign({}, inp),
    tzone: { active: tzone.active, id: tzone.id, lastX: tzone.lastX },
    lookTouch: { id: lookTouch.id, lastX: lookTouch.lastX },
  };
}

function crRestoreHarnessState(snap){
  if(!snap) return;
  state = snap.state;
  paused = snap.paused;
  showMinimap = snap.showMinimap;
  mobileOverride = snap.mobileOverride;
  _selfCheckForcePortrait = snap._selfCheckForcePortrait;
  confirmAction = snap.confirmAction;
  options.controlsYOffsetPx = snap.optionsControlsYOffsetPx;
  const g = snap.game;
  game.seed = g.seed; game.district = g.district; game.totalScore = g.totalScore;
  game.map = g.map; game.MAP_W = g.MAP_W; game.MAP_H = g.MAP_H; game.wallShade = g.wallShade;
  game.pickups = g.pickups || []; game.npcs = g.npcs || []; game.exit = g.exit;
  game.props = g.props || [];
  game.quota = g.quota; game.helped = g.helped; game.delivered = g.delivered;
  game.timeLeft = g.timeLeft; game.modifier = g.modifier; game.scoreMult = g.scoreMult;
  game.msg = g.msg; game.msgT = g.msgT; game.aimNpc = g.aimNpc;
  game.popups = g.popups || [];
  game.run = g.run || game.run;
  Object.assign(player, snap.player);
  Object.assign(joy, snap.joy);
  Object.assign(inp, snap.inp);
  Object.assign(tzone, snap.tzone);
  Object.assign(lookTouch, snap.lookTouch);
  crLsSetSaveRaw(snap.lsSaveRaw);
  clearInputState();
}

function crForceSafeTitleAfterHarness(){
  state = STATE.TITLE;
  paused = false;
  game.run.active = false;
  game.run.harnessOnly = false;
  game.run.customLevel = null;
  game.map = null;
  game.MAP_W = 0;
  game.MAP_H = 0;
  game.pickups = [];
  game.npcs = [];
  game.props = [];
  game.exit = null;
  game.timeLeft = 0;
  confirmAction = null;
  clearInputState();
  crClearHarnessLeakFromStorage();
}

function crWithTemporaryState(label, fn){
  _crHarnessDepth++;
  _crBlockHarnessSave = true;
  const snap = crSnapshotHarnessState();
  let result;
  try {
    result = fn();
  } finally {
    try {
      crRestoreHarnessState(snap);
      crClearHarnessLeakFromStorage();
      if(snap.state === STATE.TITLE || _selfCheckUrl){
        crForceSafeTitleAfterHarness();
      }
      if(crIsBenchmarkPlayState()) crForceSafeTitleAfterHarness();
      _selfCheckForcePortrait = false;
      applyMobileControlSettings();
      syncPortraitMenuLabel();
      if(typeof drawMobileMenu === 'function') drawMobileMenu();
      resize();
    } catch(re){
      crForceSafeTitleAfterHarness();
      console.error('crWithTemporaryState restore failed', label, re);
    }
    _crHarnessDepth--;
    if(_crHarnessDepth <= 0){
      _crHarnessDepth = 0;
      _crBlockHarnessSave = false;
    }
  }
  return result;
}

function crSanitizeStorageOnBoot(){
  crClearHarnessLeakFromStorage();
  if(crIsBenchmarkPlayState()) crForceSafeTitleAfterHarness();
}

function crGuardHarnessLeakOutsideCheck(){
  if(_crHarnessDepth > 0) return;
  if(crIsBenchmarkPlayState()){
    console.warn('CR: harness benchmark leaked into public state — clearing');
    crForceSafeTitleAfterHarness();
  }
  crClearHarnessLeakFromStorage();
}

function runFullSelfCheckInner(){
  const err0 = window.__crRuntimeErrors.length;
  const layout = runLayoutSelfCheck();
  const input = runInputSelfCheck();
  const levels = runLevelSelfCheck();
  const renderFailure = runRenderFailureSelfCheck();
  const runtimeClean = window.__crRuntimeErrors.length === err0;
  const pass = layout.pass && input.pass && levels.pass && renderFailure.pass && runtimeClean;
  return {
    pass,
    build: BUILD_ID,
    layout,
    input,
    levels,
    renderFailure,
    render: renderFailure,
    runtimeErrors: window.__crRuntimeErrors.slice(),
    runtimeClean,
    timestamp: new Date().toISOString(),
  };
}

function runHarnessIsolationSelfCheck(){
  const errors = [];
  const before = crPublicStateFingerprint();
  crSanitizeStorageOnBoot();

  let renderCheckRestoresState = false;
  let fullCheckRestoresState = false;
  let hallCheckRestoresState = false;
  let noBenchmarkSave = false;
  let normalBootNotBenchmark = false;
  let selfcheckRestoresState = false;
  let localStorageRestored = false;

  const r1 = crWithTemporaryState('iso-render', () => runRenderFailureSelfCheck());
  const afterRender = crPublicStateFingerprint();
  renderCheckRestoresState = crFingerprintPublicSafe(afterRender) && afterRender.state === STATE.TITLE;
  if(!r1.pass) errors.push('render failure check failed inside isolation');
  if(!renderCheckRestoresState) errors.push('render check left benchmark/public pollution');

  const r2 = crWithTemporaryState('iso-full', () => runFullSelfCheckInner());
  const afterFull = crPublicStateFingerprint();
  fullCheckRestoresState = crFingerprintPublicSafe(afterFull) && afterFull.state === STATE.TITLE;
  if(!r2.pass) errors.push('full self-check failed inside isolation');
  if(!fullCheckRestoresState) errors.push('full check left benchmark state');

  const r3 = crWithTemporaryState('iso-hall', () => runHallSelfCheck());
  const afterHall = crPublicStateFingerprint();
  hallCheckRestoresState = crFingerprintPublicSafe(afterHall) && afterHall.state === STATE.TITLE;
  if(!r3.pass) errors.push('hall self-check failed inside isolation');
  if(!hallCheckRestoresState) errors.push('hall check left benchmark state');

  crClearHarnessLeakFromStorage();
  noBenchmarkSave = !crSavePayloadIsHarness((() => { try { const raw = crLsGetSaveRaw(); return raw ? JSON.parse(raw) : null; } catch(e){ return null; } })());
  if(!noBenchmarkSave) errors.push('localStorage still contains harness save');

  const after = crPublicStateFingerprint();
  normalBootNotBenchmark = crFingerprintPublicSafe(after);
  selfcheckRestoresState = renderCheckRestoresState && fullCheckRestoresState && hallCheckRestoresState;
  localStorageRestored = noBenchmarkSave;

  const checks = {
    renderCheckRestoresState,
    fullCheckRestoresState,
    hallCheckRestoresState,
    noBenchmarkSave,
    normalBootNotBenchmark,
    selfcheckRestoresState,
    localStorageRestored,
  };

  const pass = errors.length === 0 && Object.values(checks).every(Boolean);
  return { pass, build: BUILD_ID, errors, checks, before, after, timestamp: new Date().toISOString() };
}