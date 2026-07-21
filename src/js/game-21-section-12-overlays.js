// ---------------------------------------------------------------------------
// SECTION 12 — OVERLAYS
// ---------------------------------------------------------------------------
function dim(){ ctx.fillStyle='rgba(0,0,0,0.74)'; ctx.fillRect(0,0,innerWidth,innerHeight); }
function big(t,x,y,c){ ctx.font='40px monospace'; ctx.fillStyle=c||'#fff'; ctx.textAlign='center'; ctx.fillText(t,x,y); ctx.textAlign='left'; }
function sub(t,x,y,c){ ctx.font='15px monospace'; ctx.fillStyle=c||'#d8c8a0'; ctx.textAlign='center'; ctx.fillText(t,x,y); ctx.textAlign='left'; }
function drawTitleArt(){
  const w=innerWidth, h=innerHeight;
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'rgba(95,62,38,0.96)');
  g.addColorStop(0.45,'rgba(165,104,50,0.78)');
  g.addColorStop(1,'rgba(35,24,18,0.92)');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  // mesa skyline
  ctx.fillStyle='rgba(74,45,32,0.88)';
  ctx.beginPath(); ctx.moveTo(0,h*0.42); ctx.lineTo(w*0.12,h*0.34); ctx.lineTo(w*0.24,h*0.35);
  ctx.lineTo(w*0.32,h*0.30); ctx.lineTo(w*0.48,h*0.33); ctx.lineTo(w*0.62,h*0.27);
  ctx.lineTo(w*0.72,h*0.32); ctx.lineTo(w*0.86,h*0.31); ctx.lineTo(w,h*0.38); ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.fill();
  // strip mall band
  const by=h*0.72;
  ctx.fillStyle='rgba(34,27,22,0.92)'; ctx.fillRect(w*0.12,by,w*0.76,58);
  ctx.fillStyle='rgba(221,170,74,0.50)'; ctx.fillRect(w*0.12,by,w*0.76,8);
  ctx.fillStyle='rgba(46,70,82,0.70)';
  for(let i=0;i<7;i++){ const x=w*0.16+i*w*0.095; ctx.fillRect(x,by+18,w*0.055,28); }
  // small delivery van
  ctx.fillStyle='rgba(235,220,175,0.95)'; ctx.fillRect(w*0.18,by+74,82,28); ctx.fillRect(w*0.24,by+60,42,42);
  ctx.fillStyle='rgba(55,83,98,0.85)'; ctx.fillRect(w*0.25,by+66,22,14);
  ctx.fillStyle='#1a1510'; ctx.beginPath(); ctx.arc(w*0.205,by+104,7,0,7); ctx.arc(w*0.285,by+104,7,0,7); ctx.fill();
  // can logo near title
  const cx=w/2, cy=88;
  ctx.fillStyle='rgba(0,0,0,0.24)'; ctx.beginPath(); ctx.ellipse(cx,cy+28,42,10,0,0,7); ctx.fill();
  ctx.fillStyle='#d8d2c6'; ctx.fillRect(cx-22,cy-28,44,62);
  ctx.fillStyle='#8a8478'; ctx.fillRect(cx-22,cy-28,44,7); ctx.fillRect(cx-22,cy+27,44,7);
  ctx.fillStyle='#3a78c8'; ctx.fillRect(cx-22,cy-4,44,18);
  ctx.fillStyle='#fff4d0'; ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.fillText('CAN',cx,cy+10);
  ctx.textAlign='left';
  // dust vignette
  const vg=ctx.createRadialGradient(cx,h*0.5,Math.min(w,h)*0.2,cx,h*0.5,Math.max(w,h)*0.72);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
}
function drawOverlays(){
  const cx=innerWidth/2;
  const canvasMenus = !mobileMode;
  // --- TITLE SCREEN ---
  if(state===STATE.TITLE){
    drawTitleArt();
    if(!canvasMenus){
      return;
    }
    big('Solidarity Not Charity', cx, 130, '#ffd24a');
    big('Can Run', cx, 170, '#ffd24a');
    sub('A desert-city food run', cx, 210, '#ffe0a0');
    sub('Collect canned goods · help people · hit quota · reach exit', cx, 242, '#f0c878');
    // menu items
    const items=titleMenuItems();
    menuSel=clampMenu(menuSel, 0, items.length-1);
    drawMenuList(items, cx, 270, items.length);
    if(IS_FILE_ORIGIN) sub(FILE_ORIGIN_SAVE_NOTE, cx, innerHeight-52, '#c9a060');
    sub('↑↓ navigate · ENTER select · tap rows · ESC back', cx, innerHeight-30, '#c29a66');
  }
  // --- SEEDED RUN ---
  else if(state===STATE.SEEDED){
    if(canvasMenus){
    dim();
    big('SEEDED RUN', cx, 120, '#ffd24a');
    sub('Enter a numeric seed to reproduce the exact same city layout', cx, 160, '#b8a878');
    const items=[
      {label:'SEED: ['+seedInput.padEnd(10,'_')+']   (type digits, ENTER to start)', enabled:true},
      {label:'START WITH RANDOM SEED'},
      {label:'← BACK TO MENU'},
    ];
    menuSel=clampMenu(menuSel, 0, items.length-1);
    drawMenuList(items, cx, 220, 3);
    }
  }
  // --- STATS ---
  else if(state===STATE.STATS){
    if(canvasMenus){
    dim();
    big('STATISTICS', cx, 80, '#ffd24a');
    const s=stats.data;
    const L=[
      ['Runs started', s.totalRunsStarted],
      ['Runs completed', s.totalRunsCompleted],
      ['Runs failed', s.totalRunsFailed],
      ['Best score', s.bestScore],
      ['Fastest completion', s.fastestCompletedSec!==null ? fmtTime(s.fastestCompletedSec) : '—'],
      ['Highest district', s.highestDistrict],
      ['Cans collected', s.totalCansCollected],
      ['Cans delivered', s.totalCansDelivered],
      ['People helped', s.totalPeopleHelped],
      ['  Hungry', s.helpedByKind.hungry],
      ['  Family', s.helpedByKind.family],
      ['  Elder', s.helpedByKind.elder],
      ['  Volunteer', s.helpedByKind.volunteer],
      ['Upgrades chosen', s.totalUpgradesChosen],
      ['Time played', fmtTime(Math.round(s.totalTimePlayedSec))],
    ];
    drawStatsPanel(L, cx, 120);
    const items=[{label:'← BACK TO MENU'},{label:'RESET STATS'}];
    menuSel=clampMenu(menuSel, 0, items.length-1);
    if(menuSel===1){ items[1].action=()=>confirmAction={msg:'Reset all stats? This cannot be undone.', onYes:()=>stats.reset(), onNo:()=>{}}; }
    drawMenuList(items, cx, 120+L.length*22+20, items.length);
    }
  }
  // --- LEADERBOARDS ---
  else if(state===STATE.LB){
    if(canvasMenus){
    dim();
    big('LEADERBOARDS', cx, 80, '#ffd24a');
    const boards=[
      {key:'bestScores', title:'BEST SCORES', sort:'score'},
      {key:'fastestRuns', title:'FASTEST RUNS', sort:'time'},
      {key:'highestDistrict', title:'HIGHEST DISTRICT', sort:'district'},
    ];
    menuSel=clampMenu(menuSel, 0, 2);
    const sel=menuSel;
    // tabs
    for(let i=0;i<3;i++){
      const tx=cx-280+i*200;
      const active=i===sel;
      ctx.font='14px monospace'; ctx.textAlign='center';
      ctx.fillStyle=active?'#ffd24a':'#8a7a5a';
      ctx.fillText('['+(i+1)+'] '+boards[i].title, tx, 130);
      if(active){ ctx.strokeStyle='#ffd24a'; ctx.beginPath(); ctx.moveTo(tx-60,138); ctx.lineTo(tx+60,138); ctx.stroke(); }
    }
    ctx.textAlign='left';
    // entries
    const arr=leaderboards.data[boards[sel].key]||[];
    if(arr.length===0){ sub('No entries yet — complete a run!', cx, 180, '#8a7a5a'); }
    else {
      ctx.font='12px monospace';
      for(let i=0;i<Math.min(arr.length,12);i++){
        const e=arr[i];
        const y=170+i*20;
        const row=`#${i+1}  ${e.name.padEnd(10)}  ${String(e.score).padStart(6)}  ${fmtTime(e.durationSec).padStart(8)}  D${e.district}  seed:${e.seed}  [${e.modifier}]${e.completed?' ✓':''}`;
        const tw=ctx.measureText(row).width;
        ctx.fillStyle='rgba(20,16,10,0.5)'; ctx.fillRect(cx-tw/2-6, y-13, tw+12, 17);
        ctx.fillStyle = e.completed?'#d8c8a0':'#8a7a5a'; ctx.textAlign='center';
        ctx.fillText(row, cx, y);
        ctx.textAlign='left';
      }
    }
    sub('[1] Best Scores  [2] Fastest  [3] District  · ENTER back', cx, innerHeight-30, '#8a7a5a');
    }
  }
  // --- OPTIONS / HELP ---
  else if(state===STATE.OPTIONS){
    if(canvasMenus){
    dim();
    big('OPTIONS & HELP', cx, 80, '#ffd24a');
    const optItems=[
      {label:'NAME: '+(profile.name||'RUNNER')+'   (tap to edit)'},
      {label:'LOOK SPEED: '+lookSpeedLabel(options.lookSpeed)},
      {label:'TOUCH DEADZONE: '+options.touchDeadzonePx},
      {label:'MOBILE CONTROLS: ' + options.mobileControls.toUpperCase()},
      {label:'MINIMAP DEFAULT: '+(options.minimapDefault?'ON':'OFF')},
      {label:'REDUCE VISUAL FX: '+(options.reduceFx?'ON':'OFF')},
      {label:'SOUND: '+(options.soundOn !== false?'ON':'OFF')},
      {label:'CLEAR ACTIVE SAVE'},
      {label:'RESET ALL LOCAL DATA'},
      {label:'← BACK TO MENU'},
    ];
    menuSel=clampMenu(menuSel, 0, optItems.length-1);
    drawMenuList(optItems, cx, 120, optItems.length);
    // help text
    ctx.font='12px monospace'; ctx.fillStyle='#8a7a5a'; ctx.textAlign='center';
    const help=[
      'KEYBOARD: WASD/arrows move · Q/E or mouse turn · SHIFT sprint',
      'SPACE/click give can · M minimap · P/ESC pause · R restart',
      'MOBILE: left stick=move · right zone=turn · GIVE/SPRINT/MAP/PAUSE',
      'People: hungry(1) · family(3) · elder(speed boost) · volunteer(reveal)',
    ];
    for(let i=0;i<help.length;i++) ctx.fillText(help[i], cx, innerHeight-90+i*16);
    ctx.textAlign='left';
    }
  }
  // --- UPGRADE (existing, preserved) ---
  else if(state===STATE.UPGRADE){
    if(canvasMenus){
    dim();
    big('DISTRICT '+game.district+' CLEARED', cx, 100, '#9cf09a');
    sub('Score so far: '+game.totalScore+'   (modifier x'+game.scoreMult+')', cx, 140);
    const u=player.upgrades; const owned=[];
    if(u.pack)owned.push('pack×'+u.pack); if(u.sprint)owned.push('sprint×'+u.sprint);
    if(u.hand)owned.push('hand×'+u.hand); if(u.map)owned.push('map×'+u.map); if(u.radar)owned.push('radar');
    sub('Owned: '+(owned.length?owned.join('  '):'(none yet)'), cx, 165, '#8fa0ff');
    const off=window._offered||[];
    const bw=240, bh=130, gap=30;
    const total=off.length*bw+(off.length-1)*gap;
    let sx=cx-total/2;
    ctx.font='14px monospace';
    for(let i=0;i<off.length;i++){
      const x=sx+i*(bw+gap), y=innerHeight/2-bh/2;
      ctx.fillStyle='rgba(30,24,16,0.95)'; ctx.fillRect(x,y,bw,bh);
      ctx.strokeStyle='rgba(200,168,110,0.6)'; ctx.lineWidth=2; ctx.strokeRect(x,y,bw,bh);
      ctx.fillStyle='#ffd24a'; ctx.textAlign='center';
      ctx.fillText('['+(i+1)+'] '+off[i].name, x+bw/2, y+32);
      ctx.fillStyle='#d8c8a0'; ctx.fillText(off[i].desc, x+bw/2, y+62);
      ctx.fillStyle='#8fa0ff'; ctx.fillText('press '+(i+1), x+bw/2, y+102);
      ctx.textAlign='left';
    }
    sub('pick an upgrade (1/2/3) to descend into the next district', cx, innerHeight/2+bh/2+40);
    }
  }
  // --- RESULTS SCREEN ---
  else if(state===STATE.RESULTS){
    if(canvasMenus){
    dim();
    const passed=game.run.completed;
    big(passed?'RUN COMPLETE!':'RUN OVER', cx, 90, passed?'#9cf09a':'#ff7a6a');
    const r=game.run;
    const L=[
      ['Result', passed?'COMPLETED':'FAILED (time up)'],
      ['Final score', game.totalScore],
      ['District reached', game.district-(passed?0:1)],
      ['Cans collected', r.cansCollected],
      ['Cans delivered', r.cansDelivered],
      ['People helped', game.helped],
      ['Run time', fmtTime(Math.round(r.runTime))],
      ['Seed', r.seedUsed],
      ['Modifier', r.modifierUsed],
      ['Upgrades chosen', r.upgradesChosen],
    ];
    if(r.leaderboardRank){ L.push(['Leaderboard rank','#'+r.leaderboardRank+' (Best Scores)']); }
    drawStatsPanel(L, cx, 130);
    const items=resultItems();
    menuSel=clampMenu(menuSel, 0, items.length-1);
    drawMenuList(items, cx, 130+L.length*22+20, items.length);
    }
  }
  // --- PAUSE MENU ---
  if(paused && state===STATE.PLAY){
    if(canvasMenus){
    dim();
    big('PAUSED', cx, innerHeight/2-130, '#ffd24a');
    const pi=pauseItems();
    menuSel=clampMenu(menuSel, 0, pi.length-1);
    drawMenuList(pi, cx, innerHeight/2-80, pi.length);
    // status info
    ctx.font='12px monospace'; ctx.fillStyle='#8a7a5a'; ctx.textAlign='center';
    ctx.fillText('District '+game.district+' · seed '+game.seed+' · ['+game.modifier+'] · score '+game.totalScore, cx, innerHeight/2+40);
    ctx.fillText('Save: '+(SAVE.hasValid()?'active':'none'), cx, innerHeight/2+60);
    ctx.textAlign='left';
    }
  }
  // --- CONFIRMATION DIALOG (top-most) ---
  if(confirmAction){
    ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(0,0,innerWidth,innerHeight);
    const pw=400, ph=160;
    const px=cx-pw/2, py=innerHeight/2-ph/2;
    ctx.fillStyle='rgba(30,24,16,0.98)'; ctx.fillRect(px,py,pw,ph);
    ctx.strokeStyle='#ffd24a'; ctx.lineWidth=2; ctx.strokeRect(px,py,pw,ph);
    ctx.font='16px monospace'; ctx.fillStyle='#ffd24a'; ctx.textAlign='center';
    // wrap text
    const words=confirmAction.msg.split(' ');
    let line='', lineNum=0;
    for(const w of words){ if((line+w).length>40){ ctx.fillText(line, cx, py+40+lineNum*22); lineNum++; line=w+' '; } else line+=w+' '; }
    ctx.fillText(line, cx, py+40+lineNum*22);
    // yes/no
    const noX=cx-80, yesX=cx+30, by=py+ph-50;
    ctx.font='15px monospace';
    ctx.fillStyle=confirmSel===0?'#ffd24a':'#8a7a5a'; ctx.fillText('[NO]', noX, by);
    ctx.fillStyle=confirmSel===1?'#9cf09a':'#8a7a5a'; ctx.fillText('[YES]', yesX, by);
    ctx.fillStyle='#8a7a5a'; ctx.font='12px monospace';
    ctx.fillText('←→ select · ENTER confirm', cx, by+22);
    ctx.textAlign='left';
  }
}
// helper: clamp menu selection
function clampMenu(sel, min, max){ return Math.max(min, Math.min(max, sel)); }
// helper: draw a list of selectable menu items
function drawMenuList(items, cx, startY, count){
  const itemH=30;
  menuHit.startY=startY; menuHit.count=0; menuHit.itemH=itemH;
  let row = 0;
  for(let i=0;i<count;i++){
    const y=startY+row*itemH;
    if(items[i].header){
      ctx.font='12px monospace'; ctx.textAlign='center';
      ctx.fillStyle='#8a7a5a'; ctx.fillText(items[i].header, cx, y+12);
      ctx.textAlign='left';
      row++;
      continue;
    }
    menuHit.count++;
    const sel=i===menuSel;
    const en=items[i].enabled!==false;
    const rowLabel = (state===STATE.TITLE && typeof titleMenuRowLabel==='function') ? titleMenuRowLabel(items[i]) : items[i].label;
    ctx.font='16px monospace'; ctx.textAlign='center';
    const tw=ctx.measureText(rowLabel).width;
    if(sel){ ctx.fillStyle='rgba(255,210,74,0.15)'; ctx.fillRect(cx-tw/2-16, y-4, tw+32, 24); ctx.fillStyle=en?'#ffd24a':'#555'; ctx.fillText('▶ '+rowLabel, cx, y+12); }
    else { ctx.fillStyle=en?'#d8c8a0':'#555'; ctx.fillText('  '+rowLabel, cx, y+12); }
    ctx.textAlign='left';
    row++;
  }
}
// helper: draw a stats panel
function drawStatsPanel(lines, cx, startY){
  ctx.font='14px monospace';
  const pw=460, lineH=22;
  const ph=lines.length*lineH+20;
  const px=cx-pw/2;
  ctx.fillStyle='rgba(18,14,10,0.8)'; ctx.fillRect(px,startY-8,pw,ph);
  ctx.strokeStyle='rgba(190,158,104,0.3)'; ctx.lineWidth=1; ctx.strokeRect(px,startY-8,pw,ph);
  for(let i=0;i<lines.length;i++){
    ctx.fillStyle='#8a7a5a'; ctx.textAlign='left';
    ctx.fillText(lines[i][0], px+16, startY+i*lineH+8);
    ctx.fillStyle='#e9d8b0'; ctx.textAlign='right';
    ctx.fillText(String(lines[i][1]), px+pw-16, startY+i*lineH+8);
  }
  ctx.textAlign='left';
}
function fmtTime(sec){
  if(sec===null||sec===undefined) return '—';
  const m=Math.floor(sec/60), s=Math.floor(sec%60);
  return m+':'+String(s).padStart(2,'0');
}

// upgrade choice keys
function chooseUpgrade(idx){
  const off=window._offered||[];
  if(idx>=0 && off[idx]){
    applyUpgrade(off[idx].id);
    game.run.upgradesChosen++;
    stats.data.upgradeCounts[off[idx].id] = (stats.data.upgradeCounts[off[idx].id]||0)+1;
    stats.save();
    if(game.run.customLevel){
      setMsg('Special level complete — no further districts.');
      completeRun();
      return;
    }
    game.district++;
    game.run.highestDistrict = game.district;
    game.modifier=pickModifier();
    genCity(game.seed, game.district, game.modifier);
    player.cans=0; player.stamina=player.maxStamina;
    state=STATE.PLAY; paused=false;
    crTriggerSoundCue('upgradeChosen');
    SAVE.save();
  }
}
addEventListener('keydown',e=>{
  if(state===STATE.UPGRADE){
    let idx=-1;
    if(e.code==='Digit1')idx=0; if(e.code==='Digit2')idx=1; if(e.code==='Digit3')idx=2;
    chooseUpgrade(idx);
  }
});

