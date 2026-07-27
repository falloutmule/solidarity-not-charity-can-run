// ---------------------------------------------------------------------------
// SECTION 6A — VARIABLE-HEIGHT CORE (query-gated proof; legacy-safe adapter)
// ---------------------------------------------------------------------------
const CR_HEIGHTFIELD_QUERY = new URLSearchParams(location.search).get('heightfield') === '1';
const CR_HEIGHTFIELD_CAMERA = Object.freeze({ eyeZ: 0.68 });
const CR_HEIGHT_LEVELS = new Float32Array([0.0, 0.5, 1.0]);
const CR_VERTICAL_PROFILE_IDS = Object.freeze({ EMPTY: 0, HALF_DEBUG: 1, FULL_LEGACY: 2, AUTHORED_CONCRETE: 3 });
const CR_HEIGHTFIELD_MATERIAL_IDS = Object.freeze({
  GROUND: 0, DEBUG_NORTH: 1, DEBUG_EAST: 2, DEBUG_SOUTH: 3, DEBUG_WEST: 4, DEBUG_TOP: 5, LEGACY_WALL: 6,
  CONCRETE_NORTH: 7, CONCRETE_EAST: 8, CONCRETE_SOUTH: 9, CONCRETE_WEST: 10, CONCRETE_TOP: 11
});
const CR_HEIGHTFIELD_FACE_INDEX = Object.freeze({ north: 0, east: 1, south: 2, west: 3 });
const CR_HEIGHTFIELD_MATERIALS = Object.freeze([
  Object.freeze({ id: 0, stableId: 'ground', mode: 'none', opaque: true }),
  Object.freeze({ id: 1, stableId: 'debug_north', mode: 'proceduralSide', opaque: true, color: '#d9534f', accent: '#822d2a' }),
  Object.freeze({ id: 2, stableId: 'debug_east', mode: 'proceduralSide', opaque: true, color: '#4cae4c', accent: '#286b2c' }),
  Object.freeze({ id: 3, stableId: 'debug_south', mode: 'proceduralSide', opaque: true, color: '#e59a2f', accent: '#9f5c14' }),
  Object.freeze({ id: 4, stableId: 'debug_west', mode: 'proceduralSide', opaque: true, color: '#8a62d5', accent: '#51357f' }),
  Object.freeze({ id: 5, stableId: 'debug_top', mode: 'proceduralTop', opaque: true, colors: Object.freeze([[77, 191, 235], [31, 112, 179]]) }),
  Object.freeze({ id: 6, stableId: 'legacy_wall', mode: 'legacyWall', opaque: true }),
  Object.freeze({ id: 7, stableId: 'low_block_concrete_001_north', mode: 'assetImage', opaque: true, assetId: 'low_block_concrete_001', face: 'north' }),
  Object.freeze({ id: 8, stableId: 'low_block_concrete_001_east', mode: 'assetImage', opaque: true, assetId: 'low_block_concrete_001', face: 'east' }),
  Object.freeze({ id: 9, stableId: 'low_block_concrete_001_south', mode: 'assetImage', opaque: true, assetId: 'low_block_concrete_001', face: 'south' }),
  Object.freeze({ id: 10, stableId: 'low_block_concrete_001_west', mode: 'assetImage', opaque: true, assetId: 'low_block_concrete_001', face: 'west' }),
  Object.freeze({ id: 11, stableId: 'low_block_concrete_001_top', mode: 'assetImage', opaque: true, assetId: 'low_block_concrete_001', face: 'top' }),
]);
const CR_VERTICAL_PROFILES = Object.freeze([
  Object.freeze({ id: 0, stableId: 'empty', topLevel: 0, collision: 'none', sideMaterials: Object.freeze([0, 0, 0, 0]), topMaterial: null }),
  Object.freeze({ id: 1, stableId: 'proof_debug_half', topLevel: 1, collision: 'solid', sideMaterials: Object.freeze([1, 2, 3, 4]), topMaterial: 5 }),
  Object.freeze({ id: 2, stableId: 'full_legacy', topLevel: 2, collision: 'solid', sideMaterials: Object.freeze([6, 6, 6, 6]), topMaterial: null }),
  Object.freeze({ id: 3, stableId: 'authored_concrete_half', assetId: 'low_block_concrete_001', topLevel: 1, collision: 'solid', sideMaterials: Object.freeze([7, 8, 9, 10]), topMaterial: 11 }),
]);

let worldDepthPixels = new Float32Array(0);
let crWorldDepthWidth = 0;
let crWorldDepthHeight = 0;
let crWorldDepthAllocations = 0;
let crHeightfieldPlaneCanvas = null;
let crHeightfieldPlaneCtx = null;
let crHeightfieldPlaneImage = null;
const crHeightfieldSpriteAlphaMasks = new WeakMap();
const crHeightfieldMaterialPixelCaches = new WeakMap();
const crHeightfieldStats = {
  enabled: false, cameraZ: CR_HEIGHTFIELD_CAMERA.eyeZ, profileCells: 0, verticalSegments: 0,
  topPixels: 0, worldDepthWrites: 0, spriteVisiblePixels: 0, spriteOccludedPixels: 0,
  canVisiblePixels: 0, canOccludedPixels: 0, npcVisiblePixels: 0, npcOccludedPixels: 0,
  worldDepthBytes: 0, allocations: 0
};

function crHeightfieldMaterialAt(id){
  return Number.isInteger(id) ? (CR_HEIGHTFIELD_MATERIALS[id] || null) : null;
}
function crHeightfieldSideMaterialId(profile, face){
  const index = CR_HEIGHTFIELD_FACE_INDEX[face];
  if(!profile || !Number.isInteger(index) || !Array.isArray(profile.sideMaterials)) return null;
  const materialId = profile.sideMaterials[index];
  return crHeightfieldMaterialAt(materialId) ? materialId : null;
}
function crHeightfieldTopMaterialId(profile){
  if(!profile || profile.topMaterial === null) return null;
  return crHeightfieldMaterialAt(profile.topMaterial) ? profile.topMaterial : null;
}
function crHeightfieldProfileRegistryReady(){
  return CR_VERTICAL_PROFILES.every((profile, id) => {
    if(!profile || profile.id !== id || !profile.stableId || !Number.isInteger(profile.topLevel) ||
      profile.topLevel < 0 || profile.topLevel >= CR_HEIGHT_LEVELS.length ||
      (profile.collision !== 'none' && profile.collision !== 'solid') ||
      !Array.isArray(profile.sideMaterials) || profile.sideMaterials.length !== 4) return false;
    if(!profile.sideMaterials.every(materialId => !!crHeightfieldMaterialAt(materialId))) return false;
    return profile.topMaterial === null || !!crHeightfieldMaterialAt(profile.topMaterial);
  });
}
function crHeightfieldMaterialRegistryReady(){
  return CR_HEIGHTFIELD_MATERIALS.every((material, id) => !!material && material.id === id &&
    typeof material.stableId === 'string' && material.stableId.length > 0 && material.opaque === true &&
    typeof material.mode === 'string' && material.mode.length > 0);
}
function crHeightfieldHasValidProfileGrid(){
  const grid = game && game.verticalProfileGrid;
  if(!grid || !Number.isInteger(game.verticalProfileWidth) || !Number.isInteger(game.verticalProfileHeight) ||
    game.verticalProfileWidth !== game.MAP_W || game.verticalProfileHeight !== game.MAP_H ||
    grid.length !== game.MAP_W * game.MAP_H) return false;
  for(let i = 0; i < grid.length; i++) if(!CR_VERTICAL_PROFILES[grid[i]]) return false;
  return true;
}
function crHeightfieldIsActive(){
  const inPlay = typeof STATE !== 'undefined' && state === STATE.PLAY;
  return !!(game && inPlay && crHeightfieldProfileRegistryReady() && crHeightfieldMaterialRegistryReady() && crHeightfieldHasValidProfileGrid());
}
function crHeightfieldClearState(){
  game.verticalProfileGrid = null;
  game.verticalProfileWidth = 0;
  game.verticalProfileHeight = 0;
  game.verticalProfileRotationGrid = null;
  game.heightfieldProof = null;
}
function crHeightfieldProfileIdAt(tx, ty){
  if(tx < 0 || ty < 0 || tx >= game.MAP_W || ty >= game.MAP_H){
    return CR_VERTICAL_PROFILE_IDS.FULL_LEGACY;
  }
  const explicit = game.verticalProfileGrid && tx < game.verticalProfileWidth && ty < game.verticalProfileHeight
    ? game.verticalProfileGrid[ty * game.verticalProfileWidth + tx] : CR_VERTICAL_PROFILE_IDS.EMPTY;
  if(explicit !== CR_VERTICAL_PROFILE_IDS.EMPTY) return explicit;
  const raw = game.map && game.map[ty] ? game.map[ty][tx] : 0;
  return raw === 0 ? CR_VERTICAL_PROFILE_IDS.EMPTY : CR_VERTICAL_PROFILE_IDS.FULL_LEGACY;
}
function crHeightfieldProfileAt(tx, ty){
  const id = crHeightfieldProfileIdAt(tx, ty);
  return CR_VERTICAL_PROFILES[id] || CR_VERTICAL_PROFILES[CR_VERTICAL_PROFILE_IDS.FULL_LEGACY];
}
function crHeightfieldProfileForSolidAsset(asset){
  if(!asset || asset.renderMode !== 'solidHeightfield') return null;
  return CR_VERTICAL_PROFILES.find((profile) => profile.assetId === asset.id && profile.topLevel === asset.solidTopLevel && profile.collision === asset.collision) || null;
}
function crHeightfieldRotationAt(tx, ty){
  const grid = game && game.verticalProfileRotationGrid;
  if(!grid || tx < 0 || ty < 0 || tx >= game.verticalProfileWidth || ty >= game.verticalProfileHeight) return 0;
  return ((Number(grid[ty * game.verticalProfileWidth + tx]) || 0) % 4 + 4) % 4;
}
function crHeightfieldTopZ(profile){ return CR_HEIGHT_LEVELS[profile.topLevel] || 0; }
function crProjectWorldZToScreenY(worldZ, depth, cameraZ){
  const d = Math.max(0.05, Number(depth) || 0.05);
  const z = Number(worldZ) || 0;
  const eye = Number.isFinite(cameraZ) ? cameraZ : CR_HEIGHTFIELD_CAMERA.eyeZ;
  return RH * 0.5 - (z - eye) * RH / d;
}
function crHeightfieldEnsureWorldDepth(){
  const needed = Math.max(1, RW * RH);
  if(worldDepthPixels.length !== needed){
    worldDepthPixels = new Float32Array(needed);
    crWorldDepthWidth = RW;
    crWorldDepthHeight = RH;
    crWorldDepthAllocations++;
  }
  worldDepthPixels.fill(Infinity);
  crHeightfieldStats.worldDepthBytes = worldDepthPixels.byteLength;
  crHeightfieldStats.allocations = crWorldDepthAllocations;
  return worldDepthPixels;
}
function crHeightfieldWriteDepthColumn(col, top, bottom, depth){
  const y0 = Math.max(0, Math.min(RH, Math.floor(top)));
  const y1 = Math.max(y0, Math.min(RH, Math.ceil(bottom)));
  for(let y = y0; y < y1; y++){
    const index = y * RW + col;
    if(depth < worldDepthPixels[index]){
      worldDepthPixels[index] = depth;
      crHeightfieldStats.worldDepthWrites++;
    }
  }
}
function crHeightfieldFaceForHit(side, stepX, stepY, rotation){
  const worldFace = side === 0 ? (stepX > 0 ? 3 : 1) : (stepY > 0 ? 0 : 2);
  const quarterTurns = ((Number(rotation) || 0) % 4 + 4) % 4;
  return ['north', 'east', 'south', 'west'][(worldFace - quarterTurns + 4) % 4];
}
function crHeightfieldEnsurePlaneBuffer(){
  if(crHeightfieldPlaneCanvas && crHeightfieldPlaneCanvas.width === RW && crHeightfieldPlaneCanvas.height === RH) return;
  crHeightfieldPlaneCanvas = document.createElement('canvas');
  crHeightfieldPlaneCanvas.width = RW;
  crHeightfieldPlaneCanvas.height = RH;
  crHeightfieldPlaneCtx = crHeightfieldPlaneCanvas.getContext('2d', { alpha: true });
  crHeightfieldPlaneImage = crHeightfieldPlaneCtx.createImageData(RW, RH);
}
function crHeightfieldSampleProceduralMaterialRgb(material, localX, localY, rotation){
  if(!material || material.mode !== 'proceduralTop' || !material.colors) return null;
  let u = localX, v = localY;
  const r = ((Number(rotation) || 0) % 4 + 4) % 4;
  if(r === 1){ const t = u; u = v; v = 1 - t; }
  else if(r === 2){ u = 1 - u; v = 1 - v; }
  else if(r === 3){ const t = u; u = 1 - v; v = t; }
  const light = ((Math.floor(u * 8) + Math.floor(v * 8)) & 1) === 0;
  return material.colors[light ? 0 : 1];
}
function crHeightfieldMaterialImage(material){
  if(!material || material.mode !== 'assetImage') return null;
  const registry = typeof SOLID_HEIGHT_ASSET_REGISTRY !== 'undefined' ? SOLID_HEIGHT_ASSET_REGISTRY : null;
  const asset = registry && registry[material.assetId];
  const loadState = asset && asset.materialLoadStates && asset.materialLoadStates[material.face];
  return loadState && loadState.status === 'loaded' ? loadState.image : null;
}
function crHeightfieldRotateUv(u, v, rotation){
  const r = ((Number(rotation) || 0) % 4 + 4) % 4;
  if(r === 1) return [v, 1 - u];
  if(r === 2) return [1 - u, 1 - v];
  if(r === 3) return [1 - v, u];
  return [u, v];
}
function crHeightfieldMaterialRgb(material, u, v, rotation){
  const procedural = crHeightfieldSampleProceduralMaterialRgb(material, u, v, rotation);
  if(procedural) return procedural;
  const image = crHeightfieldMaterialImage(material);
  if(!image) return null;
  let cache = crHeightfieldMaterialPixelCaches.get(image);
  if(!cache){
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    cache = { width: canvas.width, height: canvas.height, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
    crHeightfieldMaterialPixelCaches.set(image, cache);
  }
  const [rotatedU, rotatedV] = crHeightfieldRotateUv(u, v, rotation);
  const x = Math.max(0, Math.min(cache.width - 1, Math.floor(rotatedU * cache.width)));
  const y = Math.max(0, Math.min(cache.height - 1, Math.floor(rotatedV * cache.height)));
  const offset = (y * cache.width + x) * 4;
  return [cache.pixels[offset], cache.pixels[offset + 1], cache.pixels[offset + 2]];
}
function crHeightfieldSpriteOpaqueAt(tex, sourceX, sourceY){
  if(!tex) return false;
  let mask = crHeightfieldSpriteAlphaMasks.get(tex);
  if(!mask){
    let width = tex.width, height = tex.height, textureCtx;
    if(typeof tex.getContext === 'function'){
      textureCtx = tex.getContext('2d', { willReadFrequently: true });
    } else if(tex.naturalWidth > 0 && tex.naturalHeight > 0){
      width = tex.naturalWidth; height = tex.naturalHeight;
      const textureCanvas = document.createElement('canvas');
      textureCanvas.width = width; textureCanvas.height = height;
      textureCtx = textureCanvas.getContext('2d', { willReadFrequently: true });
      textureCtx.drawImage(tex, 0, 0);
    } else return false;
    const image = textureCtx.getImageData(0, 0, width, height);
    mask = { width, height, alpha: image.data };
    crHeightfieldSpriteAlphaMasks.set(tex, mask);
  }
  const x = Math.max(0, Math.min(mask.width - 1, sourceX | 0));
  const y = Math.max(0, Math.min(mask.height - 1, sourceY | 0));
  return mask.alpha[(y * mask.width + x) * 4 + 3] > 0;
}
function crHeightfieldResetStats(){
  crHeightfieldStats.enabled = crHeightfieldIsActive();
  crHeightfieldStats.cameraZ = CR_HEIGHTFIELD_CAMERA.eyeZ;
  crHeightfieldStats.profileCells = game.verticalProfileGrid ? game.verticalProfileGrid.reduce((count, id) => {
    const profile = CR_VERTICAL_PROFILES[id];
    return count + (profile && profile.topLevel > 0 && profile.topLevel < CR_HEIGHT_LEVELS.length - 1 ? 1 : 0);
  }, 0) : 0;
  crHeightfieldStats.verticalSegments = 0;
  crHeightfieldStats.topPixels = 0;
  crHeightfieldStats.worldDepthWrites = 0;
  crHeightfieldStats.spriteVisiblePixels = 0;
  crHeightfieldStats.spriteOccludedPixels = 0;
  crHeightfieldStats.canVisiblePixels = 0;
  crHeightfieldStats.canOccludedPixels = 0;
  crHeightfieldStats.npcVisiblePixels = 0;
  crHeightfieldStats.npcOccludedPixels = 0;
}
function crGetHeightfieldDiagnostics(){
  return Object.freeze({
    enabled: crHeightfieldStats.enabled, cameraZ: crHeightfieldStats.cameraZ,
    occlusionSubject: game.heightfieldProof ? game.heightfieldProof.occlusionSubject : null,
    profileCells: crHeightfieldStats.profileCells, verticalSegments: crHeightfieldStats.verticalSegments,
    topPixels: crHeightfieldStats.topPixels, worldDepthWrites: crHeightfieldStats.worldDepthWrites,
    spriteVisiblePixels: crHeightfieldStats.spriteVisiblePixels, spriteOccludedPixels: crHeightfieldStats.spriteOccludedPixels,
    canVisiblePixels: crHeightfieldStats.canVisiblePixels, canOccludedPixels: crHeightfieldStats.canOccludedPixels,
    npcVisiblePixels: crHeightfieldStats.npcVisiblePixels, npcOccludedPixels: crHeightfieldStats.npcOccludedPixels,
    worldDepthBytes: crHeightfieldStats.worldDepthBytes, worldDepthLength: worldDepthPixels.length,
    allocations: crHeightfieldStats.allocations, width: crWorldDepthWidth, height: crWorldDepthHeight
  });
}
function crBootHeightfieldProofIfRequested(){
  if(!CR_HEIGHTFIELD_QUERY || typeof startCustomLevel !== 'function') return false;
  startCustomLevel('heightfield_proof');
  return true;
}
