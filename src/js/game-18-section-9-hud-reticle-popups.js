// ---------------------------------------------------------------------------
// SECTION 9 — HUD + RETICLE + POPUPS
// ---------------------------------------------------------------------------
function staminaBar(){
  const block = mobileSprintCost();
  const blocks = Math.max(3, Math.min(8, Math.round(player.maxStamina/block)));
  const filled = Math.max(0, Math.min(blocks, Math.floor((player.stamina+0.01)/block)));
  let s=''; for(let i=0;i<blocks;i++) s += i<filled?'▰':'▱';
  const frac = Math.max(0, Math.min(1, (player.stamina % block)/block));
  return s+' '+Math.round(frac*100)+'%';
}
function upgradeTag(){
  const u=player.upgrades; const parts=[];
  if(u.pack)   parts.push('pack×'+u.pack);
  if(u.sprint) parts.push('sprint×'+u.sprint);
  if(u.hand)   parts.push('hand×'+u.hand);
  if(u.map)    parts.push('map×'+u.map);
  if(u.radar)  parts.push('radar');
  return parts.length?('UPG '+parts.join('  ')):'';
}
function crFmtFacadeDebugValue(v){
  if(typeof v === 'number'){
    return Number.isFinite(v) ? v.toFixed(3) : String(v);
  }
  if(v === undefined || v === null) return '';
  return String(v);
}

function crWrapDebugText(prefix, text, maxLen){
  const s = String(prefix || '') + String(text || '');
  if(s.length <= maxLen) return [s];
  const out = [];
  let rest = s;
  while(rest.length > maxLen){
    out.push(rest.slice(0, maxLen));
    rest = '  ' + rest.slice(maxLen);
  }
  out.push(rest);
  return out;
}

function crFacadeDebugLines(hit){
  const fmt = crFmtFacadeDebugValue;
  if(!hit){
    return [
      'PREFAB DEBUG (center ray)',
      'no prefab hit'
    ];
  }

  if(hit.isPrefab){
    return [
      'PREFAB DEBUG (center ray)',
      'buildId: ' + (hit.buildId || ''),
      'bid: ' + fmt(hit.bid),
      'assetId: ' + (hit.assetId || ''),
      'kind: ' + (hit.kind || ''),
      'footprint: ' + fmt(hit.fw) + 'x' + fmt(hit.fh),
      'renderMode: ' + (hit.renderMode || ''),
      'faceDir: ' + (hit.faceDir || ''),
      'faceU: ' + fmt(hit.faceU),
      'lx: ' + fmt(hit.lx) + ' ly: ' + fmt(hit.ly),
      'assetLoaded: ' + (hit.assetLoaded || hit.renderSource || 'missing'),
      'renderSource: ' + (hit.renderSource || hit.assetLoaded || 'missing')
    ];
  }

  // Legacy FACADESKINS debug is intentionally hidden in prefabgrid1. If future
  // work needs it, add a separate legacy debug flag instead of reusing prefab debug.
  if(typeof BUILD_ID !== 'undefined' && (BUILD_ID === 'prefabgrid1' || BUILD_ID === 'stripmall001proof1')){
    return [
      'PREFAB DEBUG (center ray)',
      'legacy facade hit hidden in prefabgrid1',
      'renderMode: non-prefab legacy'
    ];
  }

  const kinds = Array.isArray(hit.elementKinds) ? hit.elementKinds.join(',') : '';
  const lines = [
    'FACADE DEBUG (center ray)',
    'buildId: ' + (hit.buildId || ''),
    'drewSkin: ' + (!!hit.drewSkin),
    'mapX: ' + fmt(typeof hit.mapX === 'number' ? hit.mapX : 0) + ' mapY: ' + fmt(typeof hit.mapY === 'number' ? hit.mapY : 0),
    'faceDir: ' + (hit.faceDir || ''),
    'skinId: ' + (hit.skinId || ''),
    'materialKey: ' + (hit.materialKey || ''),
    'spanCells: ' + fmt(hit.spanCells) + ' spanValid: ' + (!!hit.spanValid) + ' var: ' + (hit.spanVariant || ''),
    'faceRole: ' + (hit.faceRole || ''),
    'profileFamily: ' + (hit.profileFamily || ''),
    'source: ' + (hit.source || ''),
    'u: ' + fmt(typeof hit.u === 'number' ? hit.u : 0) + ' sx: ' + fmt(typeof hit.sx === 'number' ? hit.sx : 0),
    'templateId: ' + (hit.templateId || ''),
    'elementCount: ' + fmt(hit.elementCount)
  ];
  lines.push.apply(lines, crWrapDebugText('elementKinds: ', kinds, 44));
  lines.push(
    'scheduleCells: ' + fmt(hit.scheduleCells) + ' exactSpanCells: ' + fmt(hit.exactSpanCells),
    'scheduleScale: ' + fmt(hit.scheduleScale),
    'repeatRuns: ' + fmt(hit.repeatedAdjacentKindRuns) + ' blankCells: ' + fmt(hit.maxBlankScheduleCells)
  );
  return lines;
}
function crFacadeDebugHit(){
  // Get debug data from real game object (works whether window.game is set or not)
  const g = typeof game !== 'undefined' ? game : (typeof window !== 'undefined' && window.game ? window.game : null);
  return g ? g.debugFacadeHit : null;
}
function crInitFacadeDebugFromUrl(){
  const g = typeof game !== 'undefined' ? game : (typeof window !== 'undefined' && window.game ? window.game : null);
  if(!g || g.__prefabDebugUrlInitialized) return;
  g.__prefabDebugUrlInitialized = true;
  const urlOn = (typeof location !== 'undefined') && (new URLSearchParams(location.search)).get('facadedebug') === '1';
  g.prefabDebugEnabled = !!urlOn;
}
function crFacadeDebugEnabled(){
  crInitFacadeDebugFromUrl();
  const g = typeof game !== 'undefined' ? game : (typeof window !== 'undefined' && window.game ? window.game : null);
  return !!(g && g.prefabDebugEnabled);
}
function drawDesktopFacadeDebug(){
  const dbg = crFacadeDebugHit();
  const lines = crFacadeDebugLines(dbg);
  const n = lines.length;
  const hudX = 8, hudY = innerHeight - Math.min(innerHeight - 8, n * 15 + 36);
  ctx.font='11px monospace';
  ctx.fillStyle='rgba(18,14,10,0.85)';
  ctx.fillRect(hudX, hudY, 440, Math.max(180, n * 15 + 16));
  ctx.strokeStyle='rgba(190,158,104,0.35)';
  ctx.lineWidth=1;
  ctx.strokeRect(hudX+0.5, hudY+0.5, 439, Math.max(179, n * 15 + 15));
  ctx.fillStyle='#e9d8b0';
  for(let i=0;i<n;i++){
    ctx.fillText(lines[i], hudX+8, hudY+8+i*15);
  }
}
function drawPortraitFacadeDebug(){
  const dbg = crFacadeDebugHit();
  const lines = crFacadeDebugLines(dbg);
  const L = typeof portraitLayout === 'function' ? portraitLayout() : null;
  const x = (L && L.fpvRect) ? L.fpvRect.x + 4 : 4;
  const y = (L && L.fpvRect) ? L.fpvRect.y + 4 : 4;
  const n = lines.length;
  ctx.save();
  ctx.font='9px monospace';
  ctx.fillStyle='rgba(18,14,10,0.85)';
  ctx.fillRect(x, y, 320, n * 11 + 10);
  ctx.strokeStyle='rgba(190,158,104,0.55)';
  ctx.lineWidth=1;
  ctx.strokeRect(x+0.5, y+0.5, 319, n * 11 + 9);
  ctx.fillStyle='#e9d8b0';
  for(let i=0;i<n;i++){
    ctx.fillText(lines[i], x+4, y+4+i*11);
  }
  ctx.restore();
}
function panel(x,y,w,h){ ctx.fillStyle='rgba(18,14,10,0.66)'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(190,158,104,0.35)'; ctx.lineWidth=1; ctx.strokeRect(x+0.5,y+0.5,w-1,h-1); }
function drawHUD(now){
  ctx.textBaseline='top';
  
  // Facade debug: render in both portrait and desktop modes
  const fdOn = crFacadeDebugEnabled();
  if(fdOn){
    if(mobileMode && isMobilePortrait()){
      drawPortraitFacadeDebug();
    } else {
      drawDesktopFacadeDebug();
    }
  }
  
  if(mobileMode && isMobilePortrait()){
    drawPortraitStatsPanel();
    drawPortraitFpvOverlay(now);
    return;
  }
  const hudX = 8;
  const hudY = 8;
  const q=(game.helped>=game.quota && game.exit && game.exit.active)?'EXIT OPEN':('quota '+game.helped+'/'+game.quota);
  const cdTag = player.giveCD>0 ? ('  handoff '+player.giveCD.toFixed(1)+'s') : '';
  const lines=[
    ['TIME',  Math.max(0,game.timeLeft).toFixed(1),  game.timeLeft<20?'#ff9a6a':'#e9e9ef'],
    ['CANS',  player.cans+'/'+player.maxCans,        player.cans>0?'#ffd24a':'#e9e9ef'],
    ['PEOPLE',game.helped+'/'+game.quota+' helped · '+game.delivered+' delivered'+cdTag, '#9fffb6'],
    ['STAM',  staminaBar(),                          player.stamina<15?'#ff9a6a':'#cfe0ff'],
  ];
  // main panel
  const ph=lines.length*18+14;
  panel(hudX,hudY,360,ph);
  ctx.font='13px monospace';
  for(let i=0;i<lines.length;i++){
    ctx.fillStyle='#8a7a5a'; ctx.fillText(lines[i][0], hudX+6, hudY+5+i*18);
    ctx.fillStyle=lines[i][2]; ctx.fillText(lines[i][1], hudX+62, hudY+5+i*18);
  }
  // meta panel (seed/district/modifier/score)
  const meta=['DISTRICT '+game.district+'   ['+game.modifier.toUpperCase()+']   x'+game.scoreMult,
              'SEED '+game.seed+'    SCORE '+game.totalScore];
  const ut=upgradeTag(); if(ut) meta.push(ut);
  const extraProof = (game.d1CustomBuildingRegistry && game.d1CustomBuildingRegistry.slot_02) ? ['D1 PROOF slot_02 custom_next_001'] : [];
  const mh=(meta.length + extraProof.length)*16 + 10;
  panel(hudX, hudY+ph+6, 360, mh);
  ctx.font='12px monospace';
  ctx.fillStyle='#e9d8b0';
  for(let i=0;i<meta.length;i++) ctx.fillText(meta[i], hudX+6, hudY+ph+12+i*16);
  for(let j=0;j<extraProof.length;j++){
    ctx.font='bold 11px monospace';
    ctx.fillStyle='#ffd86a';
    ctx.fillText(extraProof[j], hudX+6, hudY+ph+12+(meta.length+j)*16);
  }

  // controls hint
  if(!mobileMode){
    ctx.font='11px monospace'; ctx.fillStyle='#9a8e72';
    ctx.fillText('WASD move · Q/E or mouse turn · SPACE/CLICK give · SHIFT sprint · M map · P pause · R restart', 10, innerHeight-18);
  }

  // center reticle
  const cx=innerWidth/2, cy=innerHeight/2;
  const aim=game.aimNpc;
  if(aim){
    const ok=player.cans>=aim.need;
    ctx.strokeStyle = ok?'rgba(140,255,170,0.95)':'rgba(255,140,90,0.95)';
    ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,14,0,7); ctx.stroke();
    if(ok && CR_VISUAL_READABILITY.giveTargetHighlight){
      ctx.strokeStyle='rgba(90,255,150,0.55)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(cx,cy,19,0,7); ctx.stroke();
      ctx.font='bold 11px monospace'; ctx.fillStyle='#8dffb8'; ctx.textAlign='center';
      ctx.fillText('GIVE', cx, cy - 20);
      ctx.textAlign='left';
    }
    // tick marks
    ctx.beginPath();
    ctx.moveTo(cx-15,cy); ctx.lineTo(cx-7,cy);
    ctx.moveTo(cx+7,cy); ctx.lineTo(cx+15,cy);
    ctx.moveTo(cx,cy-15); ctx.lineTo(cx,cy-7);
    ctx.moveTo(cx,cy+7); ctx.lineTo(cx,cy+15); ctx.stroke();
    ctx.font='13px monospace'; ctx.fillStyle= ok?'#a8ffc0':'#ffb088'; ctx.textAlign='center';
    const lbl = aim.kind.toUpperCase()+' · needs '+aim.need+' can'+(aim.need>1?'s':'')+' · you have '+player.cans;
    // bg for readability
    const lw=ctx.measureText(lbl).width;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(cx-lw/2-6, cy+16, lw+12, 18);
    ctx.fillStyle= ok?'#a8ffc0':'#ffb088'; ctx.fillText(lbl, cx, cy+19);
    ctx.textAlign='left';
  } else {
    ctx.fillStyle='rgba(220,220,228,0.8)'; ctx.fillRect(cx-1,cy-5,2,4); ctx.fillRect(cx-1,cy+1,2,4);
    ctx.fillRect(cx-5,cy-1,4,2); ctx.fillRect(cx+1,cy-1,4,2);
  }

  // message banner
  if(game.msg && game.msgT>0){
    ctx.font='17px monospace';
    const mw=ctx.measureText(game.msg).width;
    ctx.fillStyle='rgba(20,16,8,0.6)'; ctx.fillRect(cx-mw/2-12, 50, mw+24, 26);
    ctx.fillStyle='#ffd24a'; ctx.textAlign='center'; ctx.fillText(game.msg, cx, 56); ctx.textAlign='left';
  }

  // score popups
  for(const p of game.popups){
    ctx.font='14px monospace'; ctx.fillStyle=p.color; ctx.textAlign='center';
    ctx.globalAlpha=Math.max(0,Math.min(1,p.life));
    const pw=ctx.measureText(p.text).width;
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(p.x-pw/2-4, p.y-2, pw+8, 16);
    ctx.fillStyle=p.color; ctx.fillText(p.text, p.x, p.y);
    ctx.globalAlpha=1; ctx.textAlign='left';
  }

  // pickup flash (white)
  if(game.flash>0){ ctx.fillStyle='rgba(255,240,200,'+(game.flash*0.5).toFixed(3)+')'; ctx.fillRect(0,0,innerWidth,innerHeight); }
  // handoff pulse (green)
  if(game.handoffFx>0){ ctx.fillStyle='rgba(120,255,160,'+(game.handoffFx*0.25).toFixed(3)+')'; ctx.fillRect(0,0,innerWidth,innerHeight); }

  if(DEBUG){
    ctx.font='12px monospace'; ctx.fillStyle='#9fe0ff';
    const d=[
      'DEBUG cans='+dbg.cansSpawned+' npcs='+dbg.npcsSpawned+' props='+dbg.props,
      'invalid='+dbg.invalidPlacements+' rejected='+dbg.rejectedSpawns+' reach='+dbg.reachableCells,
      'skipped sprites='+dbg.spritesSkipped+' pickups_live='+game.pickups.filter(c=>!c.taken).length,
    ];
    for(let i=0;i<d.length;i++) ctx.fillText(d[i], innerWidth-380, 13+i*16);
  }
}

function crFacadeDebugHudLineSelfCheck(){
  const hit = {
    buildId: 'facadeskins8', drewSkin: true, mapX: 1, mapY: 2,
    faceDir: 'south', skinId: 'skin_storefront_front', materialKey: 'red_brick',
    spanCells: 6, spanValid: true, spanVariant: 'medium', faceRole: 'front',
    profileFamily: 'storefront', source: 'exposedFaceRun', u: 0.123, sx: 44,
    templateId: 'storefront.front.medium.scaledTo6', elementCount: 6,
    elementKinds: ['signBand','storeWindow','blankPanel','glassDoor','storeWindow','meter'],
    scheduleCells: 6, exactSpanCells: 6, scheduleScale: 1.2,
    repeatedAdjacentKindRuns: 0, maxBlankScheduleCells: 1
  };
  const lines = crFacadeDebugLines(hit);
  const pass =
    lines.some(s => s.includes('templateId:')) &&
    lines.some(s => s.includes('elementCount:')) &&
    lines.some(s => s.includes('elementKinds:')) &&
    lines.some(s => s.includes('scheduleCells:')) &&
    lines.some(s => s.includes('exactSpanCells:')) &&
    lines.some(s => s.includes('scheduleScale:')) &&
    lines.some(s => s.includes('repeatRuns:')) &&
    lines.some(s => s.includes('blankCells:'));
  return { pass, lines, lineCount: lines.length };
}

