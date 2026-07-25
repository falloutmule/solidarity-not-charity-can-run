// ---------------------------------------------------------------------------
// SECTION 12c — QUERY-GATED RUNTIME ASSET GALLERY
// ---------------------------------------------------------------------------
// Uses the ordinary SNC world renderer and live entity collections. The level
// contains references only; its candidate bitmaps live once in the registry.
function crAssetGalleryIsActive(){ return !!(game.assetGallery && game.assetGallery.active); }

function crAssetGalleryRuntimeRecord(assetId){
  const registry = globalThis.SNC_RUNTIME_ASSET_REGISTRY;
  return registry && registry[assetId] ? registry[assetId] : null;
}

function crAssetGalleryBuildMap(level){
  const map = Array.from({ length: level.height }, () => new Array(level.width).fill(0));
  for(let y=0; y<level.height; y++) for(let x=0; x<level.width; x++){
    if(x === 0 || y === 0 || x === level.width - 1 || y === level.height - 1) map[y][x] = WALL.CONCRETE;
  }
  return map;
}

function crAssetGalleryInstallBuilding(level, map){
  const grid = Array.from({ length: level.height }, () => new Array(level.width).fill(null));
  const registry = {};
  let bid = 1;
  for(const building of level.buildings){
    if(!globalThis.BITMAP_BUILDING_ASSET_REGISTRY || !globalThis.BITMAP_BUILDING_ASSET_REGISTRY[building.assetId]){
      throw new Error('gallery building asset is not registered: ' + building.assetId);
    }
    const entry = {
      bid, id: building.id, assetId: building.assetId, renderMode: 'importedWholeFaceAsset',
      x: building.x, y: building.y, x0: building.x, y0: building.y,
      rotation: building.rotation, widthCells: building.widthCells, depthCells: building.depthCells,
      w: building.widthCells, h: building.depthCells,
      footprint: { widthCells: building.widthCells, depthCells: building.depthCells }, front: building.front
    };
    registry[bid] = entry;
    for(let ly=0; ly<building.depthCells; ly++) for(let lx=0; lx<building.widthCells; lx++){
      const x = building.x + lx, y = building.y + ly;
      if(x <= 0 || x >= level.width - 1 || y <= 0 || y >= level.height - 1 || map[y][x] !== 0) throw new Error('invalid gallery building footprint');
      map[y][x] = WALL.BUILDING;
      grid[y][x] = { bid, lx, ly };
    }
    bid++;
  }
  return { registry, grid, nextBid: bid };
}

function crAssetGalleryExhibit(id, category, label, object){ return { id, category, label, object }; }

function crInstallAssetGallery(){
  const level = globalThis.SNC_ASSET_GALLERY_LEVEL;
  if(!level || level.schema !== 'snc-asset-gallery-level-v1') throw new Error('asset gallery level is unavailable');
  const map = crAssetGalleryBuildMap(level);
  const buildings = crAssetGalleryInstallBuilding(level, map);
  const exhibits = [];
  const npcs = level.characters.map((placement) => {
    const asset = crAssetGalleryRuntimeRecord(placement.assetId);
    if(!asset) throw new Error('gallery character asset is not registered: ' + placement.assetId);
    const npc = { id: placement.id, assetId: placement.assetId, kind: 'volunteer', x: placement.x, y: placement.y, need: 99, helped: false, wob: 0, thank: '', galleryStatic: true };
    exhibits.push(crAssetGalleryExhibit(placement.id, 'character/' + asset.group, placement.assetId, npc));
    return npc;
  });
  const props = level.props.map((placement) => {
    const prop = Object.assign({ wob: 0 }, placement);
    exhibits.push(crAssetGalleryExhibit(placement.id, 'prop', placement.kind, prop));
    return prop;
  });
  const pickups = level.pickups.map((placement) => {
    const pickup = Object.assign({ taken: false, wob: 0 }, placement);
    exhibits.push(crAssetGalleryExhibit(placement.id, 'pickup', 'can', pickup));
    return pickup;
  });
  const exit = Object.assign({}, level.exit);
  exhibits.push(crAssetGalleryExhibit(exit.id, 'marker', 'portal', exit));
  for(const building of level.buildings){
    exhibits.push(crAssetGalleryExhibit(building.id, 'building', building.assetId, { x: building.x + building.widthCells / 2, y: building.y + building.depthCells / 2 }));
  }

  game.seed = 8128;
  game.district = 0;
  game.totalScore = 0;
  game.modifier = 'clear';
  game.scoreMult = 1;
  game.map = map;
  game.MAP_W = level.width;
  game.MAP_H = level.height;
  game.wallShade = Array.from({ length: level.height }, () => new Array(level.width).fill(0.5));
  game.streetLayoutMeta = null;
  game.buildingRegistry = buildings.registry;
  game.buildingGrid = buildings.grid;
  game.buildingMaterialGrid = Array.from({ length: level.height }, () => new Array(level.width).fill(null));
  game.buildingMaterialComponents = {};
  game._nextBuildingId = buildings.nextBid;
  game.pickups = pickups;
  game.npcs = npcs;
  game.props = props;
  game.exit = exit;
  game.quota = 0;
  game.helped = 0;
  game.delivered = 0;
  game.timeLeft = 9999;
  game.aimNpc = null;
  game.popups = [];
  game.flash = 0;
  game.handoffFx = 0;
  game.assetGallery = { active: true, levelId: level.id, exhibits, focus: null, deferredTestBays: level.deferredTestBays.slice() };
  resetPlayerUpgrades();
  player.x = level.playerStart.x;
  player.y = level.playerStart.y;
  player.angle = level.playerStart.angle;
  player.cans = 0;
  player.stamina = player.maxStamina;
  game.run = { active: true, startedAt: 0, seedUsed: game.seed, modifierUsed: game.modifier, customLevel: level.id,
    cansCollected: 0, cansDelivered: 0, helpedByKind: { hungry: 0, family: 0, elder: 0, volunteer: 0 },
    upgradesChosen: 0, highestDistrict: 0, runTime: 0, completed: false, leaderboardRank: null, harnessOnly: true, assetGallery: true };
  onboardingOpen = false;
  sharedEnterPlay();
  syncOnboardingPanel();
  return true;
}

function crBootAssetGalleryIfRequested(){
  if(!CR_ASSET_GALLERY) return false;
  return crInstallAssetGallery();
}

function crUpdateAssetGalleryFocus(){
  if(!crAssetGalleryIsActive()) return;
  const forwardX = Math.cos(player.angle), forwardY = Math.sin(player.angle);
  let best = null, bestScore = -Infinity;
  for(const exhibit of game.assetGallery.exhibits){
    const object = exhibit.object;
    const dx = object.x - player.x, dy = object.y - player.y;
    const distance = Math.hypot(dx, dy);
    if(distance < 0.15 || distance > 9) continue;
    const facing = (dx * forwardX + dy * forwardY) / distance;
    if(facing < 0.82) continue;
    const score = facing * 3 - distance * 0.18;
    if(score > bestScore){ bestScore = score; best = Object.assign({ distance }, exhibit); }
  }
  game.assetGallery.focus = best;
}

function crDrawAssetGalleryOverlay(){
  if(!crAssetGalleryIsActive()) return;
  const focus = game.assetGallery.focus;
  const cx = innerWidth / 2;
  const lines = focus ? [focus.label, focus.category.toUpperCase(), 'candidate · ' + focus.distance.toFixed(1) + ' cells'] : ['ASSET GALLERY', 'face an exhibit for its stable asset ID'];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '12px monospace';
  const width = Math.max(...lines.map(line => ctx.measureText(line).width)) + 18;
  const x = cx - width / 2, y = mobileMode && isMobilePortrait() ? 122 : innerHeight - 92;
  ctx.fillStyle = 'rgba(12,10,8,0.78)'; ctx.fillRect(x, y, width, lines.length * 16 + 10);
  ctx.strokeStyle = 'rgba(122,210,255,0.7)'; ctx.strokeRect(x + 0.5, y + 0.5, width - 1, lines.length * 16 + 9);
  for(let i=0; i<lines.length; i++){
    ctx.fillStyle = i === 0 ? '#b8eaff' : '#e9d8b0';
    ctx.fillText(lines[i], cx, y + 5 + i * 16);
  }
  ctx.restore();
}
