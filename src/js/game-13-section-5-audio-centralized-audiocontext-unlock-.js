// ---------------------------------------------------------------------------
// SECTION 5 — AUDIO (centralized AudioContext unlock gate, CARD 10)
// ---------------------------------------------------------------------------
let AC=null;
let _audioUnlockBound=false;
let _audioUnlockAttempted=false;
let _audioUnlockPromise=null;

function getAudioContext(){
  if(AC) return AC;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return null;
  AC = new Ctx();
  return AC;
}

function resumeAudioContext(){
  const ctx = getAudioContext();
  if(!ctx) return Promise.resolve({ ok:false, state:'unsupported' });
  if(ctx.state === 'running') return Promise.resolve({ ok:true, state:'running' });
  if(_audioUnlockPromise) return _audioUnlockPromise;
  _audioUnlockAttempted = true;
  _audioUnlockPromise = ctx.resume().then(()=>({
    ok: ctx.state === 'running',
    state: ctx.state,
  })).catch(err=>({
    ok:false,
    state: ctx.state,
    error: String(err && err.message || err),
  })).finally(()=>{ _audioUnlockPromise = null; });
  return _audioUnlockPromise;
}

function bindAudioUnlockGate(){
  if(_audioUnlockBound) return;
  _audioUnlockBound = true;
  const unlockFromGesture = ()=>{ resumeAudioContext(); };
  const opts = { capture:true, passive:true };
  document.addEventListener('keydown', unlockFromGesture, opts);
  // Pointer Events already cover touch-capable modern browsers.  Keep the
  // legacy event only for engines that do not implement Pointer Events.
  if(typeof window.PointerEvent === 'function') document.addEventListener('pointerdown', unlockFromGesture, opts);
  else document.addEventListener('touchstart', unlockFromGesture, opts);
}

function _beepNow(ctx, freq, dur, type, gain){
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type; o.frequency.value=freq; g.gain.value=gain;
  o.connect(g); g.connect(ctx.destination); o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
  o.stop(ctx.currentTime+dur);
}

function beep(freq,dur,type='square',gain=0.04){
  try{
    if(typeof crSoundEnabled === 'function' && !crSoundEnabled()) return;
    const ctx = getAudioContext();
    if(!ctx) return;
    if(ctx.state === 'suspended'){
      resumeAudioContext().then(()=>{
        if(ctx.state === 'running') _beepNow(ctx, freq, dur, type, gain);
      });
      return;
    }
    if(ctx.state !== 'running') return;
    _beepNow(ctx, freq, dur, type, gain);
  }catch(e){}
}

function getAudioUnlockProof(){
  const ctx = AC;
  return {
    BUILD_ID,
    gateBound: _audioUnlockBound,
    unlockAttempted: _audioUnlockAttempted,
    hasContext: !!ctx,
    state: ctx ? ctx.state : 'none',
    gestureEvents: ['pointerdown','keydown','touchstart'],
    resumeEntry: 'resumeAudioContext',
    soundOn: typeof options !== 'undefined' ? options.soundOn !== false : true,
  };
}

const _SOUND_CUE_DEFS = {
  canCollect: { freq: 720, dur: 0.07, type: 'square', gain: 0.032, hud: '+CAN', color: '#ffd24a', life: 0.75 },
  giveSuccess: { freq: 880, dur: 0.11, type: 'triangle', gain: 0.038, hud: 'HELPED', color: '#9fffb6', life: 0.85 },
  giveBlocked: { freq: 200, dur: 0.07, type: 'sawtooth', gain: 0.026, hud: 'NO LINE OF SIGHT', color: '#ff9a8a', life: 0.9 },
  giveUnavailable: { freq: 160, dur: 0.06, type: 'sawtooth', gain: 0.022, hud: null },
  giveNeedCans: { freq: 180, dur: 0.08, type: 'sawtooth', gain: 0.028, hud: null },
  quotaExitReady: { freq: 1100, dur: 0.2, type: 'square', gain: 0.036, hud: 'EXIT READY', color: '#7fd4ff', life: 1.1 },
  districtComplete: { freq: 620, dur: 0.16, type: 'triangle', gain: 0.04, hud: 'DISTRICT COMPLETE', color: '#ffe066', life: 1.15 },
  upgradeChosen: { freq: 740, dur: 0.11, type: 'triangle', gain: 0.038, hud: 'UPGRADE', color: '#c8b0ff', life: 0.9 },
  menuHelp: { freq: 480, dur: 0.055, type: 'sine', gain: 0.022, hud: null },
  sprintDenied: { freq: 150, dur: 0.045, type: 'sawtooth', gain: 0.02, hud: null },
};

function crSoundEnabled(){
  if(typeof options !== 'undefined' && options.soundOn === false) return false;
  return true;
}

function crTriggerSoundCue(id, opts){
  opts = opts || {};
  const def = _SOUND_CUE_DEFS[id];
  if(!def) return { ok: false, id, error: 'unknown_cue' };
  const testOnly = !!opts.testOnly;
  let played = false;
  if(!testOnly && def.freq && crSoundEnabled()){
    try{
      beep(def.freq, def.dur, def.type || 'square', def.gain || 0.03);
      played = true;
    }catch(e){
      return { ok: false, id, error: String(e && e.message || e) };
    }
  }
  if(def.hud && !testOnly && opts.showHud !== false){
    addPopup(def.hud, def.color || '#ffd24a', def.life);
  }
  if(def.hud && opts.forceHud){
    addPopup(def.hud, def.color || '#ffd24a', def.life);
  }
  return { ok: true, id, played, hud: def.hud || null };
}

function crSoundFeedbackCueIds(){
  return CR_SOUND_FEEDBACK.requiredCues.slice();
}

bindAudioUnlockGate();
