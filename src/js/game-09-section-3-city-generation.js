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
    brick: 'rgba(114,88,70,0.88)',
    stucco: 'rgba(166,158,142,0.88)',
    concrete: 'rgba(130,134,128,0.86)'
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
    roof0: drawStart + sliceH * 0.035,
    roof1: drawStart + sliceH * 0.075,
    sign0: drawStart + sliceH * 0.095,
    sign1: drawStart + sliceH * 0.155,
    win0: drawStart + sliceH * 0.265,
    win1: drawStart + sliceH * 0.555,
    door0: drawStart + sliceH * 0.225,
    door1: drawStart + sliceH * 0.740,
    kick0: drawStart + sliceH * 0.720,
    kick1: drawStart + sliceH * 0.790,
    base0: drawStart + sliceH * 0.790,
    base1: drawStart + sliceH * 0.955
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
function crFacadeArtEdgeHit(fu, x0, x1){
  const w = Math.max(0.001, x1 - x0);
  const edge = Math.min(0.018, Math.max(0.006, w * 0.10));
  return fu < x0 + edge || fu > x1 - edge;
}
function crFacadeArtLocalRange(P, a, b){
  const w = P.ox1 - P.ox0;
  return { x0: P.ox0 + w * a, x1: P.ox0 + w * b };
}
function crFacadeArtColFramedBox(ctx, col, pw, fu, x0, x1, y0, y1, fill, frame){
  if(!crFacadeArtFuIn(fu, x0, x1)) return false;
  crFacadeArtColBand(ctx, col, pw, y0, y1, fill);
  crFacadeArtColLine(ctx, col, pw, y0, frame);
  crFacadeArtColLine(ctx, col, pw, y1, frame);
  if(crFacadeArtEdgeHit(fu, x0, x1)) crFacadeArtColBand(ctx, col, pw, y0, y1, frame);
  return true;
}

function crSmoothWallPalette(materialKey, kind){
  if(kind === 'garage_front'){
    return { wall:'rgba(138,140,134,0.82)', top:'rgba(86,88,82,0.20)', base:'rgba(34,34,32,0.34)', line:'rgba(54,54,50,0.26)', frame:'rgba(34,36,34,0.48)' };
  }
  if(kind === 'side' || kind === 'service_front'){
    return { wall:'rgba(152,145,132,0.80)', top:'rgba(76,70,62,0.14)', base:'rgba(34,30,26,0.26)', line:'rgba(64,58,50,0.18)', frame:'rgba(44,42,38,0.32)' };
  }
  if(kind === 'pavilion_front'){
    return { wall:'rgba(154,150,132,0.80)', top:'rgba(62,72,58,0.18)', base:'rgba(34,40,32,0.30)', line:'rgba(58,66,52,0.20)', frame:'rgba(38,46,38,0.34)' };
  }
  if(kind === 'boarded_front'){
    return { wall:'rgba(142,116,92,0.80)', top:'rgba(84,68,52,0.16)', base:'rgba(42,32,26,0.28)', line:'rgba(78,58,42,0.20)', frame:'rgba(52,38,30,0.36)' };
  }
  if(materialKey === 'concrete'){
    return { wall:'rgba(140,142,136,0.80)', top:'rgba(84,84,78,0.16)', base:'rgba(38,38,36,0.28)', line:'rgba(62,62,58,0.20)', frame:'rgba(40,42,40,0.34)' };
  }
  if(materialKey === 'stucco'){
    return { wall:'rgba(168,158,140,0.80)', top:'rgba(92,82,66,0.14)', base:'rgba(42,34,28,0.26)', line:'rgba(76,64,50,0.18)', frame:'rgba(52,44,36,0.32)' };
  }
  return { wall:'rgba(138,102,78,0.78)', top:'rgba(88,62,46,0.14)', base:'rgba(42,30,24,0.26)', line:'rgba(78,54,40,0.18)', frame:'rgba(54,38,30,0.32)' };
}
let CR_FACADE_TEXTURES = null;
const CR_FACADE_TEXTURE_MAPPING = {
  storefront_4x2: { south: 'storefront_4x2_south', north: 'service_back', east: 'blank_side', west: 'blank_side' },
  storefront_3x2: { south: 'storefront_3x2_south', north: 'service_back', east: 'blank_side', west: 'blank_side' },
  boarded_shop_3x2: { south: 'boarded_shop_3x2_south', north: 'service_back', east: 'blank_side', west: 'blank_side' },
  garage_service_4x2: { south: 'garage_service_4x2_south', north: 'service_back', east: 'blank_side', west: 'blank_side' },
  blank_service_block: { south: 'service_back', north: 'service_back', east: 'blank_side', west: 'blank_side' },
  restroom_pavilion: { south: 'pavilion_front', north: 'pavilion_front', east: 'blank_side', west: 'blank_side' }
};

function crFacadeTextureCanvas(key, w, h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c._crFacadeTextureKey = key;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return { canvas: c, ctx: x };
}
function crFacadeTextureRect(ctx, x, y, w, h, fill, stroke){
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if(stroke){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.max(1, Math.round(w)) - 1, Math.max(1, Math.round(h)) - 1);
  }
}
function crFacadeTextureBase(ctx, w, h, pal){
  ctx.fillStyle = pal.wall;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = pal.top;
  ctx.fillRect(0, Math.round(h * 0.035), w, Math.max(3, Math.round(h * 0.045)));
  ctx.fillStyle = pal.line;
  ctx.fillRect(0, Math.round(h * 0.105), w, 1);
  ctx.fillRect(0, Math.round(h * 0.875), w, 1);
  ctx.fillStyle = pal.base;
  ctx.fillRect(0, Math.round(h * 0.905), w, Math.max(5, Math.round(h * 0.055)));
  ctx.fillStyle = pal.mottle || 'rgba(255,255,255,0.035)';
  for(let i=0;i<5;i++){
    const y = Math.round(h * (0.18 + i * 0.135));
    ctx.fillRect((i * 37) % Math.max(1, w - 36), y, Math.min(72, w), 1);
  }
}
function crPaintStorefrontFacadeTexture(key, cellCount){
  const w = cellCount === 4 ? 256 : 240;
  const h = 128;
  const o = crFacadeTextureCanvas(key, w, h);
  const ctx = o.ctx;
  crFacadeTextureBase(ctx, w, h, { wall:'#8f7058', top:'rgba(68,50,38,0.16)', base:'rgba(34,26,21,0.30)', line:'rgba(66,50,38,0.22)', mottle:'rgba(245,220,180,0.035)' });
  crFacadeTextureRect(ctx, 12, 15, w - 24, 17, 'rgba(143,112,66,0.28)', 'rgba(72,56,38,0.18)');
  const roles = cellCount === 4 ? ['storefront_window','storefront_door','storefront_window','storefront_sign'] : ['storefront_window','storefront_door','storefront_sign'];
  const cw = w / roles.length;
  for(let i=0;i<roles.length;i++){
    const role = roles[i];
    const x0 = i * cw;
    if(role === 'storefront_window'){
      const bx = x0 + cw * 0.22, by = 48, bw = cw * 0.56, bh = 33;
      crFacadeTextureRect(ctx, bx, by, bw, bh, 'rgba(58,78,88,0.44)', 'rgba(30,34,34,0.38)');
      ctx.fillStyle = 'rgba(150,170,166,0.13)';
      ctx.fillRect(Math.round(bx + 3), Math.round(by + 3), Math.round(bw - 6), 3);
    } else if(role === 'storefront_door'){
      const dx = x0 + cw * 0.30, dy = 39, dw = cw * 0.40, dh = 73;
      crFacadeTextureRect(ctx, dx, dy, dw, dh, 'rgba(50,42,35,0.72)', 'rgba(26,23,20,0.42)');
      crFacadeTextureRect(ctx, dx + dw * 0.18, dy + 7, dw * 0.64, 20, 'rgba(70,92,98,0.30)', null);
      ctx.fillStyle = 'rgba(218,176,86,0.46)';
      ctx.fillRect(Math.round(dx + dw * 0.72), Math.round(dy + dh * 0.50), 2, 2);
    } else if(role === 'storefront_sign'){
      crFacadeTextureRect(ctx, x0 + cw * 0.24, 18, cw * 0.52, 11, 'rgba(156,124,72,0.28)', 'rgba(82,64,42,0.20)');
      crFacadeTextureRect(ctx, x0 + cw * 0.28, 54, cw * 0.44, 24, 'rgba(74,86,84,0.20)', 'rgba(44,46,42,0.22)');
    }
  }
  return o.canvas;
}
function crPaintBoardedShopTexture(){
  const w = 240, h = 128;
  const o = crFacadeTextureCanvas('boarded_shop_3x2_south', w, h);
  const ctx = o.ctx;
  crFacadeTextureBase(ctx, w, h, { wall:'#8b705b', top:'rgba(74,54,40,0.14)', base:'rgba(40,30,24,0.30)', line:'rgba(72,52,38,0.18)', mottle:'rgba(240,210,170,0.030)' });
  crFacadeTextureRect(ctx, w * 0.34, 16, w * 0.32, 13, 'rgba(135,106,76,0.11)', 'rgba(68,50,36,0.08)');
  const cw = w / 3;
  for(let i=0;i<3;i++){
    const x0 = i * cw;
    if(i === 1){
      crFacadeTextureRect(ctx, x0 + cw * 0.30, 40, cw * 0.40, 72, 'rgba(54,44,36,0.66)', 'rgba(30,24,20,0.38)');
    } else {
      const bx = x0 + cw * 0.19, by = 53, bw = cw * 0.62, bh = 35;
      crFacadeTextureRect(ctx, bx, by, bw, bh, 'rgba(62,54,46,0.24)', 'rgba(42,32,26,0.30)');
      for(let b=0;b<3;b++){
        ctx.fillStyle = b === 1 ? 'rgba(124,92,64,0.52)' : 'rgba(112,80,56,0.46)';
        ctx.fillRect(Math.round(bx + 3), Math.round(by + 6 + b * 10), Math.round(bw - 6), 5);
      }
    }
  }
  return o.canvas;
}
function crPaintGarageServiceTexture(){
  const w = 256, h = 128;
  const o = crFacadeTextureCanvas('garage_service_4x2_south', w, h);
  const ctx = o.ctx;
  crFacadeTextureBase(ctx, w, h, { wall:'#8f9189', top:'rgba(78,80,76,0.14)', base:'rgba(38,38,36,0.26)', line:'rgba(58,60,56,0.20)', mottle:'rgba(230,230,220,0.030)' });
  crFacadeTextureRect(ctx, 19, 43, 110, 65, 'rgba(104,106,102,0.34)', 'rgba(46,48,46,0.24)');
  ctx.fillStyle = 'rgba(60,62,60,0.16)';
  for(let y=53;y<98;y+=11) ctx.fillRect(25, y, 98, 1);
  crFacadeTextureRect(ctx, 162, 47, 32, 61, 'rgba(70,66,58,0.34)', 'rgba(44,42,38,0.22)');
  ctx.fillStyle = 'rgba(220,198,128,0.28)';
  ctx.fillRect(184, 78, 3, 3);
  crFacadeTextureRect(ctx, 213, 67, 17, 15, 'rgba(68,76,78,0.16)', 'rgba(48,52,52,0.12)');
  return o.canvas;
}
function crPaintQuietWallTexture(key, wall, accent){
  const w = 128, h = 128;
  const o = crFacadeTextureCanvas(key, w, h);
  const ctx = o.ctx;
  crFacadeTextureBase(ctx, w, h, { wall, top:'rgba(70,62,52,0.10)', base:'rgba(38,32,28,0.18)', line:'rgba(60,52,44,0.12)', mottle:'rgba(245,230,210,0.025)' });
  if(key === 'service_back'){
    crFacadeTextureRect(ctx, 25, 66, 16, 12, accent, 'rgba(44,44,40,0.10)');
    crFacadeTextureRect(ctx, 88, 48, 9, 34, 'rgba(66,58,50,0.18)', 'rgba(44,38,34,0.12)');
  } else {
    crFacadeTextureRect(ctx, 76, 58, 18, 9, accent, 'rgba(44,44,40,0.08)');
  }
  return o.canvas;
}
function crPaintPavilionTexture(){
  const w = 320, h = 128;
  const o = crFacadeTextureCanvas('pavilion_front', w, h);
  const ctx = o.ctx;
  crFacadeTextureBase(ctx, w, h, { wall:'#96927e', top:'rgba(58,72,54,0.18)', base:'rgba(38,44,34,0.25)', line:'rgba(58,66,52,0.18)', mottle:'rgba(230,232,204,0.030)' });
  crFacadeTextureRect(ctx, 20, 18, w - 40, 13, 'rgba(70,88,62,0.18)', 'rgba(46,58,42,0.14)');
  crFacadeTextureRect(ctx, 82, 44, 35, 68, 'rgba(62,68,58,0.48)', 'rgba(34,40,34,0.26)');
  crFacadeTextureRect(ctx, 135, 44, 35, 68, 'rgba(62,68,58,0.48)', 'rgba(34,40,34,0.26)');
  crFacadeTextureRect(ctx, 222, 58, 42, 23, 'rgba(82,122,108,0.13)', 'rgba(52,66,56,0.12)');
  return o.canvas;
}
function crBuildFacadeTextureAtlas(){
  if(CR_FACADE_TEXTURES) return CR_FACADE_TEXTURES;
  const store = {};
  store.storefront_4x2_south = crPaintStorefrontFacadeTexture('storefront_4x2_south', 4);
  store.storefront_3x2_south = crPaintStorefrontFacadeTexture('storefront_3x2_south', 3);
  store.boarded_shop_3x2_south = crPaintBoardedShopTexture();
  store.garage_service_4x2_south = crPaintGarageServiceTexture();
  store.blank_side = crPaintQuietWallTexture('blank_side', '#97907f', 'rgba(72,76,74,0.12)');
  store.service_back = crPaintQuietWallTexture('service_back', '#928a7a', 'rgba(82,86,82,0.14)');
  store.pavilion_front = crPaintPavilionTexture();
  store.fallback_smooth_wall = crPaintQuietWallTexture('fallback_smooth_wall', '#9b907c', 'rgba(82,86,82,0.10)');
  CR_FACADE_TEXTURES = store;
  return CR_FACADE_TEXTURES;
}
function crFacadeTextureKeyForFace(moduleId, faceDir, roleId){
  const role = crNormalizeFacadeRoleId(roleId || '');
  if(moduleId === 'restroom_pavilion' && (faceDir === 'south' || faceDir === 'north')) return 'pavilion_front';
  if(role === 'storefront_window' || role === 'storefront_door' || role === 'storefront_sign'){
    return moduleId === 'storefront_3x2' ? 'storefront_3x2_south' : 'storefront_4x2_south';
  }
  if(role === 'boarded_window') return 'boarded_shop_3x2_south';
  if(role === 'garage_bay' || (moduleId === 'garage_service_4x2' && (role === 'service_door' || role === 'utility_wall') && (faceDir === 'south' || faceDir === 'north'))) return 'garage_service_4x2_south';
  const map = CR_FACADE_TEXTURE_MAPPING[moduleId] || null;
  return (map && map[faceDir]) || (faceDir === 'east' || faceDir === 'west' ? 'blank_side' : 'service_back');
}
function crGetFacadeTextureForFace(moduleId, faceDir, roleId){
  const atlas = crBuildFacadeTextureAtlas();
  const key = crFacadeTextureKeyForFace(moduleId, faceDir, roleId);
  return atlas[key] || atlas.fallback_smooth_wall;
}
function crDrawContinuousFacadeTextureColumn(ctx, col, drawStart, sliceH, texture, faceU){
  if(sliceH < 1 || !texture) return;
  const u = Math.max(0, Math.min(0.999, Number(faceU) || 0));
  const texX = Math.max(0, Math.min(texture.width - 1, Math.floor(u * texture.width)));
  const oldSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(texture, texX, 0, 1, texture.height, col, drawStart, 1, sliceH);
  ctx.imageSmoothingEnabled = oldSmooth;
}

function crSimpleWallColor(materialKey, kind){
  if(materialKey === 'concrete' || kind === 'garage_front') return 'rgba(145,142,132,0.86)';
  if(materialKey === 'brick' || kind === 'boarded_front') return 'rgba(142,110,88,0.86)';
  if(kind === 'side' || kind === 'service_front') return 'rgba(154,148,134,0.86)';
  if(kind === 'pavilion_front') return 'rgba(150,148,130,0.86)';
  return 'rgba(166,154,132,0.86)';
}
function crDrawSimpleWallColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId){
  if(sliceH < 1) return;
  const faceDir = crWallHitFaceDir(side, stepX, stepY);
  const fc = crUpdateFacadeFaceU(mapX, mapY, faceDir, wallX);
  const roleKey = crNormalizeFacadeRoleId((fc && fc.roleId) || roleId || '');
  const role = CR_FACADE_PACK.roles[roleKey] || null;
  const kind = fc ? crFacadeComposeKind(fc.moduleId, faceDir) : 'service_front';
  ctx.fillStyle = crSimpleWallColor(role && role.material, kind);
  ctx.fillRect(col, drawStart, 1, sliceH);
}

function crCalmWallPalette(materialKey, kind){
  if(kind === 'pavilion_front'){
    return { wall:'rgba(146,144,126,0.84)', top:'rgba(54,70,50,0.10)', base:'rgba(36,42,32,0.18)', patch:'rgba(225,224,196,0.035)', decal:'rgba(70,96,78,0.12)', dark:'rgba(48,58,44,0.16)' };
  }
  if(kind === 'garage_front' || materialKey === 'concrete'){
    return { wall:'rgba(148,148,138,0.84)', top:'rgba(78,78,72,0.09)', base:'rgba(40,40,36,0.17)', patch:'rgba(230,230,214,0.030)', decal:'rgba(62,68,66,0.13)', dark:'rgba(54,56,52,0.16)' };
  }
  if(kind === 'boarded_front'){
    return { wall:'rgba(150,128,104,0.84)', top:'rgba(82,64,48,0.08)', base:'rgba(42,32,26,0.16)', patch:'rgba(238,214,178,0.030)', decal:'rgba(90,72,54,0.13)', dark:'rgba(58,46,36,0.17)' };
  }
  if(kind === 'side' || kind === 'service_front'){
    return { wall:'rgba(154,148,134,0.84)', top:'rgba(76,70,62,0.08)', base:'rgba(38,34,30,0.15)', patch:'rgba(238,228,204,0.028)', decal:'rgba(70,74,70,0.11)', dark:'rgba(52,48,42,0.14)' };
  }
  if(materialKey === 'brick'){
    return { wall:'rgba(144,110,88,0.84)', top:'rgba(84,62,48,0.08)', base:'rgba(42,30,24,0.16)', patch:'rgba(238,206,176,0.030)', decal:'rgba(84,74,62,0.13)', dark:'rgba(54,40,32,0.15)' };
  }
  return { wall:'rgba(166,154,132,0.84)', top:'rgba(92,82,66,0.08)', base:'rgba(42,34,28,0.15)', patch:'rgba(248,232,198,0.030)', decal:'rgba(70,82,84,0.11)', dark:'rgba(54,46,38,0.14)' };
}
function crCalmWallBand(ctx, col, pw, fu, x0, x1, y0, y1, fill){
  if(!crFacadeArtFuIn(fu, x0, x1) || y1 <= y0) return false;
  crFacadeArtColBand(ctx, col, pw, y0, y1, fill);
  return true;
}
function crDrawCalmPropsFirstWallColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId){
  if(sliceH < 8) return;
  const faceDir = crWallHitFaceDir(side, stepX, stepY);
  const fc = crUpdateFacadeFaceU(mapX, mapY, faceDir, wallX);
  const roleKey = crNormalizeFacadeRoleId((fc && fc.roleId) || roleId || '');
  const role = CR_FACADE_PACK.roles[roleKey] || null;
  const moduleId = fc ? fc.moduleId : '';
  const kind = fc ? crFacadeComposeKind(moduleId, faceDir) : 'service_front';
  const fu = fc ? Math.max(0, Math.min(0.999, fc.faceU)) : Math.max(0, Math.min(0.999, wallX - Math.floor(wallX)));
  const pal = crCalmWallPalette(role && role.material, kind);
  const pw = 1;
  const y0 = drawStart;
  const y1 = drawStart + sliceH;
  const zTop = y0 + sliceH * 0.050;
  const zBase = y0 + sliceH * 0.890;

  ctx.fillStyle = pal.wall;
  ctx.fillRect(col, y0, pw, sliceH);
  crFacadeArtColBand(ctx, col, pw, zTop, zTop + Math.max(1, sliceH * 0.025), pal.top);
  crFacadeArtColBand(ctx, col, pw, zBase, y0 + sliceH * 0.955, pal.base);

  // Broad, low-contrast stucco variation. These are intentionally not facade cells.
  crCalmWallBand(ctx, col, pw, fu, 0.08, 0.34, y0 + sliceH * 0.22, y0 + sliceH * 0.46, pal.patch);
  crCalmWallBand(ctx, col, pw, fu, 0.56, 0.86, y0 + sliceH * 0.52, y0 + sliceH * 0.78, 'rgba(70,58,44,0.030)');

  // Sparse decals only: small, flat, low-contrast marks painted onto the wall mass.
  if(kind === 'storefront_front'){
    crCalmWallBand(ctx, col, pw, fu, 0.24, 0.56, y0 + sliceH * 0.180, y0 + sliceH * 0.235, 'rgba(138,112,70,0.13)');
    crCalmWallBand(ctx, col, pw, fu, 0.18, 0.52, y0 + sliceH * 0.405, y0 + sliceH * 0.535, 'rgba(56,74,80,0.16)');
    crCalmWallBand(ctx, col, pw, fu, 0.70, 0.81, y0 + sliceH * 0.360, y0 + sliceH * 0.835, 'rgba(54,46,38,0.22)');
    crCalmWallBand(ctx, col, pw, fu, 0.875, 0.925, y0 + sliceH * 0.610, y0 + sliceH * 0.695, 'rgba(56,60,56,0.13)');
  } else if(kind === 'boarded_front'){
    crCalmWallBand(ctx, col, pw, fu, 0.22, 0.39, y0 + sliceH * 0.455, y0 + sliceH * 0.585, 'rgba(58,52,44,0.14)');
    crCalmWallBand(ctx, col, pw, fu, 0.225, 0.385, y0 + sliceH * 0.488, y0 + sliceH * 0.520, 'rgba(116,88,62,0.22)');
    crCalmWallBand(ctx, col, pw, fu, 0.66, 0.77, y0 + sliceH * 0.390, y0 + sliceH * 0.835, 'rgba(54,44,36,0.19)');
  } else if(kind === 'garage_front'){
    crCalmWallBand(ctx, col, pw, fu, 0.20, 0.34, y0 + sliceH * 0.560, y0 + sliceH * 0.650, pal.decal);
    crCalmWallBand(ctx, col, pw, fu, 0.68, 0.78, y0 + sliceH * 0.435, y0 + sliceH * 0.835, 'rgba(58,56,50,0.16)');
    crCalmWallBand(ctx, col, pw, fu, 0.84, 0.90, y0 + sliceH * 0.570, y0 + sliceH * 0.655, 'rgba(62,72,70,0.10)');
  } else if(kind === 'pavilion_front'){
    crCalmWallBand(ctx, col, pw, fu, 0.24, 0.35, y0 + sliceH * 0.380, y0 + sliceH * 0.830, pal.dark);
    crCalmWallBand(ctx, col, pw, fu, 0.58, 0.71, y0 + sliceH * 0.500, y0 + sliceH * 0.650, pal.decal);
  } else {
    crCalmWallBand(ctx, col, pw, fu, 0.62, 0.72, y0 + sliceH * 0.560, y0 + sliceH * 0.650, pal.decal);
    crCalmWallBand(ctx, col, pw, fu, 0.18, 0.28, y0 + sliceH * 0.480, y0 + sliceH * 0.540, 'rgba(92,92,84,0.08)');
  }
}

function crDrawSmoothBuildingMaterialBase(ctx, col, y0, sliceH, pw, materialKey, kind){
  const pal = crSmoothWallPalette(materialKey, kind);
  ctx.fillStyle = pal.wall;
  ctx.fillRect(col, y0, pw, sliceH);
  crFacadeArtColBand(ctx, col, pw, y0 + sliceH * 0.035, y0 + sliceH * 0.070, pal.top);
  crFacadeArtColLine(ctx, col, pw, y0 + sliceH * 0.080, pal.line);
  crFacadeArtColLine(ctx, col, pw, y0 + sliceH * 0.885, pal.line);
  crFacadeArtColBand(ctx, col, pw, y0 + sliceH * 0.905, y0 + sliceH * 0.955, pal.base);
  return pal;
}

function crDrawSmoothBuildingFaceColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId){
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
  const Z = crFacadeArtVocabularyZones(drawStart, sliceH);
  const fu = fc.faceU;
  const kind = crFacadeComposeKind(fc.moduleId, faceDir);
  const row = fc.reg.mod.faces[faceDir];
  const norm = (i)=> crNormalizeFacadeRoleId(row[i]);
  const n = row.length;
  const pal = crDrawSmoothBuildingMaterialBase(ctx, col, drawStart, sliceH, pw, role.material, kind);
  const baseY0 = drawStart + sliceH * 0.905;
  const baseY1 = drawStart + sliceH * 0.955;

  function panelAt(i){
    return crFacadeArtPanelInset(i, n, 0.28);
  }
  function framedObj(x0, x1, y0, y1, fill, frame){
    return crFacadeArtColFramedBox(ctx, col, pw, fu, x0, x1, y0, y1, fill, frame || pal.frame);
  }

  if(kind === 'storefront_front'){
    if(crFacadeArtFuIn(fu, 0, 1)){
      crFacadeArtColBand(ctx, col, pw, Z.sign0, Z.sign0 + (Z.sign1-Z.sign0)*0.62, 'rgba(144,120,76,0.16)');
      crFacadeArtColLine(ctx, col, pw, Z.sign0, 'rgba(70,58,42,0.20)');
    }
    for(let i=0;i<n;i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(!crFacadeArtFuIn(fu, P.ox0, P.ox1)) continue;
      if(pr === 'storefront_door'){
        const D = crFacadeArtLocalRange(P, 0.24, 0.76);
        const doorY0 = Z.door0 + sliceH * 0.055;
        const doorY1 = drawStart + sliceH * 0.875;
        framedObj(D.x0, D.x1, doorY0, doorY1, 'rgba(54,44,36,0.66)', 'rgba(28,24,22,0.46)');
        const doorLiteY1 = doorY0 + (doorY1 - doorY0) * 0.22;
        const doorPanelY0 = doorY0 + (doorY1 - doorY0) * 0.62;
        if(crFacadeArtFuIn(fu, D.x0 + (D.x1-D.x0)*0.20, D.x1 - (D.x1-D.x0)*0.20)){
          crFacadeArtColBand(ctx, col, pw, doorY0 + 2, doorLiteY1, 'rgba(86,104,112,0.26)');
          crFacadeArtColLine(ctx, col, pw, doorPanelY0, 'rgba(30,26,22,0.26)');
        }
        const handleX0 = D.x0 + (D.x1-D.x0) * 0.70;
        const handleX1 = D.x0 + (D.x1-D.x0) * 0.82;
        if(crFacadeArtFuIn(fu, handleX0, handleX1)) crFacadeArtColBand(ctx, col, pw, doorY0 + (doorY1-doorY0)*0.47, doorY0 + (doorY1-doorY0)*0.50, 'rgba(210,174,88,0.42)');
      } else if(pr === 'storefront_window'){
        const W = crFacadeArtLocalRange(P, 0.10, 0.90);
        const windowY0 = Z.win0 + sliceH * 0.040;
        const windowY1 = Z.win0 + (Z.win1-Z.win0)*0.72;
        const glassFill = 'rgba(60,78,88,0.34)';
        framedObj(W.x0, W.x1, windowY0, windowY1, glassFill, 'rgba(26,30,30,0.42)');
        crFacadeArtColBand(ctx, col, pw, windowY0 + 1, windowY0 + (windowY1-windowY0)*0.12, 'rgba(128,148,154,0.14)');
      } else if(pr === 'storefront_sign'){
        const S = crFacadeArtLocalRange(P, 0.16, 0.84);
        framedObj(S.x0, S.x1, Z.sign0 + 1, Z.sign0 + (Z.sign1-Z.sign0)*0.58, 'rgba(148,120,70,0.18)', 'rgba(70,54,36,0.24)');
      }
    }
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, baseY0, baseY1, 'rgba(30,26,22,0.34)');
    return;
  }

  if(kind === 'pavilion_front'){
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColLine(ctx, col, pw, Z.roof1, 'rgba(48,58,46,0.22)');
    for(let i=0;i<n;i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(!crFacadeArtFuIn(fu, P.ox0, P.ox1)) continue;
      if(pr === 'storefront_door'){
        const D = crFacadeArtLocalRange(P, 0.22, 0.78);
        framedObj(D.x0, D.x1, Z.door0 + sliceH * 0.055, drawStart + sliceH * 0.875, 'rgba(58,64,56,0.50)', 'rgba(34,40,34,0.36)');
      } else if(pr === 'mural_wall'){
        const M = crFacadeArtLocalRange(P, 0.18, 0.82);
        framedObj(M.x0, M.x1, Z.win0 + sliceH * 0.08, Z.win0 + (Z.win1-Z.win0)*0.62, 'rgba(82,122,108,0.18)', 'rgba(52,66,56,0.22)');
      } else if(pr === 'utility_wall'){
        const U = crFacadeArtLocalRange(P, 0.34, 0.66);
        framedObj(U.x0, U.x1, Z.win0 + (Z.win1-Z.win0)*0.42, Z.win0 + (Z.win1-Z.win0)*0.58, 'rgba(74,80,78,0.20)', 'rgba(48,52,48,0.22)');
      }
    }
    return;
  }

  if(kind === 'boarded_front'){
    if(crFacadeArtFuIn(fu, 0, 1)){
      crFacadeArtColBand(ctx, col, pw, Z.sign0, Z.sign0 + (Z.sign1-Z.sign0)*0.50, 'rgba(138,116,88,0.12)');
      crFacadeArtColLine(ctx, col, pw, Z.sign1, 'rgba(70,52,38,0.16)');
    }
    for(let i=0;i<n;i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(pr === 'storefront_door' && crFacadeArtFuIn(fu, P.ox0, P.ox1)){
        const D = crFacadeArtLocalRange(P, 0.24, 0.76);
        framedObj(D.x0, D.x1, Z.door0 + sliceH * 0.055, drawStart + sliceH * 0.875, 'rgba(52,42,34,0.58)', 'rgba(30,24,20,0.38)');
      } else if(pr === 'boarded_window' && crFacadeArtFuIn(fu, P.ox0, P.ox1)){
        const B = crFacadeArtLocalRange(P, 0.16, 0.84);
        const boardBoxY0 = Z.win0 + (Z.win1 - Z.win0) * 0.16;
        const boardBoxY1 = Z.win0 + (Z.win1 - Z.win0) * 0.66;
        framedObj(B.x0, B.x1, boardBoxY0, boardBoxY1, 'rgba(58,54,48,0.22)', 'rgba(42,32,26,0.34)');
        const plankGap = (boardBoxY1 - boardBoxY0) / 4;
        for(let b=0;b<2;b++){
          const py = boardBoxY0 + plankGap * (1.0 + b * 1.12);
          crFacadeArtColBand(ctx, col, pw, py, py + Math.max(1, plankGap * 0.34), 'rgba(126,94,64,0.44)');
        }
      }
    }
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, baseY0, baseY1, 'rgba(34,26,22,0.30)');
    return;
  }

  if(kind === 'garage_front'){
    if(crFacadeArtFuIn(fu, 0, 1)){
      crFacadeArtColBand(ctx, col, pw, Z.roof0, Z.roof1, 'rgba(70,70,66,0.12)');
      crFacadeArtColLine(ctx, col, pw, Z.sign1, 'rgba(52,54,50,0.18)');
    }
    let g0 = -1, g1 = -1;
    for(let i=0;i<n;i++){
      if(norm(i) === 'garage_bay'){ if(g0<0) g0=i; g1=i+1; }
    }
    if(g0 >= 0){
      const gx0 = g0 / n, gx1 = g1 / n;
      const frameM = 0.115 / n * (g1 - g0);
      const bx0 = gx0 + frameM, bx1 = gx1 - frameM;
      const bayFrameY0 = Z.win0 + sliceH * 0.075, bayFrameY1 = drawStart + sliceH * 0.865;
      if(crFacadeArtFuIn(fu, bx0, bx1)){
        framedObj(bx0, bx1, bayFrameY0, bayFrameY1, 'rgba(112,114,110,0.24)', 'rgba(48,50,48,0.22)');
        const rollH = (bayFrameY1 - bayFrameY0) / 6;
        for(let rr=1; rr<4; rr++){
          const ry = bayFrameY0 + rollH * (rr + 0.35);
          crFacadeArtColLine(ctx, col, pw, ry, 'rgba(58,60,58,0.14)');
        }
      }
    }
    for(let i=0;i<n;i++){
      const P = panelAt(i);
      if(norm(i) === 'service_door' && crFacadeArtFuIn(fu, P.ox0, P.ox1)){
        const S = crFacadeArtLocalRange(P, 0.28, 0.72);
        const sd0 = Z.door0 + (Z.door1 - Z.door0) * 0.20;
        const sd1 = drawStart + sliceH * 0.855;
        framedObj(S.x0, S.x1, sd0, sd1, 'rgba(70,66,58,0.30)', 'rgba(44,42,38,0.20)');
      }
    }
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, baseY0, baseY1, 'rgba(36,36,34,0.20)');
    return;
  }

  if(kind === 'side' || kind === 'service_front'){
    const quietDetail = true;
    if(quietDetail && roleKey === 'side_door' && crFacadeArtFuIn(fu, 0.42, 0.58)){
      framedObj(0.42, 0.58, Z.door0 + sliceH * 0.16, drawStart + sliceH * 0.875, 'rgba(66,58,50,0.22)', 'rgba(42,38,34,0.16)');
    } else if(quietDetail && roleKey === 'utility_wall' && crFacadeArtFuIn(fu, 0.62, 0.74)){
      framedObj(0.62, 0.74, Z.win0 + (Z.win1-Z.win0)*0.56, Z.win0 + (Z.win1-Z.win0)*0.66, 'rgba(72,76,76,0.10)', 'rgba(48,50,50,0.10)');
    } else if(quietDetail && roleKey === 'service_wall' && crFacadeArtFuIn(fu, 0.18, 0.32)){
      framedObj(0.18, 0.32, Z.win0 + (Z.win1-Z.win0)*0.48, Z.win0 + (Z.win1-Z.win0)*0.56, 'rgba(100,100,94,0.08)', 'rgba(62,62,58,0.08)');
    } else if(quietDetail && roleKey === 'mural_wall' && crFacadeArtFuIn(fu, 0.34, 0.66)){
      framedObj(0.34, 0.66, Z.win0 + sliceH * 0.10, Z.win0 + (Z.win1-Z.win0)*0.52, 'rgba(74,108,98,0.07)', 'rgba(54,62,58,0.08)');
    }
    if(crFacadeArtFuIn(fu, 0, 1)) crFacadeArtColBand(ctx, col, pw, baseY0, baseY1, 'rgba(38,34,30,0.14)');
    return;
  }
}

function crDrawComposedFacadeFaceColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId){
  if(typeof CR_SIMPLE_WALLS_BASELINE !== 'undefined' && CR_SIMPLE_WALLS_BASELINE === 1){
    crDrawSimpleWallColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId);
    return;
  }
  if(typeof CR_CALM_WALLS_PROPS_FIRST !== 'undefined' && CR_CALM_WALLS_PROPS_FIRST === 1){
    crDrawCalmPropsFirstWallColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId);
    return;
  }
  if(typeof CR_CONTINUOUS_FACADE_TEXTURES !== 'undefined' && CR_CONTINUOUS_FACADE_TEXTURES === 1){
    const faceDir = crWallHitFaceDir(side, stepX, stepY);
    const fc = crUpdateFacadeFaceU(mapX, mapY, faceDir, wallX);
    const texture = fc ? crGetFacadeTextureForFace(fc.moduleId, faceDir, fc.roleId || roleId) : crBuildFacadeTextureAtlas().fallback_smooth_wall;
    const faceU = fc ? fc.faceU : (wallX - Math.floor(wallX));
    crDrawContinuousFacadeTextureColumn(ctx, col, drawStart, sliceH, texture, faceU);
    return;
  }
  if(CR_BUILDING_SMOOTH_STYLE === 1){
    crDrawSmoothBuildingFaceColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId);
    return;
  }
  crDrawSmoothBuildingFaceColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, roleId);
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

function crFindFacadeReadabilitySample(moduleIds, faces, roleMatch){
  const mods = Array.isArray(moduleIds) ? moduleIds : [moduleIds];
  const faceList = Array.isArray(faces) ? faces : [faces];
  for(let y=1;y<game.MAP_H-1;y++){
    for(let x=1;x<game.MAP_W-1;x++){
      const c = game.buildingGrid && game.buildingGrid[y] && game.buildingGrid[y][x];
      if(!c || mods.indexOf(c.mid) < 0) continue;
      for(const face of faceList){
        const desc = crDebugDescribeFacadeHit(x, y, face);
        if(!desc || !desc.role) continue;
        if(!roleMatch || roleMatch(desc.role, desc)) return Object.assign({ x, y }, desc);
      }
    }
  }
  return null;
}

function crDebugFacadeReadabilityFinal(){
  const saved = { seed: game.seed, district: game.district, modifier: game.modifier, x: player.x, y: player.y, angle: player.angle, state };
  const result = {
    BUILD_ID,
    facadePackVersion: CR_FACADE_PACK && CR_FACADE_PACK.version,
    currentModuleList: CR_FACADE_PACK && CR_FACADE_PACK.modules ? Object.keys(CR_FACADE_PACK.modules) : [],
    roleList: CR_FACADE_PACK && CR_FACADE_PACK.roles ? Object.keys(CR_FACADE_PACK.roles) : [],
    d2StorefrontFace: null,
    d2BoardedShopFace: null,
    d3GarageServiceFace: null,
    d3SideBackFace: null,
    groundplaneHelpersActive: typeof crProjectedFloorY === 'function' && typeof crWallProjectionMetrics === 'function',
    spritegroundHelpersActive: typeof crProjectedGroundBottomY === 'function' && typeof crProjectBillboardSprite === 'function',
    noLabOnlyModules: true,
  };
  try{
    game.run = { active: true, harnessOnly: true, customLevel: null };
    genCity(914201, 2, '');
    result.d2StorefrontFace = crFindFacadeReadabilitySample(['storefront_4x2','storefront_3x2'], ['south','north'], role => role === 'storefront_window' || role === 'storefront_door' || role === 'storefront_sign');
    result.d2BoardedShopFace = crFindFacadeReadabilitySample('boarded_shop_3x2', ['south','north'], role => role === 'boarded_window' || role === 'storefront_door');
    genCity(914203, 3, '');
    result.d3GarageServiceFace = crFindFacadeReadabilitySample('garage_service_4x2', ['south','north'], role => role === 'garage_bay' || role === 'service_door' || role === 'utility_wall');
    result.d3SideBackFace = crFindFacadeReadabilitySample(['garage_service_4x2','blank_service_block','storefront_4x2','storefront_3x2'], ['east','west','north'], role => role === 'side_door' || role === 'service_wall' || role === 'blank_brick' || role === 'blank_concrete' || role === 'utility_wall');
    const labOnly = ['two_story_storefront_4x2_visual','walkin_storefront_4x3','corner_shop_L'];
    result.noLabOnlyModules = labOnly.every(id => result.currentModuleList.indexOf(id) < 0);
    result.pass = !!(result.d2StorefrontFace && result.d2BoardedShopFace && result.d3GarageServiceFace && result.d3SideBackFace && result.groundplaneHelpersActive && result.spritegroundHelpersActive && result.noLabOnlyModules);
  }catch(e){
    result.pass = false;
    result.error = String(e && e.message ? e.message : e);
  } finally {
    try{
      genCity(saved.seed || 42, saved.district || 1, saved.modifier || '');
      player.x = saved.x; player.y = saved.y; player.angle = saved.angle; state = saved.state;
    }catch(_e){}
  }
  return result;
}


function crDebugBuildingSmoothStyle(){
  const base = crDebugFacadeReadabilityFinal();
  const artSrc = (typeof crDrawSmoothBuildingMaterialBase === 'function' ? String(crDrawSmoothBuildingMaterialBase) : '') + '\\n' + (typeof crDrawSmoothBuildingFaceColumn === 'function' ? String(crDrawSmoothBuildingFaceColumn) : '') + '\\n' + (typeof crDrawComposedFacadeFaceColumn === 'function' ? String(crDrawComposedFacadeFaceColumn) : '');
  const checks = {
    buildId: BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1',
    smoothFlag: typeof CR_BUILDING_SMOOTH_STYLE !== 'undefined' && CR_BUILDING_SMOOTH_STYLE === 1,
    smoothHelper: typeof crDrawSmoothBuildingFaceColumn === 'function' && typeof crDrawSmoothBuildingMaterialBase === 'function',
    facadePackStillExists: !!(CR_FACADE_PACK && CR_FACADE_PACK.modules && CR_FACADE_PACK.roles),
    smoothBaseFirst: artSrc.indexOf('crDrawSmoothBuildingMaterialBase') >= 0 && artSrc.indexOf('pal.wall') >= 0,
    sparseObjects: artSrc.indexOf('panelAt(i)') >= 0 && artSrc.indexOf('crFacadeArtLocalRange') >= 0,
    limitedBoards: artSrc.indexOf('boardBoxY0') >= 0 && artSrc.indexOf('for(let b=0;b<2;b++)') >= 0,
    limitedGarageLines: artSrc.indexOf('bayFrameY0') >= 0 && artSrc.indexOf('for(let rr=1; rr<4; rr++)') >= 0,
    sideBackMostlyBlank: artSrc.indexOf('quietDetail') >= 0 && artSrc.indexOf("roleKey === 'side_door'") >= 0,
    noHighFrequencyWords: artSrc.indexOf('barcode') < 0 && artSrc.indexOf('corrugated') < 0,
    noLargeRedPosterFill: artSrc.indexOf('rgba(168,72,58') < 0 && artSrc.indexOf('poster') < 0,
    debugTargets: base && base.pass === true
  };
  const pass = Object.keys(checks).every(k => !!checks[k]);
  return Object.assign({}, base, { pass, smoothStyle: BUILD_ID, checks });
}

function crDebugContinuousFacadeTexture(){
  const atlas = crBuildFacadeTextureAtlas();
  const keys = Object.keys(atlas || {});
  const sizes = {};
  for(const k of keys){ sizes[k] = { width: atlas[k].width, height: atlas[k].height }; }
  const mappings = {};
  const modules = CR_FACADE_PACK && CR_FACADE_PACK.modules ? Object.keys(CR_FACADE_PACK.modules) : [];
  for(const mid of modules){
    mappings[mid] = {};
    for(const face of ['south','north','east','west']){
      const mod = CR_FACADE_PACK.modules[mid];
      const row = mod && mod.faces && mod.faces[face];
      const role = row && row.length ? crNormalizeFacadeRoleId(row[0]) : null;
      const key = crFacadeTextureKeyForFace(mid, face, role);
      const tex = atlas[key] || atlas.fallback_smooth_wall;
      mappings[mid][face] = { textureKey: key, width: tex.width, height: tex.height, sampleRole: role };
    }
  }
  const base = crDebugFacadeReadabilityFinal();
  function sampleMap(hit){
    if(!hit) return null;
    const key = crFacadeTextureKeyForFace(hit.moduleId, hit.faceDirection, hit.role);
    const tex = atlas[key] || atlas.fallback_smooth_wall;
    return Object.assign({}, hit, { textureKey: key, textureSize: { width: tex.width, height: tex.height } });
  }
  const drawSrc = (typeof crDrawComposedFacadeFaceColumn === 'function' ? String(crDrawComposedFacadeFaceColumn) : '') + '\n' + (typeof crDrawContinuousFacadeTextureColumn === 'function' ? String(crDrawContinuousFacadeTextureColumn) : '');
  const checks = {
    buildId: BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1',
    calmWallsPropsFirstMode: BUILD_ID !== 'calmwalls1' || (typeof CR_CALM_WALLS_PROPS_FIRST !== 'undefined' && CR_CALM_WALLS_PROPS_FIRST === 1 && drawSrc.indexOf('crDrawCalmPropsFirstWallColumn') >= 0),
    simpleWallsBaselineMode: BUILD_ID !== 'simplewalls1' || (typeof CR_SIMPLE_WALLS_BASELINE !== 'undefined' && CR_SIMPLE_WALLS_BASELINE === 1 && drawSrc.indexOf('crDrawSimpleWallColumn') >= 0),
    atlasExists: !!atlas && keys.length >= 7,
    storefront4x2TextureExists: !!atlas.storefront_4x2_south,
    storefront3x2TextureExists: !!atlas.storefront_3x2_south,
    boardedShopTextureExists: !!atlas.boarded_shop_3x2_south,
    garageServiceTextureExists: !!atlas.garage_service_4x2_south,
    sideBackTextureExists: !!atlas.blank_side && !!atlas.service_back,
    faceUSamplingContinuous: drawSrc.indexOf('faceU') >= 0 && drawSrc.indexOf('crDrawContinuousFacadeTextureColumn') >= 0 && drawSrc.indexOf('Math.floor(u * texture.width)') >= 0,
    panelInsetRendererBypassedForModuleFaces: drawSrc.indexOf('crFacadeArtPanelInset') < 0 && drawSrc.indexOf('crDrawContinuousFacadeTextureColumn') >= 0,
    liveFramedPanelBoxesBypassedForModuleFaces: drawSrc.indexOf('crFacadeArtColFramedBox') < 0 && drawSrc.indexOf('framedObj(') < 0,
    facadePackMetadataExists: !!(CR_FACADE_PACK && CR_FACADE_PACK.modules && CR_FACADE_PACK.roles),
    sixGameplayModulesUnchanged: ['storefront_4x2','storefront_3x2','restroom_pavilion','blank_service_block','garage_service_4x2','boarded_shop_3x2'].every(m => modules.indexOf(m) >= 0) && modules.length === 6,
    noLabOnlyModules: ['two_story_storefront_4x2_visual','walkin_storefront_4x3','corner_shop_L'].every(m => modules.indexOf(m) < 0),
    debugTargets: base && base.pass === true
  };
  const pass = Object.keys(checks).every(k => !!checks[k]);
  return {
    BUILD_ID,
    pass,
    textureAtlasKeys: keys,
    textureSizes: sizes,
    moduleToTextureMappings: mappings,
    sampleD2StorefrontTextureMapping: sampleMap(base.d2StorefrontFace),
    sampleD2BoardedShopTextureMapping: sampleMap(base.d2BoardedShopFace),
    sampleD3GarageTextureMapping: sampleMap(base.d3GarageServiceFace),
    sampleSideBackTextureMapping: sampleMap(base.d3SideBackFace),
    faceUSamplingContinuous: checks.faceUSamplingContinuous,
    calmWallsPropsFirstMode: checks.calmWallsPropsFirstMode,
    simpleWallsBaselineMode: checks.simpleWallsBaselineMode,
    panelInsetRendererBypassedForModuleFaces: checks.panelInsetRendererBypassedForModuleFaces,
    noLabOnlyModules: checks.noLabOnlyModules,
    checks
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
  let propCount = 6 + d + ((r()*4)|0);
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
  if(typeof CR_PROPS1_RESTORE_PROP_DENSITY !== 'undefined' && CR_PROPS1_RESTORE_PROP_DENSITY === 1 && (d === 2 || d === 3)){
    const minTotal = 14;
    const minRoad = 5;
    let roadCount = 0;
    for(const p of game.props){ if(crStreetZoneAt(p.x|0, p.y|0, meta) === 'MAIN_ROAD') roadCount++; }
    while(game.props.length < minTotal){
      const spot = takeCandidate(0.30, 0.5, used, [roadCands, pocketCands, candidates]);
      if(!spot) break;
      used.push(spot);
      const tx = spot[0]|0, ty = spot[1]|0;
      const zone = crStreetZoneAt(tx, ty, meta);
      const kind = crStreetPropKindForDistrict(zone, d, r);
      game.props.push({ x: spot[0], y: spot[1], kind, wob: r()*6.28 });
      if(zone === 'MAIN_ROAD') roadCount++;
    }
    while(roadCount < minRoad && roadCands.length){
      const spot = takeCandidate(0.30, 0.5, used, [roadCands, candidates]);
      if(!spot) break;
      used.push(spot);
      const kind = crStreetPropKindForDistrict('MAIN_ROAD', d, r);
      game.props.push({ x: spot[0], y: spot[1], kind, wob: r()*6.28 });
      roadCount++;
    }
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
    // Choose one material for this entire block segment (per-block grouping)
    const segMaterial = storefrontBands && d<=3 ? (r() < 0.4 ? WALL.GLASS : WALL.BUILDING) : crPickWallType(r);
    if(storefrontBands){
      const facadeRows = d===2 ? 3 : (d>=3 ? 4 : 1);
      for(let fr=0; fr<facadeRows; fr++){
        const fy = faceY + (side==='north' ? -fr : fr);
        if(fy < yStart || fy >= yEnd) continue;
        for(let x=bx0+inset; x<=bx1-inset; x++){
          if(spineXs.indexOf(x)>=0) continue;
          if(fr===0 || r() < 0.62 + d*0.06){
            map[fy][x]= segMaterial;
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
        map[y][x]= segMaterial; shade[y][x]=r();
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
  while(game.props.length < 14){
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

function crDebugPropDensity(){
  const meta = game.streetLayoutMeta;
  let roadProps = 0, nearStart = 0;
  const sx = player.x, sy = player.y;
  for(const p of game.props || []){
    if(meta && crStreetZoneAt(p.x|0, p.y|0, meta) === 'MAIN_ROAD') roadProps++;
    if(Math.hypot(p.x - sx, p.y - sy) <= 8) nearStart++;
  }
  return {
    BUILD_ID,
    propCount: (game.props || []).length,
    roadPropCount: roadProps,
    propsNearPlayerStart: nearStart,
    pickupCount: (game.pickups || []).length,
    npcCount: (game.npcs || []).length,
    district: game.district
  };
}

/** solidwalls-frontproof1 — proof-only: building mass directly ahead of player (does not alter genCity). */
const CR_SOLIDWALLS_FRONTPROOF_NAME = 'solidwalls-frontproof1';

function crRoadMidY(){
  const meta = game.streetLayoutMeta;
  if(meta && meta.roadY0 != null && meta.roadY1 != null) return (meta.roadY0 + meta.roadY1) / 2;
  return Math.floor((game.MAP_H || STREET_FOOTPRINT_H) / 2);
}

function crApplySolidwallsFrontProofHarness(opts){
  opts = opts || {};
  const map = game.map, shade = game.wallShade;
  if(!map || !shade) return { ok: false, error: 'no map' };
  const GW = game.MAP_W, GH = game.MAP_H;
  const meta = game.streetLayoutMeta || { roadY0: 8, roadY1: 11, GW, GH };
  const ry0 = meta.roadY0, ry1 = meta.roadY1;
  game.roadY0 = ry0;
  game.roadY1 = ry1;

  const bx0 = 10, bx1 = 17;
  const by0 = Math.max(2, ry0 - 2), by1 = Math.min(GH - 2, ry1 + 2);
  const py = (ry0 + ry1) / 2 + 0.5;

  for(let y = ry0; y <= ry1; y++){
    for(let x = 2; x <= 9; x++){
      if(y >= 0 && y < GH && x >= 0 && x < GW){
        map[y][x] = 0;
        shade[y][x] = 0.38;
      }
    }
  }

  for(let y = by0; y <= by1; y++){
    for(let x = bx0; x <= bx1; x++){
      map[y][x] = WALL.BUILDING;
      shade[y][x] = 0.48;
    }
  }
  for(let x = bx0 + 1; x <= bx1 - 1; x++){
    map[by1][x] = WALL.BRICK;
    shade[by1][x] = 0.52;
  }
  map[by0][bx1] = WALL.BRICK;
  shade[by0][bx1] = 0.52;
  map[by0][bx1 - 1] = WALL.CONCRETE;
  shade[by0][bx1 - 1] = 0.5;

  player.x = opts.px != null ? opts.px : 6.5;
  player.y = opts.py != null ? opts.py : py;
  player.angle = opts.angle != null ? opts.angle : 0;
  if(typeof player.dir === 'number') player.dir = player.angle;

  const keep = opts.keepEntities !== false;
  if(keep){
    if(!game.props || !game.props.length){
      game.props = [
        { x: 5.2, y: py - 0.6, kind: 'crate_stack', wob: 0 },
        { x: 4.6, y: py + 0.5, kind: 'utility_box', wob: 0.3 },
      ];
    } else {
      game.props[0].x = 5.2; game.props[0].y = py - 0.5;
      if(game.props[1]){ game.props[1].x = 4.6; game.props[1].y = py + 0.5; }
    }
    if(!game.pickups || !game.pickups.length){
      game.pickups = [{ x: 7.8, y: py, taken: false, amt: 2, wob: 0.2 }];
    } else {
      const c = game.pickups.find(p => !p.taken) || game.pickups[0];
      c.x = 7.8; c.y = py; c.taken = false;
    }
    if(!game.npcs || !game.npcs.length){
      game.npcs = [{ x: 8.2, y: py + 0.35, kind: 'hungry', need: 1, helped: false, wob: 0.5 }];
    } else {
      game.npcs[0].x = 8.2; game.npcs[0].y = py + 0.35;
    }
  }

  if(game.run){
    game.run.harnessOnly = true;
    game.run.customLevel = null;
  }

  return {
    ok: true,
    harness: CR_SOLIDWALLS_FRONTPROOF_NAME,
    BUILD_ID,
    CR_SOLID_WALLS_OPAQUE_BASELINE: typeof CR_SOLID_WALLS_OPAQUE_BASELINE !== 'undefined' ? CR_SOLID_WALLS_OPAQUE_BASELINE : null,
    player: { x: player.x, y: player.y, angle: player.angle },
    block: { bx0, bx1, by0, by1 },
    materials: { face: 'BUILDING', sideBrick: 'BRICK', accent: 'CONCRETE' },
    roadY0: ry0, roadY1: ry1,
    density: typeof crDebugPropDensity === 'function' ? crDebugPropDensity() : null,
  };
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

