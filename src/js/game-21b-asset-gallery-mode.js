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
    const npc = { id: placement.id, assetId: placement.assetId, kind: asset.group, x: placement.x, y: placement.y, need: 99, helped: false, wob: 0, thank: '', galleryStatic: true, heightScale: asset.heightScale };
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
    exhibits.push(crAssetGalleryExhibit(building.id, 'building', building.assetId, {
      x: building.x + building.widthCells / 2, y: building.y + building.depthCells / 2,
      widthCells: building.widthCells, depthCells: building.depthCells
    }));
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
  // sharedEnterPlay refreshes the normal mobile label before gallery mode is
  // visible; refresh it once more so the gallery never shows a run BUILD_ID.
  if(typeof syncPortraitMenuLabel === 'function') syncPortraitMenuLabel();
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

function crAssetGalleryPanelRectOverlaps(a, b){
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function crAssetGalleryFocusScreenBounds(focus, viewportWidth, viewportHeight){
  const object = focus && focus.object;
  if(!object || !Number.isFinite(object.x) || !Number.isFinite(object.y)) return null;
  const dx = object.x - player.x, dy = object.y - player.y;
  const forward = dx * Math.cos(player.angle) + dy * Math.sin(player.angle);
  if(!(forward > 0.01)) return null;
  const sideways = -Math.sin(player.angle) * dx + Math.cos(player.angle) * dy;
  const screenX = viewportWidth * 0.5 * (1 + sideways / (forward * cfg.fov));
  const footprint = focus.category === 'building'
    ? Math.max(Number(object.widthCells) || 1, Number(object.depthCells) || 1)
    : 0.75;
  // The protection band deliberately covers the full frame height: a panel at
  // the top edge must clear the focused subject horizontally even when it is
  // close enough to reach the sky line.
  const halfWidth = Math.min(viewportWidth * 0.5, Math.max(30, viewportHeight * footprint * 0.28 / forward));
  return {
    x: Math.max(0, screenX - halfWidth), y: 0,
    width: Math.min(viewportWidth, screenX + halfWidth) - Math.max(0, screenX - halfWidth),
    height: viewportHeight, screenX
  };
}

function crAssetGalleryFocusPanelPlacement(focus, panelWidth, panelHeight){
  const viewportWidth = Math.max(1, Math.round(innerWidth));
  const viewportHeight = Math.max(1, Math.round(innerHeight));
  const safe = typeof readSafeAreaInsets === 'function' ? readSafeAreaInsets() : { top: 0, right: 0, bottom: 0, left: 0 };
  const inset = 8;
  const portrait = typeof mobileMode !== 'undefined' && mobileMode && typeof isMobilePortrait === 'function' && isMobilePortrait();
  const portraitLayoutState = portrait && typeof portraitLayout === 'function' ? portraitLayout() : null;
  // Gallery mode vacates the ordinary portrait stats rail. Use that edge rail
  // for a centered close-up instead of hiding the focused asset label.
  const y = portraitLayoutState && portraitLayoutState.statsRect
    ? Math.min(viewportHeight - (Number(safe.bottom) || 0) - inset - panelHeight, portraitLayoutState.statsRect.y + inset)
    : Math.max(inset, (Number(safe.top) || 0) + inset);
  const left = Math.max(inset, (Number(safe.left) || 0) + inset);
  const right = Math.max(left, viewportWidth - (Number(safe.right) || 0) - inset - panelWidth);
  const candidates = [
    { side: 'left', x: left, y, width: panelWidth, height: panelHeight },
    { side: 'right', x: right, y, width: panelWidth, height: panelHeight }
  ];
  const subject = crAssetGalleryFocusScreenBounds(focus, viewportWidth, viewportHeight);
  if(!subject) return candidates[0];
  if(portraitLayoutState && portraitLayoutState.fpvRect && y >= portraitLayoutState.fpvRect.y + portraitLayoutState.fpvRect.h) return candidates[0];
  // Prefer the edge opposite the subject, then use the other edge only when
  // it is the sole clear slot. Returning null is intentional: an absent panel
  // is preferable to covering the exhibit it describes.
  const preferred = subject.screenX <= viewportWidth * 0.5 ? ['right', 'left'] : ['left', 'right'];
  for(const side of preferred){
    const candidate = candidates[side === 'left' ? 0 : 1];
    if(!crAssetGalleryPanelRectOverlaps(candidate, subject)) return candidate;
  }
  return null;
}

function crDrawAssetGalleryOverlay(){
  if(!crAssetGalleryIsActive()) return;
  const focus = game.assetGallery.focus;
  const lines = focus ? [focus.label, focus.category.toUpperCase()] : ['ASSET GALLERY', 'face an exhibit for its stable asset ID'];
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = '10px monospace';
  const width = Math.ceil(Math.max(...lines.map(line => ctx.measureText(line).width)) + 14);
  const height = lines.length * 14 + 8;
  const placement = crAssetGalleryFocusPanelPlacement(focus, width, height);
  if(!placement){ ctx.restore(); return; }
  const x = placement.x, y = placement.y;
  ctx.fillStyle = 'rgba(12,10,8,0.78)'; ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(122,210,255,0.7)'; ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  for(let i=0; i<lines.length; i++){
    ctx.fillStyle = i === 0 ? '#b8eaff' : '#e9d8b0';
    ctx.fillText(lines[i], x + 7, y + 11 + i * 14);
  }
  ctx.restore();
}
