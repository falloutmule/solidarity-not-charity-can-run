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
