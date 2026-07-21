// ---------------------------------------------------------------------------
// SECTION 8 — MINIMAP
// ---------------------------------------------------------------------------
// showMinimap declared earlier (before persistence module)
let portraitMinimapDrawCache = null;
function computePortraitMinimapDraw(mr){
  const innerPad = 10;
  const maxW = Math.max(40, mr.w - innerPad * 2);
  const maxH = Math.max(40, mr.h - innerPad * 2);
  const mSz = Number(options.minimapSizePx) || 68;
  const szScale = Math.max(0.78, Math.min(1.15, mSz / 68));
  const scale = Math.min(maxW / game.MAP_W, maxH / game.MAP_H) * szScale;
  const W = game.MAP_W * scale;
  const H = game.MAP_H * scale;
  const ox = Math.round(mr.x + (mr.w - W) / 2);
  const oy = Math.round(mr.y + (mr.h - H) / 2);
  return { ox, oy, W, H, cell: scale, scale, szScale, innerPad };
}
function drawMinap(){
  const portraitAlways = mobileMode && isMobilePortrait();
  if(!showMinimap && !portraitAlways) return;
  // Mobile minimap uses a capped pixel target. Upgrades reveal more info, not huge size.
  let cell = 4;
  let W=game.MAP_W*cell, H=game.MAP_H*cell;
  if(mobileMode){
    const portrait = isMobilePortrait();
    const base = Number(options.minimapSizePx)||68;
    const infoBonus = player.minimapLevel>=2 ? (portrait ? 6 : 10) : 0;
    const maxCap = portrait ? 999 : 122;
    const target = portrait ? 0 : Math.max(58, Math.min(maxCap, base + infoBonus));
    if(!portrait){
      cell = target / Math.max(game.MAP_W, game.MAP_H);
      W = game.MAP_W * cell;
      H = game.MAP_H * cell;
    }
  }
  const pad = mobileMode ? 6 : 10;
  const portraitMini = isMobilePortrait();
  let ox, oy;
  if(mobileMode && portraitMini){
    const L = portraitLayout();
    const mr = L.minimapRect;
    const d = computePortraitMinimapDraw(mr);
    cell = d.cell;
    W = d.W;
    H = d.H;
    ox = d.ox;
    oy = d.oy;
    portraitMinimapDrawCache = {
      panel: { x: mr.x, y: mr.y, w: mr.w, h: mr.h },
      draw: { ox, oy, W, H, cell: d.cell, scale: d.scale },
      map: { w: game.MAP_W, h: game.MAP_H, aspect: +(game.MAP_W / game.MAP_H).toFixed(3) },
    };
    ctx.fillStyle = '#050403';
    ctx.fillRect(mr.x, mr.y, mr.w, mr.h);
    const framePad = 2;
    ctx.strokeStyle = 'rgba(35,110,210,0.95)'; ctx.lineWidth = 2;
    ctx.strokeRect(ox - framePad, oy - framePad, W + framePad * 2, H + framePad * 2);
    ctx.strokeStyle = 'rgba(190,158,104,0.65)'; ctx.lineWidth = 1;
    ctx.strokeRect(ox - 1, oy - 1, W + 2, H + 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, W, H);
    ctx.clip();
  } else {
    ox = mobileMode && portraitMini ? Math.round((innerWidth-W)/2) : innerWidth - W - pad - (mobileMode ? 4 : 0);
    oy = mobileMode && portraitMini ? Math.round(innerHeight - H - 22) : pad + (mobileMode ? 48 : 0);
  }
  if(!(mobileMode && portraitMini)){
    ctx.fillStyle='rgba(20,16,12,0.7)'; ctx.fillRect(ox-3,oy-3,W+6,H+6);
    ctx.strokeStyle='rgba(180,150,100,0.4)'; ctx.lineWidth=1; ctx.strokeRect(ox-3,oy-3,W+6,H+6);
  }
  ctx.fillStyle = MINIMAP_FLOOR;
  ctx.fillRect(ox, oy, W, H);
  for(let y=0;y<game.MAP_H;y++) for(let x=0;x<game.MAP_W;x++){
    const v=game.map[y][x];
    if(v!==0){
      ctx.fillStyle = crMinimapNavCellColor(x, y, v);
      ctx.fillRect(ox+x*cell, oy+y*cell, cell, cell);
    } else {
      const fc = crMinimapNavCellColor(x, y, 0);
      if(fc !== MINIMAP_FLOOR){
        ctx.fillStyle = fc;
        ctx.fillRect(ox+x*cell, oy+y*cell, cell, cell);
      }
    }
  }
  if(mobileMode && portraitMini) ctx.restore();
  const dot = Math.max(2, cell*1.25);
  const revealCans = player.minimapLevel>=2 || game.revealT>0 || (player.radar && player.radarPingT>0);
  if(revealCans){
    ctx.fillStyle='#ffd24a';
    for(const c of game.pickups) if(!c.taken) ctx.fillRect(ox+c.x*cell-dot/2, oy+c.y*cell-dot/2, dot,dot);
  }
  if(player.minimapLevel>=3 || game.revealT>0){
    for(const n of game.npcs) if(!n.helped){
      ctx.fillStyle = n.kind==='family'?'#4a8fc8': n.kind==='elder'?'#9c8bd0': n.kind==='volunteer'?'#5fb37a':'#d05a48';
      ctx.fillRect(ox+n.x*cell-dot/2, oy+n.y*cell-dot/2, dot,dot);
    }
  }
  if(game.exit){
    const exDot = Math.max(3, dot*1.5);
    const exitReady = game.exit.active && game.helped >= game.quota;
    ctx.fillStyle = exitReady ? '#ffe880' : '#5a5a62';
    ctx.fillRect(ox+game.exit.x*cell-exDot/2, oy+game.exit.y*cell-exDot/2, exDot,exDot);
    if(exitReady){
      ctx.strokeStyle = '#fff4b0';
      ctx.lineWidth = Math.max(1, cell * 0.35);
      ctx.strokeRect(ox+game.exit.x*cell-exDot/2 - 1, oy+game.exit.y*cell-exDot/2 - 1, exDot + 2, exDot + 2);
    }
  }
  // radar pulse ring on minimap
  if(player.radar && player.radarRingT>0){
    const pr=(1-player.radarRingT)*Math.max(W,H);
    ctx.strokeStyle='rgba(255,210,90,'+player.radarRingT.toFixed(2)+')'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(ox+player.x*cell, oy+player.y*cell, pr, 0,7); ctx.stroke();
  }
  // player + facing
  ctx.fillStyle='#ffffff';
  ctx.beginPath(); ctx.arc(ox+player.x*cell, oy+player.y*cell, 2.4, 0, 7); ctx.fill();
  ctx.strokeStyle='#ffffff'; ctx.beginPath();
  ctx.moveTo(ox+player.x*cell, oy+player.y*cell);
  ctx.lineTo(ox+(player.x+Math.cos(player.angle)*1.5)*cell, oy+(player.y+Math.sin(player.angle)*1.5)*cell);
  ctx.stroke();
}

