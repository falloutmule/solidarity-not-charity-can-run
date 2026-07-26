// ---------------------------------------------------------------------------
// RUNTIMEGALLERY4 ↔ SHORT-BUILDING RENDERER COMPATIBILITY
// ---------------------------------------------------------------------------
// The recovered PR #23 renderer consumes ordinary npc kinds through TEX/HEIGHT.
// runtimegallery4 stores the approved texture identity separately as assetId.
// Register those stable IDs as ordinary renderer kinds before gallery boot, then
// switch the gallery-only entities to their asset IDs after installation. Normal
// District 1 NPCs and gameplay semantics are untouched.
(function installShortBuildingGalleryCompatibility(root){
  if(typeof root.npcSpriteHeight !== 'function'){
    root.npcSpriteHeight = function npcSpriteHeightCompatibility(entity){
      return HEIGHT[entity && entity.kind] || HEIGHT.hungry;
    };
  }

  // dumpster_001 is a single three-quarter cutout, not four orthographic wall
  // paintings. Repeating the complete image on adjacent footprint faces creates
  // a close-range hall-of-mirrors duplicate. Keep the 1×2 collision footprint,
  // but permit only the camera-dominant exterior face to carry opaque pixels.
  // Other hit faces remain transparent ray-continuation surfaces, preserving the
  // proven alpha/depth behavior and the world behind the object.
  const SINGLE_PLANE_CUTOUT_ASSETS = new Set(['dumpster_001']);
  const EMPTY_OPAQUE_RUNS = Object.freeze([]);
  let singlePlaneDiagnostics = Object.freeze({
    active: false,
    assetId: null,
    selectedWorldFace: null,
    lastWorldFace: null,
    visibleColumns: 0,
    suppressedColumns: 0,
    playerX: null,
    playerY: null
  });

  function placementFootprint(placement, asset){
    const footprint = (asset && asset.footprint) || (placement && placement.footprint) || {};
    return {
      width: Number((placement && (placement.widthCells || placement.w)) || footprint.widthCells || footprint.wCells || footprint.w || 1),
      depth: Number((placement && (placement.depthCells || placement.h)) || footprint.depthCells || footprint.hCells || footprint.h || 1)
    };
  }

  function dominantExteriorFace(placement, asset, playerX, playerY){
    const footprint = placementFootprint(placement, asset);
    const x0 = Number.isFinite(placement && placement.x0) ? placement.x0 : Number(placement && placement.x);
    const y0 = Number.isFinite(placement && placement.y0) ? placement.y0 : Number(placement && placement.y);
    if(!Number.isFinite(x0) || !Number.isFinite(y0) || !(footprint.width > 0) || !(footprint.depth > 0) ||
       !Number.isFinite(playerX) || !Number.isFinite(playerY)) return null;
    const centerX = x0 + footprint.width * 0.5;
    const centerY = y0 + footprint.depth * 0.5;
    const normalizedX = (playerX - centerX) / Math.max(0.5, footprint.width * 0.5);
    const normalizedY = (playerY - centerY) / Math.max(0.5, footprint.depth * 0.5);
    if(Math.abs(normalizedX) > Math.abs(normalizedY)) return normalizedX < 0 ? 'west' : 'east';
    return normalizedY < 0 ? 'north' : 'south';
  }

  if(typeof root.resolveWholeFaceBitmapBuildingColumn === 'function' && typeof root.resolveBitmapWorldFace === 'function'){
    const originalResolveWholeFaceBitmapBuildingColumn = root.resolveWholeFaceBitmapBuildingColumn;
    root.resolveWholeFaceBitmapBuildingColumn = function resolveSinglePlaneCutoutColumn(hit, placement){
      const resolved = originalResolveWholeFaceBitmapBuildingColumn(hit, placement);
      if(!resolved || !placement || !SINGLE_PLANE_CUTOUT_ASSETS.has(placement.assetId)) return resolved;
      const worldFace = root.resolveBitmapWorldFace(hit && hit.side, hit && hit.stepX, hit && hit.stepY);
      const playerX = Number(hit && hit.px);
      const playerY = Number(hit && hit.py);
      const selectedWorldFace = dominantExteriorFace(placement, resolved.asset, playerX, playerY);
      if(!worldFace || !selectedWorldFace) return resolved;

      const samePose = singlePlaneDiagnostics.active &&
        singlePlaneDiagnostics.assetId === placement.assetId &&
        singlePlaneDiagnostics.selectedWorldFace === selectedWorldFace &&
        singlePlaneDiagnostics.playerX === playerX &&
        singlePlaneDiagnostics.playerY === playerY;
      const visibleColumns = samePose ? singlePlaneDiagnostics.visibleColumns : 0;
      const suppressedColumns = samePose ? singlePlaneDiagnostics.suppressedColumns : 0;
      const visible = worldFace === selectedWorldFace;
      singlePlaneDiagnostics = Object.freeze({
        active: true,
        assetId: placement.assetId,
        selectedWorldFace,
        lastWorldFace: worldFace,
        visibleColumns: visibleColumns + (visible ? 1 : 0),
        suppressedColumns: suppressedColumns + (visible ? 0 : 1),
        playerX,
        playerY
      });

      if(visible) return Object.assign({}, resolved, { worldFace, selectedWorldFace, singlePlaneSuppressed: false });
      return Object.assign({}, resolved, {
        worldFace,
        selectedWorldFace,
        opaqueRuns: EMPTY_OPAQUE_RUNS,
        singlePlaneSuppressed: true
      });
    };
  }

  root.crGetSinglePlaneCutoutDiagnostics = function crGetSinglePlaneCutoutDiagnostics(){
    return singlePlaneDiagnostics;
  };

  if(typeof crInstallAssetGallery !== 'function') return;
  const originalInstallAssetGallery = crInstallAssetGallery;

  crInstallAssetGallery = function crInstallAssetGalleryWithLegacyRenderer(){
    const level = root.SNC_ASSET_GALLERY_LEVEL;
    const registry = root.SNC_RUNTIME_ASSET_REGISTRY;
    if(level && registry && Array.isArray(level.characters) && typeof TEX !== 'undefined' && typeof HEIGHT !== 'undefined'){
      for(const placement of level.characters){
        const asset = registry[placement.assetId];
        if(!asset || !asset.image) continue;
        TEX[placement.assetId] = asset.image;
        HEIGHT[placement.assetId] = Number.isFinite(asset.heightScale) ? asset.heightScale : HEIGHT.hungry;
      }
    }

    const installed = originalInstallAssetGallery();
    if(installed && registry && game && Array.isArray(game.npcs)){
      for(const npc of game.npcs){
        if(npc && npc.assetId && registry[npc.assetId]) npc.kind = npc.assetId;
      }
    }
    return installed;
  };
})(globalThis);
