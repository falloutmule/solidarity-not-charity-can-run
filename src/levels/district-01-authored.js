(function(root){
  'use strict';

  const SNC_AUTHORED_LEVEL_ID = 'district-1-authored-v1';
  const SNC_AUTHORED_LEVEL_SCHEMA = 'snc-authored-level-static-v2';
  const SNC_AUTHORED_LEVEL_STATIC_BYTES = 5563;
  const SNC_AUTHORED_LEVEL_STATIC_SHA256 = '57af17f6d0f40f0db16eb1194da5aaeabc9e00b3863e14c6c947539c511fbe80';
  const SNC_AUTHORED_SAVE_SCHEMA = 'snc-authored-save-overlay-v2';

  function deepFreeze(value){
    if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    for(const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }

  function makeTheStandMapRows(){
    const width = 40, height = 20;
    const cells = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || x === width - 1 || y === height - 1) ? '8' : '0'));
    // The stand is the central anchor. The smaller street-edge building gives the
    // outer sprint loop a different silhouette without cutting either route off.
    for(let y = 7; y <= 9; y++) for(let x = 17; x <= 22; x++) cells[y][x] = '1';
    for(let y = 2; y <= 4; y++) for(let x = 30; x <= 35; x++) cells[y][x] = '1';
    // Two deliberately broken planter clusters: every block has a visible end and walkable gap.
    for(const [x, y] of [[10,10], [12,10], [10,12], [28,12], [30,12], [30,14]]) cells[y][x] = '2';
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
    buildings: [
      { id: 'snc-stand', assetId: 'custom_next_001', x: 17, y: 7, rotation: 0, widthCells: 6, depthCells: 3, front: 'south' },
      { id: 'outer-street-market', assetId: 'strip_mall_001', x: 30, y: 2, rotation: 0, widthCells: 6, depthCells: 3, front: 'south' }
    ],
    environmentObjects: [
      { id: 'central-planter-00', assetId: 'low_block_concrete_001', x: 10, y: 10, rotation: 0, widthCells: 1, depthCells: 1 },
      { id: 'central-planter-01', assetId: 'low_block_concrete_001', x: 10, y: 12, rotation: 0, widthCells: 1, depthCells: 1 },
      { id: 'central-planter-02', assetId: 'low_block_concrete_001', x: 12, y: 10, rotation: 1, widthCells: 1, depthCells: 1 },
      { id: 'outer-planter-00', assetId: 'low_block_concrete_001', x: 28, y: 12, rotation: 2, widthCells: 1, depthCells: 1 },
      { id: 'outer-planter-01', assetId: 'low_block_concrete_001', x: 30, y: 12, rotation: 2, widthCells: 1, depthCells: 1 },
      { id: 'outer-planter-02', assetId: 'low_block_concrete_001', x: 30, y: 14, rotation: 3, widthCells: 1, depthCells: 1 }
    ],
    canSockets: [
      { id: 'can-socket-00', x: 15.5, y: 12.5 }, { id: 'can-socket-01', x: 24.5, y: 12.5 },
      { id: 'can-socket-02', x: 13.5, y: 12.5 }, { id: 'can-socket-03', x: 5.5, y: 5.5 },
      { id: 'can-socket-04', x: 7.5, y: 15.5 }, { id: 'can-socket-05', x: 15.5, y: 4.5 },
      { id: 'can-socket-06', x: 29.5, y: 10.5 }, { id: 'can-socket-07', x: 34.5, y: 5.5 },
      { id: 'can-socket-08', x: 33.5, y: 15.5 }
    ],
    pickupCount: 5,
    npcs: [
      { x: 8.5, y: 8.5, kind: 'hungry', assetId: 'npc_unhoused_work_jacket_001', need: 1 },
      { x: 20.5, y: 4.5, kind: 'family', assetId: 'npc_household_parent_child_001', need: 3 },
      { x: 32.5, y: 12.5, kind: 'elder', assetId: 'npc_volunteer_elder_cane_001', need: 1 }
    ],
    quota: 3,
    requiredCans: 5,
    carryingCapacity: 3,
    props: [
      // Stand forecourt: two labeled signs, pantry crates, and a cooler make the
      // central building readable at the starting pose and keep the portal grounded here.
      { x: 19.2, y: 10.6, kind: 'signboard', label: 'SNC\nCAN STAND', assetId: 'sign_snc_can_station_001', signSizeClass: 'landmark' },
      { x: 21.8, y: 10.6, kind: 'signboard', label: 'DROP OFF\nCANS', assetId: 'sign_drop_off_cans_001', signSizeClass: 'tall' },
      { x: 17.2, y: 10.9, kind: 'crate_stack' }, { x: 22.8, y: 10.9, kind: 'cooler' },
      { x: 18.0, y: 11.9, kind: 'bench' }, { x: 22.0, y: 11.9, kind: 'bench' },
      // Central park loop: a broken planter cluster and a one-can neighborhood stop.
      { x: 9.0, y: 8.1, kind: 'signboard', label: 'NEIGHBOR\n1 CAN', assetId: 'sign_neighbor_1_can_001', signSizeClass: 'standard' },
      { x: 7.2, y: 9.5, kind: 'bench' }, { x: 9.4, y: 10.9, kind: 'scrub_bush' },
      { x: 11.1, y: 9.4, kind: 'agave' }, { x: 12.9, y: 11.0, kind: 'scrub_bush' },
      // North crossover is the family stop and clear link between the two loops.
      { x: 18.0, y: 5.1, kind: 'signboard', label: 'FAMILY\n3 CANS', assetId: 'sign_family_3_cans_001', signSizeClass: 'standard' },
      { x: 22.7, y: 5.1, kind: 'shopping_cart' }, { x: 20.5, y: 5.6, kind: 'cooler' },
      // Outer sprint loop: the market facade, split planter cluster, and elder stop.
      { x: 29.0, y: 10.8, kind: 'signboard', label: 'OUTER LOOP\nMARKET', assetId: 'sign_summer_loop_market_001', signSizeClass: 'landmark' },
      { x: 31.0, y: 11.1, kind: 'bench' }, { x: 28.4, y: 13.5, kind: 'agave' },
      { x: 31.4, y: 13.8, kind: 'scrub_bush' }, { x: 33.0, y: 11.0, kind: 'signboard', label: 'NEIGHBOR\n1 CAN', assetId: 'sign_neighbor_1_can_001', signSizeClass: 'standard' },
      { x: 34.2, y: 13.0, kind: 'mailbox' }, { x: 26.5, y: 15.5, kind: 'utility_box' },
      // Sparse edge cues guide the longer route without walling it off.
      { x: 5.5, y: 5.5, kind: 'mural_panel' }, { x: 6.5, y: 15.5, kind: 'bench' },
      { x: 34.5, y: 5.5, kind: 'mural_panel' }, { x: 35.0, y: 15.5, kind: 'mailbox' }
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
