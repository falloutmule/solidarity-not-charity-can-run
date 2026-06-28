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
function panel(x,y,w,h){ ctx.fillStyle='rgba(18,14,10,0.66)'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='rgba(190,158,104,0.35)'; ctx.lineWidth=1; ctx.strokeRect(x+0.5,y+0.5,w-1,h-1); }
function drawHUD(now){
  ctx.textBaseline='top';
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
  const mh=meta.length*16+10;
  panel(hudX, hudY+ph+6, 360, mh);
  ctx.font='12px monospace';
  ctx.fillStyle='#e9d8b0';
  for(let i=0;i<meta.length;i++) ctx.fillText(meta[i], hudX+6, hudY+ph+12+i*16);

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

