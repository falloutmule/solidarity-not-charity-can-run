// ---------------------------------------------------------------------------
// SECTION 0c — DEBUG FLAG
// ---------------------------------------------------------------------------
const DEBUG = new URLSearchParams(location.search).has('debug');
const _forcePortraitLayout = new URLSearchParams(location.search).get('portraitlayout') === '1';
const dbg = { cansSpawned:0, npcsSpawned:0, invalidPlacements:0,
              spritesSkipped:0, reachableCells:0, rejectedSpawns:0, props:0 };

