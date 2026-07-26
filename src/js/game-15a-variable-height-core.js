// ---------------------------------------------------------------------------
// SECTION 6A — VARIABLE-HEIGHT CORE (query-gated proof; legacy-safe adapter)
// ---------------------------------------------------------------------------
const CR_HEIGHTFIELD_QUERY = new URLSearchParams(location.search).get('heightfield') === '1';
const CR_HEIGHTFIELD_CAMERA = Object.freeze({ eyeZ: 0.68 });
const CR_HEIGHT_LEVELS = new Float32Array([0.0, 0.5, 1.0]);
const CR_VERTICAL_PROFILE_IDS = Object.freeze({ EMPTY: 0, HALF_DEBUG: 1, FULL_LEGACY: 2 });
const CR_VERTICAL_PROFILES = Object.freeze([
  Object.freeze({ id: 0, topLevel: 0, collision: 'none', sideMaterials: Object.freeze(['ground', 'ground', 'ground', 'ground']), topMaterial: 'ground' }),
  Object.freeze({ id: 1, topLevel: 1, collision: 'solid', sideMaterials: Object.freeze(['north', 'east', 'south', 'west']), topMaterial: 'top' }),
  Object.freeze({ id: 2, topLevel: 2, collision: 'solid', sideMaterials: Object.freeze(['legacy', 'legacy', 'legacy', 'legacy']), topMaterial: 'none' }),
]);
const CR_HEIGHTFIELD_FACE_COLORS = Object.freeze({
  north: '#d9534f', east: '#4cae4c', south: '#e59a2f', west: '#8a62d5', top: '#2f9ed7'
});
const CR_HEIGHTFIELD_FACE_TEXTURE_ACCENTS = Object.freeze({
  north: '#822d2a', east: '#286b2c', south: '#9f5c14', west: '#51357f', top: '#1f70b3'
});

let worldDepthPixels = new Float32Array(0);
let crWorldDepthWidth = 0;
let crWorldDepthHeight = 0;
let crWorldDepthAllocations = 0;
let crHeightfieldPlaneCanvas = null;
let crHeightfieldPlaneCtx = null;
let crHeightfieldPlaneImage = null;
const crHeightfieldStats = {
  enabled: false, cameraZ: CR_HEIGHTFIELD_CAMERA.eyeZ, profileCells: 0, verticalSegments: 0,
  topPixels: 0, worldDepthWrites: 0, spriteVisiblePixels: 0, spriteOccludedPixels: 0,
  worldDepthBytes: 0, allocations: 0
};

function crHeightfieldIsActive(){
  return !!(game && game.verticalProfileGrid && game.run && game.run.customLevel === 'heightfield_proof');
}
function crHeightfieldClearState(){
  game.verticalProfileGrid = null;
  game.verticalProfileWidth = 0;
  game.verticalProfileHeight = 0;
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
function crHeightfieldTopColor(localX, localY, rotation){
  let u = localX, v = localY;
  const r = ((Number(rotation) || 0) % 4 + 4) % 4;
  if(r === 1){ const t = u; u = v; v = 1 - t; }
  else if(r === 2){ u = 1 - u; v = 1 - v; }
  else if(r === 3){ const t = u; u = 1 - v; v = t; }
  const light = ((Math.floor(u * 8) + Math.floor(v * 8)) & 1) === 0;
  return light ? [77, 191, 235] : [31, 112, 179];
}
function crHeightfieldResetStats(){
  crHeightfieldStats.enabled = crHeightfieldIsActive();
  crHeightfieldStats.cameraZ = CR_HEIGHTFIELD_CAMERA.eyeZ;
  crHeightfieldStats.profileCells = game.verticalProfileGrid ? game.verticalProfileGrid.reduce((count, id) => count + (id === CR_VERTICAL_PROFILE_IDS.HALF_DEBUG ? 1 : 0), 0) : 0;
  crHeightfieldStats.verticalSegments = 0;
  crHeightfieldStats.topPixels = 0;
  crHeightfieldStats.worldDepthWrites = 0;
  crHeightfieldStats.spriteVisiblePixels = 0;
  crHeightfieldStats.spriteOccludedPixels = 0;
}
function crGetHeightfieldDiagnostics(){
  return Object.freeze({
    enabled: crHeightfieldStats.enabled, cameraZ: crHeightfieldStats.cameraZ,
    profileCells: crHeightfieldStats.profileCells, verticalSegments: crHeightfieldStats.verticalSegments,
    topPixels: crHeightfieldStats.topPixels, worldDepthWrites: crHeightfieldStats.worldDepthWrites,
    spriteVisiblePixels: crHeightfieldStats.spriteVisiblePixels, spriteOccludedPixels: crHeightfieldStats.spriteOccludedPixels,
    worldDepthBytes: crHeightfieldStats.worldDepthBytes, worldDepthLength: worldDepthPixels.length,
    allocations: crHeightfieldStats.allocations, width: crWorldDepthWidth, height: crWorldDepthHeight
  });
}
function crBootHeightfieldProofIfRequested(){
  if(!CR_HEIGHTFIELD_QUERY || typeof startCustomLevel !== 'function') return false;
  startCustomLevel('heightfield_proof');
  return true;
}
