// ---------------------------------------------------------------------------
// SECTION 6 — PROCEDURAL ASSETS
// ---------------------------------------------------------------------------
function newTex(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
const TEXSIZE = 64;

// --- WALL TEXTURE GENERATORS (64x64 tileable-ish, readable at raycast res) ---
function mkTex(drawFn){ const c=newTex(TEXSIZE,TEXSIZE), x=c.getContext('2d'); drawFn(x); return c; }

// noise helper for textures
function noiseFill(x, base, vary, density){
  for(let i=0;i<density;i++){
    const px=(Math.random()*TEXSIZE)|0, py=(Math.random()*TEXSIZE)|0;
    const v=(Math.random()-0.5)*vary;
    x.fillStyle=`rgb(${(base[0]+v)|0},${(base[1]+v)|0},${(base[2]+v)|0})`;
    x.fillRect(px,py,1+((Math.random()*2)|0),1+((Math.random()*2)|0));
  }
}

const WALL_TEX = {
  // tan stucco — sun-bleached adobe
  [WALL.BUILDING]: mkTex(x=>{
    x.fillStyle='#c4ae82'; x.fillRect(0,0,TEXSIZE,TEXSIZE);
    for(let i=0;i<18;i++){
      const bw = 10+((Math.random()*14)|0), bh = 8+((Math.random()*12)|0);
      const px = (Math.random()*(TEXSIZE-bw))|0, py = (Math.random()*(TEXSIZE-bh))|0;
      const v = (Math.random()-0.5)*14;
      x.fillStyle=`rgb(${(198+v)|0},${(178+v)|0},${(138+v)|0})`;
      x.fillRect(px,py,bw,bh);
    }
    x.fillStyle='rgba(255,235,200,0.12)'; x.fillRect(4,6,28,20);
    x.fillStyle='rgba(100,78,48,0.08)'; x.fillRect(32,36,24,22);
  }),
  // red/brown brick storefront — wide courses, not pinstripes
  [WALL.BRICK]: mkTex(x=>{
    x.fillStyle='#8e4840'; x.fillRect(0,0,TEXSIZE,TEXSIZE);
    const bw=28, bh=10;
    for(let row=0; row*bh<TEXSIZE; row++){
      const off=(row%2)? bw/2:0;
      for(let bx=-bw; bx<TEXSIZE+bw; bx+=bw){
        x.fillStyle = (row&1)?'#9a5048':'#8a4640';
        x.fillRect(bx+off+2, row*bh+2, bw-4, bh-3);
      }
    }
  }),
  // chain-link fence (green-tinted, semi-open feel)
  [WALL.FENCE]: mkTex(x=>{
    x.fillStyle='#3d4a38'; x.fillRect(0,0,TEXSIZE,TEXSIZE);
    // diamond mesh
    x.strokeStyle='#7e9a6e'; x.lineWidth=1;
    for(let i=-TEXSIZE;i<TEXSIZE*2;i+=14){
      x.beginPath(); x.moveTo(i,0); x.lineTo(i+TEXSIZE,TEXSIZE); x.stroke();
      x.beginPath(); x.moveTo(i,TEXSIZE); x.lineTo(i+TEXSIZE,0); x.stroke();
    }
    // top + bottom rails
    x.fillStyle='#5a6e50'; x.fillRect(0,0,TEXSIZE,3); x.fillRect(0,TEXSIZE-3,TEXSIZE,3);
  }),
  // mural wall — painted shapes, faded
  [WALL.MURAL]: mkTex(x=>{
    x.fillStyle='#c9b78c'; x.fillRect(0,0,TEXSIZE,TEXSIZE);     // faded stucco base
    const cols=['#c85a3a','#3a6e8a','#d8a23a','#5a8a5a','#8a5a8a'];
    for(let i=0;i<14;i++){
      x.fillStyle=cols[(Math.random()*cols.length)|0];
      x.globalAlpha=0.55+Math.random()*0.35;
      const w=6+((Math.random()*16)|0), h=6+((Math.random()*16)|0);
      x.fillRect((Math.random()*TEXSIZE)|0,(Math.random()*TEXSIZE)|0,w,h);
    }
    x.globalAlpha=1;
    noiseFill(x,[180,160,120],30,200);
  }),
  // van (side) — used as a parking-lot blocker wall
  [WALL.VAN]: mkTex(x=>{
    x.fillStyle='#6a6258'; x.fillRect(0,0,TEXSIZE,TEXSIZE);      // asphalt behind
    x.fillStyle='#d8d2c4'; x.fillRect(2,16,60,34);               // body
    x.fillStyle='#9a9488'; x.fillRect(2,46,60,6);                // lower trim
    x.fillStyle='#3a4654'; x.fillRect(8,22,18,12); x.fillRect(32,22,22,12); // windows
    x.fillStyle='#b8b2a4'; x.fillRect(2,30,60,2);                // body line
    x.fillStyle='#222'; x.beginPath(); x.arc(16,52,6,0,7); x.fill();
    x.beginPath(); x.arc(48,52,6,0,7); x.fill();                  // wheels
    x.fillStyle='#444'; x.beginPath(); x.arc(16,52,2.5,0,7); x.fill();
    x.beginPath(); x.arc(48,52,2.5,0,7); x.fill();
  }),
  // dark storefront glass with mullions + faded sign band
  [WALL.GLASS]: mkTex(x=>{
    x.fillStyle='#1f2a33'; x.fillRect(0,0,TEXSIZE,TEXSIZE);
    x.fillStyle='rgba(110,135,158,0.22)'; x.fillRect(4,10,TEXSIZE-8,38);
    x.fillStyle='#3a3530'; x.fillRect(0,0,TEXSIZE,3); x.fillRect(0,48,TEXSIZE,3);
    x.fillStyle='#6a5e48'; x.fillRect(0,0,TEXSIZE,11);
    x.fillStyle='rgba(210,190,140,0.35)'; x.fillRect(8,4,48,5);
  }),
  // service/garage roll-up door
  [WALL.GARAGE]: mkTex(x=>{
    x.fillStyle='#8a8478'; x.fillRect(0,0,TEXSIZE,TEXSIZE);
    for(let i=0;i<TEXSIZE;i+=10){ x.fillStyle='#6e6a5e'; x.fillRect(0,i,TEXSIZE,2); }
    x.fillStyle='#2a3340'; x.fillRect(46,8,12,10);
    noiseFill(x,[140,134,120],16,120);
  }),
  // blank concrete
  [WALL.CONCRETE]: mkTex(x=>{
    x.fillStyle='#948e80'; x.fillRect(0,0,TEXSIZE,TEXSIZE);
    for(let i=0;i<10;i++){
      const bw = 12+((Math.random()*16)|0), bh = 10+((Math.random()*14)|0);
      x.fillStyle='rgba(130,124,112,0.35)';
      x.fillRect((Math.random()*(TEXSIZE-bw))|0,(Math.random()*(TEXSIZE-bh))|0,bw,bh);
    }
  }),
  // faded signage / billboard wall
  [WALL.SIGNAGE]: mkTex(x=>{
    x.fillStyle='#b8ac8e'; x.fillRect(0,0,TEXSIZE,TEXSIZE);      // faded panel
    // billboard panel
    x.fillStyle='#c94a3a'; x.fillRect(4,6,56,22);
    x.fillStyle='rgba(240,220,180,0.6)';
    x.fillRect(8,11,10,4); x.fillRect(22,11,16,4); x.fillRect(42,11,14,4);
    x.fillRect(8,20,24,4);
    // posts
    x.fillStyle='#5a4a36'; x.fillRect(8,30,4,26); x.fillRect(50,30,4,26);
    noiseFill(x,[170,158,130],24,200);
  }),
};
// fallback for any unexpected wall id
WALL_TEX[0] = WALL_TEX[WALL.CONCRETE];

// minimap representative colors per wall type (FPV textures only; minimap uses crMinimapNavCellColor)
const WALL_MINI = {
  [WALL.BUILDING]:'#8a7a62', [WALL.BRICK]:'#7a3a32', [WALL.FENCE]:'#4a5e42',
  [WALL.MURAL]:'#8a6a52', [WALL.VAN]:'#6a6458', [WALL.GLASS]:'#1f2830',
  [WALL.GARAGE]:'#5a564e', [WALL.CONCRETE]:'#5a5448', [WALL.SIGNAGE]:'#906a4a',
};
const MINIMAP_FLOOR = '#343840';
const MINIMAP_NAV = {
  PERIM: '#484440',
  BUILDING: '#6a6258',
  BUILDING_LANDMARK: '#756a5c',
  ROAD: '#38424f',
  SIDEWALK: '#444a54',
  ALLEY: '#353b44',
  POCKET: '#3a4048',
};
const CR_MINIMAP_NAV_PALETTE = Object.values(MINIMAP_NAV);

function crCellAdjacentBuilding(x, y){
  const m = game.map;
  if(!m) return false;
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
    if(!dx && !dy) continue;
    const nx=x+dx, ny=y+dy;
    if(ny<0||nx<0||ny>=game.MAP_H||nx>=game.MAP_W) continue;
    const v = m[ny][nx];
    if(v>0 && v!==WALL.FENCE) return true;
  }
  return false;
}

function crMinimapNavCellColor(x, y, v){
  const GH = game.MAP_H, GW = game.MAP_W;
  if(v !== 0){
    const lm = game.d1ParkLandmark;
    if(lm && x >= lm.x0 && x <= lm.x1 && y >= lm.y0 && y <= lm.y1) return MINIMAP_NAV.BUILDING_LANDMARK;
    if(y===0||y===GH-1||x===0||x===GW-1) return MINIMAP_NAV.PERIM;
    if(v === WALL.FENCE) return '#4a5448';
    return MINIMAP_NAV.BUILDING;
  }
  const meta = game.streetLayoutMeta;
  if(!meta) return MINIMAP_FLOOR;
  const zone = crStreetZoneAt(x, y, meta);
  if(zone === 'MAIN_ROAD') return MINIMAP_NAV.ROAD;
  if(zone === 'BACK_ALLEY') return MINIMAP_NAV.ALLEY;
  if(crCellAdjacentBuilding(x, y)) return MINIMAP_NAV.SIDEWALK;
  return MINIMAP_NAV.POCKET;
}

function crPickWeightedRoadProp(r){
  const roll = r();
  if(roll < 0.32) return 'mailbox';
  if(roll < 0.58) return 'bench';
  if(roll < 0.78) return 'utility_box';
  if(roll < 0.90) return 'scrub_bush';
  return 'signboard';
}

function crPlayerNearBuildingEdge(){
  const mx = player.x|0, my = player.y|0;
  const m = game.map;
  if(!m || !m[my]) return false;
  return (m[my][mx-1]>0 || m[my][mx+1]>0 || (m[my-1]&&m[my-1][mx]>0) || (m[my+1]&&m[my+1][mx]>0));
}

function crDrawFpvStreetReadabilityCues(){
  // Matte zone tint in lower FPV only — no screen-fixed horizon bands (those read wet/reflective vs scrolling walls).
  if(!game.streetLayoutMeta || !CR_FPV_STREET_MATTE) return;
  const zm = crStreetZoneAt(player.x|0, player.y|0, game.streetLayoutMeta);
  let tint = 'rgba(34,36,40,0.07)';
  if(zm === 'MAIN_ROAD') tint = 'rgba(38,40,46,0.06)';
  else if(zm === 'BACK_ALLEY') tint = 'rgba(32,34,38,0.08)';
  else if(crPlayerNearBuildingEdge()) tint = 'rgba(44,42,40,0.05)';
  bctx.fillStyle = tint;
  bctx.fillRect(0, RH * 0.72, RW, RH * 0.28);
}

// --- COMMUNITY STREET PUNK SOUTHWEST DECOR PROPS ---
const DECOR_PROP_REQUIRED = [
  "mailbox","shopping_cart","bench","sleeping_bag_pile","crate_stack","cooler",
  "tarp_bundle","scrub_bush","agave","utility_box","signboard","mural_panel"
];
globalThis.DECOR_PROP_REQUIRED = DECOR_PROP_REQUIRED;
const _decorPropTexCache = {};
const _decorPropLab = (function(){

  const PALETTE = {
    skyDust: '#d5b08b',
    groundDust: '#a77d5a',
    ink: '#241913',
    outline: '#2e211a',
    paper: '#eadfc6',
    paperDirty: '#ccb28c',
    rust: '#9a573f',
    clay: '#b46843',
    sand: '#c79b74',
    stucco: '#d2a47d',
    concrete: '#918170',
    asphalt: '#5e5149',
    fadedTeal: '#4e9d93',
    fadedBlue: '#628ea3',
    mustard: '#c6a13b',
    sage: '#7b8f63',
    bushDark: '#566446',
    bushLight: '#798b59',
    wood: '#7b5840',
    shadow: 'rgba(0,0,0,0.16)',
    shadowDeep: 'rgba(0,0,0,0.28)',
    white: '#f7f1e7',
    warning: '#d0a237',
    red: '#b44e4b',
    flyerPink: '#d88795',
    flyerLime: '#96af59',
    flyerAqua: '#73b6af',
    metal: '#8e9186',
    chain: '#a2a59c'
  };

  function rand(rng, a=0, b=1){ return a + (b-a) * rng(); }
  function irand(rng, a, b){ return Math.floor(rand(rng, a, b+1)); }
  function pick(rng, arr){ return arr[Math.floor(rng() * arr.length)] }

  function drawRoundedRect(ctx, x, y, w, h, r, fill, stroke, lw=2){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    if(fill){ ctx.fillStyle = fill; ctx.fill(); }
    if(stroke){ ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function drawShadowBlob(ctx, x, y, w, h, alpha=.18){
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function stickerCluster(ctx, rng, x, y, w, h, count=6){
    const colors = [PALETTE.flyerPink, PALETTE.flyerAqua, PALETTE.flyerLime, PALETTE.mustard, PALETTE.paper];
    for(let i=0;i<count;i++){
      const sw = rand(rng, 8, 20), sh = rand(rng, 5, 14);
      const sx = rand(rng, x, x + w - sw), sy = rand(rng, y, y + h - sh);
      const rot = rand(rng, -0.5, 0.5);
      ctx.save();
      ctx.translate(sx + sw/2, sy + sh/2);
      ctx.rotate(rot);
      drawRoundedRect(ctx, -sw/2, -sh/2, sw, sh, 3, pick(rng, colors), PALETTE.outline, 1.5);
      if(rng() < 0.6){
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sw*0.25, 0);
        ctx.lineTo(sw*0.25, 0);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function flyerCluster(ctx, rng, x, y, w, h, count=5){
    const colors = [PALETTE.paper, PALETTE.paperDirty, PALETTE.flyerPink, PALETTE.flyerAqua, PALETTE.flyerLime];
    for(let i=0;i<count;i++){
      const fw = rand(rng, w*0.25, w*0.5);
      const fh = rand(rng, h*0.22, h*0.42);
      const fx = rand(rng, x, x + w - fw);
      const fy = rand(rng, y, y + h - fh);
      const rot = rand(rng, -0.12, 0.12);
      ctx.save();
      ctx.translate(fx + fw/2, fy + fh/2);
      ctx.rotate(rot);
      drawRoundedRect(ctx, -fw/2, -fh/2, fw, fh, 2, pick(rng, colors), 'rgba(0,0,0,0.25)', 1);
      ctx.strokeStyle = 'rgba(0,0,0,.28)';
      ctx.lineWidth = 1;
      for(let k=0;k<3;k++){
        const ly = -fh/2 + 7 + k*6;
        ctx.beginPath();
        ctx.moveTo(-fw*0.34, ly);
        ctx.lineTo(fw*0.3, ly);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function roughTag(ctx, rng, x, y, scale=1, color='rgba(20,16,14,.55)'){
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x+10*scale, y-10*scale, x+18*scale, y+7*scale, x+28*scale, y-2*scale);
    ctx.bezierCurveTo(x+36*scale, y+10*scale, x+46*scale, y-6*scale, x+56*scale, y+5*scale);
    ctx.stroke();
    ctx.restore();
  }

  function muralMarks(ctx, rng, x, y, w, h){
    const accents = [PALETTE.fadedTeal, PALETTE.mustard, PALETTE.flyerPink, PALETTE.clay];
    for(let i=0;i<5;i++){
      ctx.save();
      ctx.globalAlpha = rand(rng, .55, .95);
      ctx.fillStyle = pick(rng, accents);
      const px = rand(rng, x+10, x+w-45);
      const py = rand(rng, y+10, y+h-24);
      const pw = rand(rng, 18, 52);
      const ph = rand(rng, 10, 26);
      if(rng() < .45){
        ctx.beginPath();
        ctx.ellipse(px, py, pw/2, ph/2, rand(rng,-0.5,0.5), 0, Math.PI*2);
        ctx.fill();
      } else {
        ctx.fillRect(px, py, pw, ph);
      }
      ctx.restore();
    }
    roughTag(ctx, rng, x+18, y+h*0.68, 0.9, 'rgba(30,20,16,0.55)');
  }

  function drawGroundPatch(ctx, x, y, w, h, rng){
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x, y+h);
    g.addColorStop(0, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(68,48,35,.45)';
    ctx.lineWidth = 1;
    for(let i=0;i<5;i++){
      const gy = y + rand(rng, 8, h-8);
      ctx.beginPath();
      ctx.moveTo(x+8, gy);
      ctx.lineTo(x+w-8, gy + rand(rng,-2,2));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMailbox(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+14*s, y+52*s, 42*s, 10*s, .18);
    ctx.fillStyle = PALETTE.metal;
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2*s;
    drawRoundedRect(ctx, x+12*s, y+18*s, 32*s, 22*s, 6*s, PALETTE.flyerAqua, PALETTE.outline, 2*s);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(x+16*s, y+23*s, 19*s, 8*s);
    ctx.strokeRect(x+16*s, y+23*s, 19*s, 8*s);
    ctx.fillStyle = PALETTE.rust;
    ctx.fillRect(x+14*s, y+26*s, 4*s, 2*s);
    ctx.fillStyle = PALETTE.metal;
    ctx.fillRect(x+26*s, y+40*s, 4*s, 13*s);
    ctx.fillRect(x+18*s, y+52*s, 20*s, 3*s);
    if(rng() < 0.65) stickerCluster(ctx, rng, x+19*s, y+10*s, 20*s, 10*s, 3);
  }

  function drawOldSedan(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+12*s, y+58*s, 78*s, 12*s, .2);
    ctx.fillStyle = pick(rng, [PALETTE.rust, PALETTE.fadedBlue, PALETTE.mustard, PALETTE.clay]);
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2.5*s;

    ctx.beginPath();
    ctx.moveTo(x+10*s, y+45*s);
    ctx.lineTo(x+18*s, y+33*s);
    ctx.lineTo(x+42*s, y+28*s);
    ctx.lineTo(x+58*s, y+30*s);
    ctx.lineTo(x+73*s, y+39*s);
    ctx.lineTo(x+88*s, y+42*s);
    ctx.lineTo(x+87*s, y+54*s);
    ctx.lineTo(x+10*s, y+54*s);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#9fb8c4';
    ctx.fillRect(x+23*s, y+34*s, 16*s, 9*s);
    ctx.fillRect(x+41*s, y+33*s, 16*s, 10*s);
    ctx.strokeRect(x+23*s, y+34*s, 16*s, 9*s);
    ctx.strokeRect(x+41*s, y+33*s, 16*s, 10*s);

    ctx.fillStyle = '#2b2521';
    ctx.beginPath(); ctx.arc(x+28*s, y+56*s, 8*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+71*s, y+56*s, 8*s, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#777a75';
    ctx.beginPath(); ctx.arc(x+28*s, y+56*s, 4*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+71*s, y+56*s, 4*s, 0, Math.PI*2); ctx.fill();

    if(rng() < 0.7){
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x+12*s, y+49*s, 8*s, 2*s);
      ctx.fillRect(x+79*s, y+47*s, 6*s, 3*s);
    }
    if(rng() < 0.65) roughTag(ctx, rng, x+35*s, y+48*s, 0.4*s, 'rgba(255,255,255,.55)');
  }

  function drawOldVan(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+12*s, y+60*s, 92*s, 12*s, .22);
    const body = pick(rng, [PALETTE.paperDirty, PALETTE.fadedTeal, PALETTE.rust, PALETTE.stucco]);
    drawRoundedRect(ctx, x+10*s, y+22*s, 88*s, 34*s, 7*s, body, PALETTE.outline, 2.5*s);
    ctx.fillStyle = '#a7c0c8';
    ctx.fillRect(x+17*s, y+29*s, 15*s, 12*s);
    ctx.fillRect(x+35*s, y+29*s, 18*s, 12*s);
    ctx.fillRect(x+56*s, y+29*s, 18*s, 12*s);
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2*s;
    ctx.strokeRect(x+17*s, y+29*s, 15*s, 12*s);
    ctx.strokeRect(x+35*s, y+29*s, 18*s, 12*s);
    ctx.strokeRect(x+56*s, y+29*s, 18*s, 12*s);
    ctx.beginPath(); ctx.arc(x+28*s, y+58*s, 8*s, 0, Math.PI*2); ctx.fillStyle='#25211d'; ctx.fill();
    ctx.beginPath(); ctx.arc(x+78*s, y+58*s, 8*s, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#787b74';
    ctx.beginPath(); ctx.arc(x+28*s, y+58*s, 4*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+78*s, y+58*s, 4*s, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = PALETTE.paper;
    ctx.fillRect(x+42*s, y+43*s, 34*s, 8*s);
    ctx.strokeRect(x+42*s, y+43*s, 34*s, 8*s);
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.moveTo(x+46*s, y+47*s); ctx.lineTo(x+72*s, y+47*s); ctx.stroke();

    if(rng() < 0.7) stickerCluster(ctx, rng, x+59*s, y+15*s, 26*s, 12*s, 4);
  }

  function drawDumpster(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+12*s, y+58*s, 74*s, 12*s, .2);
    const body = pick(rng, [PALETTE.sage, '#5f7353', '#596965', '#6a7b5f']);
    ctx.fillStyle = body;
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2*s;
    ctx.beginPath();
    ctx.moveTo(x+18*s, y+20*s);
    ctx.lineTo(x+78*s, y+20*s);
    ctx.lineTo(x+72*s, y+54*s);
    ctx.lineTo(x+24*s, y+54*s);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#78896b';
    ctx.fillRect(x+16*s, y+14*s, 28*s, 7*s);
    ctx.fillRect(x+52*s, y+14*s, 28*s, 7*s);
    ctx.strokeRect(x+16*s, y+14*s, 28*s, 7*s);
    ctx.strokeRect(x+52*s, y+14*s, 28*s, 7*s);

    ctx.fillStyle = '#2a241f';
    ctx.fillRect(x+18*s, y+48*s, 8*s, 8*s);
    ctx.fillRect(x+70*s, y+48*s, 8*s, 8*s);

    flyerCluster(ctx, rng, x+33*s, y+26*s, 28*s, 18*s, 2);
    if(rng()<0.8) roughTag(ctx, rng, x+30*s, y+39*s, 0.45*s, 'rgba(255,255,255,0.55)');
  }

  function drawShoppingCart(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+14*s, y+58*s, 56*s, 10*s, .18);
    ctx.strokeStyle = PALETTE.chain;
    ctx.lineWidth = 2*s;
    ctx.beginPath();
    ctx.moveTo(x+18*s, y+18*s);
    ctx.lineTo(x+48*s, y+18*s);
    ctx.lineTo(x+56*s, y+40*s);
    ctx.lineTo(x+24*s, y+40*s);
    ctx.closePath();
    ctx.stroke();

    for(let i=0;i<4;i++){
      ctx.beginPath();
      ctx.moveTo(x+24*s+i*8*s, y+18*s);
      ctx.lineTo(x+30*s+i*8*s, y+40*s);
      ctx.stroke();
    }
    for(let i=0;i<3;i++){
      ctx.beginPath();
      ctx.moveTo(x+22*s, y+22*s+i*6*s);
      ctx.lineTo(x+53*s, y+22*s+i*6*s);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(x+16*s, y+14*s);
    ctx.lineTo(x+22*s, y+18*s);
    ctx.stroke();

    ctx.beginPath(); ctx.moveTo(x+28*s, y+40*s); ctx.lineTo(x+24*s, y+54*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+51*s, y+40*s); ctx.lineTo(x+56*s, y+54*s); ctx.stroke();

    ctx.fillStyle = '#2b2521';
    ctx.beginPath(); ctx.arc(x+23*s, y+56*s, 3.5*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+57*s, y+56*s, 3.5*s, 0, Math.PI*2); ctx.fill();

    if(rng() < 0.75){
      ctx.fillStyle = pick(rng, [PALETTE.paperDirty, PALETTE.flyerPink, PALETTE.flyerAqua]);
      ctx.fillRect(x+30*s, y+25*s, 12*s, 7*s);
      ctx.strokeStyle = PALETTE.outline; ctx.strokeRect(x+30*s, y+25*s, 12*s, 7*s);
    }
  }

  function drawUtilityPole(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+18*s, y+67*s, 30*s, 8*s, .14);
    ctx.fillStyle = PALETTE.wood;
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2*s;
    ctx.fillRect(x+24*s, y+8*s, 8*s, 56*s);
    ctx.strokeRect(x+24*s, y+8*s, 8*s, 56*s);

    ctx.strokeStyle = '#574031';
    for(let i=0;i<4;i++){
      ctx.beginPath();
      ctx.moveTo(x+24*s, y+16*s+i*10*s);
      ctx.lineTo(x+32*s, y+15*s+i*10*s);
      ctx.stroke();
    }

    ctx.fillStyle = PALETTE.concrete;
    ctx.fillRect(x+8*s, y+16*s, 40*s, 4*s);
    ctx.strokeRect(x+8*s, y+16*s, 40*s, 4*s);

    ctx.fillStyle = '#2a211a';
    ctx.beginPath(); ctx.arc(x+16*s, y+18*s, 2*s, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+40*s, y+18*s, 2*s, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = '#3a322c';
    ctx.lineWidth = 1.5*s;
    ctx.beginPath();
    ctx.moveTo(x+48*s, y+18*s);
    ctx.bezierCurveTo(x+62*s, y+16*s, x+70*s, y+22*s, x+82*s, y+17*s);
    ctx.stroke();

    if(rng() < 0.8) stickerCluster(ctx, rng, x+19*s, y+30*s, 18*s, 16*s, 3);
  }

  function drawPosterPole(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+18*s, y+67*s, 30*s, 8*s, .14);
    ctx.fillStyle = '#6e685e';
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2*s;
    ctx.fillRect(x+26*s, y+6*s, 6*s, 58*s);
    ctx.strokeRect(x+26*s, y+6*s, 6*s, 58*s);

    flyerCluster(ctx, rng, x+8*s, y+16*s, 42*s, 32*s, 4);
    stickerCluster(ctx, rng, x+12*s, y+44*s, 34*s, 16*s, 5);
    roughTag(ctx, rng, x+12*s, y+60*s, 0.45*s, 'rgba(25,18,16,.55)');
  }

  function drawFlyerWall(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+10*s, y+62*s, 92*s, 10*s, .14);
    drawRoundedRect(ctx, x+8*s, y+12*s, 96*s, 50*s, 4*s, PALETTE.stucco, PALETTE.outline, 2*s);
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.fillRect(x+8*s, y+42*s, 96*s, 20*s);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(x+8*s, y+12*s, 96*s, 11*s);
    flyerCluster(ctx, rng, x+14*s, y+18*s, 78*s, 32*s, 6);
    stickerCluster(ctx, rng, x+20*s, y+46*s, 68*s, 8*s, 4);
    roughTag(ctx, rng, x+63*s, y+55*s, 0.5*s, 'rgba(25,18,16,.55)');
  }

  function drawMuralPatch(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+10*s, y+62*s, 92*s, 10*s, .14);
    drawRoundedRect(ctx, x+8*s, y+12*s, 96*s, 50*s, 4*s, PALETTE.stucco, PALETTE.outline, 2*s);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(x+8*s, y+12*s, 96*s, 11*s);
    muralMarks(ctx, rng, x+12*s, y+16*s, 88*s, 36*s);
    stickerCluster(ctx, rng, x+74*s, y+47*s, 18*s, 10*s, 3);
  }

  function drawBench(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+10*s, y+58*s, 58*s, 8*s, .16);
    const seat = pick(rng, [PALETTE.wood, PALETTE.paperDirty, '#6d7a68']);
    ctx.fillStyle = seat;
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2.2*s;
    ctx.fillRect(x+14*s, y+28*s, 40*s, 8*s);
    ctx.strokeRect(x+14*s, y+28*s, 40*s, 8*s);
    ctx.fillRect(x+16*s, y+18*s, 36*s, 12*s);
    ctx.strokeRect(x+16*s, y+18*s, 36*s, 12*s);
    ctx.beginPath(); ctx.moveTo(x+18*s,y+36*s); ctx.lineTo(x+16*s,y+52*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+48*s,y+36*s); ctx.lineTo(x+50*s,y+52*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+22*s,y+18*s); ctx.lineTo(x+20*s,y+8*s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+46*s,y+18*s); ctx.lineTo(x+48*s,y+8*s); ctx.stroke();
  }

  function drawSleepingBagPile(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+12*s, y+56*s, 50*s, 8*s, .15);
    const cols = ['#7a6d55', '#9a8468', '#5c6f7a', '#8b7359'];
    for(let i=0;i<3;i++){
      const ox = x + (14+i*10)*s, oy = y + (32-i*4)*s;
      ctx.fillStyle = pick(rng, cols);
      ctx.strokeStyle = PALETTE.outline;
      ctx.lineWidth = 1.8*s;
      ctx.beginPath();
      ctx.ellipse(ox+18*s, oy+8*s, 18*s, 9*s, -0.25+i*0.15, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#4a4030';
      ctx.lineWidth = 1.2*s;
      ctx.beginPath(); ctx.moveTo(ox+8*s, oy+10*s); ctx.lineTo(ox+28*s, oy+6*s); ctx.stroke();
    }
  }

  function drawCrateStack(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+12*s, y+58*s, 64*s, 10*s, .18);
    const count = rng() < 0.5 ? 2 : 3;
    for(let i=0;i<count;i++){
      const ox = x + (i % 2) * 20*s + (i===2 ? 10*s : 0);
      const oy = y + 40*s - Math.floor(i/2)*16*s;
      drawRoundedRect(ctx, ox+8*s, oy, 24*s, 16*s, 2*s, PALETTE.wood, PALETTE.outline, 2*s);
      ctx.strokeStyle = '#9b7356';
      ctx.lineWidth = 1.5*s;
      ctx.beginPath(); ctx.moveTo(ox+12*s, oy+8*s); ctx.lineTo(ox+28*s, oy+8*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox+16*s, oy+2*s); ctx.lineTo(ox+16*s, oy+14*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox+24*s, oy+2*s); ctx.lineTo(ox+24*s, oy+14*s); ctx.stroke();
    }
    if(rng()<0.7) stickerCluster(ctx, rng, x+28*s, y+25*s, 16*s, 8*s, 2);
  }

  function drawTarpBundle(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+14*s, y+58*s, 48*s, 8*s, .14);
    const tarp = pick(rng, ['#5a6e72', '#6a7a65', '#4d5f6a']);
    ctx.fillStyle = tarp;
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2*s;
    ctx.beginPath();
    ctx.moveTo(x+18*s,y+42*s); ctx.lineTo(x+44*s,y+38*s); ctx.lineTo(x+52*s,y+48*s);
    ctx.lineTo(x+22*s,y+52*s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#3a3830';
    ctx.lineWidth = 1.5*s;
    ctx.beginPath(); ctx.moveTo(x+28*s,y+40*s); ctx.lineTo(x+38*s,y+50*s); ctx.stroke();
    ctx.fillStyle = PALETTE.rust;
    ctx.fillRect(x+34*s, y+36*s, 6*s, 4*s);
    ctx.strokeRect(x+34*s, y+36*s, 6*s, 4*s);
  }

  function drawScrubBush(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+16*s, y+52*s, 40*s, 6*s, .12);
    ctx.strokeStyle = '#5a4a32';
    ctx.lineWidth = 1.5*s;
    for(let i=0;i<5;i++){
      ctx.beginPath();
      ctx.moveTo(x+32*s, y+50*s);
      ctx.quadraticCurveTo(x+(20+i*4)*s, y+(44-i*3)*s, x+(24+i*5)*s, y+(28+i*2)*s);
      ctx.stroke();
    }
    const cols = [PALETTE.sage, PALETTE.bushLight, '#6d7a52'];
    for(let i=0;i<6;i++){
      const bx = x + (22+i*3)*s, by = y + (36 - (i%3)*4)*s;
      ctx.fillStyle = cols[i%3];
      ctx.beginPath();
      ctx.ellipse(bx, by, 5*s, 8*s, (i-2)*0.2, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.outline;
      ctx.lineWidth = 1*s;
      ctx.stroke();
    }
  }

  function drawAgave(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+14*s, y+56*s, 36*s, 7*s, .14);
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(x+30*s, y+44*s, 6*s, 12*s);
    ctx.strokeStyle = PALETTE.outline;
    ctx.strokeRect(x+30*s, y+44*s, 6*s, 12*s);
    const green = pick(rng, ['#5a7a52', '#4d6b48', PALETTE.bushDark]);
    for(let i=0;i<8;i++){
      const ang = (i/8)*Math.PI*2 - Math.PI/2;
      ctx.fillStyle = green;
      ctx.lineWidth = 2.2*s;
      ctx.beginPath();
      ctx.moveTo(x+33*s, y+42*s);
      ctx.lineTo(x+33*s+Math.cos(ang)*22*s, y+42*s+Math.sin(ang)*16*s);
      ctx.lineTo(x+33*s+Math.cos(ang)*8*s, y+42*s+Math.sin(ang)*4*s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = PALETTE.outline;
      ctx.lineWidth = 1.2*s;
      ctx.stroke();
    }
    ctx.strokeStyle = '#c9a13b';
    ctx.lineWidth = 1*s;
    ctx.beginPath(); ctx.arc(x+33*s, y+28*s, 4*s, 0, Math.PI*2); ctx.stroke();
  }

  function drawCooler(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+12*s, y+60*s, 54*s, 10*s, .16);
    drawRoundedRect(ctx, x+16*s, y+24*s, 36*s, 24*s, 4*s, pick(rng,[PALETTE.paperDirty, PALETTE.flyerAqua, PALETTE.red]), PALETTE.outline, 2*s);
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fillRect(x+16*s, y+24*s, 36*s, 6*s);
    ctx.fillStyle = '#f1ece0';
    ctx.fillRect(x+24*s, y+19*s, 20*s, 6*s);
    ctx.strokeStyle = PALETTE.outline;
    ctx.strokeRect(x+24*s, y+19*s, 20*s, 6*s);
    ctx.fillStyle = PALETTE.outline;
    ctx.lineWidth = 1.5*s;
    ctx.strokeRect(x+18*s, y+30*s, 32*s, 14*s);
  }

  function drawUtilityBox(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+12*s, y+54*s, 44*s, 8*s, .16);
    drawRoundedRect(ctx, x+16*s, y+24*s, 36*s, 28*s, 3*s, PALETTE.concrete, PALETTE.outline, 2*s);
    ctx.fillStyle = '#6a6558';
    ctx.fillRect(x+22*s, y+30*s, 24*s, 14*s);
    ctx.strokeRect(x+22*s, y+30*s, 24*s, 14*s);
    ctx.fillStyle = PALETTE.rust;
    ctx.fillRect(x+30*s, y+34*s, 8*s, 3*s);
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 1.5*s;
    ctx.beginPath(); ctx.moveTo(x+20*s,y+26*s); ctx.lineTo(x+48*s,y+26*s); ctx.stroke();
  }

  function drawSignboard(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+14*s, y+58*s, 40*s, 7*s, .13);
    ctx.fillStyle = PALETTE.metal;
    ctx.fillRect(x+28*s, y+32*s, 5*s, 24*s);
    ctx.strokeStyle = PALETTE.outline;
    ctx.strokeRect(x+28*s, y+32*s, 5*s, 24*s);
    const board = pick(rng, [PALETTE.paperDirty, PALETTE.stucco, '#7a8a72']);
    drawRoundedRect(ctx, x+12*s, y+14*s, 38*s, 22*s, 2*s, board, PALETTE.outline, 2*s);
    ctx.fillStyle = PALETTE.clay;
    ctx.fillRect(x+16*s, y+20*s, 30*s, 4*s);
    ctx.fillStyle = PALETTE.fadedTeal;
    ctx.fillRect(x+16*s, y+26*s, 18*s, 4*s);
    if(rng()<0.6) stickerCluster(ctx, rng, x+14*s, y+16*s, 20*s, 12*s, 2);
  }

  function drawMuralPanel(ctx, x, y, s, rng){
    drawShadowBlob(ctx, x+10*s, y+54*s, 56*s, 8*s, .14);
    drawRoundedRect(ctx, x+8*s, y+16*s, 60*s, 34*s, 3*s, PALETTE.stucco, PALETTE.outline, 2*s);
    muralMarks(ctx, rng, x+12*s, y+20*s, 52*s, 26*s);
    ctx.strokeStyle = PALETTE.outline;
    ctx.lineWidth = 2*s;
    ctx.strokeRect(x+8*s, y+16*s, 60*s, 34*s);
  }

  const DRAWERS = {
    'Mailbox': drawMailbox,
    'Shopping Cart': drawShoppingCart,
    'Bench': drawBench,
    'Sleeping Bag Pile': drawSleepingBagPile,
    'Crate Stack': drawCrateStack,
    'Cooler': drawCooler,
    'Tarp Bundle': drawTarpBundle,
    'Scrub Bush': drawScrubBush,
    'Agave': drawAgave,
    'Utility Box': drawUtilityBox,
    'Signboard': drawSignboard,
    'Mural Panel': drawMuralPanel
  };


return { DRAWERS, PALETTE };
})();
function _decorPropVariantSeed(kind, variant){
  let h = 0; const s = String(kind)+":"+String(variant);
  for(let i=0;i<s.length;i++) h = ((h<<5)-h + s.charCodeAt(i))|0;
  return h;
}
function _decorRng(seed, offset){
  let a = (seed + offset) | 0;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ (a>>>15), 1 | a);
    t = t + Math.imul(t ^ (t>>>7), 61 | t) ^ t;
    return ((t ^ (t>>>14)) >>> 0) / 4294967296;
  };
}
function decorPropVariantFromProp(prop){
  const v = (((prop.x*1000)|0) ^ ((prop.y*1000)|0) ^ (prop.kind||"").length) & 7;
  return v;
}
function bakeDecorPropTexture(kind, variant){
  const key = kind+":"+variant;
  if(_decorPropTexCache[key]) return _decorPropTexCache[key];
  const sizes = {
    mailbox:[38,50], shopping_cart:[54,30], bench:[52,44], sleeping_bag_pile:[52,36],
    crate_stack:[48,34], cooler:[46,42], tarp_bundle:[44,38], scrub_bush:[50,32],
    agave:[44,50], utility_box:[42,40], signboard:[44,52], mural_panel:[64,44]
  };
  const nameMap = {
    mailbox:"Mailbox", shopping_cart:"Shopping Cart", bench:"Bench",
    sleeping_bag_pile:"Sleeping Bag Pile", crate_stack:"Crate Stack", cooler:"Cooler",
    tarp_bundle:"Tarp Bundle", scrub_bush:"Scrub Bush", agave:"Agave",
    utility_box:"Utility Box", signboard:"Signboard", mural_panel:"Mural Panel"
  };
  const sz = sizes[kind] || [48,48];
  const c = newTex(sz[0], sz[1]);
  const ctx = c.getContext("2d");
  ctx.clearRect(0,0,sz[0],sz[1]);
  const drawers = _decorPropLab.DRAWERS || {};
  const drawName = nameMap[kind];
  const fn = drawName && drawers[drawName];
  const rng = _decorRng(_decorPropVariantSeed(kind, variant), 17);
  const scale = Math.min(sz[0]/100, sz[1]/70) * 1.65;
  const px = 4, py = 6;
  if(fn){ fn(ctx, px, py, scale, rng); }
  else { ctx.fillStyle="#8a6a52"; ctx.fillRect(4,4,sz[0]-8,sz[1]-8); }
  _decorPropTexCache[key] = c;
  return c;
}
function initDecorPropTextureCache(){
  for(const k of DECOR_PROP_REQUIRED){
    for(let v=0;v<3;v++) bakeDecorPropTexture(k, v);
  }
}

// --- SPRITE TEXTURES (billboards) ---
function makePerson(body, head, legs, opts){
  opts=opts||{};
  const c=newTex(28,46), x=c.getContext('2d');
  x.clearRect(0,0,28,46);
  // shadow
  x.fillStyle='rgba(0,0,0,0.28)'; x.beginPath(); x.ellipse(14,44,9,3,0,0,7); x.fill();
  // legs
  x.fillStyle=legs; x.fillRect(9,30,4,13); x.fillRect(15,30,4,13);
  // shoes
  x.fillStyle='#1a1a1e'; x.fillRect(8,42,5,2); x.fillRect(15,42,6,2);
  // torso
  x.fillStyle=body; x.fillRect(7,16,14,16);
  // arms
  x.fillStyle=body; x.fillRect(3,17,4,11); x.fillRect(21,17,4,11);
  // hands
  x.fillStyle=head; x.fillRect(3,27,4,3); x.fillRect(21,27,4,3);
  // accessory
  if(opts.vest){ x.fillStyle='#f0d24a'; x.fillRect(7,19,14,4); x.fillStyle='#3a3a3a'; x.fillRect(13,16,2,16); }
  if(opts.apron){ x.fillStyle=opts.aproncol||'#e8e4dc'; x.fillRect(8,18,12,14); x.fillStyle='#8a8478'; x.fillRect(8,18,12,2); }
  if(opts.backpack){ x.fillStyle='#5a4a3a'; x.fillRect(19,17,7,14); x.fillStyle='#3a3028'; x.fillRect(20,19,5,8); }
  if(opts.cane){ x.fillStyle='#b89058'; x.fillRect(22,14,2,30); x.fillStyle='#8a6a3a'; x.fillRect(20,14,6,3); }
  if(opts.hat){ x.fillStyle=opts.hatcol||'#6a4a3a'; x.fillRect(6,4,16,3); x.fillRect(9,1,10,4); }
  if(opts.coat){ x.fillStyle=opts.coatcol; x.fillRect(7,16,14,16); x.fillStyle=body; x.fillRect(7,16,14,4); }
  // head
  x.fillStyle=head; x.beginPath(); x.arc(14,10,5,0,7); x.fill();
  // face
  x.fillStyle='#241a14'; x.fillRect(12,9,1,2); x.fillRect(15,9,1,2);
  if(opts.smile){ x.fillStyle='#7a4a3a'; x.fillRect(12,12,4,1); }
  // family: small child beside
  if(opts.child){
    x.fillStyle='#3a5a7a'; x.fillRect(0,30,5,10);
    x.fillStyle=head; x.beginPath(); x.arc(2,28,3,0,7); x.fill();
  }
  if(CR_VISUAL_READABILITY.entityOutlines){
    x.strokeStyle='rgba(0,0,0,0.62)'; x.lineWidth=1;
    x.strokeRect(7,16,14,16);
    x.beginPath(); x.arc(14,10,5,0,7); x.stroke();
    x.strokeRect(9,30,4,13); x.strokeRect(15,30,4,13);
  }
  return c;
}
const TEX = {
  hungry:   makePerson('#c8543e','#e6b88c','#3a2e26',{hat:true,hatcol:'#7a4a2a'}),
  family:   makePerson('#3a78b0','#e6b88c','#243044',{child:true}),
  elder:    makePerson('#8a7ab0','#d8c09a','#4a3a5a',{cane:true,coat:true,coatcol:'#6a5a8a',hat:true,hatcol:'#5a4a3a'}),
  volunteer:makePerson('#4ea872','#e6b88c','#2c5240',{vest:true,smile:true}),
  hall_volunteer: makePerson('#3a9a68','#d8b890','#244838',{vest:true,smile:true}),
  hall_elder:    makePerson('#7a6a9a','#d0b890','#3e3450',{cane:true,coat:true,coatcol:'#5a4a6a',hat:true,hatcol:'#4a3a2a'}),
  hall_pantry:   makePerson('#c87840','#e0b888','#4a3828',{apron:true,aproncol:'#f0ece4'}),
  hall_street:   makePerson('#4a6a9a','#c8a078','#2a3040',{backpack:true,hat:true,hatcol:'#3a4a5a'}),
  hall_quiet:    makePerson('#5a5a6a','#c8b8a8','#2a2a32',{coat:true,coatcol:'#4a4a58'}),
  hall_kitchen:  makePerson('#e8e0d0','#c8a888','#4a4038',{apron:true,aproncol:'#ffffff'}),
  hall_servant:  makePerson('#6a8a5a','#e0c8a0','#3a4a32',{vest:true,apron:true,aproncol:'#d8e8d0'}),
  // can pickup — clean pantry-can look (no sprite glow; avoids phone-visible halo boxes)
  can: (()=>{ const c=newTex(20,22),x=c.getContext('2d');
    x.fillStyle='rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(10,20,8,2,0,0,7); x.fill();
    x.fillStyle='#e8c84a'; x.fillRect(4,4,12,14);
    x.fillStyle='#8a8478'; x.fillRect(4,4,12,2); x.fillRect(4,16,12,2);
    x.fillStyle='#2a68b8'; x.fillRect(5,9,10,5);
    x.fillStyle='#ffffff'; x.fillRect(6,10,8,3);
    x.fillStyle='#ffd86a'; x.fillRect(8,2,4,3);
    x.strokeStyle='#fff8d0'; x.lineWidth=1;
    x.strokeRect(4.5,4.5,11,13);
    return c; })(),
  // pantry crate / food box (decor + alt pickup visual flavor)
  crate:(()=>{ const c=newTex(28,22),x=c.getContext('2d');
    x.fillStyle='rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(14,20,12,3,0,0,7); x.fill();
    x.fillStyle='#9a6a36'; x.fillRect(3,4,22,16);
    x.fillStyle='#6a4a22'; x.fillRect(3,4,22,2); x.fillRect(3,18,22,2);
    x.strokeStyle='#5a3a1a'; x.lineWidth=2; x.strokeRect(3,4,22,16);
    x.beginPath(); x.moveTo(3,4); x.lineTo(25,20); x.moveTo(25,4); x.lineTo(3,20); x.stroke();
    return c; })(),
  // exit portal — glowing arch
  exit:(()=>{ const c=newTex(48,80),x=c.getContext('2d');
    const g=x.createRadialGradient(24,40,4,24,40,38);
    g.addColorStop(0,'rgba(255,250,200,0.95)'); g.addColorStop(0.5,'rgba(255,210,90,0.6)'); g.addColorStop(1,'rgba(255,180,40,0)');
    x.fillStyle=g; x.fillRect(0,0,48,80);
    x.fillStyle='#fff4b0'; x.fillRect(16,8,16,64);
    x.fillStyle='#e8a13a'; x.fillRect(16,8,3,64); x.fillRect(29,8,3,64);
    x.fillStyle='#3a2a00'; x.beginPath(); x.moveTo(24,40); x.lineTo(15,54); x.lineTo(33,54); x.fill();
    return c; })(),
};
const HEIGHT = { hungry:0.86, family:1.0, elder:0.84, volunteer:0.92,
                 hall_volunteer:0.92, hall_elder:0.84, hall_pantry:0.88, hall_street:0.90,
                 hall_quiet:0.82, hall_kitchen:0.88, hall_servant:0.94,
                 can:0.42, crate:0.5, exit:1.25,
                 mailbox:0.50, shopping_cart:0.52, bench:0.42, sleeping_bag_pile:0.32, crate_stack:0.48,
                 cooler:0.40, tarp_bundle:0.35, scrub_bush:0.22, agave:0.55, utility_box:0.45,
                 signboard:0.62, mural_panel:0.58 };
function propTex(kind, prop){
  if(DECOR_PROP_REQUIRED.indexOf(kind) >= 0){
    const v = prop ? decorPropVariantFromProp(prop) : 0;
    return bakeDecorPropTexture(kind, v);
  }
  return TEX[kind] || bakeDecorPropTexture('scrub_bush', 0);
}
initDecorPropTextureCache();

// --- SKY / MESA HORIZON (pre-rendered once; warm dusty Western Colorado) ---
let skyCanvas=null, skyBuilt='none';
function buildSky(modifier){
  const W=RW, H=(RH/2)|0;
  if(!skyCanvas) skyCanvas=newTex(W,H);
  const x=skyCanvas.getContext('2d');
  x.clearRect(0,0,W,H);
  let topCol, horCol, mistCol;
  if(modifier==='rainy'){ topCol='#3a4656'; horCol='#5a6678'; mistCol='rgba(90,100,116,0.5)'; }
  else if(modifier==='maze'){ topCol='#5a6a86'; horCol='#a8927a'; mistCol='rgba(200,180,150,0.35)'; }
  else { topCol='#7eaad0'; horCol='#f0d8a8'; mistCol='rgba(240,210,160,0.4)'; } // dusty clear
  const g=x.createLinearGradient(0,0,0,H);
  g.addColorStop(0,topCol); g.addColorStop(0.62,horCol); g.addColorStop(1,'#e8c890');
  x.fillStyle=g; x.fillRect(0,0,W,H);

  // distant mesa silhouettes — Book Cliffs (tabular) + Grand Mesa (broad) inspired
  // Band 1: far, hazy mauve
  x.fillStyle='rgba(150,120,120,0.55)';
  x.beginPath(); x.moveTo(0,H);
  const baseY1=H-18;
  for(let px=0;px<=W;px+=8){
    const h=10+Math.sin(px*0.05)*4+Math.sin(px*0.13)*3;
    x.lineTo(px, baseY1-h);
  }
  x.lineTo(W,H); x.fill();
  // Band 2: closer, mesa-brown with flat tops (Book Cliffs feel)
  x.fillStyle='rgba(120,86,64,0.78)';
  x.beginPath(); x.moveTo(0,H);
  const baseY2=H-10;
  let mx=0;
  while(mx<=W){
    const topW=18+((Math.random()*26)|0);
    const topH=8+((Math.random()*14)|0);
    const topY=baseY2-topH;
    x.lineTo(mx,baseY2); x.lineTo(mx,topY); x.lineTo(mx+topW,topY); x.lineTo(mx+topW,baseY2);
    mx+=topW+2+((Math.random()*8)|0);
  }
  x.lineTo(W,H); x.fill();
  // low haze line
  x.fillStyle=mistCol; x.fillRect(0,H-6,W,6);
  skyBuilt=modifier;
}


// --- Sprite ground anchor (projected floor plane; no vertical wobble on ground sprites) ---
const CR_SPRITE_GROUND_ANCHOR = 1;
const CR_SPRITE_ANCHOR = {
  person: { footY: 44, textureH: 46, floating: false },
  can: { footY: 18, textureH: 22, floating: false },
  crate: { footY: 18, textureH: 22, floating: false },
  exit: { footY: 76, textureH: 80, floating: true }
};
function crProjectedGroundBottomY(depth){
  const lineH = RH / Math.max(0.12, depth);
  return RH / 2 + lineH / 2;
}
function crGetSpriteFootAnchor(tex, obj){
  if(tex === TEX.exit || (obj && obj === game.exit)) return Object.assign({}, CR_SPRITE_ANCHOR.exit);
  if(tex === TEX.can) return Object.assign({}, CR_SPRITE_ANCHOR.can);
  if(tex && tex.height === 46 && tex.width === 28) return Object.assign({}, CR_SPRITE_ANCHOR.person);
  const th = (tex && tex.height) ? tex.height : 48;
  return { footY: Math.max(1, Math.round(th * 0.9)), textureH: th, floating: false };
}
function crSpriteAllowsVerticalWobble(tex, obj){
  const a = crGetSpriteFootAnchor(tex, obj);
  return !!a.floating;
}
function crProjectBillboardSprite(obj, tex, hp, depth, hscr, now){
  const anchor = crGetSpriteFootAnchor(tex, obj);
  const lineH = RH / Math.max(0.12, depth);
  const screenH = hp * lineH;
  const screenW = screenH * ((tex.width || 1) / (tex.height || 1));
  const screenX = (RW / 2) * (1 + hscr / depth);
  const groundBottomY = crProjectedGroundBottomY(depth);
  const footFrac = anchor.footY / anchor.textureH;
  let yoffUsed = 0;
  if(anchor.floating) yoffUsed = Math.sin((now || 0) / 180) * 2.5;
  const topY = groundBottomY - screenH * footFrac + yoffUsed;
  const feetY = groundBottomY + (anchor.floating ? yoffUsed : 0);
  const groundedDelta = anchor.floating ? null : (feetY - groundBottomY);
  return {
    screenX, screenW, screenH, groundBottomY, topY, feetY, footAnchor: anchor.footY,
    yoffUsed, isGroundAnchored: !anchor.floating && Math.abs(yoffUsed) < 0.01,
    groundedDelta, floating: !!anchor.floating
  };
}
function crDebugSpriteProjection(){
  const samples = [];
  function sampleObj(obj, tex, hp, label){
    if(!obj || !tex) return;
    const rwx = obj.x - player.x, rwy = obj.y - player.y;
    const a = player.angle;
    const dirX = Math.cos(a), dirY = Math.sin(a);
    const planeX = -Math.sin(a) * cfg.fov, planeY = Math.cos(a) * cfg.fov;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const depth = invDet * (-planeY * rwx + planeX * rwy);
    const hscr = invDet * (dirY * rwx - dirX * rwy);
    if(depth <= 0.12) return;
    const p = crProjectBillboardSprite(obj, tex, hp, depth, hscr, performance.now());
    samples.push(Object.assign({ kind: label, depth: +depth.toFixed(3) }, p));
  }
  for(const n of game.npcs){ if(!n.helped) sampleObj(n, npcSpriteTex(n.kind), HEIGHT[n.kind] || HEIGHT.hungry, 'npc:' + n.kind); }
  for(const c of game.pickups){ if(!c.taken) sampleObj(c, TEX.can, HEIGHT.can, 'can'); }
  for(const pr of game.props){ sampleObj(pr, propTex(pr.kind, pr), HEIGHT[pr.kind] || 0.5, 'prop:' + pr.kind); }
  if(game.exit && game.exit.active) sampleObj(game.exit, TEX.exit, HEIGHT.exit, 'exit');
  return { BUILD_ID, samples };
}
