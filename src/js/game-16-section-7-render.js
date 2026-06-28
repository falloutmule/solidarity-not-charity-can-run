// ---------------------------------------------------------------------------
// SECTION 7 — RENDER
// ---------------------------------------------------------------------------
let _crSpriteGroundHarnessSamples = [];
function drawScene(now){
  if(_crHarnessDepth > 0) _crSpriteGroundHarnessSamples = [];

  // --- SKY (rebuild only if modifier changed) ---
  if(skyBuilt!==game.modifier) buildSky(game.modifier);
  bctx.drawImage(skyCanvas,0,0);

  // --- FLOOR (matte asphalt — low contrast at horizon to avoid wet/reflective read) ---
  const gfloor=bctx.createLinearGradient(0,RH/2,0,RH);
  if(game.modifier==='rainy'){ gfloor.addColorStop(0,'#2e3238'); gfloor.addColorStop(1,'#14161c'); }
  else { gfloor.addColorStop(0,'#3a3a40'); gfloor.addColorStop(0.5,'#323238'); gfloor.addColorStop(1,'#1a1a1e'); }
  bctx.fillStyle=gfloor; bctx.fillRect(0,RH/2,RW,RH/2);
  crDrawFpvStreetReadabilityCues();

  const px=player.x, py=player.y, a=player.angle;
  const dirX=Math.cos(a), dirY=Math.sin(a);
  const planeX=-Math.sin(a)*cfg.fov, planeY=Math.cos(a)*cfg.fov;
  const visRange = game.modifier==='rainy'?9.0:17.0;
  const fog = game.modifier==='rainy'?[40,48,60] : [196,168,128]; // dusty warm fog / cool rainy
  const fogStrength = game.modifier==='rainy'?0.9:0.78;

  // ---- WALLS (DDA, textured) -> fills zbuffer per column (occlusion source of truth) ----
  for(let col=0; col<RW; col++){
    const cameraX = 2*col/RW - 1;
    const rdx = dirX + planeX*cameraX;
    const rdy = dirY + planeY*cameraX;
    let mapX=px|0, mapY=py|0;
    const ddx = Math.abs(1/(rdx||1e-9)), ddy = Math.abs(1/(rdy||1e-9));
    let stepX, stepY, sdx, sdy;
    if(rdx<0){ stepX=-1; sdx=(px-mapX)*ddx; } else { stepX=1; sdx=(mapX+1-px)*ddx; }
    if(rdy<0){ stepY=-1; sdy=(py-mapY)*ddy; } else { stepY=1; sdy=(mapY+1-py)*ddy; }
    let hit=0, side=0, wt=1, steps=0;
    while(hit===0 && steps<80){
      if(sdx<sdy){ sdx+=ddx; mapX+=stepX; side=0; } else { sdy+=ddy; mapY+=stepY; side=1; }
      if(mapX<0||mapY<0||mapX>=game.MAP_W||mapY>=game.MAP_H){ wt=1; hit=1; break; }
      if(game.map[mapY][mapX]!==0){ wt=game.map[mapY][mapX]; hit=1; }
      steps++;
    }
    const perp = (side===0)? (sdx-ddx) : (sdy-ddy);
    const d = Math.max(0.05, perp);
    zbuffer[col]=d;
    const mass = crWallVisualMassScale(mapX, mapY, wt);
    const wallProj = crWallProjectionMetrics(d, mass);
    const lineH = wallProj.massLineH;
    const drawStart = wallProj.wallDrawStart;
    const drawEnd = wallProj.wallDrawEnd;
    const sliceH = drawEnd-drawStart;

    // texture column selection (standard raycaster texturing)
    let wallX = (side===0) ? (py + perp*rdy) : (px + perp*rdx);
    wallX -= Math.floor(wallX);
    const texX = crCoarseWallTexX(wallX, side, rdx, rdy, wt);
    const facadeRole = crResolveBuildingFaceRole(mapX, mapY, side, stepX, stepY);
    const tex = WALL_TEX[facadeRole ? WALL.BUILDING : wt] || WALL_TEX[WALL.BUILDING];
    const texSampleW = (wt === WALL.FENCE) ? 2 : CR_FPV_WALL_TEX_COARSE;

    let sh = (game.wallShade[mapY]?(0.94+0.06*(game.wallShade[mapY][mapX]||0.5)):1);
    if(side===1) sh*=0.72;

    if(facadeRole){
      crDrawComposedFacadeFaceColumn(bctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, facadeRole);
    } else {
      bctx.drawImage(tex, texX, 0, texSampleW, TEXSIZE, col, drawStart, 1, sliceH);
      if(mass > 1.05 && wt !== WALL.FENCE && wt !== WALL.VAN){
        crDrawFpvWorldFacadePanel(bctx, col, drawStart, sliceH, wt, mapX, mapY, side, wallX);
      }
    }
    if(sh<1){ bctx.fillStyle=`rgba(0,0,0,${(1-sh).toFixed(3)})`; bctx.fillRect(col,drawStart,1,sliceH); }
    const f = Math.min(1, d/visRange)*fogStrength;
    if(f>0){ bctx.fillStyle=`rgba(${fog[0]},${fog[1]},${fog[2]},${f.toFixed(3)})`; bctx.fillRect(col,drawStart,1,sliceH); }
  }

  // ---- SPRITES (billboards), projected from WORLD coords (UNCHANGED math) ----
  //   depth  = camera-plane projection (forward distance)
  //   hscr   = direction projection (horizontal factor)
  //   Rendering NEVER mutates obj.x / obj.y.
  const sprites=[];
  function pushSp(obj, tex, hp){
    const rwx = obj.x - px;
    const rwy = obj.y - py;
    const invDet = 1/(planeX*dirY - dirX*planeY);
    const depth = invDet * (-planeY*rwx + planeX*rwy);
    const hscr  = invDet * (dirY*rwx - dirX*rwy);
    if(depth <= 0.12){ dbg.spritesSkipped++; return; }
    sprites.push({obj,tex,hp,depth,hscr});
  }
  // decor first (ground-level), then pickups, then npcs, then exit
  for(const p of game.props)   pushSp(p, propTex(p.kind, p), HEIGHT[p.kind]||0.5);
  for(const c of game.pickups) if(!c.taken) pushSp(c, TEX.can, HEIGHT.can);
  for(const n of game.npcs)    if(!n.helped) pushSp(n, npcSpriteTex(n.kind), HEIGHT[n.kind]||HEIGHT.hungry);
  if(game.exit && game.exit.active) pushSp(game.exit, TEX.exit, HEIGHT.exit);

  sprites.sort((p,q)=>q.depth-p.depth);  // far first

  for(const s of sprites){
    const depth=s.depth;
    const proj = crProjectBillboardSprite(s.obj, s.tex, s.hp, depth, s.hscr, now);
    const screenH = proj.screenH;
    const screenW = proj.screenW;
    const screenX = proj.screenX;
    const top = proj.topY;
    const groundBottomY = proj.groundBottomY;
    const startCol=Math.floor(screenX-screenW/2);
    const endCol=Math.ceil(screenX+screenW/2);
    const midCol = Math.min(RW - 1, Math.max(0, ((startCol + endCol) / 2) | 0));
    const spriteFront = midCol >= 0 && midCol < RW && depth < zbuffer[midCol];
    if(spriteFront && !proj.floating && CR_SPRITE_GROUND_ANCHOR){
      const sw = Math.max(2, screenW * 0.32);
      bctx.fillStyle = 'rgba(0,0,0,0.14)';
      bctx.beginPath();
      bctx.ellipse(screenX, groundBottomY, sw / 2, Math.max(1, screenH * 0.026), 0, 0, Math.PI * 2);
      bctx.fill();
    }
    // SPRITE HALO REGRESSION GUARD — no full-rect sprite fog overlay.
    // Per-column or bbox fillRect fog draws through transparent sprite pixels and
    // creates phone-visible rectangular halos. Walls own distance fog; sprites stay clean.
    for(let col=startCol; col<endCol; col++){
      if(col<0||col>=RW) continue;
      if(depth >= zbuffer[col]) continue;   // OCCLUSION GUARD: per-column zbuffer vs sprite depth
      const u=(col-(screenX-screenW/2))/screenW;
      const srcX=Math.max(0,Math.min(s.tex.width-1, (u*s.tex.width)|0));
      const yoff = 0;
      bctx.drawImage(s.tex, srcX,0,1,s.tex.height, col, top, 1, screenH);
    }
    if(_crHarnessDepth > 0 && _crSpriteGroundHarnessSamples.length < 24){
      _crSpriteGroundHarnessSamples.push({
        kind: s.obj && s.obj.kind ? s.obj.kind : (s.tex === TEX.can ? 'can' : (s.obj === game.exit ? 'exit' : 'sprite')),
        depth: +depth.toFixed(3),
        groundedDelta: proj.groundedDelta,
        yoff: proj.yoffUsed,
        floating: proj.floating
      });
    }
    const isCan = s.tex === TEX.can;
    const isNpc = s.obj && game.npcs.indexOf(s.obj) >= 0;
    const isExit = s.obj === game.exit;
    const exitReady = isExit && game.exit && game.exit.active && game.helped >= game.quota;
    if(spriteFront && isCan && depth < 14 && CR_VISUAL_READABILITY.entityOutlines){
      bctx.fillStyle = 'rgba(255,230,100,0.9)';
      const lc = Math.max(0, startCol), rc = Math.min(RW - 1, endCol - 1);
      if(lc < RW) bctx.fillRect(lc, top, 1, screenH);
      if(rc >= 0) bctx.fillRect(rc, top, 1, screenH);
    }
    if(spriteFront && isNpc && depth < 18 && CR_VISUAL_READABILITY.entityOutlines){
      bctx.strokeStyle = 'rgba(120,220,255,0.75)'; bctx.lineWidth = 1;
      const lc = Math.max(0, startCol), rc = Math.min(RW - 1, endCol - 1);
      if(lc < RW){ bctx.beginPath(); bctx.moveTo(lc, top); bctx.lineTo(lc, top + screenH); bctx.stroke(); }
      if(rc >= 0){ bctx.beginPath(); bctx.moveTo(rc, top); bctx.lineTo(rc, top + screenH); bctx.stroke(); }
    }
    if(spriteFront && exitReady && CR_VISUAL_READABILITY.exitReadyCue){
      const pulse = 0.5 + 0.5 * Math.sin((now || 0) / 200);
      bctx.strokeStyle = 'rgba(255,230,120,' + pulse.toFixed(2) + ')';
      bctx.lineWidth = 1;
      const lc = Math.max(0, startCol), rc = Math.min(RW - 1, endCol - 1);
      if(lc < RW){ bctx.beginPath(); bctx.moveTo(lc, top); bctx.lineTo(rc, top); bctx.stroke(); }
      if(rc >= 0){ bctx.beginPath(); bctx.moveTo(lc, top + screenH); bctx.lineTo(rc, top + screenH); bctx.stroke(); }
    }
  }

  if(_crHarnessDepth > 0){
    _crVisualHarnessSnapshot = {
      hasLivePickup: game.pickups.some(c => !c.taken),
      hasLiveNpc: game.npcs.some(n => !n.helped),
      hasExit: !!game.exit,
      exitReady: !!(game.exit && game.exit.active && game.helped >= game.quota),
      aimNpc: !!game.aimNpc,
      giveReady: !!(game.aimNpc && player.cans >= game.aimNpc.need),
    };
  }

}

