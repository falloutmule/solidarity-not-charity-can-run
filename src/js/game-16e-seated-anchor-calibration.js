'use strict';

// Query-only Samsung calibration: this wrapper deliberately lives outside the
// locked heightfield renderer. It changes no canonical asset or renderer rule.
const CR_SEATED_ANCHOR_COMPARISON_QUERY = new URLSearchParams(location.search).get('hfseatedanchorcomparison') === '1';

if(CR_SEATED_ANCHOR_COMPARISON_QUERY){
  const crCanonicalHeightfieldGroundContactSourceY = crHeightfieldGroundContactSourceY;
  crHeightfieldGroundContactSourceY = function(entry, obj, bounds){
    if(obj && Number.isInteger(obj.groundContactSourceY)){
      const sourceY = obj.groundContactSourceY;
      if(!(bounds.y < sourceY && sourceY <= bounds.y + bounds.h)) throw new Error('seated anchor comparison row is outside visible source bounds');
      return sourceY;
    }
    return crCanonicalHeightfieldGroundContactSourceY(entry, obj, bounds);
  };

  const crCanonicalGenHeightfieldWorldScaleCalibration = genHeightfieldWorldScaleCalibration;
  genHeightfieldWorldScaleCalibration = function(params){
    if(params.get('hfseatedanchorcomparison') !== '1') return crCanonicalGenHeightfieldWorldScaleCalibration(params);
    const GW = 24, GH = 20;
    const { map, shade } = hallFillMap(GW, GH);
    const candidates = [
      { calibrationId: 'seated-anchor-a', id: 'calibration-seated-anchor-a', x: 11.0, y: 8.5, groundContactSourceY: 182, color: '#ffe14c' },
      { calibrationId: 'seated-anchor-b', id: 'calibration-seated-anchor-b', x: 12.5, y: 8.5, groundContactSourceY: 178, color: '#ff9a3d' },
      { calibrationId: 'seated-anchor-c', id: 'calibration-seated-anchor-c', x: 14.0, y: 8.5, groundContactSourceY: 174, color: '#ff4ecb' }
    ].map((candidate) => ({
      ...candidate, assetId: 'npc_unhoused_slumped_001', kind: 'unhoused', worldHeight: 0.68,
      need: 1, helped: false, wob: 0, thank: 'Seated anchor comparison.'
    }));
    game.verticalProfileWidth = GW; game.verticalProfileHeight = GH;
    game.verticalProfileGrid = new Uint16Array(GW * GH);
    game.verticalProfileRotationGrid = new Uint8Array(GW * GH);
    game.heightfieldProof = null;
    game.map = map; game.MAP_W = GW; game.MAP_H = GH; game.wallShade = shade;
    game.buildingGrid = null; game.buildingRegistry = null; game.props = [];
    game.modifier = 'clear'; game.scoreMult = 1;
    player.x = 12.5; player.y = 12.0; player.angle = Math.atan2(8.5 - player.y, 12.5 - player.x);
    game.pickups = [];
    game.npcs = candidates;
    game.heightfieldCalibration = Object.freeze({
      mode: 'seated-anchor-comparison', calibrationBuildId: 'pr29-seated-anchor-007', pose: 'equal-depth',
      showGroundLine: false, groundLineDepth: 6.5,
      groundMarkers: Object.freeze(candidates.map((candidate) => Object.freeze({
        id: candidate.calibrationId, x: candidate.x, y: candidate.y,
        groundContactSourceY: candidate.groundContactSourceY, color: candidate.color, width: 15
      }))),
      subjects: Object.freeze(candidates.map((candidate) => Object.freeze({
        id: candidate.calibrationId, kind: 'npc', x: candidate.x, y: candidate.y,
        worldHeight: candidate.worldHeight, groundContactSourceY: candidate.groundContactSourceY
      })))
    });
    game.quota = 1; game.helped = 0; game.delivered = 0;
    game.exit = { x: 21.5, y: 15.5, active: false }; game.timeLeft = 9999;
    dbg.reachableCells = 0; dbg.cansSpawned = 0; dbg.npcsSpawned = candidates.length; dbg.props = 0;
    setMsg('SEATED ANCHOR COMPARISON: A 182 / B 178 / C 174; scale locked at 0.68.');
  };

  const crCanonicalDrawHeightfieldScene = crDrawHeightfieldScene;
  crDrawHeightfieldScene = function(now, renderPose){
    crCanonicalDrawHeightfieldScene(now, renderPose);
    const calibration = game.heightfieldCalibration;
    if(!calibration || calibration.mode !== 'seated-anchor-comparison' || !Array.isArray(calibration.groundMarkers)) return;
    const pose = renderPose || player;
    const px = pose.x, py = pose.y, angle = pose.angle;
    const dirX = Math.cos(angle), dirY = Math.sin(angle);
    const planeX = -Math.sin(angle) * cfg.fov, planeY = Math.cos(angle) * cfg.fov;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const markers = [];
    for(const marker of calibration.groundMarkers){
      const rx = marker.x - px, ry = marker.y - py;
      const depth = invDet * (-planeY * rx + planeX * ry);
      const hscr = invDet * (dirY * rx - dirX * ry);
      if(!(depth > 0.12)) continue;
      const screenX = Math.round((RW / 2) * (1 + hscr / depth));
      const groundY = Math.round(crProjectWorldZToScreenY(0, depth, CR_HEIGHTFIELD_CAMERA.eyeZ));
      const width = Number.isFinite(marker.width) ? marker.width : 15;
      bctx.fillStyle = marker.color || '#00eaff';
      bctx.fillRect(screenX - (width >> 1), groundY, width, 2);
      markers.push(Object.freeze({
        id: marker.id, groundContactSourceY: marker.groundContactSourceY,
        screenCenterX: screenX, projectedGroundY: groundY, width,
        paintedPixels: width * 2, color: marker.color || '#00eaff'
      }));
    }
    window.SNCSeatedAnchorDiagnostics = Object.freeze({ markers: Object.freeze(markers) });
  };
}
