(function(root){
  'use strict';

  const SNC_AUTHORED_LEVEL_ID = 'district-1-authored-v1';
  const SNC_AUTHORED_LEVEL_SCHEMA = 'snc-authored-level-static-v1';
  const SNC_AUTHORED_LEVEL_STATIC_BYTES = 3516;
  const SNC_AUTHORED_LEVEL_STATIC_SHA256 = '98168c6d1b5c72bbf802ad69caf2badfa2228d878a9b712f72f4a4cae00bdd82';
  const SNC_AUTHORED_SAVE_SCHEMA = 'snc-authored-save-overlay-v1';

  function deepFreeze(value){
    if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    for(const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function sncBuildLockedStaticLevel(source){
    const withIds = (prefix, rows, extra) => rows.map((row, i) => Object.assign(
      { id: `${prefix}-${String(i).padStart(2, '0')}` }, row, extra
    ));
    return {
      schema: 'snc-authored-level-static-v1',
      levelId: source.id,
      district: source.district,
      width: source.grid.width,
      height: source.grid.height,
      mapRows: source.mapRows,
      wallShade: { width: 40, height: 20, fill: 0.5 },
      streetLayoutMeta: { roadY0: 8, roadY1: 11, GW: 40, GH: 20 },
      building: {
        id: source.buildings[0].id,
        ownerBid: 1,
        assetId: source.buildings[0].assetId,
        renderMode: 'importedWholeFaceAsset',
        x: source.buildings[0].x,
        y: source.buildings[0].y,
        rotation: source.buildings[0].rotation,
        widthCells: source.buildings[0].widthCells,
        depthCells: source.buildings[0].depthCells,
        front: source.buildings[0].front
      },
      playerStart: source.playerStart,
      pickups: withIds('pickup', source.pickups, { taken: false, wob: 0 }),
      npcs: withIds('npc', source.npcs, { helped: false, wob: 0, thank: '' }),
      props: withIds('prop', source.props, { wob: 0 }),
      quota: source.quota,
      exit: source.exit,
      timeLeftPolicy: source.timeLeftPolicy,
      scoreMultiplierPolicy: source.scoreMultiplierPolicy
    };
  }

  function canonicalValue(value){
    if(Array.isArray(value)) return value.map(canonicalValue);
    if(value && typeof value === 'object'){
      const out = {};
      for(const key of Object.keys(value).sort()) out[key] = canonicalValue(value[key]);
      return out;
    }
    return value;
  }

  function sncCanonicalizeAuthoredStatic(value){
    return JSON.stringify(canonicalValue(value));
  }

  const SNC_AUTHORED_LEVEL_01 = deepFreeze({
    schemaVersion: 1,
    staticSchema: SNC_AUTHORED_LEVEL_SCHEMA,
    staticHashAlgorithm: 'sha256-canonical-json-lexicographic-v1',
    staticByteLength: SNC_AUTHORED_LEVEL_STATIC_BYTES,
    staticSha256: SNC_AUTHORED_LEVEL_STATIC_SHA256,
    id: SNC_AUTHORED_LEVEL_ID,
    district: 1,
    grid: { width: 40, height: 20 },
    mapEncoding: {
      '0': 'walkable asphalt/open space',
      '1': 'custom bitmap building footprint',
      '8': 'concrete map boundary'
    },
    mapRows: [
      '8888888888888888888888888888888888888888',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000011111100000000000000000000000008',
      '8000000011111100000000000000000000000008',
      '8000000011111100000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8000000000000000000000000000000000000008',
      '8888888888888888888888888888888888888888'
    ],
    wallShade: { width: 40, height: 20, fill: 0.5 },
    streetLayoutMeta: { roadY0: 8, roadY1: 11, GW: 40, GH: 20 },
    playerStart: {
      x: 11.0,
      y: 10.5,
      angleRadians: -1.5707963267948966,
      faces: 'north_toward_building_south_front'
    },
    buildings: [{
      id: 'district-1-main-landmark',
      assetId: 'custom_next_001',
      x: 8,
      y: 5,
      rotation: 0,
      widthCells: 6,
      depthCells: 3,
      front: 'south'
    }],
    pickups: [
      { x: 4.5, y: 10.5, amt: 1 },
      { x: 5.5, y: 15.5, amt: 2 },
      { x: 10.5, y: 15.5, amt: 1 },
      { x: 16.5, y: 10.5, amt: 2 },
      { x: 18.5, y: 4.5, amt: 1 },
      { x: 22.5, y: 14.5, amt: 2 },
      { x: 26.5, y: 6.5, amt: 1 },
      { x: 30.5, y: 11.5, amt: 1 },
      { x: 34.5, y: 4.5, amt: 2 },
      { x: 35.5, y: 16.5, amt: 1 }
    ],
    npcs: [
      { x: 4.5, y: 5.5, kind: 'hungry', need: 1 },
      { x: 18.5, y: 8.5, kind: 'family', need: 3 },
      { x: 23.5, y: 4.5, kind: 'elder', need: 1 },
      { x: 27.5, y: 14.5, kind: 'volunteer', need: 1 },
      { x: 33.5, y: 8.5, kind: 'hungry', need: 1 },
      { x: 32.5, y: 15.5, kind: 'family', need: 3 }
    ],
    quota: 4,
    props: [
      { x: 5.5, y: 9.0, kind: 'bench' },
      { x: 16.0, y: 5.0, kind: 'mural_panel' },
      { x: 16.0, y: 8.5, kind: 'utility_box' },
      { x: 5.5, y: 3.5, kind: 'scrub_bush' },
      { x: 16.5, y: 3.0, kind: 'agave' },
      { x: 6.5, y: 14.0, kind: 'cooler' },
      { x: 18.0, y: 12.5, kind: 'crate_stack' },
      { x: 24.0, y: 10.0, kind: 'shopping_cart' },
      { x: 30.0, y: 4.0, kind: 'mailbox' },
      { x: 34.0, y: 13.0, kind: 'tarp_bundle' },
      { x: 21.0, y: 17.0, kind: 'signboard' },
      { x: 28.0, y: 17.0, kind: 'sleeping_bag_pile' }
    ],
    exit: { x: 36.5, y: 17.0, active: false },
    timeLeftPolicy: 'preserve cfg.baseTime + (district-1)*8',
    scoreMultiplierPolicy: 'preserve modifier rules'
  });

  const SNC_AUTHORED_LEVEL_REGISTRY = deepFreeze({
    [SNC_AUTHORED_LEVEL_ID]: SNC_AUTHORED_LEVEL_01
  });

  function sncGetAuthoredLevelDefinition(levelId){
    return SNC_AUTHORED_LEVEL_REGISTRY[levelId] || null;
  }

  function sncAuthoredStaticIdentity(levelId){
    if(!sncGetAuthoredLevelDefinition(levelId)) return null;
    return {
      schema: SNC_AUTHORED_LEVEL_SCHEMA,
      byteLength: SNC_AUTHORED_LEVEL_STATIC_BYTES,
      sha256: SNC_AUTHORED_LEVEL_STATIC_SHA256
    };
  }

  Object.assign(root, {
    SNC_AUTHORED_LEVEL_ID,
    SNC_AUTHORED_LEVEL_SCHEMA,
    SNC_AUTHORED_LEVEL_STATIC_BYTES,
    SNC_AUTHORED_LEVEL_STATIC_SHA256,
    SNC_AUTHORED_SAVE_SCHEMA,
    SNC_AUTHORED_LEVEL_01,
    SNC_AUTHORED_LEVEL_REGISTRY,
    sncGetAuthoredLevelDefinition,
    sncBuildLockedStaticLevel,
    sncCanonicalizeAuthoredStatic,
    sncAuthoredStaticIdentity
  });
})(globalThis);
