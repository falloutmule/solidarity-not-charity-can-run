// ---------------------------------------------------------------------------
// SECTION 5b — LOCAL PERSISTENCE
// file:// origins may block or quota-limit localStorage — lsGet/lsSet catch errors (no throw).
// ---------------------------------------------------------------------------
const SAVE_VERSION = 1;
const K = {
  save:        'cannedRun.save.v1',
  stats:       'cannedRun.stats.v1',
  leaderboards:'cannedRun.leaderboards.v1',
  // Current canonical keys. Legacy aliases are kept below for compatibility.
  settings:    'cannedRun.settings.v1',
  profile:     'cannedRun.profile.v1',
  options:     'cannedRun.options.v1',
  player:      'cannedRun.player.v1',
};
function lsGet(key){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e){ return null; }
}
function lsSet(key, val){
  try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch(e){ return false; }
}
function lsDel(key){ try { localStorage.removeItem(key); } catch(e){} }

// --- PLAYER PROFILE ---
const profile = {
  name: 'RUNNER',
  load(){
    const p = lsGet(K.profile) || lsGet(K.player);
    if(p && typeof p.name==='string') this.name = sanitizeRunnerName(p.name);
  },
  save(){
    this.name = sanitizeRunnerName(this.name);
    const data = {name:this.name, v:SAVE_VERSION};
    lsSet(K.profile, data); // canonical
    lsSet(K.player, data);  // legacy compatibility
  },
};
profile.load();

// --- OPTIONS ---
const options = {
  mouseSens: 0.0022,
  lookSpeed: 1,
  mobileTurnSens: lookSensFromSpeed(1),
  mobileLook: 'med', // legacy label retained for old saves/debug compatibility
  joySizePx: 110,
  buttonSizePx: 85,
  lookSizePx: 112,
  controlsYOffsetPx: 0,
  controlOpacityValue: 0.60,
  minimapSizePx: 68,
  touchDeadzonePx: 8,
  joySize: 'med', buttonSize: 'med', controlOpacity: 'med', minimapSize: 'small', touchDeadzone: 'med', // legacy fields
  minimapDefault: true,
  reduceFx: false,
  soundOn: true,
  helpDismissed: false,
  mobileControls: 'auto', // 'auto' | 'on' | 'off'
  load(){
    const o = lsGet(K.settings) || lsGet(K.options);
    if(o && typeof o==='object'){
      if(typeof o.mouseSens==='number') this.mouseSens=o.mouseSens;
      if(typeof o.lookSpeed==='number') this.lookSpeed = nearestStep(o.lookSpeed, LOOK_SPEED_STEPS);
      else if(['low','med','high','fast'].includes(o.mobileLook)) this.lookSpeed = LEGACY_LOOK_TO_SPEED[o.mobileLook] || 1;
      else if(typeof o.mobileTurnSens==='number') this.lookSpeed = nearestStep(o.mobileTurnSens / BASE_MOBILE_TURN_SENS, LOOK_SPEED_STEPS);
      if(typeof o.joySizePx==='number') this.joySizePx = nearestStep(o.joySizePx, JOY_SIZE_STEPS);
      else if(['small','med','large'].includes(o.joySize)) this.joySizePx = LEGACY_SIZE_TO_JOY[o.joySize] || 110;
      if(typeof o.buttonSizePx==='number') this.buttonSizePx = nearestStep(o.buttonSizePx, BTN_SIZE_STEPS);
      else if(['small','med','large'].includes(o.buttonSize)) this.buttonSizePx = LEGACY_SIZE_TO_BTN[o.buttonSize] || 85;
      if(typeof o.lookSizePx==='number') this.lookSizePx = nearestStep(o.lookSizePx, LOOK_PAD_SIZE_STEPS);
      else this.lookSizePx = nearestStep(Math.round((this.buttonSizePx || 85) * 1.18), LOOK_PAD_SIZE_STEPS);
      if(typeof o.controlsYOffsetPx==='number') this.controlsYOffsetPx = nearestStep(o.controlsYOffsetPx, CONTROL_Y_STEPS);
      if(typeof o.controlOpacityValue==='number') this.controlOpacityValue = nearestStep(o.controlOpacityValue, OPACITY_STEPS);
      else if(['low','med','high'].includes(o.controlOpacity)) this.controlOpacityValue = LEGACY_OPACITY[o.controlOpacity] || 0.60;
      if(typeof o.minimapSizePx==='number') this.minimapSizePx = nearestStep(o.minimapSizePx, MINIMAP_SIZE_STEPS);
      else if(['small','med','large'].includes(o.minimapSize)) this.minimapSizePx = LEGACY_MAP_SIZE[o.minimapSize] || 68;
      if(typeof o.touchDeadzonePx==='number') this.touchDeadzonePx = nearestStep(o.touchDeadzonePx, DEADZONE_STEPS);
      else if(['low','med','high'].includes(o.touchDeadzone)) this.touchDeadzonePx = LEGACY_DEADZONE[o.touchDeadzone] || 8;
      if(typeof o.minimapDefault==='boolean') this.minimapDefault=o.minimapDefault;
      if(typeof o.reduceFx==='boolean') this.reduceFx=o.reduceFx;
      if(typeof o.soundOn==='boolean') this.soundOn=o.soundOn;
      if(typeof o.helpDismissed==='boolean') this.helpDismissed=o.helpDismissed;
      if(['auto','on','off'].includes(o.mobileControls)) this.mobileControls=o.mobileControls;
    }
    this.mobileTurnSens = lookSensFromSpeed(this.lookSpeed);
  },
  save(){
    this.lookSpeed = nearestStep(this.lookSpeed, LOOK_SPEED_STEPS);
    this.joySizePx = nearestStep(this.joySizePx, JOY_SIZE_STEPS);
    this.buttonSizePx = nearestStep(this.buttonSizePx, BTN_SIZE_STEPS);
    this.lookSizePx = nearestStep(this.lookSizePx, LOOK_PAD_SIZE_STEPS);
    this.controlsYOffsetPx = nearestStep(this.controlsYOffsetPx, CONTROL_Y_STEPS);
    this.controlOpacityValue = nearestStep(this.controlOpacityValue, OPACITY_STEPS);
    this.minimapSizePx = nearestStep(this.minimapSizePx, MINIMAP_SIZE_STEPS);
    this.touchDeadzonePx = nearestStep(this.touchDeadzonePx, DEADZONE_STEPS);
    this.mobileTurnSens = lookSensFromSpeed(this.lookSpeed);
    this.mobileLook = this.lookSpeed>=2.5?'fast':this.lookSpeed>=1.5?'high':this.lookSpeed<=0.75?'low':'med';
    this.joySize = this.joySizePx>=165?'large':this.joySizePx<=95?'small':'med';
    this.buttonSize = this.buttonSizePx>=120?'large':this.buttonSizePx<=75?'small':'med';
    this.controlOpacity = this.controlOpacityValue>=0.75?'high':this.controlOpacityValue<=0.30?'low':'med';
    this.minimapSize = this.minimapSizePx>=96?'large':this.minimapSizePx<=68?'small':'med';
    this.touchDeadzone = this.touchDeadzonePx>=12?'high':this.touchDeadzonePx<=4?'low':'med';
    const data = {
      mouseSens:this.mouseSens, lookSpeed:this.lookSpeed, mobileTurnSens:this.mobileTurnSens, mobileLook:this.mobileLook,
      joySizePx:this.joySizePx, buttonSizePx:this.buttonSizePx, lookSizePx:this.lookSizePx, controlsYOffsetPx:this.controlsYOffsetPx, controlOpacityValue:this.controlOpacityValue,
      minimapSizePx:this.minimapSizePx, touchDeadzonePx:this.touchDeadzonePx,
      joySize:this.joySize, buttonSize:this.buttonSize, controlOpacity:this.controlOpacity,
      minimapSize:this.minimapSize, touchDeadzone:this.touchDeadzone,
      minimapDefault:this.minimapDefault, reduceFx:this.reduceFx, soundOn:this.soundOn !== false, helpDismissed:!!this.helpDismissed, mobileControls:this.mobileControls, v:SAVE_VERSION
    };
    lsSet(K.settings, data); // canonical
    lsSet(K.options, data);  // legacy compatibility
  },
};
options.load();
crMigrateUnsafeControlsYOffset({ quiet: true });

// ---------------------------------------------------------------------------
// EMERGENCY URL FLAGS (query-param overrides for bad phone-local state)
//   ?mobile=on          — force mobile controls visible for this page load
//   ?resetcontrols=1     — reset control-related settings to safe defaults
//   ?clearsave=1         — wipe active game save (NOT stats) for a fresh start
//   ?touchdebug=1        — show live diagnostics overlay (does not block input)
// ---------------------------------------------------------------------------
(function applyUrlFlags(){
  const P = new URLSearchParams(location.search);
  // ?resetcontrols=1 — reset only control-related options to safe defaults
  if(P.get('resetcontrols') === '1'){
    options.mobileControls = 'auto';
    options.lookSpeed = 1;
    options.joySizePx = 110;
    options.buttonSizePx = 85;
    options.lookSizePx = 112;
    options.controlsYOffsetPx = 0;
    options.controlOpacityValue = 0.60;
    options.minimapSizePx = 68;
    options.touchDeadzonePx = 8;
    options.minimapDefault = true;
    options.soundOn = true;
    options.mobileTurnSens = lookSensFromSpeed(options.lookSpeed);
    crClearControlOverrides();
    options.save();
  }
  // ?clearsave=1 — wipe only the active game save (not stats/profile/settings)
  if(P.get('clearsave') === '1'){
    lsDel(K.save);
  }
  // ?mobile=on — force mobile mode for this load regardless of saved options
  if(P.get('mobile') === 'on'){
    mobileOverride = 'on';
    options.mobileControls = 'on';
  }
  // ?mobile=off — force desktop mode
  if(P.get('mobile') === 'off'){
    mobileOverride = 'off';
    options.mobileControls = 'off';
  }
})();

applyMobileControlSettings();
let showMinimap = options.minimapDefault;
mobileOverride = options.mobileControls==='auto' ? null : options.mobileControls;
setMobileMode(isMobile());

// ?mobile=on fail-safe: after DOM is ready, force controls visible + pointer-events:auto
if(new URLSearchParams(location.search).get('mobile') === 'on'){
  document.addEventListener('DOMContentLoaded', ()=>{
    const mob = document.getElementById('mob');
    if(mob){ mob.classList.add('show'); }
    setMobileMode(true);
    // Force all mobile control elements visible + interactive during PLAY
    const force = () => {
      if(state !== STATE.PLAY) return;
      ['ml','mlookpad','mg','ms','mm','mp'].forEach(id=>{
        const el = document.getElementById(id);
        if(el){ el.style.display = ''; el.style.pointerEvents = 'auto'; el.style.opacity = String(options.controlOpacityValue || 0.60); }
      });
      const mr = document.getElementById('mr');
      if(mr && !isMobilePortrait()){ mr.style.display = ''; mr.style.pointerEvents = 'auto'; }
    };
    // Run immediately and on state transitions
    force();
    setInterval(force, 1000);
  });
}

// --- STATS ---
const DEFAULT_STATS = {
  totalRunsStarted:0, totalRunsCompleted:0, totalRunsFailed:0,
  bestScore:0, fastestCompletedSec:null, highestDistrict:0,
  totalCansCollected:0, totalCansDelivered:0, totalPeopleHelped:0,
  helpedByKind:{hungry:0,family:0,elder:0,volunteer:0},
  totalUpgradesChosen:0, totalTimePlayedSec:0,
  upgradeCounts:{pack:0,sprint:0,hand:0,map:0,radar:0},
};
const stats = {
  data: null,
  load(){
    const raw = lsGet(K.stats);
    const d = JSON.parse(JSON.stringify(DEFAULT_STATS));
    if(raw && typeof raw==='object'){
      Object.assign(d, raw);
      d.helpedByKind = Object.assign({}, DEFAULT_STATS.helpedByKind,
        raw.helpedByKind && typeof raw.helpedByKind==='object' ? raw.helpedByKind : {});
      d.upgradeCounts = Object.assign({}, DEFAULT_STATS.upgradeCounts,
        raw.upgradeCounts && typeof raw.upgradeCounts==='object' ? raw.upgradeCounts : {});
      for(const k of ['totalRunsStarted','totalRunsCompleted','totalRunsFailed','bestScore','highestDistrict','totalCansCollected','totalCansDelivered','totalPeopleHelped','totalUpgradesChosen','totalTimePlayedSec']){
        if(typeof d[k] !== 'number' || !Number.isFinite(d[k])) d[k] = DEFAULT_STATS[k];
      }
      if(d.fastestCompletedSec!==null && (typeof d.fastestCompletedSec!=='number' || !Number.isFinite(d.fastestCompletedSec))) d.fastestCompletedSec=null;
    }
    this.data = d;
  },
  save(){ lsSet(K.stats, Object.assign({}, this.data, {v:SAVE_VERSION})); },
  reset(){ this.data = JSON.parse(JSON.stringify(DEFAULT_STATS)); this.save(); },
};
stats.load();

// --- LEADERBOARDS ---
const DEFAULT_LB = { bestScores:[], fastestRuns:[], highestDistrict:[] };
const leaderboards = {
  data: null,
  load(){
    const raw = lsGet(K.leaderboards);
    const d = JSON.parse(JSON.stringify(DEFAULT_LB));
    if(raw && typeof raw==='object'){
      for(const board of ['bestScores','fastestRuns','highestDistrict']){
        d[board] = Array.isArray(raw[board]) ? raw[board].filter(e=>e && typeof e==='object').slice(0,20) : [];
      }
    }
    this.data = d;
  },
  save(){ lsSet(K.leaderboards, Object.assign({}, this.data, {v:SAVE_VERSION})); },
  add(entry){
    // entry: {name,score,durationSec,district,seed,modifier,completed,date}
    // dedupe by date+seed+score to prevent double-processing
    const d = this.data;
    const isDup = (arr) => arr.some(e => e.date===entry.date && e.seed===entry.seed && e.score===entry.score);
    if(entry.completed){
      if(!isDup(d.bestScores)){
        d.bestScores.push(entry); d.bestScores.sort((a,b)=>b.score-a.score); d.bestScores=d.bestScores.slice(0,20);
      }
      if(!isDup(d.fastestRuns)){
        d.fastestRuns.push(entry); d.fastestRuns.sort((a,b)=>a.durationSec-b.durationSec); d.fastestRuns=d.fastestRuns.slice(0,20);
      }
    }
    if(!isDup(d.highestDistrict)){
      d.highestDistrict.push(entry);
      d.highestDistrict.sort((a,b)=> b.district-a.district || b.score-a.score || a.durationSec-b.durationSec);
      d.highestDistrict=d.highestDistrict.slice(0,20);
    }
    this.save();
  },
  getRank(board, entry){
    const arr = this.data[board]||[];
    for(let i=0;i<arr.length;i++){
      if(arr[i].date===entry.date && arr[i].seed===entry.seed && arr[i].score===entry.score) return i+1;
    }
    return null;
  },
  reset(){ this.data = JSON.parse(JSON.stringify(DEFAULT_LB)); this.save(); },
};
leaderboards.load();

// --- ACTIVE RUN SAVE (serialize/deserialize/autosave/clear) ---
const CR_AUTHORED_D1_ID = 'district-1-authored-v1';
const CR_AUTHORED_D1_SCHEMA = 'snc-authored-level-static-v1';
const CR_AUTHORED_D1_STATIC_SHA256 = '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82';

function crSerializeCommonRunState(){
  return {
    v: SAVE_VERSION, runActive: true,
    savedAt: Date.now(),
    playerName: profile.name,
    seed: game.seed, district: game.district, totalScore: game.totalScore,
    modifier: game.modifier, scoreMult: game.scoreMult,
    timeLeft: game.timeLeft, quota: game.quota, helped: game.helped, delivered: game.delivered,
    px: player.x, py: player.y, pangle: player.angle,
    cans: player.cans, stamina: player.stamina,
    maxCans: player.maxCans, maxStamina: player.maxStamina,
    giveRange: player.giveRange, regenBonus: player.regenBonus,
    minimapLevel: player.minimapLevel, radar: player.radar, handoffBonus: player.handoffBonus,
    upgrades: Object.assign({}, player.upgrades),
    screenState: state,
    upgradeOffered: state === STATE.UPGRADE ? (window._offered || []).map(o => ({ id: o.id, name: o.name, desc: o.desc })) : null,
    run: Object.assign({}, game.run),
  };
}
function crApplyCommonRunState(s){
  game.seed=s.seed; game.district=s.district; game.totalScore=s.totalScore;
  game.modifier=s.modifier; game.scoreMult=s.scoreMult;
  game.timeLeft=s.timeLeft; game.quota=s.quota; game.helped=s.helped; game.delivered=s.delivered;
  player.x=s.px; player.y=s.py; player.angle=s.pangle;
  player.cans=s.cans; player.stamina=s.stamina;
  player.maxCans=s.maxCans; player.maxStamina=s.maxStamina;
  player.giveRange=s.giveRange; player.regenBonus=s.regenBonus;
  player.minimapLevel=s.minimapLevel; player.radar=s.radar; player.handoffBonus=s.handoffBonus;
  player.upgrades = s.upgrades || {pack:0,sprint:0,hand:0,map:0,radar:0};
  game.run = s.run || game.run;
  game.run.active=true;
  if(s.screenState === STATE.UPGRADE && Array.isArray(s.upgradeOffered) && s.upgradeOffered.length){
    state = STATE.UPGRADE;
    window._offered = s.upgradeOffered;
    paused = false;
  } else {
    state=STATE.PLAY; paused=false;
  }
}
function crIsSaveRecord(value){ return !!value && typeof value==='object' && !Array.isArray(value); }
function crValidateAuthoredCommonRunState(s){
  if(!crIsSaveRecord(s) || s.v!==SAVE_VERSION || s.runActive!==true || (s.district|0)!==1 || s.district!==1) return false;
  const numericFields = [
    'seed','totalScore','scoreMult','timeLeft','quota','helped','delivered',
    'px','py','pangle','cans','stamina','maxCans','maxStamina','giveRange','regenBonus',
    'minimapLevel','handoffBonus'
  ];
  if(numericFields.some(key => typeof s[key]!=='number' || !Number.isFinite(s[key]))) return false;
  if(typeof s.radar!=='boolean' || typeof s.modifier!=='string' || !crIsSaveRecord(s.upgrades) || !crIsSaveRecord(s.run) || typeof s.run.active!=='boolean') return false;
  if(['pack','sprint','hand','map','radar'].some(key => typeof s.upgrades[key]!=='number' || !Number.isFinite(s.upgrades[key]))) return false;
  if(s.screenState===STATE.PLAY) return s.upgradeOffered===null || s.upgradeOffered===undefined;
  if(s.screenState!==STATE.UPGRADE || !Array.isArray(s.upgradeOffered) || !s.upgradeOffered.length) return false;
  return s.upgradeOffered.every(o => crIsSaveRecord(o) && typeof o.id==='string' && typeof o.name==='string' && typeof o.desc==='string');
}
function crSnapshotLiveObject(target){
  const values = Object.create(null);
  Object.keys(target).forEach(key => { values[key]=target[key]; });
  return values;
}
function crRestoreLiveObject(target,values){
  Object.keys(target).forEach(key => { if(!Object.prototype.hasOwnProperty.call(values,key)) delete target[key]; });
  Object.keys(values).forEach(key => { target[key]=values[key]; });
}
function crSnapshotAuthoredLoadState(){
  return {
    game:crSnapshotLiveObject(game), player:crSnapshotLiveObject(player), state, paused,
    hadOffered:Object.prototype.hasOwnProperty.call(window,'_offered'), offered:window._offered
  };
}
function crRestoreAuthoredLoadState(snapshot){
  crRestoreLiveObject(game,snapshot.game);
  crRestoreLiveObject(player,snapshot.player);
  state=snapshot.state; paused=snapshot.paused;
  if(snapshot.hadOffered) window._offered=snapshot.offered;
  else delete window._offered;
}

const SAVE = {
  hasValid(){ const s = lsGet(K.save); return s && typeof s==='object' && s.v===SAVE_VERSION && s.runActive===true; },
  serialize(){
    const data = crSerializeCommonRunState();
    if((game.district|0)===1 && game.authoredLevelId===CR_AUTHORED_D1_ID){
      data.authoredLevelId = CR_AUTHORED_D1_ID;
      data.authoredLevelSchema = CR_AUTHORED_D1_SCHEMA;
      data.authoredStaticSha256 = CR_AUTHORED_D1_STATIC_SHA256;
      data.authoredOverlay = sncCaptureAuthoredMutableOverlay(CR_AUTHORED_D1_ID);
      return data;
    }
    data.map=game.map; data.wallShade=game.wallShade; data.MAP_W=game.MAP_W; data.MAP_H=game.MAP_H;
    data.pickups=game.pickups.map(c=>({x:c.x,y:c.y,taken:c.taken,amt:c.amt,wob:c.wob}));
    data.npcs=game.npcs.map(n=>({x:n.x,y:n.y,kind:n.kind,need:n.need,helped:n.helped,wob:n.wob,thank:n.thank||''}));
    data.props=game.props.map(p=>({x:p.x,y:p.y,kind:p.kind,wob:p.wob}));
    data.exit=game.exit ? {x:game.exit.x,y:game.exit.y,active:game.exit.active} : null;
    return data;
  },
  save(){
    if(SNCHarnessAdapter.suppressSave()) return;
    if(game.run && game.run.harnessOnly) return;
    if(!game.run.active) return;
    try { lsSet(K.save, this.serialize()); } catch(e){}
  },
  load(){
    try {
      const s = lsGet(K.save);
      if(!s || s.v!==SAVE_VERSION || !s.runActive) return false;
      if(crSavePayloadIsHarness(s)) { SAVE.clear(); return false; }
      const isDistrictOne = (s.district|0)===1 && s.district===1;
      if(isDistrictOne || s.authoredLevelId!==undefined){
        if(!crValidateAuthoredCommonRunState(s)) return false;
        if(isDistrictOne && s.authoredLevelId===undefined){ SAVE.clear(); return false; }
        if(s.authoredLevelId!==CR_AUTHORED_D1_ID ||
           s.authoredLevelSchema!==CR_AUTHORED_D1_SCHEMA || s.authoredStaticSha256!==CR_AUTHORED_D1_STATIC_SHA256) return false;
        const staticIdentity = sncAuthoredStaticIdentity(CR_AUTHORED_D1_ID);
        if(!staticIdentity || staticIdentity.schema!==CR_AUTHORED_D1_SCHEMA || staticIdentity.byteLength!==3516 ||
           staticIdentity.sha256!==CR_AUTHORED_D1_STATIC_SHA256) return false;
        const checked = sncValidateAuthoredMutableOverlay(CR_AUTHORED_D1_ID,s.authoredOverlay);
        if(!checked || checked.pass!==true || !checked.value) return false;
        const snapshot = crSnapshotAuthoredLoadState();
        try{
          if(!sncInstallAuthoredLevel(CR_AUTHORED_D1_ID,{seed:s.seed,modifier:s.modifier})){
            crRestoreAuthoredLoadState(snapshot); return false;
          }
          if(game.authoredLevelId!==CR_AUTHORED_D1_ID || game.authoredLevelSchema!==CR_AUTHORED_D1_SCHEMA ||
             game.authoredStaticSha256!==CR_AUTHORED_D1_STATIC_SHA256){
            crRestoreAuthoredLoadState(snapshot); return false;
          }
          if(!sncApplyAuthoredMutableOverlay(CR_AUTHORED_D1_ID,checked.value)){
            crRestoreAuthoredLoadState(snapshot); return false;
          }
        } catch(e){
          crRestoreAuthoredLoadState(snapshot); return false;
        }
        crApplyCommonRunState(s);
        return true;
      }
      crApplyCommonRunState(s);
      game.map=s.map; game.MAP_W=s.MAP_W; game.MAP_H=s.MAP_H; game.wallShade=s.wallShade;
      game.pickups=s.pickups; game.npcs=s.npcs; game.props=s.props;
      game.exit=s.exit;
      return true;
    } catch(e){ return false; }
  },
  clear(){ lsDel(K.save); },
};
// save before tab close
addEventListener('beforeunload', ()=>{ if(SNCHarnessAdapter.suppressUnloadSave()) return; if(state===STATE.PLAY && game.run.active && !(game.run.harnessOnly)) SAVE.save(); });

