'use strict';

// Query-only Samsung calibration: this wrapper deliberately lives outside the
// locked heightfield renderer. It changes no canonical asset or renderer rule.
const CR_SEATED_ANCHOR_COMPARISON_QUERY = new URLSearchParams(location.search).get('hfseatedanchorcomparison') === '1';
const CR_SEATED_ANCHOR_DISPLAY_DELTA_QUERY = new URLSearchParams(location.search).get('hfseatedanchordisplaydelta') === '1';
const CR_SEATED_ANCHOR_CALIBRATION_QUERY = CR_SEATED_ANCHOR_COMPARISON_QUERY || CR_SEATED_ANCHOR_DISPLAY_DELTA_QUERY;

if(CR_SEATED_ANCHOR_CALIBRATION_QUERY){
  const crCanonicalHeightfieldGroundContactSourceY = crHeightfieldGroundContactSourceY;
  crHeightfieldGroundContactSourceY = function(entry, obj, bounds){
    if(obj && Number.isInteger(obj.groundContactSourceY)){
      const sourceY = obj.groundContactSourceY;
      if(!(bounds.y < sourceY && sourceY <= bounds.y + bounds.h)) throw new Error('seated anchor comparison row is outside visible source bounds');
      return sourceY;
    }
    return crCanonicalHeightfieldGroundContactSourceY(entry, obj, bounds);
  };

  const CR_SEATED_ANCHOR_DISPLAY_DELTA = Object.freeze({
    sourceTop: 3,
    visibleSourceHeight: 186,
    detectedShoeSourceRow: 181,
    detectedContactSourceY: 182,
    worldHeight: 0.68,
    cameraDepth: 6.5,
    targetInternalPixelDeltas: Object.freeze([0, 4, 8])
  });
  function crSeatedAnchorDisplayDeltaRows(){
    const spec = CR_SEATED_ANCHOR_DISPLAY_DELTA;
    const projectedHeight = spec.worldHeight * RH / spec.cameraDepth;
    const internalPixelsPerSourcePixel = projectedHeight / spec.visibleSourceHeight;
    const firstOrderSourceDeltas = spec.targetInternalPixelDeltas.map((target) => Math.round(target / internalPixelsPerSourcePixel));
    const rasterizedShoePixel = (contactRow) => {
      const screenH = spec.visibleSourceHeight * projectedHeight / (contactRow - spec.sourceTop);
      let lowest = -1;
      for(let y = Math.floor(RH * 0.5); y < Math.ceil(RH * 0.5 + screenH); y++){
        const sourceY = Math.max(spec.sourceTop, Math.min(spec.sourceTop + spec.visibleSourceHeight - 1, (spec.sourceTop + (y - RH * 0.5) / screenH * spec.visibleSourceHeight) | 0));
        if(sourceY >= spec.detectedShoeSourceRow - 8 && sourceY <= spec.detectedShoeSourceRow) lowest = y;
      }
      return lowest;
    };
    const baseRasterizedShoePixel = rasterizedShoePixel(spec.detectedContactSourceY);
    const exactContactRow = (target) => {
      if(target === 0) return spec.detectedContactSourceY;
      for(let row = spec.detectedContactSourceY - 1; row > spec.sourceTop; row--){
        if(rasterizedShoePixel(row) - baseRasterizedShoePixel === target) return row;
      }
      throw new Error('seated anchor display-delta source row could not reach requested internal-pixel target');
    };
    const sourceRows = spec.targetInternalPixelDeltas.map(exactContactRow);
    const measuredInternalPixelDeltas = sourceRows.map((row) => rasterizedShoePixel(row) - baseRasterizedShoePixel);
    return Object.freeze({
      projectedHeight, internalPixelsPerSourcePixel,
      firstOrderSourceDeltas: Object.freeze(firstOrderSourceDeltas),
      sourceRows: Object.freeze(sourceRows),
      sourceDeltas: Object.freeze(sourceRows.map((row) => spec.detectedContactSourceY - row)),
      measuredInternalPixelDeltas: Object.freeze(measuredInternalPixelDeltas)
    });
  }
  function crEnsureSeatedAnchorDisplayLabels(calibration){
    let labels = document.getElementById('crSeatedAnchorDisplayLabels');
    if(!labels){
      labels = document.createElement('div');
      labels.id = 'crSeatedAnchorDisplayLabels';
      labels.setAttribute('aria-label', 'Seated anchor display-delta candidates');
      labels.style.cssText = 'position:fixed;top:calc(var(--vv-off-y) + var(--safe-top) + 4px);left:var(--vv-off-x);width:var(--app-vw-px);z-index:18;display:flex;justify-content:space-around;gap:4px;pointer-events:none;font:700 10px monospace;letter-spacing:.4px;text-align:center;text-shadow:0 1px 2px #000;';
      document.body.appendChild(labels);
    }
    labels.replaceChildren();
    for(const marker of calibration.groundMarkers){
      const label = document.createElement('span');
      label.textContent = `${marker.label} · row ${marker.groundContactSourceY} · +${marker.targetInternalPixelDelta}px`;
      label.style.cssText = `color:${marker.color};background:rgba(8,6,5,.78);border:1px solid ${marker.color};padding:3px 4px;border-radius:3px;`;
      labels.appendChild(label);
    }
  }
  function crGenSeatedAnchorDisplayDelta(){
    const GW = 24, GH = 20;
    const { map, shade } = hallFillMap(GW, GH);
    const projection = crSeatedAnchorDisplayDeltaRows();
    const labels = ['A', 'B', 'C'];
    const colors = ['#ffe14c', '#ff9a3d', '#ff4ecb'];
    const candidates = projection.sourceRows.map((groundContactSourceY, index) => ({
      calibrationId: `seated-anchor-${labels[index].toLowerCase()}`, id: `calibration-seated-anchor-${labels[index].toLowerCase()}`,
      x: 11.0 + index * 1.5, y: 8.5, groundContactSourceY, color: colors[index], label: labels[index],
      targetInternalPixelDelta: CR_SEATED_ANCHOR_DISPLAY_DELTA.targetInternalPixelDeltas[index],
      sourceDelta: projection.sourceDeltas[index], assetId: 'npc_unhoused_slumped_001', kind: 'unhoused', worldHeight: 0.68,
      need: 1, helped: false, wob: 0, thank: 'Seated anchor display-delta comparison.'
    }));
    game.verticalProfileWidth = GW; game.verticalProfileHeight = GH;
    game.verticalProfileGrid = new Uint16Array(GW * GH);
    game.verticalProfileRotationGrid = new Uint8Array(GW * GH);
    game.heightfieldProof = null;
    game.map = map; game.MAP_W = GW; game.MAP_H = GH; game.wallShade = shade;
    game.buildingGrid = null; game.buildingRegistry = null; game.props = [];
    game.modifier = 'clear'; game.scoreMult = 1;
    player.x = 12.5; player.y = 15.0; player.angle = Math.atan2(8.5 - player.y, 12.5 - player.x);
    game.pickups = []; game.npcs = candidates;
    game.heightfieldCalibration = Object.freeze({
      mode: 'seated-anchor-display-delta', calibrationBuildId: 'pr29-seated-anchor-display-delta-008', pose: 'equal-depth',
      showGroundLine: false, groundLineDepth: 6.5, sourceProjection: projection,
      groundMarkers: Object.freeze(candidates.map((candidate) => Object.freeze({
        id: candidate.calibrationId, x: candidate.x, y: candidate.y, label: candidate.label,
        groundContactSourceY: candidate.groundContactSourceY, targetInternalPixelDelta: candidate.targetInternalPixelDelta,
        sourceDelta: candidate.sourceDelta, color: candidate.color, width: 15
      }))),
      subjects: Object.freeze(candidates.map((candidate) => Object.freeze({
        id: candidate.calibrationId, kind: 'npc', x: candidate.x, y: candidate.y,
        worldHeight: candidate.worldHeight, groundContactSourceY: candidate.groundContactSourceY
      })))
    });
    game.quota = 1; game.helped = 0; game.delivered = 0;
    game.exit = { x: 21.5, y: 15.5, active: false }; game.timeLeft = 9999;
    dbg.reachableCells = 0; dbg.cansSpawned = 0; dbg.npcsSpawned = candidates.length; dbg.props = 0;
    crEnsureSeatedAnchorDisplayLabels(game.heightfieldCalibration);
    setMsg(`SEATED DISPLAY DELTA: A ${projection.sourceRows[0]} / B ${projection.sourceRows[1]} (+4 px) / C ${projection.sourceRows[2]} (+8 px).`);
  }

  const crCanonicalGenHeightfieldWorldScaleCalibration = genHeightfieldWorldScaleCalibration;
  genHeightfieldWorldScaleCalibration = function(params){
    if(params.get('hfseatedanchordisplaydelta') === '1') return crGenSeatedAnchorDisplayDelta();
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
    if(!calibration || !['seated-anchor-comparison', 'seated-anchor-display-delta'].includes(calibration.mode) || !Array.isArray(calibration.groundMarkers)) return;
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
        paintedPixels: width * 2, color: marker.color || '#00eaff', label: marker.label || null,
        targetInternalPixelDelta: marker.targetInternalPixelDelta == null ? null : marker.targetInternalPixelDelta,
        sourceDelta: marker.sourceDelta == null ? null : marker.sourceDelta
      }));
    }
    window.SNCSeatedAnchorDiagnostics = Object.freeze({ mode: calibration.mode, sourceProjection: calibration.sourceProjection || null, markers: Object.freeze(markers) });
  };
}
