
function getDebugState(){
  const vv = window.visualViewport;
  const px = player.x, py = player.y;
  return {
    state, paused, mobileMode, mobileInputActive:mobileInputActive(), mobileAuto:isMobile(),
    customLevel: game.run && game.run.customLevel || null,
    levelType: game.run && game.run.customLevel ? 'custom' : 'procedural',
    MAP_W: game.MAP_W, MAP_H: game.MAP_H,
    mapAspect: game.MAP_W && game.MAP_H ? +(game.MAP_W / game.MAP_H).toFixed(3) : null,
    seed:game.seed, district:game.district, score:game.totalScore,
    player:{x:px,y:py,angle:player.angle,cans:player.cans,stamina:player.stamina},
    mapCell:{tx:Math.floor(px), ty:Math.floor(py), v:game.map && game.map[Math.floor(py)] ? game.map[Math.floor(py)][Math.floor(px)] : null},
    canStand: canStand(px, py),
    standProbe: playerStandProbe(px, py),
    joy:{active:joy.active, x:joy.x, y:joy.y, dist:joy.dist},
    moveDbg: window._moveDbg || null,
    runActive:!!game.run.active,
    saveValid:!!SAVE.hasValid(),
    canvas:{cssW:view.style.width,cssH:view.style.height,w:view.width,h:view.height,dpr:devicePixelRatio||1},
    viewport:{w:innerWidth,h:innerHeight,visualW:vv?vv.width:null,visualH:vv?vv.height:null,offsetX:vv?vv.offsetLeft:null,offsetY:vv?vv.offsetTop:null,appVhPx:getComputedStyle(document.documentElement).getPropertyValue('--app-vh-px').trim()},
    mobileSettings:{lookSpeed:options.lookSpeed,lookSpeedLabel:lookSpeedLabel(options.lookSpeed),turnSens:options.mobileTurnSens,joySizePx:options.joySizePx,buttonSizePx:options.buttonSizePx,opacity:options.controlOpacityValue,minimapSizePx:options.minimapSizePx,deadzonePx:options.touchDeadzonePx,portrait:isMobilePortrait()},
    sprint:{cost:mobileSprintCost(),burstSec:mobileSprintBurstSec(),burstUntil:sprintBurstUntil,blocks:Math.round(player.maxStamina/mobileSprintCost())},
    storageKeys:Object.assign({}, K),
    safeArea: readSafeAreaInsets(),
  };
}



// Production exposes only a bounded, read-only diagnostic snapshot. It does
// not provide mutable gameplay state, test lifecycle, or proof helpers.
window.SNCDiagnostics = Object.freeze({
  buildId: BUILD_ID,
  getSnapshot: () => Object.freeze({
    buildId: BUILD_ID,
    runtime: Object.freeze(getDebugState()),
    fixedStep: Object.freeze(crGetFixedStepState()),
    performance: typeof crPerfProbeGetReport === 'function' ? crPerfProbeGetReport() : null,
    alphaCutout: typeof crGetAlphaCutoutProof === 'function' ? crGetAlphaCutoutProof() : null,
  }),
});
