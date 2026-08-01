// ---------------------------------------------------------------------------
// SECTION 7C — AUTHORED GROUND SURFACE
// Cached world-space grass, broad paths, and soft-alpha horizontal decals.
// ---------------------------------------------------------------------------
const CR_GROUND_ATLAS_SCALE = 16;
let crGroundAtlasCanvas = null, crGroundAtlasCtx = null, crGroundAtlasImage = null;
let crGroundAtlasSurface = null, crGroundAtlasPathsReady = false;
let crGroundViewCanvas = null, crGroundViewCtx = null, crGroundViewImage = null;
const crGroundSurfaceStats = { atlasBuilds: 0, atlasBytes: 0, atlasWidth: 0, atlasHeight: 0, decalsRendered: 0, pathAssetsReady: 0, frameBufferAllocations: 0, framePixels: 0 };

function crGroundHash(x, y, seed){
  let n = (Math.imul(x | 0, 0x1f123bb5) ^ Math.imul(y | 0, 0x45d9f3b) ^ (seed | 0)) >>> 0;
  n ^= n >>> 16; n = Math.imul(n, 0x7feb352d) >>> 0; n ^= n >>> 15; n = Math.imul(n, 0x846ca68b) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}
function crGroundGrassPacked(px, py, seed){
  // Keep the pixel-art variation fine-grained: quantized macro cells made the
  // distant lawn read as a tiled grid instead of a continuous park surface.
  const detail = crGroundHash(px, py, seed ^ 0x6d2b79f5) & 63;
  const palette = [[45,76,42], [48,80,44], [52,84,46]];
  const color = palette[detail < 4 ? 0 : detail < 56 ? 1 : 2];
  return (color[0] << 16) | (color[1] << 8) | color[2];
}
function crGroundDirtPacked(px, py, seed){
  const noise = crGroundHash(px, py, seed ^ 0x1b873593) & 15;
  const palette = [[131,100,59], [145,111,65], [154,120,73], [119,91,54]];
  const color = palette[noise < 3 ? 3 : noise < 8 ? 0 : noise < 13 ? 1 : 2];
  return (color[0] << 16) | (color[1] << 8) | color[2];
}
function crGroundPointSegmentDistanceSq(px, py, ax, ay, bx, by){
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
  const t = length > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  const rx = px - (ax + dx * t), ry = py - (ay + dy * t);
  return rx * rx + ry * ry;
}
function crGroundPathDistance(surface, wx, wy){
  let best = Infinity;
  for(const route of surface.routes || []){
    const points = route.points || [], radius = Number(route.width) * 0.5;
    for(let i = 1; i < points.length; i++){
      const a = points[i - 1], b = points[i];
      const distance = Math.sqrt(crGroundPointSegmentDistanceSq(wx, wy, a[0], a[1], b[0], b[1])) - radius;
      if(distance < best) best = distance;
    }
  }
  for(const patch of surface.wornAreas || []){
    const dx = wx - patch.x, dy = wy - patch.y;
    const distance = Math.sqrt(dx * dx + dy * dy) - Number(patch.radius);
    if(distance < best) best = distance;
  }
  return best;
}
function crGroundPathRegistry(){ return globalThis.SNC_RUNTIME_PATH_ASSET_REGISTRY || null; }
function crGroundPathAssetsReady(surface){
  const registry = crGroundPathRegistry();
  if(!registry) return false;
  return (surface.decals || []).every((decal) => { const entry = registry[decal.assetId]; return !!(entry && entry.image && entry.image.complete && entry.image.naturalWidth > 0); });
}
function crGroundBuildAtlas(surface){
  const width = Math.max(1, Math.round(game.MAP_W * CR_GROUND_ATLAS_SCALE)), height = Math.max(1, Math.round(game.MAP_H * CR_GROUND_ATLAS_SCALE));
  if(!crGroundAtlasCanvas || crGroundAtlasCanvas.width !== width || crGroundAtlasCanvas.height !== height){
    crGroundAtlasCanvas = document.createElement('canvas'); crGroundAtlasCanvas.width = width; crGroundAtlasCanvas.height = height;
    crGroundAtlasCtx = crGroundAtlasCanvas.getContext('2d', { alpha: false }); crGroundAtlasCtx.imageSmoothingEnabled = false;
  }
  const image = crGroundAtlasCtx.createImageData(width, height), data = image.data, seed = Number(surface.grassSeed) || 0;
  for(let py = 0; py < height; py++) for(let px = 0; px < width; px++){
    const wx = (px + 0.5) / CR_GROUND_ATLAS_SCALE, wy = (py + 0.5) / CR_GROUND_ATLAS_SCALE;
    const edgeNoise = ((crGroundHash(px >> 1, py >> 1, seed ^ 0x9e3779b9) & 255) / 255 - 0.5) * 0.16;
    const packed = crGroundPathDistance(surface, wx, wy) <= edgeNoise ? crGroundDirtPacked(px, py, seed) : crGroundGrassPacked(px, py, seed);
    const index = (py * width + px) * 4;
    data[index] = packed >>> 16; data[index + 1] = (packed >>> 8) & 255; data[index + 2] = packed & 255; data[index + 3] = 255;
  }
  crGroundAtlasCtx.putImageData(image, 0, 0);
  let decalsRendered = 0, registry = crGroundPathRegistry();
  if(registry && crGroundPathAssetsReady(surface)) for(const decal of surface.decals || []){
    const entry = registry[decal.assetId], imageAsset = entry && entry.image;
    if(!imageAsset) continue;
    const w = Number(decal.width) * CR_GROUND_ATLAS_SCALE, h = Number(decal.height) * CR_GROUND_ATLAS_SCALE;
    crGroundAtlasCtx.save(); crGroundAtlasCtx.translate(Number(decal.x) * CR_GROUND_ATLAS_SCALE, Number(decal.y) * CR_GROUND_ATLAS_SCALE);
    crGroundAtlasCtx.rotate(Number(decal.rotationRadians) || 0); crGroundAtlasCtx.imageSmoothingEnabled = false;
    crGroundAtlasCtx.drawImage(imageAsset, -w * 0.5, -h * 0.5, w, h); crGroundAtlasCtx.restore(); decalsRendered++;
  }
  crGroundAtlasImage = crGroundAtlasCtx.getImageData(0, 0, width, height);
  crGroundAtlasSurface = surface; crGroundAtlasPathsReady = crGroundPathAssetsReady(surface);
  crGroundSurfaceStats.atlasBuilds++; crGroundSurfaceStats.atlasWidth = width; crGroundSurfaceStats.atlasHeight = height; crGroundSurfaceStats.atlasBytes = image.data.byteLength;
  crGroundSurfaceStats.decalsRendered = decalsRendered; crGroundSurfaceStats.pathAssetsReady = registry ? Object.keys(registry).filter((id) => registry[id].image.complete && registry[id].image.naturalWidth > 0).length : 0;
}
function crGroundEnsureAtlas(){
  const surface = game && game.groundSurface;
  if(!surface || surface.schema !== 'snc-authored-ground-surface-v1' || !Number.isFinite(surface.grassSeed)) return false;
  const ready = crGroundPathAssetsReady(surface);
  if(surface !== crGroundAtlasSurface || ready !== crGroundAtlasPathsReady) crGroundBuildAtlas(surface);
  return !!crGroundAtlasImage;
}
function crGroundEnsureFrameBuffer(){
  const horizon = Math.floor(RH * 0.5), height = RH - horizon;
  if(!crGroundViewCanvas || crGroundViewCanvas.width !== RW || crGroundViewCanvas.height !== height){
    crGroundViewCanvas = document.createElement('canvas'); crGroundViewCanvas.width = RW; crGroundViewCanvas.height = height;
    crGroundViewCtx = crGroundViewCanvas.getContext('2d', { alpha: false }); crGroundViewImage = crGroundViewCtx.createImageData(RW, height); crGroundSurfaceStats.frameBufferAllocations++;
  }
  return horizon;
}
function crGroundSamplePacked(wx, wy){
  const image = crGroundAtlasImage, x = Math.floor(wx * CR_GROUND_ATLAS_SCALE), y = Math.floor(wy * CR_GROUND_ATLAS_SCALE);
  if(!image || x < 0 || y < 0 || x >= image.width || y >= image.height) return 0x30482d;
  const index = (y * image.width + x) * 4, data = image.data;
  return (data[index] << 16) | (data[index + 1] << 8) | data[index + 2];
}
function crDrawAuthoredGroundSurface(px, py, dirX, dirY, planeX, planeY){
  if(!crGroundEnsureAtlas()) return false;
  const horizon = crGroundEnsureFrameBuffer(), data = crGroundViewImage.data;
  let pixels = 0;
  for(let row = 0; row < crGroundViewCanvas.height; row++){
    const y = horizon + row, depth = RH * CR_HEIGHTFIELD_CAMERA.eyeZ / Math.max(0.5, y - RH * 0.5 + 0.5);
    for(let col = 0; col < RW; col++){
      const cameraX = 2 * (col + 0.5) / RW - 1;
      const packed = crGroundSamplePacked(px + depth * (dirX + planeX * cameraX), py + depth * (dirY + planeY * cameraX));
      const index = (row * RW + col) * 4; data[index] = packed >>> 16; data[index + 1] = (packed >>> 8) & 255; data[index + 2] = packed & 255; data[index + 3] = 255; pixels++;
    }
  }
  crGroundViewCtx.putImageData(crGroundViewImage, 0, 0); bctx.drawImage(crGroundViewCanvas, 0, horizon); crGroundSurfaceStats.framePixels = pixels;
  return true;
}
function crGetGroundSurfaceDiagnostics(){ return Object.freeze(Object.assign({}, crGroundSurfaceStats)); }
