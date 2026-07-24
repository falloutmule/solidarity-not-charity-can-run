// SECTION 3b// ---------------------------------------------------------------------------
// SECTION 3b — CUSTOM LEVELS
// ---------------------------------------------------------------------------
const CUSTOM_LEVELS = {
  hall_of_servants: {
    id: 'hall_of_servants',
    title: 'SNC Hall Of Servants',
    shortTitle: 'Hall Of Servants',
    generator: genHallOfServants,
    thankLines: [
      'Thank you. I can breathe for a minute.',
      'That helps more than you know.',
      "I'll pass it on.",
      'You saw me. Thank you.',
      'This gets me through today.',
      'Solidarity, not charity.',
      'I needed that.',
      'You showed up.',
    ],
    spriteKinds: [
      'hall_volunteer','hall_elder','hall_pantry','hall_street',
      'hall_quiet','hall_kitchen','hall_servant',
    ],
  },
  dumpster_pilot: {
    id: 'dumpster_pilot',
    title: 'Dumpster Pilot',
    shortTitle: 'Dumpster Pilot',
    generator: genDumpsterPilot,
    thankLines: [],
    spriteKinds: [],
  },
};

function hallFillMap(GW, GH){
  const map = [], shade = [];
  for(let y=0;y<GH;y++){
    const row = new Array(GW);
    const sh = new Array(GW);
    for(let x=0;x<GW;x++){
      if(y===0||y===GH-1||x===0||x===GW-1){ row[x]=WALL.CONCRETE; sh[x]=0.45; }
      else { row[x]=0; sh[x]=0.35; }
    }
    map.push(row); shade.push(sh);
  }
  return {map, shade};
}
function hallBrickBox(map, x0,y0,x1,y1, doorX, doorY){
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const edge = (y===y0||y===y1||x===x0||x===x1);
    if(!edge) continue;
    if(doorX!==undefined && x===doorX && y===doorY) continue;
    if(doorX!==undefined && y===doorY && x>=doorX-1 && x<=doorX+1) continue;
    map[y][x]=WALL.BRICK;
  }
}

function genHallOfServants(){
  const GW = 30, GH = 14;
  const {map, shade} = hallFillMap(GW, GH);
  // Pantry (north-west)
  hallBrickBox(map, 2, 2, 8, 5, 5, 5);
  // Gathering room (north-east)
  hallBrickBox(map, 20, 2, 26, 5, 23, 5);
  // South alcove
  hallBrickBox(map, 3, 9, 9, 12, 6, 9);
  // Kitchen nook
  hallBrickBox(map, 12, 9, 17, 12, 14, 9);
  // Corridor dividers (readable hall spine)
  for(let x=2;x<GW-2;x++){
    if(x<10||x>18){ map[6][x]=WALL.BRICK; map[8][x]=WALL.BRICK; }
  }
  map[6][14]=0; map[6][15]=0; map[8][14]=0; map[8][15]=0;
  // Reachability: connect north rooms to main spine (row 6 dividers blocked west/east doors)
  map[6][4]=0; map[6][5]=0; map[6][6]=0;
  map[6][22]=0; map[6][23]=0; map[6][24]=0;
  map[8][5]=0; map[8][6]=0; map[8][7]=0;

  game.map = map; game.MAP_W = GW; game.MAP_H = GH; game.wallShade = shade;
  game.modifier = 'clear';
  game.scoreMult = 1;

  player.x = 2.5; player.y = 7.0; player.angle = 0;
  const spawnCandidates = [
    [12.5, 7.0, 0], [11.5, 7.0, 0], [15.5, 7.0, 0], [12.5, 10.5, 0], [10.5, 7.0, 0],
  ];
  for(const [sx, sy, ang] of spawnCandidates){
    player.x = sx; player.y = sy; player.angle = ang;
    if(canStand(sx, sy)) break;
  }

  game.pickups = [
    {x:3.5,y:3.5,taken:false,amt:2,wob:0.2},
    {x:5.5,y:3.5,taken:false,amt:2,wob:1.1},
    {x:7.5,y:3.5,taken:false,amt:1,wob:2.0},
    {x:4.5,y:4.5,taken:false,amt:2,wob:0.8},
    {x:6.5,y:4.5,taken:false,amt:1,wob:1.7},
    {x:22.5,y:3.5,taken:false,amt:2,wob:0.5},
    {x:24.5,y:4.5,taken:false,amt:2,wob:1.3},
  ];

  const def = CUSTOM_LEVELS.hall_of_servants;
  game.npcs = [
    {x:11.5,y:7.0, kind:'hall_volunteer', need:1, helped:false, wob:0.0, thank:'You showed up.'},
    {x:14.5,y:7.0, kind:'hall_elder', need:1, helped:false, wob:0.6, thank:'Thank you. I can breathe for a minute.'},
    {x:16.5,y:7.0, kind:'hall_street', need:1, helped:false, wob:1.2, thank:'You saw me. Thank you.'},
    {x:19.5,y:7.0, kind:'hall_quiet', need:1, helped:false, wob:1.8, thank:'That helps more than you know.'},
    {x:5.5,y:10.5, kind:'hall_pantry', need:1, helped:false, wob:0.4, thank:"I'll pass it on."},
    {x:14.5,y:10.5, kind:'hall_kitchen', need:1, helped:false, wob:1.0, thank:'This gets me through today.'},
    {x:21.5,y:7.5, kind:'hall_servant', need:1, helped:false, wob:2.2, thank:'Solidarity, not charity.'},
  ];

  game.props = [
    {x:4.5,y:2.8,kind:'crate_stack',wob:0},
    {x:7.2,y:2.8,kind:'tarp_bundle',wob:0.5},
    {x:23.5,y:3.2,kind:'shopping_cart',wob:0.2},
    {x:13.5,y:6.2,kind:'signboard',wob:0},
    {x:18.5,y:6.2,kind:'utility_box',wob:0.7},
    {x:8.5,y:11.2,kind:'crate_stack',wob:0.3},
    {x:15.5,y:11.2,kind:'bench',wob:0.9},
    {x:12.5,y:7.4,kind:'cooler',wob:0.4},
    {x:3.8,y:5.2,kind:'mailbox',wob:0.1},
    {x:20.2,y:10.8,kind:'scrub_bush',wob:0.6},
  ];

  game.quota = 5;
  game.helped = 0; game.delivered = 0;
  game.exit = {x:27.5, y:7.0, active:false};
  game.timeLeft = 110;
  dbg.reachableCells = 0;
  dbg.cansSpawned = game.pickups.length;
  dbg.npcsSpawned = game.npcs.length;
  dbg.props = game.props.length;
  setMsg('SNC Hall Of Servants — fill the hall with care.');
}

// Generated placement companion: authoring/levels/dumpster-pilot/dumpster-pilot.tmj.
// This special level deliberately keeps the pilot outside District 1 and its save identity.
function genDumpsterPilot(){
  const GW = 8, GH = 8;
  const {map, shade} = hallFillMap(GW, GH);
  const asset = BITMAP_BUILDING_ASSET_REGISTRY && BITMAP_BUILDING_ASSET_REGISTRY.dumpster_001;
  if(!asset || asset.renderMode !== 'importedWholeFaceAsset') throw new Error('dumpster_001 imported bitmap asset is unavailable');
  const footprint = asset.footprint || {};
  const widthCells = Number(footprint.widthCells || footprint.wCells || footprint.w);
  const depthCells = Number(footprint.depthCells || footprint.hCells || footprint.h);
  const heightScale = Number.isFinite(asset.heightScale) ? asset.heightScale : 1;
  if(widthCells !== 1 || depthCells !== 2) throw new Error('dumpster_001 footprint must remain 1x2 cells');
  if(heightScale !== 0.5) throw new Error('dumpster_001 heightScale must remain 0.5');

  game.map = map; game.MAP_W = GW; game.MAP_H = GH; game.wallShade = shade;
  game.modifier = 'clear';
  game.scoreMult = 1;
  game.authoredLevelId = null;
  game.authoredLevelSchema = null;
  game.authoredStaticSha256 = null;
  crClearBuildingModules(GW, GH);

  const x0 = 3, y0 = 3, bid = game._nextBuildingId++;
  game.buildingRegistry[bid] = {
    bid,
    id: 'dumpster-pilot',
    assetId: asset.id,
    renderMode: 'importedWholeFaceAsset',
    x: x0, y: y0, x0, y0,
    rotation: 0,
    heightScale,
    widthCells, depthCells,
    w: widthCells, h: depthCells,
    footprint: { widthCells, depthCells },
    front: 'south',
  };
  for(let ly = 0; ly < depthCells; ly++){
    for(let lx = 0; lx < widthCells; lx++){
      map[y0 + ly][x0 + lx] = WALL.BUILDING;
      shade[y0 + ly][x0 + lx] = 0.5;
      game.buildingGrid[y0 + ly][x0 + lx] = { bid, lx, ly };
    }
  }

  player.x = 3.5; player.y = 6.5; player.angle = -Math.PI / 2;
  game.pickups = [];
  // This NPC is beyond the dumpster from the initial north-facing player pose.
  // Its upper body must remain visible over the short obstacle while its lower
  // portion remains correctly occluded.
  game.npcs = [{ x:3.5, y:2.5, kind:'family', helped:false }];
  game.props = [];
  game.quota = 0;
  game.helped = 0; game.delivered = 0;
  game.exit = {x:1.5, y:6.5, active:false};
  game.timeLeft = 110;
  dbg.reachableCells = 0;
  dbg.cansSpawned = 0;
  dbg.npcsSpawned = game.npcs.length;
  dbg.props = game.props.length;
  setMsg('Dumpster Pilot — walk around the 1×2 building.');
}

function clearInputState(){
  joy.active = false; joy.id = null; joy.ptrId = null;
  joy.x = 0; joy.y = 0; joy.dist = 0;
  if(typeof updateJoyDot === 'function') updateJoyDot(0, 0);
  tzone.active = false; tzone.id = null;
  lookTouch.id = null; lookTouch.lastX = 0;
  clearMoveInput();
  inp.give = inp.map = inp.pause = false;
  inp._lastMap = inp._lastPause = inp._lastGive = false;
  inp._active = false;
  confirmAction = null;
}
function sharedEnterPlay(){
  state = STATE.PLAY;
  paused = false;
  lookHintUsed = false;
  lookHintShownAt = performance.now();
  rmenuClearForGameplay();
  clearInputState();
  if(typeof setMobileMode === 'function' && typeof isMobile === 'function') setMobileMode(isMobile());
  applyMobileControlSettings();
  drawMobileMenu();
}

let onboardingOpen = false;

function syncOnboardingPanel(){
  const el = document.getElementById('cronboard');
  if(el) el.classList.toggle('show', onboardingOpen);
  const viewEl = document.getElementById('view');
  if(viewEl) viewEl.classList.toggle('onboard-dim', onboardingOpen && state === STATE.PLAY);
}

function showOnboardingHelp(opts){
  const o = opts || {};
  onboardingOpen = true;
  crTriggerSoundCue('menuHelp');
  if(o.fromPause && state === STATE.PLAY){ paused = true; rmenuHide(); }
  syncOnboardingPanel();
  drawMobileMenu();
}

function dismissOnboardingHelp(persist){
  const resumeFromPause = paused && state === STATE.PLAY;
  onboardingOpen = false;
  if(persist !== false){
    options.helpDismissed = true;
    options.save();
  }
  syncOnboardingPanel();
  if(resumeFromPause){
    paused = false;
    rmenuHide();
    clearInputState();
  }
  drawMobileMenu();
}

function maybeShowFirstRunHelp(){
  crOpenFirstRunHelpIfNeeded();
}

function crOpenFirstRunHelpIfNeeded(){
  if(options.helpDismissed) return;
  if(state !== STATE.PLAY) return;
  if(game.run && game.run.customLevel) return;
  onboardingOpen = true;
  syncOnboardingPanel();
}

function bindOnboardingHelp(){
  const ok = document.getElementById('cronboardok');
  if(!ok || ok._crOnboardBound) return;
  ok._crOnboardBound = true;
  ok.addEventListener('click', e=>{
    e.preventDefault();
    e.stopPropagation();
    dismissOnboardingHelp(true);
  });
}
function playerStandProbe(px, py){
  const r = 0.22;
  const pts = [
    [px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r],
    [px, py - r], [px, py + r], [px - r, py], [px + r, py],
  ];
  return pts.map(([x, y]) => ({
    x: +x.toFixed(2), y: +y.toFixed(2),
    tx: Math.floor(x), ty: Math.floor(y),
    walk: isWalkableAt(x, y),
    cell: game.map && game.map[Math.floor(y)] ? game.map[Math.floor(y)][Math.floor(x)] : null,
  }));
}

function startCustomLevel(id){
  const def = CUSTOM_LEVELS[id];
  if(!def) return;
  SAVE.clear();
  game.seed = 424242;
  game.district = 1;
  game.totalScore = 0;
  resetPlayerUpgrades();
  def.generator();
  player.cans = 0;
  player.stamina = player.maxStamina;
  sharedEnterPlay();
  initRunTracking(game.seed);
  game.run.customLevel = id;
  game.run.modifierUsed = game.modifier;
  SAVE.save();
}

function activeCustomLevel(){
  return game.run && game.run.customLevel ? CUSTOM_LEVELS[game.run.customLevel] : null;
}
function npcMechanicKind(kind){
  if(kind==='family'||kind==='hall_family') return 'family';
  if(kind==='elder'||kind==='hall_elder') return 'elder';
  if(kind==='volunteer'||kind==='hall_volunteer') return 'volunteer';
  return 'hungry';
}
function npcSpriteTex(kind){
  return TEX[kind] || TEX.hungry;
}
function pickHallThankLine(npc){
  if(npc && npc.thank) return npc.thank;
  const lines = CUSTOM_LEVELS.hall_of_servants.thankLines;
  return lines[(Math.random()*lines.length)|0];
}
