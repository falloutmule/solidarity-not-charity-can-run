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

  // dumpster_001 is one three-quarter cutout, not four orthographic wall faces.
  // The generic box renderer therefore repeated a complete dumpster on adjacent
  // footprint faces at close range. Do not patch renderer bindings here: the live
  // ray loop owns a closed-over resolver. Instead, replace this registry property
  // with a getter that supplies the live renderer a directional asset variant.
  // Exactly one local face keeps the real cutout; the other three resolve to a
  // verified transparent atlas pixel and continue rays to the background.
  const FACE_DIRS = Object.freeze(['south', 'east', 'north', 'west']);
  const TRANSPARENT_SLICE = Object.freeze({ x:0, y:0, w:1, h:1 });
  const TRANSPARENT_FACE = Object.freeze({
    role: 'single-plane-suppressed',
    spanCells: 1,
    slice: TRANSPARENT_SLICE,
    sourceUDirection: 'increasing',
    mirror: false
  });
  let singlePlaneDiagnostics = Object.freeze({
    active: false,
    assetId: null,
    selectedWorldFace: null,
    selectedLocalFace: null,
    placementId: null,
    lookupCount: 0,
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

  function activeDumpsterPlacement(){
    let runtimeGame = null;
    try { runtimeGame = typeof game !== 'undefined' ? game : null; } catch(_error){}
    const registry = runtimeGame && runtimeGame.buildingRegistry;
    if(!registry) return null;
    for(const bid in registry){
      const placement = registry[bid];
      if(placement && placement.assetId === 'dumpster_001') return placement;
    }
    return null;
  }

  function activePlayer(){
    try { return typeof player !== 'undefined' ? player : null; }
    catch(_error){ return null; }
  }

  function resolveOriginalFaceDescriptor(asset, localFace){
    if(!asset || !asset.faces || !asset.faces[localFace]) return null;
    let descriptor = asset.faces[localFace];
    const seen = Object.create(null);
    while(descriptor && descriptor.reuse){
      if(seen[descriptor.reuse]) return null;
      seen[descriptor.reuse] = true;
      const reused = asset.faces[descriptor.reuse];
      if(!reused) return null;
      descriptor = Object.assign({}, reused, descriptor, {
        slice: descriptor.slice || reused.slice,
        assetRef: descriptor.assetRef || reused.assetRef,
        mirror: descriptor.mirror === true
      });
      delete descriptor.reuse;
    }
    if(!descriptor) return null;
    const referenced = descriptor.assetRef && asset.faceAssets && asset.faceAssets[descriptor.assetRef];
    if(referenced){
      descriptor = Object.assign({}, referenced, descriptor, {
        slice: descriptor.slice || referenced.slice,
        mirror: descriptor.mirror === true
      });
    }
    delete descriptor.reuse;
    return Object.freeze(descriptor);
  }

  const bitmapRegistry = root.BITMAP_BUILDING_ASSET_REGISTRY;
  if(bitmapRegistry && bitmapRegistry.dumpster_001){
    let originalDumpsterAsset = bitmapRegistry.dumpster_001;
    const variants = new Map();

    function variantFor(localFace){
      if(!originalDumpsterAsset || !FACE_DIRS.includes(localFace)) return originalDumpsterAsset;
      if(variants.has(localFace)) return variants.get(localFace);
      const visibleDescriptor = resolveOriginalFaceDescriptor(originalDumpsterAsset, localFace);
      if(!visibleDescriptor) return originalDumpsterAsset;
      const faces = Object.create(null);
      for(const face of FACE_DIRS) faces[face] = face === localFace ? visibleDescriptor : TRANSPARENT_FACE;
      const variant = Object.freeze(Object.assign({}, originalDumpsterAsset, {
        faces: Object.freeze(faces),
        singlePlaneCutout: true,
        selectedLocalFace: localFace
      }));
      variants.set(localFace, variant);
      return variant;
    }

    Object.defineProperty(bitmapRegistry, 'dumpster_001', {
      configurable: true,
      enumerable: true,
      get(){
        const placement = activeDumpsterPlacement();
        const runtimePlayer = activePlayer();
        if(!placement || !runtimePlayer) return originalDumpsterAsset;
        const selectedWorldFace = dominantExteriorFace(
          placement, originalDumpsterAsset, Number(runtimePlayer.x), Number(runtimePlayer.y));
        const selectedLocalFace = selectedWorldFace && typeof root.inverseRotateBitmapFace === 'function'
          ? root.inverseRotateBitmapFace(selectedWorldFace, placement.rotation || 0)
          : selectedWorldFace;
        if(!selectedLocalFace) return originalDumpsterAsset;
        singlePlaneDiagnostics = Object.freeze({
          active: true,
          assetId: 'dumpster_001',
          selectedWorldFace,
          selectedLocalFace,
          placementId: placement.id || placement.bid || null,
          lookupCount: singlePlaneDiagnostics.lookupCount + 1,
          playerX: Number(runtimePlayer.x),
          playerY: Number(runtimePlayer.y)
        });
        return variantFor(selectedLocalFace);
      },
      set(value){
        originalDumpsterAsset = value;
        variants.clear();
      }
    });
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
