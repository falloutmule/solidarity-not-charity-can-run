// ---------------------------------------------------------------------------
// SECTION 11 — UPDATE + INPUT
// ---------------------------------------------------------------------------
const keys={};

const semanticActions = {
  moveFwd:false, moveBack:false, strafeLeft:false, strafeRight:false,
  turnLeft:false, turnRight:false, sprintHold:false, giveHold:false,
  mapHold:false, pauseHold:false,
  sources:{ keyboard:false, touch:false, joy:false },
};

function crRefreshSemanticActionMap(){
  semanticActions.moveFwd = !!(keys['KeyW'] || keys['ArrowUp'] || inp.fwd);
  semanticActions.moveBack = !!(keys['KeyS'] || keys['ArrowDown'] || inp.back);
  semanticActions.strafeLeft = !!(keys['KeyA'] || keys['ArrowLeft'] || inp.left);
  semanticActions.strafeRight = !!(keys['KeyD'] || keys['ArrowRight'] || inp.right);
  semanticActions.turnLeft = !!(keys['KeyQ'] || inp.turnLeft);
  semanticActions.turnRight = !!(keys['KeyE'] || inp.turnRight);
  semanticActions.sprintHold = !!(keys['ShiftLeft'] || keys['ShiftRight'] || inp.sprint);
  semanticActions.giveHold = !!inp.give;
  semanticActions.mapHold = !!inp.map;
  semanticActions.pauseHold = !!inp.pause;
  semanticActions.sources.keyboard = !!(
    keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'] ||
    keys['KeyQ'] || keys['KeyE'] || keys['ShiftLeft'] || keys['ShiftRight'] ||
    keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight']
  );
  semanticActions.sources.touch = !!(inp.give || inp.map || inp.pause || inp._active);
  semanticActions.sources.joy = !!joy.active;
  return semanticActions;
}

function getSemanticActionMap(){
  return crRefreshSemanticActionMap();
}

// --- MENU STATE ---
let menuSel = 0;           // selected menu item index
let selectedStartDistrict = 1; // 1–4 testing start (title menu below NEW RUN)
let seedInput = '';         // text input for seed entry
let nameInput = '';         // text input for name entry
let confirmAction = null;   // {msg, onYes, onNo} for confirmations
let confirmSel = 0;         // 0=no, 1=yes
let menuMouseY = -1;        // mouse Y for hover detection
const menuHit = {startY:0,count:0,itemH:30}; // last drawn canvas menu hit-test region

// define menu items for each screen (returned dynamically so save presence updates)
function specialLevelMenuItems(){
  return Object.values(CUSTOM_LEVELS).map(level => ({
    label: level.title.toUpperCase(),
    action: () => startCustomLevel(level.id),
    id: level.id,
    rmenu: 'custom-level-' + level.id,
  }));
}
function crGetSelectedStartDistrict(){
  return Math.max(1, Math.min(4, selectedStartDistrict|0 || 1));
}
function crCycleSelectedStartDistrict(){
  selectedStartDistrict = (crGetSelectedStartDistrict() % 4) + 1;
  return selectedStartDistrict;
}
function crSetSelectedStartDistrict(d){
  if(typeof d === 'string'){
    const m = d.trim().match(/^D?([1-4])$/i);
    if(m) selectedStartDistrict = parseInt(m[1], 10);
    else selectedStartDistrict = Math.max(1, Math.min(4, parseInt(d, 10) || 1));
  } else {
    selectedStartDistrict = Math.max(1, Math.min(4, d|0 || 1));
  }
  return selectedStartDistrict;
}
function crTitleMenuSelectableRows(){
  return titleMenuItems().filter(it => !it.header && it.action);
}
function titleMenuItems(){
  const items = [
    {label:'START NEW RUN', rmenu:'title-start', action:()=>startRun(), enabled:true},
    {label:'START DISTRICT: D'+crGetSelectedStartDistrict(), rmenu:'title-cycle-district', action:()=>{ crCycleSelectedStartDistrict(); beep(520,0.03,'sine',0.02); drawMobileMenu(); }, enabled:true},
    {label: SAVE.hasValid() ? 'CONTINUE SAVED RUN' : 'CONTINUE (no save)', rmenu:'title-continue', action:()=>{ if(SAVE.hasValid()) continueRun(); }, enabled:SAVE.hasValid()},
    {label:'SEEDED RUN', rmenu:'title-seeded', action:()=>{ seedInput=''; state=STATE.SEEDED; menuSel=0; }, enabled:true},
  ];
  const specials = specialLevelMenuItems();
  if(specials.length){
    items.push({header:'SPECIAL LEVELS'});
    specials.forEach(s => items.push({label:s.label, rmenu:s.rmenu, action:s.action, enabled:true}));
  }
  items.push(
    {label:'STATS', rmenu:'title-stats', action:()=>{ state=STATE.STATS; menuSel=0; }, enabled:true},
    {label:'LEADERBOARDS', rmenu:'title-lb', action:()=>{ state=STATE.LB; menuSel=0; }, enabled:true},
    {label:'OPTIONS / HELP', rmenu:'title-options', action:()=>{ nameInput=profile.name; state=STATE.OPTIONS; menuSel=0; }, enabled:true},
  );
  return items;
}
function titleMenuRowLabel(it){
  if(it.rmenu === 'title-start') return 'NEW RUN';
  if(it.rmenu === 'title-cycle-district') return 'START DISTRICT: D'+crGetSelectedStartDistrict();
  return it.label;
}
function buildTitleRmenuBody(){
  const items = titleMenuItems();
  let rows = '';
  let sel = 0;
  for(const it of items){
    if(it.header){
      rows += `<div class="rdesc" style="margin-top:10px;color:#8a7a5a;letter-spacing:2px;font-size:11px;">${it.header}</div>`;
      continue;
    }
    const dis = it.enabled === false ? ' style="opacity:0.45"' : '';
    const mt = sel === 0 ? 'margin-top:10px;' : 'margin-top:4px;';
    rows += `<div class="rit ${_rmSel===sel?'sel':''}" data-action="${it.rmenu}"${dis} style="${mt}">${titleMenuRowLabel(it)}</div>`;
    sel++;
  }
  rows += `<div class="rit ${_rmSel===sel?'sel':''}" data-action="toggle-fs" style="margin-top:4px;">${isFullscreen()?'EXIT FULLSCREEN':'FULLSCREEN'}</div>`;
  rmenuSel(sel + 1);
  return rows;
}

function titleMenuSkipHeader(sel, dir){
  const items = titleMenuItems();
  let s = clampMenu(sel, 0, items.length - 1);
  for(let i=0;i<items.length;i++){
    s = clampMenu(s + dir, 0, items.length - 1);
    if(!items[s].header && items[s].action) return s;
  }
  return sel;
}
function titleMenuFromHit(idx){
  const items = titleMenuItems();
  let row = 0;
  for(let i=0;i<items.length;i++){
    if(items[i].header) continue;
    if(row === idx){ menuSel = i; return items[i]; }
    row++;
  }
  return null;
}

addEventListener('keydown',e=>{
  keys[e.code]=true;

  // --- confirmation dialog (highest priority) ---
  if(confirmAction){
    if(e.code==='ArrowLeft'||e.code==='KeyA') confirmSel=0;
    if(e.code==='ArrowRight'||e.code==='KeyD') confirmSel=1;
    if(e.code==='Enter'||e.code==='Space'){
      const ca=confirmAction; confirmAction=null;
      if(confirmSel===1) ca.onYes(); else ca.onNo();
      beep(440,0.05,'sine',0.03);
    }
    if(e.code==='Escape'){ confirmAction=null; }
    e.preventDefault();
    return;
  }

  // --- text input states (seed, name) ---
  if(state===STATE.SEEDED && menuSel===0){
    if(e.code==='Backspace'){ seedInput=seedInput.slice(0,-1); e.preventDefault(); return; }
    if(e.code==='Enter'){ const s=parseInt(seedInput); if(s&&!isNaN(s)) startRun(s); return; }
    if(e.code==='Escape'){ state=STATE.TITLE; menuSel=3; return; }
    if(e.code.length===1 && /[0-9]/.test(e.key) && seedInput.length<10){ seedInput+=e.key; e.preventDefault(); return; }
  }
  if(state===STATE.OPTIONS && menuSel===0){
    if(e.code==='Backspace'){ nameInput=nameInput.slice(0,-1); e.preventDefault(); return; }
    if(e.code==='Enter'){ profile.name=nameInput.trim().slice(0,12)||'RUNNER'; profile.save(); return; }
    if(e.code.length===1 && nameInput.length<12 && e.key.match(/[\w \-!.]/)){ nameInput+=e.key.toUpperCase(); e.preventDefault(); return; }
  }

  // --- PLAY state keys ---
  if(state===STATE.PLAY){
    if(e.code==='KeyM') showMinimap=!showMinimap;
    if(e.code==='KeyP' || e.code==='Escape'){
      if(!paused){ paused=true; SAVE.save(); crTriggerSoundCue('menuHelp'); }
      else { paused=false; }
    }
    if(!paused && e.code==='Space'){ giveCan(); e.preventDefault(); }
    if(!paused && e.code==='KeyR'){
      confirmAction={msg:'Restart run? Current progress will be lost.', onYes:()=>{ SAVE.clear(); restartRun(false); }, onNo:()=>{}};
    }
    return;
  }

  // --- menu navigation for all non-PLAY states ---
  const menuState = isMenuState(state) || (paused && state===STATE.PLAY);
  if(menuState){
    if(state===STATE.TITLE){
      if(e.code==='ArrowUp'||e.code==='KeyW'){ menuSel=titleMenuSkipHeader(menuSel,-1); beep(520,0.03,'sine',0.02); e.preventDefault(); }
      if(e.code==='ArrowDown'||e.code==='KeyS'){ menuSel=titleMenuSkipHeader(menuSel,1); beep(520,0.03,'sine',0.02); e.preventDefault(); }
    } else {
      if(e.code==='ArrowUp'||e.code==='KeyW'){ menuSel=Math.max(0,menuSel-1); beep(520,0.03,'sine',0.02); e.preventDefault(); }
      if(e.code==='ArrowDown'||e.code==='KeyS'){ menuSel++; beep(520,0.03,'sine',0.02); e.preventDefault(); }
    }
    if(e.code==='Escape'){
      if(state===STATE.PLAY){ paused=false; }
      else if(state!==STATE.TITLE){ state=STATE.TITLE; menuSel=0; }
    }
    if(e.code==='Enter' || (e.code==='Space' && state!==STATE.SEEDED)){
      e.preventDefault();
      menuActivate();
    }
  }
});
function menuActivate(){
  beep(660,0.05,'sine',0.03);
  if(state===STATE.TITLE){
    const items=titleMenuItems();
    if(menuSel>=0 && menuSel<items.length && !items[menuSel].header && items[menuSel].enabled!==false && items[menuSel].action) items[menuSel].action();
  }
  else if(state===STATE.SEEDED){
    if(menuSel===0){ const s=parseInt(seedInput); if(s&&!isNaN(s)) startRun(s); }
    else if(menuSel===1){ startRun(); }
    else if(menuSel===2){ state=STATE.TITLE; menuSel=2; }
  }
  else if(state===STATE.STATS){ state=STATE.TITLE; menuSel=3; }
  else if(state===STATE.LB){ state=STATE.TITLE; menuSel=4; }
  else if(state===STATE.OPTIONS){ activateOption(menuSel); }
  else if(state===STATE.RESULTS){ activateResult(menuSel); }
  else if(paused && state===STATE.PLAY){ activatePause(menuSel); }
}
// results screen items
function resultItems(){
  return [
    {label:'NEW RUN',         action:()=>{ SAVE.clear(); startRun(); }},
    {label:'RETRY SAME SEED',  action:()=>{ SAVE.clear(); startRun(game.run.seedUsed); }},
    {label:'LEADERBOARDS',     action:()=>{ state=STATE.LB; menuSel=0; }},
    {label:'MAIN MENU',        action:()=>{ state=STATE.TITLE; menuSel=0; }},
  ];
}
function activateResult(idx){
  const items=resultItems();
  if(idx>=0 && idx<items.length) items[idx].action();
}
// pause menu items
function pauseItems(){
  return [
    {label:'RESUME',           action:()=>{ paused=false; }},
    {label:'RESTART RUN',      action:()=>{ confirmAction={msg:'Restart run? Progress will be lost.', onYes:()=>{ SAVE.clear(); restartRun(false); }, onNo:()=>{}}; }},
    {label:'MAIN MENU',        action:()=>{ confirmAction={msg:'Return to main menu? Save will be kept.', onYes:()=>{ SAVE.save(); state=STATE.TITLE; menuSel=0; paused=false; }, onNo:()=>{}}; }},
  ];
}
function activatePause(idx){
  const items=pauseItems();
  if(idx>=0 && idx<items.length) items[idx].action();
}
// options items (index 0 is name input, rest are toggle/action)
function activateOption(idx){
  if(idx===0){ editRunnerName(); }
  else if(idx===1){ options.lookSpeed=cycleStepValue(options.lookSpeed,LOOK_SPEED_STEPS); options.save(); }
  else if(idx===2){ options.touchDeadzonePx=cycleStepValue(options.touchDeadzonePx,DEADZONE_STEPS); options.save(); }
  else if(idx===3){
    const vals = ['auto','on','off'];
    const cur = vals.indexOf(options.mobileControls);
    options.mobileControls = vals[(cur+1)%vals.length];
    mobileOverride = options.mobileControls==='auto' ? null : options.mobileControls;
    setMobileMode(isMobile());
    options.save(); applyMobileControlSettings();
  }
  else if(idx===4){ options.minimapDefault=!options.minimapDefault; showMinimap=options.minimapDefault; options.save(); }
  else if(idx===5){ options.reduceFx=!options.reduceFx; options.save(); }
  else if(idx===6){ options.soundOn = options.soundOn === false; options.save(); }
  else if(idx===7){ confirmAction={msg:'Clear active save? Stats will be kept.', onYes:()=>{ SAVE.clear(); }, onNo:()=>{}}; }
  else if(idx===8){ confirmAction={msg:'Reset ALL local data? This cannot be undone.', onYes:()=>{ SAVE.clear(); stats.reset(); leaderboards.reset(); profile.name='RUNNER'; profile.save(); options.mouseSens=0.0022; options.lookSpeed=1; options.mobileLook='med'; options.mobileTurnSens=lookSensFromSpeed(1); options.joySizePx=110; options.buttonSizePx=85; options.lookSizePx=112; options.controlsYOffsetPx=0; options.controlOpacityValue=0.60; options.minimapSizePx=68; options.touchDeadzonePx=8; options.minimapDefault=true; options.reduceFx=false; options.mobileControls='auto'; options.save(); applyMobileControlSettings(); }, onNo:()=>{}}; }
  else if(idx===9){ state=STATE.TITLE; menuSel=6; }
}
function isMenuState(s){
  return s===STATE.TITLE || s===STATE.SEEDED || s===STATE.STATS || s===STATE.LB || s===STATE.OPTIONS || s===STATE.RESULTS;
}

addEventListener('keyup',e=>{ keys[e.code]=false; });

let locked=false;
function handleMenuPointer(clientY){
  const menuState = isMenuState(state) || (paused && state===STATE.PLAY);
  if(menuState && state!==STATE.LB){
    const idx = Math.floor((clientY - menuHit.startY) / menuHit.itemH);
    if(idx>=0 && idx<menuHit.count){
      if(state===STATE.TITLE){
        const it = titleMenuFromHit(idx);
        if(it && it.enabled!==false && it.action){ it.action(); return true; }
        return false;
      }
      menuSel = idx;
      menuActivate();
      return true;
    }
  }
  return false;
}
view.addEventListener('mousedown',e=>{
  // confirmation click
  if(confirmAction){
    const cy=innerHeight/2+60;
    // yes=right, no=left
    if(e.clientY > cy-15 && e.clientY < cy+15){
      const yesX=innerWidth/2+30, noX=innerWidth/2-80;
      if(Math.abs(e.clientX-yesX)<50){ const ca=confirmAction; confirmAction=null; ca.onYes(); }
      else if(Math.abs(e.clientX-noX)<50){ confirmAction=null; }
    }
    return;
  }
  if(handleMenuPointer(e.clientY)) return;
  if(state===STATE.TITLE){
    const items=titleMenuItems();
    if(menuSel>=0 && menuSel<items.length && items[menuSel].enabled!==false){
      items[menuSel].action();
      beep(660,0.05,'sine',0.03);
    }
    return;
  }
  if(state===STATE.PLAY){
    if(paused){ paused=false; return; }
    if(!locked){ view.requestPointerLock(); }
    else giveCan();
  }
});
view.addEventListener('touchstart', e=>{
  if(confirmAction) return;
  if(e.touches.length !== 1) return;
  if(handleMenuPointer(e.touches[0].clientY)) e.preventDefault();
},{passive:false});
document.addEventListener('pointerlockchange',()=>{ locked = document.pointerLockElement===view; });
addEventListener('mousemove',e=>{
  if(locked && state===STATE.PLAY && !paused) player.angle += e.movementX*options.mouseSens;
  menuMouseY = e.clientY;
});

function setMsg(m){ game.msg=m; game.msgT=1.6; }
function pickModifier(){ const m=['rainy','shortage','clear','maze','clear','clear']; return m[(RNG()*m.length)|0]; }
function resetPlayerUpgrades(){
  player.maxCans=10; player.maxStamina=60; player.giveRange=1.4;
  player.minimapLevel=1; player.radar=false; player.handoffBonus=0;
  player.regenBonus=0; player.speedBoostT=0; player.giveCD=0;
  player.upgrades={pack:0, sprint:0, hand:0, map:0, radar:0};
}
function initRunTracking(useSeed){
  game.run = { active:true, startedAt:Date.now(), seedUsed:useSeed, modifierUsed:game.modifier, customLevel:null,
               cansCollected:0, cansDelivered:0,
               helpedByKind:{hungry:0,family:0,elder:0,volunteer:0},
               upgradesChosen:0, highestDistrict:1, runTime:0, completed:false, leaderboardRank:null };
  stats.data.totalRunsStarted++;
  stats.save();
}
function startRun(useSeed){
  // seed from URL hash if present, or explicit, or random
  let seed;
  if(useSeed && !isNaN(useSeed)) seed = useSeed;
  else { const h = parseInt((location.hash||'').replace('#','')); seed = (h && !isNaN(h)) ? h : ((Math.random()*1e9)|0); }
  SAVE.clear();
  game.seed = seed;
  game.district = crGetSelectedStartDistrict();
  game.totalScore=0;
  game.modifier = pickModifier();
  resetPlayerUpgrades();
  genCity(game.seed, game.district, game.modifier);
  player.cans=0; player.stamina=player.maxStamina;
  sharedEnterPlay();
  initRunTracking(seed);
  game.run.highestDistrict = game.district;
  game.run.customLevel = null;
  game.run.harnessOnly = false;
  onboardingOpen = false;
  syncOnboardingPanel();
  if(!_crBlockHarnessSave) SAVE.save();
  maybeShowFirstRunHelp();
}
function continueRun(){
  if(SAVE.load()){
    setMsg('Run continued — District '+game.district);
    applyMobileControlSettings();
  } else {
    setMsg('No valid save found');
  }
}
function restartRun(sameSeed){
  const seed = sameSeed ? game.seed : ((Math.random()*1e9)|0);
  game.seed = seed;
  game.district=1; game.totalScore=0;
  game.modifier = pickModifier();
  resetPlayerUpgrades();
  genCity(game.seed, game.district, game.modifier);
  player.cans=0; player.stamina=player.maxStamina;
  state=STATE.PLAY; paused=false;
  lookHintUsed = false; lookHintShownAt = performance.now();
  initRunTracking(seed);
  SAVE.save();
}

function update(dt){
  // fx + popups update always
  for(let i=game.popups.length-1;i>=0;i--){
    const p=game.popups[i]; p.y += p.vy*dt; p.life -= dt*1.1;
    if(p.life<=0) game.popups.splice(i,1);
  }
  if(game.flash>0) game.flash=Math.max(0,game.flash-dt*2.2);
  if(game.handoffFx>0) game.handoffFx=Math.max(0,game.handoffFx-dt*2.0);
  if(game.msgT>0) game.msgT-=dt;
  // radar ring animation
  if(player.radar){ player.radarRingT-=dt*0.5; if(player.radarRingT<0) player.radarRingT=1; }

  if(state!==STATE.PLAY || paused || onboardingOpen) return;

  crApplyPendingInputActions();
  const act = crRefreshSemanticActionMap();

  game.timeLeft -= dt;
  if(player.giveCD>0) player.giveCD=Math.max(0,player.giveCD-dt);
  if(game.revealT>0) game.revealT-=dt;
  if(player.speedBoostT>0) player.speedBoostT-=dt;
  if(player.radar){
    player.radarPingT -= dt;
    if(player.radarPingT<=0){ player.radarPingT=3; player.radarRingT=1; setMsg('* radar ping *'); }
  }
  if(game.timeLeft<=0){ endRun(); return; }

  // sync mobile joystick to inp abstraction (keyboard fallback)
  if(joy.active) syncInpFromJoy();
  else clearMoveInput();

  // edge-detect for one-shot mobile actions
  if(inp.map && !inp._lastMap){ showMinimap=!showMinimap; }
  if(inp.pause && !inp._lastPause){
    if(!paused){ paused=true; SAVE.save(); crTriggerSoundCue('menuHelp'); }
    else { paused=false; }
  }
  if(act.giveHold && !inp._lastGive && !paused){ giveCan(); }
  inp._lastMap = act.mapHold;
  inp._lastPause = act.pauseHold;
  inp._lastGive = act.giveHold;

  const turn=2.4*dt;
  if(act.turnLeft)  player.angle-=turn;
  if(act.turnRight) player.angle+=turn;

  // Sprint: desktop Shift (hold/drain) OR mobile burst tap (spend one block up front)
  const nowSec = performance.now()/1000;
  let burstActive = nowSec < sprintBurstUntil;
  if(burstActive && player.stamina <= 0.1){ sprintBurstUntil = 0; burstActive = false; }
  const shiftHeld = act.sprintHold;
  const sprinting = (shiftHeld || burstActive) && player.stamina>0.1;
  // Keep sprint button visual in sync with burst state
  if(ms_element) ms_element.classList.toggle('pr', burstActive);
  let spd = (sprinting?cfg.sprintSpeed:cfg.walkSpeed);
  if(player.speedBoostT>0) spd*=1.3;
  const mv=spd*dt;
  const fx=Math.cos(player.angle), fy=Math.sin(player.angle);
  const rx=Math.cos(player.angle+Math.PI/2), ry=Math.sin(player.angle+Math.PI/2);
  let dx=0, dy=0;
  const jstr = joyStrength();
  if(joy.active && jstr > 0.02){
    const s = Math.min(1, jstr);
    dx += fx * joy.y * s;
    dy += fy * joy.y * s;
    dx += rx * joy.x * s;
    dy += ry * joy.x * s;
  } else {
    if(act.moveFwd)  { dx+=fx; dy+=fy; }
    if(act.moveBack) { dx-=fx; dy-=fy; }
    if(act.strafeRight){ dx+=rx; dy+=ry; }
    if(act.strafeLeft) { dx-=rx; dy-=ry; }
  }
  const len=Math.hypot(dx,dy)||1; dx=dx/len*mv; dy=dy/len*mv;
  const px0 = player.x, py0 = player.y;
  const moveRes = movePlayerWithCollision(dx, dy);
  window._moveDbg = { joy:jstr.toFixed(3), active:joy.active, paused, mobileMode, mm:mobileInputActive(), st:state, dpx:+(player.x-px0).toFixed(4), dpy:+(player.y-py0).toFixed(4), moveSteps: moveRes.steps };

  const moving=(dx*dx+dy*dy)>0.0001;
  if(shiftHeld && !sprinting && moving && player.stamina <= 0.1){
    const tNow = performance.now()/1000;
    if(tNow - _sprintDenyFeedbackT > 0.75){
      _sprintDenyFeedbackT = tNow;
      crTriggerSoundCue('sprintDenied');
    }
  }
  if(shiftHeld && sprinting && moving){ player.stamina=Math.max(0,player.stamina-cfg.staminaDrain*dt); }
  else if(!burstActive){ player.stamina=Math.min(player.maxStamina, player.stamina+(cfg.staminaRegen+player.regenBonus)*dt); }

  updateAim();
  tickPickups();
  tickExit();
}
function endRun(){
  game.run.runTime = (Date.now() - game.run.startedAt) / 1000;
  game.run.completed = false;
  // update stats
  const s = stats.data;
  s.totalRunsFailed++;
  s.totalTimePlayedSec += game.run.runTime;
  s.totalCansCollected += game.run.cansCollected;
  s.totalCansDelivered += game.run.cansDelivered;
  s.totalPeopleHelped += Object.values(game.run.helpedByKind).reduce((a,b)=>a+b,0);
  for(const k of ['hungry','family','elder','volunteer']) s.helpedByKind[k] += game.run.helpedByKind[k]||0;
  if(game.district-1 > s.highestDistrict) s.highestDistrict = game.district-1;
  if(game.totalScore > s.bestScore) s.bestScore = game.totalScore;
  stats.save();
  // leaderboard entry
  const entry = {
    name: profile.name, score: game.totalScore, durationSec: Math.round(game.run.runTime),
    district: game.district-1, seed: game.seed, modifier: game.modifier,
    completed: false, date: Date.now(),
  };
  leaderboards.add(entry);
  game.run.leaderboardRank = leaderboards.getRank('highestDistrict', entry);
  game.run.active = false;
  window._lastEntry = entry;
  SAVE.clear();
  state=STATE.RESULTS;
  beep(140,0.4,'sawtooth',0.05);
}
function completeRun(){
  // Called when player chooses to end a winning run (districts cleared ≥ target)
  game.run.runTime = (Date.now() - game.run.startedAt) / 1000;
  game.run.completed = true;
  const s = stats.data;
  s.totalRunsCompleted++;
  s.totalTimePlayedSec += game.run.runTime;
  s.totalCansCollected += game.run.cansCollected;
  s.totalCansDelivered += game.run.cansDelivered;
  s.totalPeopleHelped += Object.values(game.run.helpedByKind).reduce((a,b)=>a+b,0);
  s.totalUpgradesChosen += game.run.upgradesChosen;
  for(const k of ['hungry','family','elder','volunteer']) s.helpedByKind[k] += game.run.helpedByKind[k]||0;
  if(game.district > s.highestDistrict) s.highestDistrict = game.district;
  if(game.totalScore > s.bestScore) s.bestScore = game.totalScore;
  if(s.fastestCompletedSec===null || game.run.runTime < s.fastestCompletedSec) s.fastestCompletedSec = Math.round(game.run.runTime);
  stats.save();
  const entry = {
    name: profile.name, score: game.totalScore, durationSec: Math.round(game.run.runTime),
    district: game.district, seed: game.seed, modifier: game.modifier,
    completed: true, date: Date.now(),
  };
  leaderboards.add(entry);
  game.run.leaderboardRank = leaderboards.getRank('bestScores', entry);
  game.run.active = false;
  window._lastEntry = entry;
  SAVE.clear();
  state=STATE.RESULTS;
  beep(880,0.3,'triangle',0.06);
}

