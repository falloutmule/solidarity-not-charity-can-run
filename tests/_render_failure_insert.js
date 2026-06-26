
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
  x0 = Math.max(0, x0); y0 = Math.max(0, y0);
  x1 = Math.min(w, x1); y1 = Math.min(imgA.height, y1);
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
  x0 = Math.max(0, x0); y0 = Math.max(0, y0);
  x1 = Math.min(w, x1); y1 = Math.min(img.height, y1);
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