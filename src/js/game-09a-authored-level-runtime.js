(function(root){
  'use strict';

  const preparedStates = new WeakSet();
  const lockedDefinition = root.sncGetAuthoredLevelDefinition(root.SNC_AUTHORED_LEVEL_ID);
  const lockedCanonical = root.sncCanonicalizeAuthoredStatic(root.sncBuildLockedStaticLevel(lockedDefinition));

  function runtimeGame(){
    if(typeof game !== 'undefined') return game;
    return root.game || null;
  }

  function runtimePlayer(){
    if(typeof player !== 'undefined') return player;
    return root.player || null;
  }

  function runtimeCfg(){
    if(typeof cfg !== 'undefined') return cfg;
    return root.cfg || null;
  }

  function clone(value){
    if(Array.isArray(value)) return value.map(clone);
    if(value && typeof value === 'object'){
      const out = {};
      for(const key of Object.keys(value)) out[key] = clone(value[key]);
      return out;
    }
    return value;
  }

  function isFiniteNumber(value){
    return typeof value === 'number' && Number.isFinite(value);
  }

  function hasExactKeys(value, expected){
    if(!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const actual = Object.keys(value).sort();
    const wanted = expected.slice().sort();
    return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
  }

  function sncValidateAuthoredLevelDefinition(source){
    const errors = [];
    if(!source || typeof source !== 'object') return { pass: false, errors: ['definition must be an object'] };
    if(source.id !== root.SNC_AUTHORED_LEVEL_ID) errors.push('level ID mismatch');
    if(source.schemaVersion !== 1) errors.push('schema version mismatch');
    if(source.staticSchema !== root.SNC_AUTHORED_LEVEL_SCHEMA) errors.push('static schema mismatch');
    if(source.staticHashAlgorithm !== 'sha256-canonical-json-lexicographic-v1') errors.push('static hash algorithm mismatch');
    if(source.staticByteLength !== root.SNC_AUTHORED_LEVEL_STATIC_BYTES) errors.push('static byte length mismatch');
    if(source.staticSha256 !== root.SNC_AUTHORED_LEVEL_STATIC_SHA256) errors.push('static SHA-256 mismatch');
    if(source.district !== 1) errors.push('district mismatch');
    if(!source.grid || source.grid.width !== 40 || source.grid.height !== 20) errors.push('grid dimensions mismatch');
    if(!Array.isArray(source.mapRows) || source.mapRows.length !== 20 || source.mapRows.some(row => typeof row !== 'string' || row.length !== 40 || /[^018]/.test(row))) errors.push('map rows invalid');
    if(!source.mapEncoding || source.mapEncoding['0'] !== 'walkable asphalt/open space' || source.mapEncoding['1'] !== 'custom bitmap building footprint' || source.mapEncoding['8'] !== 'concrete map boundary') errors.push('map encoding mismatch');
    if(!source.wallShade || source.wallShade.width !== 40 || source.wallShade.height !== 20 || source.wallShade.fill !== 0.5) errors.push('wall shade policy mismatch');
    if(!source.streetLayoutMeta || source.streetLayoutMeta.roadY0 !== 8 || source.streetLayoutMeta.roadY1 !== 11 || source.streetLayoutMeta.GW !== 40 || source.streetLayoutMeta.GH !== 20) errors.push('street compatibility metadata mismatch');
    if(source.timeLeftPolicy !== 'preserve cfg.baseTime + (district-1)*8') errors.push('time policy mismatch');
    if(source.scoreMultiplierPolicy !== 'preserve modifier rules') errors.push('score policy mismatch');
    try {
      const canonical = root.sncCanonicalizeAuthoredStatic(root.sncBuildLockedStaticLevel(source));
      if(canonical !== lockedCanonical) errors.push('canonical static level drift');
      if(canonical.length !== root.SNC_AUTHORED_LEVEL_STATIC_BYTES) errors.push('canonical preimage byte length mismatch');
    } catch(error){
      errors.push('static builder failed: ' + String(error && error.message ? error.message : error));
    }
    return { pass: errors.length === 0, errors };
  }

  function decodeMap(source){
    const buildingWall = (typeof WALL !== 'undefined' && WALL && WALL.BUILDING) || 1;
    const concreteWall = (typeof WALL !== 'undefined' && WALL && WALL.CONCRETE) || 8;
    return source.mapRows.map(row => Array.from(row, char => char === '0' ? 0 : (char === '1' ? buildingWall : concreteWall)));
  }

  function buildRegistryAndGrid(level){
    const grid = Array.from({ length: level.height }, () => new Array(level.width).fill(null));
    const b = level.building;
    const entry = {
      bid: 1,
      id: b.id,
      assetId: b.assetId,
      renderMode: b.renderMode,
      x: b.x,
      y: b.y,
      x0: b.x,
      y0: b.y,
      rotation: b.rotation,
      widthCells: b.widthCells,
      depthCells: b.depthCells,
      w: b.widthCells,
      h: b.depthCells,
      footprint: { widthCells: b.widthCells, depthCells: b.depthCells },
      front: b.front
    };
    for(let ly = 0; ly < b.depthCells; ly++){
      for(let lx = 0; lx < b.widthCells; lx++) grid[b.y + ly][b.x + lx] = { bid: 1, lx, ly };
    }
    return { registry: { 1: entry }, grid };
  }

  function sncPrepareAuthoredLevelState(levelId, options){
    const source = root.sncGetAuthoredLevelDefinition(levelId);
    const validation = sncValidateAuthoredLevelDefinition(source);
    if(!validation.pass) return null;
    options = options || {};
    if(!isFiniteNumber(options.seed) || typeof options.modifier !== 'string') return null;
    const staticLevel = root.sncBuildLockedStaticLevel(source);
    const ownership = buildRegistryAndGrid(staticLevel);
    const config = runtimeCfg();
    if(!config || !isFiniteNumber(config.baseTime)) return null;
    const modifier = options.modifier || '';
    const prepared = {
      validated: true,
      levelId,
      authoredLevelSchema: root.SNC_AUTHORED_LEVEL_SCHEMA,
      authoredStaticSha256: root.SNC_AUTHORED_LEVEL_STATIC_SHA256,
      seed: options.seed,
      district: 1,
      modifier,
      scoreMult: modifier === 'shortage' ? 1.5 : 1,
      map: decodeMap(source),
      MAP_W: 40,
      MAP_H: 20,
      wallShade: Array.from({ length: 20 }, () => Array(40).fill(0.5)),
      streetLayoutMeta: clone(staticLevel.streetLayoutMeta),
      buildingRegistry: ownership.registry,
      buildingGrid: ownership.grid,
      buildingMaterialGrid: Array.from({ length: 20 }, () => new Array(40).fill(null)),
      buildingMaterialComponents: {},
      nextBuildingId: 2,
      playerStart: { x: staticLevel.playerStart.x, y: staticLevel.playerStart.y, angle: staticLevel.playerStart.angleRadians },
      pickups: clone(staticLevel.pickups),
      npcs: clone(staticLevel.npcs),
      props: clone(staticLevel.props),
      quota: staticLevel.quota,
      helped: 0,
      delivered: 0,
      exit: clone(staticLevel.exit),
      timeLeft: config.baseTime
    };
    preparedStates.add(prepared);
    return prepared;
  }

  function sncCommitAuthoredLevelState(prepared){
    const g = runtimeGame();
    const p = runtimePlayer();
    if(!g || !p || !prepared || !preparedStates.has(prepared) || prepared.validated !== true) return false;
    g.authoredLevelId = prepared.levelId;
    g.authoredLevelSchema = prepared.authoredLevelSchema;
    g.authoredStaticSha256 = prepared.authoredStaticSha256;
    g.seed = prepared.seed;
    g.district = prepared.district;
    g.modifier = prepared.modifier;
    g.scoreMult = prepared.scoreMult;
    g.map = prepared.map;
    g.MAP_W = prepared.MAP_W;
    g.MAP_H = prepared.MAP_H;
    g.wallShade = prepared.wallShade;
    g.streetLayoutMeta = prepared.streetLayoutMeta;
    g.buildingRegistry = prepared.buildingRegistry;
    g.buildingGrid = prepared.buildingGrid;
    g.buildingMaterialGrid = prepared.buildingMaterialGrid;
    g.buildingMaterialComponents = prepared.buildingMaterialComponents;
    g._nextBuildingId = prepared.nextBuildingId;
    g.pickups = prepared.pickups;
    g.npcs = prepared.npcs;
    g.props = prepared.props;
    g.quota = prepared.quota;
    g.helped = prepared.helped;
    g.delivered = prepared.delivered;
    g.exit = prepared.exit;
    g.timeLeft = prepared.timeLeft;
    g.d1ParkLandmark = null;
    g.d1CustomBuildingRegistry = null;
    g.customBuildingRegistry = null;
    g.d1CustomBuildingSlots = [];
    g.d1CustomBuildingViewer = null;
    g.d1CustomProofZone = null;
    g.d1CustomProofZoneCellMap = null;
    g.d1ProofIllegalHits = [];
    g.d1ProofZoneCellAudit = null;
    g.__stripMallProofPlacement = null;
    p.x = prepared.playerStart.x;
    p.y = prepared.playerStart.y;
    p.angle = prepared.playerStart.angle;
    preparedStates.delete(prepared);
    return true;
  }

  function sncInstallAuthoredLevel(levelId, options){
    const prepared = sncPrepareAuthoredLevelState(levelId, options);
    return prepared ? sncCommitAuthoredLevelState(prepared) : false;
  }

  function sncCaptureAuthoredMutableOverlay(levelId){
    const g = runtimeGame();
    if(!g || g.authoredLevelId !== levelId || levelId !== root.SNC_AUTHORED_LEVEL_ID) return null;
    const source = root.sncGetAuthoredLevelDefinition(levelId);
    if(!source) return null;
    const baseline = root.sncBuildLockedStaticLevel(source);
    if(!Array.isArray(g.pickups) || g.pickups.length !== baseline.pickups.length) return null;
    const pickupById = new Map();
    for(const row of g.pickups){
      if(!row || pickupById.has(row.id)) return null;
      pickupById.set(row.id, row);
    }
    const pickups = [];
    for(const expected of baseline.pickups){
      const row = pickupById.get(expected.id);
      if(!row) return null;
      pickups.push({ id: expected.id, taken: row.taken === true || row.amt <= 0, amt: expected.amt });
    }
    return {
      schema: root.SNC_AUTHORED_SAVE_SCHEMA,
      pickups,
      npcs: g.npcs.map(row => ({ id: row.id, helped: row.helped === true })),
      exit: { active: !!(g.exit && g.exit.active) }
    };
  }

  function sncValidateAuthoredMutableOverlay(levelId, overlay){
    const errors = [];
    const source = root.sncGetAuthoredLevelDefinition(levelId);
    if(!source) return { pass: false, errors: ['unknown authored level'], value: null };
    const baseline = root.sncBuildLockedStaticLevel(source);
    if(!overlay || typeof overlay !== 'object' || Array.isArray(overlay)) errors.push('overlay must be an object');
    if(!errors.length && !hasExactKeys(overlay, ['schema', 'pickups', 'npcs', 'exit'])) errors.push('overlay fields mismatch');
    if(!errors.length && overlay.schema !== root.SNC_AUTHORED_SAVE_SCHEMA) errors.push('overlay schema mismatch');
    const pickupRows = !errors.length && Array.isArray(overlay.pickups) ? overlay.pickups : [];
    const npcRows = !errors.length && Array.isArray(overlay.npcs) ? overlay.npcs : [];
    if(!Array.isArray(overlay && overlay.pickups) || pickupRows.length !== baseline.pickups.length) errors.push('pickup cardinality mismatch');
    if(!Array.isArray(overlay && overlay.npcs) || npcRows.length !== baseline.npcs.length) errors.push('NPC cardinality mismatch');
    const pickupIds = new Set();
    for(let i = 0; i < pickupRows.length; i++){
      const row = pickupRows[i];
      const expected = baseline.pickups[i];
      if(!row || typeof row !== 'object') { errors.push('pickup record invalid at ' + i); continue; }
      if(!hasExactKeys(row, ['id', 'taken', 'amt'])) errors.push('pickup fields mismatch at ' + i);
      if(row.id !== expected.id) errors.push('pickup ID sequence mismatch at ' + i);
      if(pickupIds.has(row.id)) errors.push('duplicate pickup ID ' + row.id);
      pickupIds.add(row.id);
      if(typeof row.taken !== 'boolean') errors.push('pickup taken must be Boolean at ' + i);
      if(!isFiniteNumber(row.amt) || row.amt !== expected.amt) errors.push('pickup amount mismatch at ' + i);
    }
    const npcIds = new Set();
    for(let i = 0; i < npcRows.length; i++){
      const row = npcRows[i];
      const expected = baseline.npcs[i];
      if(!row || typeof row !== 'object') { errors.push('NPC record invalid at ' + i); continue; }
      if(!hasExactKeys(row, ['id', 'helped'])) errors.push('NPC fields mismatch at ' + i);
      if(row.id !== expected.id) errors.push('NPC ID sequence mismatch at ' + i);
      if(npcIds.has(row.id)) errors.push('duplicate NPC ID ' + row.id);
      npcIds.add(row.id);
      if(typeof row.helped !== 'boolean') errors.push('NPC helped must be Boolean at ' + i);
    }
    if(!overlay || !hasExactKeys(overlay.exit, ['active']) || typeof overlay.exit.active !== 'boolean') errors.push('exit overlay invalid');
    if(errors.length) return { pass: false, errors, value: null };
    return {
      pass: true,
      errors: [],
      value: {
        schema: root.SNC_AUTHORED_SAVE_SCHEMA,
        pickups: pickupRows.map(row => ({ id: row.id, taken: row.taken, amt: row.amt })),
        npcs: npcRows.map(row => ({ id: row.id, helped: row.helped })),
        exit: { active: overlay.exit.active }
      }
    };
  }

  function sncApplyAuthoredMutableOverlay(levelId, validatedOverlay){
    const g = runtimeGame();
    if(!g || g.authoredLevelId !== levelId) return false;
    const check = sncValidateAuthoredMutableOverlay(levelId, validatedOverlay);
    if(!check.pass) return false;
    const value = check.value;
    const pickupById = new Map(g.pickups.map(row => [row.id, row]));
    const npcById = new Map(g.npcs.map(row => [row.id, row]));
    for(const row of value.pickups) pickupById.get(row.id).taken = row.taken;
    for(const row of value.npcs) npcById.get(row.id).helped = row.helped;
    g.exit.active = value.exit.active;
    return true;
  }

  Object.assign(root, {
    sncValidateAuthoredLevelDefinition,
    sncPrepareAuthoredLevelState,
    sncCommitAuthoredLevelState,
    sncInstallAuthoredLevel,
    sncCaptureAuthoredMutableOverlay,
    sncValidateAuthoredMutableOverlay,
    sncApplyAuthoredMutableOverlay
  });
})(globalThis);
