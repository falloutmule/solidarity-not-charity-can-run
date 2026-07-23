// -----------------------------------------------------------------------
// SECTION 2c — RESPONSIVE MOBILE MENU (HTML overlay)
// -----------------------------------------------------------------------
let _rmSel = 0;
let _optionsMenuStamp = 0;
let _crSaveAvailability = false;
function crCheapMobilePortraitKey(){
  if(!mobileInputActive()) return false;
  if(_forcePortraitLayout) return true;
  const vv = window.visualViewport;
  const w = Math.round((vv && vv.width) || innerWidth || 0);
  const h = Math.round((vv && vv.height) || innerHeight || 0);
  if(h > w) return true;
  try { return !!(screen.orientation && String(screen.orientation.type).indexOf('portrait') >= 0); } catch(_e){ return false; }
}
function crFullscreenKey(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}
function crBuildMobileUiKey(){
  return [state, paused?1:0, mobileMode?1:0, mobileOverride || 'auto', crCheapMobilePortraitKey()?1:0,
    crFullscreenKey()?1:0, _controlEditActive?1:0, typeof onboardingOpen !== 'undefined' && onboardingOpen?1:0,
    lookHintUsed?1:0, _optionsMenuStamp, state === STATE.TITLE && _crSaveAvailability?1:0].join('|');
}
function crBuildMobileLayoutKey(){
  const vv = window.visualViewport;
  const orientation = (() => { try { return screen.orientation && screen.orientation.type || ''; } catch(_e){ return ''; } })();
  return [Math.round(innerWidth||0), Math.round(innerHeight||0),
    Math.round(vv && vv.width || 0), Math.round(vv && vv.height || 0), orientation,
    _crMobileUiStats.safeAreaRevision, mobileMode?1:0, crCheapMobilePortraitKey()?1:0, crFullscreenKey()?1:0,
    Number(options.joySizePx)||110, Number(options.buttonSizePx)||85, Number(options.lookSizePx)||0,
    Number(options.controlsYOffsetPx)||0, Number(options.controlOpacityValue)||0, Number(options.minimapSizePx)||0,
    _crMobileUiStats.overrideRevision, _controlEditActive?1:0].join('|');
}
function rmenuShow(){ crToggleClass(document.getElementById('rmenu'), 'in', false); }
function rmenuHide(){ crToggleClass(document.getElementById('rmenu'), 'in', true); }
function rmenuClearForGameplay(){
  const r = document.getElementById('rmenu');
  if(!r) return;
  if(r._touchAction){
    _crTouchDeferredUi = true;
    crMarkMobileUiDirty('active-touch-deferred-clear');
    return;
  }
  r._touchAction = '';
  crWriteHtml(r, '');
  rmenuHide();
}
function rmenuHTML(html){
  const r = document.getElementById('rmenu');
  // Avoid rebuilding the menu every animation frame. On mobile, continuous
  // innerHTML replacement can swallow taps and reset focused text/number inputs.
  if(!r) return false;
  // If a mobile tap is in progress, keep the touched DOM node alive until touchend.
  // This preserves the real-phone menu-tap fix even if a frame redraw happens mid-tap.
  if(r._touchAction){
    _crTouchDeferredUi = true;
    crMarkMobileUiDirty('active-touch-deferred-html');
    return false;
  }
  return crWriteHtml(r, html);
}
function rmenuSel(len){ _rmSel = Math.max(0, Math.min(len-1, _rmSel||0)); return _rmSel; }

function rmenuAction(action){
  if(action && action !== 'noop') crMarkMobileUiDirty(action);
  if(action && action.indexOf('option-') === 0){
    _optionsMenuStamp++;
    if(['option-mobile','option-joy','option-buttons','option-looksize','option-ctrlheight','option-opacity','option-mapsize','option-edit-controls','option-reset-controls'].indexOf(action) >= 0){
      crMarkMobileLayoutDirty(action);
    }
  }
  switch(action){
    case 'noop': break;
    case 'toggle-fs': toggleFullscreen(); break;
    case 'title-start': startRun(); break;
    case 'title-cycle-district': crCycleSelectedStartDistrict(); drawMobileMenu(); break;
    case 'title-seeded': seedInput=''; state=STATE.SEEDED; _rmSel=0; break;
    case 'title-continue': if(SAVE.hasValid()) continueRun(); else setMsg('No saved run'); break;
    case 'title-stats': state=STATE.STATS; _rmSel=0; break;
    case 'title-lb': state=STATE.LB; _rmSel=0; break;
    case 'title-options': nameInput=profile.name||'RUNNER'; state=STATE.OPTIONS; _rmSel=0; crTriggerSoundCue('menuHelp'); break;
    case 'seed-start': {
      const el=document.getElementById('rseedinp');
      const raw=(el?el.value:seedInput)||'';
      seedInput=raw;
      const v=parseInt(raw,10);
      if(!Number.isNaN(v)) startRun(v); else startRun();
      break;
    }
    case 'seed-random': startRun(); _rmSel=0; break;
    case 'back-title-seeded': state=STATE.TITLE; _rmSel=3; break;
    case 'back-title-stats': state=STATE.TITLE; _rmSel=4; break;
    case 'back-title-lb': state=STATE.TITLE; _rmSel=5; break;
    case 'back-title-options': state=STATE.TITLE; _rmSel=6; break;
    case 'option-name': editRunnerName(); break;
    case 'option-mobile': {
      const vals=['auto','on','off'];
      const c=vals.indexOf(options.mobileControls);
      options.mobileControls=vals[(c+1)%vals.length];
      mobileOverride=options.mobileControls==='auto'?null:options.mobileControls;
      setMobileMode(isMobile()); options.save(); drawMobileMenu();
      break;
    }
    case 'option-look': options.lookSpeed=cycleStepValue(options.lookSpeed,LOOK_SPEED_STEPS); options.save(); drawMobileMenu(); break;
    case 'option-joy': options.joySizePx=cycleStepValue(options.joySizePx,JOY_SIZE_STEPS); options.save(); applyMobileControlSettings(); drawMobileMenu(); break;
    case 'option-buttons': options.buttonSizePx=cycleStepValue(options.buttonSizePx,BTN_SIZE_STEPS); options.save(); applyMobileControlSettings(); drawMobileMenu(); break;
    case 'option-looksize': options.lookSizePx=cycleStepValue(options.lookSizePx,LOOK_PAD_SIZE_STEPS); options.save(); applyMobileControlSettings(); drawMobileMenu(); break;
    case 'option-ctrlheight': bumpControlHeight(); break;
    case 'option-opacity': options.controlOpacityValue=cycleStepValue(options.controlOpacityValue,OPACITY_STEPS); options.save(); applyMobileControlSettings(); drawMobileMenu(); break;
    case 'option-mapsize': options.minimapSizePx=cycleStepValue(options.minimapSizePx,MINIMAP_SIZE_STEPS); options.save(); drawMobileMenu(); break;
    case 'option-deadzone': options.touchDeadzonePx=cycleStepValue(options.touchDeadzonePx,DEADZONE_STEPS); options.save(); drawMobileMenu(); break;
    case 'option-minimap': options.minimapDefault=!options.minimapDefault; showMinimap=options.minimapDefault; options.save(); drawMobileMenu(); break;
    case 'option-fx': options.reduceFx=!options.reduceFx; options.save(); drawMobileMenu(); break;
    case 'option-prefab-debug': {
      if(!game) break;
      game.prefabDebugEnabled = !game.prefabDebugEnabled;
      drawMobileMenu();
      break;
    }
    case 'option-sound': options.soundOn = options.soundOn === false; options.save(); drawMobileMenu(); break;
    case 'option-edit-controls':
      rmenuHide();
      crEnterControlEditMode();
      break;
    case 'option-reset-controls':
      crResetControlLayoutOverrides();
      options.save();
      drawMobileMenu();
      break;
    case 'option-mouse': options.mouseSens=options.mouseSens>0.003?0.0015:parseFloat((options.mouseSens+0.0005).toFixed(4)); options.save(); drawMobileMenu(); break;
    case 'result-new': SAVE.clear(); startRun(); _rmSel=0; break;
    case 'result-retry':
      SAVE.clear();
      if(game.run && game.run.customLevel) startCustomLevel(game.run.customLevel);
      else startRun(game.run.seedUsed);
      _rmSel=0;
      break;
    case 'result-lb': state=STATE.LB; _rmSel=0; break;
    case 'result-title': state=STATE.TITLE; _rmSel=0; break;
    case 'pause-resume': paused=false; crResetPauseRenderHistory('pause-resume'); rmenuHide(); clearInputState(); break;
    case 'pause-help': showOnboardingHelp({ fromPause: true }); break;
    case 'show-onboarding': showOnboardingHelp({}); break;
    case 'pause-restart': paused=false; rmenuHide(); SAVE.clear(); restartRun(false); break;
    case 'pause-title': paused=false; rmenuHide(); state=STATE.TITLE; _rmSel=0; break;
    case 'upgrade-0': chooseUpgrade(0); break;
    case 'upgrade-1': chooseUpgrade(1); break;
    case 'upgrade-2': chooseUpgrade(2); break;
    default:
      if(action && action.indexOf('custom-level-')===0){
        startCustomLevel(action.slice('custom-level-'.length));
      }
      break;
  }
}

function drawMobileMenu(){
  _crMobileUiStats.drawCalls++;
  let uiKey = crBuildMobileUiKey();
  const layoutKey = crBuildMobileLayoutKey();
  const needsLayout = _crMobileLayoutDirty || layoutKey !== _crLastMobileLayoutKey;
  if(!_crMobileUiDirty && !needsLayout && uiKey === _crLastMobileUiKey){
    _crMobileUiStats.stableEarlyOuts++;
    return;
  }
  // Save availability is refreshed only after the cheap key proves UI work is
  // necessary, never on stable frames. The key builder itself remains pure.
  if(state === STATE.TITLE){
    try { _crSaveAvailability = !!SAVE.hasValid(); } catch(_e){ _crSaveAvailability = false; }
    uiKey = crBuildMobileUiKey();
  }
  _crMobileUiStats.uiFlushes++;
  _crTouchDeferredUi = false;
  try {
  // Sync in-game fullscreen button visibility each frame.
  const fsbtn = document.getElementById('fsbtn');
  if(fsbtn){
    const showFs = mobileMode && state===STATE.PLAY && !paused && !isFullscreen() && !isMobilePortrait();
    crToggleClass(fsbtn, 'show', showFs);
  }
  const playControls = mobileInputActive() && state===STATE.PLAY && !paused;
  const portraitPlay = playControls && isMobilePortrait();
  const optionsTunePreview = mobileMode && state===STATE.OPTIONS && !_controlEditActive;
  const pauseTunePreview = mobileInputActive() && paused && state===STATE.PLAY && !_controlEditActive;
  const controlEditOverlay = _controlEditActive && mobileInputActive() && isMobilePortrait();
  const showPortraitControls = portraitPlay || controlEditOverlay || (optionsTunePreview && isMobilePortrait()) || (pauseTunePreview && isMobilePortrait());
  const showLandscapeControlsPreview = optionsTunePreview && !isMobilePortrait();
  const mob = document.getElementById('mob');
  if(mob) crWriteStyle(mob, 'pointerEvents', (playControls || pauseTunePreview || controlEditOverlay) ? 'auto' : 'none');
  ['ml','mlookpad','mg','ms'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) crWriteStyle(el, 'display', (showPortraitControls || showLandscapeControlsPreview) ? 'flex' : (playControls ? 'flex' : 'none'));
  });
  const mpEl = document.getElementById('mp');
  if(mpEl){
    crWriteStyle(mpEl, 'display', 'none');
    crWriteStyle(mpEl, 'pointerEvents', 'none');
  }
  const viewEl = document.getElementById('view');
  if(viewEl) crToggleClass(viewEl, 'mob-touch-through', !!((mobileInputActive()) && (playControls || pauseTunePreview || controlEditOverlay)));
  if(needsLayout && (showPortraitControls || showLandscapeControlsPreview || playControls || pauseTunePreview)) applyMobileControlSettings();
  const menuEl = document.getElementById('mportmenu');
  if(menuEl){
    crWriteStyle(menuEl, 'display', (portraitPlay || (optionsTunePreview && isMobilePortrait()) || (pauseTunePreview && isMobilePortrait())) ? 'flex' : 'none');
    crToggleClass(menuEl, 'por-show', !!(portraitPlay || (optionsTunePreview && isMobilePortrait()) || (pauseTunePreview && isMobilePortrait())));
  }
  const mmEl = document.getElementById('mm');
  if(mmEl) crWriteStyle(mmEl, 'display', (playControls && !isMobilePortrait()) ? 'flex' : 'none');
  const mrEl = document.getElementById('mr');
  if(mrEl) crWriteStyle(mrEl, 'display', (playControls && !isMobilePortrait()) ? 'flex' : 'none');

  if(!mobileMode){
    crToggleClass(fsbtn, 'show', false);
    syncLookHintUI();
    return;
  }
  const r = document.getElementById('rmenu');
  if(!r) return;

  // Control edit mode: hide all menu panels; gameplay overlay + edit chrome only.
  if(_controlEditActive){
    rmenuClearForGameplay();
    crToggleClass(r, 'options-tune', false);
    syncLookHintUI();
    return;
  }

  // During active gameplay, never keep title/menu HTML over the world.
  if(state === STATE.PLAY && !paused){
    rmenuClearForGameplay();
    syncLookHintUI();
    return;
  }

  // Large desktop layouts use canvas menus for title/meta screens (phones always use rmenu HTML).
  const metaRmenu = state === STATE.TITLE || state === STATE.SEEDED || state === STATE.STATS || state === STATE.LB || state === STATE.OPTIONS;
  if(!mobileMode && !isMobile() && innerWidth >= 600 && innerHeight >= 400){
    if(metaRmenu){
      rmenuHide();
      syncLookHintUI();
      return;
    }
  }

  syncLookHintUI();
  if(state !== STATE.OPTIONS) crToggleClass(r, 'options-tune', false);

  // ── TITLE ──
  if(state === STATE.TITLE){
    rmenuShow();
    rmenuHTML(`
      <div class="rpantit" style="font-size:16px;margin-bottom:14px;line-height:1.25;">Solidarity Not Charity Can Run</div>
      <div class="rdesc" style="margin-bottom:14px;">A desert-city food run</div>
      ${fileOriginMenuNoteHTML()}
      ${buildTitleRmenuBody()}
      <div class="rclose" style="margin-top:16px;">↑↓ navigate · tap to activate</div>
      <div class="rclose" style="margin-top:6px;color:#5a4a3a;">build ${BUILD_ID}</div>
    `);
    return;
  }

  // ── SEEDED RUN ──
  if(state === STATE.SEEDED){
    rmenuShow();
    const changed = rmenuHTML(`
      <div class="rpantit">SEEDED RUN</div>
      <div class="rdesc">Enter a seed number to replay</div>
      <input type="number" id="rseedinp" value="${seedInput||''}" placeholder="seed"
        style="background:rgba(20,15,10,0.95);border:1px solid rgba(180,150,80,0.4);color:#ffd24a;font:18px monospace;padding:10px 16px;margin:10px;min-width:200px;text-align:center;letter-spacing:2px;border-radius:4px;outline:none;width:220px;"/>
      <div class="rit sel" data-action="seed-start" style="margin-top:8px;">START THIS SEED</div>
      <div class="rit" data-action="seed-random" style="margin-top:4px;">RANDOM SEED</div>
      <div class="rit" data-action="back-title-seeded" style="margin-top:4px;">← BACK</div>
    `);
    if(changed){
      setTimeout(()=>{
        const inp2=document.getElementById('rseedinp');
        if(inp2){ inp2.focus(); inp2.addEventListener('input', e=>{ seedInput=e.target.value; }, {once:false}); }
      }, 50);
    }
    return;
  }

  // ── STATS ──
  if(state === STATE.STATS){
    rmenuShow();
    const s = stats.data;
    rmenuHTML(`
      <div class="rpantit">LIFETIME STATS</div>
      <div style="overflow-y:auto;max-height:62vh;width:100%;padding:0 24px;box-sizing:border-box;">
        <div class="rdesc">Runs completed: <span style="color:#e9d8b0">${s.totalRunsCompleted||0}</span></div>
        <div class="rdesc">Runs failed: <span style="color:#e9d8b0">${s.totalRunsFailed||0}</span></div>
        <div class="rdesc">Best score: <span style="color:#ffd24a">${s.bestScore||0}</span></div>
        <div class="rdesc">Highest district: <span style="color:#e9d8b0">${s.highestDistrict||1}</span></div>
        <div class="rdesc">Cans collected: <span style="color:#e9d8b0">${s.totalCansCollected||0}</span></div>
        <div class="rdesc">Cans delivered: <span style="color:#e9d8b0">${s.totalCansDelivered||0}</span></div>
        <div class="rdesc">People helped: <span style="color:#e9d8b0">${s.totalPeopleHelped||0}</span></div>
        <div class="rdesc" style="margin-top:8px;">By kind:</div>
        <div class="rdesc" style="padding-left:12px;">Hungry: ${s.helpedByKind?.hungry||0}</div>
        <div class="rdesc" style="padding-left:12px;">Family: ${s.helpedByKind?.family||0}</div>
        <div class="rdesc" style="padding-left:12px;">Elder: ${s.helpedByKind?.elder||0}</div>
        <div class="rdesc" style="padding-left:12px;">Volunteer: ${s.helpedByKind?.volunteer||0}</div>
        <div class="rdesc" style="margin-top:8px;">Time played: <span style="color:#e9d8b0">${fmtTime(s.totalTimePlayedSec||0)}</span></div>
      </div>
      <div class="rit" data-action="back-title-stats" style="margin-top:14px;">← BACK</div>
    `); return;
  }

  // ── LEADERBOARDS ──
  if(state === STATE.LB){
    rmenuShow();
    const lb = leaderboards.data.highestDistrict||[];
    const rows = lb.slice(0,10).map((e,i)=>`<div class="rdesc" style="color:${i<3?'#ffd24a':'#b8a878'};">#${i+1} ${e.name||'???'} · D${e.district||1} · ${e.score||0}pts</div>`).join('');
    rmenuHTML(`
      <div class="rpantit">TOP DISTRICT RUNS</div>
      <div style="overflow-y:auto;max-height:55vh;width:100%;padding:0 24px;box-sizing:border-box;">
        ${rows||'<div class="rdesc">No runs yet.</div>'}
      </div>
      <div class="rit" data-action="back-title-lb" style="margin-top:14px;">← BACK</div>
    `); return;
  }

  // ── OPTIONS ──
  if(state === STATE.OPTIONS){
    crToggleClass(r, 'options-tune', mobileMode);
    rmenuShow();
    rmenuHTML(`
      <div class="options-scroll-body">
      <div class="rpantit">OPTIONS</div>
      <div class="rdesc" style="margin-bottom:8px;color:#6a5a4a;">build ${BUILD_ID}</div>
      <div class="options-section-hdr">CONTROLS</div>
      <div class="rit" data-action="option-edit-controls">EDIT CONTROLS</div>
      <div class="rit" data-action="option-reset-controls">RESET CONTROLS</div>
      <div class="rit" data-action="option-look">LOOK SPEED: ${lookSpeedLabel(options.lookSpeed)}</div>
      <div class="rit" data-action="option-deadzone">DEADZONE: ${options.touchDeadzonePx}</div>
      <div class="rit" data-action="option-mobile">MOBILE: ${options.mobileControls.toUpperCase()}</div>
      <div class="options-section-hdr">AUDIO</div>
      <div class="rit" data-action="option-sound">SOUND: ${options.soundOn !== false?'ON':'OFF'}</div>
      <div class="options-section-hdr">DISPLAY</div>
      <div class="rit" data-action="option-minimap">MINIMAP DEFAULT: ${options.minimapDefault?'ON':'OFF'}</div>
      <div class="rit" data-action="option-fx">REDUCE FX: ${options.reduceFx?'ON':'OFF'}</div>
      <div class="options-section-hdr">FACADE DEBUG</div>
      <div class="rit" data-action="option-prefab-debug">PREFAB/FACADE DEBUG: ${game && game.prefabDebugEnabled ? 'ON' : 'OFF'}</div>
      <div class="options-section-hdr">HELP</div>
      <div class="rit" data-action="show-onboarding">HOW TO PLAY</div>
      <div class="options-section-hdr">SYSTEM</div>
      <div class="rit" data-action="option-name">NAME: ${profile.name||'RUNNER'}</div>
      <div class="rit" data-action="toggle-fs">${isFullscreen()?'EXIT FULLSCREEN':'FULLSCREEN'}</div>
      <div class="rit" data-action="back-title-options">← BACK</div>
      <div class="rdesc" style="margin-top:10px;">Use EDIT CONTROLS to move or resize MOVE, GIVE, LOOK, and SPRINT.</div>
      </div>
      <span style="display:none" data-om-stamp="${_optionsMenuStamp}"></span>
    `); return;
  }

  // ── UPGRADE CHOICE ──
  if(state === STATE.UPGRADE){
    rmenuShow();
    const off = window._offered || [];
    const buttons = off.map((u,i)=>`<div class="rit ${i===0?'sel':''}" data-action="upgrade-${i}" style="margin-top:6px;">${u.name}<br><span style="font-size:11px;color:#8a7a5a;">${u.desc}</span></div>`).join('');
    rmenuHTML(`
      <div class="rpantit">CHOOSE UPGRADE</div>
      <div class="rdesc">District cleared — pick one</div>
      ${buttons || '<div class="rdesc">No upgrades available.</div>'}
    `);
    return;
  }

  // ── RESULTS ──
  if(state === STATE.RESULTS){
    rmenuShow();
    const run = game.run||{};
    const hk = run.helpedByKind||{};
    rmenuHTML(`
      <div class="rpantit">RUN ENDED</div>
      <div class="rdesc">${run.completed?(run.customLevel?'Hall Of Servants cleared!':'All districts cleared!'):'Time ran out.'}</div>
      <div class="rdesc" style="margin-top:8px;">Score: <span style="color:#ffd24a;font-size:16px;">${game.totalScore||0}</span></div>
      <div class="rdesc">District: <span style="color:#e9d8b0">${Math.max(1,(game.district||1)-1)}</span></div>
      <div class="rdesc">Cans delivered: <span style="color:#e9d8b0">${run.cansDelivered||0}</span></div>
      <div class="rdesc">People helped: <span style="color:#e9d8b0">${Object.values(hk).reduce((a,b)=>a+b,0)}</span></div>
      <div class="rit sel" data-action="result-new" style="margin-top:14px;">NEW RUN</div>
      <div class="rit" data-action="result-retry" style="margin-top:4px;">RETRY SAME SEED</div>
      <div class="rit" data-action="result-lb" style="margin-top:4px;">LEADERBOARDS</div>
      <div class="rit" data-action="result-title" style="margin-top:4px;">MAIN MENU</div>
    `); return;
  }

  // ── PAUSED ──
  if(paused && state===STATE.PLAY){
    rmenuShow();
    rmenuHTML(`
      <div class="rpantit">PAUSED</div>
      <div class="rit sel" data-action="pause-resume">RESUME</div>
      <div class="rit" data-action="pause-help" style="margin-top:6px;">HOW TO PLAY</div>
      <div class="rit" data-action="pause-restart" style="margin-top:6px;">RESTART RUN</div>
      <div class="rit" data-action="pause-title" style="margin-top:6px;">MAIN MENU</div>
      <div class="rit" data-action="toggle-fs" style="margin-top:6px;">${isFullscreen()?'EXIT FULLSCREEN':'FULLSCREEN'}</div>
      <div class="rdesc" style="margin-top:14px;">Run will be saved.</div>
    `); return;
  }

  rmenuHide();
  } finally {
    _crLastMobileLayoutKey = layoutKey;
    _crMobileUiStats.lastLayoutKey = layoutKey;
    _crMobileLayoutDirty = false;
    if(_crTouchDeferredUi){
      _crMobileUiDirty = true;
      crRememberMobileDirtyReason('active-touch-deferred');
    } else {
      _crLastMobileUiKey = uiKey;
      _crMobileUiStats.lastUiKey = uiKey;
      _crMobileUiDirty = false;
    }
  }
}
