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
  if(materialKey === 'concrete' || materialKey === 'light_gray_cinderblock'){
    return { wall:'rgba(140,142,136,0.80)', top:'rgba(84,84,78,0.16)', base:'rgba(38,38,36,0.28)', line:'rgba(62,62,58,0.20)', frame:'rgba(40,42,40,0.34)' };
  }
  if(materialKey === 'stucco'){
    return { wall:'rgba(168,158,140,0.80)', top:'rgba(92,82,66,0.14)', base:'rgba(42,34,28,0.26)', line:'rgba(76,64,50,0.18)', frame:'rgba(52,44,36,0.32)' };
  }
  if(materialKey === 'red_brick'){
    return { wall:'rgba(146,98,72,0.82)', top:'rgba(86,60,46,0.16)', base:'rgba(40,28,22,0.30)', line:'rgba(80,54,40,0.22)', frame:'rgba(48,32,24,0.36)' };
  }
  if(materialKey === 'aluminum_siding'){
    return { wall:'rgba(150,156,160,0.78)', top:'rgba(220,228,232,0.20)', base:'rgba(34,40,46,0.32)', line:'rgba(54,62,70,0.22)', frame:'rgba(38,46,54,0.36)' };
  }
  return { wall:'rgba(138,102,78,0.78)', top:'rgba(88,62,46,0.14)', base:'rgba(42,30,24,0.26)', line:'rgba(78,54,40,0.18)', frame:'rgba(54,38,30,0.32)' };
}

function crSmoothPaletteFromBuildingMaterial(materialKey, kind){
  const m = crNormalizeBuildingTextureMaterial(materialKey);
  return crSmoothWallPalette(m, kind);
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

// ----- Single-material building textures (walltextures1 BUILD_ID) -----
const CR_SINGLE_MATERIAL_BUILDING_TEXTURES = 1;
const CR_BUILDING_TEXTURE_MATERIALS = [
  'stucco',
  'red_brick',
  'light_gray_cinderblock',
  'aluminum_siding',
];
const CR_BUILDING_TEXTURE_MATERIAL_SET = Object.fromEntries(
  CR_BUILDING_TEXTURE_MATERIALS.map(k => [k, true])
);

function crHashBuildingMaterial(seed, district, moduleId, x0, y0, bid){
  let h = (typeof seed === 'number' ? seed : 0) >>> 0;
  h = Math.imul(h ^ 0x9e3779b1, 16777619) >>> 0;
  const s = String(seed|0) + '|' + String(district|0) + '|' + String(moduleId||'') + '|' + (x0|0) + '|' + (y0|0) + '|' + (bid|0);
  for(let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function crPickBuildingTextureMaterial(moduleId, x0, y0, bid){
  const pool = CR_BUILDING_TEXTURE_MATERIALS;
  const seed = (game && typeof game.seed === 'number') ? game.seed : 0;
  const district = (game && typeof game.district === 'number') ? game.district : 0;
  const idx = crHashBuildingMaterial(seed, district, moduleId, x0, y0, bid) % pool.length;
  return pool[(idx + pool.length) % pool.length];
}

function crNormalizeBuildingTextureMaterial(materialKey){
  return CR_BUILDING_TEXTURE_MATERIAL_SET[materialKey] ? materialKey : 'stucco';
}

function crMaterialTextureKey(materialKey){
  const m = crNormalizeBuildingTextureMaterial(materialKey);
  if(m === 'red_brick') return 'material_red_brick';
  if(m === 'light_gray_cinderblock') return 'material_light_gray_cinderblock';
  if(m === 'aluminum_siding') return 'material_aluminum_siding';
  return 'material_stucco';
}

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

// Procedural single-material wall textures (256x128 each).
// Deterministic: all "randomness" comes from seeded crHashBuildingMaterial() below.
function crFacadeMaterialRng(seed){
  let s = (seed >>> 0) || 0x9e3779b9;
  return function(){
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
    s = Math.imul(s ^ (s >>> 13), 3266489909) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 4294967296;
  };
}

function crPaintMaterialStucco(w, h){
  const o = crFacadeTextureCanvas('material_stucco', w, h);
  const ctx = o.ctx;
  // Beige plaster base
  crFacadeTextureBase(ctx, w, h, { wall:'#b6a385', top:'rgba(84,68,48,0.10)', base:'rgba(48,38,28,0.22)', line:'rgba(80,64,44,0.12)', mottle:'rgba(248,238,212,0.045)' });
  const rng = crFacadeMaterialRng(0xa37c5011);
  // Soft mottle: low-contrast warm patches
  for(let i = 0; i < 150; i++){
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    const rw = 2 + Math.floor(rng() * 7);
    const rh = 1 + Math.floor(rng() * 5);
    ctx.fillStyle = rng() < 0.55
      ? 'rgba(210,190,150,0.055)'
      : 'rgba(112,92,66,0.050)';
    ctx.fillRect(x, y, rw, rh);
  }
  for(let i = 0; i < 320; i++){
    ctx.fillStyle = 'rgba(86,70,52,'+(0.045 + rng()*0.065).toFixed(3)+')';
    ctx.fillRect(Math.floor(rng()*w), Math.floor(rng()*h), 1, 1);
  }
  // Faint vertical plaster stains
  for(let i = 0; i < 6; i++){
    const x = Math.floor(rng() * (w - 8));
    const yy = Math.floor(rng() * (h - 20));
    ctx.fillStyle = 'rgba(100,82,58,0.04)';
    ctx.fillRect(x, yy, 2 + Math.floor(rng() * 4), 12 + Math.floor(rng() * 24));
  }
  // A few faint patch rectangles (repair marks)
  for(let i = 0; i < 5; i++){
    const px = Math.floor(rng() * (w - 24));
    const py = Math.floor(rng() * (h - 16));
    ctx.fillStyle = 'rgba(166,142,108,0.10)';
    ctx.fillRect(px, py, 16 + Math.floor(rng() * 14), 8 + Math.floor(rng() * 6));
  }
  return o.canvas;
}

function crPaintMaterialRedBrick(w, h){
  const o = crFacadeTextureCanvas('material_red_brick', w, h);
  const ctx = o.ctx;
  ctx.fillStyle = '#8a4a38';
  ctx.fillRect(0, 0, w, h);
  const rng = crFacadeMaterialRng(0xb72e1331);
  const brickW = CR_MATERIAL_RED_BRICK_BRICK_W;
  const brickH = CR_MATERIAL_RED_BRICK_BRICK_H;
  const mortarH = 3;
  const mortarV = 2;
  for(let row = -1; row * (brickH + mortarH) < h + brickH; row++){
    const offset = (row % 2 === 0) ? 0 : Math.floor(brickW / 2);
    const y = row * (brickH + mortarH);
    ctx.fillStyle = 'rgba(120,96,82,0.30)';
    ctx.fillRect(0, y + brickH, w, mortarH);
    for(let col = -1; col * (brickW + mortarV) < w + brickW; col++){
      const x = col * (brickW + mortarV) + offset;
      if(x + brickW <= 0 || y + brickH <= 0 || x >= w || y >= h) continue;
      const v = 0.96 + rng() * 0.08;
      const R = Math.floor(148 * v); const G = Math.floor(72 * v); const B = Math.floor(52 * v);
      ctx.fillStyle = 'rgb(' + Math.min(255, R) + ',' + Math.min(255, G) + ',' + Math.min(255, B) + ')';
      ctx.fillRect(x, y, brickW, brickH);
      if(x + brickW < w){
        ctx.fillStyle = 'rgba(108,86,72,0.26)';
        ctx.fillRect(x + brickW, y, mortarV, brickH);
      }
    }
  }
  return o.canvas;
}

function crPaintMaterialRedBrickCalm(w, h){
  const o = crFacadeTextureCanvas('material_red_brick_calm', w, h);
  const ctx = o.ctx;
  const brickW = CR_MATERIAL_RED_BRICK_BRICK_W;
  const brickH = CR_MATERIAL_RED_BRICK_BRICK_H;
  const mortarH = 3;
  const mortarV = 2;
  ctx.fillStyle = '#7a4232';
  ctx.fillRect(0, 0, w, h);
  for(let row = -1; row * (brickH + mortarH) < h + brickH; row++){
    const offset = (row % 2 === 0) ? 0 : Math.floor(brickW / 2);
    const y = row * (brickH + mortarH);
    ctx.fillStyle = 'rgba(110,90,78,0.22)';
    ctx.fillRect(0, y + brickH, w, mortarH);
    for(let col = -1; col * (brickW + mortarV) < w + brickW; col++){
      const x = col * (brickW + mortarV) + offset;
      if(x + brickW <= 0 || y + brickH <= 0 || x >= w || y >= h) continue;
      ctx.fillStyle = 'rgba(134,78,58,0.92)';
      ctx.fillRect(x, y, brickW, brickH);
      if(x + brickW < w){
        ctx.fillStyle = 'rgba(96,78,68,0.35)';
        ctx.fillRect(x + brickW, y, mortarV, brickH);
      }
    }
  }
  return o.canvas;
}

const CR_MATERIAL_RED_BRICK_BRICK_W = 34;
const CR_MATERIAL_RED_BRICK_BRICK_H = 10;
const CR_MATERIAL_RED_BRICK_TILE_SCALE = 2.0;
const CR_MATERIAL_CINDERBLOCK_BLOCK_W = 48;
const CR_MATERIAL_CINDERBLOCK_BLOCK_H = 12;
const CR_MATERIAL_CINDERBLOCK_TILE_SCALE = 1.85;
const CR_MATERIAL_SIDING_BAND_H = 18;
const CR_MATERIAL_SIDING_TILE_SCALE = 3.0;

function crSampleMaterialTexturePaletteStats(canvas){
  if(!canvas || typeof canvas.getContext !== 'function') return null;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, n = 0, warmBrick = 0, grayBlock = 0;
  for(let y = 0; y < h; y += 3){
    for(let x = 0; x < w; x += 3){
      const i = (y * w + x) * 4;
      const R = img[i], G = img[i + 1], B = img[i + 2];
      r += R; g += G; b += B; n++;
      if(R > G + 15 && R > B + 20 && R > 85) warmBrick++;
      if(R > 130 && R < 215 && Math.abs(R - G) < 24 && Math.abs(G - B) < 24) grayBlock++;
    }
  }
  if(!n) return null;
  return {
    avgR: r / n, avgG: g / n, avgB: b / n,
    warmBrickFraction: warmBrick / n,
    grayBlockFraction: grayBlock / n,
  };
}

function crCalmBrickHasVerticalJoints(canvas){
  if(!canvas || typeof canvas.getContext !== 'function') return false;
  const brickW = CR_MATERIAL_RED_BRICK_BRICK_W;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h).data;
  let hits = 0;
  for(let col = 1; col <= 4; col++){
    const x = Math.min(w - 2, col * brickW);
    let mortarish = 0;
    for(let y = 2; y < h - 2; y += 4){
      const i = (y * w + x) * 4;
      const R = img[i], G = img[i + 1], B = img[i + 2];
      if(R < 150 && G < 130 && B < 120) mortarish++;
    }
    if(mortarish >= 4) hits++;
  }
  return hits >= 2;
}

function crMaterialTextureDebugSpec(){
  return {
    red_brick: {
      brickW: CR_MATERIAL_RED_BRICK_BRICK_W,
      brickH: CR_MATERIAL_RED_BRICK_BRICK_H,
      aspect: CR_MATERIAL_RED_BRICK_BRICK_W / CR_MATERIAL_RED_BRICK_BRICK_H,
      tileScaleCells: CR_MATERIAL_RED_BRICK_TILE_SCALE,
      staggeredRows: true,
      paletteFamily: 'red-brown',
      verticalJoints: true,
      highFrequencyNoise: 'low',
    },
    red_brick_calm: {
      paletteFamily: 'red-brown',
      verticalJoints: true,
      horizontalCourses: true,
      brickW: CR_MATERIAL_RED_BRICK_BRICK_W,
      brickH: CR_MATERIAL_RED_BRICK_BRICK_H,
    },
    light_gray_cinderblock: {
      blockW: CR_MATERIAL_CINDERBLOCK_BLOCK_W,
      blockH: CR_MATERIAL_CINDERBLOCK_BLOCK_H,
      aspect: CR_MATERIAL_CINDERBLOCK_BLOCK_W / CR_MATERIAL_CINDERBLOCK_BLOCK_H,
      tileScaleCells: CR_MATERIAL_CINDERBLOCK_TILE_SCALE,
      staggeredRows: true,
      paletteFamily: 'light-gray',
    },
    aluminum_siding: {
      bandH: CR_MATERIAL_SIDING_BAND_H,
      orientation: 'horizontal',
      tileScaleCells: CR_MATERIAL_SIDING_TILE_SCALE,
      highFrequencyNoise: 'low',
    },
  };
}

function crPaintMaterialLightGrayCinderblock(w, h){
  const o = crFacadeTextureCanvas('material_light_gray_cinderblock', w, h);
  const ctx = o.ctx;
  crFacadeTextureBase(ctx, w, h, { wall:'#b6b5ad', top:'rgba(60,68,72,0.08)', base:'rgba(40,42,46,0.14)', line:'rgba(70,76,82,0.10)', mottle:'rgba(230,232,230,0.028)' });
  const rng = crFacadeMaterialRng(0xc12d9e57);
  const blockW = CR_MATERIAL_CINDERBLOCK_BLOCK_W;
  const blockH = CR_MATERIAL_CINDERBLOCK_BLOCK_H;
  const seam = 1;
  for(let row = -1; row * (blockH + seam) < h + blockH; row++){
    const offset = (row % 2 === 0) ? 0 : Math.floor(blockW / 2);
    for(let col = -1; col * (blockW + seam) < w + blockW; col++){
      const x = col * (blockW + seam) + offset;
      const y = row * (blockH + seam);
      if(x + blockW <= 0 || y + blockH <= 0 || x >= w || y >= h) continue;
      const v = 0.88 + rng() * 0.12;
      const R = Math.floor(186 * v); const G = Math.floor(186 * v); const B = Math.floor(178 * v);
      ctx.fillStyle = 'rgb(' + Math.min(255, R) + ',' + Math.min(255, G) + ',' + Math.min(255, B) + ')';
      ctx.fillRect(x, y, blockW, blockH);
      for(let i = 0; i < 4; i++){
        const dx = x + Math.floor(rng() * blockW);
        const dy = y + Math.floor(rng() * blockH);
        ctx.fillStyle = 'rgba(78,82,80,'+(0.05 + rng() * 0.06).toFixed(3)+')';
        ctx.fillRect(dx, dy, 1, 1);
      }
      ctx.fillStyle = 'rgba(46,50,54,0.08)';
      ctx.fillRect(x + blockW - seam, y, seam, blockH);
      ctx.fillRect(x, y + blockH - seam, blockW, seam);
      ctx.fillStyle = 'rgba(240,242,240,0.10)';
      ctx.fillRect(x, y, blockW, 1);
    }
  }
  return o.canvas;
}

function crPaintMaterialAluminumSiding(w, h){
  const o = crFacadeTextureCanvas('material_aluminum_siding', w, h);
  const ctx = o.ctx;
  // Flat blue-gray base — no texture base overlays
  ctx.fillStyle = '#94a0a6';
  ctx.fillRect(0, 0, w, h);
  const bandH = CR_MATERIAL_SIDING_BAND_H;
  for(let y = 0; y < h; y += bandH){
    // Very low contrast band separation only — no per-band color variance
    ctx.fillStyle = 'rgba(198,206,210,0.08)';
    ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = 'rgba(64,74,82,0.06)';
    ctx.fillRect(0, y + bandH - 1, w, 1);
  }
  return o.canvas;
}

function crPaintMaterialAluminumSidingCalm(w, h){
  const o = crFacadeTextureCanvas('material_aluminum_siding_calm', w, h);
  const ctx = o.ctx;
  // Flat muted blue-gray — preserves hue for distance stability
  ctx.fillStyle = '#8a969e';
  ctx.fillRect(0, 0, w, h);
  // Very broad, very subtle banding
  const bandH = CR_MATERIAL_SIDING_BAND_H * 2;
  for(let y = 0; y < h; y += bandH){
    ctx.fillStyle = 'rgba(186,196,202,0.08)';
    ctx.fillRect(0, y, w, 1);
  }
  return o.canvas;
}

function crPaintBuildingWallMaterialTexture(materialKey, w, h){
  const m = crNormalizeBuildingTextureMaterial(materialKey);
  if(m === 'red_brick') return crPaintMaterialRedBrick(w, h);
  if(m === 'light_gray_cinderblock') return crPaintMaterialLightGrayCinderblock(w, h);
  if(m === 'aluminum_siding') return crPaintMaterialAluminumSiding(w, h);
  return crPaintMaterialStucco(w, h);
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
  // Single-material building wall textures (walltextures1)
  store.material_stucco = crPaintBuildingWallMaterialTexture('stucco', 256, 128);
  store.material_red_brick = crPaintBuildingWallMaterialTexture('red_brick', 256, 128);
  store.material_light_gray_cinderblock = crPaintBuildingWallMaterialTexture('light_gray_cinderblock', 256, 128);
  store.material_aluminum_siding = crPaintBuildingWallMaterialTexture('aluminum_siding', 256, 128);
  // Calm variants for distance LOD — preserve hue, minimal detail (decalintegration3)
  store.material_red_brick_calm = crPaintMaterialRedBrickCalm(256, 128);
  store.material_aluminum_siding_calm = crPaintMaterialAluminumSidingCalm(256, 128);
  CR_FACADE_TEXTURES = store;
  return CR_FACADE_TEXTURES;
}

function crBuildingRegistryForCell(mapX, mapY){
  try {
    const cell = game && game.buildingGrid && game.buildingGrid[mapY] && game.buildingGrid[mapY][mapX];
    if(!cell) return null;
    return (game.buildingRegistry && game.buildingRegistry[cell.bid]) || null;
  } catch(e){ return null; }
}

function crIsBuildingMaterialWallType(wt){
  return wt === WALL.BUILDING ||
         wt === WALL.BRICK ||
         wt === WALL.GLASS ||
         wt === WALL.GARAGE ||
         wt === WALL.CONCRETE ||
         wt === WALL.SIGNAGE ||
         wt === WALL.MURAL;
}

function crPickComponentBuildingMaterial(cells, componentId){
  let minX = 9999, minY = 9999, maxX = -1, maxY = -1;
  const registryMaterials = [];
  for(const [x, y] of cells){
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    const reg = crBuildingRegistryForCell(x, y);
    if(reg && reg.materialKey){
      registryMaterials.push(crNormalizeBuildingTextureMaterial(reg.materialKey));
    }
  }
  if(registryMaterials.length){
    const uniq = [...new Set(registryMaterials)];
    if(uniq.length === 1) return uniq[0];
    const seed = (game && typeof game.seed === 'number') ? game.seed : 0;
    const district = (game && typeof game.district === 'number') ? game.district : 0;
    const hash = crHashBuildingMaterial(seed, district, 'component-merge', minX, minY, componentId ^ (uniq.join('|').length << 4));
    return uniq[hash % uniq.length];
  }
  const seed = (game && typeof game.seed === 'number') ? game.seed : 0;
  const district = (game && typeof game.district === 'number') ? game.district : 0;
  const hash = crHashBuildingMaterial(seed, district, 'component', minX, minY, componentId ^ (maxX << 8) ^ (maxY << 16));
  return CR_BUILDING_TEXTURE_MATERIALS[hash % CR_BUILDING_TEXTURE_MATERIALS.length];
}

function crSyncRegistryMaterialsToComponents(){
  if(!game.buildingRegistry || !game.buildingMaterialGrid || !game.buildingMaterialComponents) return;
  for(const cid in game.buildingMaterialComponents){
    const comp = game.buildingMaterialComponents[cid];
    if(!comp || !comp.materialKey) continue;
    const mat = crNormalizeBuildingTextureMaterial(comp.materialKey);
    for(let y = 0; y < game.buildingMaterialGrid.length; y++){
      for(let x = 0; x < game.buildingMaterialGrid[y].length; x++){
        const own = game.buildingMaterialGrid[y][x];
        if(!own || String(own.componentId) !== String(cid)) continue;
        const cell = game.buildingGrid && game.buildingGrid[y] && game.buildingGrid[y][x];
        if(!cell) continue;
        const reg = game.buildingRegistry[cell.bid];
        if(reg) reg.materialKey = mat;
      }
    }
  }
}

function crBuildBuildingMaterialComponents(map){
  const H = map.length;
  const W = H ? map[0].length : 0;
  game.buildingMaterialGrid = Array.from({ length: H }, () => new Array(W).fill(null));
  game.buildingMaterialComponents = {};
  let nextComponentId = 1;

  function isWallCell(x, y){
    if(x < 0 || y < 0 || y >= H || x >= W) return false;
    return crIsBuildingMaterialWallType(map[y][x]);
  }

  for(let y = 0; y < H; y++){
    for(let x = 0; x < W; x++){
      if(typeof crIsD1CustomProofZoneCell === 'function' && crIsD1CustomProofZoneCell(x, y)) continue;
      if(!isWallCell(x, y) || game.buildingMaterialGrid[y][x]) continue;

      const cells = [];
      const stack = [[x, y]];
      game.buildingMaterialGrid[y][x] = { componentId: nextComponentId, materialKey: null };

      while(stack.length){
        const [cx, cy] = stack.pop();
        cells.push([cx, cy]);
        for(const [nx, ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]){
          if(!isWallCell(nx, ny)) continue;
          if(game.buildingMaterialGrid[ny][nx]) continue;
          game.buildingMaterialGrid[ny][nx] = { componentId: nextComponentId, materialKey: null };
          stack.push([nx, ny]);
        }
      }

      const materialKey = crPickComponentBuildingMaterial(cells, nextComponentId);
      for(const [cx, cy] of cells){
        game.buildingMaterialGrid[cy][cx].materialKey = materialKey;
      }
      game.buildingMaterialComponents[nextComponentId] = {
        componentId: nextComponentId,
        materialKey,
        cells: cells.length,
        hasRegistryCell: cells.some(([cx, cy]) => !!crBuildingRegistryForCell(cx, cy)),
      };
      nextComponentId++;
    }
  }
  crSyncRegistryMaterialsToComponents();
}

function crEnsureBuildingMaterialComponentsBuilt(){
  if(!game || !game.map) return;
  const H = game.MAP_H || game.map.length;
  if(game.buildingMaterialGrid && game.buildingMaterialGrid.length === H) return;
  crBuildBuildingMaterialComponents(game.map);
  crSyncRegistryMaterialsToComponents();
}

function crBuildingMaterialForCell(mapX, mapY){
  crEnsureBuildingMaterialComponentsBuilt();
  const own = game && game.buildingMaterialGrid && game.buildingMaterialGrid[mapY] && game.buildingMaterialGrid[mapY][mapX];
  if(own && own.materialKey) return crNormalizeBuildingTextureMaterial(own.materialKey);
  // Component fallback: resolve material from connected building component to prevent gray flip.
  // If a cell is part of a component but lacks per-cell materialKey, use the component's material.
  if(own && own.componentId){
    const comp = game.buildingMaterialComponents && game.buildingMaterialComponents[own.componentId];
    if(comp && comp.materialKey) return crNormalizeBuildingTextureMaterial(comp.materialKey);
  }
  const reg = crBuildingRegistryForCell(mapX, mapY);
  if(reg && reg.materialKey) return crNormalizeBuildingTextureMaterial(reg.materialKey);
  return 'stucco';
}

function crDebugBuildingMaterialComponents(){
  crEnsureBuildingMaterialComponentsBuilt();
  const map = game.map || [];
  let wallCells = 0;
  let coveredNonRegisteredWallCells = 0;
  const comps = game.buildingMaterialComponents || {};
  for(let y = 0; y < game.MAP_H; y++){
    for(let x = 0; x < game.MAP_W; x++){
      if(!crIsBuildingMaterialWallType(map[y] && map[y][x])) continue;
      wallCells++;
      const bg = game.buildingGrid && game.buildingGrid[y] && game.buildingGrid[y][x];
      const own = game.buildingMaterialGrid[y] && game.buildingMaterialGrid[y][x];
      if(!bg && own && own.materialKey) coveredNonRegisteredWallCells++;
    }
  }
  return {
    componentCount: Object.keys(comps).length,
    wallCells,
    coveredNonRegisteredWallCells,
  };
}

function crFacadeFaceBuildingMaterial(fc, fallback){
  const reg = fc && fc.reg;
  const mat = reg && reg.materialKey;
  return crNormalizeBuildingTextureMaterial(mat || fallback);
}

function crGetBuildingMaterialTextureForFace(mapX, mapY, faceDir, sliceH){
  const atlas = crBuildFacadeTextureAtlas();
  let fc = null;
  try { fc = (typeof crUpdateFacadeFaceU === 'function') ? crUpdateFacadeFaceU(mapX, mapY, faceDir, mapX + 0.5) : null; } catch(e){ fc = null; }
  const materialKey = crBuildingMaterialForCell(mapX, mapY);
  // LOD: use calm variant at distance to preserve hue without shimmer.
  // Never falls back to stucco/gray — calm atlas keeps same material hue.
  const key = crMaterialTextureKeyForSlice(materialKey, sliceH || 9999);
  return {
    texture: atlas[key] || atlas[crMaterialTextureKey(materialKey)] || atlas.material_stucco || atlas.fallback_smooth_wall,
    key,
    materialKey,
    faceContext: fc,
  };
}

function crBuildingMaterialTileU(mapX, mapY, faceDir, wallX, scaleCells){
  const s = Math.max(0.25, Number(scaleCells) || 1);
  const u = wallX - Math.floor(wallX);
  let worldAlong = u;
  if(faceDir === 'south' || faceDir === 'north') worldAlong = mapX + u;
  else worldAlong = mapY + u;
  const t = worldAlong / s;
  return t - Math.floor(t);
}

function crMaterialTileScaleCells(materialKey){
  const m = crNormalizeBuildingTextureMaterial(materialKey);
  if(m === 'red_brick') return CR_MATERIAL_RED_BRICK_TILE_SCALE;
  if(m === 'light_gray_cinderblock') return CR_MATERIAL_CINDERBLOCK_TILE_SCALE;
  if(m === 'aluminum_siding') return CR_MATERIAL_SIDING_TILE_SCALE;
  return 1.35; // stucco: broader, less repetitive
}

/* Material LOD — distance-based texture simplification that preserves material hue/identity.
   Replaces the unused crMaterialVisualLodForSlice helper. Never falls back to stucco/gray. */
function crMaterialTextureKeyForSlice(materialKey, sliceH){
  const m = crNormalizeBuildingTextureMaterial(materialKey);
  if(sliceH < 55){
    if(m === 'red_brick') return 'material_red_brick_calm';
    if(m === 'aluminum_siding') return 'material_aluminum_siding_calm';
  }
  return crMaterialTextureKey(m);
}

function crBuildingMaterialTileUForCell(mapX, mapY, faceDir, wallX, materialKey){
  return crBuildingMaterialTileU(mapX, mapY, faceDir, wallX, crMaterialTileScaleCells(materialKey));
}

/* ===== DECAL INTEGRATION 1 — facade overlay system ===== */
/* Decals are pure overlays: they sit on top of the base wall material pass,
   never replacing it. One base material per connected building mass is preserved. */

const CR_DECAL_PACK = {
  version: 'decalintegration1',
  signTexts: [
    'THE BUZZ',
    'MAIN STREET BAGELS',
    'ROCKSLIDE BREW PUB',
    'KILN COFFEE BAR',
    'BOARD FOX GAMES',
    "PABLO'S PIZZA",
    'THE ART CENTER',
    'MESA THEATER',
    'COLORADO NATIONAL MONUMENT',
    'DOWNTOWN GRAND JUNCTION'
  ],
  families: {
    residential: ['decal_house_window', 'decal_front_door', 'decal_mailbox_attached', 'decal_porch_light', 'decal_house_numbers'],
    utility: ['decal_service_door', 'decal_utility_window', 'decal_electric_meter'],
    commercial: ['decal_storefront_window', 'decal_glass_door', 'decal_sign_board'],
    allKeys: [
      'decal_house_window', 'decal_storefront_window', 'decal_utility_window',
      'decal_front_door', 'decal_glass_door', 'decal_service_door',
      'decal_electric_meter', 'decal_mailbox_attached', 'decal_house_numbers',
      'decal_porch_light', 'decal_sign_board'
    ]
  }
};

/* Seeded pick for stable decal assignment per building+face */
function crDecalSeededPick(bid, faceDir, salt, arr){
  if(!arr || !arr.length) return null;
  let h = ((bid || '').length * 73856093) ^ (salt * 19349663);
  for(let i = 0; i < (bid || '').length; i++) h = (h * 31 + (bid || '').charCodeAt(i)) | 0;
  for(let i = 0; i < (faceDir || '').length; i++) h = (h * 37 + (faceDir || '').charCodeAt(i)) | 0;
  h = (h >>> 0);
  return arr[h % arr.length];
}

/* Seeded int for per-cell decal variation */
function crDecalHashInt(bid, lx, ly, faceDir, salt){
  let h = salt * 2654435761;
  h = (h ^ (lx * 40503)) >>> 0;
  h = (h ^ (ly * 2246822519)) >>> 0;
  h = (h ^ ((bid || '').length * 3266489917)) >>> 0;
  return h >>> 0;
}

/* Sign text fit helper — ensures text stays on the sign board */
function crFitSignText(text, boardW, boardH){
  if(!text || !boardW || !boardH) return { lines: [], fontSize: 0, overflow: false };
  const words = String(text).toUpperCase().split(/\s+/).filter(function(w){ return w.length > 0; });
  if(!words.length) return { lines: [], fontSize: 0, overflow: false };
  const maxCharsPerLine = Math.max(3, Math.floor(boardW / Math.max(4, boardW * 0.08)));
  const maxLines = Math.max(1, Math.floor(boardH / Math.max(6, boardH * 0.22)));
  let lines = [];
  let cur = '';
  for(const w of words){
    if((cur + ' ' + w).trim().length <= maxCharsPerLine){
      cur = (cur + ' ' + w).trim();
    } else {
      if(cur) lines.push(cur);
      cur = w;
    }
  }
  if(cur) lines.push(cur);
  while(lines.length > maxLines && lines.length > 1){
    const last = lines.pop();
    const prev = lines[lines.length - 1];
    lines[lines.length - 1] = prev.slice(0, Math.max(1, maxCharsPerLine - 3)) + '...';
  }
  if(lines.length === 1 && lines[0].length > maxCharsPerLine){
    lines[0] = lines[0].slice(0, Math.max(1, maxCharsPerLine - 3)) + '...';
  }
  const longestLine = lines.reduce(function(m, l){ return Math.max(m, l.length); }, 0);
  const fontSizeByWidth = Math.floor(boardW / Math.max(1, longestLine * 0.62));
  const fontSizeByHeight = Math.floor(boardH / Math.max(1, lines.length * 1.3));
  const fontSize = Math.max(3, Math.min(fontSizeByWidth, fontSizeByHeight));
  const overflow = false; // text is always clamped to fit
  return { lines: lines, fontSize: fontSize, overflow: overflow, maxCharsPerLine: maxCharsPerLine, maxLines: maxLines };
}

/* Determine decal assignment for a given face.
   Returns a list of decal placements for that cell/face. */
/* Component-aware decal lookup — for non-registry connected wall cells */
function crBuildingMaterialComponentForCell(mapX, mapY){
  if(typeof crEnsureBuildingMaterialComponentsBuilt === 'function'){
    try { crEnsureBuildingMaterialComponentsBuilt(); } catch(e) {}
  }
  return game.buildingMaterialGrid &&
         game.buildingMaterialGrid[mapY] &&
         game.buildingMaterialGrid[mapY][mapX] || null;
}

/* ===== DECAL INTEGRATION 3 — Component-face facade layouts ===== */
/* Replaces per-cell modulo scatter with stable, coherent facade assemblies.
   All cells on the same component face share the same layout — decals are
   positioned by fu range so each column only draws its portion. */

var CR_FACADE_LAYOUT_CACHE = {};

function crGetComponentFaceKey(comp, faceDir){
  if(!comp) return null;
  const cid = comp.componentId || comp.cid || '';
  return cid + ':' + faceDir;
}

function crComponentFaceLayoutKind(comp, faceDir){
  if(!comp) return 'blank';
  const cells = comp.cells || [];
  const cid = String(comp.componentId || comp.cid || '');
  let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
  for(const c of cells){
    const x = Array.isArray(c) ? c[0] : c.x;
    const y = Array.isArray(c) ? c[1] : c.y;
    if(x < minX) minX = x; if(x > maxX) maxX = x;
    if(y < minY) minY = y; if(y > maxY) maxY = y;
  }
  const spanX = maxX - minX + 1;

  if(faceDir === 'east' || faceDir === 'west'){
    const h = crDecalHashInt(cid, 0, 0, faceDir, 1999973);
    if(h % 4 <= 1) return 'service_front';
    return 'blank_side';
  }
  // South/north faces: wide = commercial, narrow = residential
  const h = crDecalHashInt(cid, 0, 0, faceDir, 357953);
  if(spanX >= 2) return 'commercial_front';
  if(h % 3 !== 0) return 'residential_front';
  return 'commercial_front';
}

function crGetFacadeLayoutForComponentFace(comp, faceDir){
  if(!comp) return null;
  const fkey = crGetComponentFaceKey(comp, faceDir);
  if(CR_FACADE_LAYOUT_CACHE[fkey]) return CR_FACADE_LAYOUT_CACHE[fkey];
  const kind = crComponentFaceLayoutKind(comp, faceDir);
  const cid = comp.componentId || comp.cid || '';
  let decals = [];
  if(kind === 'commercial_front'){
    const signText = crDecalSeededPick(cid, faceDir, 42, CR_DECAL_PACK.signTexts);
    decals = [
      { key: 'decal_sign_board', fu0: 0.10, fu1: 0.90, zone: 'sign', text: signText },
      { key: 'decal_storefront_window', fu0: 0.08, fu1: 0.58, zone: 'window' },
      { key: 'decal_glass_door', fu0: 0.62, fu1: 0.82, zone: 'door' }
    ];
  } else if(kind === 'residential_front'){
    decals = [
      { key: 'decal_house_window', fu0: 0.10, fu1: 0.34, zone: 'window' },
      { key: 'decal_front_door', fu0: 0.42, fu1: 0.62, zone: 'door' },
      { key: 'decal_house_window', fu0: 0.70, fu1: 0.94, zone: 'window' },
      { key: 'decal_mailbox_attached', fu0: 0.63, fu1: 0.76, zone: 'utility_low' },
      { key: 'decal_house_numbers', fu0: 0.36, fu1: 0.50, zone: 'sign' }
    ];
  } else if(kind === 'service_front'){
    decals = [
      { key: 'decal_service_door', fu0: 0.18, fu1: 0.42, zone: 'door' },
      { key: 'decal_utility_window', fu0: 0.56, fu1: 0.80, zone: 'window' },
      { key: 'decal_electric_meter', fu0: 0.82, fu1: 0.95, zone: 'utility_low' }
    ];
  } else {
    // blank_side — at most one small utility feature
    const h = crDecalHashInt(cid, 0, 0, faceDir, 53);
    if(h % 2 === 0){
      decals = [{ key: 'decal_utility_window', fu0: 0.30, fu1: 0.55, zone: 'window' }];
    } else {
      decals = [{ key: 'decal_electric_meter', fu0: 0.40, fu1: 0.60, zone: 'utility_low' }];
    }
  }
  const layout = { kind: kind, decals: decals };
  CR_FACADE_LAYOUT_CACHE[fkey] = layout;
  return layout;
}

/* Component-level decals — now returns facade layout assemblies, not scatter */
function crGetComponentDecalsForFace(mapX, mapY, faceDir, comp){
  if(!comp) return [];
  const layout = crGetFacadeLayoutForComponentFace(comp, faceDir);
  return layout ? layout.decals : [];
}

function crGetDecalsForFace(mapX, mapY, faceDir){
  // Try registry/module path first
  const cell = game.buildingGrid && game.buildingGrid[mapY] && game.buildingGrid[mapY][mapX];
  const reg = cell && game.buildingRegistry && game.buildingRegistry[cell.bid];
  if(reg){
    return crGetModuleDecalsForFace(mapX, mapY, faceDir, cell, reg);
  }
  // Component fallback for non-registry connected wall cells
  const comp = crBuildingMaterialComponentForCell(mapX, mapY);
  if(comp){
    return crGetComponentDecalsForFace(mapX, mapY, faceDir, comp);
  }
  return [];
}

/* Module-based decal assignment (renamed from original crGetDecalsForFace) */
function crGetModuleDecalsForFace(mapX, mapY, faceDir, cell, reg){
  const moduleId = cell.mid || reg.moduleId;
  const bid = cell.bid;
  const lx = cell.lx, ly = cell.ly;
  const kind = crFacadeComposeKind(moduleId, faceDir);
  const placements = [];

  if(kind === 'storefront_front'){
    if(faceDir === 'south'){
      placements.push({ key: 'decal_storefront_window', fu0: 0.08, fu1: 0.92, zone: 'window' });
      placements.push({ key: 'decal_glass_door', fu0: 0.35, fu1: 0.65, zone: 'door' });
      const signText = crDecalSeededPick(bid, faceDir, 42, CR_DECAL_PACK.signTexts);
      placements.push({ key: 'decal_sign_board', fu0: 0.05, fu1: 0.95, zone: 'sign', text: signText });
    }
  } else if(kind === 'boarded_front'){
    if(faceDir === 'south'){
      placements.push({ key: 'decal_sign_board', fu0: 0.10, fu1: 0.90, zone: 'sign',
        text: crDecalSeededPick(bid, faceDir, 7, CR_DECAL_PACK.signTexts) });
      placements.push({ key: 'decal_house_window', fu0: 0.05, fu1: 0.35, zone: 'window' });
    }
  } else if(kind === 'garage_front'){
    if(faceDir === 'south'){
      if(lx === reg.mod.w - 1){
        placements.push({ key: 'decal_service_door', fu0: 0.50, fu1: 0.95, zone: 'door' });
      }
      placements.push({ key: 'decal_electric_meter', fu0: 0.02, fu1: 0.20, zone: 'utility_low' });
      placements.push({ key: 'decal_utility_window', fu0: 0.70, fu1: 0.92, zone: 'window' });
    }
  } else if(kind === 'pavilion_front'){
    if(faceDir === 'south' || faceDir === 'north'){
      placements.push({ key: 'decal_front_door', fu0: 0.40, fu1: 0.60, zone: 'door' });
      placements.push({ key: 'decal_house_window', fu0: 0.05, fu1: 0.30, zone: 'window' });
      placements.push({ key: 'decal_house_numbers', fu0: 0.65, fu1: 0.85, zone: 'sign' });
    }
  } else if(kind === 'side'){
    // Increased density: every 2nd-3rd cell gets something
    const h = crDecalHashInt(bid, lx, ly, faceDir, 99);
    if(h % 2 === 0) placements.push({ key: 'decal_utility_window', fu0: 0.20, fu1: 0.55, zone: 'window' });
    if(h % 3 === 0) placements.push({ key: 'decal_house_window', fu0: 0.60, fu1: 0.90, zone: 'window' });
    if(h % 4 === 0) placements.push({ key: 'decal_electric_meter', fu0: 0.05, fu1: 0.25, zone: 'utility_low' });
    if(h % 5 === 0) placements.push({ key: 'decal_mailbox_attached', fu0: 0.70, fu1: 0.92, zone: 'utility_low' });
    if(h % 7 === 0) placements.push({ key: 'decal_house_numbers', fu0: 0.30, fu1: 0.50, zone: 'sign' });
  } else if(kind === 'service_front'){
    // Increased density
    const h = crDecalHashInt(bid, lx, ly, faceDir, 55);
    if(h % 2 === 0) placements.push({ key: 'decal_service_door', fu0: 0.25, fu1: 0.60, zone: 'door' });
    if(h % 2 === 1) placements.push({ key: 'decal_utility_window', fu0: 0.60, fu1: 0.88, zone: 'window' });
    if(h % 3 === 0) placements.push({ key: 'decal_electric_meter', fu0: 0.05, fu1: 0.25, zone: 'utility_low' });
  } else {
    // Default residential
    if(faceDir === 'south' || faceDir === 'east'){
      const h = crDecalHashInt(bid, lx, ly, faceDir, 33);
      if(h % 2 === 0) placements.push({ key: 'decal_house_window', fu0: 0.15, fu1: 0.50, zone: 'window' });
      if(h % 3 === 1) placements.push({ key: 'decal_front_door', fu0: 0.55, fu1: 0.80, zone: 'door' });
      if(h % 4 === 0) placements.push({ key: 'decal_mailbox_attached', fu0: 0.82, fu1: 0.96, zone: 'utility_low' });
      if(h % 5 === 0) placements.push({ key: 'decal_house_numbers', fu0: 0.05, fu1: 0.22, zone: 'sign' });
      if(h % 7 === 0) placements.push({ key: 'decal_porch_light', fu0: 0.50, fu1: 0.56, zone: 'utility_high' });
    }
  }
  return placements;
}

/* Zone → Y pixel range — decalintegration3 handoff zones (no black slabs) */
function crDecalZoneY(zone, drawStart, sliceH){
  if(zone === 'window') return { y0: drawStart + sliceH * 0.22, y1: drawStart + sliceH * 0.48 };
  if(zone === 'door') return { y0: drawStart + sliceH * 0.42, y1: drawStart + sliceH * 0.94 };
  if(zone === 'sign') return { y0: drawStart + sliceH * 0.08, y1: drawStart + sliceH * 0.20 };
  if(zone === 'utility_low') return { y0: drawStart + sliceH * 0.62, y1: drawStart + sliceH * 0.82 };
  if(zone === 'utility_high') return { y0: drawStart + sliceH * 0.12, y1: drawStart + sliceH * 0.22 };
  return { y0: drawStart + sliceH * 0.40, y1: drawStart + sliceH * 0.60 };
}

/* Draw a single decal placement as a column slice — decalintegration3 quality pass.
   Lighter glass/door fills with readable frames. No black slabs. */
function crDrawDecalPlacement(ctx, col, drawStart, sliceH, fu, placement){
  const z = crDecalZoneY(placement.zone, drawStart, sliceH);
  const key = placement.key;

  if(!crFacadeArtFuIn(fu, placement.fu0, placement.fu1)) return;

  const pw = 1;
  const y0 = z.y0, y1 = z.y1;

  if(key === 'decal_house_window'){
    // Glass body — light blue, visible frame, internal mullion
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(72,102,132,0.42)', 'rgba(60,54,46,0.50)');
    if(crFacadeArtFuIn(fu, placement.fu0 + (placement.fu1-placement.fu0)*0.45, placement.fu0 + (placement.fu1-placement.fu0)*0.55)){
      crFacadeArtColBand(ctx, col, pw, y0, y1, 'rgba(60,54,46,0.34)');
    }
  } else if(key === 'decal_storefront_window'){
    // Wide storefront — darker glass, visible frame, low on wall
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(54,74,96,0.40)', 'rgba(52,48,42,0.52)');
    // Interior light suggestion
    if(crFacadeArtFuIn(fu, placement.fu0 + (placement.fu1-placement.fu0)*0.20, placement.fu0 + (placement.fu1-placement.fu0)*0.40)){
      crFacadeArtColBand(ctx, col, pw, y0 + (y1-y0)*0.3, y0 + (y1-y0)*0.7, 'rgba(110,120,130,0.12)');
    }
  } else if(key === 'decal_utility_window'){
    // Smaller, darker utility glass with frame
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(50,58,68,0.42)', 'rgba(56,52,46,0.50)');
  } else if(key === 'decal_front_door'){
    // Residential door — warm wood tone, tall, visible frame
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(92,68,44,0.52)', 'rgba(60,48,36,0.50)');
    // Vertical panel hint
    if(crFacadeArtFuIn(fu, placement.fu0 + (placement.fu1-placement.fu0)*0.40, placement.fu0 + (placement.fu1-placement.fu0)*0.60)){
      crFacadeArtColBand(ctx, col, pw, y0, y1, 'rgba(70,52,34,0.20)');
    }
  } else if(key === 'decal_glass_door'){
    // Commercial glass door — blue-gray glass, not black slab
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(58,78,96,0.46)', 'rgba(52,48,42,0.50)');
  } else if(key === 'decal_service_door'){
    // Service door — muted gray-brown, readable
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(72,68,60,0.52)', 'rgba(56,52,46,0.48)');
  } else if(key === 'decal_electric_meter'){
    // Small gray utility box + round meter dial hint
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(88,86,80,0.50)', 'rgba(60,58,54,0.46)');
    const midY = y0 + (y1 - y0) * 0.35;
    if(crFacadeArtFuIn(fu, placement.fu0 + (placement.fu1-placement.fu0)*0.3, placement.fu0 + (placement.fu1-placement.fu0)*0.7)){
      crFacadeArtColBand(ctx, col, pw, midY, midY + Math.max(2,(y1-y0)*0.18), 'rgba(160,156,148,0.30)');
    }
  } else if(key === 'decal_mailbox_attached'){
    // Small horizontal box near door
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(100,76,48,0.48)', 'rgba(70,54,38,0.46)');
  } else if(key === 'decal_house_numbers'){
    // Small dark plate with readable frame
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(60,58,52,0.30)', 'rgba(50,48,44,0.36)');
  } else if(key === 'decal_porch_light'){
    crFacadeArtColBand(ctx, col, pw, y0, y1, 'rgba(230,210,130,0.36)');
  } else if(key === 'decal_sign_board'){
    // Solid board with inner border + text-band indication
    crFacadeArtColFramedBox(ctx, col, pw, fu, placement.fu0, placement.fu1, y0, y1, 'rgba(130,108,64,0.42)', 'rgba(70,56,36,0.46)');
    // Inner border line
    crFacadeArtColLine(ctx, col, pw, y0 + 1, 'rgba(180,156,100,0.18)');
    crFacadeArtColLine(ctx, col, pw, y1 - 1, 'rgba(60,48,32,0.18)');
    const textPattern = crDecalHashInt(placement.text || '', 0, 0, 'sign', 17);
    const bandH = y1 - y0;
    const textY0 = y0 + bandH * 0.25;
    const textY1 = y0 + bandH * 0.75;
    if(crFacadeArtFuIn(fu, placement.fu0 + (placement.fu1-placement.fu0)*0.10, placement.fu0 + (placement.fu1-placement.fu0)*0.90)){
      const stripe = ((textPattern + Math.floor(fu * 100)) % 4);
      if(stripe < 3){
        crFacadeArtColBand(ctx, col, pw, textY0, textY1, 'rgba(40,34,26,0.32)');
      }
    }
  }
}

/* Main decal overlay draw — called per wall column AFTER base material + role overlays */
function crDrawDecalOverlayColumn(ctx, col, drawStart, sliceH, mapX, mapY, faceDir, wallX, facadeRole){
  if(sliceH < 14) return;
  if(crIsD1PrefabProofMode() && crIsInsideD1ProofZone(mapX, mapY)) return;
  const placements = crGetDecalsForFace(mapX, mapY, faceDir);
  if(!placements || !placements.length) return;
  const fc = crUpdateFacadeFaceU(mapX, mapY, faceDir, wallX);
  if(!fc) return;
  const fu = fc.faceU;
  for(const p of placements){
    crDrawDecalPlacement(ctx, col, drawStart, sliceH, fu, p);
  }
}

/* Debug spec for selfcheck */
function crDecalDebugSpec(){
  return {
    version: CR_DECAL_PACK.version,
    signTexts: CR_DECAL_PACK.signTexts.slice(),
    decalKeys: CR_DECAL_PACK.families.allKeys.slice(),
    families: {
      residential: CR_DECAL_PACK.families.residential.slice(),
      utility: CR_DECAL_PACK.families.utility.slice(),
      commercial: CR_DECAL_PACK.families.commercial.slice()
    }
  };
}

/* END DECAL INTEGRATION 1 */

function crDrawBuildingMaterialWallColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, facadeRole){
  if(crIsD1PrefabProofMode() && crIsInsideD1ProofZone(mapX, mapY)) return;
  const faceDir = crWallHitFaceDir(side, stepX, stepY);
  if(typeof BUILD_ID !== 'undefined' && (BUILD_ID === 'prefabgrid1' || BUILD_ID === 'stripmall001proof1' || BUILD_ID === 'facadeskins8b' || BUILD_ID === 'facadeskins8' || BUILD_ID === 'facadeskins7' || BUILD_ID === 'facadeskins6' || BUILD_ID === 'facadeskins3' || BUILD_ID === 'facadeskins2' || BUILD_ID === 'facadeskins1') && typeof crDrawBitmapFacadeSkinWallColumn === 'function'){
    const drewSkin = crDrawBitmapFacadeSkinWallColumn(ctx, col, drawStart, sliceH, mapX, mapY, faceDir, wallX, facadeRole);
    if(drewSkin) return;
  }
  const resolved = crGetBuildingMaterialTextureForFace(mapX, mapY, faceDir, sliceH);
  const materialU = crBuildingMaterialTileUForCell(mapX, mapY, faceDir, wallX, resolved.materialKey);
  crDrawContinuousFacadeTextureColumn(ctx, col, drawStart, sliceH, resolved.texture, materialU);
  if(facadeRole && typeof crDrawFpvFacadePackRoleOverlays === 'function'){
    crDrawFpvFacadePackRoleOverlays(ctx, col, drawStart, sliceH, mapX, mapY, faceDir, wallX, facadeRole);
  }
  if(typeof crDrawDecalOverlayColumn === 'function'){
    crDrawDecalOverlayColumn(ctx, col, drawStart, sliceH, mapX, mapY, faceDir, wallX, facadeRole);
  }
}

function crGetBuildingMaterialTextureForCellRaw(mapX, mapY){
  const atlas = crBuildFacadeTextureAtlas();
  const materialKey = crBuildingMaterialForCell(mapX, mapY);
  const key = crMaterialTextureKey(materialKey);
  return {
    texture: atlas[key] || atlas.material_stucco || atlas.fallback_smooth_wall,
    key,
    materialKey,
  };
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
  // Base wall color must come from the building's material (walltextures1+), not the role's color band.
  const buildingMaterialKey = crNormalizeBuildingTextureMaterial(fc.reg && fc.reg.materialKey);
  const pal = crDrawSmoothBuildingMaterialBase(ctx, col, drawStart, sliceH, pw, buildingMaterialKey, kind);
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
  if(crIsD1PrefabProofMode() && crIsInsideD1ProofZone(mapX, mapY)) return;
  if(typeof CR_SINGLE_MATERIAL_BUILDING_TEXTURES !== 'undefined' && CR_SINGLE_MATERIAL_BUILDING_TEXTURES === 1 &&
     typeof CR_CONTINUOUS_FACADE_TEXTURES !== 'undefined' && CR_CONTINUOUS_FACADE_TEXTURES === 1){
    const fc = crUpdateFacadeFaceU(mapX, mapY, crWallHitFaceDir(side, stepX, stepY), wallX);
    crDrawBuildingMaterialWallColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, (fc && fc.roleId) || roleId);
    return;
  }
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
    // Base texture is the building's single material (walltextures1+), tiled at world scale (walltextures2+).
    crDrawBuildingMaterialWallColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, (fc && fc.roleId) || roleId);
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

// Paints ONLY the role-driven overlays (signs / window glass / door / boarded / garage bay / vents / panels / murals / etc.)
// on top of an already-drawn building-material base. Used as the second half of the continuous-facade draw so that
// role-specific overlays stay readable without affecting the wall's base material.
function crDrawFpvFacadePackRoleOverlays(ctx, col, drawStart, sliceH, mapX, mapY, faceDir, wallX, roleId){
  if(sliceH < 14 || !roleId) return;
  if(crIsD1PrefabProofMode() && crIsInsideD1ProofZone(mapX, mapY)) return;
  const faceU = Math.max(0, Math.min(0.999, wallX - Math.floor(wallX)));
  const fc = (typeof crUpdateFacadeFaceU === 'function') ? (function(){ try { return crUpdateFacadeFaceU(mapX, mapY, faceDir, wallX); } catch(e){ return null; } })() : null;
  if(!fc) return;
  const moduleId = fc.moduleId;
  const kind = crFacadeComposeKind(moduleId, faceDir);
  if(!fc.reg || !fc.reg.mod || !fc.reg.mod.faces) return;
  const row = fc.reg.mod.faces[faceDir];
  if(!row) return;
  const n = row.length;
  const Z = crFacadeArtVocabularyZones(drawStart, sliceH);
  const fu = fc.faceU;
  const panelAt = (i)=> crFacadeArtPanelInset(i, n, 0.28);
  const norm = (i)=> crNormalizeFacadeRoleId(row[i]);

  function framedObj(x0, x1, y0, y1, fill, frame){
    return crFacadeArtColFramedBox(ctx, col, 1, fu, x0, x1, y0, y1, fill, frame || 'rgba(28,26,22,0.46)');
  }

  if(kind === 'storefront_front'){
    for(let i = 0; i < n; i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(!crFacadeArtFuIn(fu, P.ox0, P.ox1)) continue;
      if(pr === 'storefront_door'){
        const D = crFacadeArtLocalRange(P, 0.24, 0.76);
        const doorY0 = Z.door0 + sliceH * 0.055;
        const doorY1 = drawStart + sliceH * 0.875;
        framedObj(D.x0, D.x1, doorY0, doorY1, 'rgba(54,44,36,0.66)', 'rgba(28,24,22,0.46)');
      } else if(pr === 'storefront_window'){
        const W = crFacadeArtLocalRange(P, 0.10, 0.90);
        const windowY0 = Z.win0 + sliceH * 0.040;
        const windowY1 = Z.win0 + (Z.win1-Z.win0)*0.72;
        framedObj(W.x0, W.x1, windowY0, windowY1, 'rgba(60,78,88,0.34)', 'rgba(26,30,30,0.42)');
      } else if(pr === 'storefront_sign'){
        const S = crFacadeArtLocalRange(P, 0.16, 0.84);
        framedObj(S.x0, S.x1, Z.sign0 + 1, Z.sign0 + (Z.sign1-Z.sign0)*0.58, 'rgba(148,120,70,0.18)', 'rgba(70,54,36,0.24)');
      }
    }
    return;
  }
  if(kind === 'boarded_front'){
    for(let i = 0; i < n; i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(!crFacadeArtFuIn(fu, P.ox0, P.ox1)) continue;
      if(pr === 'boarded_window'){
        const W = crFacadeArtLocalRange(P, 0.10, 0.90);
        framedObj(W.x0, W.x1, Z.win0 + sliceH * 0.06, Z.win0 + (Z.win1-Z.win0)*0.72, 'rgba(96,72,52,0.46)', 'rgba(46,32,22,0.48)');
      }
    }
    return;
  }
  if(kind === 'garage_front'){
    for(let i = 0; i < n; i++){
      const P = panelAt(i);
      const pr = norm(i);
      if(!crFacadeArtFuIn(fu, P.ox0, P.ox1)) continue;
      if(pr === 'garage_bay'){
        const W = crFacadeArtLocalRange(P, 0.10, 0.90);
        framedObj(W.x0, W.x1, Z.win0 + sliceH * 0.10, drawStart + sliceH * 0.890, 'rgba(104,106,102,0.42)', 'rgba(36,38,38,0.46)');
      }
    }
    return;
  }
  // Other roles (service/utility/mural/side doors/blank_brick/blank_concrete): the building-material
  // texture already gives identity; small role marker decals stay subtle so material stays the dominant read.
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
  const reg = cell && game.buildingRegistry && game.buildingRegistry[cell.bid];
  const roleDef = role && CR_FACADE_PACK.roles[role];
  const roleMaterial = roleDef ? roleDef.material : null;
  const buildingMaterial = reg ? crNormalizeBuildingTextureMaterial(reg.materialKey) : null;
  return {
    buildingId: cell ? cell.bid : null,
    moduleId: cell ? cell.mid : null,
    localX: cell ? cell.lx : null,
    localY: cell ? cell.ly : null,
    faceDirection: faceDir,
    role: role,
    roleMaterial,
    material: roleMaterial, // keep old alias for back-compat
    buildingMaterial,
    baseMaterial: buildingMaterial,
    baseTextureKey: reg ? crMaterialTextureKey(reg.materialKey) : null,
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
    buildId: BUILD_ID === 'buildingsmooth1' || BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1' || BUILD_ID === 'feel1' || BUILD_ID === 'feel2' || BUILD_ID === 'walltextures1' || BUILD_ID === 'walltextures2' || BUILD_ID === 'walltextures3' || BUILD_ID === 'walltextures4' || BUILD_ID === 'decalintegration1' || BUILD_ID === 'decalintegration2' || BUILD_ID === 'decalintegration3' || BUILD_ID === 'decalintegration4' || BUILD_ID === 'facadeskins1' || BUILD_ID === 'facadeskins2',
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
    buildId: BUILD_ID === 'facadetexture1' || BUILD_ID === 'calmwalls1' || BUILD_ID === 'simplewalls1' || BUILD_ID === 'flatwalls1' || BUILD_ID === 'props1restore1' || BUILD_ID === 'solidwalls1' || BUILD_ID === 'feel1' || BUILD_ID === 'feel2' || BUILD_ID === 'walltextures1' || BUILD_ID === 'walltextures2' || BUILD_ID === 'walltextures3' || BUILD_ID === 'walltextures4' || BUILD_ID === 'decalintegration1' || BUILD_ID === 'decalintegration2' || BUILD_ID === 'decalintegration3' || BUILD_ID === 'decalintegration4' || BUILD_ID === 'facadeskins1' || BUILD_ID === 'facadeskins2',
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
  game.buildingMaterialGrid = [];
  game.buildingMaterialComponents = {};
  game._nextBuildingId = 1;
  CR_FACADE_LAYOUT_CACHE = {}; // decalintegration3: clear facade layout cache on map reset
  if(typeof crClearFacadeSkinProfiles === 'function') crClearFacadeSkinProfiles();
  for(let y=0;y<GH;y++) game.buildingGrid.push(new Array(GW).fill(null));
}

/* ===== PREFAB ASSET-GRID SYSTEM (SNC_PREFAB_ASSET_GRID_1) =====
 * Asset-first: a building footprint is one approved object with whole
 * bitmap faces. Footprint cells are collision/placement only — never
 * facade panels. Procedural CR_FACADE_PACK placement is gated off by
 * CR_USE_PREFAB_BUILDINGS below.
 */
const CR_USE_PREFAB_BUILDINGS = 1;

// Placeholder/generated internal assets. Object model matches future
// imported bitmap assets exactly (assetId/kind/footprint/renderMode/faces).
const CR_PREFAB_CATALOG = {
  props_1x1: [
    'car_001',
    'dumpster_001',
    'shed_001',
    'fence_piece_001',
    'pallet_001',
    'tent_001',
    'crate_001',
    'sign_001',
    'utility_box_001'
  ],
  buildings_2x2: [
    'strip_mall_001',
    'corner_shop_001',
    'small_service_001'
  ],
  buildings_3x3: [
    'small_house_001',
    'small_office_001',
    'clinic_house_001'
  ]
};

// Flattened lookup: assetId -> { assetId, kind, footprint:{w,h}, renderMode, faces }
const CR_PREFAB_ASSETS = (function(){
  const out = {};
  const kinds = [
    ['props_1x1', 'prop_1x1', 1, 1],
    ['buildings_2x2', 'building_2x2', 2, 2],
    ['buildings_3x3', 'building_3x3', 3, 3]
  ];
  for(const [cls, kind, w, h] of kinds){
    for(const aid of (CR_PREFAB_CATALOG[cls] || [])){
      out[aid] = {
        assetId: aid,
        kind: aid === 'strip_mall_001' ? 'strip_mall' : kind,
        footprint: aid === 'strip_mall_001' ? { w: 6, h: 3 } : { w: w, h: h },
        renderMode: aid === 'strip_mall_001' ? 'exactImportedBitmap' : 'importedWholeFaceAsset',
        assetLoadedState: aid === 'strip_mall_001' ? 'exactImportedBitmap' : 'authoredGeneratedPrefab',
        assetLoaded: aid === 'strip_mall_001' ? 'exactImportedBitmap' : 'authoredGeneratedPrefab',
        renderSource: aid === 'strip_mall_001' ? 'exactImportedBitmap' : 'authoredGeneratedPrefab',
        approvalStatus: aid === 'strip_mall_001' ? 'approved_exact_import_proof' : 'generated_unapproved',
        sourceFormat: aid === 'strip_mall_001' ? 'bitmap' : 'generated',
        exactImportedBitmap: aid === 'strip_mall_001' ? STRIP_MALL_001 : null,
        faces: {
          south: aid + '_south',
          north: aid + '_north',
          east: aid + '_east',
          west: aid + '_west'
        }
      };
    }
  }
  return out;
})();

function crGetPrefabAsset(assetId){
  return CR_PREFAB_ASSETS[assetId] || null;
}

// Deterministic palette per asset so placeholders are visually distinct.
function crPrefabAssetBaseColor(assetId){
  let h = 0;
  for(let i=0;i<assetId.length;i++) h = (h * 31 + assetId.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return 'hsl(' + hue + ',38%,46%)';
}

// Authored generated prefab art styles for SNC_PREFAB_BUILDING_ASSET_PACK_1.
// These are temporary generated assets, but each asset has a distinct whole-face
// composition. They are NOT generic placeholders and do not use repeated panel grids.
const CR_PREFAB_ART_STYLES = {
  strip_mall_001: { base:'#b88a52', trim:'#3b2a1d', accent:'#f0c05a', dark:'#17202a', label:'STRIP MALL', mark:'wide-commercial' },
  corner_shop_001: { base:'#a85f46', trim:'#2c1f1a', accent:'#e5d08b', dark:'#18242b', label:'CORNER SHOP', mark:'corner-commercial' },
  small_service_001: { base:'#b8c1c8', trim:'#44515b', accent:'#f08a3e', dark:'#5d6973', label:'SERVICE', mark:'service-utility' },
  small_house_001: { base:'#9c7357', trim:'#4b2e20', accent:'#8fb3d1', dark:'#1a1e24', label:'HOUSE', mark:'residential' },
  small_office_001: { base:'#6e8798', trim:'#28343d', accent:'#cdd8df', dark:'#151b22', label:'OFFICE', mark:'office' },
  clinic_house_001: { base:'#d8cfb2', trim:'#5b5a52', accent:'#d64b4b', dark:'#20262b', label:'CLINIC', mark:'clinic' },
  car_001: { base:'#4d7ea8', trim:'#111820', accent:'#d9edf7', dark:'#0e1218', label:'CAR', mark:'prop-car' },
  dumpster_001: { base:'#2f6d4f', trim:'#1c2b24', accent:'#d0b46a', dark:'#101915', label:'DUMPSTER', mark:'prop-dumpster' },
  shed_001: { base:'#7a533c', trim:'#2d2019', accent:'#bda57a', dark:'#16120f', label:'SHED', mark:'prop-shed' },
  fence_piece_001: { base:'#6b553d', trim:'#2b2118', accent:'#c3aa7e', dark:'#17120e', label:'FENCE', mark:'prop-fence' }
};

function crPrefabAssetStyle(assetId){
  return CR_PREFAB_ART_STYLES[assetId] || { base: crPrefabAssetBaseColor(assetId), trim:'#211a14', accent:'#e6c472', dark:'#111820', label:String(assetId || 'ASSET').toUpperCase(), mark:'generic' };
}

function crDrawAuthoredPrefabFace(c, st, assetId, faceDir, FW, FH){
  c.fillStyle = st.base;
  c.fillRect(0, 0, FW, FH);
  // One continuous wall mass + roof/cap, no repeated equal panels.
  c.fillStyle = st.trim;
  c.fillRect(0, 0, FW, 22);
  c.fillStyle = 'rgba(0,0,0,0.16)';
  c.fillRect(0, FH - 18, FW, 18);

  if(st.mark === 'wide-commercial'){
    c.fillStyle = st.accent; c.fillRect(0, 42, FW, 34); // full-width commercial sign band
    c.fillStyle = st.dark; c.fillRect(8, 88, FW - 32, 54); // continuous storefront glass mass
    c.fillStyle = '#f6d36a'; c.fillRect(18, 52, 86, 8);
    c.fillStyle = st.dark; c.fillRect(118, 120, 28, 60); // door/service
  } else if(st.mark === 'corner-commercial'){
    c.fillStyle = st.accent; c.fillRect(0, 36, FW, 30);
    c.fillStyle = st.dark; c.fillRect(18, 84, 68, 76);
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(100, 72, 42, 54);
  } else if(st.mark === 'service-utility'){
    c.fillStyle = '#d0d7dd'; c.fillRect(0, 30, FW, 148); // bright utility facade, visible in FPV
    c.fillStyle = '#f08a3e'; c.fillRect(0, 46, FW, 30); // full-width orange service header
    c.fillStyle = '#7e8992'; c.fillRect(14, 92, FW - 42, 58); // rollup/service bay, light not black
    c.fillStyle = '#ffe0a0'; c.fillRect(24, 108, 76, 10); // bay highlight
    c.fillStyle = '#28323a'; c.font = '16px monospace'; c.fillText('SERVICE', 28, 67);
    c.fillStyle = '#c86d35'; c.fillRect(112, 78, 28, 96); // vertical utility stripe
    c.fillStyle = '#26313a'; c.fillRect(142, 116, 12, 28); // meter
  } else if(st.mark === 'residential'){
    c.fillStyle = st.trim; c.beginPath(); c.moveTo(0,46); c.lineTo(FW/2,8); c.lineTo(FW,46); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 72, FW, 20); // porch shadow across face
    c.fillStyle = st.dark; c.fillRect(24, 102, 42, 72); // door
    c.fillStyle = st.accent; c.fillRect(96, 78, 44, 36); // one big window
  } else if(st.mark === 'office'){
    c.fillStyle = '#26343d'; c.fillRect(0, 44, FW, 28); // office name/header band
    c.fillStyle = st.dark; c.fillRect(20, 84, 50, 92); // single vertical glass bay
    c.fillStyle = 'rgba(255,255,255,0.20)'; c.fillRect(88, 86, 58, 46); // broad office window
    c.fillStyle = st.trim; c.fillRect(0, 144, FW, 14); // horizontal reveal only
  } else if(st.mark === 'clinic'){
    c.fillStyle = '#ede4c8'; c.fillRect(0, 42, FW, 34);
    c.fillStyle = st.dark; c.fillRect(22, 92, 44, 82);
    c.fillStyle = st.accent; c.fillRect(100, 48, 18, 72);
    c.fillRect(76, 76, 66, 18); // red cross, one large mark
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(24, 46, 58, 24);
  } else {
    c.fillStyle = st.dark; c.fillRect(28, 68, 76, 72);
    c.fillStyle = st.accent; c.fillRect(110, 44, 28, 104);
  }

  // Face-specific side/back treatment as a whole face, not panels.
  if(faceDir === 'east' || faceDir === 'west'){
    c.fillStyle = 'rgba(0,0,0,0.24)';
    c.fillRect(0, 0, FW, FH);
    c.fillStyle = st.accent;
    c.fillRect(22, 58, 22, 86);
  } else if(faceDir === 'north'){
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(0, 36, FW, 124);
    c.fillStyle = st.dark;
    c.fillRect(98, 82, 38, 54);
  }

  c.fillStyle = 'rgba(0,0,0,0.34)';
  c.fillRect(0, FH - 28, FW, 28);
  c.fillStyle = 'rgba(255,240,190,0.98)';
  c.font = '13px monospace';
  c.fillText(st.label, 8, 17);
  c.font = '10px monospace';
  c.fillText(String(assetId || '').slice(0, 24), 8, FH - 10);
}

// Generate/load a whole-face asset bitmap for (assetId, faceDir).
// Cached on game.__prefabFaceCache. Returns an offscreen canvas.

function crDrawMissingExactStripMallCanvas(msg){
  const FW = 256, FH = 160;
  const cv = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
  if(!cv) return null;
  cv.width = FW; cv.height = FH;
  const c = cv.getContext('2d');
  c.fillStyle = '#ff00ff';
  c.fillRect(0, 0, FW, FH);
  c.fillStyle = '#000';
  c.fillRect(0, 0, FW, 24);
  c.fillRect(0, FH - 24, FW, 24);
  c.fillStyle = '#fff';
  c.font = '18px monospace';
  c.fillText(msg || 'MISSING EXACT ASSET strip_mall_001', 10, 64);
  c.fillText('strip_mall_001', 10, 90);
  return cv;
}

function crGetStripMallExactImportedFaceCanvas(faceDir){
  if(typeof STRIP_MALL_001 === 'undefined' || !STRIP_MALL_001) return null;
  if(typeof document === 'undefined') return null;
  if(!game.__stripMallExactFaceCache) game.__stripMallExactFaceCache = {};
  const key = 'strip_mall_001::' + faceDir;
  if(game.__stripMallExactFaceCache[key]) return game.__stripMallExactFaceCache[key];
  const asset = STRIP_MALL_001;
  const cv = document.createElement('canvas');
  cv.width = asset.width;
  cv.height = asset.height;
  const c = cv.getContext('2d');
  if(faceDir === 'south'){
    const img = typeof STRIP_MALL_001_IMAGE !== 'undefined' ? STRIP_MALL_001_IMAGE : null;
    if(img && img.complete && img.naturalWidth === asset.width && img.naturalHeight === asset.height){
      c.drawImage(img, 0, 0);
      game.__stripMallExactFaceCache[key] = cv;
      return cv;
    }
    return crDrawMissingExactStripMallCanvas('MISSING EXACT ASSET strip_mall_001');
  }
  c.fillStyle = '#85725d';
  c.fillRect(0, 0, asset.width, asset.height);
  c.fillStyle = '#3c3030';
  c.fillRect(0, 0, asset.width, 24);
  c.fillStyle = '#c99f5d';
  c.fillRect(16, 40, 96, 18);
  c.fillStyle = '#26313a';
  c.fillRect(24, 72, 68, 52);
  c.fillStyle = '#e8d38b';
  c.font = '22px monospace';
  c.fillText(faceDir.toUpperCase(), 20, 116);
  game.__stripMallExactFaceCache[key] = cv;
  return cv;
}


function crDrawPendingArtReviewFaceCanvas(assetId, faceDir){
  if(typeof game === 'undefined' || !game) return null;
  if(!game.__pendingArtReviewFaceCache) game.__pendingArtReviewFaceCache = {};
  const key = assetId + '::' + faceDir;
  if(game.__pendingArtReviewFaceCache[key]) return game.__pendingArtReviewFaceCache[key];
  const FW = 160, FH = 192;
  const cv = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(FW, FH)
    : (function(){ const c = document.createElement('canvas'); c.width = FW; c.height = FH; return c; })();
  const c = cv.getContext('2d');
  const img = (typeof CUSTOM_NEXT_001_IMAGE !== 'undefined') ? CUSTOM_NEXT_001_IMAGE : null;
  c.fillStyle = '#273043';
  c.fillRect(0, 0, FW, FH);
  c.fillStyle = '#12161e';
  c.fillRect(8, 8, FW - 16, FH - 16);
  c.fillStyle = '#d6cbaf';
  c.strokeStyle = '#8c7e5b';
  c.lineWidth = 3;
  c.strokeRect(10, 10, FW - 20, FH - 20);
  if(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0){
    const pad = 16;
    const top = 26;
    const panelW = FW - pad * 2;
    const panelH = 116;
    c.save();
    c.fillStyle = '#eee6d2';
    c.fillRect(pad, top, panelW, panelH);
    c.strokeStyle = '#554834';
    c.lineWidth = 2;
    c.strokeRect(pad, top, panelW, panelH);
    const scale = Math.min((panelW - 12) / img.naturalWidth, (panelH - 12) / img.naturalHeight);
    const dw = Math.max(1, Math.floor(img.naturalWidth * scale));
    const dh = Math.max(1, Math.floor(img.naturalHeight * scale));
    const dx = pad + Math.floor((panelW - dw) / 2);
    const dy = top + Math.floor((panelH - dh) / 2);
    try {
      c.drawImage(img, dx, dy, dw, dh);
    } catch(e){
      c.fillStyle = '#a86b52';
      c.fillRect(dx, dy, dw, dh);
    }
    c.restore();
  } else {
    c.fillStyle = '#a86b52';
    c.fillRect(22, 34, 116, 76);
    c.fillStyle = 'rgba(18,16,20,0.82)';
    c.fillRect(32, 46, 96, 22);
    c.fillRect(32, 74, 96, 20);
  }
  c.fillStyle = 'rgba(18,20,28,0.78)';
  c.fillRect(16, 146, FW - 32, 28);
  c.fillStyle = '#ffe07a';
  c.font = 'bold 11px monospace';
  c.textAlign = 'center';
  c.fillText('PENDING ART REVIEW', FW / 2, 158);
  c.font = '10px monospace';
  c.fillStyle = '#dbe6ff';
  c.fillText('custom_next_001 · ' + String(faceDir || 'front').toUpperCase(), FW / 2, 170);
  c.textAlign = 'left';
  game.__pendingArtReviewFaceCache[key] = cv;
  return cv;
}

function crGetPrefabFaceCanvas(assetId, faceDir){
  if(typeof game === 'undefined' || !game) return null;
  if(!game.__prefabFaceCache) game.__prefabFaceCache = {};
  const key = assetId + '::' + faceDir;
  if(game.__prefabFaceCache[key]) return game.__prefabFaceCache[key];
  const asset = crGetPrefabAsset(assetId);
  if(assetId === 'strip_mall_001'){
    const exactFace = crGetStripMallExactImportedFaceCanvas(faceDir);
    if(exactFace) {
      game.__prefabFaceCache[key] = exactFace;
      return exactFace;
    }
    const missing = crDrawMissingExactStripMallCanvas('MISSING EXACT ASSET strip_mall_001');
    if(missing) {
      game.__prefabFaceCache[key] = missing;
      return missing;
    }
  }
  if(assetId === 'custom_next_001'){
    const pendingFace = crDrawPendingArtReviewFaceCanvas(assetId, faceDir);
    if(pendingFace){
      game.__prefabFaceCache[key] = pendingFace;
      return pendingFace;
    }
  }
  const FW = 160, FH = 192;
  const cv = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(FW, FH)
    : (function(){ const c = document.createElement('canvas'); c.width = FW; c.height = FH; return c; })();
  const c = cv.getContext('2d');
  if(asset){
    crDrawAuthoredPrefabFace(c, crPrefabAssetStyle(assetId), assetId, faceDir, FW, FH);
  } else {
    c.fillStyle = '#b00020';
    c.fillRect(0, 0, FW, FH);
    c.fillStyle = '#fff';
    c.font = '16px monospace';
    c.fillText('ASSET MISSING', 12, 82);
    c.fillText(String(assetId || '').slice(0,18), 12, 106);
  }
  game.__prefabFaceCache[key] = cv;
  return cv;
}

function crD1ProofCellKey(x, y){
  return x + ',' + y;
}

function crIsD1CustomProofZoneCell(x, y){
  const zone = game && game.d1CustomProofZone;
  if(!zone) return false;
  return x >= zone.x0 && x <= zone.x1 && y >= zone.y0 && y <= zone.y1;
}

function crGetD1CustomProofZoneCellInfo(x, y){
  const map = game && game.d1CustomProofZoneCellMap;
  if(!map) return null;
  return map[crD1ProofCellKey(x, y)] || null;
}

function crIsD1PrefabProofMode(){
  const g = (typeof game !== 'undefined' && game) ? game : (typeof window !== 'undefined' ? window.game : null);
  return !!(g && g.district === 1 && g.d1CustomProofZone && g.d1CustomProofZone.mode === 'prefab_only');
}

function crIsInsideD1ProofZone(mapX, mapY){
  const g = (typeof game !== 'undefined' && game) ? game : (typeof window !== 'undefined' ? window.game : null);
  const z = g && g.d1CustomProofZone;
  if(!z) return false;
  return mapX >= z.x0 && mapX <= z.x1 && mapY >= z.y0 && mapY <= z.y1;
}

function crD1ProofZoneCellOwner(mapX, mapY){
  const g = (typeof game !== 'undefined' && game) ? game : (typeof window !== 'undefined' ? window.game : null);
  const cell = g && g.buildingGrid && g.buildingGrid[mapY] && g.buildingGrid[mapY][mapX];
  if(!cell || typeof cell.bid === 'undefined') return null;
  const reg = g && g.buildingRegistry && g.buildingRegistry[cell.bid];
  if(!reg) return null;
  if(reg.d1ProofSlotId || reg.source === 'd1CustomProofSlot' || reg.proofZone) return reg;
  return null;
}

const CR_D1_PROOF_ALLOWED_RENDER_MODES = Object.freeze(['exactImportedBitmap', 'pendingArtReviewAsset', 'reservedPad', 'prop1x1']);
const CR_D1_PROOF_ILLEGAL_REASON_LABELS = Object.freeze([
  'PROCEDURAL_RAW_WALL_IN_PROOF_ZONE',
  'BUILDING_GRID_CELL_WITHOUT_REGISTRY',
  'BUILDING_GRID_CELL_WITHOUT_D1_PROOF_OWNER',
  'PROOF_SLOT_RENDER_MODE_NOT_ALLOWED',
  'PROOF_SLOT_MISSING_GAME_FOOTPRINT',
  'FOOTPRINT_TOO_LARGE_FOR_PROOF_RULE',
  'BUILDING_MATERIAL_CELL_IN_PROOF_ZONE',
  'BUILDING_MATERIAL_COMPONENT_TOUCHES_PROOF_ZONE',
  'FACADE_SKIN_CELL_IN_PROOF_ZONE',
  'PROOF_ZONE_BOUNDARY_TOO_LARGE',
  'CAMERA_TARGET_NOT_VISIBLE',
]);

function crD1ProofZoneAllowedRenderMode(renderMode){
  return CR_D1_PROOF_ALLOWED_RENDER_MODES.indexOf(String(renderMode || '')) >= 0;
}

function crNormalizeD1ProofGameFootprint(reg){
  if(!reg) return null;
  const fp = reg.gameFootprint || reg.footprint || reg.footprintCells || null;
  if(!fp) return null;
  const w = (fp.w | 0) || (fp.wCells | 0) || 0;
  const h = (fp.h | 0) || (fp.hCells | 0) || 0;
  if(!w || !h) return null;
  return { w, h };
}

function crSummarizeD1ProofRegistryEntry(reg){
  if(!reg) return null;
  return {
    slotId: reg.slotId || '',
    assetId: reg.assetId || '',
    d1ProofSlotId: reg.d1ProofSlotId || '',
    source: reg.source || '',
    renderMode: reg.renderMode || '',
    approvalStatus: reg.approvalStatus || '',
    assetLoadedState: reg.assetLoadedState || '',
    assetLoaded: reg.assetLoaded || '',
    gameFootprint: reg.gameFootprint || null,
    footprint: reg.footprint || null,
    x0: reg.x0 | 0,
    y0: reg.y0 | 0,
    w: reg.w | 0,
    h: reg.h | 0,
    moduleId: reg.moduleId || null,
    proofZone: !!reg.proofZone,
    visualOnly: !!reg.visualOnly,
    materialKey: reg.materialKey || null,
  };
}

function crAuditD1ProofZoneCells(){
  const g = (typeof game !== 'undefined' && game) ? game : (typeof window !== 'undefined' ? window.game : null);
  const zone = g && g.d1CustomProofZone;
  const map = g && g.map;
  const bgrid = g && g.buildingGrid;
  const mgrid = g && g.buildingMaterialGrid;
  const mcomps = g && g.buildingMaterialComponents;
  const registry = g && g.buildingRegistry;
  if(!g || !zone || !map || !bgrid || !registry){
    return { zone: zone || null, cells: [], illegalCells: [], counts: { total: 0, illegal: 0 }, labels: Array.from(CR_D1_PROOF_ILLEGAL_REASON_LABELS) };
  }
  const cells = [];
  const illegalCells = [];
  const counts = { total: 0, illegal: 0 };
  for(let y = zone.y0; y <= zone.y1; y++){
    for(let x = zone.x0; x <= zone.x1; x++){
      counts.total++;
      const rawCell = map[y] ? map[y][x] : null;
      const isWall = typeof crIsBuildingMaterialWallType === 'function' ? !!crIsBuildingMaterialWallType(rawCell) : !!(rawCell && rawCell !== 0);
      const buildingGridCell = bgrid[y] ? bgrid[y][x] || null : null;
      const bid = buildingGridCell && typeof buildingGridCell.bid !== 'undefined' ? buildingGridCell.bid : null;
      const registryEntry = bid !== null && registry[bid] ? registry[bid] : null;
      const d1ProofSlotId = registryEntry ? (registryEntry.d1ProofSlotId || '') : '';
      const source = registryEntry ? (registryEntry.source || '') : '';
      const assetId = registryEntry ? (registryEntry.assetId || '') : '';
      const renderMode = registryEntry ? (registryEntry.renderMode || '') : '';
      const approvalStatus = registryEntry ? (registryEntry.approvalStatus || '') : '';
      const ownerResolved = !!(registryEntry && (registryEntry.d1ProofSlotId || registryEntry.source === 'd1CustomProofSlot' || registryEntry.proofZone));
      const gameFootprint = crNormalizeD1ProofGameFootprint(registryEntry);
      const component = mgrid && mgrid[y] && mgrid[y][x] ? mgrid[y][x] : null;
      const componentId = component && typeof component.componentId !== 'undefined' ? component.componentId : null;
      const componentInfo = componentId !== null && mcomps ? mcomps[componentId] || null : null;
      let illegalReason = null;

      if(buildingGridCell && !registryEntry){
        illegalReason = 'BUILDING_GRID_CELL_WITHOUT_REGISTRY';
      } else if(registryEntry && !ownerResolved){
        illegalReason = 'BUILDING_GRID_CELL_WITHOUT_D1_PROOF_OWNER';
      } else if(ownerResolved && !crD1ProofZoneAllowedRenderMode(renderMode)){
        illegalReason = 'PROOF_SLOT_RENDER_MODE_NOT_ALLOWED';
      } else if(ownerResolved && !gameFootprint){
        illegalReason = 'PROOF_SLOT_MISSING_GAME_FOOTPRINT';
      } else if(ownerResolved && (gameFootprint.w > 3 || gameFootprint.h > 3)){
        illegalReason = 'FOOTPRINT_TOO_LARGE_FOR_PROOF_RULE';
      } else if(component){
        if(componentInfo && componentInfo.hasRegistryCell){
          illegalReason = 'BUILDING_MATERIAL_CELL_IN_PROOF_ZONE';
        } else {
          illegalReason = 'BUILDING_MATERIAL_COMPONENT_TOUCHES_PROOF_ZONE';
        }
      } else if(isWall && !ownerResolved){
        illegalReason = (x === zone.x0 || x === zone.x1 || y === zone.y0 || y === zone.y1) ? 'PROOF_ZONE_BOUNDARY_TOO_LARGE' : 'PROCEDURAL_RAW_WALL_IN_PROOF_ZONE';
      } else if(isWall && ownerResolved && String(renderMode).indexOf('facade') >= 0){
        illegalReason = 'FACADE_SKIN_CELL_IN_PROOF_ZONE';
      }

      const cell = {
        x,
        y,
        rawCell,
        isWall,
        buildingGridCell: buildingGridCell ? { bid: buildingGridCell.bid, lx: buildingGridCell.lx, ly: buildingGridCell.ly, proofZone: !!buildingGridCell.proofZone } : null,
        bid,
        registryEntry: crSummarizeD1ProofRegistryEntry(registryEntry),
        d1ProofSlotId,
        source,
        assetId,
        renderMode,
        approvalStatus,
        ownerResolved,
        illegalReason,
      };
      cells.push(cell);
      if(illegalReason){
        counts.illegal++;
        illegalCells.push(cell);
      }
    }
  }
  return { zone: { x0: zone.x0, y0: zone.y0, x1: zone.x1, y1: zone.y1, mode: zone.mode || '' }, cells, illegalCells, counts, labels: Array.from(CR_D1_PROOF_ILLEGAL_REASON_LABELS) };
}

function crDrawIllegalD1ProofWall(ctx, col, drawStart, sliceH, reason, mapX, mapY, owner){
  if(sliceH < 1) return;
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(col, drawStart, 1, sliceH);
  ctx.fillStyle = '#140014';
  ctx.fillRect(col, drawStart + Math.max(0, (sliceH / 2) | 0) - 1, 1, 2);
  if(typeof game !== 'undefined' && game){
    if(!game.d1ProofIllegalHits) game.d1ProofIllegalHits = [];
    const reg = owner || (typeof crD1ProofZoneCellOwner === 'function' ? crD1ProofZoneCellOwner(mapX, mapY) : null);
    const playerState = typeof player !== 'undefined' && player ? player : null;
    game.d1ProofIllegalHits.push({
      mapX,
      mapY,
      rawCell: (game.map && game.map[mapY]) ? game.map[mapY][mapX] : null,
      reason: reason || '',
      owner: reg ? crSummarizeD1ProofRegistryEntry(reg) : null,
      bid: reg ? reg.bid || null : null,
      assetId: reg ? reg.assetId || null : null,
      renderMode: reg ? reg.renderMode || null : null,
      playerX: playerState ? playerState.x : null,
      playerY: playerState ? playerState.y : null,
      playerAngle: playerState ? playerState.angle : null,
    });
  }
  if(reason && typeof console !== 'undefined' && console.warn) console.warn('[D1 proof zone] ' + reason);
}

function crDrawD1ProofPrefabFaceColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX, owner){
  const reg = owner || crD1ProofZoneCellOwner(mapX, mapY);
  if(!reg) return false;
  const mode = String(reg.renderMode || reg.assetLoadedState || reg.renderSource || '');
  if(mode === 'reservedPad') return false;
  if(mode === 'exactImportedBitmap' || mode === 'pendingArtReviewAsset' || mode === 'prop1x1'){
    if(typeof crDrawPrefabFaceColumn === 'function'){
      const drew = crDrawPrefabFaceColumn(ctx, col, drawStart, sliceH, mapX, mapY, side, stepX, stepY, wallX);
      if(drew) return true;
    }
    crDrawIllegalD1ProofWall(ctx, col, drawStart, sliceH, 'PROOF SLOT RENDER FAILED', mapX, mapY, owner);
    return true;
  }
  crDrawIllegalD1ProofWall(ctx, col, drawStart, sliceH, 'INVALID D1 PROOF MODE', mapX, mapY, reg);
  return true;
}

function crD1ProofZoneCellIsProtected(x, y){
  const info = crGetD1CustomProofZoneCellInfo(x, y);
  return !!(info && info.protected);
}

function crPlaceD1ProofSlotBuilding(map, shade, slot){
  if(!slot || !slot.occupied) return false;
  const footprint = slot.gameFootprint || slot.footprintCells || { w: 2, h: 2 };
  const w = (footprint.w | 0) || (footprint.wCells | 0) || 1;
  const h = (footprint.h | 0) || (footprint.hCells | 0) || 1;
  const x0 = slot.x0 | 0;
  const y0 = slot.y0 | 0;
  const GW = map[0].length;
  const GH = map.length;
  const bid = game._nextBuildingId++;
  const assetId = slot.assetId || 'custom_next_001';
  const renderMode = slot.renderMode || (assetId === 'strip_mall_001' ? 'exactImportedBitmap' : 'pendingArtReviewAsset');
  const assetFootprint = slot.assetFootprintCells || slot.footprintCells || { wCells: w, hCells: h };
  const reviewPanelOnly = slot.slotId === 'slot_02' && assetId === 'custom_next_001';
  const cellMap = game.d1CustomProofZoneCellMap || (game.d1CustomProofZoneCellMap = {});
  game.buildingRegistry[bid] = {
    bid: bid,
    slotId: slot.slotId || '',
    assetId: assetId,
    kind: slot.class || slot.footprintClass || 'proof_slot',
    class: slot.class || slot.footprintClass || 'proof_slot',
    footprint: { w: w, h: h },
    gameFootprint: { w: w, h: h },
    assetFootprintCells: assetFootprint,
    x0: x0,
    y0: y0,
    w: w,
    h: h,
    faces: { north: true, south: true, east: true, west: true },
    renderMode: renderMode,
    approvalStatus: slot.approvalStatus || 'pending_art_review',
    assetLoadedState: slot.assetLoadedState || (assetId === 'strip_mall_001' ? 'exactImportedBitmap' : 'pendingArtReviewAsset'),
    assetLoaded: slot.assetLoaded || (assetId === 'strip_mall_001' ? 'exactImportedBitmap' : 'pendingArtReviewAsset'),
    renderSource: slot.renderSource || (assetId === 'strip_mall_001' ? 'exactImportedBitmap' : 'pendingArtReviewAsset'),
    materialKey: slot.materialKey || 'stucco',
    proofZone: true,
    d1ProofSlotId: slot.slotId || '',
    source: 'd1CustomProofSlot',
    visualOnly: reviewPanelOnly,
  };
  if(reviewPanelOnly){
    if(!game.props) game.props = [];
    game.props.push({ x: x0 + 0.95, y: y0 + 2.7, kind: 'signboard', label: 'SLOT 02\\nCUSTOM_NEXT_001\\nPENDING REVIEW\\n2x2 PAD', wob: 0.06 });
    return true;
  }
  for(let dy = 0; dy < h; dy++){
    for(let dx = 0; dx < w; dx++){
      const x = x0 + dx, y = y0 + dy;
      if(x < 1 || y < 1 || x >= GW - 1 || y >= GH - 1) return false;
      if(map[y][x] !== 0) return false;
    }
  }
  for(let dy = 0; dy < h; dy++){
    for(let dx = 0; dx < w; dx++){
      const x = x0 + dx, y = y0 + dy;
      map[y][x] = WALL.BUILDING;
      shade[y][x] = 0.5;
      game.buildingGrid[y][x] = { bid: bid, lx: dx, ly: dy, proofZone: true };
      cellMap[crD1ProofCellKey(x, y)] = {
        protected: true,
        slotId: slot.slotId || '',
        assetId: assetId,
        renderMode: renderMode,
        approvalStatus: slot.approvalStatus || 'pending_art_review',
        gameFootprint: { w: w, h: h },
        sourceFootprint: assetFootprint,
      };
    }
  }
  if(slot.slotId === 'slot_01'){
    game.__stripMallProofPlacement = Object.assign({}, game.__stripMallProofPlacement || {}, {
      bid: bid,
      assetId: assetId,
      slotId: 'slot_01',
      x0: x0,
      y0: y0,
      w: assetFootprint.wCells || assetFootprint.w || 6,
      h: assetFootprint.hCells || assetFootprint.h || 3,
      gameFootprint: { w: w, h: h },
      district: 1,
    });
  }
  return true;
}

function crPurgeD1ProofZoneProceduralBuildings(map, shade){
  const zone = game && game.d1CustomProofZone;
  if(!zone || !game.buildingGrid || !game.buildingRegistry) return;
  const touchBids = new Set();
  for(let y = zone.y0; y <= zone.y1; y++){
    for(let x = zone.x0; x <= zone.x1; x++){
      const cell = game.buildingGrid[y] && game.buildingGrid[y][x];
      if(!cell || typeof cell.bid === 'undefined') continue;
      if(crD1ProofZoneCellIsProtected(x, y)) continue;
      touchBids.add(cell.bid);
    }
  }
  for(const bid of touchBids){
    const reg = game.buildingRegistry[bid];
    if(!reg) continue;
    const x0 = reg.x0 | 0, y0 = reg.y0 | 0;
    const w = reg.w | 0, h = reg.h | 0;
    for(let dy = 0; dy < Math.max(1, h); dy++){
      for(let dx = 0; dx < Math.max(1, w); dx++){
        const x = x0 + dx, y = y0 + dy;
        if(y < 0 || x < 0 || y >= map.length || x >= map[0].length) continue;
        if(game.buildingGrid[y] && game.buildingGrid[y][x] && game.buildingGrid[y][x].bid === bid) game.buildingGrid[y][x] = null;
        if(game.buildingMaterialGrid && game.buildingMaterialGrid[y] && game.buildingMaterialGrid[y][x]) game.buildingMaterialGrid[y][x] = null;
        map[y][x] = 0;
        shade[y][x] = 0;
      }
    }
    delete game.buildingRegistry[bid];
  }
  for(let y = zone.y0; y <= zone.y1; y++){
    for(let x = zone.x0; x <= zone.x1; x++){
      if(crD1ProofZoneCellIsProtected(x, y)) continue;
      if(map[y] && map[y][x] === WALL.BUILDING){
        map[y][x] = 0;
        shade[y][x] = 0;
      }
      if(game.buildingGrid && game.buildingGrid[y]) game.buildingGrid[y][x] = null;
      if(game.buildingMaterialGrid && game.buildingMaterialGrid[y]) game.buildingMaterialGrid[y][x] = null;
    }
  }
}

function crPlaceD1ProofSlotBuildings(map, shade, registry){
  if(!registry) return;
  const slots = [registry.slot_01, registry.slot_02];
  for(const slot of slots) crPlaceD1ProofSlotBuilding(map, shade, slot);
}

// Atomic prefab placement: one object, reserve all footprint cells at once.
// Reject if any footprint cell is blocked. Footprint cells point back to bid
// with (lx, ly) only — no per-cell facade role identity.
function crPlacePrefabBuilding(map, shade, x0, y0, assetId){
  const asset = crGetPrefabAsset(assetId);
  if(!asset) return false;
  const w = asset.footprint.w, h = asset.footprint.h;
  const GW = map[0].length, GH = map.length;
  for(let dy = 0; dy < h; dy++){
    for(let dx = 0; dx < w; dx++){
      const x = x0 + dx, y = y0 + dy;
      if(x < 1 || y < 1 || x >= GW - 1 || y >= GH - 1) return false;
      if(map[y][x] !== 0) return false; // blocked: reject whole placement
    }
  }
  const bid = game._nextBuildingId++;
  game.buildingRegistry[bid] = {
    bid: bid,
    assetId: assetId,
    kind: asset.kind,
    renderMode: asset.renderMode,
    x0: x0,
    y0: y0,
    w: w,
    h: h,
    footprint: { w: w, h: h },
    faces: asset.faces,
    assetLoadedState: asset.assetLoadedState || asset.assetLoaded || 'generatedPlaceholder',
    assetLoaded: asset.assetLoaded || 'generatedPlaceholder',
    renderSource: asset.renderSource || 'generatedPlaceholder',
    approvalStatus: asset.approvalStatus || (assetId === 'strip_mall_001' ? 'approved_exact_import_proof' : 'generated_unapproved')
  };
  for(let dy = 0; dy < h; dy++){
    for(let dx = 0; dx < w; dx++){
      const x = x0 + dx, y = y0 + dy;
      map[y][x] = WALL.BUILDING;
      shade[y][x] = 0.5;
      game.buildingGrid[y][x] = { bid: bid, lx: dx, ly: dy };
    }
  }
  return true;
}


function crInitD1CustomBuildingRegistry(meta, proofPlacement){
  if(!meta || (meta.district|0) !== 1 || !proofPlacement) return null;
  const asset = STRIP_MALL_001 || crGetPrefabAsset('strip_mall_001') || {};
  const assetFootprintCells = {
    wCells: (asset.footprint && (asset.footprint.wCells || asset.footprint.w)) || 6,
    hCells: (asset.footprint && (asset.footprint.hCells || asset.footprint.h)) || 3
  };
  const width = asset.width || 256;
  const height = asset.height || 160;
  const anchor = asset.anchor || { x: 128, y: 120 };
  const slotSpacing = 5;
  const slot01GameFootprint = { w: 3, h: 3 };
  const slot02GameFootprint = { w: 2, h: 2 };
  const slot03GameFootprint = { w: 1, h: 1 };
  const slot_01 = {
    slotId: 'slot_01',
    assetId: 'strip_mall_001',
    label: 'Strip Mall 001',
    class: 'building_3x3',
    footprintCells: slot01GameFootprint,
    gameFootprint: slot01GameFootprint,
    assetFootprintCells: assetFootprintCells,
    sourceFormat: 'bitmap',
    sha256: asset.sha256 || '',
    byteLength: asset.byteLength || 0,
    width: width,
    height: height,
    anchor: anchor,
    renderMode: 'exactImportedBitmap',
    renderSource: 'exactImportedBitmap',
    assetLoadedState: 'exactImportedBitmap',
    assetLoaded: 'exactImportedBitmap',
    approvalStatus: 'approved_exact_import_proof',
    occupied: true,
    x0: proofPlacement.x0,
    y0: proofPlacement.y0
  };
  const slot_02 = {
    slotId: 'slot_02',
    assetId: 'custom_next_001',
    label: 'Custom Next 001',
    class: 'building_2x2',
    footprintCells: slot02GameFootprint,
    gameFootprint: slot02GameFootprint,
    assetFootprintCells: { wCells: 6, hCells: 3 },
    sourceFormat: 'svg',
    sha256: CUSTOM_NEXT_001.sha256 || '',
    byteLength: CUSTOM_NEXT_001.byteLength || 0,
    width: CUSTOM_NEXT_001.width || 256,
    height: CUSTOM_NEXT_001.height || 160,
    anchor: CUSTOM_NEXT_001.anchor || { x: 128, y: 118 },
    renderMode: 'pendingArtReviewAsset',
    renderSource: 'pendingArtReviewAsset',
    assetLoadedState: 'pendingArtReviewAsset',
    assetLoaded: 'pendingArtReviewAsset',
    approvalStatus: 'pending_art_review',
    occupied: true,
    x0: proofPlacement.x0 + slotSpacing,
    y0: proofPlacement.y0
  };
  const slot_03 = {
    slotId: 'slot_03',
    assetId: 'custom_next_002',
    label: 'Reserved Slot 03',
    class: 'prop_1x1',
    footprintCells: slot03GameFootprint,
    gameFootprint: slot03GameFootprint,
    assetFootprintCells: { wCells: 1, hCells: 1 },
    sourceFormat: 'reserved',
    sha256: '',
    byteLength: 0,
    width: 0,
    height: 0,
    anchor: { x: 0, y: 0 },
    renderMode: 'reservedPad',
    renderSource: 'reservedPad',
    assetLoadedState: 'reservedPad',
    assetLoaded: 'reservedPad',
    approvalStatus: 'reserved_empty',
    occupied: false,
    x0: proofPlacement.x0 + slotSpacing * 2,
    y0: proofPlacement.y0
  };
  const zone = {
    x0: Math.max(1, proofPlacement.x0 - 1),
    y0: Math.max(1, proofPlacement.y0 - 1),
    x1: Math.min((meta.GW || 0) - 2, slot_03.x0 + slot03GameFootprint.w + 1),
    y1: Math.min((meta.GH || 0) - 2, proofPlacement.y0 + 3),
    mode: 'prefab_only'
  };
  const registry = {
    district: 1,
    proofDistrict: 'D1',
    viewerMode: 'normal_gameplay',
    proofZone: zone,
    slot_01: slot_01,
    slot_02: slot_02,
    slot_03: slot_03
  };
  game.d1CustomBuildingRegistry = registry;
  game.customBuildingRegistry = registry;
  game.d1CustomBuildingSlots = [slot_01, slot_02, slot_03];
  game.d1CustomProofZone = zone;
  game.d1CustomProofZoneCellMap = {};
  game.d1ProofIllegalHits = [];
  game.d1ProofZoneCellAudit = null;
  game.d1CustomBuildingViewer = {
    active: true,
    district: 1,
    mode: 'normal_gameplay',
    proofDistrict: 'D1',
    slotIds: ['slot_01', 'slot_02', 'slot_03']
  };
  return registry;
}

function crPlaceD1CustomBuildingProofProps(registry){
  if(!registry || !game.props) return;
  const slot01 = registry.slot_01;
  const slot02 = registry.slot_02;
  const slot03 = registry.slot_03;
  game.props.push({ x: slot01.x0 + 1.4, y: slot01.y0 + 3.7, kind: 'signboard', label: 'SLOT 01\\nSTRIP_MALL_001\\nEXACT IMPORT\\n3x3 PREFAB PAD', wob: 0 });
  game.props.push({ x: slot02.x0 + 0.9, y: slot02.y0 + 2.8, kind: 'signboard', label: 'SLOT 02\\nCUSTOM_NEXT_001\\nPENDING REVIEW\\n2x2 PAD', wob: 0.10 });
  game.props.push({ x: slot03.x0 + 0.3, y: slot03.y0 + 1.8, kind: 'signboard', label: 'SLOT 03\\nRESERVED\\nEMPTY PAD\\n1x1 PROP', wob: 0.18 });
}

// Prefab generator: place 2x2 and 3x3 whole buildings along the street.
function crAssignPrefabBuildings(map, shade, meta, d, r){
  const { roadY0, roadY1, GW, GH } = meta;
  if(!game.buildingGrid || game.buildingGrid.length !== GH) crClearBuildingModules(GW, GH);
  game.d1CustomBuildingRegistry = null;
  game.customBuildingRegistry = null;
  game.d1CustomBuildingSlots = [];
  game.d1CustomBuildingViewer = null;
  if(d !== 1){
    game.d1CustomProofZone = null;
    game.d1CustomProofZoneCellMap = null;
    game.__stripMallProofPlacement = null;
  }
  let proofPlacement = null;
  if(d === 1){
    const proofX = 5;
    const proofY = roadY1 + 1;
    if(proofY >= 2 && proofY + 2 < GH - 1){
      proofPlacement = { bid: null, assetId:'strip_mall_001', slotId:'slot_01', x0:proofX, y0:proofY, w:6, h:3, district:d };
      game.__stripMallProofPlacement = proofPlacement;
      crInitD1CustomBuildingRegistry(meta, proofPlacement);
    } else {
      game.__stripMallProofPlacement = null;
    }
  }
  const segW = 9;
  const segCount = Math.ceil((GW - 4) / segW);
  const b2 = (CR_PREFAB_CATALOG.buildings_2x2 || []).filter(aid => aid !== 'strip_mall_001');
  const b3 = CR_PREFAB_CATALOG.buildings_3x3;
  let i2 = 0, i3 = 0;
  game.__prefabPlaceLog = { tries2:0, ok2:0, tries3:0, ok3:0, roadY0, roadY1 };
  for(let seg = 0; seg < segCount; seg++){
    const bx0 = 2 + seg * segW;
    if(bx0 + 5 >= GW - 3) continue;
    // south row: 2x2 prefab (immediately south of the road spine)
    const ySouth = roadY1 + 1;
    if(ySouth >= 2 && ySouth + 2 < GH - 1){
      const aid = b2[i2 % b2.length]; i2++;
      game.__prefabPlaceLog.tries2++;
      if(crPlacePrefabBuilding(map, shade, bx0 + 1, ySouth, aid)) game.__prefabPlaceLog.ok2++;
    }
    // north row: 3x3 prefab
    const yNorth = Math.max(2, roadY0 - 4);
    if(yNorth >= 2){
      const aid = b3[i3 % b3.length]; i3++;
      game.__prefabPlaceLog.tries3++;
      if(crPlacePrefabBuilding(map, shade, bx0 + 1, yNorth, aid)) game.__prefabPlaceLog.ok3++;
    }
  }

  if(d === 1 && game.d1CustomBuildingRegistry){
    crPurgeD1ProofZoneProceduralBuildings(map, shade);
    crPlaceD1ProofSlotBuildings(map, shade, game.d1CustomBuildingRegistry);
    crPlaceD1CustomBuildingProofProps(game.d1CustomBuildingRegistry);
    crBuildBuildingMaterialComponents(map);
    crSyncRegistryMaterialsToComponents();
  }
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
  const materialKey = crPickBuildingTextureMaterial(moduleId, x0, y0, bid);
  game.buildingRegistry[bid] = { moduleId, x0, y0, front: frontFace, mod, materialKey };
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
  const materialKey = crPickBuildingTextureMaterial('restroom_pavilion', lm.x0, lm.y0, bid);
  game.buildingRegistry[bid] = { moduleId: 'restroom_pavilion', x0: lm.x0, y0: lm.y0, front, mod, materialKey };
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
  if(typeof CR_USE_PREFAB_BUILDINGS !== 'undefined' && CR_USE_PREFAB_BUILDINGS === 1){
    crAssignPrefabBuildings(map, shade, streetMeta, d, r);
  } else {
    crAssignBuildingModules(map, shade, streetMeta, d, r);
  }
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
  // SNC_PREFAB_ASSET_GRID_1: in prefab mode, never write per-cell module
  // roles (no mid facade panels). Keep the landmark metadata only.
  if(typeof CR_USE_PREFAB_BUILDINGS === 'undefined' || CR_USE_PREFAB_BUILDINGS !== 1){
    crRegisterD1PavilionModule(landmark, map);
  }
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
  game.seed = seed;
  game.district = district;
  game.modifier = modifier || '';

  let canMult = 1.0, peoMult = 1.0;
  game.scoreMult = 1;
  if(modifier==='shortage'){ canMult = 0.55; peoMult = 1.1; game.scoreMult = 1.5; }

  if((district|0) === 1){
    if(!sncInstallAuthoredLevel(SNC_AUTHORED_LEVEL_ID, { seed, modifier })){
      throw new Error('Failed to install deterministic authored District 1');
    }
    return;
  }

  const GW = STREET_FOOTPRINT_W, GH = STREET_FOOTPRINT_H;
  const map = [], shade = [];
  for(let y=0;y<GH;y++){ map.push(new Array(GW).fill(1)); shade.push(new Array(GW).fill(0)); }

  const streetMeta = applyStreetBlockGrammar(map, shade, GW, GH, district, modifier, r);
  if((district|0)===1) crApplyD1ParkLandmark(map, shade, streetMeta, r);
  else game.d1ParkLandmark = null;
  game.streetLayoutMeta = streetMeta;

  game.map = map; game.MAP_W = GW; game.MAP_H = GH; game.wallShade = shade;
  crBuildBuildingMaterialComponents(map);
  crSyncRegistryMaterialsToComponents();
  if(typeof crAssignAllFacadeSkinProfiles === 'function') crAssignAllFacadeSkinProfiles();

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

