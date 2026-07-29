(function(root){
  'use strict';

  const SNC_AUTHORED_LEVEL_ID = 'district-1-authored-v1';
  const SNC_AUTHORED_LEVEL_SCHEMA = 'snc-authored-level-static-v2';
  const SNC_AUTHORED_LEVEL_STATIC_BYTES = 3768;
  const SNC_AUTHORED_LEVEL_STATIC_SHA256 = '803ed8dba1f272fac12b053e1811c47f7c402e45372c0aecd32ddae239d2c729';
  const SNC_AUTHORED_SAVE_SCHEMA = 'snc-authored-save-overlay-v2';

  function deepFreeze(value){
    if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    for(const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function makeTheStandMapRows(){
    const width = 40, height = 20;
    const cells = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1) ? '8' : '0'));
    for(let y = 7; y <= 9; y++) for(let x = 17; x <= 22; x++) cells[y][x] = '1';
    for(const [x, y] of [[14,5], [15,5], [14,6], [26,13], [27,13], [27,14]]) cells[y][x] = '2';
    return cells.map(row => row.join(''));
  }

  function withIds(prefix, rows, extra){
    return rows.map((row, i) => Object.assign({ id: `${prefix}-${String(i).padStart(2, '0')}` }, row, extra));
  }

  function sncBuildLockedStaticLevel(source){
    return {
      schema: SNC_AUTHORED_LEVEL_SCHEMA,
      levelId: source.id,
      levelName: source.name,
      district: source.district,
      width: source.grid.width,
      height: source.grid.height,
      mapRows: source.mapRows,
      mapEncoding: source.mapEncoding,
      wallShade: source.wallShade,
      streetLayoutMeta: source.streetLayoutMeta,
      buildings: source.buildings,
      environmentObjects: source.environmentObjects,
      playerStart: source.playerStart,
      canSockets: source.canSockets,
      pickupCount: source.pickupCount,
      npcs: withIds('npc', source.npcs, { helped: false, wob: 0, thank: '' }),
      props: withIds('prop', source.props, { wob: 0 }),
      quota: source.quota,
      requiredCans: source.requiredCans,
      carryingCapacity: source.carryingCapacity,
      exit: source.exit,
      timeLeftPolicy: source.timeLeftPolicy,
      timerExpiryPolicy: source.timerExpiryPolicy,
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

  function sncCanonicalizeAuthoredStatic(value){ return JSON.stringify(canonicalValue(value)); }

  const SNC_AUTHORED_LEVEL_01 = deepFreeze({
    schemaVersion: 2,
    staticSchema: SNC_AUTHORED_LEVEL_SCHEMA,
    staticHashAlgorithm: 'sha256-canonical-json-lexicographic-v1',
    staticByteLength: SNC_AUTHORED_LEVEL_STATIC_BYTES,
    staticSha256: SNC_AUTHORED_LEVEL_STATIC_SHA256,
    id: SNC_AUTHORED_LEVEL_ID,
    name: 'World 1, Level 1 — The Stand',
    district: 1,
    grid: { width: 40, height: 20 },
    mapEncoding: {
      '0': 'walkable park path and street edge',
      '1': 'SNC stand bitmap-building footprint',
      '2': 'solid half-height concrete planter block',
      '8': 'full-height concrete boundary'
    },
    mapRows: makeTheStandMapRows(),
    wallShade: { width: 40, height: 20, fill: 0.5 },
    streetLayoutMeta: { topology: 'figure-eight', centralLoop: 'short-turning', outerLoop: 'sprint', GW: 40, GH: 20 },
    playerStart: { x: 20.5, y: 14.5, angleRadians: -1.5707963267948966, faces: 'north_toward_the_stand' },
    buildings: [{ id: 'snc-stand', assetId: 'custom_next_001', x: 17, y: 7, rotation: 0, widthCells: 6, depthCells: 3, front: 'south' }],
    environmentObjects: [
      { id: 'north-planter-00', assetId: 'low_block_concrete_001', x: 14, y: 5, rotation: 0, widthCells: 1, depthCells: 1 },
      { id: 'north-planter-01', assetId: 'low_block_concrete_001', x: 15, y: 5, rotation: 0, widthCells: 1, depthCells: 1 },
      { id: 'north-planter-02', assetId: 'low_block_concrete_001', x: 14, y: 6, rotation: 0, widthCells: 1, depthCells: 1 },
      { id: 'southeast-planter-00', assetId: 'low_block_concrete_001', x: 26, y: 13, rotation: 1, widthCells: 1, depthCells: 1 },
      { id: 'southeast-planter-01', assetId: 'low_block_concrete_001', x: 27, y: 13, rotation: 1, widthCells: 1, depthCells: 1 },
      { id: 'southeast-planter-02', assetId: 'low_block_concrete_001', x: 27, y: 14, rotation: 1, widthCells: 1, depthCells: 1 }
    ],
    canSockets: [
      { id: 'can-socket-00', x: 15.5, y: 12.5 }, { id: 'can-socket-01', x: 24.5, y: 12.5 },
      { id: 'can-socket-02', x: 10.5, y: 10.5 }, { id: 'can-socket-03', x: 5.5, y: 5.5 },
      { id: 'can-socket-04', x: 7.5, y: 15.5 }, { id: 'can-socket-05', x: 15.5, y: 4.5 },
      { id: 'can-socket-06', x: 29.5, y: 10.5 }, { id: 'can-socket-07', x: 34.5, y: 5.5 },
      { id: 'can-socket-08', x: 33.5, y: 15.5 }
    ],
    pickupCount: 5,
    npcs: [
      { x: 11.5, y: 8.5, kind: 'hungry', need: 1 },
      { x: 20.5, y: 4.5, kind: 'family', need: 3 },
      { x: 29.5, y: 12.5, kind: 'elder', need: 1 }
    ],
    quota: 3,
    requiredCans: 5,
    carryingCapacity: 3,
    props: [
      { x: 12.5, y: 12.5, kind: 'bench' }, { x: 24.5, y: 14.5, kind: 'bench' },
      { x: 16.0, y: 11.5, kind: 'signboard' }, { x: 24.0, y: 10.5, kind: 'crate_stack' },
      { x: 8.5, y: 7.5, kind: 'mailbox' }, { x: 31.5, y: 7.5, kind: 'utility_box' },
      { x: 5.5, y: 12.5, kind: 'scrub_bush' }, { x: 34.5, y: 12.5, kind: 'agave' }
    ],
    exit: { x: 20.5, y: 10.7, active: false },
    timeLeftPolicy: 'count down from cfg.baseTime; timer measures completion only',
    timerExpiryPolicy: 'continue',
    scoreMultiplierPolicy: 'preserve modifier rules'
  });

  const SNC_AUTHORED_LEVEL_REGISTRY = deepFreeze({ [SNC_AUTHORED_LEVEL_ID]: SNC_AUTHORED_LEVEL_01 });
  function sncGetAuthoredLevelDefinition(levelId){ return SNC_AUTHORED_LEVEL_REGISTRY[levelId] || null; }
  function sncAuthoredStaticIdentity(levelId){
    if(!sncGetAuthoredLevelDefinition(levelId)) return null;
    return { schema: SNC_AUTHORED_LEVEL_SCHEMA, byteLength: SNC_AUTHORED_LEVEL_STATIC_BYTES, sha256: SNC_AUTHORED_LEVEL_STATIC_SHA256 };
  }

  Object.assign(root, {
    SNC_AUTHORED_LEVEL_ID, SNC_AUTHORED_LEVEL_SCHEMA, SNC_AUTHORED_LEVEL_STATIC_BYTES, SNC_AUTHORED_LEVEL_STATIC_SHA256,
    SNC_AUTHORED_SAVE_SCHEMA, SNC_AUTHORED_LEVEL_01, SNC_AUTHORED_LEVEL_REGISTRY, sncGetAuthoredLevelDefinition,
    sncBuildLockedStaticLevel, sncCanonicalizeAuthoredStatic, sncAuthoredStaticIdentity
  });
})(globalThis);
