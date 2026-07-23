// ---------------------------------------------------------------------------
// SECTION 13 — MAIN LOOP
// ---------------------------------------------------------------------------
// Portrait gameplay area: fixed landscape-aspect window at top, controls below.
// The gameplay is a horizontal 320×200 view sitting in the upper portion of the
// portrait screen — not stretched to fill the full portrait height.
function portraitPlayH(){
  const { cw } = layoutCssSize();
  const w = cw || view.width;
  return Math.round(w * (RH/RW) * 1.05);
}
function rectsOverlap(a,b){
  if(!a||!b) return true;
  return !(a.left+a.width <= b.left || b.left+b.width <= a.left ||
           a.top+a.height <= b.top || b.top+b.height <= a.top);
}
/** Shift portrait control rect by dock offset (px). */
function portraitShiftY(rect, dy){
  return { left: rect.left, top: Math.round(rect.top + dy), width: rect.width, height: rect.height };
}
/*
 * PORTRAIT CONTROL CONTRACT (thumb real estate — do not break without explicit user request)
 * ---------------------------------------------------------------------------
 * Vertical stack (top → bottom): FPV (fixed) → minimap (fixed, full width in band) →
 * MENU (fixed, centered under minimap) → control dock band → stats (fixed, bottom).
 *
 * Thumb zones (portrait mobile):
 *   MOVE  — left dock, circular joystick (#ml / moveRect). Primary locomotion.
 *   GIVE  — above MOVE, smaller circle; stacked intentionally to save horizontal space.
 *   LOOK  — right dock, circular pad (#mlookpad / lookRect). Camera turn; portrait gain via PORTRAIT_LOOK_BOOST.
 *   SPRINT — overlaps LOOK intentionally (sprintRect offset from lookRect); burst/toggle tap, not hold.
 *
 * CONTROL DOCK HEIGHT (options.controlsYOffsetPx / CONTROL_Y_STEPS):
 *   Moves ONLY: moveRect, giveRect, lookRect, sprintRect (via portraitShiftY).
 *   Does NOT move: fpvRect, minimapRect, menuRect, statsRect, PAUSE/MAP chrome positions.
 *
 * Layout tuning: JOY SIZE, BUTTON SIZE, LOOK SIZE are independent OPTIONS steps.
 * Do not "clean up" overlap, recentre MENU with dock, or widen minimap outside contract.
 * Kanban Card 5 / BUILD_ID contract1 documents this contract for future edits.
 */
/** Portrait layout — FPV (fixed) → minimap (fixed) → MENU (fixed below minimap) → dock controls → stats (fixed). */
function crRuntimeBuildIdentityPass(){
  return typeof BUILD_ID !== 'undefined' && typeof globalThis !== 'undefined' && globalThis.BUILD_ID === BUILD_ID;
}

function portraitLayout(overrideYOffset, layoutOpts){
  const skipMinimapClamp = !!(layoutOpts && layoutOpts.skipMinimapClamp);
  const { cw, ch } = layoutCssSize();
  const sa = readSafeAreaInsets();
  const fpvH = portraitPlayH();
  const miniH = Math.round(Math.max(128, ch * 0.238));
  const miniW = Math.round(cw * 0.91);
  const miniX = Math.round((cw - miniW) / 2);
  const statsH = Math.round(Math.max(64, ch * 0.082));
  const statsY = ch - statsH - sa.bottom;
  const bandTop = fpvH;
  const minimapRect = { x:miniX, y:bandTop, w:miniW, h:miniH };
  const controlsY0 = bandTop + miniH;
  const controlsH = Math.max(88, statsY - controlsY0);
  const fpvRect = { x:0, y:0, w:cw, h:fpvH };
  const controlsRect = { x:0, y:controlsY0, w:cw, h:controlsH };
  const statsRect = { x:sa.left, y:statsY, w:Math.max(0, cw - sa.left - sa.right), h:statsH };
  const btnSize = Math.min(180, Math.max(56, Number(options.buttonSizePx) || 85));
  const joySize = Math.min(220, Math.max(72, Math.round(Number(options.joySizePx) || 110)));
  const giveSize = Math.round(Math.max(48, btnSize * 0.72));
  const lookSize = Math.min(240, Math.max(64, Math.round(Number(options.lookSizePx) || btnSize * 1.18)));
  const sprintSize = Math.round(Math.max(48, btnSize * 0.68));
  const padL = 10 + sa.left, padR = 10 + sa.right;
  const menuH = 44;
  const ctrlY0 = controlsY0;
  const dockOffset = overrideYOffset !== undefined
    ? (Number(overrideYOffset) || 0)
    : (Number(options.controlsYOffsetPx) || 0);
  const dy = dockOffset;
  const baseDockBot = ctrlY0 + Math.round(controlsH * 0.66);
  let moveRect = { left:padL, top: baseDockBot - joySize, width:joySize, height:joySize };
  let giveRect = {
    left: moveRect.left + Math.round((joySize - giveSize) * 0.5),
    top: moveRect.top - giveSize - 12,
    width: giveSize, height: giveSize
  };
  const lookLeft = cw - padR - lookSize;
  const lookTop = baseDockBot - lookSize + 2;
  let lookRect = { left:lookLeft, top:lookTop, width:lookSize, height:lookSize };
  let sprintRect = {
    left: lookLeft + Math.round(lookSize * 0.40),
    top: lookTop - Math.round(sprintSize * 0.42),
    width: sprintSize, height: sprintSize
  };
  const menuW = Math.round(Math.min(160, cw * 0.42));
  let menuRect = {
    left: Math.round((cw - menuW) / 2),
    top: Math.round(ctrlY0 + 6),
    width: menuW, height: menuH
  };
  moveRect = portraitShiftY(moveRect, dy);
  giveRect = portraitShiftY(giveRect, dy);
  lookRect = portraitShiftY(lookRect, dy);
  sprintRect = portraitShiftY(sprintRect, dy);
  /* menuRect: fixed below minimap — not shifted by controlsYOffsetPx */
  const maxCtlBot = statsY - 4;
  [moveRect, lookRect, sprintRect, giveRect].forEach(r=>{
    if(r.top + r.height > maxCtlBot) r.top = Math.max(controlsY0, maxCtlBot - r.height);
  });
  if(!skipMinimapClamp){
    crApplyMinimapUsabilityClamp(moveRect, giveRect, lookRect, sprintRect, minimapRect, controlsY0, statsY);
  }
  const overlap = crMinimapOverlapMetrics({
    minimapRect, moveRect, giveRect, lookRect, sprintRect,
  });
  let layoutOut = { fpvRect, minimapRect, statsRect, controlsRect, moveRect, giveRect, sprintRect, lookRect, menuRect, controlsYOffsetApplied: dy, dockDy: dy, safeAreaInsets: sa, minimapOverlap: overlap };
  if(!(layoutOpts && layoutOpts.skipUserOverrides)){
    layoutOut = crApplyUserControlOverrides(layoutOut, cw, ch, sa);
  }
  return layoutOut;
}
function drawPortraitDashboardChrome(){
  if(!mobileMode || !isMobilePortrait()) return;
  const L = portraitLayout();
  const y0 = L.fpvRect.h;
  ctx.fillStyle = '#0c0a08';
  ctx.fillRect(0, y0, view.width, view.height - y0);
  if(L.minimapRect.y > y0){
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(0, y0, view.width, L.minimapRect.y - y0);
  }
  ctx.fillStyle = 'rgba(16,12,10,0.94)';
  ctx.fillRect(L.minimapRect.x, L.minimapRect.y, L.minimapRect.w, L.minimapRect.h);
  ctx.fillStyle = 'rgba(10,8,6,0.98)';
  ctx.fillRect(L.controlsRect.x, L.controlsRect.y, L.controlsRect.w, L.controlsRect.h);
  ctx.fillStyle = 'rgba(14,11,9,0.96)';
  ctx.fillRect(L.statsRect.x, L.statsRect.y, L.statsRect.w, L.statsRect.h);
  ctx.strokeStyle = 'rgba(190,158,104,0.22)'; ctx.lineWidth = 1;
  [L.minimapRect.y, L.controlsRect.y, L.statsRect.y].forEach(yy=>{
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(view.width, yy); ctx.stroke();
  });
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = 'rgba(210,170,110,0.92)';
  ctx.fillText('build ' + BUILD_ID, L.menuRect.left, L.menuRect.top + L.menuRect.height + 11);
}
function drawPortraitStatsPanel(){
  const L = portraitLayout();
  const r = L.statsRect;
  ctx.fillStyle = 'rgba(8,6,5,0.92)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(40,120,220,0.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(r.x + 6, r.y + 3); ctx.lineTo(r.x + r.w - 6, r.y + 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r.x + 6, r.y + r.h - 3); ctx.lineTo(r.x + r.w - 6, r.y + r.h - 3); ctx.stroke();
  const t = Math.max(0, game.timeLeft).toFixed(1);
  const stamPct = Math.round(Math.max(0, Math.min(100, (player.stamina / Math.max(1, player.maxStamina)) * 100)));
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#b8ffb8';
  ctx.fillText('TIME ' + t, r.x + 10, r.y + 16);
  ctx.fillStyle = '#e8e8f0';
  ctx.fillText('CANS ' + player.cans + '/' + player.maxCans, r.x + 108, r.y + 16);
  ctx.fillStyle = '#cfe0ff';
  ctx.fillText('STAM ' + stamPct + '%', r.x + r.w - 108, r.y + 16);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#9fffb6';
  ctx.fillText('PEOPLE ' + game.helped + '/' + game.quota + ' helped · ' + game.delivered + ' delivered', r.x + 10, r.y + 36);
  if(game.helped >= game.quota && game.exit && game.exit.active){
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffe566';
    ctx.fillText('EXIT READY — find the glowing gate', r.x + 10, r.y + 50);
  }
  ctx.fillStyle = '#c8b888';
  const meta = 'D' + game.district + ' [' + game.modifier.toUpperCase() + '] x' + game.scoreMult +
    '   SEED ' + game.seed + '   SCORE ' + game.totalScore;
  ctx.fillText(meta, r.x + 10, r.y + 54);
  ctx.fillStyle = '#4a4035';
  ctx.font = '10px monospace';
  ctx.fillText('build ' + BUILD_ID, r.x + r.w - 88, r.y + r.h - 8);
}
function drawPortraitFpvOverlay(now){
  const L = portraitLayout();
  const cx = L.fpvRect.w / 2, cy = L.fpvRect.h / 2;
  const aim = game.aimNpc;
  if(aim){
    const ok = player.cans >= aim.need;
    ctx.strokeStyle = ok ? 'rgba(140,255,170,0.95)' : 'rgba(255,140,90,0.95)';
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.stroke();
    if(ok && CR_VISUAL_READABILITY.giveTargetHighlight){
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#8dffb8'; ctx.fillText('GIVE', cx, cy - 16);
      ctx.textAlign = 'left';
    }
    ctx.font = '12px monospace'; ctx.textAlign = 'center';
    const lbl = aim.kind.toUpperCase() + ' · needs ' + aim.need + ' · you ' + player.cans;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; const lw = ctx.measureText(lbl).width;
    ctx.fillRect(cx - lw / 2 - 6, cy + 14, lw + 12, 16);
    ctx.fillStyle = ok ? '#a8ffc0' : '#ffb088'; ctx.fillText(lbl, cx, cy + 16);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = 'rgba(220,220,228,0.8)';
    ctx.fillRect(cx - 1, cy - 5, 2, 4); ctx.fillRect(cx - 1, cy + 1, 2, 4);
    ctx.fillRect(cx - 5, cy - 1, 4, 2); ctx.fillRect(cx + 1, cy - 1, 4, 2);
  }
  if(game.msg && game.msgT > 0){
    ctx.font = '15px monospace';
    const mw = ctx.measureText(game.msg).width;
    ctx.fillStyle = 'rgba(20,16,8,0.6)'; ctx.fillRect(cx - mw / 2 - 10, 12, mw + 20, 22);
    ctx.fillStyle = '#ffd24a'; ctx.textAlign = 'center'; ctx.fillText(game.msg, cx, 16); ctx.textAlign = 'left';
  }
  for(const p of game.popups){
    ctx.font = '13px monospace'; ctx.textAlign = 'center';
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
    const py = Math.min(p.y, L.fpvRect.h - 8);
    const pw = ctx.measureText(p.text).width;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(p.x - pw / 2 - 4, py - 2, pw + 8, 14);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, py);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}

function playfieldLayout(){
  // Use the actual canvas backing-store dimensions for perfect consistency.
  const cw = view.width, ch = view.height;
  if(mobileMode && isMobilePortrait()){
    const pH = portraitLayout().fpvRect.h;
    const scale = pH / RH;
    const dw = RW * scale, dh = RH * scale;
    return {scale,dw,dh,ox:(cw-dw)/2,oy:0, portrait:true, playH:ch, cropH:dh};
  }
  const fit = Math.min(cw/RW, ch/RH);
  // On mobile landscape, cover the screen so the world fills under overlays.
  const scale = (mobileMode && cw > ch)
    ? Math.max(cw/RW, ch/RH)
    : fit;
  const dw = RW*scale, dh = RH*scale;
  return {scale,dw,dh,ox:(cw-dw)/2,oy:(ch-dh)/2,portrait:false,playH:ch,cropH:dh};
}

const CR_FIXED_STEP_DT = 1 / 60;
const CR_FIXED_STEP_MAX_FRAME_DT = 0.25;
const CR_FIXED_STEP_MAX_STEPS_PER_FRAME = 5;

let crFixedStepAccumulator = 0;
let crFixedStepLastFrameDt = 0;
let crFixedStepLastSteps = 0;
let crFixedStepDroppedFrames = 0;
let crRenderPosePrevious = null;
let crRenderPoseCurrent = null;
let crRenderPoseLifecycleState = null;
let crRenderPoseLifecycleDistrict = null;
let crFixedStepVisibilityResetPending = false;

function crReadAuthoritativeRenderPose(){
  return { x: player.x, y: player.y, angle: player.angle };
}

function crResetRenderPoseHistory(reason){
  const pose = crReadAuthoritativeRenderPose();
  crRenderPosePrevious = { x: pose.x, y: pose.y, angle: pose.angle };
  crRenderPoseCurrent = { x: pose.x, y: pose.y, angle: pose.angle };
  crRenderPoseLifecycleState = state;
  crRenderPoseLifecycleDistrict = game.district;
  try {
    if(typeof crResetRenderAngleHistory === 'function') crResetRenderAngleHistory(reason);
  } catch(_renderAngleResetError){}
}

function crRenderPoseLifecycleChanged(){
  return crRenderPoseLifecycleState !== state || crRenderPoseLifecycleDistrict !== game.district;
}

function crRenderPoseDetachedFromPlayer(){
  return !crRenderPoseCurrent ||
    crRenderPoseCurrent.x !== player.x ||
    crRenderPoseCurrent.y !== player.y;
}

function crEnsureRenderPoseHistory(){
  if(!crRenderPosePrevious || !crRenderPoseCurrent || crRenderPoseLifecycleChanged() || crRenderPoseDetachedFromPlayer()){
    crResetRenderPoseHistory('lifecycle-or-pose-discontinuity');
  }
}

function crCaptureSimulationPoseBeforeStep(){
  crEnsureRenderPoseHistory();
  crRenderPosePrevious = {
    x: crRenderPoseCurrent.x,
    y: crRenderPoseCurrent.y,
    angle: crRenderPoseCurrent.angle,
  };
}

function crCaptureSimulationPoseAfterStep(){
  if(crRenderPoseLifecycleChanged()){
    crResetRenderPoseHistory('lifecycle-change');
    return;
  }
  const pose = crReadAuthoritativeRenderPose();
  crRenderPoseCurrent = { x: pose.x, y: pose.y, angle: pose.angle };
  crRenderPoseLifecycleState = state;
  crRenderPoseLifecycleDistrict = game.district;
}

function crGetRenderInterpolationAlpha(){
  const raw = crFixedStepAccumulator / CR_FIXED_STEP_DT;
  if(!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(1 - Number.EPSILON, raw);
}

function crGetInterpolatedRenderPose(){
  crEnsureRenderPoseHistory();
  const alpha = crGetRenderInterpolationAlpha();
  const previous = crRenderPosePrevious;
  const current = crRenderPoseCurrent;
  const x = previous.x + (current.x - previous.x) * alpha;
  const y = previous.y + (current.y - previous.y) * alpha;
  return {
    x,
    y,
    angle: player.angle,
    alpha,
    interpolatedPosition: x !== player.x || y !== player.y,
    authoritativeX: player.x,
    authoritativeY: player.y,
    previousX: previous.x,
    previousY: previous.y,
  };
}

function crResetFixedStepSimulation(){
  crFixedStepAccumulator = 0;
  crFixedStepLastFrameDt = 0;
  crFixedStepLastSteps = 0;
  crFixedStepDroppedFrames = 0;
  crResetRenderPoseHistory('fixed-step-reset');
}

function crClampFixedFrameDt(dt){
  if(!Number.isFinite(dt) || dt < 0) return 0;
  return Math.min(dt, CR_FIXED_STEP_MAX_FRAME_DT);
}

function crStepSimulationFixed(frameDt){
  const dt = crClampFixedFrameDt(frameDt);
  if(dt !== frameDt) crResetRenderPoseHistory('fixed-step-clamp');
  crFixedStepLastFrameDt = dt;
  crFixedStepAccumulator += dt;

  let steps = 0;
  while(crFixedStepAccumulator >= CR_FIXED_STEP_DT && steps < CR_FIXED_STEP_MAX_STEPS_PER_FRAME){
    crCaptureSimulationPoseBeforeStep();
    update(CR_FIXED_STEP_DT);
    crCaptureSimulationPoseAfterStep();
    crFixedStepAccumulator -= CR_FIXED_STEP_DT;
    steps++;
  }

  if(steps >= CR_FIXED_STEP_MAX_STEPS_PER_FRAME && crFixedStepAccumulator >= CR_FIXED_STEP_DT){
    crFixedStepDroppedFrames++;
    crFixedStepAccumulator = 0;
    crResetRenderPoseHistory('fixed-step-drop');
  }

  crFixedStepLastSteps = steps;
  return {
    dt,
    steps,
    accumulator: crFixedStepAccumulator,
    droppedFrames: crFixedStepDroppedFrames,
  };
}

function crGetFixedStepState(){
  return {
    enabled: true,
    stepDt: CR_FIXED_STEP_DT,
    maxFrameDt: CR_FIXED_STEP_MAX_FRAME_DT,
    maxStepsPerFrame: CR_FIXED_STEP_MAX_STEPS_PER_FRAME,
    accumulator: crFixedStepAccumulator,
    lastFrameDt: crFixedStepLastFrameDt,
    lastSteps: crFixedStepLastSteps,
    droppedFrames: crFixedStepDroppedFrames,
  };
}

document.addEventListener('visibilitychange', ()=>{
  crFixedStepAccumulator = 0;
  crFixedStepVisibilityResetPending = true;
  crResetRenderPoseHistory('visibility-change');
});

let last=performance.now();
function frame(now){
  if(CR_PERF_PROBE) crPerfProbeEnsureInstalled();
  if(CR_PERF_PROBE) crPerfProbeFrameStart(now);
  if(!SNCHarnessAdapter.allowFrame()) return requestAnimationFrame(frame);
  const rawDt = crFixedStepVisibilityResetPending ? 0 : (now-last)/1000;
  crFixedStepVisibilityResetPending = false;
  last=now;
  crEnsureRenderPoseHistory();
  crApplyPendingInputActions();
  crStepSimulationFixed(rawDt);
  const renderPose = crGetInterpolatedRenderPose();
  let selectedRenderAngle = player.angle;
  try {
    if(typeof crGetSelectedRenderAngleMode === 'function'){
      const angleMode = crGetSelectedRenderAngleMode();
      if(angleMode === 'raw' && typeof crGetRawRenderAngle === 'function'){
        crGetRawRenderAngle();
        selectedRenderAngle = player.angle;
      } else if(angleMode === 'interp' && typeof crGetInterpolatedRenderAngle === 'function'){
        selectedRenderAngle = crGetInterpolatedRenderAngle();
      } else if(angleMode === 'smooth' && typeof crGetSmoothedRenderAngle === 'function'){
        selectedRenderAngle = crGetSmoothedRenderAngle();
      }
    }
  } catch(_renderAngleSelectionError){
    selectedRenderAngle = player.angle;
  }
  renderPose.angle = Number.isFinite(selectedRenderAngle) ? selectedRenderAngle : player.angle;

  if(state===STATE.PLAY || state===STATE.UPGRADE){
    // full game scene render
    drawScene(now, renderPose);
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#000'; ctx.fillRect(0,0,innerWidth,innerHeight);
    const {dw,dh,ox,oy} = playfieldLayout();
    ctx.drawImage(buf,ox,oy,dw,dh);
    if(game.modifier==='rainy' && state===STATE.PLAY){
      ctx.fillStyle='rgba(40,60,90,0.16)'; ctx.fillRect(0,0,innerWidth,innerHeight);
      ctx.strokeStyle='rgba(170,195,225,0.22)'; ctx.lineWidth=1;
      const t=now/60;
      for(let i=0;i<60;i++){
        const rx=(i*97 + t*3) % innerWidth;
        const ry=(i*53 + t*8) % innerHeight;
        ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-3,ry+10); ctx.stroke();
      }
    } else if(state===STATE.PLAY && !options.reduceFx){
      ctx.fillStyle='rgba(220,180,120,0.05)'; ctx.fillRect(0,0,innerWidth,innerHeight);
    }
    if(state===STATE.PLAY && !paused){
      drawPortraitDashboardChrome();
      drawHUD(now); drawMinap();
    } else if(state===STATE.PLAY && paused && mobileMode && isMobilePortrait()){
      drawPortraitDashboardChrome();
    }
    drawOverlays();
    drawMobileMenu();
  }
  else if(state===STATE.RESULTS){
    // dimmed game scene behind results
    drawScene(now, renderPose);
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#000'; ctx.fillRect(0,0,innerWidth,innerHeight);
    const {dw,dh,ox,oy} = playfieldLayout();
    ctx.drawImage(buf,ox,oy,dw,dh);
    drawOverlays();
    drawMobileMenu();
  }
  else {
    // menu states (TITLE/SEEDED/STATS/LB/OPTIONS): dark background + overlay only
    if(mobileMode && isMobilePortrait() && state===STATE.OPTIONS){
      ctx.fillStyle='#0c0a08'; ctx.fillRect(0,0,view.width,view.height);
      drawPortraitDashboardChrome();
    } else {
      ctx.fillStyle='#1a1410'; ctx.fillRect(0,0,innerWidth,innerHeight);
      // subtle mesa silhouette behind menu
      ctx.fillStyle='#2a2018';
      ctx.beginPath(); ctx.moveTo(0,innerHeight);
      for(let x=0;x<=innerWidth;x+=20){ ctx.lineTo(x, innerHeight-40-Math.sin(x*0.01+now*0.0003)*20); }
      ctx.lineTo(innerWidth,innerHeight); ctx.fill();
    }
    drawOverlays();
    drawMobileMenu();
  }
  if(CR_PERF_PROBE && ctx) crPerfProbeDrawOverlay(ctx, now);
  requestAnimationFrame(frame);
}
try {
  if(typeof crApplyRenderProfile === 'function'){
    crApplyRenderProfile(typeof crGetRenderProfile === 'function' ? crGetRenderProfile() : null);
  }
} catch(_renderProfileInitializationError){}
crResetFixedStepSimulation();
requestAnimationFrame(frame);

function updateSeed(newSeed){
  const n = parseInt(newSeed, 10);
  if(!Number.isNaN(n)){
    game.seed = n;
    seedInput = String(n);
  }
  return game.seed;
}

function getDebugState(){
  const vv = window.visualViewport;
  const px = player.x, py = player.y;
  return {
    state, paused, mobileMode, mobileInputActive:mobileInputActive(), mobileAuto:isMobile(),
    customLevel: game.run && game.run.customLevel || null,
    levelType: game.run && game.run.customLevel ? 'custom' : 'procedural',
    MAP_W: game.MAP_W, MAP_H: game.MAP_H,
    mapAspect: game.MAP_W && game.MAP_H ? +(game.MAP_W / game.MAP_H).toFixed(3) : null,
    seed:game.seed, district:game.district, score:game.totalScore,
    player:{x:px,y:py,angle:player.angle,cans:player.cans,stamina:player.stamina},
    mapCell:{tx:Math.floor(px), ty:Math.floor(py), v:game.map && game.map[Math.floor(py)] ? game.map[Math.floor(py)][Math.floor(px)] : null},
    canStand: canStand(px, py),
    standProbe: playerStandProbe(px, py),
    joy:{active:joy.active, x:joy.x, y:joy.y, dist:joy.dist},
    moveDbg: window._moveDbg || null,
    runActive:!!game.run.active,
    saveValid:!!SAVE.hasValid(),
    canvas:{cssW:view.style.width,cssH:view.style.height,w:view.width,h:view.height,dpr:devicePixelRatio||1},
    viewport:{w:innerWidth,h:innerHeight,visualW:vv?vv.width:null,visualH:vv?vv.height:null,offsetX:vv?vv.offsetLeft:null,offsetY:vv?vv.offsetTop:null,appVhPx:getComputedStyle(document.documentElement).getPropertyValue('--app-vh-px').trim()},
    mobileSettings:{lookSpeed:options.lookSpeed,lookSpeedLabel:lookSpeedLabel(options.lookSpeed),turnSens:options.mobileTurnSens,joySizePx:options.joySizePx,buttonSizePx:options.buttonSizePx,opacity:options.controlOpacityValue,minimapSizePx:options.minimapSizePx,deadzonePx:options.touchDeadzonePx,portrait:isMobilePortrait()},
    sprint:{cost:mobileSprintCost(),burstSec:mobileSprintBurstSec(),burstUntil:sprintBurstUntil,blocks:Math.round(player.maxStamina/mobileSprintCost())},
    storageKeys:Object.assign({}, K),
    safeArea: readSafeAreaInsets(),
  };
}



// Production exposes only a bounded, read-only diagnostic snapshot. It does
// not provide mutable gameplay state, test lifecycle, or proof helpers.
window.SNCDiagnostics = Object.freeze({
  buildId: BUILD_ID,
  getSnapshot: () => Object.freeze({
    buildId: BUILD_ID,
    runtime: Object.freeze(getDebugState()),
    fixedStep: Object.freeze(crGetFixedStepState()),
    performance: typeof crPerfProbeGetReport === 'function' ? crPerfProbeGetReport() : null,
  }),
});
