// ---------------------------------------------------------------------------
// SECTION 2 — GAME STATE
// ---------------------------------------------------------------------------
const STATE = { TITLE:'title', SEEDED:'seeded', STATS:'stats', LB:'lb', OPTIONS:'options',
                PLAY:'play', UPGRADE:'upgrade', RESULTS:'results' };
let state = STATE.TITLE;
let paused = false;

const game = {
  seed: 12345, district: 1, totalScore: 0,
  map: null, MAP_W: 0, MAP_H: 0, wallShade: null,
  pickups: [], npcs: [], exit: null, props: [],
  quota: 0, helped: 0, delivered: 0, timeLeft: 0,
  modifier: 'clear', scoreMult: 1,
  msg: '', msgT: 0,
  radarT: 0, revealT: 0,
  aimNpc: null,
  popups: [],
  flash: 0,
  handoffFx: 0,
  // --- run tracking (for stats / leaderboard / results) ---
  run: { active:false, startedAt:0, seedUsed:12345, modifierUsed:'clear', customLevel:null,
         cansCollected:0, cansDelivered:0, helpedByKind:{hungry:0,family:0,elder:0,volunteer:0},
         upgradesChosen:0, highestDistrict:1, runTime:0, completed:false, leaderboardRank:null },
};

const player = {
  x:0, y:0, angle:0,
  cans:0, maxCans:10,
  stamina:60, maxStamina:60,
  giveRange:1.4, giveCD:0, baseGiveCD:0.45,
  speedBoostT:0,
  minimapLevel:1, radar:false, radarPingT:0, radarRingT:0,
  handoffBonus:0, regenBonus:0,
  upgrades:{pack:0, sprint:0, hand:0, map:0, radar:0},
};

const cfg = {
  walkSpeed:3.0, sprintSpeed:5.2,
  staminaDrain:26, staminaRegen:16,
  fov:0.66,
  baseTime:95,
};

