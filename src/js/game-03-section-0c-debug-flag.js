// ---------------------------------------------------------------------------
// SECTION 0c — DEBUG FLAG
// ---------------------------------------------------------------------------
const DEBUG = new URLSearchParams(location.search).has('debug');
const _selfCheckUrl = new URLSearchParams(location.search).get('selfcheck') === '1';
const _forcePortraitLayout = new URLSearchParams(location.search).get('portraitlayout') === '1';
/** Set true during CR.runControlDockSelfCheck() to force portrait layout math on desktop. */
let _selfCheckForcePortrait = false;
let _crHarnessDepth = 0;
let _crVisualHarnessSnapshot = null;
let _crBlockHarnessSave = false;
const dbg = { cansSpawned:0, npcsSpawned:0, invalidPlacements:0,
              spritesSkipped:0, reachableCells:0, rejectedSpawns:0, props:0 };

