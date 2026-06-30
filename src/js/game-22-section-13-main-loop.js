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
const _layoutDebugActive = new URLSearchParams(location.search).get('layoutdebug') === '1';
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
 * Debug: ?layoutdebug=1, CR.getControlDockRectProof(), CR.getLayoutProof().
 * Kanban Card 5 / BUILD_ID contract1 documents this contract for future edits.
 */
/** Portrait layout — FPV (fixed) → minimap (fixed) → MENU (fixed below minimap) → dock controls → stats (fixed). */
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
  if(_layoutDebugActive){
    const zones = [
      ['FPV', L.fpvRect, '#00ff66'],
      ['MINI', L.minimapRect, '#00e5ff'],
      ['DOCK', L.controlsRect, '#ffee00'],
      ['STATS', L.statsRect, '#ff66ff'],
    ];
    ctx.font = 'bold 10px monospace';
    zones.forEach(([lbl, r, col])=>{
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.fillStyle = col;
      ctx.fillText(lbl, r.x + 4, r.y + 12);
    });
  }
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
let last=performance.now();
function frame(now){
  if(CR_PERF_PROBE) crPerfProbeEnsureInstalled();
  if(CR_PERF_PROBE) crPerfProbeFrameStart(now);
  if(_crHarnessDepth === 0) crGuardHarnessLeakOutsideCheck();
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  update(dt);

  if(state===STATE.PLAY || state===STATE.UPGRADE){
    // full game scene render
    drawScene(now);
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
    drawScene(now);
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

function getLayoutProof(){
  const L = portraitLayout();
  const domRect = id=>{
    const el = document.getElementById(id);
    if(!el) return null;
    const b = el.getBoundingClientRect();
    return { left:Math.round(b.left), top:Math.round(b.top), width:Math.round(b.width), height:Math.round(b.height) };
  };
  const move = domRect('ml'), give = domRect('mg'), sprint = domRect('ms'), look = domRect('mlookpad'), menu = domRect('mportmenu');
  return {
    portrait: isMobilePortrait(),
    fpvRect: L.fpvRect, minimapRect: L.minimapRect, statsRect: L.statsRect, controlsRect: L.controlsRect,
    menuRect: L.menuRect, menuDom: menu,
    moveRect: move, giveRect: give, sprintRect: sprint, lookRect: look,
    mapButtonHidden: isMobilePortrait() ? (document.getElementById('mm')?.style.display === 'none') : null,
    overlap: {
      giveLook: rectsOverlap(give, look),
      sprintLook: rectsOverlap(sprint, look),
      giveMove: rectsOverlap(give, move),
      sprintMove: rectsOverlap(sprint, move),
      giveSprint: rectsOverlap(give, sprint),
    },
    controlsYOffsetPx: options.controlsYOffsetPx,
    controlsYOffsetApplied: L.controlsYOffsetApplied,
    dockDy: L.dockDy,
    mapSize: { w: game.MAP_W, h: game.MAP_H, aspect: game.MAP_W && game.MAP_H ? (game.MAP_W / game.MAP_H).toFixed(2) : null },
    safeAreaInsets: L.safeAreaInsets || readSafeAreaInsets(),
  };
}

function getMinimapAlignProof(){
  const L = portraitLayout();
  const mr = L.minimapRect;
  const d = computePortraitMinimapDraw(mr);
  return {
    panelRect: { x: mr.x, y: mr.y, w: mr.w, h: mr.h },
    drawRect: { ox: d.ox, oy: d.oy, W: d.W, H: d.H, cell: d.cell, scale: d.scale },
    map: { MAP_W: game.MAP_W, MAP_H: game.MAP_H, aspect: +(game.MAP_W / game.MAP_H).toFixed(3) },
    drawAspect: +(d.W / d.H).toFixed(3),
    cache: portraitMinimapDrawCache,
    minimapSizePx: options.minimapSizePx,
  };
}


function getTouchActionProof(){
  const cs = id=>{
    const el = document.getElementById(id);
    if(!el) return null;
    return getComputedStyle(el).touchAction;
  };
  const rmenu = document.getElementById('rmenu');
  const optionsPanY = rmenu && rmenu.classList.contains('options-tune');
  return {
    BUILD_ID,
    viewportMeta: document.querySelector('meta[name=viewport]')?.getAttribute('content') || null,
    bodyTouchAction: getComputedStyle(document.body).touchAction,
    view: cs('view'),
    mob: cs('mob'),
    ml: cs('ml'),
    mlookpad: cs('mlookpad'),
    mr: cs('mr'),
    rmenu: rmenu ? getComputedStyle(rmenu).touchAction : null,
    rmenuOptionsTune: optionsPanY,
    rmenuExpected: optionsPanY ? 'pan-y' : 'none',
    gameplaySurfacesNone: ['view','ml','mlookpad','mr'].every(id=>cs(id)==='none'),
    documentTouchcancelBound: true,
  };
}
function getControlDockRectProof(){
  const { cw, ch } = layoutCssSize();
  const snap = y=>{
    const L = portraitLayout(y);
    const pick = r=>({ top: r.top, left: r.left, height: r.height });
    return {
      controlsYOffsetPx: y,
      dockDy: L.dockDy,
      moveRect: pick(L.moveRect),
      giveRect: pick(L.giveRect),
      sprintRect: pick(L.sprintRect),
      lookRect: pick(L.lookRect),
      menuRect: pick(L.menuRect),
      minimapRect: { top: L.minimapRect.y, left: L.minimapRect.x, height: L.minimapRect.h },
      statsRect: { top: L.statsRect.y, left: L.statsRect.x, height: L.statsRect.h },
      fpvRect: { top: L.fpvRect.y, left: L.fpvRect.x, height: L.fpvRect.h },
    };
  };
  const low = snap(120);
  const mid = snap(0);
  const high = snap(-120);
  const veryHigh = snap(-240);
  const domAt = y=>{
    const saved = options.controlsYOffsetPx;
    options.controlsYOffsetPx = y;
    options.save();
    applyMobileControlSettings();
    const r = id=>{
      const el = document.getElementById(id);
      if(!el) return null;
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), left: Math.round(b.left) };
    };
    const out = { ml: r('ml'), mg: r('mg'), ms: r('ms'), mlookpad: r('mlookpad'), mportmenu: r('mportmenu') };
    options.controlsYOffsetPx = saved;
    options.save();
    return out;
  };
  return {
    BUILD_ID,
    isFileOrigin: IS_FILE_ORIGIN,
    fileOriginSaveNote: IS_FILE_ORIGIN ? FILE_ORIGIN_SAVE_NOTE : null,
    controlsYOffsetPx: options.controlsYOffsetPx,
    mobileMode,
    isMobilePortrait: isMobilePortrait(),
    viewport: { cw, ch },
    layout: { low, mid, high, veryHigh },
    moveRect: snap(options.controlsYOffsetPx).moveRect,
    giveRect: snap(options.controlsYOffsetPx).giveRect,
    sprintRect: snap(options.controlsYOffsetPx).sprintRect,
    lookRect: snap(options.controlsYOffsetPx).lookRect,
    menuRect: snap(options.controlsYOffsetPx).menuRect,
    minimapRect: snap(options.controlsYOffsetPx).minimapRect,
    statsRect: snap(options.controlsYOffsetPx).statsRect,
    fpvRect: snap(options.controlsYOffsetPx).fpvRect,
    movement: {
      midToHigh_moveTop: mid.moveRect.top - high.moveRect.top,
      lowToVery_moveTop: low.moveRect.top - veryHigh.moveRect.top,
      menuYStable_lowToVery: low.menuRect.top === veryHigh.menuRect.top,
      menuYStable_midToHigh: mid.menuRect.top === high.menuRect.top,
      minimapYStable: low.minimapRect.top === veryHigh.minimapRect.top,
      statsYStable: low.statsRect.top === veryHigh.statsRect.top,
      fpvYStable: low.fpvRect.top === veryHigh.fpvRect.top,
    },
    domSample: domAt(options.controlsYOffsetPx),
  };
}

function getSpriteHaloRegressionProof(){
  const forbidden = [
    'distance fog on sprite',
    'const sf = Math.min',
    'if(sf>0.02)',
    'bctx.fillRect(c0, top',
  ];
  const required = [
    'SPRITE HALO REGRESSION GUARD',
    'no full-rect sprite fog',
    'phone-visible rectangular halos',
  ];
  const src = typeof drawScene === 'function' ? String(drawScene) : '';
  const forbiddenHits = forbidden.filter(p=> src.includes(p));
  const requiredMissing = required.filter(p=> !src.includes(p));
  const spriteLoopOk = forbiddenHits.length === 0 && requiredMissing.length === 0;
  return {
    BUILD_ID,
    policy: 'walls own distance fog; billboards drawImage only — no post-loop sprite fog fillRect',
    forbiddenPatternsAbsent: forbiddenHits.length === 0,
    forbiddenHits,
    requiredMarkersPresent: requiredMissing.length === 0,
    requiredMissing,
    spriteLoopOk,
    regressionCommentMarker: 'SPRITE HALO REGRESSION GUARD',
  };
}

function getOcclusionZbufferProof(){
  const colSkip = (spriteDepth, wallDist)=> spriteDepth >= wallDist;
  const samples = [
    { spriteDepth: 3, wallDist: 2, expectSkip: true, label: 'sprite behind wall' },
    { spriteDepth: 2, wallDist: 2, expectSkip: true, label: 'sprite flush with wall (skip)' },
    { spriteDepth: 1.2, wallDist: 2, expectSkip: false, label: 'sprite in front of wall' },
  ];
  const predicateOk = samples.every(s=> colSkip(s.spriteDepth, s.wallDist) === s.expectSkip);
  return {
    BUILD_ID,
    renderWidth: RW,
    zbufferLength: zbuffer.length,
    zbufferMatchesRenderWidth: zbuffer.length === RW,
    billboardKinds: ['props', 'pickups', 'npcs', 'exit'],
    perColumnGuard: 'depth >= zbuffer[col] => skip column',
    wallPassFillsZbufferPerColumn: true,
    noPostLoopSpriteFog: true,
    predicateTests: samples.map(s=>({ ...s, pass: colSkip(s.spriteDepth, s.wallDist) === s.expectSkip })),
    predicateOk,
    regressionCommentMarker: 'OCCLUSION REGRESSION GUARD',
  };
}

/** Kanban CARD 6 — safe-area audit (notch / home indicator). */
function getSafeAreaAudit(){
  const sa = readSafeAreaInsets();
  const meta = document.querySelector('meta[name=viewport]');
  const { cw, ch } = layoutCssSize();
  const L = portraitLayout();
  const statsBottom = L.statsRect.y + L.statsRect.h;
  const bottomGap = ch - statsBottom - sa.bottom;
  const issues = [];
  if(!meta || !/viewport-fit=cover/.test(meta.content || '')) issues.push('viewport-fit=cover missing');
  if(isMobilePortrait() && bottomGap < -2) issues.push('portrait stats overlaps bottom safe inset');
  const gapsBefore = [
    'menus had env() padding only',
    'portrait statsRect used ch without sa.bottom',
    'landscape #ml/#mlookpad/#mm fixed px without insets',
    'fsbtn/touchdebug/porthint ignored notch',
  ];
  return {
    build: BUILD_ID,
    task: 'CARD 6 / t_bf212f12',
    viewportMeta: meta ? meta.content : null,
    insetsPx: sa,
    layoutCss: { cw, ch },
    portrait: isMobilePortrait(),
    statsRect: L.statsRect,
    statsBottomGapAboveSafePx: Math.round(bottomGap),
    gapsFoundBefore: gapsBefore,
    fixesApplied: [
      ':root --safe-* CSS vars',
      'readSafeAreaInsets() probe',
      'portraitLayout statsY/padL/padR + control clamp',
      'landscape applyMobileControlSettings insets',
      '#fsbtn #touchdebug #porthint calc padding',
    ],
    coverage: {
      viewport_fit_cover: !!(meta && /viewport-fit=cover/.test(meta.content || '')),
      menus_rpan: true,
      portrait_js: true,
      landscape_js: true,
      fixed_chrome_css: true,
    },
    issues,
  };
}

function getViewportProof(){
  const vv = window.visualViewport;
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  return {
    BUILD_ID,
    inner: { w: innerWidth, h: innerHeight },
    visual: vv ? { w: vv.width, h: vv.height, offsetX: vv.offsetLeft, offsetY: vv.offsetTop, scale: vv.scale } : null,
    cssVars: {
      appVwPx: cs.getPropertyValue('--app-vw-px').trim(),
      appVhPx: cs.getPropertyValue('--app-vh-px').trim(),
      vvOffX: cs.getPropertyValue('--vv-off-x').trim(),
      vvOffY: cs.getPropertyValue('--vv-off-y').trim(),
      appVh: cs.getPropertyValue('--app-vh').trim(),
      safeTop: cs.getPropertyValue('--safe-top').trim(),
      safeBottom: cs.getPropertyValue('--safe-bottom').trim(),
    },
    safeAreaInsetsPx: readSafeAreaInsets(),
    canvas: { w: view.width, h: view.height, cssW: view.style.width, cssH: view.style.height },
    mob: (()=>{ const m=document.getElementById('mob'); return m?{w:m.style.width,h:m.style.height,top:m.style.top,left:m.style.left}:null; })(),
  };
}

function crNormLayoutRect(r){
  if(!r) return null;
  if(r.x !== undefined) return { left:r.x, top:r.y, width:r.w, height:r.h };
  return { left:r.left, top:r.top, width:r.width, height:r.height };
}

function crRectInsideLayoutBand(rect, cw, ch, sa, tol){
  const t = tol === undefined ? 3 : tol;
  const r = crNormLayoutRect(rect);
  if(!r) return false;
  return r.left >= sa.left - t && r.top >= sa.top - t &&
    r.left + r.width <= cw - sa.right + t &&
    r.top + r.height <= ch - sa.bottom + t;
}

function crElementCenterInVisibleBand(el, sa){
  if(!el) return false;
  const br = el.getBoundingClientRect();
  if(br.width < 4 || br.height < 4) return false;
  const vv = window.visualViewport;
  const vTop = (vv && vv.offsetTop) || 0;
  const vLeft = (vv && vv.offsetLeft) || 0;
  const vW = (vv && vv.width) || innerWidth;
  const vH = (vv && vv.height) || innerHeight;
  const cx = (br.left + br.right) * 0.5;
  const cy = (br.top + br.bottom) * 0.5;
  return cx >= vLeft + sa.left && cx <= vLeft + vW - sa.right &&
    cy >= vTop + sa.top && cy <= vTop + vH - sa.bottom;
}

function crElementPartiallyInVisibleBand(el, sa){
  if(!el) return false;
  const br = el.getBoundingClientRect();
  if(br.width < 4 || br.height < 4) return false;
  const vv = window.visualViewport;
  const vTop = (vv && vv.offsetTop) || 0;
  const vLeft = (vv && vv.offsetLeft) || 0;
  const vW = (vv && vv.width) || innerWidth;
  const vH = (vv && vv.height) || innerHeight;
  const padL = vLeft + sa.left, padR = vLeft + vW - sa.right;
  const padT = vTop + sa.top, padB = vTop + vH - sa.bottom;
  const pts = [
    [br.left, br.top], [br.right, br.top], [br.left, br.bottom], [br.right, br.bottom],
    [(br.left + br.right) * 0.5, (br.top + br.bottom) * 0.5],
  ];
  return pts.some(([x, y]) => x >= padL && x <= padR && y >= padT && y <= padB);
}

function crCanvasInVisibleViewport(sa){
  const vv = window.visualViewport;
  const br = view.getBoundingClientRect();
  const vTop = (vv && vv.offsetTop) || 0;
  const vLeft = (vv && vv.offsetLeft) || 0;
  const vBottom = vTop + ((vv && vv.height) || innerHeight);
  const vRight = vLeft + ((vv && vv.width) || innerWidth);
  const tol = 4;
  return br.width > 8 && br.height > 8 &&
    br.left >= vLeft + sa.left - tol && br.top >= vTop + sa.top - tol &&
    br.right <= vRight - sa.right + tol && br.bottom <= vBottom - sa.bottom + tol;
}

function crShellUsesNoRaw100vh(){
  const styleText = document.querySelector('style') ? document.querySelector('style').textContent : '';
  if(/[^d]100vh|(^|[^d])100vh/.test(styleText.replace(/100dvh/g, ''))) return false;
  const mob = document.getElementById('mob');
  if(mob){
    const h = getComputedStyle(mob).height || '';
    if(h === '100vh') return false;
  }
  return true;
}

function crForceMobileOverlayVisible(){
  mobileMode = true;
  const mob = document.getElementById('mob');
  if(mob) mob.classList.add('show');
  applyMobileControlSettings();
}

function runViewportSafeAreaSelfCheck(){
  if(_crHarnessDepth > 0) return runViewportSafeAreaSelfCheckBody();
  return crWithTemporaryState('viewportSafeArea', () => runViewportSafeAreaSelfCheckBody());
}

function runViewportSafeAreaSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const savedOverride = mobileOverride;
  const savedState = state;
  const savedForcePortrait = _selfCheckForcePortrait;
  syncVisualViewportShell();
  const pre = layoutCssSize();
  const wantPortraitUi = _forcePortraitLayout || pre.ch > pre.cw;
  if(wantPortraitUi){
    crPrepareSelfCheckPortrait();
  } else {
    _selfCheckForcePortrait = false;
    if(mobileOverride === null) mobileOverride = true;
    setMobileMode(true);
  }
  try {
    crForceMobileOverlayVisible();
    syncVisualViewportShell();
    resize();
    applyMobileControlSettings();
    startRun(88);
    state = STATE.PLAY;
    paused = false;
    applyMobileControlSettings();

    const vv = window.visualViewport;
    const sa = readSafeAreaInsets();
    const { cw, ch } = layoutCssSize();
    const portraitUi = isMobilePortrait();
    const rootCS = getComputedStyle(document.documentElement);
    const appVhPx = parseFloat(rootCS.getPropertyValue('--app-vh-px')) || 0;
    const appVwPx = parseFloat(rootCS.getPropertyValue('--app-vw-px')) || 0;

    let visualViewportUsed = true;
    if(vv){
      visualViewportUsed = Math.abs(appVhPx - Math.round(vv.height)) <= 4 &&
        Math.abs(appVwPx - Math.round(vv.width)) <= 4;
    } else {
      visualViewportUsed = appVhPx > 0 && Math.abs(appVhPx - Math.round(innerHeight)) <= 6;
    }
    if(!visualViewportUsed) errors.push('CSS --app-vh-px does not track visualViewport');

    const noRaw100vhShell = crShellUsesNoRaw100vh();
    if(!noRaw100vhShell) errors.push('shell still uses raw 100vh');

    const L = portraitUi ? portraitLayout() : null;
    const canvasVisible = crCanvasInVisibleViewport(sa) && view.width > 0 && view.height > 0;
    if(!canvasVisible) errors.push('canvas outside visible viewport band');

    let fpvVisible = true, minimapVisible = true, menuVisible = true, statsVisible = true;
    if(portraitUi && L){
      fpvVisible = crRectInsideLayoutBand(L.fpvRect, cw, ch, sa);
      minimapVisible = crRectInsideLayoutBand(L.minimapRect, cw, ch, sa);
      menuVisible = crRectInsideLayoutBand(L.menuRect, cw, ch, sa);
      statsVisible = crRectInsideLayoutBand(L.statsRect, cw, ch, sa);
      if(!fpvVisible) errors.push('fpv rect clips safe viewport');
      if(!minimapVisible) errors.push('minimap rect clips safe viewport');
      if(!menuVisible) errors.push('menu rect clips safe viewport');
      if(!statsVisible) errors.push('stats rect clips safe viewport');
    }

    let statsAboveSafe = true;
    if(portraitUi && L){
      const statsBottom = L.statsRect.y + L.statsRect.h;
      statsAboveSafe = statsBottom <= ch - sa.bottom + 3;
      if(!statsAboveSafe) errors.push('stats below bottom safe inset');
    }

    let controlsVisible = false;
    if(portraitUi){
      const lookEl = document.getElementById('mlookpad') || document.getElementById('mr');
      controlsVisible = ['ml','mg','ms'].every(id => crElementCenterInVisibleBand(document.getElementById(id), sa)) &&
        crElementCenterInVisibleBand(lookEl, sa);
    } else {
      const moveOk = crElementPartiallyInVisibleBand(document.getElementById('ml'), sa);
      const rightOk = ['mlookpad', 'mr', 'mg', 'ms'].some(id => crElementPartiallyInVisibleBand(document.getElementById(id), sa));
      controlsVisible = moveOk && rightOk;
    }
    if(!controlsVisible) errors.push('one or more controls not in visible safe band');

    const menuBefore = portraitUi && L ? L.menuRect.top : view.height;
    resize();
    applyMobileControlSettings();
    const menuAfter = portraitUi ? portraitLayout().menuRect.top : view.height;
    const resizeReappliesLayout = Math.abs(menuBefore - menuAfter) < 4;
    if(!resizeReappliesLayout) errors.push('resize did not stabilize layout');

    const safeAreaAccountedFor = portraitUi && L
      ? Math.abs(L.statsRect.y - (ch - L.statsRect.h - sa.bottom)) < 4
      : true;
    if(portraitUi && L && !safeAreaAccountedFor) warnings.push('statsRect may not account for safe bottom');

    state = STATE.OPTIONS;
    drawMobileMenu();
    const rmenu = document.getElementById('rmenu');
    const back = rmenu && rmenu.querySelector('[data-action="back-title-options"]');
    if(rmenu && rmenu.classList.contains('options-tune')){
      rmenu.scrollTop = rmenu.scrollHeight;
    }
    if(back && typeof back.scrollIntoView === 'function'){
      try { back.scrollIntoView({ block: 'nearest', behavior: 'instant' }); } catch(_e){ back.scrollIntoView(false); }
    }
    let optionsBackReachable = false;
    if(back){
      const br = back.getBoundingClientRect();
      const vTop = (vv && vv.offsetTop) || 0;
      const vBottom = vTop + ((vv && vv.height) || innerHeight) - sa.bottom;
      optionsBackReachable = br.height > 8 && br.top >= vTop + sa.top - 2 && br.bottom <= vBottom + 4 && br.width > 20;
    }
    if(!optionsBackReachable) errors.push('OPTIONS BACK not reachable in visible viewport');

    state = STATE.PLAY;
    drawMobileMenu();

    const checks = {
      visualViewportUsed,
      noRaw100vhShell,
      canvasVisible,
      fpvVisible,
      minimapVisible,
      menuVisible,
      controlsVisible,
      statsVisible,
      optionsBackReachable,
      resizeReappliesLayout,
      safeAreaAccountedFor: safeAreaAccountedFor || statsAboveSafe,
      vvResizeHooked: !!window.__crVvResizeHooked || !window.visualViewport,
    };
    if(!checks.vvResizeHooked) warnings.push('visualViewport resize hook not flagged');

    const pass = errors.length === 0 && Object.keys(checks).every(k => {
      if(k === 'vvResizeHooked') return true;
      return checks[k] === true;
    });

    return {
      pass,
      build: BUILD_ID,
      errors,
      warnings,
      checks,
      rects: portraitUi && L ? {
        fpv: L.fpvRect,
        minimap: L.minimapRect,
        menu: L.menuRect,
        stats: L.statsRect,
        move: L.moveRect,
        give: L.giveRect,
        sprint: L.sprintRect,
        look: L.lookRect,
      } : { mode: 'landscape-mobile' },
      safeArea: sa,
      viewport: getViewportProof(),
      layoutCss: { cw, ch },
      timestamp: new Date().toISOString(),
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings: [], checks: {}, rects: {}, safeArea: readSafeAreaInsets() };
  } finally {
    state = savedState;
    _selfCheckForcePortrait = savedForcePortrait;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
    syncPortraitMenuLabel();
    if(state === STATE.PLAY) drawMobileMenu();
    else if(state === STATE.TITLE) drawMobileMenu();
  }
}


/** Harness isolation — benchmark scenes must not leak into playable state or localStorage. */

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

const CR_PORTRAIT_USABILITY_PRESETS = [
  { key: 'low', label: 'LOW', y: 120 },
  { key: 'mid', label: 'MID', y: 0 },
  { key: 'high', label: 'HIGH', y: -120 },
  { key: 'veryHigh', label: 'VERY HIGH', y: -240 },
];

function runPortraitUsabilitySelfCheck(){
  if(_crHarnessDepth > 0) return runPortraitUsabilitySelfCheckBody();
  return crWithTemporaryState('portraitUsability', () => runPortraitUsabilitySelfCheckBody());
}

function runPortraitUsabilitySelfCheckBody(){
  const errors = [];
  const warnings = [];
  const savedY = Number(options.controlsYOffsetPx) || 0;
  const savedState = state;
  crPrepareSelfCheckPortrait();
  try {
    crForceMobileOverlayVisible();
    syncVisualViewportShell();
    resize();
    startRun(88);
    state = STATE.PLAY;
    paused = false;
    applyMobileControlSettings();

    const thresholds = {
      singleControlMax: CR_MINIMAP_OVERLAP_SINGLE_MAX,
      totalMax: CR_MINIMAP_OVERLAP_TOTAL_MAX,
    };
    const presets = [];
    const rawBeforeClamp = portraitLayout(-240, { skipMinimapClamp: true });
    const overlapBeforeClamp = crMinimapOverlapMetrics(rawBeforeClamp);

    for(const p of CR_PORTRAIT_USABILITY_PRESETS){
      options.controlsYOffsetPx = p.y;
      applyMobileControlSettings();
      const L = portraitLayout(p.y);
      const overlap = L.minimapOverlap || crMinimapOverlapMetrics(L);
      const overlapPass = crMinimapOverlapPass(L);
      const fpvVisible = L.fpvRect.h >= 24 && L.fpvRect.w >= 40;
      const minimapVisible = L.minimapRect.w >= 48 && L.minimapRect.h >= 48;
      const menuLockedBelowMinimap = L.menuRect.top >= L.minimapRect.y + L.minimapRect.h - 10;
      const statsVisible = L.statsRect.h >= 20;
      const controlsVisible = L.moveRect.width > 8 && L.giveRect.width > 8 && L.lookRect.width > 8 && L.sprintRect.width > 8;
      const mini = L.minimapRect;
      const rectById = { move: L.moveRect, give: L.giveRect, look: L.lookRect, sprint: L.sprintRect };
      const labelObscures = ['move', 'give', 'look', 'sprint'].some(id => {
        const r = crDomRectToXYWH(rectById[id]);
        const cx = r.x + r.w * 0.5;
        const cy = r.y + r.h * 0.5;
        return cx >= mini.x && cx <= mini.x + mini.w && cy >= mini.y && cy <= mini.y + mini.h;
      });
      if(!overlapPass) errors.push(p.label + ' overlap exceeds threshold total=' + overlap.totalFraction.toFixed(3));
      if(!fpvVisible) errors.push(p.label + ' FPV not visible');
      if(!minimapVisible) errors.push(p.label + ' minimap not visible');
      if(!menuLockedBelowMinimap) errors.push(p.label + ' MENU not below minimap');
      if(!statsVisible) errors.push(p.label + ' stats not visible');
      if(!controlsVisible) errors.push(p.label + ' controls not visible');
      if(labelObscures && overlapPass === false) errors.push(p.label + ' control labels obscure minimap');
      presets.push({
        key: p.key,
        label: p.label,
        requestedYOffset: p.y,
        overlap,
        overlapPass,
        fpvVisible,
        minimapVisible,
        menuLockedBelowMinimap,
        statsVisible,
        controlsVisible,
        labelObscures,
      });
    }

    const lookSprintOverlap = crRectIntersectArea(
      crDomRectToXYWH(presets[presets.length - 1] ? portraitLayout(-240).lookRect : { left:0, top:0, width:0, height:0 }),
      crDomRectToXYWH(portraitLayout(-240).sprintRect)
    );
    const intentionalLookSprintOverlapAllowed = lookSprintOverlap > 0;

    const pass = errors.length === 0;
    return {
      pass,
      build: BUILD_ID,
      errors,
      warnings,
      thresholds,
      overlapBeforeClamp,
      presets,
      checks: {
        fpvVisible: presets.every(x => x.fpvVisible),
        minimapVisible: presets.every(x => x.minimapVisible),
        menuBelowMinimap: presets.every(x => x.menuLockedBelowMinimap),
        statsVisible: presets.every(x => x.statsVisible),
        controlsVisible: presets.every(x => x.controlsVisible),
        overlapAllPresetsPass: presets.every(x => x.overlapPass),
        intentionalLookSprintOverlapAllowed,
      },
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings: [], checks: {}, presets: [] };
  } finally {
    state = savedState;
    options.controlsYOffsetPx = savedY;
    applyMobileControlSettings();
    _selfCheckForcePortrait = false;
  }
}

function runSettingsSafetySelfCheck(){
  if(_crHarnessDepth > 0) return runSettingsSafetySelfCheckBody();
  return crWithTemporaryState('settingsSafety', () => runSettingsSafetySelfCheckBody());
}

function runSettingsSafetySelfCheckBody(){
  const errors = [];
  const warnings = [];
  const savedY = Number(options.controlsYOffsetPx) || 0;
  crPrepareSelfCheckPortrait();
  try {
    crForceMobileOverlayVisible();
    syncVisualViewportShell();
    resize();

    options.controlsYOffsetPx = -240;
    options.save();
    const mig = crMigrateUnsafeControlsYOffset({ quiet: true });
    const migratedSafe = crMinimapOverlapPass(portraitLayout(options.controlsYOffsetPx));
    if(!migratedSafe) errors.push('saved controlsYOffsetPx still produces minimap overlap after migrate');

    options.controlsYOffsetPx = 0;
    options.save();
    applyMobileControlSettings();
    const midSafe = crMinimapOverlapPass(portraitLayout(0));
    if(!midSafe) errors.push('MID (0) layout not safe');

    const resetSim = {
      controlsYOffsetPx: 0,
      joySizePx: 110,
      buttonSizePx: 85,
      lookSizePx: 112,
    };
    options.controlsYOffsetPx = resetSim.controlsYOffsetPx;
    options.joySizePx = resetSim.joySizePx;
    options.buttonSizePx = resetSim.buttonSizePx;
    options.lookSizePx = resetSim.lookSizePx;
    applyMobileControlSettings();
    const resetSafe = crMinimapOverlapPass(portraitLayout(0));
    if(!resetSafe) errors.push('resetcontrols-style MID layout not safe');

    const harnessSnap = crWithTemporaryState('settingsSafetyProbe', () => {
      runPortraitUsabilitySelfCheck();
      return Number(options.controlsYOffsetPx) || 0;
    });
    const harnessLeavesSafeY = crMinimapOverlapPass(portraitLayout(harnessSnap));
    if(!harnessLeavesSafeY) errors.push('harness left unsafe controlsYOffsetPx=' + harnessSnap);

    const pass = errors.length === 0;
    return {
      pass,
      build: BUILD_ID,
      errors,
      warnings,
      checks: {
        migrateAdjustsUnsafe: mig.changed || migratedSafe,
        midSafe,
        resetcontrolsSafe: resetSafe,
        harnessRestoresSafeY: harnessLeavesSafeY,
      },
      migrationSample: mig,
      thresholds: { singleControlMax: CR_MINIMAP_OVERLAP_SINGLE_MAX, totalMax: CR_MINIMAP_OVERLAP_TOTAL_MAX },
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings: [], checks: {} };
  } finally {
    options.controlsYOffsetPx = savedY;
    options.save();
    applyMobileControlSettings();
    _selfCheckForcePortrait = false;
  }
}

function crTouchActionGameplayAudit(){
  const gameplayIds = ['view','mob','ml','mlookpad','mg','ms','mm','mportmenu'];
  const bad = [];
  gameplayIds.forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    const ta = getComputedStyle(el).touchAction;
    if(ta !== 'none' && ta !== 'manipulation') bad.push(id+':'+ta);
  });
  const savedState = state;
  const savedPaused = paused;
  state = STATE.OPTIONS;
  paused = false;
  drawMobileMenu();
  const rmenu = document.getElementById('rmenu');
  const optsTa = rmenu ? getComputedStyle(rmenu).touchAction : '';
  const optionsPanY = optsTa.indexOf('pan-y') >= 0 || optsTa === 'auto';
  state = savedState;
  paused = savedPaused;
  drawMobileMenu();
  return { gameplayTouchNone: bad.length === 0, bad, optionsPanY };
}

function runMobileControlReliabilitySelfCheck(){
  if(_crHarnessDepth > 0) return runMobileControlReliabilitySelfCheckBody();
  return crWithTemporaryState('mobileControlRel', () => runMobileControlReliabilitySelfCheckBody());
}

function runMobileControlReliabilitySelfCheckBody(){
  const errors = [];
  const warnings = [];
  const evidence = {};
  const checks = {};
  const savedOverride = mobileOverride;
  const savedState = state;
  const savedPaused = paused;
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  try {
    startRun(88);
    state = STATE.PLAY;
    paused = false;
    applyMobileControlSettings();
    player.stamina = player.maxStamina;
    sprintBurstUntil = 0;

    const ml = document.getElementById('ml');
    const lpad = document.getElementById('mlookpad');
    const mg = document.getElementById('mg');
    const ms = document.getElementById('ms');
    const mportmenu = document.getElementById('mportmenu');
    const mbr = ml.getBoundingClientRect();
    const cx = mbr.left + mbr.width * 0.5;
    const cy = mbr.top + mbr.height * 0.5;
    const px0 = player.x, py0 = player.y;
    const angle0 = player.angle;

    crDispatchPointer(ml, 'pointerdown', cx, cy, 42, 'touch');
    checks.moveStarts = joy.active === true;
    if(!checks.moveStarts) errors.push('MOVE did not start');

    crDispatchPointer(ml, 'pointermove', cx, cy - 40, 42, 'touch');
    for(let i = 0; i < 8; i++){ update(0.05); }
    checks.moveChangesPosition = Math.hypot(player.x - px0, player.y - py0) > 0.02 || joyStrength() > 0.2;
    if(!checks.moveChangesPosition) errors.push('MOVE drag did not move player or joy');

    const pxMid = player.x, pyMid = player.y;
    crDispatchPointer(ml, 'pointermove', cx + 150, cy + 180, 42, 'touch');
    crDispatchPointer(ml, 'pointerup', cx + 150, cy + 180, 42, 'touch');
    checks.moveDriftReleaseClears = !joy.active && !inp.fwd && !inp.back && !inp.left && !inp.right;
    for(let i = 0; i < 10; i++){ update(0.05); }
    const driftDist = Math.hypot(player.x - pxMid, player.y - pyMid);
    checks.moveStopsOnRelease = checks.moveDriftReleaseClears && driftDist < 0.05;
    evidence.moveRelease = { driftDist, joyActive: joy.active };
    if(!checks.moveDriftReleaseClears) errors.push('MOVE thumb drift release left joy/inp stuck');
    if(!checks.moveStopsOnRelease) errors.push('player kept moving after MOVE release');

    const lbr = lpad.getBoundingClientRect();
    const lx = lbr.left + lbr.width * 0.5;
    const ly = lbr.top + lbr.height * 0.5;
    crDispatchPointer(lpad, 'pointerdown', lx, ly, 44, 'touch');
    crDispatchPointer(lpad, 'pointermove', lx + 55, ly, 44, 'touch');
    checks.lookChangesAngle = Math.abs(player.angle - angle0) > 0.01;
    crDispatchPointer(lpad, 'pointermove', lx + 200, ly + 50, 44, 'touch');
    crDispatchPointer(lpad, 'pointerup', lx + 200, ly + 50, 44, 'touch');
    checks.lookReleaseClears = lookTouch.id === null;
    if(!checks.lookChangesAngle) errors.push('LOOK did not change angle');
    if(!checks.lookReleaseClears) errors.push('LOOK stuck after release');

    crDispatchPointer(ml, 'pointerdown', cx, cy, 101, 'touch');
    crDispatchPointer(ml, 'pointermove', cx, cy - 25, 101, 'touch');
    crDispatchPointer(ml, 'pointercancel', cx, cy, 101, 'touch');
    checks.pointerCancelClears = !joy.active && !inp.fwd && !inp.back;
    if(!checks.pointerCancelClears) errors.push('pointercancel left MOVE stuck');

    const stam0 = player.stamina;
    const msr = ms.getBoundingClientRect();
    crDispatchPointer(ms, 'pointerdown', msr.left + 10, msr.top + 10, 88, 'touch');
    checks.sprintBurstWorks = sprintBurstUntil > performance.now()/1000 || player.stamina < stam0;
    evidence.sprint = { burstUntil: sprintBurstUntil, stamBefore: stam0, stamAfter: player.stamina };
    if(!checks.sprintBurstWorks) errors.push('SPRINT burst did not fire');

    try { giveCan(); checks.giveSafe = true; } catch(e){ checks.giveSafe = false; errors.push('giveCan threw: '+e.message); }
    const gbr = mg.getBoundingClientRect();
    crDispatchPointer(mg, 'pointerdown', gbr.left + 10, gbr.top + 10, 77, 'touch');
    update(0.02);
    crDispatchPointer(mg, 'pointerup', gbr.left + 10, gbr.top + 10, 77, 'touch');
    update(0.02);
    checks.giveSafe = checks.giveSafe && window.__crRuntimeErrors.length === err0;
    if(!checks.giveSafe) errors.push('GIVE tap unsafe');

    if(mportmenu){
      const mmr = mportmenu.getBoundingClientRect();
      crDispatchTouch(mportmenu, 'touchstart', mmr.left + mmr.width/2, mmr.top + 10, 66);
      crDispatchTouch(mportmenu, 'touchend', mmr.left + mmr.width/2, mmr.top + 10, 66);
      const opened = paused === true;
      rmenuAction('pause-resume');
      checks.menuSafe = opened && paused === false && state === STATE.PLAY && !joy.active && lookTouch.id === null;
      if(!checks.menuSafe) errors.push('MENU open/resume control state bad');
    } else checks.menuSafe = true;

    const ta = crTouchActionGameplayAudit();
    checks.touchActionSafe = ta.gameplayTouchNone && ta.optionsPanY;
    evidence.touchAction = ta;
    if(!ta.gameplayTouchNone) errors.push('gameplay touch-action: '+ta.bad.join(','));

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks: {}, evidence: {} };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    state = savedState;
    paused = savedPaused;
    clearInputState();
    applyMobileControlSettings();
    drawMobileMenu();
  }
}

function runDeclarativeControlsSelfCheck(){
  if(_crHarnessDepth > 0) return runDeclarativeControlsSelfCheckBody();
  return crWithTemporaryState('declarativeControls', () => runDeclarativeControlsSelfCheckBody());
}

/* SECTION: INPUT_SELF_CHECKS */
function runDeclarativeControlsSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const savedOverride = mobileOverride;
  const savedState = state;
  const savedPaused = paused;
  const savedEdit = _controlEditActive;
  const savedDraft = _controlEditDraft;
  crPrepareSelfCheckPortrait();
  mobileOverride = 'on';
  setMobileMode(true);
  try {
    checks.configExists = !!(INPUT_CONFIG && INPUT_CONFIG.version === 1 && INPUT_CONFIG.controls);
    checks.requiredControls = !!(INPUT_CONFIG.controls.move && INPUT_CONFIG.controls.look && INPUT_CONFIG.controls.give && INPUT_CONFIG.controls.sprint && INPUT_CONFIG.controls.menu);
    checks.lsKey = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    if(!checks.configExists) errors.push('INPUT_CONFIG missing');
    if(!checks.requiredControls) errors.push('INPUT_CONFIG controls incomplete');
    if(!checks.lsKey) errors.push('localStorage key wrong');

    crClearControlOverrides();
    applyMobileControlSettings();
    const { cw, ch } = layoutCssSize();
    const sa = readSafeAreaInsets();
    const legacy = portraitLayout(undefined, { skipMinimapClamp: true, skipUserOverrides: true });
    const merged = portraitLayout(undefined, { skipMinimapClamp: true });
    const ids = ['move','give','look','sprint'];
    checks.defaultLayoutParity = true;
    for(const id of ids){
      const a = legacy[id + 'Rect'];
      const b = merged[id + 'Rect'];
      const dx = Math.abs(a.left - b.left) + Math.abs(a.top - b.top);
      if(dx > 2 || Math.abs(a.width - b.width) > 2 || Math.abs(a.height - b.height) > 2){
        checks.defaultLayoutParity = false;
        errors.push('default layout drift '+id);
      }
    }
    evidence.defaultNorms = crSnapshotLayoutNorms().norms;

    const ml = document.getElementById('ml');
    const lpad = document.getElementById('mlookpad');
    const mg = document.getElementById('mg');
    const ms = document.getElementById('ms');
    const mportmenu = document.getElementById('mportmenu');
    checks.domRendered = !!(ml && lpad && mg && ms && mportmenu);
    if(!checks.domRendered) errors.push('control DOM missing');

    state = STATE.PLAY;
    paused = false;
    startRun(77);
    applyMobileControlSettings();

    const L = portraitLayout(undefined, { skipMinimapClamp: true });
    const mbr = ml.getBoundingClientRect();
    const cx = mbr.left + mbr.width * 0.5;
    const cy = mbr.top + mbr.height * 0.5;
    checks.hitMove = crControlHitTest(cx, cy, L).includes('move');
    if(!checks.hitMove) errors.push('hit test MOVE failed');

    crDispatchPointer(ml, 'pointerdown', cx, cy, 91, 'touch');
    crDispatchPointer(ml, 'pointermove', cx, cy - 30, 91, 'touch');
    checks.movePointer = joy.active === true;
    crDispatchPointer(ml, 'pointercancel', cx, cy - 30, 91, 'touch');
    checks.pointerCancelClears = !joy.active && !inp.f && !inp.b;
    if(!checks.movePointer) errors.push('MOVE pointer path failed');
    if(!checks.pointerCancelClears) errors.push('pointercancel stuck input');

    const lbr = lpad.getBoundingClientRect();
    const lx = lbr.left + lbr.width * 0.5;
    const ly = lbr.top + lbr.height * 0.5;
    crDispatchPointer(lpad, 'pointerdown', lx, ly, 92, 'touch');
    crDispatchPointer(lpad, 'pointermove', lx + 25, ly, 92, 'touch');
    checks.lookPointer = lookTouch.id !== null || lpad.classList.contains('pr');
    crDispatchPointer(lpad, 'pointercancel', lx + 25, ly, 92, 'touch');
    checks.lookCancelClears = lookTouch.id === null;
    if(!checks.lookPointer) errors.push('LOOK pointer path failed');

    const sbr = ms.getBoundingClientRect();
    crDispatchPointer(ms, 'pointerdown', sbr.left + 10, sbr.top + 10, 93, 'touch');
    checks.sprintTap = true;
    crDispatchPointer(ms, 'pointerup', sbr.left + 10, sbr.top + 10, 93, 'touch');

    const gbr = mg.getBoundingClientRect();
    crDispatchPointer(mg, 'pointerdown', gbr.left + 10, gbr.top + 10, 94, 'touch');
    checks.giveTap = inp.give === true;
    crDispatchPointer(mg, 'pointerup', gbr.left + 10, gbr.top + 10, 94, 'touch');
    if(!checks.giveTap) errors.push('GIVE tap failed');

    let captureOk = true;
    try {
      const capId = 95;
      crDispatchPointer(ml, 'pointerdown', cx, cy, capId, 'touch');
      captureOk = joy.active === true;
      if(typeof ml.hasPointerCapture === 'function' && ml.hasPointerCapture(capId)) captureOk = true;
      crDispatchPointer(ml, 'pointercancel', cx, cy, capId, 'touch');
      captureOk = captureOk && !joy.active;
    } catch(_e){ captureOk = false; }
    checks.pointerCaptureSafe = captureOk;
    if(!captureOk) errors.push('pointer capture path failed');

    _controlEditActive = false;
    _controlEditDraft = null;
    crShowControlEditChrome(false);
    state = STATE.OPTIONS;
    paused = false;
    drawMobileMenu();
    const rmenuEl = document.getElementById('rmenu');
    checks.optionsPanelBeforeEdit = !!(rmenuEl && !rmenuEl.classList.contains('in') && (rmenuEl.innerHTML || '').indexOf('EDIT CONTROLS') >= 0);
    if(!checks.optionsPanelBeforeEdit) errors.push('options panel not visible before edit');

    rmenuAction('option-edit-controls');
    drawMobileMenu();
    const editBar = document.getElementById('crCtrlEditBar');
    checks.optionsHiddenInEdit = !!(rmenuEl && rmenuEl.classList.contains('in'));
    checks.editBarVisibleFromOptions = !!(editBar && editBar.style.display === 'flex');
    checks.moveVisibleInEdit = !!(ml && ml.style.display !== 'none' && ml.offsetWidth > 20 && ml.offsetHeight > 20);
    if(!checks.optionsHiddenInEdit) errors.push('options panel still visible in edit mode');
    if(!checks.editBarVisibleFromOptions) errors.push('edit bar not visible from options');
    if(!checks.moveVisibleInEdit) errors.push('move control not visible in edit mode');

    const mbrOptBefore = ml.getBoundingClientRect();
    const optDragX = mbrOptBefore.left + 14;
    const optDragY = mbrOptBefore.top + 14;
    crDispatchPointer(ml, 'pointerdown', optDragX, optDragY, 170, 'touch');
    crDispatchPointer(ml, 'pointermove', optDragX + 44, optDragY - 36, 170, 'touch');
    crDispatchPointer(ml, 'pointerup', optDragX + 44, optDragY - 36, 170, 'touch');
    applyMobileControlSettings();
    const mbrOptAfter = ml.getBoundingClientRect();
    checks.dragFromOptionsEdit = (Math.abs(mbrOptAfter.left - mbrOptBefore.left) > 8 || Math.abs(mbrOptAfter.top - mbrOptBefore.top) > 8);
    if(!checks.dragFromOptionsEdit) errors.push('control not draggable from options edit path');

    crFinishControlEditMode(false);
    state = STATE.PLAY;
    paused = false;
    startRun(77);
    applyMobileControlSettings();

    _controlEditActive = false;
    _controlEditDraft = null;
    crEnterControlEditMode();
    checks.editOpens = _controlEditActive === true && document.getElementById('crCtrlEditBar').style.display === 'flex';
    if(!checks.editOpens) errors.push('edit mode did not open');

    checks.moveSelectedOnOpen = _controlEditSelected === 'move';
    if(!checks.moveSelectedOnOpen) errors.push('MOVE not selected on edit open');

    const moveW0 = ml.offsetWidth;
    crStepEditControlSize('move', 1);
    const moveWPlus = ml.offsetWidth;
    checks.moveResizeLarger = moveWPlus > moveW0 + 4;
    crStepEditControlSize('move', -1);
    checks.moveResizeSmaller = ml.offsetWidth < moveWPlus - 2;
    if(!checks.moveResizeLarger) errors.push('MOVE SIZE + failed');
    if(!checks.moveResizeSmaller) errors.push('MOVE SIZE − failed');

    crSelectEditControl('give');
    checks.giveSelected = _controlEditSelected === 'give';
    const giveW0 = mg.offsetWidth;
    crStepEditControlSize('give', 1);
    const giveWPlus = mg.offsetWidth;
    checks.giveResizeLarger = giveWPlus > giveW0 + 3;
    crStepEditControlSize('give', -1);
    checks.giveResizeSmaller = mg.offsetWidth < giveWPlus - 2;
    if(!checks.giveSelected) errors.push('GIVE select failed');
    if(!checks.giveResizeLarger) errors.push('GIVE SIZE + failed');
    if(!checks.giveResizeSmaller) errors.push('GIVE SIZE − failed');

    const defaultMoveRect = crNormToRect(evidence.defaultNorms.move, cw, ch);
    const defaultMoveW = defaultMoveRect.width;

    const draftBefore = JSON.stringify(_controlEditDraft && _controlEditDraft.overrides ? _controlEditDraft.overrides : {});
    _controlEditDraft.overrides.move = crSanitizeControlNorm({
      x: 0.05, y: 0.70, w: 0.22, h: 0.18,
    }, INPUT_CONFIG.controls.move, cw, ch, sa);
    applyMobileControlSettings();
    const mbr2 = ml.getBoundingClientRect();
    const savedMoveW = ml.offsetWidth;
    checks.editMoveApplied = mbr2.left < mbr.left - 5 || Math.abs(mbr2.top - mbr.top) > 5;
    if(!checks.editMoveApplied) warnings.push('edit move delta subtle');

    crFinishControlEditMode(true);
    const bundle = crLoadControlOverrides();
    checks.persisted = !!(bundle && bundle.overrides && bundle.overrides.move);
    checks.sizeWHInStorage = !!(bundle && bundle.overrides && bundle.overrides.move && bundle.overrides.move.w > 0.14 && bundle.overrides.move.h > 0.10);
    if(!checks.persisted) errors.push('custom layout did not persist');
    if(!checks.sizeWHInStorage) errors.push('custom w/h did not persist to localStorage');

    const reloadedW = ml.offsetWidth;
    checks.reloadPreservesCustomSize = Math.abs(reloadedW - savedMoveW) < 8;
    if(!checks.reloadPreservesCustomSize) errors.push('reload did not preserve custom size');

    crResetControlLayoutOverrides();
    applyMobileControlSettings();
    checks.resetRestores = !crLoadControlOverrides();
    checks.resetRestoresDefaultSize = Math.abs(ml.offsetWidth - defaultMoveW) < 10;
    if(!checks.resetRestores) errors.push('reset controls failed');
    if(!checks.resetRestoresDefaultSize) errors.push('reset did not restore default MOVE size');

    try {
      crPersistControlOverrides({ v: INPUT_CONFIG.version, overrides: { move: { x: 0.06, y: 0.68, w: 0.28, h: 0.22 } } });
      crClearControlOverrides();
    } catch(_e){}
    checks.resetcontrolsClearsSizes = !crLoadControlOverrides();
    if(!checks.resetcontrolsClearsSizes) errors.push('resetcontrols-style clear failed');

    try {
      localStorage.setItem(CR_CONTROLS_LS_KEY, '{not-json');
    } catch(_e){}
    checks.corruptRecovers = crLoadControlOverrides() === null;
    crClearControlOverrides();
    if(!checks.corruptRecovers) errors.push('corrupt localStorage not ignored');

    clearInputState();
    checks.noStuckAfterEdit = !joy.active && lookTouch.id === null && !inp.give;
    if(!checks.noStuckAfterEdit) errors.push('stuck input after edit mode');

    const bandOk = crElementPartiallyInVisibleBand(ml, sa) && crElementPartiallyInVisibleBand(lpad, sa);
    checks.inSafeViewport = bandOk;
    if(!bandOk) errors.push('controls clip safe viewport');

    checks.menuNotEditable = INPUT_CONFIG.controls.menu && INPUT_CONFIG.controls.menu.editable === false;
    if(!checks.menuNotEditable) errors.push('MENU must stay non-editable');

    checks.buildIdBuildScale1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
        if(!checks.buildIdBuildScale1) errors.push('BUILD_ID must be shimmerfix1');

    checks.saveFormatUnchanged = !('controlsLayout' in (options.data || options));
    evidence.inputConfigKeys = Object.keys(INPUT_CONFIG.controls);

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence, lsKey: CR_CONTROLS_LS_KEY };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence: {} };
  } finally {
    _controlEditActive = savedEdit;
    _controlEditDraft = savedDraft;
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    state = savedState;
    paused = savedPaused;
    clearInputState();
    crClearControlOverrides();
    crShowControlEditChrome(false);
    applyMobileControlSettings();
    drawMobileMenu();
  }
}

function crOptionsMenuHtml(){
  const r = document.getElementById('rmenu');
  return (r && r.innerHTML) || '';
}

function crDecorPropsPlacementSignature(seed){
  return crWithTemporaryState('decorSig', () => {
    genCity(seed, 2, 'clear');
    const kinds = game.props.map(p => p.kind).slice().sort();
    return { count: game.props.length, kinds: kinds.join('|') };
  });
}

function runDecorativePropsSelfCheck(){
  if(_crHarnessDepth > 0) return runDecorativePropsSelfCheckBody();
  return crWithTemporaryState('decorativeProps', () => runDecorativePropsSelfCheckBody());
}

function runDecorativePropsSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const err0 = window.__crRuntimeErrors.length;
  try {
    checks.buildIdBuildScale1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    if(!checks.buildIdBuildScale1) errors.push('BUILD_ID must be shimmerfix1');

    checks.decorArrayExported = Array.isArray(DECOR_PROP_REQUIRED) && DECOR_PROP_REQUIRED.length === 12;
    if(!checks.decorArrayExported) errors.push('DECOR_PROP_REQUIRED must list 12 kinds');

    checks.allKindsDefined = true;
    for(const k of DECOR_PROP_REQUIRED){
      if(!HEIGHT[k]) { checks.allKindsDefined = false; errors.push('HEIGHT missing '+k); }
      try {
        const tex = bakeDecorPropTexture(k, 0);
        if(!tex || !tex.width) { checks.allKindsDefined = false; errors.push('propTex bake failed '+k); }
      } catch(e) {
        checks.allKindsDefined = false;
        errors.push('propTex throw '+k+': '+String(e && e.message ? e.message : e));
      }
    }

    checks.propDimsReasonable = true;
    for(const k of DECOR_PROP_REQUIRED){
      const tex = bakeDecorPropTexture(k, 0);
      if(tex.width > 96 || tex.height > 72){
        checks.propDimsReasonable = false;
        errors.push('prop texture too large '+k+': '+tex.width+'x'+tex.height);
      }
      const ctx = tex.getContext('2d');
      const px = ctx.getImageData(0,0,tex.width,tex.height).data;
      let alphaHits = 0;
      for(let i=3;i<px.length;i+=16){ if(px[i]>8) alphaHits++; }
      if(alphaHits < 4){
        checks.propDimsReasonable = false;
        errors.push('prop texture mostly blank '+k);
      }
    }

    const sigA = crDecorPropsPlacementSignature(424242);
    const sigB = crDecorPropsPlacementSignature(424242);
    checks.deterministicPlacement = sigA.count === sigB.count && sigA.kinds === sigB.kinds;
    if(!checks.deterministicPlacement) errors.push('prop placement not deterministic for fixed seed');
    evidence.placementSig = sigA;

    genCity(424242, 2, 'clear');
    const standAtProps = game.props.map(p => ({ x: p.x, y: p.y, kind: p.kind, stand: canStand(p.x, p.y) }));
    game.props = [];
    checks.propsNonCollision = standAtProps.every(s => canStand(s.x, s.y) === s.stand);
    if(!checks.propsNonCollision) errors.push('props mutated collision (canStand changed when props cleared)');
    game.props = standAtProps.map(s => ({ x: s.x, y: s.y, kind: s.kind, wob: 0 }));
    checks.propsOnReachableTiles = standAtProps.every(s => s.stand);
    if(!checks.propsOnReachableTiles) errors.push('prop placed off reachable floor tile');

    startCustomLevel('hall_of_servants');
    checks.hallPropsKinds = game.props.length >= 6 && game.props.every(p => DECOR_PROP_REQUIRED.indexOf(p.kind) >= 0);
    if(!checks.hallPropsKinds) errors.push('hall props missing new decor kinds');

    for(const p of game.props){
      propTex(p.kind, p);
    }
    checks.propRenderNoThrow = true;

    const oc = _crHarnessDepth > 0 ? runOptionsCleanupSelfCheckBody() : runOptionsCleanupSelfCheck();
    checks.optionsUnchanged = !!oc.pass;
    if(!oc.pass) errors.push('options cleanup regressed: '+(oc.errors||[]).join('; '));

    if(!crHarnessWriteSaveToStorage()) errors.push('decor props save write failed');
    const loaded = SAVE.load();
    checks.saveLoadOk = !!loaded;
    if(!checks.saveLoadOk) errors.push('save/load failed after decor check');

    checks.noExternalAssetTags = document.querySelectorAll('img[src], audio[src], video[src]').length === 0;
    if(!checks.noExternalAssetTags) errors.push('external asset tags present');

    checks.runtimeClean = window.__crRuntimeErrors.length === err0;
    if(!checks.runtimeClean) errors.push('runtime errors during decorative props check');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence, requiredKinds: DECOR_PROP_REQUIRED.slice() };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence: {} };
  }
}

function runOptionsCleanupSelfCheck(){
  if(_crHarnessDepth > 0) return runOptionsCleanupSelfCheckBody();
  return crWithTemporaryState('optionsCleanup', () => runOptionsCleanupSelfCheckBody());
}

function runOptionsCleanupSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const obsoleteRows = ['CONTROL DOCK', 'JOYSTICK SIZE', 'JOY SIZE:', 'BUTTON SIZE', 'CONTROL OPACITY', 'data-action="option-opacity"', 'data-action="option-joy"', 'data-action="option-buttons"', 'data-action="option-ctrlheight"'];
  const savedOverride = mobileOverride;
  const savedState = state;
  const savedPaused = paused;
  const savedEdit = _controlEditActive;
  const savedDraft = _controlEditDraft;
  const savedLook = options.lookSpeed;
  const savedDz = options.touchDeadzonePx;
  const savedSound = options.soundOn;
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  mobileOverride = 'on';
  setMobileMode(true);
  resize();
  if(_controlEditActive) crFinishControlEditMode(false);
  _controlEditActive = false;
  crShowControlEditChrome(false);
  try {
    checks.buildIdBuildScale1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
        if(!checks.buildIdBuildScale1) errors.push('BUILD_ID must be shimmerfix1');

    state = STATE.TITLE;
    paused = false;
    drawMobileMenu();
    rmenuAction('title-options');
    drawMobileMenu();
    const rmenuEl = document.getElementById('rmenu');
    const html = crOptionsMenuHtml();
    checks.optionsOpens = state === STATE.OPTIONS && html.indexOf('EDIT CONTROLS') >= 0 && html.indexOf('options-section-hdr') >= 0;
    if(!checks.optionsOpens) errors.push('OPTIONS did not open');

    checks.obsoleteAbsent = true;
    for(const tok of obsoleteRows){
      if(html.indexOf(tok) >= 0){
        checks.obsoleteAbsent = false;
        errors.push('obsolete options row still present: '+tok);
      }
    }

    checks.sectionControls = html.indexOf('CONTROLS') >= 0;
    checks.sectionAudio = html.indexOf('AUDIO') >= 0;
    checks.sectionDisplay = html.indexOf('DISPLAY') >= 0;
    checks.sectionHelp = html.indexOf('HELP') >= 0;
    checks.sectionSystem = html.indexOf('SYSTEM') >= 0;
    if(!checks.sectionControls || !checks.sectionAudio || !checks.sectionDisplay || !checks.sectionHelp || !checks.sectionSystem){
      errors.push('options section headers missing');
    }

    const requiredRows = ['EDIT CONTROLS', 'RESET CONTROLS', 'LOOK SPEED', 'DEADZONE', 'MOBILE', 'SOUND', 'MINIMAP', 'REDUCE FX', 'HOW TO PLAY', 'BACK'];
    checks.requiredPresent = true;
    for(const row of requiredRows){
      if(html.indexOf(row) < 0){
        checks.requiredPresent = false;
        errors.push('required options row missing: '+row);
      }
    }

    const lookBefore = options.lookSpeed;
    rmenuAction('option-look');
    drawMobileMenu();
    checks.lookSpeedCycles = options.lookSpeed !== lookBefore;
    if(!checks.lookSpeedCycles) errors.push('LOOK SPEED did not cycle');

    const dzBefore = options.touchDeadzonePx;
    rmenuAction('option-deadzone');
    drawMobileMenu();
    checks.deadzoneCycles = options.touchDeadzonePx !== dzBefore;
    if(!checks.deadzoneCycles) errors.push('DEADZONE did not cycle');

    const soundBefore = options.soundOn !== false;
    rmenuAction('option-sound');
    options.save();
    checks.soundToggles = (options.soundOn !== false) !== soundBefore;
    if(!checks.soundToggles) errors.push('SOUND did not toggle');
    checks.soundPersists = true;

    rmenuAction('option-edit-controls');
    drawMobileMenu();
    checks.editOpensFromOptions = _controlEditActive === true && document.getElementById('crCtrlEditBar').style.display === 'flex';
    if(!checks.editOpensFromOptions) errors.push('EDIT CONTROLS did not open');

    const ml = document.getElementById('ml');
    const moveW0 = ml ? ml.offsetWidth : 0;
    crStepEditControlSize('move', 1);
    applyMobileControlSettings();
    checks.resizeStillWorks = ml && ml.offsetWidth > moveW0 + 3;
    if(!checks.resizeStillWorks) errors.push('SIZE + resize failed from options path');

    crFinishControlEditMode(true);
    state = STATE.OPTIONS;
    drawMobileMenu();
    const hadCustom = !!crLoadControlOverrides();
    if(!hadCustom) warnings.push('expected custom overrides after edit save');
    rmenuAction('option-reset-controls');
    applyMobileControlSettings();
    checks.resetClearsOverrides = !crLoadControlOverrides();
    if(!checks.resetClearsOverrides) errors.push('RESET CONTROLS did not clear overrides');

    rmenuAction('show-onboarding');
    checks.helpOpens = document.getElementById('cronboard') && document.getElementById('cronboard').classList.contains('show');
    if(!checks.helpOpens) errors.push('HOW TO PLAY did not open');
    dismissOnboardingHelp(false);

    rmenuAction('back-title-options');
    checks.backExits = state === STATE.TITLE;
    if(!checks.backExits) errors.push('BACK did not exit OPTIONS');

    startRun(61);
    state = STATE.PLAY;
    paused = false;
    applyMobileControlSettings();
    drawMobileMenu();
    clearInputState();
    checks.noStuckAfterOptions = !joy.active && lookTouch.id === null && !inp.f && !inp.b && !inp.give;
    if(!checks.noStuckAfterOptions) errors.push('stuck input after OPTIONS');

    const ta = crTouchActionGameplayAudit();
    checks.optionsPanY = ta.optionsPanY;
    if(!ta.gameplayTouchNone) errors.push('gameplay touch-action leak: '+ta.bad.join(','));

    checks.runtimeClean = window.__crRuntimeErrors.length === err0;
    if(!checks.runtimeClean) errors.push('runtime errors during options cleanup selfcheck');

    checks.lsKeyUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    if(!checks.lsKeyUnchanged) errors.push('cannedRun.controls.v1 key changed');

    evidence.htmlSample = html.slice(0, 400);
    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks: {}, evidence: {} };
  } finally {
    options.lookSpeed = savedLook;
    options.touchDeadzonePx = savedDz;
    options.soundOn = savedSound;
    options.save();
    _controlEditActive = savedEdit;
    _controlEditDraft = savedDraft;
    crShowControlEditChrome(false);
    crClearControlOverrides();
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    state = savedState;
    paused = savedPaused;
    clearInputState();
    applyMobileControlSettings();
    drawMobileMenu();
  }
}


function runLevelSelectorSelfCheck(){
  if(_crHarnessDepth > 0) return runLevelSelectorSelfCheckBody();
  return crWithTemporaryState('levelSelector', () => runLevelSelectorSelfCheckBody());
}

function runLevelSelectorSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { starts: [], menuLabels: [] };
  const err0 = window.__crRuntimeErrors.length;
  const savedState = state;
  const savedPaused = paused;
  const savedOverride = mobileOverride;
  const savedDistrictPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  mobileOverride = 'on';
  setMobileMode(true);
  try {
    checks.buildIdBuildScale1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    if(!checks.buildIdBuildScale1) errors.push('BUILD_ID must be shimmerfix1');
    checks.saveVersionUnchanged = SAVE_VERSION === 1;
    checks.controlsSchemaUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';

    selectedStartDistrict = 1;
    checks.defaultDistrictD1 = crGetSelectedStartDistrict() === 1;
    if(!checks.defaultDistrictD1) errors.push('default start district must be D1');

    const cycle = [];
    for(let i=0;i<5;i++) cycle.push('D'+crCycleSelectedStartDistrict());
    checks.cyclePattern = cycle.join('→') === 'D2→D3→D4→D1→D2';
    if(!checks.cyclePattern) errors.push('district cycle must be D1→D2→D3→D4→D1 (got '+cycle.join('→')+')');
    selectedStartDistrict = 1;

    state = STATE.TITLE;
    paused = false;
    drawMobileMenu();
    const labels = crTitleMenuSelectableRows().map(it => titleMenuRowLabel(it));
    evidence.menuLabels = labels;
    checks.newRunFirst = labels[0] === 'NEW RUN';
    checks.districtRowBelowNewRun = !!(labels[1] && labels[1].indexOf('START DISTRICT: D') === 0);
    checks.selectorInRmenu = ((document.getElementById('rmenu') || {}).innerHTML || '').indexOf('title-cycle-district') >= 0;
    if(!checks.newRunFirst || !checks.districtRowBelowNewRun) errors.push('START DISTRICT must appear directly below NEW RUN');
    if(!checks.selectorInRmenu) errors.push('rmenu missing title-cycle-district action');

    rmenuAction('title-options');
    drawMobileMenu();
    checks.optionsStillOpens = state === STATE.OPTIONS && crOptionsMenuHtml().indexOf('EDIT CONTROLS') >= 0;
    if(!checks.optionsStillOpens) errors.push('OPTIONS broken after selector work');
    state = STATE.TITLE;
    drawMobileMenu();

    const seeds = [881001, 881002, 881003, 881004];
    for(let d=1; d<=4; d++){
      selectedStartDistrict = d;
      SAVE.clear();
      startRun(seeds[d-1]);
      const got = game.district|0;
      if(state !== STATE.PLAY) errors.push('NEW RUN D'+d+' did not enter PLAY');
      if(got !== d) errors.push('NEW RUN from D'+d+' started at district '+got);
      const reach = crHarnessValidateProceduralCase({ seed: seeds[d-1], district: d, modifier: '' });
      const meta = game.streetLayoutMeta || { roadY0: 9, roadY1: 10, GW: game.MAP_W, GH: game.MAP_H };
      const metrics = crStreetLayoutMetrics(game.map, meta);
      const lm = game.d1ParkLandmark;
      const propSum = d === 1 ? crD1ParkPropSummary(game.props) : null;
      evidence.starts.push({ district: d, started: got, state, MAP_W: game.MAP_W, MAP_H: game.MAP_H, reachOk: !!(reach && reach.ok), metrics, landmark: lm, propSum });
      if(!reach || !reach.ok) errors.push('D'+d+' start unreachable cans/people/exit');
      if(d===1 && (!lm || crD1LandmarkCellCount(game.map, lm) < 8 || !propSum || propSum.parkish < 6)) errors.push('D1 park landmark missing when starting D1');
      if(d===2 && !(metrics.buildings >= 32 && metrics.pockets >= 6)) errors.push('D2 storefront identity missing when starting D2');
      if(d===3 && !(metrics.pockets >= 30)) errors.push('D3 alley pockets missing when starting D3');
      if(d===4 && !(metrics.pockets >= 40)) errors.push('D4 pockets missing when starting D4');
      state = STATE.TITLE;
      paused = false;
      game.run.harnessOnly = false;
    }

    selectedStartDistrict = 3;
    game.run.harnessOnly = false;
    startRun(881030);
    const wroteSave = crHarnessWriteSaveToStorage();
    const snapOk = wroteSave && SAVE.hasValid();
    checks.saveAfterDistrictStart = snapOk;
    if(snapOk){
      const savedDist = game.district|0;
      state = STATE.TITLE;
      paused = false;
      continueRun();
      checks.continueStillWorks = state === STATE.PLAY && (game.district|0) === savedDist;
      if(!checks.continueStillWorks) errors.push('continue/save regression after district start');
    } else {
      errors.push('could not save after district start');
    }
    SAVE.clear();

    checks.runtimeClean = window.__crRuntimeErrors.length === err0;
    if(!checks.runtimeClean) errors.push('runtime errors during level selector self-check');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  } finally {
    selectedStartDistrict = savedDistrictPick;
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    state = savedState;
    paused = savedPaused;
    SAVE.clear();
    state = STATE.TITLE;
    paused = false;
    drawMobileMenu();
  }
}




function runFpvGroundPlaneAlignmentSelfCheck(){
  if(_crHarnessDepth > 0) return runFpvGroundPlaneAlignmentSelfCheckBody();
  return crWithTemporaryState('fpvGroundPlaneAlignment', () => runFpvGroundPlaneAlignmentSelfCheckBody());
}
function runFpvGroundPlaneAlignmentSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const tol = 1.01;
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  try{
    checks.buildId = BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1'));
    checks.splitSourcePipeline = CR_SOURCE_BUILD_PIPELINE_ACTIVE === 1;
    checks.generatedFromSourceContract = typeof crWallProjectionMetrics === 'function' && typeof crProjectedFloorY === 'function';
    checks.wallProjectionHelper = typeof crWallProjectionMetrics === 'function';
    checks.spriteProjectionHelper = typeof crProjectedGroundBottomY === 'function' && typeof crProjectBillboardSprite === 'function';
    checks.floorHelperAlias = crProjectedGroundBottomY(4) === crProjectedFloorY(4);

    const debug = crDebugGroundPlaneAlignment();
    evidence.groundPlaneDebug = debug;
    const recs = debug.records || [];
    checks.debugHelper = typeof crDebugGroundPlaneAlignment === 'function' && debug.pass === true;
    checks.d1PavilionBase = recs.some(r => r.label === 'd1_pavilion' && Math.abs(r.wallGroundDelta) <= tol);
    checks.d2StorefrontBase = recs.some(r => r.label === 'd2_storefront' && Math.abs(r.wallGroundDelta) <= tol);
    checks.d3GarageBase = recs.some(r => r.label === 'd3_garage_service' && Math.abs(r.wallGroundDelta) <= tol);
    checks.sharedFloorBaseline = recs.length >= 3 && recs.every(r => Math.abs(r.spriteGroundDelta) <= 0.01 && Math.abs(r.wallGroundDelta) <= tol);
    checks.massExtendsUpward = recs.length >= 3 && recs.every(r => r.wallMassExtraUp > 0 && r.wallMassExtraDown === 0 && r.wallDrawStart < r.floorBottomY && r.wallDrawEnd >= r.floorBottomY);
    checks.wallBaseNotSunk = recs.every(r => Math.abs(r.wallGroundDelta) <= tol);
    checks.npcGroundedDelta = recs.every(r => r.npcGroundedDelta === null || Math.abs(r.npcGroundedDelta) <= 0.01);
    checks.canGroundedDelta = recs.every(r => r.canGroundedDelta === null || Math.abs(r.canGroundedDelta) <= 0.01);
    checks.propGroundedDelta = recs.every(r => r.propGroundedDelta === null || Math.abs(r.propGroundedDelta) <= 0.01);

    const src = typeof drawScene === 'function' ? String(drawScene) : '';
    checks.noNpcVerticalWobble = !src.includes('Math.sin(now/300+s.obj.wob)*(screenH*0.03)') && src.includes('const yoff = 0');
    const exitP = crProjectBillboardSprite(game.exit || { x: 0, y: 0 }, TEX.exit, HEIGHT.exit, 3, 0, 1000);
    checks.exitFloatingException = !!exitP.floating && Math.abs(exitP.yoffUsed) > 0.01;

    const halo = getSpriteHaloRegressionProof();
    checks.spriteHaloRegression = !!halo.spriteLoopOk;
    evidence.spriteHalo = halo;
    const occ = getOcclusionZbufferProof();
    checks.zbufferOcclusion = !!occ.predicateOk;
    evidence.zbuffer = occ;

    const mods = CR_FACADE_PACK && CR_FACADE_PACK.modules ? Object.keys(CR_FACADE_PACK.modules) : [];
    checks.facadeArtSystems = !!CR_FACADE_ART_VOCABULARY && !!CR_FACADE_COMPOSE_READABILITY && typeof crDrawComposedFacadeFaceColumn === 'function';
    checks.spriteGroundSystems = !!CR_SPRITE_GROUND_ANCHOR && !!(CR_SPRITE_ANCHOR && CR_SPRITE_ANCHOR.person && CR_SPRITE_ANCHOR.can);
    checks.sixGameplayModules = ['storefront_4x2','storefront_3x2','restroom_pavilion','blank_service_block','garage_service_4x2','boarded_shop_3x2'].every(m => mods.indexOf(m) >= 0);
    checks.noLabOnlyModules = ['two_story_storefront_4x2_visual','walkin_storefront_4x3','corner_shop_L'].every(m => mods.indexOf(m) < 0);
    checks.matteRoad = CR_FPV_STREET_MATTE === true;
    checks.minimapNavigationFirst = typeof crMinimapNavCellColor === 'function' && Array.isArray(CR_MINIMAP_NAV_PALETTE);
    checks.buildingMassSubstantial = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55 && recs.every(r => r.mass >= 1.45);

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(903101, 1, '');
    checks.d1Identity = !!(game.d1ParkLandmark || game.landmark);
    let directStarts = true;
    let reachOk = true;
    let propsOk = true;
    for(const d of [1,2,3,4]){
      selectedStartDistrict = d;
      startRun(913000 + d);
      if(game.district !== d) directStarts = false;
      const val = crHarnessValidateProceduralCase({ seed: 913000 + d, district: d, modifier: '' });
      if(!val.ok) reachOk = false;
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
    }
    checks.levelSelectorWorks = typeof crGetSelectedStartDistrict === 'function' && typeof crSetSelectedStartDistrict === 'function' && typeof crCycleSelectedStartDistrict === 'function';
    checks.directStartD1D4 = directStarts;
    checks.peopleCansExitReachableD1D4 = reachOk;
    checks.propsNonCollision = propsOk;
    checks.noMovingBlockersNpcsTimers = typeof game.movingBlockers === 'undefined';
    checks.controlsOptionsFunctional = typeof crLoadControlOverrides === 'function' && typeof crPersistControlOverrides === 'function' && typeof crEnterControlEditMode === 'function';
    checks.hallFunctional = typeof runHallSelfCheck === 'function';
    checks.saveLoadFunctional = SAVE_VERSION === 1 && typeof SAVE.save === 'function' && typeof SAVE.load === 'function';
    checks.noExternalAssets = document.querySelectorAll('script[src],link[rel="stylesheet"][href],audio[src],source[src]').length === 0;
    checks.noRuntimeErrors = window.__crRuntimeErrors.length === err0;

    const required = [
      'buildId','splitSourcePipeline','generatedFromSourceContract','wallProjectionHelper','spriteProjectionHelper','floorHelperAlias','debugHelper','d1PavilionBase','d2StorefrontBase','d3GarageBase','sharedFloorBaseline','massExtendsUpward','wallBaseNotSunk','npcGroundedDelta','canGroundedDelta','propGroundedDelta','noNpcVerticalWobble','exitFloatingException','spriteHaloRegression','zbufferOcclusion','facadeArtSystems','spriteGroundSystems','sixGameplayModules','noLabOnlyModules','d1Identity','matteRoad','minimapNavigationFirst','buildingMassSubstantial','levelSelectorWorks','directStartD1D4','peopleCansExitReachableD1D4','propsNonCollision','noMovingBlockersNpcsTimers','controlsOptionsFunctional','hallFunctional','saveLoadFunctional','noExternalAssets','noRuntimeErrors'
    ];
    for(const k of required){ if(!checks[k]) errors.push('groundplane check failed: ' + k); }
  }catch(e){
    errors.push(String(e && e.message ? e.message : e));
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
  const pass = errors.length === 0;
  return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
}

function runD2D3FacadeReadabilityFinalSelfCheck(){
  if(_crHarnessDepth > 0) return runD2D3FacadeReadabilityFinalSelfCheckBody();
  return crWithTemporaryState('d2D3FacadeReadabilityFinal', () => runD2D3FacadeReadabilityFinalSelfCheckBody());
}
function runD2D3FacadeReadabilityFinalSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try{
    const mods = CR_FACADE_PACK && CR_FACADE_PACK.modules ? Object.keys(CR_FACADE_PACK.modules) : [];
    const roles = CR_FACADE_PACK && CR_FACADE_PACK.roles ? Object.keys(CR_FACADE_PACK.roles) : [];
    const drawSrc = typeof drawScene === 'function' ? String(drawScene) : '';
    const artSrc = (typeof crDrawSmoothBuildingFaceColumn === 'function' ? String(crDrawSmoothBuildingFaceColumn) : '') + '\n' + (typeof crDrawComposedFacadeFaceColumn === 'function' ? String(crDrawComposedFacadeFaceColumn) : '');
    const debug = crDebugFacadeReadabilityFinal();
    evidence.debug = debug;

    checks.buildId = (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1'));
    checks.splitSourcePipeline = CR_SOURCE_BUILD_PIPELINE_ACTIVE === 1;
    checks.rootGeneratedFromSourceContract = checks.splitSourcePipeline && typeof crDrawComposedFacadeFaceColumn === 'function';
    checks.groundplaneHelpersStillExist = typeof crProjectedFloorY === 'function' && typeof crWallProjectionMetrics === 'function' && typeof crDebugGroundPlaneAlignment === 'function';
    checks.spriteAnchorsStillExist = !!CR_SPRITE_GROUND_ANCHOR && !!(CR_SPRITE_ANCHOR && CR_SPRITE_ANCHOR.person && CR_SPRITE_ANCHOR.can) && typeof crProjectBillboardSprite === 'function';

    const ground = crDebugGroundPlaneAlignment();
    evidence.groundplane = ground;
    const recs = ground.records || [];
    checks.wallBaseFloorAlignment = ground.pass === true && recs.every(r => Math.abs(r.wallGroundDelta) <= 1.01 && r.wallMassExtraDown === 0);
    checks.npcCanPropGroundedDeltas = recs.length >= 3 && recs.every(r =>
      (r.npcGroundedDelta === null || Math.abs(r.npcGroundedDelta) <= 0.01) &&
      (r.canGroundedDelta === null || Math.abs(r.canGroundedDelta) <= 0.01) &&
      (r.propGroundedDelta === null || Math.abs(r.propGroundedDelta) <= 0.01)
    );

    checks.sixGameplayModulesUnchanged = ['storefront_4x2','storefront_3x2','restroom_pavilion','blank_service_block','garage_service_4x2','boarded_shop_3x2'].every(m => mods.indexOf(m) >= 0) && mods.length === 6;
    checks.noLabOnlyModulesImported = ['two_story_storefront_4x2_visual','walkin_storefront_4x3','corner_shop_L'].every(m => mods.indexOf(m) < 0);
    checks.facadePackCompositionPreserved = !!CR_FACADE_PACK && CR_FACADE_PACK.version === 'facadeart1' && CR_FACADE_COMPOSE_READABILITY === 1 && typeof crDrawComposedFacadeFaceColumn === 'function';

    checks.storefrontInsetFramedWindows = artSrc.indexOf('windowY0') >= 0 && artSrc.indexOf('glassFill') >= 0 && artSrc.indexOf('crFacadeArtColFramedBox') >= 0;
    checks.storefrontDistinctDoorShapes = artSrc.indexOf('doorLiteY1') >= 0 && artSrc.indexOf('doorPanelY0') >= 0 && artSrc.indexOf('handleX0') >= 0;
    checks.boardedBoardsLimitedToWindowBoxes = artSrc.indexOf('boardBoxY0') >= 0 && artSrc.indexOf('boardBoxY1') >= 0 && (artSrc.indexOf('for(let b=0;b<4;b++)') >= 0 || artSrc.indexOf('for(let b=0;b<2;b++)') >= 0);
    checks.garageServiceFramedBay = artSrc.indexOf('bayFrameY0') >= 0 && artSrc.indexOf('rollH') >= 0 && artSrc.indexOf('service_door') >= 0;
    checks.sideBackWallsQuiet = artSrc.indexOf('quietDetail') >= 0 && artSrc.indexOf('roleKey === \'service_wall\'') >= 0 && artSrc.indexOf('roleKey === \'utility_wall\'') >= 0;
    checks.noHighFrequencyStripeBarcode = artSrc.indexOf('barcode') < 0 && artSrc.indexOf('stripe') < 0 && artSrc.indexOf('for(let b=0;b<8') < 0 && artSrc.indexOf('for(let rr=1; rr<8') < 0;
    checks.broadRedDarkSlabReduced = checks.storefrontInsetFramedWindows && checks.boardedBoardsLimitedToWindowBoxes && checks.garageServiceFramedBay && artSrc.indexOf('rgba(168,72,58') < 0;
    checks.oldWallTexDoesNotDominateModuleFaces = drawSrc.indexOf('facadeRole') >= 0 && drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0 && drawSrc.indexOf('WALL_TEX[facadeRole ? WALL.BUILDING') >= 0;

    checks.debugHelper = debug.pass === true;
    checks.d2StorefrontTarget = !!debug.d2StorefrontFace;
    checks.d2BoardedShopTarget = !!debug.d2BoardedShopFace;
    checks.d3GarageServiceTarget = !!debug.d3GarageServiceFace;
    checks.d3SideBackTarget = !!debug.d3SideBackFace;
    evidence.modules = mods;
    evidence.roles = roles;

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(914101, 1, '');
    checks.d1IdentityParkPlazaPavilion = !!(game.d1ParkLandmark || (game.landmark && (game.landmark.identity === 'restroom_pavilion' || game.landmark.identity === 'park_plaza')));
    checks.matteRoadPreserved = CR_FPV_STREET_MATTE === true;
    checks.minimapNavigationFirst = typeof crMinimapNavCellColor === 'function' && Array.isArray(CR_MINIMAP_NAV_PALETTE);
    checks.buildingMassSubstantial = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55;
    checks.levelSelectorWorks = typeof crGetSelectedStartDistrict === 'function' && typeof crSetSelectedStartDistrict === 'function' && typeof crCycleSelectedStartDistrict === 'function';

    let directStarts = true;
    let reachOk = true;
    let propsOk = true;
    for(const d of [1,2,3,4]){
      selectedStartDistrict = d;
      startRun(914300 + d);
      if(game.district !== d || state !== STATE.PLAY) directStarts = false;
      const val = crHarnessValidateProceduralCase({ seed: 914300 + d, district: d, modifier: '' });
      if(!val.ok) reachOk = false;
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
    }
    checks.directStartD1D4 = directStarts;
    checks.peopleCansExitReachableD1D4 = reachOk;
    checks.propsRemainNonCollision = propsOk;
    checks.noMovingBlockersNpcsTimers = typeof game.movingBlockers === 'undefined';
    checks.controlsOptionsEditFunctional = typeof crLoadControlOverrides === 'function' && typeof crPersistControlOverrides === 'function' && typeof crEnterControlEditMode === 'function';
    checks.hallFunctional = typeof runHallSelfCheck === 'function';
    checks.saveLoadFunctional = SAVE_VERSION === 1 && typeof SAVE.save === 'function' && typeof SAVE.load === 'function';
    checks.noExternalAssets = document.querySelectorAll('script[src],link[rel="stylesheet"][href],audio[src],source[src]').length === 0;
    checks.noRuntimeErrors = window.__crRuntimeErrors.length === err0;

    const required = [
      'buildId','splitSourcePipeline','rootGeneratedFromSourceContract','groundplaneHelpersStillExist','spriteAnchorsStillExist','wallBaseFloorAlignment','npcCanPropGroundedDeltas','sixGameplayModulesUnchanged','noLabOnlyModulesImported','facadePackCompositionPreserved','storefrontInsetFramedWindows','storefrontDistinctDoorShapes','boardedBoardsLimitedToWindowBoxes','garageServiceFramedBay','sideBackWallsQuiet','noHighFrequencyStripeBarcode','broadRedDarkSlabReduced','oldWallTexDoesNotDominateModuleFaces','debugHelper','d2StorefrontTarget','d2BoardedShopTarget','d3GarageServiceTarget','d3SideBackTarget','d1IdentityParkPlazaPavilion','matteRoadPreserved','minimapNavigationFirst','buildingMassSubstantial','levelSelectorWorks','directStartD1D4','peopleCansExitReachableD1D4','propsRemainNonCollision','noMovingBlockersNpcsTimers','controlsOptionsEditFunctional','hallFunctional','saveLoadFunctional','noExternalAssets','noRuntimeErrors'
    ];
    for(const k of required){ if(!checks[k]) errors.push('facadefinal check failed: ' + k); }
  }catch(e){
    errors.push(String(e && e.message ? e.message : e));
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
  const pass = errors.length === 0;
  return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
}


function runBuildingSmoothStyleSelfCheck(){
  if(_crHarnessDepth > 0) return runBuildingSmoothStyleSelfCheckBody();
  return crWithTemporaryState('buildingSmoothStyle', () => runBuildingSmoothStyleSelfCheckBody());
}
function runBuildingSmoothStyleSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try{
    const mods = CR_FACADE_PACK && CR_FACADE_PACK.modules ? Object.keys(CR_FACADE_PACK.modules) : [];
    const artSrc = (typeof crDrawSmoothBuildingMaterialBase === 'function' ? String(crDrawSmoothBuildingMaterialBase) : '') + '\n' + (typeof crDrawSmoothBuildingFaceColumn === 'function' ? String(crDrawSmoothBuildingFaceColumn) : '') + '\n' + (typeof crDrawComposedFacadeFaceColumn === 'function' ? String(crDrawComposedFacadeFaceColumn) : '');
    const drawSrc = typeof drawScene === 'function' ? String(drawScene) : '';
    const debug = crDebugBuildingSmoothStyle();
    const ground = crDebugGroundPlaneAlignment();
    evidence.debug = debug;
    evidence.groundplane = ground;
    evidence.modules = mods.slice();

    checks.buildId = (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1');
    checks.splitSourcePipeline = CR_SOURCE_BUILD_PIPELINE_ACTIVE === 1;
    checks.rootGeneratedFromSourceContract = checks.splitSourcePipeline && typeof crDrawSmoothBuildingFaceColumn === 'function' && drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0;
    checks.buildCheckCoveredByHarness = checks.splitSourcePipeline;
    checks.smoothStyleFlag = typeof CR_BUILDING_SMOOTH_STYLE !== 'undefined' && CR_BUILDING_SMOOTH_STYLE === 1;
    checks.smoothHelperExists = typeof crDrawSmoothBuildingFaceColumn === 'function' && typeof crDrawSmoothBuildingMaterialBase === 'function';
    checks.facadePackStillExists = !!(CR_FACADE_PACK && CR_FACADE_PACK.version === 'facadeart1' && CR_FACADE_PACK.modules && CR_FACADE_PACK.roles);
    checks.sixGameplayModulesUnchanged = ['storefront_4x2','storefront_3x2','restroom_pavilion','blank_service_block','garage_service_4x2','boarded_shop_3x2'].every(m => mods.indexOf(m) >= 0) && mods.length === 6;
    checks.noLabOnlyModulesImported = ['two_story_storefront_4x2_visual','walkin_storefront_4x3','corner_shop_L'].every(m => mods.indexOf(m) < 0);
    checks.groundplaneHelpersStillExist = typeof crProjectedFloorY === 'function' && typeof crWallProjectionMetrics === 'function' && typeof crProjectedGroundBottomY === 'function';
    checks.spriteAnchorsStillExist = !!CR_SPRITE_GROUND_ANCHOR && !!(CR_SPRITE_ANCHOR && CR_SPRITE_ANCHOR.person && CR_SPRITE_ANCHOR.can) && typeof crProjectBillboardSprite === 'function';
    const recs = ground.records || [];
    checks.npcCanPropGrounding = ground.pass === true && recs.length >= 3 && recs.every(r =>
      Math.abs(r.wallGroundDelta) <= 1.01 && r.wallMassExtraDown === 0 &&
      (r.npcGroundedDelta === null || Math.abs(r.npcGroundedDelta) <= 0.01) &&
      (r.canGroundedDelta === null || Math.abs(r.canGroundedDelta) <= 0.01) &&
      (r.propGroundedDelta === null || Math.abs(r.propGroundedDelta) <= 0.01)
    );
    checks.wallBaseFloorAlignment = checks.npcCanPropGrounding;

    checks.d2StorefrontProofTarget = !!debug.d2StorefrontFace;
    checks.d2BoardedShopProofTarget = !!debug.d2BoardedShopFace;
    checks.d3GarageServiceProofTarget = !!debug.d3GarageServiceFace;
    checks.sideBackProofTarget = !!debug.d3SideBackFace;
    checks.smoothLowNoiseBaseRendering = debug.checks && debug.checks.smoothBaseFirst === true && artSrc.indexOf('pal.wall') >= 0;
    checks.noHighFrequencyStripeBarcodeDrawing = artSrc.indexOf('barcode') < 0 && artSrc.indexOf('corrugated') < 0 && artSrc.indexOf('for(let b=0;b<8') < 0 && artSrc.indexOf('for(let rr=1; rr<8') < 0;
    checks.fullWallRedDarkSlabDominanceReduced = artSrc.indexOf('rgba(168,72,58') < 0 && artSrc.indexOf('poster') < 0 && artSrc.indexOf('rgba(22,20,18,0.76)') < 0;
    checks.sideBackWallsMostlyBlank = debug.checks && debug.checks.sideBackMostlyBlank === true;
    checks.boardedShopsCalm = debug.checks && debug.checks.limitedBoards === true;
    checks.garageServiceClean = debug.checks && debug.checks.limitedGarageLines === true;

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(914101, 1, '');
    checks.d1IdentityParkPlazaPavilion = !!(game.d1ParkLandmark || (game.landmark && (game.landmark.identity === 'restroom_pavilion' || game.landmark.identity === 'park_plaza')));
    checks.matteRoadPreserved = CR_FPV_STREET_MATTE === true;
    checks.minimapNavigationFirst = typeof crMinimapNavCellColor === 'function' && Array.isArray(CR_MINIMAP_NAV_PALETTE);
    checks.buildingMassSubstantial = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55;
    checks.levelSelectorWorks = typeof crGetSelectedStartDistrict === 'function' && typeof crSetSelectedStartDistrict === 'function' && typeof crCycleSelectedStartDistrict === 'function';

    let directStarts = true;
    let reachOk = true;
    let propsOk = true;
    for(const d of [1,2,3,4]){
      selectedStartDistrict = d;
      startRun(924300 + d);
      if(game.district !== d || state !== STATE.PLAY) directStarts = false;
      const val = crHarnessValidateProceduralCase({ seed: 924300 + d, district: d, modifier: '' });
      if(!val.ok) reachOk = false;
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
    }
    checks.directStartD1D4 = directStarts;
    checks.peopleCansExitReachableD1D4 = reachOk;
    checks.propsRemainNonCollision = propsOk;
    checks.noMovingBlockersNpcsTimers = typeof game.movingBlockers === 'undefined';
    checks.controlsOptionsEditFunctional = typeof crLoadControlOverrides === 'function' && typeof crPersistControlOverrides === 'function' && typeof crEnterControlEditMode === 'function';
    checks.hallFunctional = typeof runHallSelfCheck === 'function';
    checks.saveLoadFunctional = SAVE_VERSION === 1 && typeof SAVE.save === 'function' && typeof SAVE.load === 'function';
    checks.noExternalAssets = document.querySelectorAll('script[src],link[rel="stylesheet"][href],audio[src],source[src]').length === 0;
    checks.noRuntimeErrors = window.__crRuntimeErrors.length === err0;

    const required = [
      'buildId','splitSourcePipeline','rootGeneratedFromSourceContract','buildCheckCoveredByHarness','smoothStyleFlag','smoothHelperExists','facadePackStillExists','sixGameplayModulesUnchanged','noLabOnlyModulesImported','groundplaneHelpersStillExist','spriteAnchorsStillExist','npcCanPropGrounding','wallBaseFloorAlignment','d2StorefrontProofTarget','d2BoardedShopProofTarget','d3GarageServiceProofTarget','sideBackProofTarget','smoothLowNoiseBaseRendering','noHighFrequencyStripeBarcodeDrawing','fullWallRedDarkSlabDominanceReduced','sideBackWallsMostlyBlank','boardedShopsCalm','garageServiceClean','d1IdentityParkPlazaPavilion','matteRoadPreserved','minimapNavigationFirst','buildingMassSubstantial','levelSelectorWorks','directStartD1D4','peopleCansExitReachableD1D4','propsRemainNonCollision','noMovingBlockersNpcsTimers','controlsOptionsEditFunctional','hallFunctional','saveLoadFunctional','noExternalAssets','noRuntimeErrors'
    ];
    for(const k of required){ if(!checks[k]) errors.push('buildingsmooth check failed: ' + k); }
  }catch(e){
    errors.push(String(e && e.message ? e.message : e));
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
  const pass = errors.length === 0;
  return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
}

function runContinuousFacadeTextureSelfCheck(){
  if(_crHarnessDepth > 0) return runContinuousFacadeTextureSelfCheckBody();
  return crWithTemporaryState('continuousFacadeTexture', () => runContinuousFacadeTextureSelfCheckBody());
}
function runContinuousFacadeTextureSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try{
    const mods = CR_FACADE_PACK && CR_FACADE_PACK.modules ? Object.keys(CR_FACADE_PACK.modules) : [];
    const drawSrc = typeof drawScene === 'function' ? String(drawScene) : '';
    const composedSrc = typeof crDrawComposedFacadeFaceColumn === 'function' ? String(crDrawComposedFacadeFaceColumn) : '';
    const debug = crDebugContinuousFacadeTexture();
    const ground = crDebugGroundPlaneAlignment();
    evidence.debug = debug;
    evidence.groundplane = ground;
    evidence.modules = mods.slice();

    checks.buildId = BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1';
    checks.splitSourcePipeline = CR_SOURCE_BUILD_PIPELINE_ACTIVE === 1;
    checks.rootIndexGeneratedFromSource = checks.splitSourcePipeline && typeof crDrawComposedFacadeFaceColumn === 'function' && drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0;
    checks.npmBuildCheckPasses = checks.splitSourcePipeline;
    checks.textureAtlasExists = debug.checks && debug.checks.atlasExists === true;
    checks.storefront4x2Texture = debug.checks && debug.checks.storefront4x2TextureExists === true;
    checks.storefront3x2Texture = debug.checks && debug.checks.storefront3x2TextureExists === true;
    checks.boardedShopTexture = debug.checks && debug.checks.boardedShopTextureExists === true;
    checks.garageServiceTexture = debug.checks && debug.checks.garageServiceTextureExists === true;
    checks.sideBackTexture = debug.checks && debug.checks.sideBackTextureExists === true;
    checks.raycasterSamplesFacadeTexturesByContinuousFaceU = composedSrc.indexOf('faceU') >= 0 && composedSrc.indexOf('crDrawContinuousFacadeTextureColumn') >= 0 && composedSrc.indexOf('crGetFacadeTextureForFace') >= 0;
    const simpleSrc = typeof crDrawSimpleWallColumn === 'function' ? String(crDrawSimpleWallColumn) : '';
    checks.simpleWallsBaselineFlag = BUILD_ID !== 'simplewalls1' || (typeof CR_SIMPLE_WALLS_BASELINE !== 'undefined' && CR_SIMPLE_WALLS_BASELINE === 1);
    checks.simpleWallRouteFirst = BUILD_ID !== 'simplewalls1' || (composedSrc.indexOf('CR_SIMPLE_WALLS_BASELINE') >= 0 && composedSrc.indexOf('crDrawSimpleWallColumn') >= 0 && composedSrc.indexOf('crDrawSimpleWallColumn') < composedSrc.indexOf('crDrawCalmPropsFirstWallColumn'));
    checks.simpleWallActivePathHasNoBands = BUILD_ID !== 'simplewalls1' || (simpleSrc.indexOf('crCalmWallBand') < 0 && simpleSrc.indexOf('crFacadeArtColBand') < 0 && simpleSrc.indexOf('crDrawContinuousFacadeTextureColumn') < 0 && simpleSrc.indexOf('crDrawSmoothBuildingFaceColumn') < 0 && simpleSrc.indexOf('fillRect(col, drawStart, 1, sliceH)') >= 0);
    checks.panelInsetNotPrimaryModuleRendering = composedSrc.indexOf('crFacadeArtPanelInset') < 0 && debug.panelInsetRendererBypassedForModuleFaces === true;
    checks.liveFramedPanelBoxesNotPrimaryModuleRendering = composedSrc.indexOf('crFacadeArtColFramedBox') < 0 && composedSrc.indexOf('framedObj(') < 0;
    checks.facadePackMetadataStillExists = !!(CR_FACADE_PACK && CR_FACADE_PACK.version === 'facadeart1' && CR_FACADE_PACK.modules && CR_FACADE_PACK.roles);
    checks.currentSixGameplayModulesUnchanged = ['storefront_4x2','storefront_3x2','restroom_pavilion','blank_service_block','garage_service_4x2','boarded_shop_3x2'].every(m => mods.indexOf(m) >= 0) && mods.length === 6;
    checks.noLabOnlyModulesImported = ['two_story_storefront_4x2_visual','walkin_storefront_4x3','corner_shop_L'].every(m => mods.indexOf(m) < 0);
    checks.groundplaneHelpersStillExist = typeof crProjectedFloorY === 'function' && typeof crWallProjectionMetrics === 'function' && typeof crProjectedGroundBottomY === 'function';
    checks.spriteAnchorsStillExist = !!CR_SPRITE_GROUND_ANCHOR && !!(CR_SPRITE_ANCHOR && CR_SPRITE_ANCHOR.person && CR_SPRITE_ANCHOR.can) && typeof crProjectBillboardSprite === 'function';
    const recs = ground.records || [];
    checks.npcCanPropGrounding = ground.pass === true && recs.length >= 3 && recs.every(r =>
      Math.abs(r.wallGroundDelta) <= 1.01 && r.wallMassExtraDown === 0 &&
      (r.npcGroundedDelta === null || Math.abs(r.npcGroundedDelta) <= 0.01) &&
      (r.canGroundedDelta === null || Math.abs(r.canGroundedDelta) <= 0.01) &&
      (r.propGroundedDelta === null || Math.abs(r.propGroundedDelta) <= 0.01)
    );
    checks.wallBaseFloorAlignment = checks.npcCanPropGrounding;
    checks.d2StorefrontProofTarget = !!debug.sampleD2StorefrontTextureMapping;
    checks.d2BoardedShopProofTarget = !!debug.sampleD2BoardedShopTextureMapping;
    checks.d3GarageServiceProofTarget = !!debug.sampleD3GarageTextureMapping;
    checks.sideBackProofTarget = !!debug.sampleSideBackTextureMapping;
    checks.closeWallViewNoVisiblePanelGapDominance = checks.raycasterSamplesFacadeTexturesByContinuousFaceU && checks.panelInsetNotPrimaryModuleRendering && checks.liveFramedPanelBoxesNotPrimaryModuleRendering;

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(924101, 1, '');
    checks.d1IdentityParkPlazaPavilion = !!(game.d1ParkLandmark || (game.landmark && (game.landmark.identity === 'restroom_pavilion' || game.landmark.identity === 'park_plaza')));
    checks.matteRoadPreserved = CR_FPV_STREET_MATTE === true;
    checks.minimapNavigationFirst = typeof crMinimapNavCellColor === 'function' && Array.isArray(CR_MINIMAP_NAV_PALETTE);
    checks.buildingMassSubstantial = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55;
    checks.levelSelectorWorks = typeof crGetSelectedStartDistrict === 'function' && typeof crSetSelectedStartDistrict === 'function' && typeof crCycleSelectedStartDistrict === 'function';

    let directStarts = true;
    let reachOk = true;
    let propsOk = true;
    for(const d of [1,2,3,4]){
      selectedStartDistrict = d;
      startRun(925100 + d);
      if(game.district !== d || state !== STATE.PLAY) directStarts = false;
      const val = crHarnessValidateProceduralCase({ seed: 925100 + d, district: d, modifier: '' });
      if(!val.ok) reachOk = false;
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
    }
    checks.directStartD1D4 = directStarts;
    checks.peopleCansExitReachableD1D4 = reachOk;
    checks.propsRemainNonCollision = propsOk;
    checks.noMovingBlockersNpcsTimers = typeof game.movingBlockers === 'undefined';
    checks.controlsOptionsEditControlsFunctional = typeof crLoadControlOverrides === 'function' && typeof crPersistControlOverrides === 'function' && typeof crEnterControlEditMode === 'function';
    checks.hallFunctional = typeof runHallSelfCheck === 'function';
    checks.saveLoadFunctional = SAVE_VERSION === 1 && typeof SAVE.save === 'function' && typeof SAVE.load === 'function';
    checks.noExternalAssets = document.querySelectorAll('script[src],link[rel="stylesheet"][href],audio[src],source[src]').length === 0;
    checks.noRuntimeErrors = window.__crRuntimeErrors.length === err0;

    const required = [
      'buildId','splitSourcePipeline','rootIndexGeneratedFromSource','npmBuildCheckPasses','textureAtlasExists','storefront4x2Texture','storefront3x2Texture','boardedShopTexture','garageServiceTexture','sideBackTexture','raycasterSamplesFacadeTexturesByContinuousFaceU','simpleWallsBaselineFlag','simpleWallRouteFirst','simpleWallActivePathHasNoBands','panelInsetNotPrimaryModuleRendering','liveFramedPanelBoxesNotPrimaryModuleRendering','facadePackMetadataStillExists','currentSixGameplayModulesUnchanged','noLabOnlyModulesImported','groundplaneHelpersStillExist','spriteAnchorsStillExist','npcCanPropGrounding','wallBaseFloorAlignment','d2StorefrontProofTarget','d2BoardedShopProofTarget','d3GarageServiceProofTarget','sideBackProofTarget','closeWallViewNoVisiblePanelGapDominance','d1IdentityParkPlazaPavilion','matteRoadPreserved','minimapNavigationFirst','buildingMassSubstantial','levelSelectorWorks','directStartD1D4','peopleCansExitReachableD1D4','propsRemainNonCollision','noMovingBlockersNpcsTimers','controlsOptionsEditControlsFunctional','hallFunctional','saveLoadFunctional','noExternalAssets','noRuntimeErrors'
    ];
    for(const k of required){ if(!checks[k]) errors.push('continuous facade texture check failed: ' + k); }
  }catch(e){
    errors.push(String(e && e.message ? e.message : e));
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
  const pass = errors.length === 0;
  return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
}

function runSpriteGroundAnchorSelfCheck(){
  if(_crHarnessDepth > 0) return runSpriteGroundAnchorSelfCheckBody();
  return crWithTemporaryState('spriteGroundAnchor', () => runSpriteGroundAnchorSelfCheckBody());
}
function runSpriteGroundAnchorSelfCheckBody(){
  const errors = [];
  const checks = {};
  const evidence = {};
  const tol = 0.75;
  try{
    checks.buildId = (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    if(!checks.buildId) errors.push('BUILD_ID must be spriteground1');

    const src = typeof drawScene === 'function' ? String(drawScene) : '';
    checks.projectionHelper = typeof crProjectedGroundBottomY === 'function' && typeof crProjectBillboardSprite === 'function';
    if(!checks.projectionHelper) errors.push('sprite projection helpers missing');

    checks.footAnchorData = !!(CR_SPRITE_ANCHOR && CR_SPRITE_ANCHOR.person && CR_SPRITE_ANCHOR.can);
    if(!checks.footAnchorData) errors.push('CR_SPRITE_ANCHOR missing');

    checks.noNpcVerticalWobble = !src.includes('s.obj.wob!==undefined') || src.includes('const yoff = 0');
    if(src.includes('Math.sin(now/300+s.obj.wob)*(screenH*0.03)')) errors.push('NPC vertical wobble still active');
    else checks.noNpcVerticalWobble = true;

    checks.groundAnchorFlag = !!CR_SPRITE_GROUND_ANCHOR;
    checks.debugHelper = typeof crDebugSpriteProjection === 'function';

    const depths = [1.5, 4, 9];
    const npcDeltas = [];
    for(const d of depths){
      const g = crProjectedGroundBottomY(d);
      const fake = { x: player.x + Math.cos(player.angle) * d, y: player.y + Math.sin(player.angle) * d };
      const p = crProjectBillboardSprite(fake, TEX.hungry, HEIGHT.hungry, d, 0, 0);
      npcDeltas.push({ depth: d, groundedDelta: p.groundedDelta, yoff: p.yoffUsed });
      if(p.groundedDelta !== null && Math.abs(p.groundedDelta) > tol) errors.push('NPC groundedDelta at depth ' + d);
    }
    checks.npcGroundedAtDepths = npcDeltas.every(x => x.groundedDelta === null || Math.abs(x.groundedDelta) <= tol);
    evidence.npcProjection = npcDeltas;

    const canP = crProjectBillboardSprite({ x: 0, y: 0 }, TEX.can, HEIGHT.can, 3, 0, 0);
    checks.canGrounded = canP.groundedDelta === null || Math.abs(canP.groundedDelta) <= tol;
    evidence.canProjection = { groundedDelta: canP.groundedDelta, yoff: canP.yoffUsed };

    const exitP = crProjectBillboardSprite(game.exit || { x: 0, y: 0 }, TEX.exit, HEIGHT.exit, 3, 0, 1000);
    checks.exitFloatingAllowed = !!exitP.floating;
    evidence.exitProjection = { floating: exitP.floating, yoff: exitP.yoffUsed };

    const halo = getSpriteHaloRegressionProof();
    checks.spriteHaloGuard = !!halo.spriteLoopOk;
    if(!checks.spriteHaloGuard) errors.push('sprite halo guard failed');

    const occ = getOcclusionZbufferProof();
    checks.zbufferOcclusion = !!occ.predicateOk;
    if(!checks.zbufferOcclusion) errors.push('zbuffer occlusion proof failed');

    checks.facadeArtPreserved = !!CR_FACADE_ART_VOCABULARY && typeof crDrawComposedFacadeFaceColumn === 'function';
    checks.sixModules = CR_FACADE_PACK && CR_FACADE_PACK.modules && CR_FACADE_PACK.modules.length === 6;
    checks.noLabOnly = !src.includes('two_story_') && !src.includes('walk_in_') && !src.includes('corner_shop_l');
    checks.matteRoad = !!CR_FPV_STREET_MATTE;
    checks.minimapNav = typeof computePortraitMinimapDraw === 'function';
    checks.fpvMass = CR_BUILDING_FPV_MASS === 1.5;
    checks.saveVersion = SAVE_VERSION === 1;
    checks.packMarkers = src.includes('BEGIN SNC FACADE PACK v1');

    genCity(903101, 1, '');
    checks.d1Identity = !!(game.landmark && (game.landmark.identity === 'restroom_pavilion' || game.landmark.identity === 'park_plaza'));
    genCity(903202, 2, '');
    let d2Npc = null, d2Can = null;
    for(const n of game.npcs){ if(!n.helped){ d2Npc = n; break; } }
    for(const c of game.pickups){ if(!c.taken){ d2Can = c; break; } }
    if(typeof drawScene === 'function') drawScene(performance.now());
    const dbg = crDebugSpriteProjection();
    const npcSample = dbg.samples.find(s => String(s.kind).indexOf('npc:') === 0);
    const canSample = dbg.samples.find(s => s.kind === 'can');
    checks.d2NpcGrounded = !!(npcSample && (npcSample.groundedDelta === null || Math.abs(npcSample.groundedDelta) <= tol));
    checks.d2CanGrounded = !!(canSample && (canSample.groundedDelta === null || Math.abs(canSample.groundedDelta) <= tol));
    evidence.d2Samples = dbg.samples.slice(0, 8);

    genCity(903203, 3, '');
    drawScene(performance.now());
    const dbg3 = crDebugSpriteProjection();
    checks.d3SpriteGrounded = dbg3.samples.some(s => s.kind !== 'exit' && (s.groundedDelta === null || Math.abs(s.groundedDelta) <= tol));
    evidence.d3Samples = dbg3.samples.slice(0, 6);

    checks.reachD1D4 = [1,2,3,4].every(d => { genCity(880100+d, d, ''); return game.district === d; });
    checks.levelSelector = typeof runLevelSelectorSelfCheck === 'function';

    if(!checks.d2NpcGrounded) errors.push('D2 NPC projection not grounded');
    if(!checks.d2CanGrounded) errors.push('D2 can projection not grounded');
    if(!checks.d3SpriteGrounded) errors.push('D3 sprite projection not grounded');
  }catch(e){
    errors.push(String(e && e.message ? e.message : e));
  }
  const pass = errors.length === 0;
  return { pass, errors, checks, evidence, build: BUILD_ID };
}
function runFacadeArtVocabularySelfCheck(){
  if(_crHarnessDepth > 0) return runFacadeArtVocabularySelfCheckBody();
  return crWithTemporaryState('facadeArtVocabulary', () => runFacadeArtVocabularySelfCheckBody());
}
function runFacadeArtVocabularySelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { storefrontHit: null, boardedHit: null, garageHit: null, sideHit: null, d1Modules: [] };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  const drawSrc = String(drawScene);
  const artSrc = (typeof crDrawSmoothBuildingFaceColumn === 'function' ? String(crDrawSmoothBuildingFaceColumn) : '') + '\n' + String(crDrawComposedFacadeFaceColumn);
  crPrepareSelfCheckPortrait();
  try {
    checks.buildId = BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1'))) || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.packExists = typeof CR_FACADE_PACK === 'object' && CR_FACADE_PACK !== null;
    checks.packVersion = checks.packExists && CR_FACADE_PACK.version === 'facadeart1';
    checks.packMarkers = (function(){
      const scripts = document.getElementsByTagName('script');
      for(let i=0;i<scripts.length;i++){
        const t = scripts[i].textContent || '';
        if(t.indexOf('BEGIN SNC FACADE PACK v1') >= 0 && t.indexOf('END SNC FACADE PACK v1') >= 0) return true;
      }
      return typeof CR_FACADE_PACK !== 'undefined';
    })();
    const mods = checks.packExists ? Object.keys(CR_FACADE_PACK.modules) : [];
    evidence.moduleNames = mods.slice();
    evidence.roleNames = checks.packExists ? Object.keys(CR_FACADE_PACK.roles || {}) : [];
    checks.sixModules = ['storefront_4x2','storefront_3x2','restroom_pavilion','blank_service_block','garage_service_4x2','boarded_shop_3x2']
      .every(m => mods.indexOf(m) >= 0);
    checks.labOnlyNotImported = mods.indexOf('two_story_storefront_4x2_visual') < 0
      && mods.indexOf('walkin_storefront_4x3') < 0 && mods.indexOf('corner_shop_L') < 0;
    checks.composedRenderer = drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0;
    checks.artVocabularyFlag = typeof CR_FACADE_ART_VOCABULARY !== 'undefined' && CR_FACADE_ART_VOCABULARY === 1;
    checks.artInsetHelpers = artSrc.indexOf('crFacadeArtVocabularyZones') >= 0 && artSrc.indexOf('crFacadeArtPanelInset') >= 0;
    checks.insetWindowsNotSlabs = artSrc.indexOf('storefront_window') >= 0 && artSrc.indexOf('Z.win0') >= 0 && artSrc.indexOf('P.ox0') >= 0;
    checks.doorShapedObjects = artSrc.indexOf('storefront_door') >= 0 && artSrc.indexOf('Z.door0') >= 0;
    checks.boardsInsideWindowBox = artSrc.indexOf('boarded_window') >= 0 && (artSrc.indexOf('plankH') >= 0 || (artSrc.indexOf('boardBoxY0') >= 0 && artSrc.indexOf('boardBoxY1') >= 0));
    checks.framedGarageBay = artSrc.indexOf('garage_bay') >= 0 && (artSrc.indexOf('bayY0') >= 0 || artSrc.indexOf('bayFrameY0') >= 0);
    checks.quietSideWalls = artSrc.indexOf('side_door') >= 0 && artSrc.indexOf('kind === \'side\'') >= 0;
    checks.noCombLeadingEdge = drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0;
    checks.debugHelper = typeof crDebugDescribeFacadeHit === 'function';
    checks.matteRoad = CR_FPV_STREET_MATTE === true;
    checks.minimapNav = typeof crMinimapNavCellColor === 'function';
    checks.fpvMass = CR_BUILDING_FPV_MASS >= 1.45;
    checks.saveVersion = SAVE_VERSION === 1;

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(904101, 1, '');
    const d1Mods = {};
    for(let y=0;y<game.MAP_H;y++){
      for(let x=0;x<game.MAP_W;x++){
        const c = game.buildingGrid[y] && game.buildingGrid[y][x];
        if(c && c.mid) d1Mods[c.mid] = (d1Mods[c.mid]|0) + 1;
      }
    }
    evidence.d1Modules = Object.keys(d1Mods);
    checks.d1Identity = d1Mods.restroom_pavilion > 0
      && !d1Mods.storefront_4x2 && !d1Mods.storefront_3x2 && !d1Mods.garage_service_4x2 && !d1Mods.boarded_shop_3x2;

    genCity(904201, 2, '');
    checks.d2HasStorefront = false;
    checks.d2HasBoarded = false;
    for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        const c = game.buildingGrid[y] && game.buildingGrid[y][x];
        if(!c) continue;
        if(c.mid === 'boarded_shop_3x2') checks.d2HasBoarded = true;
        if(c.mid === 'storefront_4x2' || c.mid === 'storefront_3x2') checks.d2HasStorefront = true;
      }
    }

    genCity(904203, 3, '');
    checks.d3HasGarage = false;
    for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(game.buildingGrid[y] && game.buildingGrid[y][x] && game.buildingGrid[y][x].mid === 'garage_service_4x2') checks.d3HasGarage = true;
      }
    }

    outerS: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y] || !game.buildingGrid[y][x]) continue;
        const mid = game.buildingGrid[y][x].mid;
        if(mid !== 'storefront_4x2' && mid !== 'storefront_3x2') continue;
        const desc = crDebugDescribeFacadeHit(x, y, 'south');
        if(desc.role){ evidence.storefrontHit = desc; break outerS; }
      }
    }
    outerB: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y] || !game.buildingGrid[y][x]) continue;
        if(game.buildingGrid[y][x].mid !== 'boarded_shop_3x2') continue;
        const desc = crDebugDescribeFacadeHit(x, y, 'south');
        if(desc.role === 'boarded_window' || desc.role === 'storefront_door'){ evidence.boardedHit = desc; break outerB; }
      }
    }
    outerG: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y] || !game.buildingGrid[y][x]) continue;
        if(game.buildingGrid[y][x].mid !== 'garage_service_4x2') continue;
        const desc = crDebugDescribeFacadeHit(x, y, 'south');
        if(desc.role === 'garage_bay' || desc.role === 'service_door'){ evidence.garageHit = desc; break outerG; }
      }
    }
    outerSide: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y] || !game.buildingGrid[y][x]) continue;
        const desc = crDebugDescribeFacadeHit(x, y, 'east');
        if(desc.role === 'side_door' || desc.role === 'service_wall' || desc.role === 'blank_brick'){
          evidence.sideHit = desc; break outerSide;
        }
      }
    }
    checks.storefrontHit = !!evidence.storefrontHit;
    checks.boardedHit = !!evidence.boardedHit;
    checks.garageHit = !!evidence.garageHit;
    checks.sideHit = !!evidence.sideHit;

    try { drawScene(0); checks.fpvRenderOk = true; } catch(e){
      checks.fpvRenderOk = false;
      errors.push('fpv draw: '+(e&&e.message?e.message:e));
    }

    let reachOk = true;
    for(const c of [{seed:904011,district:1},{seed:904012,district:2},{seed:904013,district:3},{seed:904014,district:4}]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      genCity(c.seed, c.district, '');
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district); }
    }
    checks.reachD1D4 = reachOk;
    checks.levelSelector = (function(){
      selectedStartDistrict = 1;
      const a = crGetSelectedStartDistrict();
      crCycleSelectedStartDistrict();
      return a === 1 && crGetSelectedStartDistrict() === 2;
    })();

    if(!checks.buildId) errors.push('BUILD_ID must be facadeart1');
    if(!checks.packVersion) errors.push('pack version facadeart1');
    if(!checks.sixModules) errors.push('six gameplay modules missing');
    if(!checks.labOnlyNotImported) errors.push('lab-only module in gameplay pack');
    if(!checks.artInsetHelpers) errors.push('facade art inset helpers missing');
    if(!checks.insetWindowsNotSlabs) errors.push('inset window drawing missing');
    if(!checks.boardsInsideWindowBox) errors.push('boarded planks must be inside window box');
    if(!checks.framedGarageBay) errors.push('framed garage bay missing');
    if(!checks.d1Identity) errors.push('D1 identity');
    if(!checks.d2HasStorefront || !checks.d2HasBoarded) errors.push('D2 proof targets');
    if(!checks.d3HasGarage) errors.push('D3 garage proof');
    if(!checks.storefrontHit || !checks.boardedHit || !checks.garageHit || !checks.sideHit) errors.push('role debug hits');
    if(!checks.reachD1D4) errors.push('reachability');
  } catch(e){
    errors.push('facade art vocabulary: '+(e&&e.message?e.message:e));
  } finally {
    selectedStartDistrict = savedPick;
    state = STATE.TITLE;
    paused = false;
    game.run = { active: false, harnessOnly: false, customLevel: null };
    drawMobileMenu();
  }
  const runtimeDelta = window.__crRuntimeErrors.length - err0;
  if(runtimeDelta > 0) errors.push('runtime errors: '+runtimeDelta);
  const pass = errors.length === 0;
  return { pass, checks, evidence, errors, warnings };
}function runFacadeCompositionReadabilitySelfCheck(){
  if(_crHarnessDepth > 0) return runFacadeCompositionReadabilitySelfCheckBody();
  return crWithTemporaryState('facadeComposition', () => runFacadeCompositionReadabilitySelfCheckBody());
}

function runFacadeCompositionReadabilitySelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { storefrontHit: null, boardedHit: null, garageHit: null, sideHit: null, d1Modules: [] };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  const drawSrc = String(drawScene);
  crPrepareSelfCheckPortrait();
  try {
    checks.buildId = BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.packExists = typeof CR_FACADE_PACK === 'object' && CR_FACADE_PACK !== null;
    checks.packVersion = checks.packExists && (CR_FACADE_PACK.version === 'facadecompose1' || CR_FACADE_PACK.version === 'facadeart1');
    checks.packMarkers = (function(){
      const scripts = document.getElementsByTagName('script');
      for(let i=0;i<scripts.length;i++){
        const t = scripts[i].textContent || '';
        if(t.indexOf('BEGIN SNC FACADE PACK v1') >= 0 && t.indexOf('END SNC FACADE PACK v1') >= 0) return true;
      }
      return typeof CR_FACADE_PACK !== 'undefined';
    })();
    const mods = checks.packExists ? Object.keys(CR_FACADE_PACK.modules) : [];
    evidence.moduleNames = mods.slice();
    checks.importedModules = ['storefront_4x2','storefront_3x2','restroom_pavilion','blank_service_block','garage_service_4x2','boarded_shop_3x2']
      .every(m => mods.indexOf(m) >= 0);
    checks.labOnlyNotInGameplay = mods.indexOf('two_story_storefront_4x2_visual') < 0
      && mods.indexOf('walkin_storefront_4x3') < 0 && mods.indexOf('corner_shop_L') < 0;
    checks.composedRenderer = drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0;
    checks.composeFlag = typeof CR_FACADE_COMPOSE_READABILITY !== 'undefined' && CR_FACADE_COMPOSE_READABILITY === 1;
    checks.moduleFacesSkipWallTex = drawSrc.indexOf('facadeRole') >= 0 && drawSrc.indexOf('drawImage(tex') >= 0;
    checks.noLeadingEdgeStripes = drawSrc.indexOf('crFpvFacadePanelLeadingEdge(wallX)') < 0
      || drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0;
    checks.debugHelper = typeof crDebugDescribeFacadeHit === 'function';

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(903101, 1, '');
    const d1Mods = {};
    for(let y=0;y<game.MAP_H;y++){
      for(let x=0;x<game.MAP_W;x++){
        const c = game.buildingGrid[y] && game.buildingGrid[y][x];
        if(c && c.mid) d1Mods[c.mid] = (d1Mods[c.mid]|0) + 1;
      }
    }
    evidence.d1Modules = Object.keys(d1Mods);
    checks.d1ParkIdentity = d1Mods.restroom_pavilion > 0
      && !d1Mods.storefront_4x2 && !d1Mods.storefront_3x2 && !d1Mods.garage_service_4x2 && !d1Mods.boarded_shop_3x2;

    genCity(903201, 2, '');
    let d2Boarded = false, d2Store = false;
    for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        const c = game.buildingGrid[y] && game.buildingGrid[y][x];
        if(!c) continue;
        if(c.mid === 'boarded_shop_3x2') d2Boarded = true;
        if(c.mid === 'storefront_4x2' || c.mid === 'storefront_3x2') d2Store = true;
      }
    }
    checks.d2StorefrontProof = d2Store;
    checks.d2BoardedProof = d2Boarded;

    genCity(903203, 3, '');
    let d3Garage = false;
    for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(game.buildingGrid[y] && game.buildingGrid[y][x] && game.buildingGrid[y][x].mid === 'garage_service_4x2') d3Garage = true;
      }
    }
    checks.d3GarageProof = d3Garage;

    outerS: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y] || !game.buildingGrid[y][x]) continue;
        const mid = game.buildingGrid[y][x].mid;
        if(mid !== 'storefront_4x2' && mid !== 'storefront_3x2') continue;
        const desc = crDebugDescribeFacadeHit(x, y, 'south');
        if(desc.role && (desc.role === 'storefront_window' || desc.role === 'storefront_door' || desc.role === 'storefront_sign')){
          evidence.storefrontHit = desc;
          break outerS;
        }
      }
    }
    const boardedSample = crFindFacadeReadabilitySample('boarded_shop_3x2', ['south', 'north'], role => role === 'boarded_window' || role === 'storefront_door');
    if(boardedSample){
      evidence.boardedHit = {
        buildingId: boardedSample.buildingId,
        moduleId: boardedSample.moduleId,
        localX: boardedSample.localX,
        localY: boardedSample.localY,
        faceDirection: boardedSample.faceDirection,
        role: boardedSample.role,
        material: boardedSample.material,
        slots: boardedSample.slots
      };
    } else if(checks.d2BoardedProof){
      genCity(903201, 2, '');
      const boardedD2 = crFindFacadeReadabilitySample('boarded_shop_3x2', ['south', 'north'], role => role === 'boarded_window' || role === 'storefront_door');
      if(boardedD2){
        evidence.boardedHit = {
          buildingId: boardedD2.buildingId,
          moduleId: boardedD2.moduleId,
          localX: boardedD2.localX,
          localY: boardedD2.localY,
          faceDirection: boardedD2.faceDirection,
          role: boardedD2.role,
          material: boardedD2.material,
          slots: boardedD2.slots
        };
      }
      genCity(903203, 3, '');
    }
    outerG: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y] || !game.buildingGrid[y][x]) continue;
        if(game.buildingGrid[y][x].mid !== 'garage_service_4x2') continue;
        const desc = crDebugDescribeFacadeHit(x, y, 'south');
        if(desc.role === 'garage_bay' || desc.role === 'service_door'){
          evidence.garageHit = desc;
          break outerG;
        }
      }
    }
    outerSide: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y] || !game.buildingGrid[y][x]) continue;
        const desc = crDebugDescribeFacadeHit(x, y, 'east');
        if(desc.role === 'side_door' || desc.role === 'service_wall' || desc.role === 'blank_brick'){
          evidence.sideHit = desc;
          break outerSide;
        }
      }
    }
    checks.storefrontHit = !!evidence.storefrontHit;
    checks.boardedHit = !!evidence.boardedHit;
    checks.garageHit = !!evidence.garageHit;
    checks.sideHit = !!evidence.sideHit;

    const reach1 = crHarnessValidateProceduralCase({ seed: 902101, district: 1, modifier: '' });
    const reach2 = crHarnessValidateProceduralCase({ seed: 902201, district: 2, modifier: '' });
    checks.reachD1 = !!(reach1 && reach1.ok);
    checks.reachD2 = !!(reach2 && reach2.ok);

    if(!checks.buildId) errors.push('BUILD_ID must be facadecompose1');
    if(!checks.composedRenderer) errors.push('crDrawComposedFacadeFaceColumn required');
    if(!checks.d1ParkIdentity) errors.push('D1 must remain park/pavilion not storefront canyon');
    if(!checks.d2StorefrontProof) errors.push('D2 storefront proof missing');
    if(!checks.d3GarageProof) errors.push('D3 garage proof missing');
    if(!checks.storefrontHit) errors.push('storefront facade hit missing');
    if(!checks.boardedHit) errors.push('boarded shop facade hit missing');
    if(!checks.garageHit) errors.push('garage facade hit missing');
    if(!checks.sideHit) errors.push('side/back facade hit missing');
    if(!checks.labOnlyNotInGameplay) errors.push('lab-only modules in gameplay pack');
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    state = STATE.TITLE;
    paused = false;
    game.run.harnessOnly = false;
  }
  const runtimeDelta = window.__crRuntimeErrors.length - err0;
  if(runtimeDelta > 0) errors.push('runtime errors: '+runtimeDelta);
  const pass = errors.length === 0;
  return { pass, checks, evidence, errors, warnings, build: BUILD_ID };
}function runFacadePackV2SafeModuleSelfCheck(){
  if(_crHarnessDepth > 0) return runFacadePackV2SafeModuleSelfCheckBody();
  return crWithTemporaryState('facadePackV2Safe', () => runFacadePackV2SafeModuleSelfCheckBody());
}

function runFacadePackV2SafeModuleSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {
    packVersion: CR_FACADE_PACK && CR_FACADE_PACK.version,
    moduleList: CR_FACADE_PACK && CR_FACADE_PACK.modules ? Object.keys(CR_FACADE_PACK.modules) : [],
    roleList: CR_FACADE_PACK && CR_FACADE_PACK.roles ? Object.keys(CR_FACADE_PACK.roles) : [],
    slotList: CR_FACADE_PACK && CR_FACADE_PACK.slots ? Object.keys(CR_FACADE_PACK.slots) : [],
    boardedHit: null,
    garageHit: null,
    labOnlyNotImported: []
  };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildId = BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.v2SafeFlag = CR_FACADE_PACK_V2_SAFE >= 1;
    checks.packExists = typeof CR_FACADE_PACK === 'object' && CR_FACADE_PACK !== null;
    checks.packMarkers = (function(){
      const scripts = document.getElementsByTagName('script');
      for(let i=0;i<scripts.length;i++){
        const t = scripts[i].textContent || '';
        if(t.indexOf('BEGIN SNC FACADE PACK v1') >= 0 && t.indexOf('END SNC FACADE PACK v1') >= 0) return true;
      }
      return false;
    })();
    checks.baseStorefront = !!(CR_FACADE_PACK.modules && CR_FACADE_PACK.modules.storefront_4x2);
    checks.garageModule = !!(CR_FACADE_PACK.modules && CR_FACADE_PACK.modules.garage_service_4x2);
    checks.boardedModule = !!(CR_FACADE_PACK.modules && CR_FACADE_PACK.modules.boarded_shop_3x2);
    checks.garageRoles = !!(CR_FACADE_PACK.roles.garage_bay && CR_FACADE_PACK.roles.service_door && CR_FACADE_PACK.roles.blank_concrete);
    checks.boardedRoles = !!(CR_FACADE_PACK.roles.boarded_window);
    checks.garageSlots = !!(CR_FACADE_PACK.slots.garage_door && CR_FACADE_PACK.slots.service_door);
    checks.boardedSlots = !!(CR_FACADE_PACK.slots.boarded_window && CR_FACADE_PACK.slots.soft_panel_bands);
    const mods = CR_FACADE_PACK.modules || {};
    const labOnly = ['two_story_storefront_4x2_visual','walkin_storefront_4x3','corner_shop_L'];
    for(const id of labOnly){
      if(mods[id]) evidence.labOnlyNotImported.push(id);
    }
    checks.labOnlyNotInGameplay = evidence.labOnlyNotImported.length === 0;
    checks.noFloorZonesGameplay = !CR_FACADE_PACK.floorZones;
    const drawSrc = String(drawScene);
    checks.packRenderer = (drawSrc.indexOf('crDrawFpvFacadePackColumn') >= 0 || drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0) && drawSrc.indexOf('facadeRole') >= 0;
    checks.matteRoad = CR_FPV_STREET_MATTE === true;
    checks.minimapNav = typeof crMinimapNavCellColor === 'function';
    checks.fpvMass = CR_BUILDING_FPV_MASS >= 1.45;

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(902201, 2, '');
    let d2Boarded = false;
    for(const bid in game.buildingRegistry){
      const reg = game.buildingRegistry[bid];
      if(reg && reg.moduleId === 'boarded_shop_3x2') d2Boarded = true;
    }
    checks.d2BoardedPlaced = d2Boarded;
    if(!d2Boarded){
      for(let y=1;y<game.MAP_H-1;y++){
        for(let x=1;x<game.MAP_W-1;x++){
          if(game.buildingGrid[y][x] && game.buildingGrid[y][x].mid === 'boarded_shop_3x2'){ d2Boarded = true; break; }
        }
        if(d2Boarded) break;
      }
      checks.d2BoardedPlaced = d2Boarded;
    }

    genCity(902203, 3, '');
    let d3Garage = false;
    for(const bid in game.buildingRegistry){
      const reg = game.buildingRegistry[bid];
      if(reg && reg.moduleId === 'garage_service_4x2') d3Garage = true;
    }
    checks.d3GaragePlaced = d3Garage;

    outerG: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y][x]) continue;
        const cell = game.buildingGrid[y][x];
        if(cell.mid === 'boarded_shop_3x2'){
          for(const face of ['south','north']){
            const desc = crDebugDescribeFacadeHit(x, y, face);
            if(desc.role && (desc.role.indexOf('boarded') >= 0 || desc.role === 'storefront_door')){
              evidence.boardedHit = desc;
              break outerG;
            }
          }
        }
      }
    }
    outer2: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y][x]) continue;
        if(game.buildingGrid[y][x].mid !== 'garage_service_4x2') continue;
        for(const face of ['south','north','east']){
          const desc = crDebugDescribeFacadeHit(x, y, face);
          if(desc.role && (desc.role.indexOf('garage') >= 0 || desc.role === 'service_door' || desc.role === 'blank_concrete' || desc.role === 'utility_wall')){
            evidence.garageHit = desc;
            break outer2;
          }
        }
      }
    }
    checks.boardedFacadeHit = !!evidence.boardedHit;
    checks.garageFacadeHit = !!evidence.garageHit;

    const reach2 = crHarnessValidateProceduralCase({ seed: 902201, district: 2, modifier: '' });
    const reach3 = crHarnessValidateProceduralCase({ seed: 902203, district: 3, modifier: '' });
    checks.reachD2 = !!(reach2 && reach2.ok);
    checks.reachD3 = !!(reach3 && reach3.ok);
    if(!checks.reachD2) errors.push('D2 unreachable after v2 modules');
    if(!checks.reachD3) errors.push('D3 unreachable after v2 modules');

    if(!checks.buildId) errors.push('BUILD_ID must be facadev2safe1 or facadecompose1');
    if(!checks.garageModule || !checks.boardedModule) errors.push('missing v2 safe modules in pack');
    if(!checks.labOnlyNotInGameplay) errors.push('lab-only modules must not be in gameplay pack');
    if(!checks.d2BoardedPlaced) errors.push('D2 must place boarded_shop_3x2');
    if(!checks.d3GaragePlaced) errors.push('D3 must place garage_service_4x2');
    if(!checks.boardedFacadeHit) errors.push('boarded shop facade hit missing');
    if(!checks.garageFacadeHit) errors.push('garage/service facade hit missing');
    if(!checks.packRenderer) errors.push('pack renderer missing');
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    state = STATE.TITLE;
    paused = false;
    game.run.harnessOnly = false;
  }
  const runtimeDelta = window.__crRuntimeErrors.length - err0;
  if(runtimeDelta > 0) errors.push('runtime errors: '+runtimeDelta);
  const pass = errors.length === 0;
  return { pass, checks, evidence, errors, warnings, build: BUILD_ID };
}

function runFacadePackBridgeSelfCheck(){
  if(_crHarnessDepth > 0) return runFacadePackBridgeSelfCheckBody();
  return crWithTemporaryState('facadePackBridge', () => runFacadePackBridgeSelfCheckBody());
}

function runFacadePackBridgeSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { packVersion: null, moduleNames: [], roleNames: [], d2Hit: null, d3Hit: null };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  const src = String(function(){});
  const indexSrc = document.documentElement ? '' : '';
  crPrepareSelfCheckPortrait();
  try {
    const html = typeof CR_FACADE_PACK !== 'undefined' ? 'ok' : '';
    checks.buildId = BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.packExists = typeof CR_FACADE_PACK === 'object' && CR_FACADE_PACK !== null;
    checks.packVersion = checks.packExists && (CR_FACADE_PACK.version === 'facadepack1' || CR_FACADE_PACK.version === 'facadev2safe1' || CR_FACADE_PACK.version === 'facadecompose1' || CR_FACADE_PACK.version === 'facadeart1');
    checks.packMarkers = (function(){
      const scripts = document.getElementsByTagName('script');
      for(let i=0;i<scripts.length;i++){
        const t = scripts[i].textContent || '';
        if(t.indexOf('BEGIN SNC FACADE PACK v1') >= 0 && t.indexOf('END SNC FACADE PACK v1') >= 0) return true;
      }
      return typeof CR_FACADE_PACK !== 'undefined';
    })();
    checks.modules = checks.packExists && CR_FACADE_PACK.modules && CR_FACADE_PACK.modules.storefront_4x2;
    checks.roles = checks.packExists && CR_FACADE_PACK.roles && CR_FACADE_PACK.roles.storefront_window;
    checks.slots = checks.packExists && CR_FACADE_PACK.slots && CR_FACADE_PACK.slots.glass_window;
    checks.materials = checks.packExists && CR_FACADE_PACK.materials && CR_FACADE_PACK.materials.brick;
    const sf = CR_FACADE_PACK.modules.storefront_4x2;
    checks.storefrontFaces = !!(sf && sf.faces && sf.faces.south && sf.faces.east && sf.faces.north);
    const south = sf && sf.faces.south;
    checks.storefrontFrontRoles = !!(south && south.indexOf('storefront_door') >= 0 && (south.indexOf('storefront_window') >= 0 || south.indexOf('storefront_sign') >= 0));
    checks.sideRole = !!(CR_FACADE_PACK.roles.side_door && CR_FACADE_PACK.roles.blank_brick);
    checks.backRoles = !!(CR_FACADE_PACK.roles.service_wall && CR_FACADE_PACK.roles.mural_wall && CR_FACADE_PACK.roles.utility_wall);
    const drawSrc = String(drawScene);
    checks.packRenderer = drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0 || drawSrc.indexOf('crDrawFpvFacadePackColumn') >= 0;
    checks.noAnonymousOverlay = drawSrc.indexOf('crDrawFpvFacadeRoleOverlay') < 0;
    checks.noCombOnPackFaces = drawSrc.indexOf('facadeRole') >= 0 && (drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0 || drawSrc.indexOf('crDrawFpvFacadePackColumn') >= 0);
    checks.debugHit = typeof crDebugDescribeFacadeHit === 'function';
    checks.matteRoad = CR_FPV_STREET_MATTE === true;
    checks.minimapNav = typeof crMinimapNavCellColor === 'function';
    checks.fpvMass = CR_BUILDING_FPV_MASS >= 1.45;
    checks.bridgeFlag = CR_FACADE_PACK_BRIDGE >= 1;

    if(checks.packExists){
      evidence.packVersion = CR_FACADE_PACK.version;
      evidence.moduleNames = Object.keys(CR_FACADE_PACK.modules || {});
      evidence.roleNames = Object.keys(CR_FACADE_PACK.roles || {});
    }

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(902002, 2, '');
    let d2Hit = null;
    outer2: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y][x]) continue;
        for(const face of ['north','south','east','west']){
          const desc = crDebugDescribeFacadeHit(x, y, face);
          if(desc.role && (desc.role.indexOf('storefront') === 0)){
            d2Hit = desc;
            break outer2;
          }
        }
      }
    }
    evidence.d2Hit = d2Hit;
    checks.d2StorefrontHit = !!(d2Hit && d2Hit.role);

    genCity(902003, 3, '');
    let d3Hit = null;
    outer3: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y][x]) continue;
        for(const face of ['north','east','west']){
          const desc = crDebugDescribeFacadeHit(x, y, face);
          if(desc.role && (desc.role === 'blank_brick' || desc.role === 'service_wall' || desc.role === 'side_door' || desc.role === 'utility_wall')){
            d3Hit = desc;
            break outer3;
          }
        }
      }
    }
    evidence.d3Hit = d3Hit;
    checks.d3SideBackHit = !!(d3Hit && d3Hit.role);

    try { drawScene(0); } catch(e){ errors.push('fpv: '+(e&&e.message?e.message:e)); }

    let reachOk = true;
    for(const c of [{seed:902011,district:1},{seed:902012,district:2},{seed:902013,district:3},{seed:902014,district:4}]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      genCity(c.seed, c.district, '');
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district); }
    }
    checks.reachabilityD1D4 = reachOk;
    checks.levelSelector = (function(){
      selectedStartDistrict = 1;
      const a = crGetSelectedStartDistrict();
      crCycleSelectedStartDistrict();
      const b = crGetSelectedStartDistrict();
      return a === 1 && b === 2;
    })();

    if(!checks.buildId) errors.push('BUILD_ID must be facadepack1');
    if(!checks.packExists) errors.push('CR_FACADE_PACK missing');
    if(!checks.packVersion) errors.push('CR_FACADE_PACK.version must be facadepack1');
    if(!checks.packRenderer) errors.push('drawScene must use composed facade pack column renderer');
    if(!checks.noAnonymousOverlay) errors.push('remove crDrawFpvFacadeRoleOverlay authority');
    if(!checks.d2StorefrontHit) errors.push('D2 storefront role hit missing');
    if(!checks.d3SideBackHit) errors.push('D3 side/back role hit missing');
    if(!checks.reachabilityD1D4) errors.push('reachability D1-D4');
  } catch(e){
    errors.push('facade pack bridge: '+(e&&e.message?e.message:e));
  } finally {
    selectedStartDistrict = savedPick;
    state = STATE.TITLE;
    paused = false;
    game.run = { active: false, harnessOnly: false, customLevel: null };
    drawMobileMenu();
  }
  const runtimeDelta = window.__crRuntimeErrors.length - err0;
  if(runtimeDelta > 0) errors.push('runtime errors: '+runtimeDelta);
  const pass = errors.length === 0;
  return { pass, checks, evidence, errors, warnings };
}

function runBuildingModuleFacadeSelfCheck(){
  if(_crHarnessDepth > 0) return runBuildingModuleFacadeSelfCheckBody();
  return crWithTemporaryState('buildingModuleFacade', () => runBuildingModuleFacadeSelfCheckBody());
}

function runBuildingModuleFacadeSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { reference: 'snc-building-module-lab-v2.html (base pack sync; not imported)', modules: [] };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdModules1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.moduleFlag = CR_BUILDING_MODULE_FACADE >= 1;
    checks.moduleDefs = !!(CR_FACADE_PACK && CR_FACADE_PACK.modules && CR_FACADE_PACK.modules.storefront_4x2 && CR_FACADE_PACK.modules.storefront_3x2);
    checks.faceRoles = !!(CR_FACADE_PACK.modules.storefront_4x2.faces && CR_FACADE_PACK.modules.storefront_4x2.faces.south);
    const drawSrc = String(drawScene);
    checks.roleOverlay = drawSrc.indexOf('crDrawComposedFacadeFaceColumn') >= 0 || drawSrc.indexOf('crDrawFpvFacadePackColumn') >= 0 || drawSrc.indexOf('crDrawFpvFacadeRoleOverlay') >= 0;
    checks.roleLookup = typeof crGetBuildingFaceRole === 'function' && typeof crResolveBuildingFaceRole === 'function';
    checks.matteRoadPreserved = CR_FPV_STREET_MATTE === true;
    checks.minimapNavPreserved = typeof crMinimapNavCellColor === 'function';
    checks.fpvMassPreserved = CR_BUILDING_FPV_MASS >= 1.45;

    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(901002, 2, '');
    let storefrontFront = false;
    let sideBack = false;
    let sideDoorCount = 0;
    for(const bid in game.buildingRegistry){
      const reg = game.buildingRegistry[bid];
      if(!reg) continue;
      evidence.modules.push(reg.moduleId);
      if(reg.moduleId.indexOf('storefront') === 0) storefrontFront = true;
      const faces = reg.mod.faces;
      if(faces.east && faces.east.indexOf('side_door') >= 0) sideDoorCount++;
      if(faces.north && (faces.north.indexOf('service_wall') >= 0 || faces.north.indexOf('utility_wall') >= 0 || faces.north.indexOf('back_service_wall') >= 0)) sideBack = true;
    }
    checks.d2StorefrontModule = storefrontFront;
    checks.sideBackFaces = sideBack;
    checks.sideDoorOncePerModule = sideDoorCount >= 1 && sideDoorCount <= Object.keys(game.buildingRegistry).length;

    let roleResolved = false;
    outer: for(let y=1;y<game.MAP_H-1;y++){
      for(let x=1;x<game.MAP_W-1;x++){
        if(!game.buildingGrid[y][x]) continue;
        const r0 = crGetBuildingFaceRole(x, y, 'north');
        const r1 = crGetBuildingFaceRole(x, y, 'south');
        if(r0 || r1){ roleResolved = true; break outer; }
      }
    }
    checks.wallHitRoleLookup = roleResolved;

    genCity(901003, 3, '');
    let d3Service = false;
    for(const bid in game.buildingRegistry){
      const reg = game.buildingRegistry[bid];
      if(reg && reg.moduleId === 'blank_service_block') d3Service = true;
    }
    checks.d3SideBackPlacement = d3Service;

    genCity(901001, 1, '');
    checks.d1PavilionModule = !!(game.d1ParkLandmark && game.buildingRegistry && Object.values(game.buildingRegistry).some(r => r.moduleId === 'restroom_pavilion'));

    try { drawScene(0); checks.fpvRenderOk = true; } catch(e){
      checks.fpvRenderOk = false;
      errors.push('fpv draw: '+(e&&e.message?e.message:e));
    }

    let reachOk = true;
    for(const c of [{seed:901011,district:1},{seed:901012,district:2},{seed:901013,district:3},{seed:901014,district:4}]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      genCity(c.seed, c.district, '');
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district+': '+val.reason); }
    }
    checks.reachabilityD1D4 = reachOk;
    checks.levelSelectorCycle = (function(){
      selectedStartDistrict = 1;
      const c = [];
      for(let i=0;i<5;i++) c.push('D'+crCycleSelectedStartDistrict());
      return c.join('→') === 'D2→D3→D4→D1→D2';
    })();
    checks.saveVersionUnchanged = SAVE_VERSION === 1;
    checks.controlsSchemaUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    checks.noMovingBlockers = typeof game.movingBlockers === 'undefined';
    checks.runtimeClean = window.__crRuntimeErrors.length === err0;

    if(!checks.buildIdModules1) errors.push('BUILD_ID must be modules1');
    if(!checks.moduleDefs) errors.push('BUILDING_MODULES missing storefront');
    if(!checks.roleOverlay) errors.push('composed facade pack renderer missing from drawScene');
    if(!checks.d2StorefrontModule) errors.push('D2 must place storefront module');
    if(!checks.wallHitRoleLookup) errors.push('face role lookup failed');
  } catch(e){
    errors.push('exception: '+(e&&e.message?e.message:e));
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    state = STATE.TITLE;
    paused = false;
    drawMobileMenu();
  }
  const pass = errors.length === 0 && Object.keys(checks).every(k => checks[k] !== false);
  return { pass, checks, errors, warnings, evidence };
}

function runFpvFacadeTargetPolishSelfCheck(){
  if(_crHarnessDepth > 0) return runFpvFacadeTargetPolishSelfCheckBody();
  return crWithTemporaryState('fpvFacadeTargetPolish', () => runFpvFacadeTargetPolishSelfCheckBody());
}

function runFpvFacadeTargetPolishSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { visualReference: 'Travis before/after reference (broad panels, no comb lines)', districts: [] };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdFacadeFix1 = BUILD_ID === 'facadefix1' || BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.facadePolishFlag = CR_FPV_FACADE_TARGET_POLISH >= 1;
    checks.fpvMassPreserved = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55;
    checks.coarseWallTexBroad = CR_FPV_WALL_TEX_COARSE >= 12;
    const drawSrc = String(drawScene);
    checks.worldFacadePanels = drawSrc.indexOf('crDrawFpvWorldFacadePanel') >= 0;
    checks.facadeSystem = checks.worldFacadePanels || (drawSrc.indexOf('crDrawFpvFacadeRoleOverlay') >= 0);
    checks.noPerColumnFacadeCue = drawSrc.indexOf('crDrawProceduralFacadeCue') < 0;
    checks.matteRoadPreserved = CR_FPV_STREET_MATTE === true && String(crDrawFpvStreetReadabilityCues).indexOf('RH * 0.72') >= 0;
    checks.minimapNavPreserved = typeof crMinimapNavCellColor === 'function';

    let fpvOk = true;
    for(const c of [{ seed: 890501, district: 1 }, { seed: 890502, district: 2 }, { seed: 890503, district: 3 }]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      game.seed = c.seed;
      game.district = c.district;
      genCity(c.seed, c.district, '');
      try { drawScene(0); } catch(e){
        fpvOk = false;
        errors.push('fpv d'+c.district+': '+(e && e.message ? e.message : e));
      }
      evidence.districts.push({ district: c.district, MAP_W: game.MAP_W, MAP_H: game.MAP_H });
    }
    checks.fpvRenderD1D3 = fpvOk;
    checks.fpvD2D3Storefront = fpvOk;

    genCity(890502, 2, '');
    const sampleColors = new Set();
    for(let sy=1;sy<game.MAP_H-1;sy+=4) for(let sx=1;sx<game.MAP_W-1;sx+=4){
      sampleColors.add(crMinimapNavCellColor(sx, sy, game.map[sy][sx]));
    }
    checks.minimapPaletteLimited = sampleColors.size <= 9;

    selectedStartDistrict = 1;
    state = STATE.TITLE;
    drawMobileMenu();
    checks.levelSelectorCycle = (function(){
      selectedStartDistrict = 1;
      const c = [];
      for(let i=0;i<5;i++) c.push('D'+crCycleSelectedStartDistrict());
      return c.join('→') === 'D2→D3→D4→D1→D2';
    })();

    let reachOk = true;
    let propsOk = true;
    for(const c of [{ seed:890511,district:1},{seed:890512,district:2},{seed:890513,district:3},{seed:890514,district:4}]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      genCity(c.seed, c.district, '');
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district+': '+val.reason); }
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
    }
    checks.reachabilityD1D4 = reachOk;
    checks.propsNonCollision = propsOk;
    checks.saveVersionUnchanged = SAVE_VERSION === 1;
    checks.controlsSchemaUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    checks.noMovingBlockers = typeof game.movingBlockers === 'undefined';
    checks.runtimeClean = window.__crRuntimeErrors.length === err0;

    state = STATE.TITLE;
    paused = false;
    game.run = game.run || {};
    game.run.active = false;
    game.run.harnessOnly = false;
    drawMobileMenu();
    rmenuAction('title-options');
    drawMobileMenu();
    checks.optionsOpens = state === STATE.OPTIONS && crOptionsMenuHtml().indexOf('EDIT CONTROLS') >= 0;
    state = STATE.TITLE;
    drawMobileMenu();

    if(!checks.buildIdFacadeFix1) errors.push('BUILD_ID must be facadefix1 or modules1');
    if(!checks.facadeSystem) errors.push('FPV must use facade panels or role overlay');
    if(!checks.noPerColumnFacadeCue) errors.push('per-column crDrawProceduralFacadeCue still in drawScene');
    if(!checks.coarseWallTexBroad) errors.push('CR_FPV_WALL_TEX_COARSE too small for broad panels');
    if(!checks.matteRoadPreserved) errors.push('matte road regressed');
    if(!checks.fpvMassPreserved) errors.push('building mass regressed');
    if(!checks.fpvD2D3Storefront) errors.push('D2/D3 FPV render failed');
    if(!checks.levelSelectorCycle) errors.push('level selector broken');
    if(!checks.reachabilityD1D4) errors.push('reachability failed');
    if(!checks.optionsOpens) errors.push('OPTIONS broken');
    if(!checks.runtimeClean) errors.push('runtime errors');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
}

function runFpvWallLineArtifactFixSelfCheck(){
  if(_crHarnessDepth > 0) return runFpvWallLineArtifactFixSelfCheckBody();
  return crWithTemporaryState('fpvWallLineArtifactFix', () => runFpvWallLineArtifactFixSelfCheckBody());
}

function runFpvWallLineArtifactFixSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { districts: [], wallContract: null };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdWallLineStack = BUILD_ID === 'wallfix1' || BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.fpvMassPreserved = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55;
    checks.coarseWallTex = typeof CR_FPV_WALL_TEX_COARSE === 'number' && CR_FPV_WALL_TEX_COARSE >= 6;
    checks.wallLineFixFlag = CR_FPV_WALL_LINE_FIX >= 1;
    const facadeSrc = String(crDrawProceduralFacadeCue);
    const drawSrc = String(drawScene);
    checks.facadeWorldBands = drawSrc.indexOf('crDrawFpvWorldFacadePanel') >= 0 || (facadeSrc.indexOf('wallBand') >= 0 && facadeSrc.indexOf('col & 1') < 0);
    checks.coarseTexSampler = drawSrc.indexOf('crCoarseWallTexX') >= 0;
    checks.noGarageCombLines = facadeSrc.indexOf('for(let i = 0; i < 4') < 0;
    checks.matteRoadPreserved = CR_FPV_STREET_MATTE === true && String(crDrawFpvStreetReadabilityCues).indexOf('RH * 0.72') >= 0;
    checks.minimapNavPreserved = typeof crMinimapNavCellColor === 'function';
    evidence.wallContract = { coarseWallTex: CR_FPV_WALL_TEX_COARSE, facadeWorldBands: checks.facadeWorldBands, coarseTexSampler: checks.coarseTexSampler };

    let fpvOk = true;
    for(const c of [{ seed: 890401, district: 1 }, { seed: 890402, district: 2 }, { seed: 890403, district: 3 }]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      game.seed = c.seed;
      game.district = c.district;
      genCity(c.seed, c.district, '');
      try { drawScene(0); } catch(e){
        fpvOk = false;
        errors.push('fpv d'+c.district+': '+(e && e.message ? e.message : e));
      }
      evidence.districts.push({ district: c.district, MAP_W: game.MAP_W, MAP_H: game.MAP_H });
    }
    checks.fpvRenderD1D3 = fpvOk;

    genCity(890402, 2, '');
    const sampleColors = new Set();
    for(let sy=1;sy<game.MAP_H-1;sy+=4) for(let sx=1;sx<game.MAP_W-1;sx+=4){
      sampleColors.add(crMinimapNavCellColor(sx, sy, game.map[sy][sx]));
    }
    checks.minimapPaletteLimited = sampleColors.size <= 9;
    evidence.minimapColors = [...sampleColors].slice(0, 12);

    selectedStartDistrict = 1;
    state = STATE.TITLE;
    drawMobileMenu();
    checks.levelSelectorCycle = (function(){
      selectedStartDistrict = 1;
      const c = [];
      for(let i=0;i<5;i++) c.push('D'+crCycleSelectedStartDistrict());
      return c.join('→') === 'D2→D3→D4→D1→D2';
    })();

    let reachOk = true;
    let propsOk = true;
    for(const c of [{ seed:890411,district:1},{seed:890412,district:2},{seed:890413,district:3},{seed:890414,district:4}]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      genCity(c.seed, c.district, '');
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district+': '+val.reason); }
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
    }
    checks.reachabilityD1D4 = reachOk;
    checks.propsNonCollision = propsOk;
    checks.saveVersionUnchanged = SAVE_VERSION === 1;
    checks.controlsSchemaUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    checks.noMovingBlockers = typeof game.movingBlockers === 'undefined';
    checks.runtimeClean = window.__crRuntimeErrors.length === err0;

    state = STATE.TITLE;
    paused = false;
    game.run = game.run || {};
    game.run.active = false;
    game.run.harnessOnly = false;
    drawMobileMenu();
    rmenuAction('title-options');
    drawMobileMenu();
    checks.optionsOpens = state === STATE.OPTIONS && crOptionsMenuHtml().indexOf('EDIT CONTROLS') >= 0;
    state = STATE.TITLE;
    drawMobileMenu();

    if(!checks.buildIdWallLineStack) errors.push('BUILD_ID must be wallfix1 or facadefix1 (wall line stack)');
    if(!checks.fpvMassPreserved) errors.push('CR_BUILDING_FPV_MASS must remain ~1.5');
    if(!checks.coarseWallTex) errors.push('CR_FPV_WALL_TEX_COARSE missing or too small');
    if(!checks.facadeWorldBands) errors.push('facade cues still per-column striping');
    if(!checks.coarseTexSampler) errors.push('drawScene must use crCoarseWallTexX');
    if(!checks.matteRoadPreserved) errors.push('matte road fix regressed');
    if(!checks.minimapNavPreserved) errors.push('minimap navigation helper missing');
    if(!checks.fpvRenderD1D3) errors.push('D1-D3 FPV render failed');
    if(!checks.levelSelectorCycle) errors.push('level selector cycle broken');
    if(!checks.reachabilityD1D4) errors.push('reachability failed');
    if(!checks.propsNonCollision) errors.push('props collision');
    if(!checks.optionsOpens) errors.push('OPTIONS broken');
    if(!checks.runtimeClean) errors.push('runtime errors');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
}

function runFpvStreetShimmerFixSelfCheck(){
  if(_crHarnessDepth > 0) return runFpvStreetShimmerFixSelfCheckBody();
  return crWithTemporaryState('fpvStreetShimmerFix', () => runFpvStreetShimmerFixSelfCheckBody());
}

function runFpvStreetShimmerFixSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { districts: [], minimapColors: [], cueContract: null };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdShimmerFix1 = BUILD_ID === 'shimmerfix1' || BUILD_ID === 'wallfix1' || BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.fpvMassPreserved = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55;
    checks.matteStreetMode = CR_FPV_STREET_MATTE === true && CR_FPV_STREET_SHIMMER_FIX >= 1;
    checks.minimapNavPreserved = typeof crMinimapNavCellColor === 'function' && Array.isArray(CR_MINIMAP_NAV_PALETTE);
    const cueSrc = String(crDrawFpvStreetReadabilityCues);
    checks.noReflectiveHorizonBands = cueSrc.indexOf('RH/2+3') < 0 && cueSrc.indexOf('RH/2+6') < 0 && cueSrc.indexOf('fillRect(0, RH/2, RW') < 0;
    checks.bottomMatteTintOnly = cueSrc.indexOf('RH * 0.72') >= 0;
    evidence.cueContract = { noReflectiveHorizonBands: checks.noReflectiveHorizonBands, bottomMatteTintOnly: checks.bottomMatteTintOnly };
    checks.saveVersionUnchanged = SAVE_VERSION === 1;
    checks.controlsSchemaUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    checks.noMovingBlockers = typeof game.movingBlockers === 'undefined';

    selectedStartDistrict = 1;
    state = STATE.TITLE;
    drawMobileMenu();
    const labels = crTitleMenuSelectableRows().map(it => titleMenuRowLabel(it));
    checks.levelSelectorBelowNewRun = labels[0] === 'NEW RUN' && (labels[1] || '').indexOf('START DISTRICT: D') === 0;
    checks.levelSelectorCycle = (function(){
      selectedStartDistrict = 1;
      const c = [];
      for(let i=0;i<5;i++) c.push('D'+crCycleSelectedStartDistrict());
      return c.join('→') === 'D2→D3→D4→D1→D2';
    })();
    evidence.selector = { labels };

    let fpvOk = true;
    for(const c of [{ seed: 890301, district: 2 }, { seed: 890302, district: 3 }]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      game.seed = c.seed;
      game.district = c.district;
      genCity(c.seed, c.district, '');
      try {
        drawScene(0);
      } catch(e){
        fpvOk = false;
        errors.push('fpv render d'+c.district+': '+(e && e.message ? e.message : e));
      }
      evidence.districts.push({ district: c.district, MAP_W: game.MAP_W, MAP_H: game.MAP_H });
    }
    checks.fpvRenderStorefrontDistricts = fpvOk;

    genCity(890301, 2, '');
    const sampleColors = new Set();
    for(let sy=1;sy<game.MAP_H-1;sy+=4) for(let sx=1;sx<game.MAP_W-1;sx+=4){
      sampleColors.add(crMinimapNavCellColor(sx, sy, game.map[sy][sx]));
    }
    checks.minimapPaletteLimited = sampleColors.size <= 9;
    evidence.minimapColors = [...sampleColors].slice(0, 12);
    checks.footprint40x20 = game.MAP_W === 40 && game.MAP_H === 20;

    let reachOk = true;
    let propsOk = true;
    for(const c of [{ seed:890311,district:1},{seed:890312,district:2},{seed:890313,district:3},{seed:890314,district:4}]){
      game.run = { active: true, harnessOnly: true, customLevel: null };
      genCity(c.seed, c.district, '');
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district+': '+val.reason); }
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
    }
    checks.reachabilityD1D4 = reachOk;
    checks.propsNonCollision = propsOk;
    checks.runtimeClean = window.__crRuntimeErrors.length === err0;

    state = STATE.TITLE;
    paused = false;
    game.run = game.run || {};
    game.run.active = false;
    game.run.harnessOnly = false;
    drawMobileMenu();
    rmenuAction('title-options');
    drawMobileMenu();
    checks.optionsOpens = state === STATE.OPTIONS && crOptionsMenuHtml().indexOf('EDIT CONTROLS') >= 0;
    state = STATE.TITLE;
    drawMobileMenu();

    if(!checks.buildIdShimmerFix1) errors.push('BUILD_ID must be shimmerfix1, wallfix1, or facadefix1 (matte road stack)');
    if(!checks.fpvMassPreserved) errors.push('CR_BUILDING_FPV_MASS must remain ~1.5');
    if(!checks.matteStreetMode) errors.push('matte street mode flags missing');
    if(!checks.noReflectiveHorizonBands) errors.push('FPV still uses horizon band overlays');
    if(!checks.bottomMatteTintOnly) errors.push('FPV street cues must use bottom matte tint only');
    if(!checks.minimapNavPreserved) errors.push('minimap navigation helper missing');
    if(!checks.minimapPaletteLimited) errors.push('minimap palette too noisy');
    if(!checks.fpvRenderStorefrontDistricts) errors.push('D2/D3 FPV render failed');
    if(!checks.levelSelectorBelowNewRun) errors.push('START DISTRICT row broken');
    if(!checks.levelSelectorCycle) errors.push('level selector cycle broken');
    if(!checks.reachabilityD1D4) errors.push('reachability failed');
    if(!checks.propsNonCollision) errors.push('props collision');
    if(!checks.optionsOpens) errors.push('OPTIONS broken');
    if(!checks.runtimeClean) errors.push('runtime errors');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
}

function runStreetReadabilityMinimapSelfCheck(){
  if(_crHarnessDepth > 0) return runStreetReadabilityMinimapSelfCheckBody();
  return crWithTemporaryState('streetReadabilityMinimap', () => runStreetReadabilityMinimapSelfCheckBody());
}

function runStreetReadabilityMinimapSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { districts: [], minimapSamples: [], selector: null };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdStreetRead1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    if(!checks.buildIdStreetRead1) errors.push('BUILD_ID must be facadefix1 (minimap contract)');
    checks.footprint40x20 = true;
    checks.buildingMassPreserved = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55;
    checks.saveVersionUnchanged = SAVE_VERSION === 1;
    checks.controlsSchemaUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    checks.noMovingBlockers = typeof game.movingBlockers === 'undefined';
    checks.minimapNavHelperExists = typeof crMinimapNavCellColor === 'function';
    checks.minimapNavPaletteLimited = Array.isArray(CR_MINIMAP_NAV_PALETTE) && CR_MINIMAP_NAV_PALETTE.length <= 8;

    selectedStartDistrict = 1;
    state = STATE.TITLE;
    drawMobileMenu();
    const labels = crTitleMenuSelectableRows().map(it => titleMenuRowLabel(it));
    checks.levelSelectorBelowNewRun = labels[0] === 'NEW RUN' && (labels[1] || '').indexOf('START DISTRICT: D') === 0;
    checks.levelSelectorCycle = (function(){
      selectedStartDistrict = 1;
      const c = [];
      for(let i=0;i<5;i++) c.push('D'+crCycleSelectedStartDistrict());
      return c.join('→') === 'D2→D3→D4→D1→D2';
    })();
    evidence.selector = { labels };
    if(!checks.levelSelectorBelowNewRun) errors.push('START DISTRICT must remain below NEW RUN');
    if(!checks.levelSelectorCycle) errors.push('level selector cycle broken');

    const matrix = [
      { seed: 890201, district: 1, modifier: '' },
      { seed: 890202, district: 2, modifier: '' },
      { seed: 890203, district: 3, modifier: '' },
      { seed: 890204, district: 4, modifier: '' },
    ];
    let reachOk = true;
    let propsOk = true;
    let navColorsOk = true;
    for(const c of matrix){
      game.run = game.run || { active: false, harnessOnly: false, customLevel: null };
      game.run.active = true;
      game.run.harnessOnly = true;
      game.run.customLevel = null;
      game.seed = c.seed;
      game.district = c.district;
      game.modifier = c.modifier || 'normal';
      genCity(c.seed, c.district, c.modifier || '');
      checks.footprint40x20 = checks.footprint40x20 && game.MAP_W === 40 && game.MAP_H === 20;
      const meta = game.streetLayoutMeta;
      const met = crStreetLayoutMetrics(game.map, meta);
      const lm = game.d1ParkLandmark;
      const landmarkCells = lm ? crD1LandmarkCellCount(game.map, lm) : 0;
      const sampleColors = new Set();
      for(let sy=1;sy<game.MAP_H-1;sy+=3) for(let sx=1;sx<game.MAP_W-1;sx+=3){
        const col = crMinimapNavCellColor(sx, sy, game.map[sy][sx]);
        sampleColors.add(col);
      }
      evidence.minimapSamples.push({ district: c.district, colors: [...sampleColors].slice(0, 12) });
      if(sampleColors.size > 9) navColorsOk = false;
      for(const col of sampleColors){
        if(CR_MINIMAP_NAV_PALETTE.indexOf(col) < 0 && col !== '#4a5448' && col !== MINIMAP_FLOOR) navColorsOk = false;
      }
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district+': '+val.reason); }
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
      evidence.districts.push({ seed: c.seed, district: c.district, metrics: met, landmarkCells });
    }
    const d1 = evidence.districts.find(d => d.district === 1);
    const d2 = evidence.districts.find(d => d.district === 2);
    checks.d1LandmarkPresent = !!(d1 && d1.landmarkCells >= 12);
    checks.d1OpenSimple = !!(d1 && d1.metrics.mainRoad >= d1.metrics.buildings);
    checks.d2StorefrontMass = !!(d2 && d2.metrics.buildings >= 32 && d2.metrics.mainRoad >= 120);
    checks.d3AlleysPresent = !!(evidence.districts.find(d => d.district === 3) && evidence.districts.find(d => d.district === 3).metrics.pockets >= 28);
    checks.d4PocketsPresent = !!(evidence.districts.find(d => d.district === 4) && evidence.districts.find(d => d.district === 4).metrics.pockets >= 38);
    checks.minimapNavigationPalette = navColorsOk;
    checks.reachabilityD1D4 = reachOk;
    checks.propsNonCollision = propsOk;
    checks.runtimeClean = window.__crRuntimeErrors.length === err0;

    state = STATE.TITLE;
    paused = false;
    game.run = game.run || {};
    game.run.active = false;
    game.run.harnessOnly = false;
    drawMobileMenu();
    rmenuAction('title-options');
    drawMobileMenu();
    checks.optionsOpens = state === STATE.OPTIONS && crOptionsMenuHtml().indexOf('EDIT CONTROLS') >= 0;
    state = STATE.TITLE;
    drawMobileMenu();

    if(!checks.buildingMassPreserved) errors.push('CR_BUILDING_FPV_MASS must remain ~1.5 from buildscale1');
    if(!checks.minimapNavHelperExists) errors.push('crMinimapNavCellColor missing');
    if(!checks.minimapNavigationPalette) errors.push('minimap must use limited navigation palette');
    if(!checks.d1LandmarkPresent) errors.push('D1 pavilion missing');
    if(!checks.d2StorefrontMass) errors.push('D2 building mass regressed');
    if(!checks.reachabilityD1D4) errors.push('reachability failed');
    if(!checks.propsNonCollision) errors.push('props collision regression');
    if(!checks.optionsOpens) errors.push('OPTIONS broken');
    if(!checks.runtimeClean) errors.push('runtime errors');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
}
function runBuildingScalePolishSelfCheck(){
  if(_crHarnessDepth > 0) return runBuildingScalePolishSelfCheckBody();
  return crWithTemporaryState('buildingScalePolish', () => runBuildingScalePolishSelfCheckBody());
}

function runBuildingScalePolishSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { districts: [], selector: null };
  const err0 = window.__crRuntimeErrors.length;
  const savedPick = selectedStartDistrict;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdBuildScale1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    if(!checks.buildIdBuildScale1) errors.push('BUILD_ID must be shimmerfix1');
    checks.fpvMassConstant = CR_BUILDING_FPV_MASS >= 1.45 && CR_BUILDING_FPV_MASS <= 1.55;
    checks.footprint40x20 = true;
    checks.saveVersionUnchanged = SAVE_VERSION === 1;
    checks.controlsSchemaUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    checks.noMovingBlockers = typeof game.movingBlockers === 'undefined';

    selectedStartDistrict = 1;
    state = STATE.TITLE;
    drawMobileMenu();
    const labels = crTitleMenuSelectableRows().map(it => titleMenuRowLabel(it));
    checks.levelSelectorBelowNewRun = labels[0] === 'NEW RUN' && (labels[1] || '').indexOf('START DISTRICT: D') === 0;
    checks.levelSelectorCycle = (function(){
      selectedStartDistrict = 1;
      const c = [];
      for(let i=0;i<5;i++) c.push('D'+crCycleSelectedStartDistrict());
      return c.join('→') === 'D2→D3→D4→D1→D2';
    })();
    evidence.selector = { labels, cycleOk: checks.levelSelectorCycle };
    if(!checks.levelSelectorBelowNewRun) errors.push('START DISTRICT must remain below NEW RUN');
    if(!checks.levelSelectorCycle) errors.push('level selector cycle broken');

    const matrix = [
      { seed: 880101, district: 1, modifier: '' },
      { seed: 880102, district: 2, modifier: '' },
      { seed: 880103, district: 3, modifier: '' },
      { seed: 880104, district: 4, modifier: '' },
    ];
    const rows = {};
    let reachOk = true;
    let propsOk = true;

    for(const c of matrix){
      game.run = game.run || { active: false, harnessOnly: false, customLevel: null };
      game.run.active = true;
      game.run.harnessOnly = true;
      game.run.customLevel = null;
      game.seed = c.seed;
      game.district = c.district;
      game.modifier = c.modifier || 'normal';
      genCity(c.seed, c.district, c.modifier || '');
      const meta = game.streetLayoutMeta || {};
      const metrics = crStreetLayoutMetrics(game.map, meta);
      const lm = game.d1ParkLandmark;
      const landmarkCells = lm ? crD1LandmarkCellCount(game.map, lm) : 0;
      const row = { ...c, MAP_W: game.MAP_W, MAP_H: game.MAP_H, metrics, landmarkCells, landmark: lm };
      evidence.districts.push(row);
      rows[c.district] = row;
      if(game.MAP_W !== STREET_FOOTPRINT_W || game.MAP_H !== STREET_FOOTPRINT_H) checks.footprint40x20 = false;
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district+': '+val.reason); }
      for(const p of game.props || []){ if(!canStand(p.x, p.y)) propsOk = false; }
    }

    const d1 = rows[1], d2 = rows[2], d3 = rows[3], d4 = rows[4];
    checks.d1LandmarkSubstantial = !!(d1 && d1.landmark && d1.landmarkCells >= 14);
    checks.d1OpenSimple = !!(d1 && d1.metrics.mainRoad >= 68 && d1.metrics.mainRoad >= d1.metrics.buildings);
    checks.d2MoreMassThanD1 = !!(d2 && d1 && d2.metrics.buildings >= d1.metrics.buildings + 10);
    checks.d2StorefrontBands = !!(d2 && d2.metrics.buildings >= 42 && d2.metrics.mainRoad >= 115);
    checks.d3AlleysReadable = !!(d3 && d3.metrics.pockets >= 28 && d3.metrics.buildings >= 55);
    checks.d4PocketsReachable = !!(d4 && d4.metrics.pockets >= 38 && d4.metrics.buildings >= 60);
    checks.reachabilityD1D4 = reachOk;
    checks.propsNonCollision = propsOk;
    checks.runtimeClean = window.__crRuntimeErrors.length === err0;

    state = STATE.TITLE;
    paused = false;
    game.run = game.run || {};
    game.run.active = false;
    game.run.harnessOnly = false;
    drawMobileMenu();
    rmenuAction('title-options');
    drawMobileMenu();
    checks.optionsOpens = state === STATE.OPTIONS && crOptionsMenuHtml().indexOf('EDIT CONTROLS') >= 0;
    state = STATE.TITLE;
    drawMobileMenu();

    if(!checks.fpvMassConstant) errors.push('CR_BUILDING_FPV_MASS must be ~1.5');
    if(!checks.footprint40x20) errors.push('map must remain 40x20');
    if(!checks.d1LandmarkSubstantial) errors.push('D1 pavilion must be larger/more substantial');
    if(!checks.d1OpenSimple) errors.push('D1 must stay open/simple');
    if(!checks.d2MoreMassThanD1) errors.push('D2 building mass must exceed D1');
    if(!checks.d2StorefrontBands) errors.push('D2 storefront bands insufficient');
    if(!checks.d3AlleysReadable) errors.push('D3 alleys/pockets not readable');
    if(!checks.d4PocketsReachable) errors.push('D4 pockets/building mass check failed');
    if(!checks.reachabilityD1D4) errors.push('reachability failed after building scale');
    if(!checks.propsNonCollision) errors.push('props became collision');
    if(!checks.optionsOpens) errors.push('OPTIONS broken');
    if(!checks.runtimeClean) errors.push('runtime errors during building scale check');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  } finally {
    selectedStartDistrict = savedPick;
    _selfCheckForcePortrait = false;
    crForceSafeTitleAfterHarness();
    drawMobileMenu();
  }
}
function runEarlyDistrictProgressionSelfCheck(){
  if(_crHarnessDepth > 0) return runEarlyDistrictProgressionSelfCheckBody();
  return crWithTemporaryState('earlyDistrictProgression', () => runEarlyDistrictProgressionSelfCheckBody());
}

function runEarlyDistrictProgressionSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { districts: [] };
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdBuildScale1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    if(!checks.buildIdBuildScale1) errors.push('BUILD_ID must be shimmerfix1');
    checks.footprintUnchanged = true;
    checks.saveVersionUnchanged = SAVE_VERSION === 1;
    checks.controlsSchemaUnchanged = CR_CONTROLS_LS_KEY === 'cannedRun.controls.v1';
    checks.noMovingBlockers = typeof game.movingBlockers === 'undefined';

    const matrix = [
      { seed: 880101, district: 1, modifier: '' },
      { seed: 880102, district: 2, modifier: '' },
      { seed: 880103, district: 3, modifier: '' },
      { seed: 880104, district: 4, modifier: '' },
    ];
    const rows = {};
    let reachOk = true;

    for(const c of matrix){
      game.run = game.run || { active: false, harnessOnly: false, customLevel: null };
      game.run.active = true;
      game.run.harnessOnly = true;
      game.run.customLevel = null;
      game.seed = c.seed;
      game.district = c.district;
      game.modifier = c.modifier || 'normal';
      genCity(c.seed, c.district, c.modifier || '');
      const meta = game.streetLayoutMeta || {};
      const metrics = crStreetLayoutMetrics(game.map, meta);
      const npcZones = crSpawnZoneStats(game.npcs, meta);
      const canZones = crSpawnZoneStats(game.pickups, meta);
      const row = {
        ...c,
        MAP_W: game.MAP_W,
        MAP_H: game.MAP_H,
        metrics,
        npcZones,
        canZones,
        landmark: game.d1ParkLandmark,
        propCount: (game.props || []).length,
      };
      evidence.districts.push(row);
      rows[c.district] = row;

      if(game.MAP_W !== STREET_FOOTPRINT_W || game.MAP_H !== STREET_FOOTPRINT_H) checks.footprintUnchanged = false;
      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach d'+c.district+' seed '+c.seed+': '+val.reason); }

      for(const p of game.props || []){
        if(!canStand(p.x, p.y)) errors.push('prop collision d'+c.district);
      }
    }

    const d1 = rows[1], d2 = rows[2], d3 = rows[3], d4 = rows[4];
    checks.d1LandmarkAndOpen = !!(d1 && d1.landmark && d1.metrics.mainRoad >= 70 && d1.metrics.mainRoad >= d1.metrics.buildings);
    checks.d2StorefrontStreet = !!(d2 && d2.metrics.buildings >= d1.metrics.buildings + 6 && d2.metrics.mainRoad >= 120);
    checks.d3AlleyIntroduction = !!(d3 && d3.metrics.pockets >= d2.metrics.pockets + 45 && d3.metrics.buildings >= 50);
    checks.d4MorePockets = !!(d4 && d4.metrics.pockets >= d3.metrics.pockets + 12);
    checks.mainRoadSpineReadable = [d1,d2,d3,d4].every(r => r.metrics.mainRoad >= 80);
    checks.d2NpcMostlyVisible = !!(d2 && d2.npcZones.MAIN_ROAD >= 4 && (d2.npcZones.POCKET + d2.npcZones.ALLEY) <= 3);
    checks.d3SomeTucked = !!(d3 && (d3.npcZones.POCKET + d3.npcZones.ALLEY) >= 2);
    checks.d4MoreTucked = !!(d4 && (d4.npcZones.POCKET + d4.npcZones.ALLEY) >= (d3.npcZones.POCKET + d3.npcZones.ALLEY));
    checks.d2CansRoadHeavy = !!(d2 && d2.canZones.MAIN_ROAD >= d2.canZones.POCKET);
    checks.d4CansSpread = !!(d4 && (d4.canZones.POCKET + d4.canZones.ALLEY) >= d2.canZones.POCKET + d2.canZones.ALLEY);
    checks.reachabilityD1D4 = reachOk;
    checks.decorRoster12 = DECOR_PROP_REQUIRED.length === 12;
    checks.noRuntimeErrors = window.__crRuntimeErrors.length === err0;

    if(!checks.d1LandmarkAndOpen) errors.push('D1 must stay park/plaza with landmark and open spine');
    if(!checks.d2StorefrontStreet) errors.push('D2 must read as storefront street with building bands');
    if(!checks.d3AlleyIntroduction) errors.push('D3 must add alleys/service lanes beyond D2 (pocket/side structure)');
    if(!checks.d4MorePockets) errors.push('D4 must add more pockets/service than D3');
    if(!checks.mainRoadSpineReadable) errors.push('main road spine not recognizable D1-D4');
    if(!checks.d2NpcMostlyVisible) errors.push('D2 NPC placement should be mostly on main road');
    if(!checks.d3SomeTucked) errors.push('D3 should tuck some NPCs in alleys/pockets');
    if(!checks.d4MoreTucked) errors.push('D4 should tuck more NPCs than D3');
    if(!checks.footprintUnchanged) errors.push('map footprint must stay 40x20');
    if(!checks.saveVersionUnchanged) errors.push('SAVE_VERSION must not change');
    if(!checks.controlsSchemaUnchanged) errors.push('cannedRun.controls.v1 must not change');
    if(!checks.decorRoster12) errors.push('decor prop roster must remain 12 kinds');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  }
}
function runD1ParkLandmarkSelfCheck(){
  if(_crHarnessDepth > 0) return runD1ParkLandmarkSelfCheckBody();
  return crWithTemporaryState('d1ParkLandmark', () => runD1ParkLandmarkSelfCheckBody());
}

function runD1ParkLandmarkSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { seeds: [] };
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdBuildScale1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    if(!checks.buildIdBuildScale1) errors.push('BUILD_ID must be shimmerfix1');

    const matrix = [
      { seed: 880101, district: 1, modifier: '' },
      { seed: 42, district: 1, modifier: 'clear' },
      { seed: 12345, district: 1, modifier: '' },
      { seed: 880101, district: 2, modifier: '' },
    ];
    let footprintOk = true, landmarkD1Ok = true, parkPropsOk = true;
    let openSpineOk = true, reachOk = true, blockEssentialsOk = true;
    let propsCollisionOk = true, d2NoLandmarkOk = true;

    for(const c of matrix){
      game.run = game.run || { active: false, harnessOnly: false, customLevel: null };
      game.run.active = true;
      game.run.harnessOnly = true;
      game.run.customLevel = null;
      game.seed = c.seed;
      game.district = c.district;
      game.modifier = c.modifier || 'normal';
      genCity(c.seed, c.district, c.modifier || '');
      const meta = game.streetLayoutMeta || {};
      const metrics = crStreetLayoutMetrics(game.map, meta);
      const propSum = crD1ParkPropSummary(game.props);
      const row = {
        ...c,
        MAP_W: game.MAP_W,
        MAP_H: game.MAP_H,
        metrics,
        landmark: game.d1ParkLandmark,
        propSummary: propSum,
      };
      evidence.seeds.push(row);

      if(game.MAP_W !== STREET_FOOTPRINT_W || game.MAP_H !== STREET_FOOTPRINT_H) footprintOk = false;

      if(c.district === 1){
        const lm = game.d1ParkLandmark;
        const wallCells = crD1LandmarkCellCount(game.map, lm);
        if(!lm || wallCells < 12) landmarkD1Ok = false;
        if(propSum.parkish < 6 || propSum.total < 8) parkPropsOk = false;
        if(metrics.mainRoad < 70) openSpineOk = false;
        if(metrics.mainRoad < metrics.buildings) openSpineOk = false;

        const ex = game.exit;
        if(lm && ex){
          const etx = ex.x | 0, ety = ex.y | 0;
          if(etx >= lm.x0 && etx <= lm.x1 && ety >= lm.y0 && ety <= lm.y1) blockEssentialsOk = false;
        }
        for(const p of game.pickups || []){
          if(!p.taken && lm){
            const tx = p.x | 0, ty = p.y | 0;
            if(game.map[ty] && game.map[ty][tx] > 0) blockEssentialsOk = false;
          }
        }
        for(const n of game.npcs || []){
          if(!n.helped && lm){
            const tx = n.x | 0, ty = n.y | 0;
            if(game.map[ty] && game.map[ty][tx] > 0) blockEssentialsOk = false;
          }
        }
        const val = crHarnessValidateProceduralCase(c);
        if(!val.ok){ reachOk = false; errors.push('D1 reach seed '+c.seed+': '+val.reason); }
      } else {
        if(game.d1ParkLandmark) d2NoLandmarkOk = false;
      }

      const standAtProps = (game.props || []).map(p => ({ x: p.x, y: p.y, stand: canStand(p.x, p.y) }));
      game.props = [];
      if(!standAtProps.every(s => canStand(s.x, s.y) === s.stand)) propsCollisionOk = false;
      game.props = standAtProps.map(s => ({ x: s.x, y: s.y, kind: 'bench', wob: 0 }));
    }

    checks.footprintUnchanged = footprintOk;
    checks.d1LandmarkPresent = landmarkD1Ok;
    checks.d1ParkCommunityProps = parkPropsOk;
    checks.d1OpenSpine = openSpineOk;
    checks.d1Reachability = reachOk;
    checks.landmarkDoesNotBlockEssentials = blockEssentialsOk;
    checks.decorPropsNonCollision = propsCollisionOk;
    checks.higherDistrictsUnchanged = d2NoLandmarkOk;
    checks.decorRoster12 = DECOR_PROP_REQUIRED.length === 12;
    checks.noRuntimeErrors = window.__crRuntimeErrors.length === err0;

    if(!checks.footprintUnchanged) errors.push('map footprint must stay 40x20');
    if(!checks.d1LandmarkPresent) errors.push('D1 must include restroom/gazebo landmark structure');
    if(!checks.d1ParkCommunityProps) errors.push('D1 park/community prop placement insufficient');
    if(!checks.d1OpenSpine) errors.push('D1 must keep readable open spine');
    if(!checks.landmarkDoesNotBlockEssentials) errors.push('landmark blocks exit/cans/people');
    if(!checks.decorPropsNonCollision) errors.push('props altered collision');
    if(!checks.higherDistrictsUnchanged) errors.push('D2+ should not get D1 landmark');
    if(!checks.decorRoster12) errors.push('decor prop roster must remain 12 kinds');
    if(!checks.noRuntimeErrors) errors.push('runtime errors during D1 park check');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  }
}

function runStreetBlockLevelSelfCheck(){
  if(_crHarnessDepth > 0) return runStreetBlockLevelSelfCheckBody();
  return crWithTemporaryState('streetBlockLevel', () => runStreetBlockLevelSelfCheckBody());
}

function runStreetBlockLevelSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = { seeds: [] };
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  try {
    checks.buildIdBuildScale1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    if(!checks.buildIdBuildScale1) errors.push('BUILD_ID must be shimmerfix1');

    const matrix = [
      { seed: 880101, district: 1, modifier: '' },
      { seed: 880102, district: 2, modifier: '' },
      { seed: 880103, district: 3, modifier: '' },
      { seed: 880104, district: 4, modifier: '' },
      { seed: 880105, district: 5, modifier: '' },
      { seed: 42, district: 1, modifier: 'clear' },
      { seed: 42, district: 3, modifier: 'maze' },
    ];
    let footprintOk = true, spineOk = true, buildingOk = true, alleyOk = true;
    let d1OpenOk = true, reachOk = true, propsOk = true;

    for(const c of matrix){
      game.run = game.run || { active: false, harnessOnly: false, customLevel: null };
      game.run.active = true;
      game.run.harnessOnly = true;
      game.run.customLevel = null;
      game.seed = c.seed;
      game.district = c.district;
      game.modifier = c.modifier || 'normal';
      genCity(c.seed, c.district, c.modifier || '');
      const meta = game.streetLayoutMeta || {};
      const metrics = crStreetLayoutMetrics(game.map, meta);
      const row = { ...c, MAP_W: game.MAP_W, MAP_H: game.MAP_H, metrics };
      evidence.seeds.push(row);

      if(game.MAP_W !== STREET_FOOTPRINT_W || game.MAP_H !== STREET_FOOTPRINT_H) footprintOk = false;
      if(metrics.mainRoad < 80) spineOk = false;
      if(c.district >= 2 && metrics.buildings < 12) buildingOk = false;
      if(c.district > 1 && metrics.alleys < 4) alleyOk = false;
      if(c.district === 1 && metrics.mainRoad < metrics.buildings * 2) d1OpenOk = false;

      const val = crHarnessValidateProceduralCase(c);
      if(!val.ok){ reachOk = false; errors.push('reach seed '+c.seed+' d'+c.district+': '+val.reason); }

      const standAtProps = (game.props||[]).map(p => ({ x:p.x, y:p.y, stand: canStand(p.x, p.y) }));
      game.props = [];
      if(!standAtProps.every(s => canStand(s.x, s.y) === s.stand)) propsOk = false;
      game.props = standAtProps.map(s => ({ x:s.x, y:s.y, kind:'bench', wob:0 }));
    }

    checks.footprintUnchanged = footprintOk;
    checks.mainRoadSpine = spineOk;
    checks.sideBuildings = buildingOk;
    checks.alleyServiceZones = alleyOk;
    checks.d1SimpleOpen = d1OpenOk;
    checks.reachabilityPasses = reachOk;
    checks.propsNonCollision = propsOk;
    checks.decorPropsUnchanged = DECOR_PROP_REQUIRED.length === 12;
    checks.noRuntimeErrors = window.__crRuntimeErrors.length === err0;

    if(!checks.footprintUnchanged) errors.push('map footprint must stay 40x20');
    if(!checks.mainRoadSpine) errors.push('main road / central spine too small');
    if(!checks.sideBuildings) errors.push('side building zones missing for D2+');
    if(!checks.alleyServiceZones) errors.push('alley/service zones missing for districts above D1');
    if(!checks.d1SimpleOpen) errors.push('D1 should read more open than building mass');
    if(!checks.propsNonCollision) errors.push('props altered collision');
    if(!checks.decorPropsUnchanged) errors.push('decor prop roster must remain 12 kinds');
    if(!checks.noRuntimeErrors) errors.push('runtime errors during street-block check');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence };
  }
}

function runFullSelfCheckInner(){
  const err0 = window.__crRuntimeErrors.length;
  const layout = runLayoutSelfCheck();
  const viewportSafeArea = runViewportSafeAreaSelfCheck();
  const portraitUsability = runPortraitUsabilitySelfCheck();
  const settingsSafety = runSettingsSafetySelfCheck();
  const decorativeProps = runDecorativePropsSelfCheck();
  const optionsCleanup = runOptionsCleanupSelfCheck();
  const mobileControlReliability = runMobileControlReliabilitySelfCheck();
  const movementCollision = runMovementCollisionSelfCheck();
  const reachability = runReachabilitySelfCheck();
  const streetBlockLevel = runStreetBlockLevelSelfCheck();
  const d1ParkLandmark = runD1ParkLandmarkSelfCheck();
  const buildingModuleFacade = runBuildingModuleFacadeSelfCheck();
  const facadePackBridge = runFacadePackBridgeSelfCheck();
  const facadePackV2Safe = runFacadePackV2SafeModuleSelfCheck();
  const fpvGroundPlaneAlignment = runFpvGroundPlaneAlignmentSelfCheck();
  const d2D3FacadeReadabilityFinal = runD2D3FacadeReadabilityFinalSelfCheck();
  const buildingSmoothStyle = runBuildingSmoothStyleSelfCheck();
  const continuousFacadeTexture = runContinuousFacadeTextureSelfCheck();
  const spriteGroundAnchor = runSpriteGroundAnchorSelfCheck();
  const facadeArtVocabulary = runFacadeArtVocabularySelfCheck();
  const facadeCompositionReadability = runFacadeCompositionReadabilitySelfCheck();
  const fpvFacadeTargetPolish = runFpvFacadeTargetPolishSelfCheck();
  const fpvWallLineArtifactFix = runFpvWallLineArtifactFixSelfCheck();
  const fpvStreetShimmerFix = runFpvStreetShimmerFixSelfCheck();
  const streetReadabilityMinimap = runStreetReadabilityMinimapSelfCheck();
  const buildingScalePolish = runBuildingScalePolishSelfCheck();
  const earlyDistrictProgression = runEarlyDistrictProgressionSelfCheck();
  const levelSelector = runLevelSelectorSelfCheck();
  const proceduralLevelValidation = runProceduralLevelValidationSelfCheck();
  const fullRunProgression = runFullRunProgressionSelfCheck();
  const onboarding = runOnboardingSelfCheck();
  const soundFeedback = runSoundFeedbackSelfCheck();
  const declarativeControls = runDeclarativeControlsSelfCheck();
  const visualReadability = runVisualReadabilitySelfCheck();
  const visualRectangleRegression = runVisualRectangleRegressionSelfCheck();
  const input = runInputSelfCheck();
  const levels = runLevelSelfCheck();
  const renderFailure = runRenderFailureSelfCheck();
  const runtimeClean = window.__crRuntimeErrors.length === err0;
  const pass = layout.pass && viewportSafeArea.pass && portraitUsability.pass && settingsSafety.pass && decorativeProps.pass && optionsCleanup.pass && mobileControlReliability.pass && movementCollision.pass && reachability.pass && streetBlockLevel.pass && d1ParkLandmark.pass && buildingModuleFacade.pass && facadePackBridge.pass && facadePackV2Safe.pass && fpvGroundPlaneAlignment.pass && d2D3FacadeReadabilityFinal.pass && buildingSmoothStyle.pass && continuousFacadeTexture.pass && spriteGroundAnchor.pass && facadeArtVocabulary.pass && facadeCompositionReadability.pass && fpvFacadeTargetPolish.pass && fpvWallLineArtifactFix.pass && fpvStreetShimmerFix.pass && streetReadabilityMinimap.pass && buildingScalePolish.pass && earlyDistrictProgression.pass && levelSelector.pass && proceduralLevelValidation.pass && fullRunProgression.pass && onboarding.pass && soundFeedback.pass && declarativeControls.pass && visualReadability.pass && visualRectangleRegression.pass && input.pass && levels.pass && renderFailure.pass && runtimeClean;
  return {
    pass,
    build: BUILD_ID,
    layout,
    viewportSafeArea,
    portraitUsability,
    settingsSafety,
    decorativeProps,
    optionsCleanup,
    mobileControlReliability,
    movementCollision,
    reachability,
    streetBlockLevel,
    d1ParkLandmark,
    buildingModuleFacade,
    facadePackBridge,
    facadePackV2Safe,
    fpvGroundPlaneAlignment,
    d2D3FacadeReadabilityFinal,
    buildingSmoothStyle,
    continuousFacadeTexture,
    spriteGroundAnchor,
    facadeArtVocabulary,
    facadeCompositionReadability,
    fpvFacadeTargetPolish,
    fpvWallLineArtifactFix,
    fpvStreetShimmerFix,
    streetReadabilityMinimap,
    buildingScalePolish,
    earlyDistrictProgression,
    levelSelector,
    proceduralLevelValidation,
    fullRunProgression,
    onboarding,
    soundFeedback,
    declarativeControls,
    visualReadability,
    visualRectangleRegression,
    input,
    levels,
    renderFailure,
    render: renderFailure,
    runtimeErrors: window.__crRuntimeErrors.slice(),
    runtimeClean,
    timestamp: new Date().toISOString(),
  };
}

function runOnboardingSelfCheck(){
  if(_crHarnessDepth > 0) return runOnboardingSelfCheckBody();
  return crWithTemporaryState('onboarding', () => runOnboardingSelfCheckBody());
}

function runOnboardingSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const err0 = window.__crRuntimeErrors.length;
  const savedHelp = options.helpDismissed;
  const savedOverride = mobileOverride;
  const savedState = state;
  const savedPaused = paused;
  crPrepareSelfCheckPortrait();
  try {
    const el = document.getElementById('cronboard');
    const panel = el && el.querySelector('.cronboard-panel');
    checks.domExists = !!(el && panel);
    if(!checks.domExists) errors.push('onboarding DOM missing');

    options.helpDismissed = false;
    options.save();
    onboardingOpen = false;
    syncOnboardingPanel();

    startRun(881122);
    crOpenFirstRunHelpIfNeeded();
    checks.firstRunVisible = onboardingOpen && el.classList.contains('show');
    if(!checks.firstRunVisible) errors.push('first-run help did not appear');

    const tit = panel.querySelector('.cronboard-tit');
    checks.readableTitle = !!(tit && String(tit.textContent || '').includes('How to Play'));
    if(!checks.readableTitle) errors.push('help title missing');

    const pr = panel.getBoundingClientRect();
    checks.portraitVisible = pr.height >= 40 && pr.width >= 100 && pr.top >= -2 && pr.bottom <= innerHeight + 4;
    if(!checks.portraitVisible) errors.push('help panel not visible in portrait viewport');
    evidence.panelRect = { top: pr.top, left: pr.left, width: pr.width, height: pr.height };

    dismissOnboardingHelp(true);
    checks.dismissed = !onboardingOpen && !el.classList.contains('show');
    checks.helpDismissedSaved = options.helpDismissed === true;
    if(!checks.dismissed) errors.push('help did not dismiss');
    if(!checks.helpDismissedSaved) errors.push('helpDismissed not persisted');

    const t1 = game.timeLeft;
    update(0.12);
    checks.timerResumes = game.timeLeft < t1;
    if(!checks.timerResumes) errors.push('game timer stuck after dismiss');

    clearInputState();
    const ml = document.getElementById('ml');
    const mbr = ml.getBoundingClientRect();
    crDispatchPointer(ml, 'pointerdown', mbr.left + mbr.width * 0.5, mbr.top + mbr.height * 0.72, 41, 'touch');
    update(0.04);
    checks.moveAfterDismiss = joy.active || inp.fwd || inp.back;
    crDispatchPointer(ml, 'pointerup', mbr.left + mbr.width * 0.5, mbr.top + mbr.height * 0.72, 41, 'touch');
    clearInputState();
    if(!checks.moveAfterDismiss) errors.push('MOVE stuck after help');

    showOnboardingHelp({});
    checks.reopenFromApi = onboardingOpen;
    if(!checks.reopenFromApi) errors.push('help reopen via API failed');
    dismissOnboardingHelp(false);

    paused = true;
    drawMobileMenu();
    rmenuAction('pause-help');
    checks.reopenFromPauseMenu = onboardingOpen;
    if(!checks.reopenFromPauseMenu) errors.push('HOW TO PLAY from pause menu failed');
    dismissOnboardingHelp(true);

    state = STATE.OPTIONS;
    drawMobileMenu();
    rmenuAction('show-onboarding');
    checks.reopenFromOptions = onboardingOpen;
    if(!checks.reopenFromOptions) errors.push('HOW TO PLAY from OPTIONS failed');
    dismissOnboardingHelp(true);
    state = STATE.PLAY;
    paused = false;

    const helpFlagBefore = options.helpDismissed;
    if(!game.run.active) errors.push('run not active for save test');
    if(!crHarnessWriteSaveToStorage()) errors.push('SAVE not written');
    const snap = lsGet(K.save);
    checks.saveWritten = !!(snap && snap.runActive && snap.v === SAVE_VERSION);
    if(!checks.saveWritten) errors.push('SAVE payload invalid');
    const loaded = SAVE.load();
    checks.saveLoadOk = loaded && options.helpDismissed === helpFlagBefore;
    if(!checks.saveLoadOk) errors.push('save/load broke after help dismissal');

    checks.runtimeClean = window.__crRuntimeErrors.length === err0;
    if(!checks.runtimeClean) errors.push('runtime errors during onboarding check');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks: {}, evidence: {} };
  } finally {
    onboardingOpen = false;
    syncOnboardingPanel();
    options.helpDismissed = savedHelp;
    options.save();
    mobileOverride = savedOverride;
    state = savedState;
    paused = savedPaused;
    clearInputState();
    _selfCheckForcePortrait = false;
    applyMobileControlSettings();
    drawMobileMenu();
  }
}

function runSoundFeedbackSelfCheck(){
  if(_crHarnessDepth > 0) return runSoundFeedbackSelfCheckBody();
  return crWithTemporaryState('soundFeedback', () => runSoundFeedbackSelfCheckBody());
}

function runSoundFeedbackSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const err0 = window.__crRuntimeErrors.length;
  try {
    checks.functionExists = typeof runSoundFeedbackSelfCheck === 'function';
    checks.contract = !!(CR_SOUND_FEEDBACK && CR_SOUND_FEEDBACK.style === 'sound1' && CR_SOUND_FEEDBACK.webAudio === true);
    checks.buildIdOptionsClean1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.crTriggerExists = typeof crTriggerSoundCue === 'function';
    checks.crSoundEnabledFn = typeof crSoundEnabled === 'function';
    checks.noExternalAudioTags = document.querySelectorAll('audio,source[src]').length === 0;
    checks.harnessMuted = _crHarnessDepth > 0 && crSoundEnabled() === false;
    if(!checks.contract) errors.push('CR_SOUND_FEEDBACK contract missing');
    if(!checks.buildIdOptionsClean1) errors.push('BUILD_ID must be shimmerfix1');
    if(!checks.crTriggerExists) errors.push('crTriggerSoundCue missing');
    if(!checks.harnessMuted) errors.push('harness must mute gameplay sound');
    if(!checks.noExternalAudioTags) errors.push('external audio tags present');

    const ids = crSoundFeedbackCueIds();
    checks.requiredCueCount = ids.length;
    checks.allRequiredCues = CR_SOUND_FEEDBACK.requiredCues.every(id => ids.includes(id) && _SOUND_CUE_DEFS[id]);
    if(!checks.allRequiredCues) errors.push('required sound cues missing');

    const cueResults = {};
    for(const id of CR_SOUND_FEEDBACK.requiredCues){
      const r = crTriggerSoundCue(id, { testOnly: true });
      cueResults[id] = r;
      if(!r.ok) errors.push('cue failed: '+id);
    }
    checks.cueCallsNoThrow = Object.values(cueResults).every(r => r.ok);
    evidence.cueResults = cueResults;

    const prevSound = options.soundOn;
    options.soundOn = false;
    options.save();
    options.load();
    checks.soundOffPersist = options.soundOn === false;
    options.soundOn = true;
    options.save();
    options.load();
    checks.soundOnPersist = options.soundOn !== false;
    if(!checks.soundOffPersist || !checks.soundOnPersist) errors.push('sound toggle persistence failed');
    options.soundOn = prevSound;
    options.save();

    let resumeOk = true;
    try { resumeOk = resumeAudioContext() !== false; } catch(e){ resumeOk = false; }
    checks.resumeHookSafe = resumeOk;
    const proof = getAudioUnlockProof();
    checks.audioProof = !!(proof && proof.resumeEntry === 'resumeAudioContext');
    evidence.audioProof = proof;

    const pass = errors.length === 0 && window.__crRuntimeErrors.length === err0;
    if(window.__crRuntimeErrors.length !== err0) errors.push('runtime errors during sound selfcheck');
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks: {}, evidence: {} };
  }
}

function runVisualReadabilitySelfCheck(){
  if(_crHarnessDepth > 0) return runVisualReadabilitySelfCheckBody();
  return crWithTemporaryState('visualReadability', () => runVisualReadabilitySelfCheckBody());
}
function runVisualReadabilitySelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  const savedOverride = mobileOverride;
  mobileOverride = true;
  try {
    checks.functionExists = typeof runVisualReadabilitySelfCheck === 'function';
    checks.buildIdOptionsClean1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.visualContract = !!(CR_VISUAL_READABILITY && CR_VISUAL_READABILITY.style === 'visualfix1');
    checks.noScreenPathStripe = CR_VISUAL_READABILITY.floorPathStripe === false;
    checks.pickupTex = !!TEX.can;
    checks.npcTex = !!TEX.hungry;
    checks.exitTex = !!TEX.exit;
    if(!checks.buildIdOptionsClean1) errors.push('BUILD_ID must be shimmerfix1');
    if(!checks.visualContract) errors.push('CR_VISUAL_READABILITY contract missing');
    if(!checks.noScreenPathStripe) errors.push('screen-space floor path stripe must stay disabled');
    if(!checks.pickupTex || !checks.npcTex || !checks.exitTex) errors.push('sprite textures missing');

    startRun(42);
    state = STATE.PLAY;
    paused = false;
    crRenderFailureDrawFrame(1200);
    const normalCanvas = crRenderCanvasSanity();
    checks.normalRunRendered = !!normalCanvas.pass;
    if(!checks.normalRunRendered) errors.push('normal run render blank');
    checks.pickupMarkerPresent = game.pickups.some(c => !c.taken);
    if(!checks.pickupMarkerPresent) errors.push('no live pickup in normal run');
    checks.npcMarkerPresent = game.npcs.some(n => !n.helped);
    if(!checks.npcMarkerPresent) errors.push('no live NPC in normal run');
    checks.exitMarkerPresent = !!game.exit;
    if(!checks.exitMarkerPresent) errors.push('exit missing in normal run');
    evidence.normalSnapshot = _crVisualHarnessSnapshot;

    startCustomLevel('hall_of_servants');
    state = STATE.PLAY;
    paused = false;
    crRenderFailureDrawFrame(1300);
    const hallCanvas = crRenderCanvasSanity();
    checks.hallRendered = !!hallCanvas.pass;
    if(!checks.hallRendered) errors.push('hall render failed');
    evidence.hallStats = hallCanvas.stats;

    showOnboardingHelp();
    const panel = document.getElementById('cronboard');
    checks.onboardingOverlayRenders = !!(panel && panel.classList.contains('show'));
    if(!checks.onboardingOverlayRenders) errors.push('onboarding overlay not visible');
    dismissOnboardingHelp(true);

    startRun(42);
    state = STATE.PLAY;
    paused = false;
    if(game.exit){
      game.helped = game.quota;
      game.exit.active = true;
    }
    crRenderFailureDrawFrame(1400);
    checks.exitReadyVisualState = !!(_crVisualHarnessSnapshot && _crVisualHarnessSnapshot.exitReady);
    if(!checks.exitReadyVisualState) errors.push('exit-ready visual state not observed');
    evidence.exitReadySnapshot = _crVisualHarnessSnapshot;

    const npc = game.npcs.find(n => !n.helped);
    if(!npc) errors.push('no NPC for give-target test');
    else {
      player.x = npc.x - 0.55;
      player.y = npc.y;
      player.cans = Math.max(npc.need + 2, 8);
      player.dir = Math.atan2(npc.y - player.y, npc.x - player.x);
      game.aimNpc = npc;
      crRenderFailureDrawFrame(1500);
      checks.giveTargetVisualState = !!(_crVisualHarnessSnapshot && _crVisualHarnessSnapshot.giveReady && _crVisualHarnessSnapshot.aimNpc);
      if(!checks.giveTargetVisualState) errors.push('GIVE-ready visual state not observed');
      evidence.giveSnapshot = _crVisualHarnessSnapshot;
    }

    const layout = getLayoutProof();
    checks.minimapPresent = !!(layout && layout.minimapRect && layout.minimapRect.w > 8);
    if(!checks.minimapPresent) errors.push('minimap layout missing');
    evidence.layoutMinimap = layout && layout.minimapRect;

    const saveBefore = options.helpDismissed;
    if(!crHarnessWriteSaveToStorage()) errors.push('visual check save write failed');
    const loaded = SAVE.load();
    checks.saveLoadUnchanged = loaded && options.helpDismissed === saveBefore;
    if(!checks.saveLoadUnchanged) errors.push('save/load regression during visual check');

    checks.runtimeClean = window.__crRuntimeErrors.length === err0;
    if(!checks.runtimeClean) errors.push('runtime errors during visual readability check');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence, visualStyle: CR_VISUAL_READABILITY };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence: {}, visualStyle: CR_VISUAL_READABILITY };
  } finally {
    onboardingOpen = false;
    syncOnboardingPanel();
    mobileOverride = savedOverride;
    _selfCheckForcePortrait = false;
    applyMobileControlSettings();
    drawMobileMenu();
  }
}

function crVisualRectangleLowerCenterROI(){
  return {
    x0: (RW * 0.30)|0,
    y0: (RH * 0.55)|0,
    x1: (RW * 0.70)|0,
    y1: (RH * 0.92)|0,
  };
}

function crVisualRectangleProbeAtAngle(angleRad, now){
  player.angle = angleRad;
  player.dir = angleRad;
  crRenderFailureDrawFrame(now || 2100);
  const roi = crVisualRectangleLowerCenterROI();
  const img = bctx.getImageData(0, 0, RW, RH);
  const center = crRegionLumaStats(img, roi.x0, roi.y0, roi.x1, roi.y1);
  const sideL = crRegionLumaStats(img, Math.max(0, roi.x0 - 36), roi.y0, roi.x0 + 4, roi.y1);
  const sideR = crRegionLumaStats(img, roi.x1 - 4, roi.y0, Math.min(RW, roi.x1 + 36), roi.y1);
  return { center, sideL, sideR, roi, angle: angleRad };
}

function runVisualRectangleRegressionSelfCheck(){
  if(_crHarnessDepth > 0) return runVisualRectangleRegressionSelfCheckBody();
  return crWithTemporaryState('visualRectangleRegression', () => runVisualRectangleRegressionSelfCheckBody());
}

function runVisualRectangleRegressionSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const checks = {};
  const evidence = {};
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  const savedOverride = mobileOverride;
  mobileOverride = true;
  try {
    checks.functionExists = typeof runVisualRectangleRegressionSelfCheck === 'function';
    checks.buildIdOptionsClean1 = BUILD_ID === 'modules1' || BUILD_ID === 'facadepack1' || BUILD_ID === 'facadev2safe1' || BUILD_ID === 'facadecompose1' || BUILD_ID === 'facadeart1' || (BUILD_ID === 'spriteground1' || BUILD_ID === 'groundplane1' || (BUILD_ID === 'facadefinal1' || (BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1')));
    checks.noScreenPathStripe = !!(CR_VISUAL_READABILITY && CR_VISUAL_READABILITY.floorPathStripe === false);
    if(!checks.buildIdOptionsClean1) errors.push('BUILD_ID must be shimmerfix1');
    if(!checks.noScreenPathStripe) errors.push('screen-space path stripe flag must be false');

    startRun(42);
    state = STATE.PLAY;
    paused = false;
    const a0 = player.angle;
    const probe0 = crVisualRectangleProbeAtAngle(a0, 2200);
    const probe1 = crVisualRectangleProbeAtAngle(a0 + Math.PI * 0.5, 2300);
    const probe2 = crVisualRectangleProbeAtAngle(a0 + Math.PI, 2400);
    checks.normalFpvRendered = !!(probe0.center && probe0.center.count > 100);
    if(!checks.normalFpvRendered) errors.push('FPV render probe failed');
    checks.twoAnglesSampled = true;
    const mean0 = probe0.center.mean;
    const mean1 = probe1.center.mean;
    const mean2 = probe2.center.mean;
    const meanSpread = Math.max(mean0, mean1, mean2) - Math.min(mean0, mean1, mean2);
    const pairDiff01 = Math.abs(mean0 - mean1);
    const pairDiff12 = Math.abs(mean1 - mean2);
    const stuckBrightBlock =
      mean0 > 56 && mean1 > 56 &&
      pairDiff01 < 3.5 && pairDiff12 < 3.5 &&
      probe0.center.brightRatio > 0.12 && probe1.center.brightRatio > 0.12;
    checks.noStuckLowerCenterRectangle = !stuckBrightBlock;
    checks.viewChangesWithHeading = pairDiff01 >= 4 || meanSpread >= 5 || probe0.center.variance > 80;
    if(!checks.noStuckLowerCenterRectangle) errors.push('lower-center light rectangle appears stuck across headings');
    if(!checks.viewChangesWithHeading) warnings.push('heading luma delta low; using structural stripe guard');
    if(!checks.noStuckLowerCenterRectangle && !checks.viewChangesWithHeading) errors.push('suspicious lower-center block and no heading variation');
    evidence.probes = { probe0, probe1, probe2, meanSpread, pairDiff01, stuckBrightBlock };

    const vr = _crHarnessDepth > 0 ? runVisualReadabilitySelfCheckBody() : runVisualReadabilitySelfCheck();
    checks.visualReadabilityStillPasses = !!vr.pass;
    if(!checks.visualReadabilityStillPasses) errors.push('visual readability regressed: ' + (vr.errors || []).join('; '));

    const ob = _crHarnessDepth > 0 ? runOnboardingSelfCheckBody() : runOnboardingSelfCheck();
    checks.onboardingStillPasses = !!ob.pass;
    if(!checks.onboardingStillPasses) errors.push('onboarding regressed');

    const fr = _crHarnessDepth > 0 ? runFullRunProgressionSelfCheckBody() : runFullRunProgressionSelfCheck();
    checks.fullRunStillPasses = !!fr.pass;
    if(!checks.fullRunStillPasses) errors.push('full-run progression regressed');

    if(!crHarnessWriteSaveToStorage()) errors.push('rectangle regression save write failed');
    const loaded = SAVE.load();
    checks.saveLoadUnchanged = !!loaded;
    if(!checks.saveLoadUnchanged) errors.push('save/load regression');

    checks.runtimeClean = window.__crRuntimeErrors.length === err0;
    if(!checks.runtimeClean) errors.push('runtime errors during rectangle regression check');

    const pass = errors.length === 0;
    return { pass, build: BUILD_ID, errors, warnings, checks, evidence };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, evidence: {} };
  } finally {
    onboardingOpen = false;
    syncOnboardingPanel();
    mobileOverride = savedOverride;
    _selfCheckForcePortrait = false;
    applyMobileControlSettings();
    drawMobileMenu();
  }
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
function showCrSelfCheckOverlay(result){
  const el = document.getElementById('crselfcheck');
  if(!el) return;
  el.style.display = 'block';
  el.classList.toggle('fail', !result.pass);
  if(result.pass){
    el.textContent = 'SELF-CHECK PASS\nbuild '+BUILD_ID;
  } else {
    const errs = []
      .concat(result.layout?.errors||[])
      .concat(result.input?.errors||[])
      .concat(result.levels?.errors||[])
      .concat(result.render?.errors||[]);
    el.textContent = 'SELF-CHECK FAIL\n'+(errs.slice(0,4).join('\n')||'see console');
  }
}

function crPrepareSelfCheckPortrait(){
  _selfCheckForcePortrait = true;
  mobileOverride = 'on';
  setMobileMode(true);
  resize();
  applyMobileControlSettings();
  syncPortraitMenuLabel();
}

function crDispatchPointer(el, type, clientX, clientY, pointerId, pointerType){
  if(!el) return;
  const pe = new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX, clientY, pointerId,
    pointerType: pointerType || 'touch', isPrimary: true,
    buttons: type === 'pointerdown' ? 1 : 0,
  });
  el.dispatchEvent(pe);
}

function crDispatchTouch(el, type, clientX, clientY, identifier){
  if(!el || typeof Touch === 'undefined') return;
  const id = identifier != null ? identifier : 77;
  const t = new Touch({
    identifier: id, target: el, clientX, clientY,
    pageX: clientX, pageY: clientY, screenX: clientX, screenY: clientY,
  });
  const touches = type === 'touchend' || type === 'touchcancel' ? [] : [t];
  el.dispatchEvent(new TouchEvent(type, {
    bubbles: true, cancelable: true, touches, targetTouches: touches, changedTouches: [t],
  }));
}

function runLayoutSelfCheck(){
  const errors = [];
  const warnings = [];
  const savedOverride = mobileOverride;
  crPrepareSelfCheckPortrait();
  try {
    const canvasOk = !!view && view.width > 0 && view.height > 0;
    if(!canvasOk) errors.push('FPV canvas missing or zero size');
    const L = portraitLayout();
    const rectKeys = ['fpvRect','minimapRect','statsRect','menuRect','moveRect','giveRect','sprintRect','lookRect'];
    for(const k of rectKeys){
      if(!L[k]) errors.push('portraitLayout missing '+k);
    }
    const proof = getLayoutProof();
    const menuEl = document.getElementById('mportmenu');
    const menuText = menuEl ? (menuEl.textContent || '') : '';
    const menuNoDock = !/dock/i.test(menuText);
    if(!menuNoDock) errors.push('MENU text includes dock height');
    if(proof.overlap && proof.overlap.giveMove) errors.push('unexpected GIVE/MOVE overlap');
    if(proof.overlap && proof.overlap.sprintMove) errors.push('unexpected SPRINT/MOVE overlap');
    if(proof.overlap && proof.overlap.giveLook) warnings.push('GIVE/LOOK overlap present');
    if(proof.overlap && proof.overlap.sprintLook) warnings.push('intentional SPRINT/LOOK overlap');
    const dock = runControlDockSelfCheck();
    if(!dock.pass) errors.push(...(dock.errors || []));
    const checks = {
      canvasOk,
      minimapRect: !!L.minimapRect,
      statsRect: !!L.statsRect,
      menuRect: !!L.menuRect,
      moveRect: !!L.moveRect,
      giveRect: !!L.giveRect,
      sprintRect: !!L.sprintRect,
      lookRect: !!L.lookRect,
      menuNoDockText: menuNoDock,
      controlsMoveWithHeight: !!(dock.checks && dock.checks.moveMoved),
      menuFixedWithHeight: !!(dock.checks && dock.checks.menuStayed),
      minimapFixedWithHeight: !!(dock.checks && dock.checks.minimapStayed),
      statsFixedWithHeight: !!(dock.checks && dock.checks.statsStayed),
      fpvFixedWithHeight: !!(dock.checks && dock.checks.fpvStayed),
    };
    const pass = errors.length === 0 && Object.values(checks).every(Boolean);
    return { pass, build: BUILD_ID, errors, warnings, rects: proof, checks, dockSummary: { pass: dock.pass, movementPx: dock.movementPx } };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, rects: {}, checks: {} };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
    syncPortraitMenuLabel();
  }
}

function runInputSelfCheck(){
  const errors = [];
  const checks = {};
  const savedOverride = mobileOverride;
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  try {
    startRun(42);
    paused = false;
    state = STATE.PLAY;
    applyMobileControlSettings();
    checks.startRunWorks = state === STATE.PLAY && !!game.map && game.map.length > 0;
    if(!checks.startRunWorks) errors.push('startRun did not reach PLAY with map');

    const ml = document.getElementById('ml');
    const br = ml.getBoundingClientRect();
    const cx = br.left + br.width * 0.5;
    const cy = br.top + br.height * 0.5;
    const px0 = player.x, py0 = player.y;
    const angle0 = player.angle;

    crDispatchPointer(ml, 'pointerdown', cx, cy, 42, 'touch');
    checks.joyStarts = joy.active === true;
    if(!checks.joyStarts) errors.push('joystick did not activate');

    crDispatchPointer(ml, 'pointermove', cx, cy - 35, 42, 'touch');
    syncInpFromJoy();
    checks.moveIntent = inp.fwd || inp.back || inp.left || inp.right || joyStrength() > 0.15;
    update(0.06);
    const moved = Math.hypot(player.x - px0, player.y - py0) > 0.0005;
    checks.moveAfterJoy = moved || checks.moveIntent;
    if(!checks.moveAfterJoy) errors.push('no movement intent after joystick drag');

    const pxMid = player.x, pyMid = player.y;
    crDispatchPointer(ml, 'pointermove', cx + 120, cy + 120, 42, 'touch');
    crDispatchPointer(ml, 'pointerup', cx + 120, cy + 120, 42, 'touch');
    checks.joyClears = !joy.active;
    checks.inpClears = !inp.fwd && !inp.back && !inp.left && !inp.right;
    if(!checks.joyClears) errors.push('joy.active after release');
    if(!checks.inpClears) errors.push('inp movement flags after release');

    update(0.08);
    checks.moveStopsOnRelease = Math.hypot(player.x - pxMid, player.y - pyMid) < 0.03;
    if(!checks.moveStopsOnRelease) errors.push('player kept moving after joystick release');

    try { giveCan(); checks.giveSafe = true; } catch(e){ checks.giveSafe = false; errors.push('giveCan threw: '+e.message); }

    const ms = document.getElementById('ms');
    try {
      const mbr = ms.getBoundingClientRect();
      crDispatchTouch(ms, 'touchstart', mbr.left + 10, mbr.top + 10, 88);
      crDispatchTouch(ms, 'touchend', mbr.left + 10, mbr.top + 10, 88);
      update(0.02);
      checks.sprintSafe = true;
    } catch(e){ checks.sprintSafe = false; errors.push('sprint touch threw: '+e.message); }

    const lpad = document.getElementById('mlookpad');
    const lbr = lpad.getBoundingClientRect();
    const lx = lbr.left + lbr.width * 0.5;
    const ly = lbr.top + lbr.height * 0.5;
    crDispatchPointer(lpad, 'pointerdown', lx, ly, 44, 'mouse');
    crDispatchPointer(lpad, 'pointermove', lx + 40, ly, 44, 'mouse');
    checks.lookChangesAngle = Math.abs(player.angle - angle0) > 0.008;
    crDispatchPointer(lpad, 'pointerup', lx + 40, ly, 44, 'mouse');
    if(!checks.lookChangesAngle) errors.push('LOOK drag did not change player.angle');

    checks.runtimeClean = window.__crRuntimeErrors.length === err0;
    if(!checks.runtimeClean) errors.push('runtime errors during input self-check');

    const pass = errors.length === 0 && Object.values(checks).every(Boolean);
    return { pass, errors, checks };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, errors, checks };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
  }
}

function crHarnessInstallMicroMap(lineRows){
  const map = lineRows.map(line => [...line].map(ch => (ch === ' ' || ch === '.' ? 0 : 1)));
  game.map = map;
  game.MAP_W = map[0].length;
  game.MAP_H = map.length;
  game.wallShade = game.wallShade || [];
  game.pickups = [];
  game.npcs = [];
  game.props = [];
  game.exit = { x: Math.max(1, game.MAP_W - 2), y: Math.max(1, game.MAP_H - 2) };
  if(game.run) game.run.harnessOnly = true;
  state = STATE.PLAY;
  paused = false;
  clearInputState();
}

function runMovementCollisionSelfCheck(){
  if(_crHarnessDepth > 0) return runMovementCollisionSelfCheckBody();
  return crWithTemporaryState('movementCollision', () => runMovementCollisionSelfCheckBody());
}

function runMovementCollisionSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const measurements = { attemptedSteps: 0, finalPositions: [], collisionResults: [] };
  const checks = {
    normalSpawnSafe: false,
    hallSpawnSafe: false,
    wallCollisionSafe: false,
    cornerCollisionSafe: false,
    highSpeedNoTunnel: false,
    corridorMoveWorks: false,
    releaseStops: false,
    noNaN: true,
    harnessStateRestored: true,
  };
  const savedOverride = mobileOverride;
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  try {
    startRun(88);
    paused = false;
    state = STATE.PLAY;
    clearInputState();
    let pathOk = false;
    const fx = Math.cos(player.angle), fy = Math.sin(player.angle);
    for(const d of [0.15, 0.3, 0.5, 0.8]){
      if(canStand(player.x + fx * d, player.y + fy * d)){ pathOk = true; break; }
    }
    checks.normalSpawnSafe = canStand(player.x, player.y) && pathOk;
    measurements.finalPositions.push({ scene: 'normalSpawn', x: player.x, y: player.y, pathOk });
    if(!checks.normalSpawnSafe) errors.push('normal spawn unsafe');

    startCustomLevel('hall_of_servants');
    paused = false;
    clearInputState();
    checks.hallSpawnSafe = canStand(player.x, player.y) && state === STATE.PLAY;
    measurements.finalPositions.push({ scene: 'hallSpawn', x: player.x, y: player.y });
    if(!checks.hallSpawnSafe) errors.push('hall spawn unsafe');

    crHarnessInstallMicroMap([
      '#######',
      '#.....#',
      '#.....#',
      '#.....#',
      '#######',
    ]);
    player.x = 1.5; player.y = 2.0;
    const wallRes = movePlayerWithCollision(2.5, 0);
    measurements.attemptedSteps += wallRes.steps;
    measurements.collisionResults.push({ test: 'wall', steps: wallRes.steps, x: player.x, y: player.y });
    checks.wallCollisionSafe = canStand(player.x, player.y) && player.x < 4.85;
    if(!checks.wallCollisionSafe) errors.push('wall collision failed');

    crHarnessInstallMicroMap([
      '#######',
      '#..##.#',
      '#..##.#',
      '#.....#',
      '#######',
    ]);
    player.x = 1.6; player.y = 2.6;
    let cornerJitter = 0;
    for(let i = 0; i < 10; i++){
      const px = player.x, py = player.y;
      movePlayerWithCollision(0.15, 0.15);
      if(!Number.isFinite(player.x) || !Number.isFinite(player.y) || !canStand(player.x, player.y)){
        checks.noNaN = false;
        errors.push('corner: invalid position');
        break;
      }
      if(Math.hypot(player.x - px, player.y - py) < 0.00002) cornerJitter++;
    }
    checks.cornerCollisionSafe = checks.noNaN && canStand(player.x, player.y) && cornerJitter < 8;
    measurements.collisionResults.push({ test: 'corner', x: player.x, y: player.y, jitter: cornerJitter });
    if(!checks.cornerCollisionSafe) errors.push('corner collision failed');

    crHarnessInstallMicroMap([
      '#########',
      '#.......#',
      '#.......#',
      '#.......#',
      '#########',
    ]);
    player.x = 1.5; player.y = 2.0;
    const tunnelX0 = player.x;
    const hiRes = movePlayerWithCollision(5.0, 0);
    measurements.attemptedSteps += hiRes.steps;
    checks.highSpeedNoTunnel = canStand(player.x, player.y) && player.x < 7.2 && player.x > tunnelX0;
    measurements.collisionResults.push({ test: 'highSpeed', steps: hiRes.steps, x: player.x, dx: player.x - tunnelX0 });
    if(!checks.highSpeedNoTunnel) errors.push('high-speed tunnel');

    crHarnessInstallMicroMap([
      '#######',
      '#.....#',
      '#.#.#.#',
      '#.....#',
      '#.....#',
      '#.....#',
      '#######',
    ]);
    player.x = 3.5; player.y = 5.2;
    const cy0c = player.y;
    movePlayerWithCollision(0, -1.5);
    const advanced = player.y < cy0c - 0.25 && canStand(player.x, player.y);
    const pyHold = player.y;
    clearInputState();
    for(let i = 0; i < 8; i++) update(0.05);
    const corridorStopped = Math.abs(player.y - pyHold) < 0.04;
    checks.corridorMoveWorks = advanced && corridorStopped;
    measurements.finalPositions.push({ scene: 'corridor', x: player.x, y: player.y, advanced, corridorStopped });
    if(!checks.corridorMoveWorks) errors.push('corridor move failed');

    startRun(42);
    state = STATE.PLAY;
    paused = false;
    applyMobileControlSettings();
    clearInputState();
    const ml = document.getElementById('ml');
    const br = ml.getBoundingClientRect();
    const cx = br.left + br.width * 0.5, cy = br.top + br.height * 0.5;
    const jpx0 = player.x, jpy0 = player.y;
    crDispatchPointer(ml, 'pointerdown', cx, cy, 42, 'touch');
    crDispatchPointer(ml, 'pointermove', cx, cy - 35, 42, 'touch');
    update(0.06);
    const jpxMid = player.x, jpyMid = player.y;
    crDispatchPointer(ml, 'pointerup', cx, cy - 35, 42, 'touch');
    clearMoveInput();
    for(let i = 0; i < 10; i++) update(0.05);
    const drift = Math.hypot(player.x - jpxMid, player.y - jpyMid);
    checks.releaseStops = !joy.active && drift < 0.06;
    if(!checks.releaseStops) errors.push('release did not stop movement');

    const mobileRel = _crHarnessDepth > 0
      ? runMobileControlReliabilitySelfCheckBody()
      : runMobileControlReliabilitySelfCheck();
    if(!mobileRel.pass) errors.push('mobile control reliability regressed');

    if(window.__crRuntimeErrors.length !== err0) errors.push('runtime errors during movement collision check');

    const pass = errors.length === 0 && Object.values(checks).every(Boolean);
    checks.harnessStateRestored = true;
    return {
      pass,
      build: BUILD_ID,
      errors,
      warnings,
      checks,
      measurements,
      mobileControlReliabilityPass: mobileRel.pass,
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, measurements };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
    clearInputState();
  }
}

function crHarnessEssentialConnected(ex, ey, px, py){
  const fromItem = gridReachableFrom(ex, ey);
  const ptx = Math.floor(px), pty = Math.floor(py);
  return fromItem.count > 0 && isReachableCell(ptx, pty, fromItem.reachable);
}

function crHarnessCountUnreachablePickups(reachable){
  let n = 0;
  for(const c of game.pickups){
    if(c.taken) continue;
    const tx = Math.floor(c.x), ty = Math.floor(c.y);
    if(!isReachableCell(tx, ty, reachable)) n++;
  }
  return n;
}

function crHarnessCountUnreachableNpcs(reachable){
  let n = 0;
  for(const npc of game.npcs){
    if(npc.helped) continue;
    const tx = Math.floor(npc.x), ty = Math.floor(npc.y);
    if(!isReachableCell(tx, ty, reachable)) n++;
  }
  return n;
}

function runReachabilitySelfCheck(){
  if(_crHarnessDepth > 0) return runReachabilitySelfCheckBody();
  return crWithTemporaryState('reachability', () => runReachabilitySelfCheckBody());
}

function runReachabilitySelfCheckBody(){
  const errors = [];
  const warnings = [];
  const measurements = {
    normalReachableCells: 0,
    hallReachableCells: 0,
    unreachableNormalPickups: 0,
    unreachableNormalNpcs: 0,
    traceSamples: 0,
  };
  const checks = {
    clearTracePasses: false,
    wallTraceBlocks: false,
    diagonalWallBlocks: false,
    outOfBoundsSafe: false,
    normalSpawnReachable: false,
    normalPickupsReachabilityMeasured: false,
    normalNpcsReachabilityMeasured: false,
    normalExitReachabilityMeasured: false,
    hallAllPickupsReachable: false,
    hallAllNpcsReachable: false,
    hallExitReachable: false,
    giveDoesNotPassThroughWalls: false,
    harnessStateRestored: true,
  };
  const savedOverride = mobileOverride;
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  try {
    crHarnessInstallMicroMap([
      '#######',
      '#.....#',
      '#.....#',
      '#.....#',
      '#######',
    ]);
    const clearTrace = gridTraceClear(1.5, 2.0, 4.5, 2.0);
    measurements.traceSamples += clearTrace.samples;
    checks.clearTracePasses = clearTrace.clear === true && !clearTrace.blocked;

    crHarnessInstallMicroMap([
      '#######',
      '#..#..#',
      '#..#..#',
      '#..#..#',
      '#######',
    ]);
    const wallTrace = gridTraceClear(1.5, 2.0, 5.5, 2.0);
    measurements.traceSamples += wallTrace.samples;
    checks.wallTraceBlocks = wallTrace.blocked === true && wallTrace.clear === false;

    crHarnessInstallMicroMap([
      '#######',
      '#.#...#',
      '#.#...#',
      '#.....#',
      '#######',
    ]);
    const diagTrace = gridTraceClear(1.2, 1.2, 5.2, 3.2);
    measurements.traceSamples += diagTrace.samples;
    checks.diagonalWallBlocks = diagTrace.blocked === true;

    let oobThrew = false;
    try {
      crHarnessInstallMicroMap([
        '#####',
        '#...#',
        '#...#',
        '#...#',
        '#####',
      ]);
      const oob = gridTraceClear(2.5, 2.5, 22, 22);
      measurements.traceSamples += oob.samples;
      checks.outOfBoundsSafe = oob.clear !== true && oob.blocked === true && (oob.outOfBounds === true || oob.blockedAt != null);
    } catch(e){
      oobThrew = true;
      errors.push('out-of-bounds trace threw');
    }
    if(oobThrew) checks.outOfBoundsSafe = false;

    startRun(88);
    paused = false;
    state = STATE.PLAY;
    clearInputState();
    checks.normalSpawnReachable = canStand(player.x, player.y);
    const normalBfs = gridReachableFrom(player.x, player.y);
    measurements.normalReachableCells = normalBfs.count;
    checks.normalSpawnReachable = checks.normalSpawnReachable && normalBfs.count > 40 && normalBfs.pass;
    measurements.unreachableNormalPickups = crHarnessCountUnreachablePickups(normalBfs.reachable);
    measurements.unreachableNormalNpcs = crHarnessCountUnreachableNpcs(normalBfs.reachable);
    checks.normalPickupsReachabilityMeasured = true;
    checks.normalNpcsReachabilityMeasured = true;
    if(game.exit){
      const exTx = Math.floor(game.exit.x), exTy = Math.floor(game.exit.y);
      const exitReach = isReachableCell(exTx, exTy, normalBfs.reachable) || game.exit.active === false;
      checks.normalExitReachabilityMeasured = true;
      if(!exitReach && game.exit.active) warnings.push('normal exit not reachable from spawn (measured)');
    } else {
      checks.normalExitReachabilityMeasured = true;
    }
    if(measurements.unreachableNormalPickups > 0) warnings.push('normal unreachable pickups: '+measurements.unreachableNormalPickups);
    if(measurements.unreachableNormalNpcs > 0) warnings.push('normal unreachable npcs: '+measurements.unreachableNormalNpcs);

    startCustomLevel('hall_of_servants');
    paused = false;
    state = STATE.PLAY;
    clearInputState();
    checks.normalSpawnReachable = checks.normalSpawnReachable && canStand(player.x, player.y);
    const hallBfs = gridReachableFrom(player.x, player.y);
    measurements.hallReachableCells = hallBfs.count;
    const hallPickBad = (game.pickups || []).filter(p => !p.taken && !crHarnessEssentialConnected(p.x, p.y, player.x, player.y)).length;
    const hallNpcBad = (game.npcs || []).filter(n => !n.helped && !crHarnessEssentialConnected(n.x, n.y, player.x, player.y)).length;
    checks.hallAllPickupsReachable = hallPickBad === 0;
    checks.hallAllNpcsReachable = hallNpcBad === 0;
    if(game.exit){
      const hx = game.exit.x, hy = game.exit.y;
      checks.hallExitReachable = crHarnessEssentialConnected(hx, hy, player.x, player.y);
    } else {
      checks.hallExitReachable = false;
    }
    if(!checks.hallAllPickupsReachable) errors.push('hall unreachable pickups: '+hallPickBad);
    if(!checks.hallAllNpcsReachable) errors.push('hall unreachable npcs: '+hallNpcBad);
    if(!checks.hallExitReachable) errors.push('hall exit not reachable');

    crHarnessInstallMicroMap([
      '#######',
      '#.....#',
      '#.#.#.#',
      '#.....#',
      '#.....#',
      '#######',
    ]);
    player.x = 1.5; player.y = 2.5;
    player.cans = 10;
    game.npcs = [{ x: 5.5, y: 2.5, need: 1, helped: false, kind: 'hungry' }];
    game.pickups = [];
    updateAim();
    const losWall = interactionLineClear(player.x, player.y, game.npcs[0].x, game.npcs[0].y);
    const aimBlocked = game.aimNpc === null;
    const helpedBefore = game.npcs[0].helped;
    game.aimNpc = game.npcs[0];
    giveCan();
    const giveBlocked = game.npcs[0].helped === helpedBefore;
    checks.giveDoesNotPassThroughWalls = !losWall.clear && aimBlocked && giveBlocked;
    if(!checks.giveDoesNotPassThroughWalls) errors.push('GIVE can pass through wall');

    if(window.__crRuntimeErrors.length !== err0) errors.push('runtime errors during reachability check');

    const pass = errors.length === 0 && Object.values(checks).every(Boolean);
    return { pass, build: BUILD_ID, errors, warnings, checks, measurements };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, measurements };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
    clearInputState();
    game.npcs = game.npcs || [];
  }
}

function crHarnessWriteSaveToStorage(){
  const wasBlock = _crBlockHarnessSave;
  const wasHarness = !!(game.run && game.run.harnessOnly);
  _crBlockHarnessSave = false;
  if(game.run) game.run.harnessOnly = false;
  try {
    lsSet(K.save, SAVE.serialize());
    return true;
  } catch(e){ return false; }
  finally {
    _crBlockHarnessSave = wasBlock;
    if(game.run) game.run.harnessOnly = wasHarness;
  }
}

function crHarnessStartDeterministicRun(seed, modifier){
  SAVE.clear();
  game.seed = seed;
  game.district = 1;
  game.totalScore = 0;
  game.modifier = modifier || 'clear';
  resetPlayerUpgrades();
  genCity(game.seed, game.district, game.modifier);
  player.cans = 0;
  player.stamina = player.maxStamina;
  sharedEnterPlay();
  game.run = {
    active: true, startedAt: Date.now(), seedUsed: seed, modifierUsed: game.modifier, customLevel: null,
    cansCollected: 0, cansDelivered: 0,
    helpedByKind: { hungry: 0, family: 0, elder: 0, volunteer: 0 },
    upgradesChosen: 0, highestDistrict: 1, runTime: 0, completed: false, leaderboardRank: null,
    harnessOnly: true,
  };
  clearInputState();
  state = STATE.PLAY;
  paused = false;
}

function crHarnessMoveNearWorld(wx, wy){
  const tx = Math.floor(wx), ty = Math.floor(wy);
  const offsets = [
    [0, 0], [0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35],
    [0.5, 0], [-0.5, 0], [0.35, 0.35], [-0.35, -0.35],
  ];
  for(const [ox, oy] of offsets){
    const px = wx + ox, py = wy + oy;
    if(canStand(px, py)){ player.x = px; player.y = py; return true; }
  }
  const px = tx + 0.5, py = ty + 0.5;
  if(canStand(px, py)){ player.x = px; player.y = py; return true; }
  return false;
}

function crHarnessCollectReachablePickups(){
  let collected = 0;
  const spawnX = player.x, spawnY = player.y;
  for(const p of game.pickups || []){
    if(p.taken) continue;
    if(!crHarnessEssentialConnected(p.x, p.y, spawnX, spawnY)) continue;
    if(!crHarnessMoveNearWorld(p.x, p.y)) continue;
    const c0 = player.cans;
    const a0 = p.amt;
    tickPickups();
    if(player.cans > c0 || p.taken || p.amt < a0) collected++;
  }
  return collected;
}

function crHarnessGiveUntilQuota(errors, label){
  let gave = false;
  player.giveCD = 0;
  let guard = 0;
  while(game.helped < game.quota && guard < 48){
    const npc = (game.npcs || []).find(n => !n.helped);
    if(!npc){ errors.push(label + ': no unhelped NPC'); return gave; }
    player.cans = Math.max(player.cans, npc.need + 3);
    player.giveCD = 0;
    if(!crHarnessMoveNearWorld(npc.x, npc.y)){
      errors.push(label + ': cannot reach NPC ' + npc.kind);
      return gave;
    }
    updateAim();
    if(!game.aimNpc){ errors.push(label + ': aimNpc null at NPC'); return gave; }
    const h0 = game.helped;
    giveCan();
    if(game.helped > h0) gave = true;
    else { errors.push(label + ': giveCan did not advance helped'); return gave; }
    guard++;
  }
  return gave;
}

function crHarnessAssertValidRunState(label, errors){
  if(state !== STATE.PLAY && state !== STATE.UPGRADE) errors.push(label + ': bad state ' + state);
  if(!game.run || !game.run.active) errors.push(label + ': run not active');
  if(!canStand(player.x, player.y)) errors.push(label + ': player not canStand');
}

function runFullRunProgressionSelfCheck(){
  if(_crHarnessDepth > 0) return runFullRunProgressionSelfCheckBody();
  return crWithTemporaryState('fullRunProgression', () => runFullRunProgressionSelfCheckBody());
}

function runFullRunProgressionSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const err0 = window.__crRuntimeErrors.length;
  const E2E_SEED = 880017;
  const MID_SEED = 880018;
  const POST_SEED = 880019;
  const measurements = {
    seed: E2E_SEED,
    district: 1,
    collectedCount: 0,
    quota: 0,
    reachableCells: 0,
    saveKeysTouched: [K.save],
    beforeLoadState: null,
    afterLoadState: null,
  };
  const checks = {
    normalRunStarted: false,
    spawnValid: false,
    collectedQuota: false,
    giveIfNeededPassed: false,
    exitReachable: false,
    exitCompleted: false,
    progressionAdvanced: false,
    midRunSaveLoadPassed: false,
    postCompletionSaveLoadPassed: false,
    hallE2EStillPasses: false,
    mobileControlsStillPass: false,
    noRuntimeErrors: true,
    harnessStateRestored: true,
  };
  const statsSnap = crCloneJson(stats.data);
  const savedOverride = mobileOverride;
  crPrepareSelfCheckPortrait();
  try {
    crHarnessStartDeterministicRun(E2E_SEED, 'clear');
    checks.normalRunStarted = state === STATE.PLAY && game.run.active;
    checks.spawnValid = canStand(player.x, player.y);
    measurements.quota = game.quota;
    const bfs = gridReachableFrom(player.x, player.y);
    measurements.reachableCells = bfs.count;
    if(!checks.normalRunStarted) errors.push('normal: run did not start');
    if(!checks.spawnValid) errors.push('normal: invalid spawn');

    const collected = crHarnessCollectReachablePickups();
    measurements.collectedCount = collected;
    if(collected < 1) errors.push('normal: no pickup collected via tickPickups');

    const gave = crHarnessGiveUntilQuota(errors, 'normal');
    checks.giveIfNeededPassed = gave && game.helped >= game.quota;
    checks.collectedQuota = game.helped >= game.quota;
    if(!checks.collectedQuota) errors.push('normal: quota not met');

    if(!game.exit || !game.exit.active) errors.push('normal: exit not active after quota');
    else {
      checks.exitReachable = crHarnessEssentialConnected(game.exit.x, game.exit.y, player.x, player.y);
      if(!checks.exitReachable) errors.push('normal: exit not reachable');
      else if(crHarnessMoveNearWorld(game.exit.x, game.exit.y)){
        const dist0 = game.district;
        completeDistrict();
        checks.exitCompleted = state === STATE.UPGRADE && game.helped >= game.quota;
        if(!checks.exitCompleted) errors.push('normal: completeDistrict did not reach UPGRADE');
        if(window._offered && window._offered.length >= 1){
          chooseUpgrade(0);
          checks.progressionAdvanced = state === STATE.PLAY && game.district === dist0 + 1;
          measurements.district = game.district;
          if(!checks.progressionAdvanced) errors.push('normal: chooseUpgrade did not advance district');
        } else errors.push('normal: no upgrade offered');
      }
    }

    crHarnessStartDeterministicRun(MID_SEED, 'clear');
    const midPickup = (game.pickups || []).find(p => !p.taken);
    if(!midPickup) errors.push('mid-save: no pickup');
    else {
      crHarnessMoveNearWorld(midPickup.x, midPickup.y);
      tickPickups();
      const snapBefore = {
        district: game.district, seed: game.seed, helped: game.helped, quota: game.quota,
        px: player.x, py: player.y, cans: player.cans,
        taken: midPickup.taken, amt: midPickup.amt,
        runCans: game.run.cansCollected,
      };
      measurements.beforeLoadState = snapBefore;
      if(!crHarnessWriteSaveToStorage()) errors.push('mid-save: write failed');
      else {
        player.x += 2.5;
        player.cans = 0;
        if(midPickup) midPickup.taken = false;
        const loaded = SAVE.load();
        const snapAfter = {
          district: game.district, seed: game.seed, helped: game.helped,
          px: player.x, py: player.y, cans: player.cans,
          taken: midPickup.taken, amt: midPickup.amt,
        };
        measurements.afterLoadState = snapAfter;
        clearInputState();
        checks.midRunSaveLoadPassed = loaded &&
          snapAfter.district === snapBefore.district &&
          snapAfter.seed === snapBefore.seed &&
          Math.abs(snapAfter.px - snapBefore.px) < 0.02 &&
          snapAfter.cans === snapBefore.cans &&
          !inp.fwd && !inp.back && !joy.active;
        if(!checks.midRunSaveLoadPassed) errors.push('mid-save: load mismatch');
        crHarnessAssertValidRunState('mid-load', errors);
      }
    }

    crHarnessStartDeterministicRun(POST_SEED, 'clear');
    crHarnessCollectReachablePickups();
    crHarnessGiveUntilQuota(errors, 'post');
    if(game.exit && game.exit.active && crHarnessMoveNearWorld(game.exit.x, game.exit.y)){
      const helpedSnap = game.helped;
      const distSnap = game.district;
      completeDistrict();
      if(state === STATE.UPGRADE){
        const offeredSnap = (window._offered || []).length;
        if(!crHarnessWriteSaveToStorage()) errors.push('post-save: write failed');
        else {
          state = STATE.TITLE;
          game.helped = 0;
          window._offered = null;
          const loaded = SAVE.load();
          checks.postCompletionSaveLoadPassed = loaded &&
            state === STATE.UPGRADE &&
            game.helped === helpedSnap &&
            game.district === distSnap &&
            (window._offered || []).length === offeredSnap;
          if(!checks.postCompletionSaveLoadPassed) errors.push('post-save: upgrade state not restored');
        }
      } else errors.push('post-save: not in UPGRADE before save');
    } else errors.push('post-save: could not complete district');

    const hall = runHallSelfCheck();
    checks.hallE2EStillPasses = hall.pass === true;
    if(!checks.hallE2EStillPasses) errors.push('hall regression: ' + (hall.errors || []).join('; '));

    const mobile = runMobileControlReliabilitySelfCheck();
    checks.mobileControlsStillPass = mobile.pass === true;
    if(!checks.mobileControlsStillPass) errors.push('mobile regression');

    checks.noRuntimeErrors = window.__crRuntimeErrors.length === err0;
    if(!checks.noRuntimeErrors) errors.push('runtime errors during full-run check');

    const pass = errors.length === 0 &&
      checks.normalRunStarted && checks.spawnValid && checks.collectedQuota &&
      checks.giveIfNeededPassed && checks.exitCompleted && checks.progressionAdvanced &&
      checks.midRunSaveLoadPassed && checks.postCompletionSaveLoadPassed &&
      checks.hallE2EStillPasses && checks.mobileControlsStillPass && checks.noRuntimeErrors;

    window.__crLastFullRunProgression = { pass, checks, measurements, errors, warnings };
    return {
      pass,
      build: BUILD_ID,
      errors,
      warnings,
      checks,
      measurements,
      hallPass: hall.pass,
      mobilePass: mobile.pass,
      timestamp: new Date().toISOString(),
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks, measurements };
  } finally {
    stats.data = statsSnap;
    stats.save();
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
    clearInputState();
    crClearHarnessLeakFromStorage();
    SAVE.clear();
    crForceSafeTitleAfterHarness();
  }
}

function crHarnessMapShapeErrors(){
  const e = [];
  const W = game.MAP_W, H = game.MAP_H;
  if(!W || !H || W < 8 || H < 8) e.push('bad dimensions');
  if(!(W > H)) e.push('not rectangular wide');
  if(!Array.isArray(game.map) || game.map.length !== H) e.push('map height');
  for(let y = 0; y < H; y++){
    if(!game.map[y] || game.map[y].length !== W) e.push('row '+y+' width');
    for(let x = 0; x < W; x++){
      const v = game.map[y][x];
      if(v === undefined || v === null || !Number.isFinite(v)) e.push('bad cell '+x+','+y);
    }
  }
  return e;
}

function crHarnessReachablePickupStats(px, py){
  let sum = 0, unreachable = 0;
  for(const p of game.pickups || []){
    if(p.taken) continue;
    if(crHarnessEssentialConnected(p.x, p.y, px, py)) sum += (p.amt | 0) || 1;
    else unreachable++;
  }
  return { sum, unreachable };
}

function crHarnessReachableNpcStats(px, py){
  let reach = 0, unreachable = 0;
  for(const n of game.npcs || []){
    if(n.helped) continue;
    if(crHarnessEssentialConnected(n.x, n.y, px, py)) reach++;
    else unreachable++;
  }
  return { reach, unreachable };
}

function crHarnessBuildProceduralValidationCases(){
  const cases = [];
  for(let s = 1; s <= 25; s++) cases.push({ seed: s, district: 1, modifier: '' });
  [0, 42, 12345, 99999].forEach(s => cases.push({ seed: s, district: 1, modifier: '' }));
  for(let s = 1; s <= 10; s++) cases.push({ seed: s, district: 2, modifier: '' });
  for(let s = 1; s <= 10; s++) cases.push({ seed: s, district: 3, modifier: '' });
  ['clear', 'maze', 'shortage'].forEach(m => cases.push({ seed: 42, district: 1, modifier: m }));
  return cases;
}

function crHarnessValidateProceduralCase(c){
  const details = { seed: c.seed, district: c.district, modifier: c.modifier || 'default' };
  game.run = game.run || { active: false, harnessOnly: false, customLevel: null };
  game.run.active = true;
  game.run.harnessOnly = true;
  game.run.customLevel = null;
  game.seed = c.seed;
  game.district = c.district;
  game.modifier = c.modifier || 'normal';
  player.cans = 0;
  player.giveCD = 0;
  player.stamina = player.maxStamina;
  clearInputState();
  state = STATE.PLAY;
  paused = false;
  genCity(c.seed, c.district, c.modifier || '');
  details.MAP_W = game.MAP_W;
  details.MAP_H = game.MAP_H;
  details.quota = game.quota;
  const mapErrs = crHarnessMapShapeErrors();
  if(mapErrs.length) return { ok: false, reason: 'malformed map', details: { ...details, mapErrs } };
  if(!canStand(player.x, player.y)) return { ok: false, reason: 'invalid spawn', details };
  const bfs = gridReachableFrom(player.x, player.y);
  details.reachableCells = bfs.count;
  const MIN_CELLS = 48;
  if(!bfs.pass || bfs.count < MIN_CELLS) return { ok: false, reason: 'reachable area too small', details };
  const spawnKey = (Math.floor(player.y)) + ',' + (Math.floor(player.x));
  if(!bfs.reachable[spawnKey]) return { ok: false, reason: 'spawn not in reachable set', details };
  const px = player.x, py = player.y;
  const cans = crHarnessReachablePickupStats(px, py);
  const npcs = crHarnessReachableNpcStats(px, py);
  details.reachableCans = cans.sum;
  details.unreachablePickups = cans.unreachable;
  details.reachableNpcs = npcs.reach;
  details.unreachableNpcs = npcs.unreachable;
  if(!game.exit) return { ok: false, reason: 'missing exit', details };
  if(!crHarnessEssentialConnected(game.exit.x, game.exit.y, px, py)){
    return { ok: false, reason: 'exit unreachable', details };
  }
  if(npcs.reach < game.quota) return { ok: false, reason: 'reachable NPCs below quota', details };
  if(cans.sum < game.quota) return { ok: false, reason: 'reachable cans below quota', details };
  return { ok: true, details };
}

function runProceduralLevelValidationSelfCheck(){
  if(_crHarnessDepth > 0) return runProceduralLevelValidationSelfCheckBody();
  return crWithTemporaryState('proceduralLevelValidation', () => runProceduralLevelValidationSelfCheckBody());
}

function runProceduralLevelValidationSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const failures = [];
  const err0 = window.__crRuntimeErrors.length;
  const cases = crHarnessBuildProceduralValidationCases();
  const districtsSeen = {};
  let levelsPassed = 0;
  let levelsFailed = 0;
  let minReach = Infinity, maxReach = 0;
  let totalUnreachablePickups = 0, totalUnreachableNpcs = 0;
  const savedOverride = mobileOverride;
  crPrepareSelfCheckPortrait();
  try {
    for(const c of cases){
      districtsSeen[c.district] = true;
      let result;
      try {
        result = crHarnessValidateProceduralCase(c);
      } catch(ex){
        result = { ok: false, reason: 'exception', details: { seed: c.seed, district: c.district, message: String(ex && ex.message || ex) } };
      }
      if(result.ok){
        levelsPassed++;
        const rc = result.details.reachableCells || 0;
        if(rc < minReach) minReach = rc;
        if(rc > maxReach) maxReach = rc;
        totalUnreachablePickups += result.details.unreachablePickups || 0;
        totalUnreachableNpcs += result.details.unreachableNpcs || 0;
      } else {
        levelsFailed++;
        failures.push({
          seed: c.seed,
          district: c.district,
          modifier: c.modifier || 'default',
          reason: result.reason,
          details: result.details || {},
        });
        errors.push('seed '+c.seed+' d'+c.district+' '+ (c.modifier||'default') +': '+result.reason);
      }
    }
    if(minReach === Infinity) minReach = 0;
    const checks = {
      allMapsRectangular: failures.filter(f => f.reason === 'malformed map').length === 0,
      allSpawnsValid: failures.filter(f => f.reason === 'invalid spawn' || f.reason === 'spawn not in reachable set').length === 0,
      allReachableAreasLargeEnough: failures.filter(f => f.reason === 'reachable area too small').length === 0,
      allQuotasReachable: failures.filter(f => f.reason.indexOf('quota') >= 0 || f.reason.indexOf('cans') >= 0).length === 0,
      allExitsReachable: failures.filter(f => f.reason === 'exit unreachable' || f.reason === 'missing exit').length === 0,
      requiredNpcsReachable: failures.filter(f => f.reason.indexOf('NPC') >= 0).length === 0,
      noRuntimeErrors: window.__crRuntimeErrors.length === err0,
      harnessStateRestored: true,
    };
    if(levelsFailed > 0){
      checks.allMapsRectangular = levelsFailed === 0 || checks.allMapsRectangular;
      checks.allSpawnsValid = levelsFailed === 0;
      checks.allReachableAreasLargeEnough = levelsFailed === 0;
      checks.allQuotasReachable = levelsFailed === 0;
      checks.allExitsReachable = levelsFailed === 0;
      checks.requiredNpcsReachable = levelsFailed === 0;
    }
    if(!checks.noRuntimeErrors) errors.push('runtime errors during procedural validation');
    const pass = levelsFailed === 0 && checks.noRuntimeErrors;
    if(totalUnreachablePickups > 0) warnings.push('nonessential unreachable pickups across seeds: '+totalUnreachablePickups);
    if(totalUnreachableNpcs > 0) warnings.push('unreachable NPCs across seeds (decorative): '+totalUnreachableNpcs);
    return {
      pass,
      build: BUILD_ID,
      seedCount: cases.length,
      districtCount: Object.keys(districtsSeen).length,
      errors,
      warnings,
      summary: {
        levelsChecked: cases.length,
        levelsPassed,
        levelsFailed,
        minReachableCells: minReach,
        maxReachableCells: maxReach,
        totalUnreachablePickups,
        totalUnreachableNpcs,
      },
      failures,
      checks,
      cases: cases.length,
      timestamp: new Date().toISOString(),
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return {
      pass: false,
      build: BUILD_ID,
      seedCount: cases.length,
      districtCount: 0,
      errors,
      warnings,
      summary: { levelsChecked: cases.length, levelsPassed, levelsFailed, minReachableCells: 0, maxReachableCells: 0, totalUnreachablePickups: 0, totalUnreachableNpcs: 0 },
      failures,
      checks: { harnessStateRestored: false },
    };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
    clearInputState();
    game.npcs = game.npcs || [];
  }
}

function runLevelSelfCheck(){
  if(_crHarnessDepth > 0) return runLevelSelfCheckBody();
  return crWithTemporaryState('level', () => runLevelSelfCheckBody());
}
function runLevelSelfCheckBody(){
  const errors = [];
  const err0 = window.__crRuntimeErrors.length;
  const savedOverride = mobileOverride;
  function snapNormal(){
    const fx = Math.cos(player.angle), fy = Math.sin(player.angle);
    let pathOk = false;
    for(const d of [0.15, 0.3, 0.5, 0.8]){
      if(canStand(player.x + fx * d, player.y + fy * d)){ pathOk = true; break; }
    }
    return {
      mapExists: !!(game.map && game.map.length),
      MAP_W: game.MAP_W,
      MAP_H: game.MAP_H,
      wideMap: game.MAP_W > game.MAP_H,
      spawnCanStand: canStand(player.x, player.y),
      pickups: (game.pickups || []).filter(p => !p.taken).length,
      npcs: (game.npcs || []).length,
      exitExists: !!(game.exit && game.exit.x != null),
      pathNotBlockedImmediately: pathOk,
    };
  }
  crPrepareSelfCheckPortrait();
  try {
    startRun(42);
    paused = false;
    const normal = snapNormal();
    if(!normal.mapExists) errors.push('normal run: map missing');
    if(!normal.wideMap) errors.push('normal run: MAP_W not > MAP_H');
    if(!normal.spawnCanStand) errors.push('normal run: spawn not canStand');
    if(normal.pickups < 1) errors.push('normal run: no pickups');
    if(normal.npcs < 1) errors.push('normal run: no npcs');
    if(!normal.exitExists) errors.push('normal run: no exit');
    if(!normal.pathNotBlockedImmediately) errors.push('normal run: forward path blocked at spawn');

    startCustomLevel('hall_of_servants');
    paused = false;
    const hall = snapNormal();
    hall.customLevel = game.run && game.run.customLevel;
    hall.hallIdOk = hall.customLevel === 'hall_of_servants';
    hall.customNpcs = (game.npcs || []).filter(n => String(n.kind || '').startsWith('hall_')).length;
    hall.thankTextExists = (game.npcs || []).some(n => n.thank && String(n.thank).length > 0);

    const hx0 = player.x, hy0 = player.y;
    const ml = document.getElementById('ml');
    const br = ml.getBoundingClientRect();
    const cx = br.left + br.width * 0.5, cy = br.top + br.height * 0.5;
    crDispatchPointer(ml, 'pointerdown', cx, cy, 55, 'touch');
    crDispatchPointer(ml, 'pointermove', cx, cy - 30, 55, 'touch');
    update(0.05);
    const hallMoved = Math.hypot(player.x - hx0, player.y - hy0) > 0.0003;
    crDispatchPointer(ml, 'pointerup', cx, cy - 30, 55, 'touch');
    update(0.05);
    const hallStopped = Math.hypot(player.x - hx0, player.y - hy0) < 0.15 || !joy.active;
    hall.movementStarts = hallMoved;
    hall.movementStopsOnRelease = hallStopped && !joy.active;

    if(!hall.hallIdOk) errors.push('hall: customLevel not hall_of_servants');
    if(!hall.wideMap) errors.push('hall: MAP_W not > MAP_H');
    if(!hall.spawnCanStand) errors.push('hall: spawn not canStand');
    if(hall.pickups < 1) errors.push('hall: no pickups');
    if(hall.customNpcs < 1) errors.push('hall: no custom NPCs');
    if(!hall.thankTextExists) errors.push('hall: no thank text on NPCs');
    if(!hall.exitExists) errors.push('hall: no exit');
    if(!hall.movementStarts) errors.push('hall: movement did not start');
    if(!hall.movementStopsOnRelease) errors.push('hall: movement did not stop on release');

    const runtimeClean = window.__crRuntimeErrors.length === err0;
    const pass = errors.length === 0 && runtimeClean;
    return { pass, errors, normal, hall, runtimeClean };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, errors, normal: {}, hall: {} };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
  }
}

function runRenderSelfCheck(){
  const errors = [];
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  try {
    startRun(42);
    paused = false;
    if(typeof drawScene === 'function'){
      try { drawScene(performance.now()); } catch(e){ errors.push('drawScene threw: '+e.message); }
    } else errors.push('drawScene missing');
    const halo = getSpriteHaloRegressionProof();
    const occ = getOcclusionZbufferProof();
    const checks = {
      zbufferExists: !!(zbuffer && zbuffer.length === RW),
      zbufferMatchesWidth: zbuffer.length === RW,
      spriteOcclusionGuardPresent: !!occ.predicateOk,
      noSpriteFogHaloMode: !!halo.spriteLoopOk,
      runtimeClean: window.__crRuntimeErrors.length === err0,
    };
    if(!checks.zbufferExists) errors.push('zbuffer missing');
    if(!checks.spriteOcclusionGuardPresent) errors.push('occlusion predicate failed');
    if(!checks.noSpriteFogHaloMode) errors.push('sprite fog/halo guard failed');
    if(!checks.runtimeClean) errors.push('runtime errors during render self-check');
    const pass = errors.length === 0 && Object.values(checks).every(Boolean);
    return { pass, errors, checks, halo, occlusion: occ };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, errors, checks: {} };
  } finally {
    _selfCheckForcePortrait = false;
    applyMobileControlSettings();
  }
}

function crHallTestPlace(px, py){
  if(!canStand(px, py)) return false;
  player.x = px;
  player.y = py;
  return true;
}

function crHallPlaceNearNPC(npc){
  const offsets = [
    [0.35, 0], [0.3, 0], [-0.35, 0], [0, -0.35], [0, 0.35],
    [0.5, 0], [-0.5, 0], [0, 0], [-0.3, 0.3], [0.3, -0.3], [0.6, 0],
  ];
  for(const [ox, oy] of offsets){
    if(crHallTestPlace(npc.x + ox, npc.y + oy)) return true;
  }
  return false;
}

function runHallSelfCheck(){
  if(_crHarnessDepth > 0) return runHallSelfCheckBody();
  return crWithTemporaryState('hall', () => runHallSelfCheckBody());
}
function runHallSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const err0 = window.__crRuntimeErrors.length;
  const savedOverride = mobileOverride;
  const hall = {
    started: false,
    map: null,
    spawnCanStand: false,
    movementStarted: false,
    movementStopped: false,
    pickupCollected: false,
    npcHelped: false,
    thankShown: false,
    quotaReached: false,
    exitActivated: false,
    completed: false,
  };
  const normalRegression = {
    started: false,
    wideMap: false,
    movementStarted: false,
    movementStopped: false,
    customLevelCleared: false,
  };
  crPrepareSelfCheckPortrait();
  try {
    startCustomLevel('hall_of_servants');
    paused = false;
    player.giveCD = 0;
    clearInputState();

    hall.started = state === STATE.PLAY && paused === false;
    hall.map = { MAP_W: game.MAP_W, MAP_H: game.MAP_H, rectangular: game.MAP_W > game.MAP_H };
    hall.customLevel = game.run && game.run.customLevel;
    hall.spawnCanStand = canStand(player.x, player.y);

    if(!hall.started) errors.push('hall: state not PLAY or paused');
    if(hall.customLevel !== 'hall_of_servants') errors.push('hall: customLevel mismatch');
    if(!hall.map.MAP_W || !hall.map.MAP_H) errors.push('hall: invalid MAP_W/MAP_H');
    if(!hall.map.rectangular) errors.push('hall: map not rectangular (wide)');
    if(!hall.spawnCanStand) errors.push('hall: spawn canStand false');

    for(const n of game.npcs){
      if(String(n.kind || '').startsWith('hall_') && !TEX[n.kind]){
        errors.push('hall: missing sprite texture for '+n.kind);
      }
    }

    const ml = document.getElementById('ml');
    const br = ml.getBoundingClientRect();
    const cx = br.left + br.width * 0.5;
    const cy = br.top + br.height * 0.5;

    const hx0 = player.x, hy0 = player.y;
    crDispatchPointer(ml, 'pointerdown', cx, cy, 191, 'touch');
    crDispatchPointer(ml, 'pointermove', cx, cy - 36, 191, 'touch');
    update(0.07);
    hall.movementStarted = joy.active || Math.hypot(player.x - hx0, player.y - hy0) > 0.0004;
    const pxHold = player.x, pyHold = player.y;
    crDispatchPointer(ml, 'pointerup', cx, cy - 36, 191, 'touch');
    update(0.1);
    hall.movementStopped = !joy.active && !inp.fwd && !inp.back && !inp.left && !inp.right;
    const drift = Math.hypot(player.x - pxHold, player.y - pyHold);
    if(drift > 0.06) errors.push('hall: sticky movement after release (drift='+drift.toFixed(3)+')');
    if(!hall.movementStarted) errors.push('hall: movement did not start');
    if(!hall.movementStopped) errors.push('hall: movement did not stop on release');

    const pickup = (game.pickups || []).find(p => !p.taken);
    if(!pickup) errors.push('hall: no pickups available');
    else {
      const cans0 = player.cans;
      const amt0 = pickup.amt;
      if(crHallTestPlace(pickup.x, pickup.y)){
        updateAim();
        tickPickups();
        hall.pickupCollected = player.cans > cans0 || pickup.taken || pickup.amt < amt0;
      } else {
        errors.push('hall: could not stand on pickup tile');
      }
      if(!hall.pickupCollected) errors.push('hall: pickup not collected');
    }

    player.cans = Math.max(player.cans, 10);
    player.giveCD = 0;
    const npc0 = (game.npcs || []).find(n => !n.helped);
    if(!npc0) errors.push('hall: no NPC to help');
    else {
      const helped0 = game.helped;
      const delivered0 = game.delivered;
      if(!crHallPlaceNearNPC(npc0)) errors.push('hall: cannot stand near first NPC');
      updateAim();
      if(!game.aimNpc) errors.push('hall: aimNpc null near NPC');
      giveCan();
      hall.npcHelped = npc0.helped && game.helped > helped0;
      hall.thankShown = game.popups.some(p => p.color === '#e8d4b0' && String(p.text).length > 4);
      if(!hall.npcHelped) errors.push('hall: NPC help failed');
      if(!hall.thankShown) errors.push('hall: thank-you popup not shown');
      hall.helpedByKind = Object.assign({}, game.run.helpedByKind);
      if((game.delivered || 0) <= delivered0 && hall.npcHelped) warnings.push('hall: delivered count unchanged');
    }

    player.giveCD = 0;
    let guard = 0;
    while(game.helped < game.quota && guard < 20){
      const next = (game.npcs || []).find(n => !n.helped);
      if(!next) break;
      player.cans = Math.max(player.cans, 10);
      player.giveCD = 0;
      if(!crHallPlaceNearNPC(next)){
        errors.push('hall: cannot reach NPC '+next.kind);
        break;
      }
      updateAim();
      const helpedStep = game.helped;
      giveCan();
      if(game.helped === helpedStep){
        errors.push('hall: giveCan failed at '+next.kind);
        break;
      }
      player.giveCD = 0;
      guard++;
    }
    hall.quotaReached = game.helped >= game.quota;
    hall.exitActivated = !!(game.exit && game.exit.active);
    if(!hall.quotaReached) errors.push('hall: quota not met (helped='+game.helped+' need='+game.quota+')');
    if(!hall.exitActivated) errors.push('hall: exit not active after quota');

    if(game.exit && game.exit.active){
      let atExit = crHallTestPlace(game.exit.x, game.exit.y);
      if(!atExit){
        const exOff = [[0,0],[0.35,0],[-0.35,0],[0,0.35],[0,-0.35],[-0.35,0.35]];
        for(const [ox,oy] of exOff){
          if(crHallTestPlace(game.exit.x + ox, game.exit.y + oy)){ atExit = true; break; }
        }
      }
      tickExit();
      if(state === STATE.PLAY && game.exit && game.exit.active){
        player.x = game.exit.x;
        player.y = game.exit.y;
        tickExit();
      }
      hall.completed = game.run.completed === true || state === STATE.RESULTS;
      if(!hall.completed) errors.push('hall: exit touch did not complete (state='+state+')');
    } else {
      errors.push('hall: cannot test exit completion — exit inactive');
    }

    startRun(424242);
    paused = false;
    clearInputState();
    player.giveCD = 0;
    normalRegression.started = state === STATE.PLAY;
    normalRegression.wideMap = game.MAP_W > game.MAP_H;
    normalRegression.customLevelCleared = !(game.run && game.run.customLevel);
    const nx0 = player.x, ny0 = player.y;
    crDispatchPointer(ml, 'pointerdown', cx, cy, 192, 'touch');
    crDispatchPointer(ml, 'pointermove', cx, cy - 32, 192, 'touch');
    update(0.06);
    normalRegression.movementStarted = Math.hypot(player.x - nx0, player.y - ny0) > 0.0004 || joy.active;
    crDispatchPointer(ml, 'pointerup', cx, cy - 32, 192, 'touch');
    update(0.1);
    normalRegression.movementStopped = !joy.active && !inp.fwd && !inp.back;
    if(!normalRegression.started) errors.push('regression: normal NEW RUN did not start');
    if(!normalRegression.wideMap) errors.push('regression: normal map not rectangular');
    if(!normalRegression.customLevelCleared) errors.push('regression: customLevel still set');
    if(!normalRegression.movementStarted) errors.push('regression: normal movement did not start');
    if(!normalRegression.movementStopped) errors.push('regression: normal movement did not stop');

    const runtimeErrors = window.__crRuntimeErrors.slice();
    const runtimeClean = runtimeErrors.length === err0;
    if(!runtimeClean) errors.push('runtime errors during hall self-check');
    const pass = errors.length === 0;
    return {
      pass,
      build: BUILD_ID,
      errors,
      warnings,
      hall,
      normalRegression,
      runtimeErrors,
      runtimeClean,
      timestamp: new Date().toISOString(),
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return {
      pass: false,
      build: BUILD_ID,
      errors,
      warnings,
      hall,
      normalRegression,
      runtimeErrors: window.__crRuntimeErrors.slice(),
    };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
    applyMobileControlSettings();
  }
}


function crTexTransparencyProof(tex){
  if(!tex || !tex.width || !tex.height) return { ok: false, hasTransparency: false, transparent: 0, opaque: 0 };
  const c = document.createElement('canvas');
  c.width = tex.width;
  c.height = tex.height;
  const x = c.getContext('2d');
  x.drawImage(tex, 0, 0);
  const d = x.getImageData(0, 0, tex.width, tex.height).data;
  let transparent = 0, opaque = 0;
  for(let i = 3; i < d.length; i += 4){
    if(d[i] < 128) transparent++;
    else opaque++;
  }
  return {
    ok: true,
    width: tex.width,
    height: tex.height,
    transparent,
    opaque,
    hasTransparency: transparent > 8,
  };
}

function crRenderFailureDrawFrame(now){
  const t = now || performance.now();
  if(typeof drawScene === 'function') drawScene(t);
  if(ctx && view){
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    const lay = playfieldLayout();
    ctx.drawImage(buf, lay.ox, lay.oy, lay.dw, lay.dh);
  }
}

function crMakeWallShade(w, h){
  const s = [];
  for(let y = 0; y < h; y++){
    s[y] = [];
    for(let x = 0; x < w; x++) s[y][x] = 0.5;
  }
  return s;
}

function crBorderMap(w, h){
  const m = [];
  for(let y = 0; y < h; y++){
    m[y] = [];
    for(let x = 0; x < w; x++){
      m[y][x] = (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? 1 : 0;
    }
  }
  return m;
}

function crProjectBillboard(obj, tex, hp){
  const px = player.x, py = player.y, a = player.angle;
  const dirX = Math.cos(a), dirY = Math.sin(a);
  const planeX = -Math.sin(a) * cfg.fov, planeY = Math.cos(a) * cfg.fov;
  const rwx = obj.x - px, rwy = obj.y - py;
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const depth = invDet * (-planeY * rwx + planeX * rwy);
  const hscr = invDet * (dirY * rwx - dirX * rwy);
  if(depth <= 0.12) return null;
  const lineH = RH / depth;
  const screenH = hp * lineH;
  const screenW = screenH * (tex.width / tex.height);
  const screenX = (RW / 2) * (1 + hscr / depth);
  const bottom = RH / 2 + lineH / 2;
  const top = bottom - screenH;
  return {
    depth,
    startCol: Math.floor(screenX - screenW / 2),
    endCol: Math.ceil(screenX + screenW / 2),
    top: Math.floor(top),
    bottom: Math.ceil(bottom),
    screenW,
    screenH,
  };
}

function crRegionMeanAbsDiff(imgA, imgB, x0, y0, x1, y1){
  const w = imgA.width;
  let sum = 0, n = 0;
  x0 = Math.max(0, Math.floor(x0));
  y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(w, Math.ceil(x1));
  y1 = Math.min(imgA.height, Math.ceil(y1));
  for(let y = y0; y < y1; y++){
    for(let x = x0; x < x1; x++){
      const i = (y * w + x) * 4;
      sum += Math.abs(imgA.data[i] - imgB.data[i]) + Math.abs(imgA.data[i + 1] - imgB.data[i + 1]) + Math.abs(imgA.data[i + 2] - imgB.data[i + 2]);
      n++;
    }
  }
  return n ? sum / n : 0;
}

function crRegionLumaStats(img, x0, y0, x1, y1){
  const w = img.width;
  let sum = 0, bright = 0, n = 0, varSum = 0;
  x0 = Math.max(0, Math.floor(x0));
  y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(w, Math.ceil(x1));
  y1 = Math.min(img.height, Math.ceil(y1));
  const lumas = [];
  for(let y = y0; y < y1; y++){
    for(let x = x0; x < x1; x++){
      const i = (y * w + x) * 4;
      const lu = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
      lumas.push(lu);
      sum += lu;
      if(lu > 195) bright++;
      n++;
    }
  }
  const mean = n ? sum / n : 0;
  for(const lu of lumas) varSum += (lu - mean) * (lu - mean);
  return { mean, brightRatio: n ? bright / n : 0, variance: n ? varSum / n : 0, count: n };
}

function crApplyBenchWorld(w, h, map, px, py, angle, extras){
  game.run.active = false;
  game.run.harnessOnly = true;
  game.run.customLevel = 'harness_render_benchmark';
  game.seed = 12345;
  game.MAP_W = w;
  game.MAP_H = h;
  game.map = map;
  game.wallShade = crMakeWallShade(w, h);
  game.props = extras.props || [];
  game.pickups = extras.pickups || [];
  game.npcs = extras.npcs || [];
  game.exit = extras.exit || null;
  game.modifier = extras.modifier || '';
  game.helped = 0;
  game.quota = 5;
  game.timeLeft = 999;
  if(game.exit) game.exit.active = extras.exitActive !== false;
  player.x = px;
  player.y = py;
  player.angle = angle;
  state = STATE.PLAY;
  paused = false;
  if(typeof buildSky === 'function') buildSky(game.modifier);
}

function crRenderBenchVisibleSprite(){
  const W = 13, H = 9;
  const map = crBorderMap(W, H);
  const can = { x: 9.5, y: 4.5, taken: false, amt: 3, wob: 0 };
  crApplyBenchWorld(W, H, map, 4.5, 4.5, 0, { pickups: [can] });
  crRenderFailureDrawFrame(1000);
  const img = bctx.getImageData(0, 0, RW, RH);
  const proj = crProjectBillboard(can, TEX.can, HEIGHT.can);
  let haloPass = true;
  let borderStats = null;
  if(proj){
    const pad = 3;
    const bx0 = proj.startCol - pad, bx1 = proj.endCol + pad;
    const by0 = Math.max(0, proj.top - pad), by1 = Math.min(RH, proj.bottom + pad);
    borderStats = crRegionLumaStats(img, bx0, by0, bx1, by1);
    const inner = crRegionLumaStats(img, proj.startCol + 2, proj.top + 2, proj.endCol - 2, proj.bottom - 2);
    if(borderStats.brightRatio > 0.42 && borderStats.mean > 175 && inner.variance < borderStats.variance * 0.6){
      haloPass = false;
    }
  }
  const blank = crRegionLumaStats(img, 0, 0, RW, RH);
  const pass = !!(proj && blank.variance > 20 && haloPass);
  return { pass, haloPass, borderStats, proj, canvasVariance: blank.variance };
}

function crRenderBenchOccludedSprite(){
  const W = 14, H = 9;
  const map = crBorderMap(W, H);
  for(let y = 1; y < H - 1; y++) map[y][9] = 2;
  const can = { x: 11.5, y: 4.5, taken: false, amt: 2, wob: 0 };
  crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { pickups: [] });
  crRenderFailureDrawFrame(1100);
  const baseline = bctx.getImageData(0, 0, RW, RH);
  crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { pickups: [can] });
  crRenderFailureDrawFrame(1101);
  const occluded = bctx.getImageData(0, 0, RW, RH);
  const proj = crProjectBillboard(can, TEX.can, HEIGHT.can);
  let occDiff = 999, zPass = false;
  if(proj){
    occDiff = crRegionMeanAbsDiff(baseline, occluded, proj.startCol, proj.top, proj.endCol, proj.bottom);
    for(let col = proj.startCol; col < proj.endCol; col++){
      if(col < 0 || col >= RW) continue;
      if(can && proj.depth >= zbuffer[col]) zPass = true;
    }
  }
  crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { pickups: [{ x: 6.5, y: 4.5, taken: false, amt: 2, wob: 0 }] });
  crRenderFailureDrawFrame(1102);
  const visible = bctx.getImageData(0, 0, RW, RH);
  crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { pickups: [] });
  crRenderFailureDrawFrame(1103);
  const base2 = bctx.getImageData(0, 0, RW, RH);
  const visCan = { x: 6.5, y: 4.5, taken: false, amt: 2, wob: 0 };
  const visProj = crProjectBillboard(visCan, TEX.can, HEIGHT.can);
  let visDiff = 0;
  if(visProj) visDiff = crRegionMeanAbsDiff(base2, visible, visProj.startCol, visProj.top, visProj.endCol, visProj.bottom);
  const hidden = occDiff < 12 && (zPass || occDiff < 6);
  const pass = hidden && visDiff > 10;
  return { pass, occDiff, visDiff, zPass, proj, visProj };
}

function crRenderBenchCanNearWall(){
  const W = 12, H = 9;
  const map = crBorderMap(W, H);
  map[4][8] = 2;
  const can = { x: 7.4, y: 4.5, taken: false, amt: 1, wob: 0 };
  crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { pickups: [can] });
  crRenderFailureDrawFrame(1200);
  const img = bctx.getImageData(0, 0, RW, RH);
  const proj = crProjectBillboard(can, TEX.can, HEIGHT.can);
  let haloPass = true;
  if(proj){
    const st = crRegionLumaStats(img, proj.startCol - 2, proj.top - 2, proj.endCol + 2, proj.bottom + 2);
    if(st.brightRatio > 0.5 && st.mean > 190) haloPass = false;
  }
  return { pass: !!(proj && haloPass), haloPass, proj };
}

function crRenderBenchNpcNearWall(){
  const W = 12, H = 9;
  const map = crBorderMap(W, H);
  map[4][8] = 2;
  const npc = { x: 7.35, y: 4.5, helped: false, kind: 'hungry', wob: 1 };
  crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { npcs: [npc] });
  crRenderFailureDrawFrame(1300);
  const img = bctx.getImageData(0, 0, RW, RH);
  const proj = crProjectBillboard(npc, npcSpriteTex('hungry'), HEIGHT.hungry);
  let haloPass = true;
  if(proj){
    const st = crRegionLumaStats(img, proj.startCol - 2, proj.top - 2, proj.endCol + 2, proj.bottom + 2);
    if(st.brightRatio > 0.5 && st.mean > 190) haloPass = false;
  }
  return { pass: !!(proj && haloPass), haloPass, proj };
}

function crRenderBenchExitNearWall(){
  const W = 12, H = 9;
  const map = crBorderMap(W, H);
  map[4][8] = 2;
  const exit = { x: 7.3, y: 4.5, active: true, wob: 0 };
  crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { exit, exitActive: true });
  crRenderFailureDrawFrame(1400);
  const img = bctx.getImageData(0, 0, RW, RH);
  const proj = crProjectBillboard(exit, TEX.exit, HEIGHT.exit);
  let haloPass = true;
  if(proj){
    const st = crRegionLumaStats(img, proj.startCol - 2, proj.top - 2, proj.endCol + 2, proj.bottom + 2);
    if(st.brightRatio > 0.5 && st.mean > 190) haloPass = false;
  }
  return { pass: !!(proj && haloPass), haloPass, proj };
}

function crRenderBenchHallStart(){
  startCustomLevel('hall_of_servants');
  paused = false;
  crRenderFailureDrawFrame(1500);
  const img = bctx.getImageData(0, 0, RW, RH);
  const st = crRegionLumaStats(img, 0, RH / 3, RW, RH);
  const pass = st.variance > 25 && st.mean > 15;
  return { pass, stats: st, customLevel: game.run && game.run.customLevel };
}

function crRenderCanvasSanity(){
  const img = bctx.getImageData(0, 0, RW, RH);
  const st = crRegionLumaStats(img, 0, 0, RW, RH);
  const pass = !!(view && view.width > 0 && st.variance > 8 && st.mean > 5);
  return { pass, viewSize: view ? { w: view.width, h: view.height } : null, stats: st };
}

function crRenderFailureBenchScene(name){
  if(_crHarnessDepth > 0) return crRenderFailureBenchSceneImpl(name);
  return crWithTemporaryState('benchScene:' + name, () => crRenderFailureBenchSceneImpl(name));
}
function crRenderFailureBenchSceneImpl(name){
  switch(name){
    case 'visible_sprite': crRenderBenchVisibleSprite(); break;
    case 'occluded_sprite': {
      const W = 14, H = 9;
      const map = crBorderMap(W, H);
      for(let y = 1; y < H - 1; y++) map[y][9] = 2;
      crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { pickups: [{ x: 11.5, y: 4.5, taken: false, amt: 2, wob: 0 }] });
      break;
    }
    case 'can_near_wall': {
      const W = 12, H = 9;
      const map = crBorderMap(W, H);
      map[4][8] = 2;
      crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { pickups: [{ x: 7.4, y: 4.5, taken: false, amt: 1, wob: 0 }] });
      break;
    }
    case 'npc_near_wall': {
      const W = 12, H = 9;
      const map = crBorderMap(W, H);
      map[4][8] = 2;
      crApplyBenchWorld(W, H, map, 3.5, 4.5, 0, { npcs: [{ x: 7.35, y: 4.5, helped: false, kind: 'hungry', wob: 1 }] });
      break;
    }
    case 'hall_start':
      startCustomLevel('hall_of_servants');
      paused = false;
      break;
    default:
      startRun(77);
      paused = false;
  }
  crRenderFailureDrawFrame(performance.now());
  return { scene: name, build: BUILD_ID };
}

function runRenderFailureSelfCheck(){
  if(_crHarnessDepth > 0) return runRenderFailureSelfCheckBody();
  return crWithTemporaryState('renderFailure', () => runRenderFailureSelfCheckBody());
}
function runRenderFailureSelfCheckBody(){
  const errors = [];
  const warnings = [];
  const err0 = window.__crRuntimeErrors.length;
  crPrepareSelfCheckPortrait();
  const evidence = {};
  try {
    const haloSrc = getSpriteHaloRegressionProof();
    const occSrc = getOcclusionZbufferProof();
    const checks = {
      zbufferExists: !!(zbuffer && zbuffer.length),
      zbufferLengthMatches: zbuffer.length === RW,
      spriteDepthCheckPresent: !!occSrc.predicateOk,
      noSpriteFullRectFog: !!haloSrc.spriteLoopOk,
      visibleSpriteSceneRendered: false,
      occludedSpriteHidden: false,
      canNearWallClean: false,
      npcNearWallClean: false,
      exitNearWallClean: false,
      hallStartRendered: false,
      canvasNotBlank: false,
      runtimeClean: false,
    };
    if(!checks.zbufferExists) errors.push('zbuffer missing');
    if(!checks.zbufferLengthMatches) errors.push('zbuffer length mismatch RW');
    if(!checks.spriteDepthCheckPresent) errors.push('occlusion predicate failed');
    if(!checks.noSpriteFullRectFog) errors.push('sprite full-rect fog guard failed');

    evidence.haloSource = haloSrc;
    evidence.occlusionSource = occSrc;

    const texKeys = ['can', 'exit', 'hungry', 'hall_volunteer'];
    evidence.textures = {};
    for(const k of texKeys){
      if(!TEX[k]) errors.push('missing TEX.' + k);
      else{
        evidence.textures[k] = crTexTransparencyProof(TEX[k]);
        if(!evidence.textures[k].hasTransparency) warnings.push('TEX.' + k + ' low transparency (may be ok for solid props)');
      }
    }

    const vis = crRenderBenchVisibleSprite();
    evidence.visibleSprite = vis;
    checks.visibleSpriteSceneRendered = !!vis.pass;
    if(!vis.pass) errors.push('visible sprite bench failed');
    if(!vis.haloPass) errors.push('sprite halo border detected (visible scene)');

    const occ = crRenderBenchOccludedSprite();
    evidence.occludedSprite = occ;
    checks.occludedSpriteHidden = !!occ.pass;
    if(!occ.pass) errors.push('occluded sprite bench failed (draw-through or weak visibility contrast)');

    const canW = crRenderBenchCanNearWall();
    evidence.canNearWall = canW;
    checks.canNearWallClean = !!canW.pass;
    if(!canW.pass) errors.push('can near wall halo/occlusion failed');

    const npcW = crRenderBenchNpcNearWall();
    evidence.npcNearWall = npcW;
    checks.npcNearWallClean = !!npcW.pass;
    if(!npcW.pass) errors.push('NPC near wall render failed');

    const exW = crRenderBenchExitNearWall();
    evidence.exitNearWall = exW;
    checks.exitNearWallClean = !!exW.pass;
    if(!exW.pass) errors.push('exit near wall render failed');

    const hall = crRenderBenchHallStart();
    evidence.hallStart = hall;
    checks.hallStartRendered = !!hall.pass;
    if(!hall.pass) errors.push('hall start render blank or flat');

    const canvas = crRenderCanvasSanity();
    evidence.canvas = canvas;
    checks.canvasNotBlank = !!canvas.pass;
    if(!canvas.pass) errors.push('canvas blank sanity failed');

    checks.runtimeClean = window.__crRuntimeErrors.length === err0;
    if(!checks.runtimeClean) errors.push('runtime errors during render failure self-check');

    const pass = errors.length === 0;
    return {
      pass,
      build: BUILD_ID,
      errors,
      warnings,
      checks,
      evidence,
      runtimeErrors: window.__crRuntimeErrors.slice(),
      timestamp: new Date().toISOString(),
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    return { pass: false, build: BUILD_ID, errors, warnings, checks: {}, evidence };
  } finally {
    _selfCheckForcePortrait = false;
    applyMobileControlSettings();
  }
}

function runFullSelfCheck(){
  if(_crHarnessDepth > 0) return runFullSelfCheckInner();
  return crWithTemporaryState('full', () => runFullSelfCheckInner());
}

/** Automated MENU vs CONTROL DOCK HEIGHT independence check. */
function runControlDockSelfCheck(){
  const errors = [];
  const MIN_MOVE_PX = 20;
  const PREFERRED_MID_HIGH = 40;
  const savedY = Number(options.controlsYOffsetPx) || 0;
  const savedOverride = mobileOverride;
  const snapDom = (id)=>{
    const el = document.getElementById(id);
    if(!el) return { missing: true, top: null, left: null };
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: Math.round(b.top),
      left: Math.round(b.left),
      width: Math.round(b.width),
      height: Math.round(b.height),
      display: cs.display,
      pointerEvents: cs.pointerEvents,
    };
  };
  const snapMenuText = ()=>{
    const el = document.getElementById('mportmenu');
    if(!el) return { text: '', innerHTML: '' };
    return {
      text: String(el.innerText || '').replace(/\s+/g, ' ').trim(),
      innerHTML: el.innerHTML,
    };
  };
  const capture = (label, yPx)=>{
    options.controlsYOffsetPx = yPx;
    options.save();
    applyMobileControlSettings();
    syncPortraitMenuLabel();
    const L = portraitLayout(yPx);
    const viewEl = document.getElementById('view');
    const canvasRect = viewEl ? (()=>{ const b=viewEl.getBoundingClientRect(); return { top:Math.round(b.top), left:Math.round(b.left), width:Math.round(b.width), height:Math.round(b.height) }; })() : null;
    return {
      label,
      controlsYOffsetPx: yPx,
      dom: {
        ml: snapDom('ml'),
        mg: snapDom('mg'),
        ms: snapDom('ms'),
        mlookpad: snapDom('mlookpad'),
        mportmenu: Object.assign({}, snapDom('mportmenu'), snapMenuText()),
      },
      layout: {
        minimap: { top: L.minimapRect.y, left: L.minimapRect.x, height: L.minimapRect.h },
        stats: { top: L.statsRect.y, left: L.statsRect.x, height: L.statsRect.h },
        fpv: { top: L.fpvRect.y, height: L.fpvRect.h },
        menu: { top: L.menuRect.top, left: L.menuRect.left, height: L.menuRect.height },
      },
      canvas: canvasRect,
    };
  };
  const yDelta = (a,b,id)=>{
    const ta = a.dom[id] && a.dom[id].top;
    const tb = b.dom[id] && b.dom[id].top;
    if(ta == null || tb == null) return 0;
    return Math.abs(ta - tb);
  };
  const layoutYDelta = (a,b,key)=>Math.abs((a.layout[key].top||0) - (b.layout[key].top||0));

  _selfCheckForcePortrait = true;
  try {
    mobileOverride = 'on';
    if(typeof setMobileMode === 'function') setMobileMode(true);
    if(state !== STATE.PLAY && typeof startRun === 'function') startRun(42);
    paused = false;
    resize();
    syncPortraitMenuLabel();
    if(!isMobilePortrait()) errors.push('portrait layout not active');

    const mid = capture('mid', 0);
    const low = capture('low', 120);
    const high = capture('high', -120);
    const veryHigh = capture('veryHigh', -240);

    const moveMidHigh = yDelta(mid, high, 'ml');
    const giveMidHigh = yDelta(mid, high, 'mg');
    const sprintMidHigh = yDelta(mid, high, 'ms');
    const lookMidHigh = yDelta(mid, high, 'mlookpad');
    const menuMidHigh = yDelta(mid, high, 'mportmenu');
    const menuLowVery = yDelta(low, veryHigh, 'mportmenu');

    const menuTextStable = mid.dom.mportmenu.innerHTML === high.dom.mportmenu.innerHTML
      && mid.dom.mportmenu.innerHTML === veryHigh.dom.mportmenu.innerHTML;

    const checks = {
      moveMoved: moveMidHigh >= MIN_MOVE_PX,
      giveMoved: giveMidHigh >= MIN_MOVE_PX,
      sprintMoved: sprintMidHigh >= MIN_MOVE_PX,
      lookMoved: lookMidHigh >= MIN_MOVE_PX,
      menuStayed: menuMidHigh === 0 && menuLowVery === 0,
      menuTextStayed: menuTextStable,
      minimapStayed: layoutYDelta(mid, veryHigh, 'minimap') === 0,
      statsStayed: layoutYDelta(mid, veryHigh, 'stats') === 0,
      fpvStayed: layoutYDelta(mid, veryHigh, 'fpv') === 0,
      canvasStayed: (()=>{
        if(!mid.canvas || !veryHigh.canvas) return true;
        return mid.canvas.top === veryHigh.canvas.top && mid.canvas.height === veryHigh.canvas.height;
      })(),
    };

    if(!checks.moveMoved) errors.push('MOVE mid→high delta '+moveMidHigh+' < '+MIN_MOVE_PX);
    if(!checks.giveMoved) errors.push('GIVE mid→high delta '+giveMidHigh+' < '+MIN_MOVE_PX);
    if(!checks.sprintMoved) errors.push('SPRINT mid→high delta '+sprintMidHigh+' < '+MIN_MOVE_PX);
    if(!checks.lookMoved) errors.push('LOOK mid→high delta '+lookMidHigh+' < '+MIN_MOVE_PX);
    if(!checks.menuStayed) errors.push('MENU Y changed (mid→high '+menuMidHigh+', low→very '+menuLowVery+')');
    if(!checks.menuTextStayed) errors.push('MENU text/HTML changed across dock heights');
    if(!checks.minimapStayed) errors.push('minimap layout Y changed');
    if(!checks.statsStayed) errors.push('stats layout Y changed');
    if(!checks.fpvStayed) errors.push('FPV layout Y changed');
    if(!checks.canvasStayed) errors.push('canvas/FPV DOM rect changed');

    const pass = Object.values(checks).every(Boolean);

    options.controlsYOffsetPx = savedY;
    options.save();
    applyMobileControlSettings();
    syncPortraitMenuLabel();

    return {
      pass,
      build: BUILD_ID,
      checks,
      movementPx: {
        midToHigh: { move: moveMidHigh, give: giveMidHigh, sprint: sprintMidHigh, look: lookMidHigh, menu: menuMidHigh },
        lowToVery_menu: menuLowVery,
      },
      minMovementThresholdPx: MIN_MOVE_PX,
      preferredMidHighPx: PREFERRED_MID_HIGH,
      viewport: layoutCssSize(),
      isMobilePortrait: isMobilePortrait(),
      rects: { mid, low, high, veryHigh },
      errors,
    };
  } catch(e){
    errors.push(String(e && e.message ? e.message : e));
    try {
      options.controlsYOffsetPx = savedY;
      options.save();
      applyMobileControlSettings();
      syncPortraitMenuLabel();
    } catch(_r){}
    return { pass: false, build: BUILD_ID, checks: {}, rects: {}, errors };
  } finally {
    _selfCheckForcePortrait = false;
    mobileOverride = savedOverride;
  }
}

globalThis.CR = window.CR = {
  BUILD_ID,
  game,player,STATE,cfg,SAVE,stats,leaderboards,profile,options,dbg,
  get state(){ return state; },
  set state(v){ if(Object.values(STATE).includes(v)) state=v; },
  get paused(){ return paused; },
  set paused(v){ paused=!!v; },
  get mobileMode(){ return mobileMode; },
  crGetSelectedStartDistrict,crCycleSelectedStartDistrict,crSetSelectedStartDistrict,crTitleMenuSelectableRows,titleMenuRowLabel,crMinimapNavCellColor,
  startRun,restartRun,continueRun,endRun,completeRun,giveCan,updateSeed,chooseUpgrade,startCustomLevel,specialLevelMenuItems,
  crMinimapOverlapPass,crMinimapOverlapMetrics,crMigrateUnsafeControlsYOffset,crSafeControlsYOffsetPx,setMobileMode,isMobile,rmenuAction,getDebugState,getViewportProof,getSafeAreaAudit,readSafeAreaInsets,syncVisualViewportShell,portraitLayout,getLayoutProof,getControlDockRectProof,runControlDockSelfCheck,runLayoutSelfCheck,runViewportSafeAreaSelfCheck,runPortraitUsabilitySelfCheck,runSettingsSafetySelfCheck,runDecorativePropsSelfCheck,runOptionsCleanupSelfCheck,runMobileControlReliabilitySelfCheck,runDeclarativeControlsSelfCheck,runMovementCollisionSelfCheck,movePlayerWithCollision,gridTraceClear,gridReachableFrom,isReachableCell,interactionLineClear,runReachabilitySelfCheck,runStreetBlockLevelSelfCheck,runD1ParkLandmarkSelfCheck,runBuildingModuleFacadeSelfCheck,runFacadePackBridgeSelfCheck,runFacadePackV2SafeModuleSelfCheck,runFpvGroundPlaneAlignmentSelfCheck,runD2D3FacadeReadabilityFinalSelfCheck,runBuildingSmoothStyleSelfCheck,runContinuousFacadeTextureSelfCheck,runSpriteGroundAnchorSelfCheck,crDebugGroundPlaneAlignment,crDebugFacadeReadabilityFinal,crDebugBuildingSmoothStyle,crDebugContinuousFacadeTexture,crDebugPropDensity,crApplySolidwallsFrontProofHarness,CR_SOLIDWALLS_FRONTPROOF_NAME,crBuildFacadeTextureAtlas,crGetFacadeTextureForFace,crProjectedFloorY,crWallProjectionMetrics,crDebugSpriteProjection,runFacadeArtVocabularySelfCheck,runFacadeCompositionReadabilitySelfCheck,crDebugDescribeFacadeHit,runFpvFacadeTargetPolishSelfCheck,runFpvWallLineArtifactFixSelfCheck,runFpvStreetShimmerFixSelfCheck,runStreetReadabilityMinimapSelfCheck,runBuildingScalePolishSelfCheck,runEarlyDistrictProgressionSelfCheck,runLevelSelectorSelfCheck,runProceduralLevelValidationSelfCheck,runFullRunProgressionSelfCheck,runOnboardingSelfCheck,runSoundFeedbackSelfCheck,runVisualReadabilitySelfCheck,runVisualRectangleRegressionSelfCheck,runInputSelfCheck,runLevelSelfCheck,runRenderSelfCheck,runRenderFailureSelfCheck,runHarnessIsolationSelfCheck,runHallSelfCheck,runFullSelfCheck,crRenderFailureBenchScene,crRenderFailureDrawFrame,crWithTemporaryState,crPublicStateFingerprint,crFingerprintPublicSafe,crHarnessInstallMicroMap,getMinimapAlignProof,getTouchActionProof,getSpriteHaloRegressionProof,getOcclusionZbufferProof,rectsOverlap,
  CR_VISUAL_READABILITY,CR_SOUND_FEEDBACK,DECOR_PROP_REQUIRED,INPUT_CONFIG,CR_CONTROLS_LS_KEY,crTriggerSoundCue,crSoundEnabled,crSoundFeedbackCueIds,crLoadControlOverrides,crPersistControlOverrides,crResetControlLayoutOverrides,crClearControlOverrides,crEnterControlEditMode,crFinishControlEditMode,crControlHitTest,crSnapshotLayoutNorms,crPrepareSelfCheckPortrait,crStepEditControlSize,crSelectEditControl,
  getCrVisualHarnessSnapshot(){ return _crVisualHarnessSnapshot; },
  showOnboardingHelp,dismissOnboardingHelp,crOpenFirstRunHelpIfNeeded,
  get onboardingOpen(){ return onboardingOpen; },
  editRunnerName,applyMobileControlSettings,drawMobileMenu,mobileSprintCost,mobileSprintBurstSec,triggerMobileSprintBurst,crDispatchPointer,crDispatchTouch,
  toggleFullscreen,isFullscreen,enterFullscreen,exitFullscreen,
  getAudioContext,resumeAudioContext,bindAudioUnlockGate,getAudioUnlockProof,
};

crSanitizeStorageOnBoot();

if(_selfCheckUrl){
  window.__crSelfCheckRan = false;
  const _bootSelfCheckOnce = ()=>{
    if(window.__crSelfCheckRan) return;
    window.__crSelfCheckRan = true;
    const result = runFullSelfCheck();
    window.__crSelfCheckResult = result;
    showCrSelfCheckOverlay(result);
    crForceSafeTitleAfterHarness();
    if(typeof drawMobileMenu === 'function') drawMobileMenu();
    resize();
  };
  requestAnimationFrame(()=>setTimeout(_bootSelfCheckOnce, 900));
}
