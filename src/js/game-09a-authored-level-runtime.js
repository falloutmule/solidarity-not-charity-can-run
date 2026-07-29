(function(root){
  'use strict';

  const preparedStates = new WeakSet();
  const lockedDefinition = root.sncGetAuthoredLevelDefinition(root.SNC_AUTHORED_LEVEL_ID);
  const lockedCanonical = root.sncCanonicalizeAuthoredStatic(root.sncBuildLockedStaticLevel(lockedDefinition));

  function runtimeGame(){ return typeof game !== 'undefined' ? game : root.game || null; }
  function runtimePlayer(){ return typeof player !== 'undefined' ? player : root.player || null; }
  function runtimeCfg(){ return typeof cfg !== 'undefined' ? cfg : root.cfg || null; }
  function clone(value){
    if(Array.isArray(value)) return value.map(clone);
    if(value && typeof value === 'object'){ const out = {}; for(const key of Object.keys(value)) out[key] = clone(value[key]); return out; }
    return value;
  }
  function isFiniteNumber(value){ return typeof value === 'number' && Number.isFinite(value); }
  function hasExactKeys(value, expected){
    if(!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const actual = Object.keys(value).sort(), wanted = expected.slice().sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
  }

  function sncValidateAuthoredLevelDefinition(source){
    const errors = [];
    if(!source || typeof source !== 'object') return { pass: false, errors: ['definition must be an object'] };
    if(source.id !== root.SNC_AUTHORED_LEVEL_ID || source.district !== 1) errors.push('D1 identity mismatch');
    if(source.schemaVersion !== 2 || source.staticSchema !== root.SNC_AUTHORED_LEVEL_SCHEMA) errors.push('static schema mismatch');
    if(source.staticHashAlgorithm !== 'sha256-canonical-json-lexicographic-v1') errors.push('static hash algorithm mismatch');
    if(!source.grid || source.grid.width !== 40 || source.grid.height !== 20) errors.push('grid dimensions mismatch');
    if(!Array.isArray(source.mapRows) || source.mapRows.length !== 20 || source.mapRows.some(row => typeof row !== 'string' || row.length !== 40 || /[^0128]/.test(row))) errors.push('map rows invalid');
    if(!source.mapEncoding || source.mapEncoding['2'] !== 'solid half-height concrete planter block') errors.push('low-block map encoding mismatch');
    if(!Array.isArray(source.buildings) || source.buildings.length !== 1 || !Array.isArray(source.environmentObjects) || source.environmentObjects.length < 6) errors.push('authored geometry mismatch');
    if(!Array.isArray(source.canSockets) || source.canSockets.length !== 9 || source.pickupCount !== 5) errors.push('can socket contract mismatch');
    if(!Array.isArray(source.npcs) || source.npcs.length !== 3 || source.quota !== 3 || source.requiredCans !== 5 || source.carryingCapacity !== 3) errors.push('objective contract mismatch');
    if(source.timerExpiryPolicy !== 'continue') errors.push('timer must not end The Stand');
    try {
      const canonical = root.sncCanonicalizeAuthoredStatic(root.sncBuildLockedStaticLevel(source));
      if(canonical !== lockedCanonical) errors.push('canonical static level drift');
      const bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(canonical).length : canonical.length;
      if(bytes !== root.SNC_AUTHORED_LEVEL_STATIC_BYTES) errors.push('canonical preimage byte length mismatch');
    } catch(error){ errors.push('static builder failed: ' + String(error && error.message ? error.message : error)); }
    return { pass: errors.length === 0, errors };
  }

  function decodeMap(source){
    const buildingWall = (typeof WALL !== 'undefined' && WALL && WALL.BUILDING) || 1;
    const concreteWall = (typeof WALL !== 'undefined' && WALL && WALL.CONCRETE) || 8;
    return source.mapRows.map(row => Array.from(row, char => char === '0' ? 0 : char === '1' ? buildingWall : concreteWall));
  }

  function buildRegistryAndGrid(level){
    const grid = Array.from({ length: level.height }, () => new Array(level.width).fill(null));
    const registry = {};
    let bid = 1;
    for(const building of level.buildings){
      const entry = { bid, id: building.id, assetId: building.assetId, renderMode: 'importedWholeFaceAsset', x: building.x, y: building.y, x0: building.x, y0: building.y, rotation: building.rotation, widthCells: building.widthCells, depthCells: building.depthCells, w: building.widthCells, h: building.depthCells, footprint: { widthCells: building.widthCells, depthCells: building.depthCells }, front: building.front };
      registry[bid] = entry;
      for(let ly = 0; ly < building.depthCells; ly++) for(let lx = 0; lx < building.widthCells; lx++) grid[building.y + ly][building.x + lx] = { bid, lx, ly };
      bid++;
    }
    return { registry, grid, nextBid: bid };
  }

  function deterministicRandom(seed){
    if(typeof root.mulberry32 === 'function') return root.mulberry32((seed ^ 0x51a7d11) >>> 0);
    let value = (seed ^ 0x51a7d11) >>> 0;
    return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  }
  function sncSelectedCanSockets(levelId, seed){
    const source = root.sncGetAuthoredLevelDefinition(levelId);
    if(!source || !isFiniteNumber(seed)) return null;
    const sockets = source.canSockets.map(clone);
    const random = deterministicRandom(seed);
    for(let i = sockets.length - 1; i > 0; i--){ const j = Math.floor(random() * (i + 1)); const t = sockets[i]; sockets[i] = sockets[j]; sockets[j] = t; }
    return sockets.slice(0, source.pickupCount).map(socket => ({ id: socket.id, x: socket.x, y: socket.y, amt: 1, taken: false, wob: 0 }));
  }

  function buildEnvironment(level, source, map){
    const ids = typeof CR_VERTICAL_PROFILE_IDS !== 'undefined' ? CR_VERTICAL_PROFILE_IDS : root.CR_VERTICAL_PROFILE_IDS;
    const profileForAsset = typeof crHeightfieldProfileForSolidAsset === 'function' ? crHeightfieldProfileForSolidAsset : root.crHeightfieldProfileForSolidAsset;
    const assetRegistry = typeof SOLID_HEIGHT_ASSET_REGISTRY !== 'undefined' ? SOLID_HEIGHT_ASSET_REGISTRY : root.SOLID_HEIGHT_ASSET_REGISTRY;
    const hasHeightfield = ids && typeof profileForAsset === 'function' && assetRegistry;
    if(!hasHeightfield) return { objects: clone(source.environmentObjects), profileGrid: null, rotationGrid: null };
    const profileGrid = new Uint16Array(level.width * level.height), rotationGrid = new Uint8Array(level.width * level.height);
    for(let y = 0; y < level.height; y++) for(let x = 0; x < level.width; x++) if(map[y][x] !== 0) profileGrid[y * level.width + x] = ids.FULL_LEGACY;
    const objects = [];
    for(const placement of source.environmentObjects){
      const asset = assetRegistry[placement.assetId];
      const profile = asset && profileForAsset(asset);
      if(!asset || !profile || placement.widthCells !== 1 || placement.depthCells !== 1) throw new Error('invalid authored solid-height placement: ' + placement.id);
      const x = placement.x, y = placement.y;
      if(map[y][x] === 0) throw new Error('low block must occupy a solid collision cell: ' + placement.id);
      profileGrid[y * level.width + x] = profile.id;
      rotationGrid[y * level.width + x] = ((placement.rotation % 4) + 4) % 4;
      objects.push(Object.freeze(Object.assign({}, placement, { profileId: profile.id })));
    }
    return { objects, profileGrid, rotationGrid };
  }

  function sncPrepareAuthoredLevelState(levelId, options){
    const source = root.sncGetAuthoredLevelDefinition(levelId), validation = sncValidateAuthoredLevelDefinition(source);
    if(!validation.pass) return null;
    options = options || {};
    if(!isFiniteNumber(options.seed) || typeof options.modifier !== 'string') return null;
    const config = runtimeCfg();
    if(!config || !isFiniteNumber(config.baseTime)) return null;
    const staticLevel = root.sncBuildLockedStaticLevel(source), map = decodeMap(source), ownership = buildRegistryAndGrid(staticLevel);
    const selected = sncSelectedCanSockets(levelId, options.seed);
    if(!selected || selected.length !== source.pickupCount || new Set(selected.map(row => row.id)).size !== selected.length) return null;
    const environment = buildEnvironment(staticLevel, source, map);
    const modifier = options.modifier || '';
    const prepared = {
      validated: true, levelId, authoredLevelSchema: root.SNC_AUTHORED_LEVEL_SCHEMA, authoredStaticSha256: root.SNC_AUTHORED_LEVEL_STATIC_SHA256,
      seed: options.seed, district: 1, modifier, scoreMult: modifier === 'shortage' ? 1.5 : 1,
      map, MAP_W: 40, MAP_H: 20, wallShade: Array.from({ length: 20 }, () => Array(40).fill(0.5)), streetLayoutMeta: clone(staticLevel.streetLayoutMeta),
      buildingRegistry: ownership.registry, buildingGrid: ownership.grid, buildingMaterialGrid: Array.from({ length: 20 }, () => new Array(40).fill(null)), buildingMaterialComponents: {}, nextBuildingId: ownership.nextBid,
      verticalProfileGrid: environment.profileGrid, verticalProfileRotationGrid: environment.rotationGrid, environmentObjects: environment.objects,
      playerStart: { x: staticLevel.playerStart.x, y: staticLevel.playerStart.y, angle: staticLevel.playerStart.angleRadians }, pickups: selected,
      npcs: clone(staticLevel.npcs), props: clone(staticLevel.props), quota: staticLevel.quota, requiredCans: staticLevel.requiredCans, carryingCapacity: staticLevel.carryingCapacity,
      helped: 0, delivered: 0, exit: clone(staticLevel.exit), timeLeft: config.baseTime, timerExpiryPolicy: staticLevel.timerExpiryPolicy
    };
    preparedStates.add(prepared); return prepared;
  }

  function sncCommitAuthoredLevelState(prepared){
    const g = runtimeGame(), p = runtimePlayer();
    if(!g || !p || !prepared || !preparedStates.has(prepared) || prepared.validated !== true) return false;
    Object.assign(g, {
      authoredLevelId: prepared.levelId, authoredLevelSchema: prepared.authoredLevelSchema, authoredStaticSha256: prepared.authoredStaticSha256,
      seed: prepared.seed, district: prepared.district, modifier: prepared.modifier, scoreMult: prepared.scoreMult, map: prepared.map, MAP_W: prepared.MAP_W, MAP_H: prepared.MAP_H,
      wallShade: prepared.wallShade, streetLayoutMeta: prepared.streetLayoutMeta, buildingRegistry: prepared.buildingRegistry, buildingGrid: prepared.buildingGrid,
      buildingMaterialGrid: prepared.buildingMaterialGrid, buildingMaterialComponents: prepared.buildingMaterialComponents, _nextBuildingId: prepared.nextBuildingId,
      verticalProfileWidth: prepared.verticalProfileGrid ? prepared.MAP_W : 0, verticalProfileHeight: prepared.verticalProfileGrid ? prepared.MAP_H : 0,
      verticalProfileGrid: prepared.verticalProfileGrid, verticalProfileRotationGrid: prepared.verticalProfileRotationGrid, authoredEnvironmentObjects: prepared.environmentObjects,
      pickups: prepared.pickups, npcs: prepared.npcs, props: prepared.props, quota: prepared.quota, requiredCans: prepared.requiredCans, carryingCapacity: prepared.carryingCapacity,
      helped: prepared.helped, delivered: prepared.delivered, exit: prepared.exit, timeLeft: prepared.timeLeft, timerExpiryPolicy: prepared.timerExpiryPolicy
    });
    p.x = prepared.playerStart.x; p.y = prepared.playerStart.y; p.angle = prepared.playerStart.angle; p.maxCans = prepared.carryingCapacity; p.cans = Math.min(p.cans || 0, p.maxCans);
    preparedStates.delete(prepared); return true;
  }
  function sncInstallAuthoredLevel(levelId, options){ const prepared = sncPrepareAuthoredLevelState(levelId, options); return prepared ? sncCommitAuthoredLevelState(prepared) : false; }

  function expectedPickups(levelId, seed){ return sncSelectedCanSockets(levelId, seed); }
  function sncCaptureAuthoredMutableOverlay(levelId){
    const g = runtimeGame(); if(!g || g.authoredLevelId !== levelId) return null;
    const baseline = expectedPickups(levelId, g.seed); if(!baseline || !Array.isArray(g.pickups) || g.pickups.length !== baseline.length) return null;
    const byId = new Map(g.pickups.map(row => [row && row.id, row])); if(byId.size !== baseline.length) return null;
    const pickups = baseline.map(expected => { const row = byId.get(expected.id); return row ? { id: expected.id, taken: row.taken === true || row.amt <= 0, amt: expected.amt } : null; });
    if(pickups.some(row => !row) || !Array.isArray(g.npcs) || g.npcs.length !== 3) return null;
    return { schema: root.SNC_AUTHORED_SAVE_SCHEMA, pickups, npcs: g.npcs.map(row => ({ id: row.id, helped: row.helped === true })), exit: { active: !!(g.exit && g.exit.active) } };
  }
  function sncValidateAuthoredMutableOverlay(levelId, overlay, seed){
    const g = runtimeGame(), useSeed = isFiniteNumber(seed) ? seed : (g && g.seed);
    const baseline = expectedPickups(levelId, useSeed), source = root.sncGetAuthoredLevelDefinition(levelId), errors = [];
    if(!baseline || !source) return { pass: false, errors: ['unknown authored level or seed'], value: null };
    if(!overlay || !hasExactKeys(overlay, ['schema', 'pickups', 'npcs', 'exit']) || overlay.schema !== root.SNC_AUTHORED_SAVE_SCHEMA) errors.push('overlay fields mismatch');
    const pickups = overlay && overlay.pickups, npcs = overlay && overlay.npcs;
    if(!Array.isArray(pickups) || pickups.length !== baseline.length) errors.push('pickup cardinality mismatch');
    if(!Array.isArray(npcs) || npcs.length !== source.npcs.length) errors.push('NPC cardinality mismatch');
    if(Array.isArray(pickups)) pickups.forEach((row, i) => { const expected = baseline[i]; if(!row || !hasExactKeys(row, ['id','taken','amt']) || row.id !== expected.id || typeof row.taken !== 'boolean' || row.amt !== 1) errors.push('pickup mismatch at ' + i); });
    if(Array.isArray(npcs)) npcs.forEach((row, i) => { if(!row || !hasExactKeys(row, ['id','helped']) || row.id !== `npc-${String(i).padStart(2, '0')}` || typeof row.helped !== 'boolean') errors.push('NPC mismatch at ' + i); });
    if(!overlay || !hasExactKeys(overlay.exit, ['active']) || typeof overlay.exit.active !== 'boolean') errors.push('exit overlay invalid');
    if(errors.length) return { pass: false, errors, value: null };
    return { pass: true, errors: [], value: { schema: root.SNC_AUTHORED_SAVE_SCHEMA, pickups: pickups.map(clone), npcs: npcs.map(clone), exit: { active: overlay.exit.active } } };
  }
  function sncApplyAuthoredMutableOverlay(levelId, validatedOverlay, seed){
    const g = runtimeGame(); if(!g || g.authoredLevelId !== levelId) return false;
    const checked = sncValidateAuthoredMutableOverlay(levelId, validatedOverlay, seed); if(!checked.pass) return false;
    const pickupById = new Map(g.pickups.map(row => [row.id, row])); const npcById = new Map(g.npcs.map(row => [row.id, row]));
    for(const saved of checked.value.pickups){ const row = pickupById.get(saved.id); if(!row) return false; row.taken = saved.taken; row.amt = saved.taken ? 0 : saved.amt; }
    for(const saved of checked.value.npcs){ const row = npcById.get(saved.id); if(!row) return false; row.helped = saved.helped; }
    g.exit.active = checked.value.exit.active; return true;
  }

  Object.assign(root, { sncValidateAuthoredLevelDefinition, sncSelectedCanSockets, sncPrepareAuthoredLevelState, sncCommitAuthoredLevelState, sncInstallAuthoredLevel, sncCaptureAuthoredMutableOverlay, sncValidateAuthoredMutableOverlay, sncApplyAuthoredMutableOverlay });
})(globalThis);
