// -----------------------------------------------------------------------
// SECTION 3 — CITY GENERATION
// -----------------------------------------------------------------------
// Wall type constants. BUILDING=tan stucco, GLASS=storefront glass.
const WALL = { BUILDING:1, BRICK:2, FENCE:3, MURAL:4, VAN:5, GLASS:6,
               GARAGE:7, CONCRETE:8, SIGNAGE:9 };

// Splice into index.html — street-block level grammar (GW=40 GH=20 unchanged)

const STREET_FOOTPRINT_W = 40;
const STREET_FOOTPRINT_H = 20;
/** FPV wall height multiplier (~50% more substantial storefronts / blocks). */
const CR_BUILDING_FPV_MASS = 1.5;

/** Semantic building modules — authority is CR_FACADE_PACK (copy-paste bridge). */
/* BEGIN SNC FACADE PACK v1 */
const CR_FACADE_PACK = {
  version: 'facadeart1',
  modules: {
    storefront_4x2: {
      cells: ['####', '####'],
      front: 'south',
      faces: {
        south: ['storefront_window', 'storefront_door', 'storefront_window', 'storefront_sign'],
        north: ['service_wall', 'mural_wall', 'blank_brick', 'utility_wall'],
        east: ['side_door', 'blank_brick'],
        west: ['blank_brick', 'blank_brick']
      }
    },
    storefront_3x2: {
      cells: ['###', '###'],
      front: 'south',
      faces: {
        south: ['storefront_window', 'storefront_door', 'storefront_sign'],
        north: ['service_wall', 'blank_brick', 'utility_wall'],
        east: ['blank_brick', 'side_door'],
        west: ['blank_brick', 'blank_brick']
      }
    },
    restroom_pavilion: {
      cells: ['#######', '#######', '#######', '#######'],
      front: 'south',
      faces: {
        south: ['storefront_window', 'storefront_door', 'storefront_door', 'storefront_window', 'blank_brick', 'mural_wall', 'utility_wall'],
        north: ['blank_brick', 'blank_brick', 'blank_brick', 'blank_brick', 'service_wall', 'service_wall', 'mural_wall'],
        east: ['blank_brick', 'side_door', 'blank_brick', 'utility_wall'],
        west: ['blank_brick', 'blank_brick', 'side_door', 'blank_brick']
      }
    },
    blank_service_block: {
      cells: ['###', '###'],
      front: 'south',
      faces: {
        south: ['blank_brick', 'service_wall', 'utility_wall'],
        north: ['utility_wall', 'service_wall', 'blank_brick'],
        east: ['blank_brick', 'side_door'],
        west: ['blank_brick', 'blank_brick']
      }
    },
    garage_service_4x2: {
      cells: ['####', '####'],
      front: 'south',
      faces: {
        south: ['garage_bay', 'garage_bay', 'service_door', 'utility_wall'],
        north: ['blank_concrete', 'service_wall', 'utility_wall', 'blank_concrete'],
        east: ['blank_concrete', 'side_door'],
        west: ['blank_concrete', 'blank_concrete']
      }
    },
    boarded_shop_3x2: {
      cells: ['###', '###'],
      front: 'south',
      faces: {
        south: ['boarded_window', 'storefront_door', 'boarded_window'],
        north: ['blank_brick', 'mural_wall', 'service_wall'],
        east: ['blank_brick', 'side_door'],
        west: ['blank_brick', 'blank_brick']
      }
    }
  },
  roles: {
    storefront_window: { material: 'brick', slots: ['sign_band', 'glass_window', 'dark_base'] },
    storefront_door: { material: 'brick', slots: ['sign_band', 'glass_door', 'dark_base'] },
    storefront_sign: { material: 'brick', slots: ['large_sign', 'poster_window', 'dark_base'] },
    blank_brick: { material: 'brick', slots: ['soft_brick_bands'] },
    side_door: { material: 'brick', slots: ['soft_brick_bands', 'side_door', 'small_light'] },
    service_wall: { material: 'stucco', slots: ['service_panel', 'vent', 'dark_base'] },
    mural_wall: { material: 'stucco', slots: ['mural_patch', 'dark_base'] },
    utility_wall: { material: 'concrete', slots: ['utility_box', 'small_vent', 'dark_base'] },
    blank_concrete: { material: 'concrete', slots: ['soft_panel_bands'] },
    garage_bay: { material: 'concrete', slots: ['garage_door', 'dark_base'] },
    service_door: { material: 'stucco', slots: ['service_door', 'small_light', 'dark_base'] },
    boarded_window: { material: 'brick', slots: ['sign_band', 'boarded_window', 'dark_base'] }
  },
  slots: {
    sign_band: { kind: 'rect', zone: 'upper', style: 'muted_sign' },
    large_sign: { kind: 'rect', zone: 'upper', style: 'large_sign' },
    glass_window: { kind: 'rect', zone: 'middle', style: 'glass' },
    poster_window: { kind: 'rect', zone: 'middle', style: 'poster' },
    glass_door: { kind: 'door', zone: 'middle', style: 'glass_door' },
    dark_base: { kind: 'rect', zone: 'base', style: 'dark_base' },
    soft_brick_bands: { kind: 'rect', zone: 'full', style: 'soft_brick' },
    side_door: { kind: 'door', zone: 'middle', style: 'side_door' },
    small_light: { kind: 'rect', zone: 'upper', style: 'small_light' },
    service_panel: { kind: 'rect', zone: 'middle', style: 'service_panel' },
    vent: { kind: 'rect', zone: 'upper', style: 'vent' },
    mural_patch: { kind: 'rect', zone: 'middle', style: 'mural' },
    utility_box: { kind: 'rect', zone: 'middle', style: 'utility_box' },
    small_vent: { kind: 'rect', zone: 'upper', style: 'small_vent' },
    soft_panel_bands: { kind: 'rect', zone: 'full', style: 'soft_panel' },
    garage_door: { kind: 'rect', zone: 'middle', style: 'garage_door' },
    service_door: { kind: 'door', zone: 'middle', style: 'service_door' },
    boarded_window: { kind: 'rect', zone: 'middle', style: 'boards' }
  },
  materials: {
    brick: { base: 'brick', texture: 'soft_block' },
    stucco: { base: 'stucco', texture: 'soft_block' },
    concrete: { base: 'concrete', texture: 'soft_block' }
  }
};
/* END SNC FACADE PACK v1 */

function crGetFacadeModule(moduleId){
  const m = CR_FACADE_PACK && CR_FACADE_PACK.modules[moduleId];
  if(!m) return null;
  const cells = m.cells || [];
  const h = cells.length;
  const w = h ? String(cells[0]).length : 0;
  return { id: moduleId, w, h, front: m.front, faces: m.faces };
}

function crNormalizeFacadeRoleId(role){
  const aliases = {
    storefront_glass: 'storefront_window',
    storefront_poster: 'storefront_sign',
    blank_brick_side: 'blank_brick',
    back_service_wall: 'service_wall',
    mural_panel: 'mural_wall'
  };
  return aliases[role] || role;
}

function crFacadePackZoneBounds(zone, h){
  if(zone === 'upper') return { y0: h * 0.06, y1: h * 0.24 };
  if(zone === 'middle') return { y0: h * 0.26, y1: h * 0.74 };
  if(zone === 'base') return { y0: h * 0.78, y1: h * 0.96 };
  return { y0: h * 0.08, y1: h * 0.92 };
}

function crDrawFpvFacadePackMaterialBase(ctx, col, y0, sliceH, pw, materialKey){
  const mat = CR_FACADE_PACK.materials[materialKey] || CR_FACADE_PACK.materials.brick;
  const fills = {
    brick: 'rgba(118,92,68,0.92)',
    stucco: 'rgba(168,158,142,0.90)',
    concrete: 'rgba(132,136,128,0.88)'
  };
  ctx.fillStyle = fills[mat.base] || fills.brick;
  ctx.fillRect(col, y0, pw, sliceH);
}

function crDrawFpvFacadePackSlotStyle(ctx, col, y0, sliceH, pw, slot){
  const zb = crFacadePackZoneBounds(slot.zone, sliceH);
  const sy = y0 + zb.y0;
  const sh = Math.max(2, zb.y1 - zb.y0);
  const st = slot.style;
  if(st === 'muted_sign' || st === 'large_sign'){
    ctx.fillStyle = st === 'large_sign' ? 'rgba(198,152,72,0.55)' : 'rgba(178,138,68,0.42)';
    ctx.fillRect(col, sy, pw, sh);
    return;
  }
  if(st === 'glass'){
    ctx.fillStyle = 'rgba(58,78,96,0.72)';
    ctx.fillRect(col, sy, pw, sh);
    return;
  }
  if(st === 'poster'){
    ctx.fillStyle = 'rgba(168,72,58,0.58)';
    ctx.fillRect(col, sy, pw, sh);
    return;
  }
  if(st === 'glass_door'){
    ctx.fillStyle = 'rgba(48,38,32,0.78)';
    ctx.fillRect(col, sy, pw, sh);
    ctx.fillStyle = 'rgba(210,175,80,0.45)';
    ctx.fillRect(col + pw * 0.55, sy + sh * 0.55, Math.max(1, pw * 0.12), Math.max(1, sh * 0.08));
    return;
  }
  if(st === 'dark_base'){
    ctx.fillStyle = 'rgba(22,18,14,0.88)';
    ctx.fillRect(col, sy, pw, sh);
    return;
  }
  if(st === 'soft_brick'){
    ctx.fillStyle = 'rgba(88,68,52,0.12)';
    ctx.fillRect(col, y0 + sliceH * 0.22, pw, sliceH * 0.14);
    ctx.fillRect(col, y0 + sliceH * 0.50, pw, sliceH * 0.12);
    return;
  }
  if(st === 'side_door'){
    ctx.fillStyle = 'rgba(52,40,32,0.75)';
    ctx.fillRect(col + pw * 0.18, sy, pw * 0.58, sh);
    return;
  }
  if(st === 'small_light'){
    ctx.fillStyle = 'rgba(220,200,140,0.35)';
    ctx.fillRect(col + pw * 0.35, sy, pw * 0.3, sh * 0.35);
    return;
  }
  if(st === 'service_panel'){
    ctx.fillStyle = 'rgba(108,110,102,0.42)';
    ctx.fillRect(col + pw * 0.12, sy, pw * 0.32, sh * 0.55);
    return;
  }
  if(st === 'vent' || st === 'small_vent'){
    ctx.fillStyle = 'rgba(72,76,80,0.38)';
    ctx.fillRect(col + pw * 0.2, sy, pw * 0.55, sh * 0.4);
    return;
  }
  if(st === 'mural'){
    ctx.fillStyle = 'rgba(72,148,132,0.58)';
    ctx.fillRect(col + pw * 0.08, sy, pw * 0.84, sh * 0.85);
    return;
  }
  if(st === 'utility_box'){
    ctx.fillStyle = 'rgba(62,74,82,0.48)';
    ctx.fillRect(col + pw * 0.48, sy, pw * 0.28, sh * 0.5);
    return;
  }
  if(st === 'soft_panel'){
    ctx.fillStyle = 'rgba(48,52,56,0.14)';
    ctx.fillRect(col, y0 + sliceH * 0.18, pw, sliceH * 0.10);
    ctx.fillRect(col, y0 + sliceH * 0.48, pw, sliceH * 0.10);
    return;
  }
  if(st === 'garage_door'){
    ctx.fillStyle = 'rgba(72,76,82,0.82)';
    ctx.fillRect(col + pw * 0.06, sy - sh * 0.05, pw * 0.88, sh * 1.12);
    ctx.fillStyle = 'rgba(38,42,48,0.55)';
    ctx.fillRect(col + pw * 0.12, sy + sh * 0.12, pw * 0.76, sh * 0.08);
    ctx.fillRect(col + pw * 0.12, sy + sh * 0.42, pw * 0.76, sh * 0.08);
    return;
  }
  if(st === 'service_door'){
    ctx.fillStyle = 'rgba(58,50,42,0.78)';
    ctx.fillRect(col + pw * 0.20, sy, pw * 0.55, sh);
    ctx.fillStyle = 'rgba(220,200,140,0.35)';
    ctx.fillRect(col + pw * 0.62, sy + sh * 0.55, Math.max(1, pw * 0.10), Math.max(1, sh * 0.08));
    return;
  }
  if(st === 'boards'){
    ctx.fillStyle = 'rgba(92,68,48,0.72)';
    ctx.fillRect(col + pw * 0.08, sy, pw * 0.84, sh);
    ctx.fillStyle = 'rgba(48,36,28,0.45)';
    for(let i=0;i<4;i++) ctx.fillRect(col + pw * 0.10, sy + sh * (0.08 + i * 0.22), pw * 0.80, Math.max(1, sh * 0.06));
    return;
  }
}

function crGetFacadeFaceContext(mapX, mapY, faceDir){
  if(!game.buildingGrid || !game.buildingGrid[mapY]) return null;
  const cell = game.buildingGrid[mapY][mapX];
  if(!cell) return null;
  const reg = game.buildingRegistry[cell.bid];
  if(!reg || !reg.mod) return null;
  const row = reg.mod.faces && reg.mod.faces[faceDir];
  if(!row || !row.length) return null;
  const panelCount = row.length;
  const panelIndex = (faceDir === 'south' || faceDir === 'north')
    ? Math.min(cell.lx, panelCount - 1)
    : Math.min(cell.ly, panelCount - 1);
  const roleId = crNormalizeFacadeRoleId(row[panelIndex]);
  return { moduleId: reg.moduleId, faceDir, panelCount, panelIndex, faceU: 0, panelU: 0.5, roleId, cell, reg };
}

function crUpdateFacadeFaceU(mapX, mapY, faceDir, wallX){
  const fc = crGetFacadeFaceContext(mapX, mapY, faceDir);
  if(!fc) return null;
  const reg = fc.reg;
  const cell = fc.cell;
  let along = 0, span = 1;
  if(faceDir === 'south' || faceDir === 'north'){
    along = cell.lx + wallX;
    span = Math.max(1, reg.mod.w);
  } else {
    along = cell.ly + wallX;
    span = Math.max(1, reg.mod.h);
  }
  fc.faceU = along / span;
  fc.panelU = along - Math.floor(along);
  if(fc.panelU < 0) fc.panelU = 0;
  if(fc.panelU > 0.999) fc.panelU = 0.999;
  fc.panelIndex = (faceDir === 'south' || faceDir === 'north')
    ? Math.min(cell.lx, fc.panelCount - 1)
    : Math.min(cell.ly, fc.panelCount - 1);
  const row = reg.mod.faces[faceDir];
  fc.roleId = crNormalizeFacadeRoleId(row[fc.panelIndex]);
  return fc;
}

function crFacadeComposeKind(moduleId, faceDir){
  if(faceDir !== 'south' && faceDir !== 'north') return 'side';
  if(moduleId === 'boarded_shop_3x2') return 'boarded_front';
  if(moduleId === 'garage_service_4x2') return 'garage_front';
  if(moduleId === 'storefront_3x2' || moduleId === 'storefront_4x2') return 'storefront_front';
  if(moduleId === 'restroom_pavilion') return 'pavilion_front';
  return 'service_front';
}

function crFacadeArtVocabularyZones(drawStart, sliceH){
  return {
    roof0: drawStart + sliceH * 0.04,
    roof1: drawStart + sliceH * 0.09,
    sign0: drawStart + sliceH * 0.10,
    sign1: drawStart + sliceH * 0.17,
    win0: drawStart + sliceH * 0.22,
    win1: drawStart + sliceH * 0.58,
    door0: drawStart + sliceH * 0.20,
    door1: drawStart + sliceH * 0.62,
    kick0: drawStart + sliceH * 0.74,
    kick1: drawStart + sliceH * 0.81,
    base0: drawStart + sliceH * 0.81,
    base1: drawStart + sliceH * 0.95
  };
}
function crFacadeArtPanelInset(panelIndex, panelCount, margin){
  const w = 1 / Math.max(1, panelCount);
  const x0 = panelIndex * w;
  const x1 = x0 + w;
  const m = margin * w;
  return { px0: x0, px1: x1, ox0: x0 + m, ox1: x1 - m };
}
function crFacadeArtFuIn(fu, x0, x1){
  return fu >= x0 && fu < x1;
}
function crFacadeArtColBand(ctx, col, pw, y0, y1, color){
  if(y1 <= y0) return;
  ctx.fillStyle = color;
  ctx.fillRect(col, y0, pw, Math.max(1, y1 - y0));
}
function crFacadeArtColLine(ctx, col, pw, y, color){
  ctx.fillStyle = color;
  ctx.fillRect(col, y, pw, 1);
}

function crDrawComposedFacadeFaceColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId){
  if(sliceH < 14 || !roleId) return;
  const faceDir = crWallHitFaceDir(side, stepX, stepY);
  const fc = crUpdateFacadeFaceU(mapX, mapY, faceDir, wallX);
  if(!fc){
    crDrawFpvFacadePackColumnLegacy(ctx, col, drawStart, sliceH, roleId);
    return;
  }
  const pw = 1;
  const roleKey = crNormalizeFacadeRoleId(fc.roleId || roleId);
  const role = CR_FACADE_PACK.roles[roleKey];
  if(!role) return;
  crDrawFpvFacadePackMaterialBase(ctx, col, drawStart, sliceH, pw, role.material);
  const Z = crFacadeArtVocabularyZones(drawStart, sliceH);
  const fu = fc.faceU;
  const kind = crFacadeComposeKind(fc.moduleId, faceDir);
  const row = fc.reg.mod.faces[faceDir];
  const norm = (i)=> crNormalizeFacadeRoleId(row[i]);
  const n = row.length;

  function panelAt(i){
    return crFacadeArtPanelInset(i, n, 0.14);
  }

  if(kind === 'storefront_front'){
    if(crFacadeArtFuIn(fu, 0, 1)){
      crFacadeArtColBand(ctx, col, pw, Z.roof0, Z.roof1, 'rgba(42,38,34,0.55)');
      crFacadeArtColLine(ctx, col, pw, Z.roof1, 'rgba(28,26,22,0.70)');
    }
    if(crFacadeArtFuIn(fu, 0, 1)){
      crFacadeArtColBand(ctx, col, pw, Z.sign0, Z.sign1, 'rgba(168,142,88,0.38)');
      crFacadeArtColLine(ctx, col, pw, Z.sign0, 'rgba(32,28,24,0.45)');
      crFacadeArtColLine(ctx, col, pw, Z.sign1, 'rgba(32,28,24,0.45)');
    }
    for(let i=0;i<n;i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(!crFacadeArtFuIn(fu, P.ox0, P.ox1)) continue;
      if(pr === 'storefront_door'){
        crFacadeArtColBand(ctx, col, pw, Z.door0, Z.door1, 'rgba(44,36,30,0.88)');
        crFacadeArtColBand(ctx, col, pw, Z.door0, Z.door0 + (Z.door1-Z.door0)*0.28, 'rgba(72,92,108,0.55)');
        if(crFacadeArtFuIn(fu, P.ox0 + (P.ox1-P.ox0)*0.72, P.ox1)){
          crFacadeArtColBand(ctx, col, pw, Z.door0 + (Z.door1-Z.door0)*0.48, Z.door0 + (Z.door1-Z.door0)*0.52, 'rgba(210,175,80,0.50)');
        }
        crFacadeArtColLine(ctx, col, pw, P.ox0 === fu ? Z.door0 : Z.door0, 'rgba(22,18,14,0.50)');
      } else if(pr === 'storefront_window'){
        crFacadeArtColBand(ctx, col, pw, Z.win0, Z.win1, 'rgba(62,82,98,0.62)');
        crFacadeArtColBand(ctx, col, pw, Z.win0, Z.win0 + (Z.win1-Z.win0)*0.12, 'rgba(120,145,165,0.35)');
        crFacadeArtColLine(ctx, col, pw, Z.win0 + (Z.win1-Z.win0)*0.5, 'rgba(38,48,58,0.40)');
      } else if(pr === 'storefront_sign'){
        crFacadeArtColBand(ctx, col, pw, Z.win0, Z.win0 + (Z.win1-Z.win0)*0.35, 'rgba(152,118,72,0.42)');
        crFacadeArtColBand(ctx, col, pw, Z.win0 + (Z.win1-Z.win0)*0.42, Z.win1, 'rgba(58,78,96,0.48)');
      }
    }
    if(crFacadeArtFuIn(fu, 0, 1)){
      crFacadeArtColBand(ctx, col, pw, Z.kick0, Z.kick1, 'rgba(32,28,24,0.75)');
      crFacadeArtColBand(ctx, col, pw, Z.base0, Z.base1, 'rgba(18,16,14,0.90)');
    }
    return;
  }

  if(kind === 'pavilion_front'){
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColLine(ctx, col, pw, Z.roof1, 'rgba(48,52,48,0.50)');
    for(let i=0;i<n;i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(!crFacadeArtFuIn(fu, P.ox0, P.ox1)) continue;
      if(pr === 'storefront_door'){
        crFacadeArtColBand(ctx, col, pw, Z.door0, Z.door1, 'rgba(58,62,58,0.78)');
      } else if(pr === 'mural_wall'){
        crFacadeArtColBand(ctx, col, pw, Z.win0, Z.win1, 'rgba(88,128,118,0.40)');
      } else if(pr === 'utility_wall'){
        crFacadeArtColBand(ctx, col, pw, Z.win0 + (Z.win1-Z.win0)*0.35, Z.win0 + (Z.win1-Z.win0)*0.55, 'rgba(72,78,82,0.45)');
      }
    }
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, Z.base0, Z.base1, 'rgba(28,30,28,0.82)');
    return;
  }

  if(kind === 'boarded_front'){
    if(crFacadeArtFuIn(fu, 0, 1)){
      crFacadeArtColBand(ctx, col, pw, Z.sign0, Z.sign1, 'rgba(140,128,108,0.22)');
      crFacadeArtColLine(ctx, col, pw, Z.sign1, 'rgba(48,42,36,0.35)');
    }
    for(let i=0;i<n;i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(pr === 'storefront_door' && crFacadeArtFuIn(fu, P.ox0, P.ox1)){
        crFacadeArtColBand(ctx, col, pw, Z.door0, Z.door1, 'rgba(46,38,32,0.85)');
        crFacadeArtColBand(ctx, col, pw, Z.kick0, Z.kick1, 'rgba(36,30,26,0.70)');
      } else if(pr === 'boarded_window' && crFacadeArtFuIn(fu, P.ox0, P.ox1)){
        const wbox0 = Z.win0, wbox1 = Z.win0 + (Z.win1 - Z.win0) * 0.92;
        crFacadeArtColBand(ctx, col, pw, wbox0, wbox1, 'rgba(118,98,72,0.55)');
        const plankH = (wbox1 - wbox0) / 6;
        for(let b=0;b<5;b++){
          const py = wbox0 + plankH * (0.35 + b * 1.05);
          crFacadeArtColBand(ctx, col, pw, py, py + Math.max(1, plankH * 0.28), 'rgba(78,62,48,0.55)');
        }
        crFacadeArtColLine(ctx, col, pw, wbox0, 'rgba(40,34,28,0.50)');
        crFacadeArtColLine(ctx, col, pw, wbox1, 'rgba(40,34,28,0.50)');
      }
    }
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, Z.base0, Z.base1, 'rgba(18,16,14,0.90)');
    return;
  }

  if(kind === 'garage_front'){
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, Z.sign0, Z.sign1, 'rgba(128,132,126,0.18)');
    let g0 = -1, g1 = -1;
    for(let i=0;i<n;i++){
      if(norm(i) === 'garage_bay'){ if(g0<0) g0=i; g1=i+1; }
    }
    if(g0 >= 0){
      const gx0 = g0 / n, gx1 = g1 / n;
      const frameM = 0.04 / n * (g1 - g0);
      const bx0 = gx0 + frameM, bx1 = gx1 - frameM;
      const bayY0 = Z.win0 - sliceH * 0.02, bayY1 = Z.win1 + sliceH * 0.04;
      if(crFacadeArtFuIn(fu, gx0, gx1)){
        crFacadeArtColLine(ctx, col, pw, bayY0, 'rgba(28,30,32,0.75)');
        crFacadeArtColLine(ctx, col, pw, bayY1, 'rgba(28,30,32,0.75)');
      }
      if(crFacadeArtFuIn(fu, bx0, bx1)){
        crFacadeArtColBand(ctx, col, pw, bayY0 + 2, bayY1 - 2, 'rgba(52,56,62,0.82)');
        const rh = (bayY1 - bayY0) * 0.11;
        crFacadeArtColBand(ctx, col, pw, bayY0 + rh * 1.2, bayY0 + rh * 1.2 + rh, 'rgba(36,40,46,0.50)');
        crFacadeArtColBand(ctx, col, pw, bayY0 + rh * 3.0, bayY0 + rh * 3.0 + rh, 'rgba(36,40,46,0.50)');
      }
    }
    for(let i=0;i<n;i++){
      const P = panelAt(i);
      if(norm(i) === 'service_door' && crFacadeArtFuIn(fu, P.ox0, P.ox1)){
        const sd0 = Z.door0 + (Z.door1 - Z.door0) * 0.12;
        const sd1 = Z.door0 + (Z.door1 - Z.door0) * 0.72;
        crFacadeArtColBand(ctx, col, pw, sd0, sd1, 'rgba(54,48,40,0.80)');
        crFacadeArtColLine(ctx, col, pw, sd0, 'rgba(30,28,26,0.55)');
      }
    }
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, Z.base0, Z.base1, 'rgba(18,16,14,0.90)');
    return;
  }

  if(kind === 'side' || kind === 'service_front'){
    if(roleKey === 'mural_wall' && crFacadeArtFuIn(fu, 0.22, 0.78)){
      crFacadeArtColBand(ctx, col, pw, Z.win0, Z.win1, 'rgba(72,128,112,0.38)');
      crFacadeArtColLine(ctx, col, pw, Z.win0, 'rgba(40,48,44,0.40)');
      crFacadeArtColLine(ctx, col, pw, Z.win1, 'rgba(40,48,44,0.40)');
    }
    if(roleKey === 'side_door' && crFacadeArtFuIn(fu, 0.32, 0.68)){
      crFacadeArtColBand(ctx, col, pw, Z.door0, Z.door1, 'rgba(50,40,34,0.72)');
      crFacadeArtColLine(ctx, col, pw, Z.door0, 'rgba(28,24,20,0.45)');
    }
    if(roleKey === 'utility_wall' && crFacadeArtFuIn(fu, 0.58, 0.78)){
      crFacadeArtColBand(ctx, col, pw, Z.win0 + (Z.win1-Z.win0)*0.55, Z.win0 + (Z.win1-Z.win0)*0.72, 'rgba(62,70,76,0.42)');
    }
    if(roleKey === 'service_wall' && crFacadeArtFuIn(fu, 0.12, 0.38)){
      crFacadeArtColBand(ctx, col, pw, Z.win0 + (Z.win1-Z.win0)*0.4, Z.win0 + (Z.win1-Z.win0)*0.55, 'rgba(98,100,94,0.32)');
    }
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, Z.base0, Z.base1, 'rgba(22,20,18,0.72)');
    return;
  }

  crDrawFpvFacadePackSlotStyle(ctx, col, drawStart, sliceH, pw, { zone: 'base', style: 'dark_base' });
}

function crDrawFpvFacadePackColumnLegacy(ctx, col, drawStart, sliceH, roleId){
  if(sliceH < 14 || !roleId) return;
  const pw = 1;
  const roleKey = crNormalizeFacadeRoleId(roleId);
  const role = CR_FACADE_PACK.roles[roleKey];
  if(!role) return;
  crDrawFpvFacadePackMaterialBase(ctx, col, drawStart, sliceH, pw, role.material);
  for(const slotName of role.slots || []){
    const slot = CR_FACADE_PACK.slots[slotName];
    if(slot && slot.style !== 'soft_brick' && slot.style !== 'soft_panel'){
      crDrawFpvFacadePackSlotStyle(ctx, col, drawStart, sliceH, pw, slot);
    }
  }
}
function crDrawFpvFacadePackColumn(ctx, col, drawStart, sliceH, roleId, wallX){
  crDrawFpvFacadePackColumnLegacy(ctx, col, drawStart, sliceH, roleId);
}


function crDebugDescribeFacadeHit(tileX, tileY, hitSide){
  const faceDir = (typeof hitSide === 'string') ? hitSide
    : (hitSide && hitSide.faceDir) ? hitSide.faceDir
    : crWallHitFaceDir(hitSide && hitSide.side, hitSide && hitSide.stepX, hitSide && hitSide.stepY);
  const tx = tileX | 0;
  const ty = tileY | 0;
  const roleRaw = crGetBuildingFaceRole(tx, ty, faceDir);
  const role = roleRaw ? crNormalizeFacadeRoleId(roleRaw) : null;
  const cell = game.buildingGrid && game.buildingGrid[ty] && game.buildingGrid[ty][tx];
  const roleDef = role && CR_FACADE_PACK.roles[role];
  return {
    buildingId: cell ? cell.bid : null,
    moduleId: cell ? cell.mid : null,
    localX: cell ? cell.lx : null,
    localY: cell ? cell.ly : null,
    faceDirection: faceDir,
    role: role,
    material: roleDef ? roleDef.material : null,
    slots: roleDef ? (roleDef.slots || []).slice() : []
  };
}

function crClearBuildingModules(GW, GH){
  game.buildingRegistry = {};
  game.buildingGrid = [];
  game._nextBuildingId = 1;
  for(let y=0;y<GH;y++) game.buildingGrid.push(new Array(GW).fill(null));
}

function crPlaceBuildingModule(map, shade, x0, y0, moduleId, frontFace){
  const mod = crGetFacadeModule(moduleId);
  if(!mod) return false;
  for(let dy=0;dy<mod.h;dy++){
    for(let dx=0;dx<mod.w;dx++){
      const x = x0+dx, y = y0+dy;
      if(x<1||y<1||x>=map[0].length-1||y>=map.length-1) return false;
    }
  }
  const bid = game._nextBuildingId++;
  game.buildingRegistry[bid] = { moduleId, x0, y0, front: frontFace, mod };
  for(let dy=0;dy<mod.h;dy++){
    for(let dx=0;dx<mod.w;dx++){
      const x = x0+dx, y = y0+dy;
      if(map[y][x]===0) continue;
      map[y][x] = WALL.BUILDING;
      shade[y][x] = 0.5;
      game.buildingGrid[y][x] = { bid, lx: dx, ly: dy, mid: moduleId };
    }
  }
  return true;
}

function crAssignBuildingModules(map, shade, meta, d, r){
  const { roadY0, roadY1, GW, GH } = meta;
  if(!game.buildingGrid || game.buildingGrid.length !== GH) crClearBuildingModules(GW, GH);
  const segW = 9;
  const segCount = Math.ceil((GW-4)/segW);
  const spineXs = [5, 12, 20, 28, 35];
  for(let seg=0; seg<segCount; seg++){
    const bx0 = 2 + seg*segW;
    if(bx0 + 5 >= GW-3) continue;
    if(d>=2){
      const ySouth = roadY1 + 3;
      if(ySouth + 2 < GH-2 && !spineXs.some(sx => sx>=bx0 && sx<=bx0+4)){
        let mid = r()<0.4 ? 'storefront_3x2' : 'storefront_4x2';
        if(d===2 && seg % 3 === 1) mid = 'boarded_shop_3x2';
        else if(d>=3 && seg % 4 === 2) mid = 'boarded_shop_3x2';
        crPlaceBuildingModule(map, shade, bx0+1, ySouth, mid, 'north');
      }
      const yNorth = Math.max(2, roadY0 - 4);
      if(yNorth >= 2){
        let midN = 'storefront_4x2';
        if(d===2 && seg % 5 === 2) midN = 'boarded_shop_3x2';
        crPlaceBuildingModule(map, shade, bx0+2, yNorth, midN, 'south');
      }
    }
  }
  if(d===3){
    crPlaceBuildingModule(map, shade, 7, Math.min(GH-4, roadY1+4), 'garage_service_4x2', 'north');
    crPlaceBuildingModule(map, shade, 22, Math.max(2, roadY0-4), 'boarded_shop_3x2', 'south');
    crPlaceBuildingModule(map, shade, 14, Math.max(2, roadY0-5), 'blank_service_block', 'south');
  }
  if(d>=4){
    crPlaceBuildingModule(map, shade, 30, Math.max(2, roadY0-3), 'garage_service_4x2', 'south');
  }
}

function crRegisterD1PavilionModule(lm, map){
  if(!lm || !game.buildingGrid || !map) return;
  const mod = crGetFacadeModule('restroom_pavilion');
  const bid = game._nextBuildingId++;
  const front = lm.northSide ? 'south' : 'north';
  game.buildingRegistry[bid] = { moduleId: 'restroom_pavilion', x0: lm.x0, y0: lm.y0, front, mod };
  for(let y=lm.y0;y<=lm.y1;y++){
    for(let x=lm.x0;x<lm.x0+mod.w;x++){
      if(y<0||x<0||y>=game.buildingGrid.length||x>=game.buildingGrid[0].length) continue;
      if(map[y][x]===0) continue;
      game.buildingGrid[y][x] = { bid, lx: x-lm.x0, ly: y-lm.y0, mid: 'restroom_pavilion' };
    }
  }
}

function crWallHitFaceDir(side, stepX, stepY){
  if(side===0) return stepX>0 ? 'west' : 'east';
  return stepY>0 ? 'north' : 'south';
}

function crGetBuildingFaceRole(mapX, mapY, faceDir){
  if(!game.buildingGrid || !game.buildingGrid[mapY]) return null;
  const cell = game.buildingGrid[mapY][mapX];
  if(!cell) return null;
  const reg = game.buildingRegistry[cell.bid];
  if(!reg || !reg.mod || !reg.mod.faces) return null;
  const row = reg.mod.faces[faceDir];
  if(!row || !row.length) return null;
  if(faceDir==='south' || faceDir==='north') return row[Math.min(cell.lx, row.length-1)];
  return row[Math.min(cell.ly, row.length-1)];
}

function crResolveBuildingFaceRole(mapX, mapY, side, stepX, stepY){
  return crGetBuildingFaceRole(mapX, mapY, crWallHitFaceDir(side, stepX, stepY));
}

function crWallVisualMassScale(mapX, mapY, wt){
  const lm = game.d1ParkLandmark;
  if(lm && mapX >= lm.x0 && mapX <= lm.x1 && mapY >= lm.y0 && mapY <= lm.y1) return 1.58;
  if(wt === WALL.FENCE || wt === WALL.VAN) return 1.0;
  if(wt > 0) return CR_BUILDING_FPV_MASS;
  return 1;
}

function crFpvFacadeFaceHash(mapX, mapY, side){
  return ((mapX * 73856093) ^ (mapY * 19349663) ^ (side * 83492791)) >>> 0;
}

function crFpvFacadePanelLeadingEdge(wallX){
  const panels = 4;
  const u = wallX - Math.floor(wallX);
  const cell = Math.floor(u * panels);
  const frac = u * panels - cell;
  return frac < (1 / (panels * 3));
}

function crDrawFpvWorldFacadePanel(ctx, col, drawStart, sliceH, wt, mapX, mapY, side, wallX){
  if(sliceH < 18 || wt === WALL.FENCE || wt === WALL.VAN) return;
  if(!crFpvFacadePanelLeadingEdge(wallX)) return;
  const panelW = Math.min(8, RW - col);
  const h = crFpvFacadeFaceHash(mapX, mapY, side);
  const cell = Math.floor((wallX - Math.floor(wallX)) * 4);
  const variant = (h + cell * 17 + wt * 3) % 6;
  ctx.fillStyle = 'rgba(12,10,8,0.05)';
  ctx.fillRect(col, drawStart, panelW, sliceH);
  const doorH = Math.max(8, (sliceH * 0.32)|0);
  const doorY = drawStart + sliceH - doorH;
  if(variant === 0 || variant === 3){
    ctx.fillStyle = 'rgba(22,18,14,0.42)';
    ctx.fillRect(col, doorY, panelW, doorH);
  }
  if(variant === 1 || variant === 2 || variant === 4){
    const winH = Math.max(6, (sliceH * 0.16)|0);
    const winY = drawStart + (sliceH * 0.22)|0;
    ctx.fillStyle = wt === WALL.GLASS ? 'rgba(88,108,128,0.28)' : 'rgba(42,52,64,0.32)';
    ctx.fillRect(col, winY, panelW, winH);
  }
  if(variant === 2 || wt === WALL.GLASS){
    const awH = Math.max(5, (sliceH * 0.1)|0);
    ctx.fillStyle = 'rgba(120,95,62,0.22)';
    ctx.fillRect(col, drawStart + 3, panelW, awH);
  }
  if(variant === 5 && (wt === WALL.MURAL || wt === WALL.SIGNAGE || wt === WALL.CONCRETE)){
    ctx.fillStyle = 'rgba(168,72,48,0.28)';
    ctx.fillRect(col, drawStart + (sliceH * 0.35)|0, panelW, Math.max(8, (sliceH * 0.22)|0));
  }
}

function crCoarseWallTexX(wallX, side, rdx, rdy, wt){
  if(wt === WALL.FENCE) return ((wallX * TEXSIZE) | 0) & ~1;
  const coarse = CR_FPV_WALL_TEX_COARSE;
  let u = wallX - Math.floor(wallX);
  let texX = Math.floor(u * TEXSIZE / coarse) * coarse;
  texX = Math.max(0, Math.min(TEXSIZE - coarse, texX));
  if(side === 0 && rdx > 0) texX = TEXSIZE - coarse - texX;
  if(side === 1 && rdy < 0) texX = TEXSIZE - coarse - texX;
  return texX;
}

function crDrawProceduralFacadeCue(ctx, col, drawStart, sliceH, wt, wallBand){
  if(sliceH < 14) return;
  if(wallBand !== 1 && wallBand !== 3) return;
  const pw = 3;
  const doorH = Math.max(6, (sliceH * 0.28)|0);
  ctx.fillStyle = 'rgba(18,14,10,0.48)';
  ctx.fillRect(col, drawStart + sliceH - doorH, pw, doorH);
  if(wt === WALL.GLASS || wt === WALL.BUILDING || wt === WALL.BRICK){
    const winH = Math.max(5, (sliceH * 0.14)|0);
    const winY = drawStart + (sliceH * 0.28)|0;
    ctx.fillStyle = wt === WALL.GLASS ? 'rgba(95,118,142,0.32)' : 'rgba(50,62,78,0.36)';
    ctx.fillRect(col, winY, pw, winH);
    if(wt === WALL.GLASS && sliceH > 24){
      ctx.fillStyle = 'rgba(160,140,95,0.18)';
      ctx.fillRect(col, drawStart + 4, pw, Math.max(4, (sliceH * 0.09)|0));
    }
  }
  if(wt === WALL.GARAGE){
    ctx.fillStyle = 'rgba(38,36,32,0.42)';
    ctx.fillRect(col, drawStart + sliceH - doorH, pw, doorH);
  }
  if(wt === WALL.MURAL || wt === WALL.CONCRETE){
    ctx.fillStyle = 'rgba(175,70,52,0.38)';
    ctx.fillRect(col, drawStart + (sliceH * 0.34)|0, pw, Math.max(5, (sliceH * 0.2)|0));
  }
}

function crPickWallType(r){
  const pool=[WALL.BUILDING,WALL.BUILDING,WALL.BRICK,WALL.BRICK,WALL.GLASS,WALL.MURAL,WALL.GARAGE,WALL.CONCRETE,WALL.SIGNAGE];
  return pool[(r()*pool.length)|0];
}

function crDistrictGrammarKnobs(d, modifier){
  const dd = Math.max(1, Math.min(5, d|0));
  let buildingFill = 0.14 + dd*0.11;
  let alleyBias = 0.18 + dd*0.14;
  let roadHalf = Math.max(2, 5 - ((dd-1)>>1));
  let maxVertAlleys = 2 + dd;
  let shallowPocketRate = 0.2;
  let backAlleyRate = 0.1;
  let servicePocketRate = 0.25;
  let storefrontBands = dd >= 2;
  if(dd === 1){
    buildingFill = 0.11; alleyBias = 0.10; roadHalf = 5;
    maxVertAlleys = 0; shallowPocketRate = 0.08; backAlleyRate = 0; servicePocketRate = 0;
    storefrontBands = false;
  } else if(dd === 2){
    buildingFill = 0.34; alleyBias = 0.16; roadHalf = 4;
    maxVertAlleys = 2; shallowPocketRate = 0.78; backAlleyRate = 0.12; servicePocketRate = 0.45;
  } else if(dd === 3){
    buildingFill = 0.41; alleyBias = 0.50; roadHalf = 3;
    maxVertAlleys = 4; shallowPocketRate = 0.55; backAlleyRate = 0.48; servicePocketRate = 0.58;
  } else if(dd === 4){
    buildingFill = 0.46; alleyBias = 0.64; roadHalf = 3;
    maxVertAlleys = 6; shallowPocketRate = 0.70; backAlleyRate = 0.55; servicePocketRate = 0.82;
  }
  if(modifier==='clear'){ buildingFill = Math.min(buildingFill, 0.14); alleyBias = 0.22; roadHalf = 4; }
  if(modifier==='maze'){ buildingFill = 0.42 + dd*0.06; alleyBias = 0.92; roadHalf = 2; maxVertAlleys += 3; }
  if(modifier==='shortage'){ buildingFill = 0.28 + dd*0.09; alleyBias = 0.35 + dd*0.08; }
  return { buildingFill, alleyBias, roadHalf, maxVertAlleys, shallowPocketRate, backAlleyRate, servicePocketRate, storefrontBands, district: dd };
}

function crPickStorefrontWall(r){
  return r() < 0.58 ? WALL.GLASS : WALL.BUILDING;
}

function crCarveShallowPocket(map, bx0, bx1, bandY, yMin, yMax){
  const px = bx0 + 2 + (((bx1 - bx0 - 5) * 0.5) | 0);
  for(let dx = 0; dx < 3; dx++){
    const xx = px + dx;
    if(xx > bx0 && xx < bx1 && bandY >= yMin && bandY < yMax) map[bandY][xx] = 0;
  }
}

function crCarveServicePocket(map, bx0, bx1, py, yMin, yMax, depth, r){
  const px = bx0 + 1 + (((bx1 - bx0 - 5) * r()) | 0);
  const d = Math.max(2, depth|0);
  for(let dy = 0; dy < d; dy++) for(let dx = 0; dx < 3; dx++){
    const xx = px + dx, yy = py + dy;
    if(xx > bx0 && xx < bx1 && yy >= yMin && yy < yMax) map[yy][xx] = 0;
  }
}

function crSpawnZoneStats(items, meta){
  const out = { MAIN_ROAD: 0, POCKET: 0, ALLEY: 0 };
  for(const it of items || []){
    const tx = it.x | 0, ty = it.y | 0;
    const z = crStreetZoneAt(tx, ty, meta);
    if(z === 'MAIN_ROAD') out.MAIN_ROAD++;
    else if(z === 'BACK_ALLEY') out.ALLEY++;
    else out.POCKET++;
  }
  return out;
}

function crStreetPropKindForDistrict(zone, district, r){
  const d = district|0;
  const roadStore = ['bench','signboard','mailbox','utility_box'];
  const edge = ['scrub_bush','agave'];
  const alleySvc = ['crate_stack','cooler','shopping_cart','tarp_bundle','sleeping_bag_pile'];
  const wall = ['mural_panel','signboard'];
  if(d === 2){
    if(zone === 'MAIN_ROAD') return crPickWeightedRoadProp(r);
    if(r() < 0.65) return edge[(r()*edge.length)|0];
    return roadStore[(r()*roadStore.length)|0];
  }
  if(d === 3){
    if(zone === 'MAIN_ROAD') return roadStore[(r()*roadStore.length)|0];
    if(zone === 'BACK_ALLEY' || r() < 0.5) return alleySvc[(r()*alleySvc.length)|0];
    if(r() < 0.75) return wall[(r()*wall.length)|0];
    return edge[(r()*edge.length)|0];
  }
  if(d >= 4){
    if(zone === 'MAIN_ROAD' && r() < 0.35) return roadStore[(r()*roadStore.length)|0];
    if(zone === 'BACK_ALLEY' || zone === 'SIDE_N' || zone === 'SIDE_S'){
      if(r() < 0.72) return alleySvc[(r()*alleySvc.length)|0];
      return wall[(r()*wall.length)|0];
    }
    return alleySvc[(r()*alleySvc.length)|0];
  }
  return crStreetPropKindForZone(zone, r);
}

function crPlaceDistrictCommunityProps(d, r, meta, map, reach, used, takeCandidate, roadCands, pocketCands, alleyCands, candidates){
  const propCount = 6 + d + ((r()*4)|0);
  const preferRoad = [roadCands, pocketCands, candidates];
  const preferAlley = [pocketCands, alleyCands, roadCands, candidates];
  const prefer = d >= 4 ? preferAlley : (d === 3 ? [pocketCands, alleyCands, roadCands, candidates] : preferRoad);
  let roadPlaced = 0;
  for(let i = 0; i < propCount; i++){
    let pools = prefer;
    if(d === 4 && roadPlaced >= 2) pools = [pocketCands, alleyCands, candidates];
    const spot = takeCandidate(0.30, 0.8, used, pools);
    if(!spot) break;
    used.push(spot);
    const tx = spot[0]|0, ty = spot[1]|0;
    const zone = crStreetZoneAt(tx, ty, meta);
    const kind = crStreetPropKindForDistrict(zone, d, r);
    game.props.push({ x: spot[0], y: spot[1], kind, wob: r()*6.28 });
    if(zone === 'MAIN_ROAD') roadPlaced++;
  }
}
function applyStreetBlockGrammar(map, shade, GW, GH, district, modifier, r){
  const knobs = crDistrictGrammarKnobs(district, modifier);
  const d = knobs.district;
  crClearBuildingModules(GW, GH);
  const { buildingFill, alleyBias, roadHalf, maxVertAlleys, shallowPocketRate, backAlleyRate, servicePocketRate, storefrontBands } = knobs;

  const centerY = (GH/2)|0;
  const roadY0 = Math.max(2, centerY - roadHalf);
  const roadY1 = Math.min(GH-3, centerY + roadHalf);

  for(let y=0;y<GH;y++) for(let x=0;x<GW;x++){ map[y][x]=1; shade[y][x]=0.42; }
  for(let i=0;i<GW;i++){ map[0][i]=WALL.CONCRETE; map[GH-1][i]=WALL.CONCRETE; }
  for(let i=0;i<GH;i++){ map[i][0]=WALL.CONCRETE; map[i][GW-1]=WALL.CONCRETE; }

  for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){
    map[y][x]=0; shade[y][x]=0.32+r()*0.12;
  }

  function stampRoad(){
    for(let y=roadY0;y<=roadY1;y++) for(let x=2;x<GW-2;x++){
      map[y][x]=0; shade[y][x]=0.44+r()*0.06;
    }
  }
  stampRoad();

  const spineXs = [5, 12, 20, 28, 35];
  for(const cx of spineXs){
    if(cx<2||cx>=GW-2) continue;
    for(let y=2;y<GH-2;y++) map[y][cx]=0;
  }

  if(d===1 || modifier==='clear'){
    for(let y=2;y<=6;y++) for(let x=2;x<=11;x++) map[y][x]=0;
  }

  const segW = 9;
  const segCount = Math.ceil((GW-4)/segW);

  function stampSideBand(yStart, yEnd, seg, side){
    const bx0 = 2 + seg*segW;
    const bx1 = Math.min(GW-3, bx0+segW-1);
    if(bx1<=bx0+2 || yEnd<=yStart) return;
    const inset = d <= 1 ? 1 : 0;
    const fillRate = d===1 ? 0.10 : Math.min(0.88, Math.max(0.32 + d*0.08, buildingFill) * 1.22);
    const doBand = storefrontBands || (d===1 && r()<0.28);
    if(!doBand) return;
    const faceY = side==='north' ? yEnd-1 : yStart;
    if(storefrontBands){
      const facadeRows = d===2 ? 3 : (d>=3 ? 4 : 1);
      for(let fr=0; fr<facadeRows; fr++){
        const fy = faceY + (side==='north' ? -fr : fr);
        if(fy < yStart || fy >= yEnd) continue;
        for(let x=bx0+inset; x<=bx1-inset; x++){
          if(spineXs.indexOf(x)>=0) continue;
          if(fr===0 || r() < 0.62 + d*0.06){
            map[fy][x]= storefrontBands && d<=3 && fr<=1 ? crPickStorefrontWall(r) : crPickWallType(r);
            shade[fy][x]=r();
          }
        }
      }
    }
    for(let y=yStart;y<yEnd;y++) for(let x=bx0+inset;x<=bx1-inset;x++){
      if(spineXs.indexOf(x)>=0) continue;
      const distFromFace = side==='north' ? (faceY - y) : (y - faceY);
      const localFill = distFromFace <= 2 ? fillRate * 1.15 : fillRate;
      if(r()<Math.min(0.9, localFill)){
        map[y][x]=crPickWallType(r); shade[y][x]=r();
      }
    }
    if(d===2 && r()<shallowPocketRate){
      const py = side==='north' ? Math.max(yStart, faceY-1) : Math.min(yEnd-1, faceY+1);
      crCarveShallowPocket(map, bx0, bx1, py, yStart, yEnd);
    }
    if(d>=3 && r()<backAlleyRate){
      const alleyY = side==='north' ? Math.max(yStart, faceY-2) : Math.min(yEnd-1, faceY+2);
      for(let x=bx0+inset; x<=bx1-inset; x++){
        if(spineXs.indexOf(x)>=0) continue;
        if(map[alleyY][x]>0) map[alleyY][x]=0;
      }
    }
    if(d>=4 && r()<servicePocketRate){
      const py = side==='north' ? Math.max(yStart, faceY-2) : faceY+1;
      crCarveServicePocket(map, bx0, bx1, py, yStart, yEnd, 3, r);
    } else if(d===3 && r()<servicePocketRate*0.65){
      const py = side==='north' ? Math.max(yStart, faceY-1) : faceY+1;
      crCarveServicePocket(map, bx0, bx1, py, yStart, yEnd, 2, r);
    }
  }
  for(let seg=0; seg<segCount; seg++){
    if(roadY0>3) stampSideBand(2, roadY0-1, seg, 'north');
    const southY0 = roadY1+2;
    if(southY0<GH-3) stampSideBand(southY0, GH-2, seg, 'south');
  }

  if(d>=3 || modifier==='maze'){
    for(let x=3;x<GW-3;x++){
      if(r()<0.22+alleyBias*0.32){ map[1][x]=0; map[GH-2][x]=0; }
    }
  }

  if(d>=3){
    for(let seg=0; seg<segCount; seg++){
      const ax = Math.min(GW-4, 2 + seg*segW + 3);
      if(spineXs.indexOf(ax)>=0) continue;
      for(let y=2; y<roadY0; y++) map[y][ax]=0;
      for(let y=roadY1+1; y<GH-2; y++) if(r()<0.35) map[y][ax]=0;
    }
  }

  const alleyCount = d<=1 ? 0 : Math.min(maxVertAlleys, 1 + d + (modifier==='maze'?2:0));
  for(let k=0;k<alleyCount;k++){
    const ax = 4+((r()*(GW-9))|0);
    if(spineXs.indexOf(ax)>=0) continue;
    if(d===2){
      const band = r()<0.5 ? roadY0-1 : roadY1+1;
      for(let dy=-1; dy<=1; dy++){
        const yy = band+dy;
        if(yy>1&&yy<GH-2) map[yy][ax]=0;
      }
    } else if(r()<0.55+alleyBias*0.2){
      for(let y=2;y<roadY0;y++) map[y][ax]=0;
    } else {
      for(let y=roadY1+1;y<GH-2;y++) map[y][ax]=0;
    }
  }

  stampRoad();
  for(const cx of spineXs){
    if(cx<2||cx>=GW-2) continue;
    for(let y=2;y<GH-2;y++) if(map[y][cx]!==0) map[y][cx]=0;
  }

  const streetMeta = { roadY0, roadY1, district:d, GW, GH, buildingFill, alleyBias, knobs };
  crAssignBuildingModules(map, shade, streetMeta, d, r);
  return streetMeta;
}

function crStreetZoneAt(tx, ty, meta){
  const { roadY0, roadY1, GW, GH } = meta;
  if(ty<0||tx<0||ty>=GH||tx>=GW) return 'VOID';
  if(ty>=roadY0 && ty<=roadY1) return 'MAIN_ROAD';
  if(ty<=1 || ty>=GH-2) return 'BACK_ALLEY';
  if(ty<roadY0) return 'SIDE_N';
  return 'SIDE_S';
}

function crStreetLayoutMetrics(map, meta){
  const { roadY0, roadY1, GW, GH } = meta;
  let mainRoad=0, buildings=0, alleys=0, pockets=0;
  for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){
    const v = map[y][x];
    if(v===0){
      if(y>=roadY0&&y<=roadY1) mainRoad++;
      else if(y<=1||y>=GH-2) alleys++;
      else pockets++;
    } else if(v>0) buildings++;
  }
  return { mainRoad, buildings, alleys, pockets, GW, GH };
}

function crStreetPropKindForZone(zone, r){
  const roadKinds = ['mailbox','bench','utility_box','signboard'];
  const alleyKinds = ['shopping_cart','crate_stack','cooler','tarp_bundle','sleeping_bag_pile'];
  const edgeKinds = ['scrub_bush','agave'];
  const wallKinds = ['mural_panel','signboard'];
  if(zone==='MAIN_ROAD') return crPickWeightedRoadProp(r);
  if(zone==='BACK_ALLEY' || zone==='SIDE_N' || zone==='SIDE_S') {
    if(r()<0.55) return alleyKinds[(r()*alleyKinds.length)|0];
    if(r()<0.75) return edgeKinds[(r()*edgeKinds.length)|0];
    return wallKinds[(r()*wallKinds.length)|0];
  }
  return alleyKinds[(r()*alleyKinds.length)|0];
}

function crD1ParkPropKind(zone, r){
  const parkRoad = ['bench','signboard','mailbox','utility_box'];
  const edge = ['scrub_bush','agave'];
  const gather = ['cooler','crate_stack','shopping_cart'];
  if(zone==='MAIN_ROAD') return parkRoad[(r()*parkRoad.length)|0];
  if(zone==='SIDE_N' || zone==='SIDE_S' || zone==='BACK_ALLEY'){
    if(r()<0.55) return edge[(r()*edge.length)|0];
    return gather[(r()*gather.length)|0];
  }
  return parkRoad[(r()*parkRoad.length)|0];
}

function crApplyD1ParkLandmark(map, shade, meta, r){
  if((meta.district|0)!==1){
    game.d1ParkLandmark = null;
    return null;
  }
  const { roadY0, roadY1, GW, GH } = meta;
  const w = 7, h = 4;
  const northSide = r() < 0.72;
  let x0 = 15 + ((r()*5)|0);
  if(x0 + w >= GW - 2) x0 = GW - w - 2;
  let y0, y1;
  if(northSide){
    y0 = Math.max(2, roadY0 - h - 1);
    y1 = y0 + h - 1;
  } else {
    y1 = Math.min(GH - 3, roadY1 + h + 1);
    y0 = y1 - h + 1;
  }
  const doorX0 = x0 + 2, doorX1 = x0 + 3;
  const doorY = northSide ? y1 : y0;
  let cells = 0;
  for(let y = y0; y <= y1; y++){
    for(let x = x0; x < x0 + w; x++){
      if(x < 1 || x >= GW - 1 || y < 1 || y >= GH - 1) continue;
      if(y === doorY && x >= doorX0 && x <= doorX1){
        map[y][x] = 0;
        shade[y][x] = 0.34;
        continue;
      }
      const wt = (x === x0 + w - 1 && y === y0) ? WALL.MURAL : ((x === x0 || x === x0 + w - 1) && y > y0 ? WALL.BUILDING : WALL.CONCRETE);
      map[y][x] = wt;
      shade[y][x] = 0.5;
      cells++;
    }
  }
  const padY = northSide ? (y1 + 1) : (y0 - 1);
  for(let dx = 0; dx < w; dx++){
    const px = x0 + dx, py = padY;
    if(py > 0 && py < GH - 1 && px > 0 && px < GW - 1) map[py][px] = 0;
  }
  for(let yy = y0; yy <= y1; yy++){
    if(x0 - 1 > 0 && map[yy][x0 - 1] !== 0) map[yy][x0 - 1] = 0;
    if(x0 + w < GW - 1 && map[yy][x0 + w] !== 0) map[yy][x0 + w] = 0;
  }
  const landmark = {
    identity: 'restroom_pavilion',
    x0, y0, x1: x0 + w - 1, y1, cells, northSide, doorY, doorX0, doorX1
  };
  game.d1ParkLandmark = landmark;
  meta.d1ParkLandmark = landmark;
  crRegisterD1PavilionModule(landmark, map);
  return landmark;
}

function crPlaceD1ParkCommunityProps(r, meta, map, reach, used, takeCandidate, roadCands, pocketCands, candidates){
  const lm = game.d1ParkLandmark;
  const roadY0 = meta.roadY0;
  const plans = [];
  if(lm){
    const cx = (lm.x0 + lm.x1) / 2 + 0.5;
    plans.push(['bench', cx + 2.2, roadY0 + 0.55]);
    plans.push(['mural_panel', cx - 2.8, roadY0 + 1.1]);
    plans.push(['utility_box', lm.x1 + 0.55, lm.y0 + 1.4]);
    plans.push(['scrub_bush', lm.x0 - 0.45, lm.y0 + 0.6]);
    plans.push(['agave', lm.x1 + 1.1, lm.y0 + 2.1]);
    plans.push(['bench', cx - 0.8, roadY0 + 0.5]);
    plans.push(['bench', 8.5, roadY0 + 1.35]);
    plans.push(['mailbox', 6.5, roadY0 + 0.75]);
    plans.push(['cooler', 10.2, 4.2]);
    plans.push(['crate_stack', 9.1, 5.1]);
    plans.push(['shopping_cart', 7.6, meta.roadY1 - 0.45]);
    plans.push(['scrub_bush', 2.6, 3.2]);
    plans.push(['agave', 36.5, meta.roadY1 + 1.8]);
    plans.push(['tarp_bundle', 2.2, 5.2]);
  }
  for(const row of plans){
    const kind = row[0], x = row[1], y = row[2];
    if(!hasClearance(x, y, 0.28)) continue;
    const tx = x | 0, ty = y | 0;
    if(!reach[ty] || !reach[ty][tx]) continue;
    if(map[ty][tx] !== 0) continue;
    let clash = false;
    for(const u of used){ if(Math.hypot(x - u[0], y - u[1]) < 0.85){ clash = true; break; } }
    if(clash) continue;
    used.push([x, y]);
    game.props.push({ x, y, kind, wob: r() * 6.28 });
  }
  while(game.props.length < 12){
    const spot = takeCandidate(0.30, 0.8, used, [roadCands, pocketCands, candidates]);
    if(!spot) break;
    used.push(spot);
    const tx = Math.floor(spot[0]), ty = Math.floor(spot[1]);
    const zone = crStreetZoneAt(tx, ty, meta);
    const kind = crD1ParkPropKind(zone, r);
    game.props.push({ x: spot[0], y: spot[1], kind, wob: r() * 6.28 });
  }
}

function crD1LandmarkCellCount(map, lm){
  if(!lm) return 0;
  let n = 0;
  for(let y = lm.y0; y <= lm.y1; y++){
    for(let x = lm.x0; x <= lm.x1; x++){
      if(map[y] && map[y][x] > 0) n++;
    }
  }
  return n;
}

function crD1ParkPropSummary(props){
  const kinds = {};
  let parkish = 0;
  const parkKinds = ['bench','signboard','scrub_bush','agave','utility_box','cooler','crate_stack','shopping_cart','mailbox'];
  for(const p of props || []){
    kinds[p.kind] = (kinds[p.kind] || 0) + 1;
    if(parkKinds.indexOf(p.kind) >= 0) parkish++;
  }
  return { kinds, parkish, total: (props || []).length };
}
function genCity(seed, district, modifier){
  RNG = mulberry32((seed ^ 0x9e3779b9) + district*2654435761);
  const r = RNG;

  let canMult = 1.0, peoMult = 1.0;
  game.scoreMult = 1;
  if(modifier==='shortage'){ canMult = 0.55; peoMult = 1.1; game.scoreMult = 1.5; }

  const GW = STREET_FOOTPRINT_W, GH = STREET_FOOTPRINT_H;
  const map = [], shade = [];
  for(let y=0;y<GH;y++){ map.push(new Array(GW).fill(1)); shade.push(new Array(GW).fill(0)); }

  const streetMeta = applyStreetBlockGrammar(map, shade, GW, GH, district, modifier, r);
  if((district|0)===1) crApplyD1ParkLandmark(map, shade, streetMeta, r);
  else game.d1ParkLandmark = null;
  game.streetLayoutMeta = streetMeta;

  game.map = map; game.MAP_W = GW; game.MAP_H = GH; game.wallShade = shade;

  const roadMidY = (streetMeta.roadY0 + streetMeta.roadY1) / 2;
  let sx = 3.5, sy = roadMidY + 0.5, found = false;
  for(let y=streetMeta.roadY0; y<=streetMeta.roadY1 && !found; y++){
    for(let x=2; x<8 && !found; x++){
      if(map[y][x]===0 && hasClearance(x+0.5, y+0.5, 0.22)){ sx=x+0.5; sy=y+0.5; found=true; }
    }
  }
  if(!found){
    for(let y=1;y<GH-1 && !found;y++) for(let x=1;x<GW-1 && !found;x++){
      if(map[y][x]===0){ sx=x+0.5; sy=y+0.5; found=true; }
    }
  }
  player.x=sx; player.y=sy; player.angle=Math.PI/4;

  const reach = new Array(GH);
  for(let y=0;y<GH;y++) reach[y]=new Array(GW).fill(false);
  const stack=[[sx|0, sy|0]];
  reach[sy|0][sx|0]=true;
  let reachCount=0;
  while(stack.length){
    const [cx,cy]=stack.pop(); reachCount++;
    const nb=[[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]];
    for(const [nx,ny] of nb){
      if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
      if(reach[ny][nx]) continue;
      if(map[ny][nx]!==0) continue;
      reach[ny][nx]=true; stack.push([nx,ny]);
    }
  }
  dbg.reachableCells = reachCount;

  const d = Math.max(1, Math.min(5, district|0));
  const candidates=[];
  const roadCands=[], pocketCands=[], alleyCands=[];
  for(let y=1;y<GH-1;y++) for(let x=1;x<GW-1;x++){
    if(!reach[y][x]) continue;
    const pt=[x+0.5, y+0.5];
    candidates.push(pt);
    const z = crStreetZoneAt(x, y, streetMeta);
    if(z==='MAIN_ROAD') roadCands.push(pt);
    else if(z==='BACK_ALLEY') alleyCands.push(pt);
    else pocketCands.push(pt);
  }

  function takeFromPool(pool, radius, minDistFromStart, used){
    for(let tries=0; tries<320; tries++){
      if(!pool.length) return null;
      const idx=(r()*pool.length)|0;
      const [cx,cy]=pool[idx];
      if(!hasClearance(cx,cy,radius)){ dbg.rejectedSpawns++; continue; }
      if(Math.hypot(cx-sx, cy-sy) < minDistFromStart) continue;
      let overlap=false;
      if(used) for(const u of used){ if(Math.hypot(cx-u[0],cy-u[1])<0.9){ overlap=true; break; } }
      if(overlap) continue;
      pool.splice(idx,1);
      const gi = candidates.findIndex(p => p[0]===cx && p[1]===cy);
      if(gi>=0) candidates.splice(gi,1);
      return [cx,cy];
    }
    return null;
  }

  function takeCandidate(radius, minDistFromStart, used, prefer){
    const order = prefer || [candidates];
    for(const pool of order){
      const spot = takeFromPool(pool, radius, minDistFromStart, used);
      if(spot) return spot;
    }
    return takeFromPool(candidates, radius, minDistFromStart, used);
  }

  game.pickups=[];
  const canCount = Math.max(8, Math.floor((14 + district*2)*canMult));
  const used=[];
  for(let i=0;i<canCount;i++){
    let prefer;
    if(d<=1) prefer = [roadCands, pocketCands, candidates];
    else if(d<=3) prefer = [roadCands, pocketCands, alleyCands, candidates];
    else prefer = [pocketCands, alleyCands, roadCands, candidates];
    const spot=takeCandidate(0.30, 1.2, used, prefer);
    if(!spot){ dbg.invalidPlacements++; break; }
    used.push(spot);
    game.pickups.push({x:spot[0], y:spot[1], taken:false, amt: r()<0.3?2:1, wob:r()*6.28});
  }
  dbg.cansSpawned = game.pickups.length;

  game.npcs=[];
  const KINDS=['hungry','hungry','hungry','family','family','elder','volunteer'];
  const peoCount = Math.max(5, Math.floor((7+district)*peoMult));
  let d2Tucked = 0;
  for(let i=0;i<peoCount;i++){
    let prefer;
    if(d<=1) prefer = [roadCands, pocketCands, candidates];
    else if(d===2){
      prefer = (d2Tucked < 1 && i >= 4) ? [pocketCands, roadCands, candidates] : [roadCands, roadCands, pocketCands, candidates];
    } else if(d===3) prefer = [pocketCands, roadCands, alleyCands, candidates];
    else prefer = [pocketCands, alleyCands, candidates];
    const spot=takeCandidate(0.42, 1.8, used, prefer);
    if(!spot){ dbg.invalidPlacements++; break; }
    used.push(spot);
    if(d===2){
      const z = crStreetZoneAt(spot[0]|0, spot[1]|0, streetMeta);
      if(z !== 'MAIN_ROAD') d2Tucked++;
    }
    const kind=KINDS[(r()*KINDS.length)|0];
    const need = kind==='family'?3:1;
    game.npcs.push({x:spot[0], y:spot[1], kind, need, helped:false, wob:r()*6.28});
  }
  dbg.npcsSpawned = game.npcs.length;

  game.props=[];
  if(d<=1){
    crPlaceD1ParkCommunityProps(r, streetMeta, map, reach, used, takeCandidate, roadCands, pocketCands, candidates);
  } else {
    crPlaceDistrictCommunityProps(d, r, streetMeta, map, reach, used, takeCandidate, roadCands, pocketCands, alleyCands, candidates);
  }
  dbg.props = game.props.length;

  game.quota = Math.max(3, Math.ceil(game.npcs.length*0.6));
  game.helped=0; game.delivered=0;

  let bestEx=[GW-2.5,GH-2.5], bestD=-1;
  const exitPrefer = d<=2 ? [roadCands, candidates] : [roadCands, pocketCands, candidates];
  for(const pool of exitPrefer){
    for(const [cx,cy] of pool){
      const dist=Math.hypot(cx-sx,cy-sy);
      if(dist>bestD && hasClearance(cx,cy,0.5)){ bestD=dist; bestEx=[cx,cy]; }
    }
    if(bestD>8) break;
  }
  if(bestD<0){
    for(const [cx,cy] of candidates){
      const dist=Math.hypot(cx-sx,cy-sy);
      if(dist>bestD && hasClearance(cx,cy,0.5)){ bestD=dist; bestEx=[cx,cy]; }
    }
  }
  game.exit = {x:bestEx[0], y:bestEx[1], active:false};

  game.timeLeft = cfg.baseTime + (district-1)*8;
}

