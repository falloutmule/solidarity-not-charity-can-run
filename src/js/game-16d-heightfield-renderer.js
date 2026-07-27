// ---------------------------------------------------------------------------
// SECTION 7D — VARIABLE-HEIGHT RENDERER
// ---------------------------------------------------------------------------
const crHeightfieldDdaScratch = {
  capacity: 80,
  depth: new Float32Array(80), wallX: new Float32Array(80),
  mapX: new Int16Array(80), mapY: new Int16Array(80), wallType: new Uint16Array(80),
  profileId: new Uint16Array(80), side: new Uint8Array(80), stepX: new Int8Array(80), stepY: new Int8Array(80)
};
const crHeightfieldFacePatterns = Object.create(null);

function crHeightfieldMaterialPattern(material){
  if(!material || material.mode !== 'proceduralSide') return null;
  if(crHeightfieldFacePatterns[material.id]) return crHeightfieldFacePatterns[material.id];
  const texture = document.createElement('canvas');
  texture.width = 8; texture.height = 8;
  const textureCtx = texture.getContext('2d', { alpha: false });
  textureCtx.fillStyle = material.color;
  textureCtx.fillRect(0, 0, 8, 8);
  textureCtx.fillStyle = material.accent;
  for(let y = 0; y < 8; y += 2) textureCtx.fillRect((y + 2) & 7, y, 3, 1);
  const pattern = bctx.createPattern(texture, 'repeat');
  crHeightfieldFacePatterns[material.id] = pattern || material.color;
  return crHeightfieldFacePatterns[material.id];
}

function crHeightfieldWallU(segment, index){
  let u = segment.wallX[index];
  if(segment.side[index] === 0 && segment.stepX[index] > 0) u = 1 - u;
  if(segment.side[index] === 1 && segment.stepY[index] < 0) u = 1 - u;
  return Math.max(0, Math.min(0.999999, u));
}

function crHeightfieldDrawMaterialColumn(material, segment, index, col, top, height){
  if(material.mode === 'legacyWall'){
    const wallType = segment.wallType[index];
    const tex = WALL_TEX[wallType] || WALL_TEX[WALL.CONCRETE] || WALL_TEX[WALL.BUILDING];
    const texX = crCoarseWallTexX(segment.wallX[index], segment.side[index], 0, 0, wallType);
    bctx.drawImage(tex, texX, 0, CR_FPV_WALL_TEX_COARSE, TEXSIZE, col, top, 1, height);
    return;
  }
  const pattern = crHeightfieldMaterialPattern(material);
  if(pattern){
    bctx.fillStyle = pattern;
    bctx.fillRect(col, top, 1, height);
    return;
  }
  const image = crHeightfieldMaterialImage(material);
  if(image){
    const sourceX = Math.max(0, Math.min(image.naturalWidth - 1, Math.floor(crHeightfieldWallU(segment, index) * image.naturalWidth)));
    bctx.drawImage(image, sourceX, 0, 1, image.naturalHeight, col, top, 1, height);
    return;
  }
  bctx.fillStyle = '#777';
  bctx.fillRect(col, top, 1, height);
}

function crHeightfieldDrawVerticalSegment(col, index, fog, fogStrength, visRange){
  const segment = crHeightfieldDdaScratch;
  const profile = CR_VERTICAL_PROFILES[segment.profileId[index]];
  const depth = segment.depth[index];
  const side = segment.side[index];
  const topZ = crHeightfieldTopZ(profile);
  const top = Math.max(0, Math.floor(crProjectWorldZToScreenY(topZ, depth, CR_HEIGHTFIELD_CAMERA.eyeZ)));
  const bottom = Math.min(RH, Math.ceil(crProjectWorldZToScreenY(0, depth, CR_HEIGHTFIELD_CAMERA.eyeZ)));
  const height = bottom - top;
  if(height < 1) return;
  const rotation = crHeightfieldRotationAt(segment.mapX[index], segment.mapY[index]);
  const face = crHeightfieldFaceForHit(side, segment.stepX[index], segment.stepY[index], rotation);
  const material = crHeightfieldMaterialAt(crHeightfieldSideMaterialId(profile, face));
  if(!material) return;
  crHeightfieldDrawMaterialColumn(material, segment, index, col, top, height);
  if(side === 1){ bctx.fillStyle = 'rgba(0,0,0,0.18)'; bctx.fillRect(col, top, 1, height); }
  const f = Math.min(1, depth / visRange) * fogStrength;
  if(f > 0){ bctx.fillStyle = `rgba(${fog[0]},${fog[1]},${fog[2]},${f.toFixed(3)})`; bctx.fillRect(col, top, 1, height); }
  crHeightfieldWriteDepthColumn(col, top, bottom, depth);
  if(depth < zbuffer[col]) zbuffer[col] = depth;
  crHeightfieldStats.verticalSegments++;
}

function crHeightfieldRenderRaisedPlanes(px, py, dirX, dirY, planeX, planeY){
  crHeightfieldEnsurePlaneBuffer();
  const data = crHeightfieldPlaneImage.data;
  data.fill(0);
  const horizon = RH * 0.5;
  for(let level = 1; level < CR_HEIGHT_LEVELS.length; level++){
    const topZ = CR_HEIGHT_LEVELS[level];
    const eyeDelta = CR_HEIGHTFIELD_CAMERA.eyeZ - topZ;
    if(!(eyeDelta > 0)) continue;
    for(let y = Math.floor(horizon) + 1; y < RH; y++){
      const rowDepth = RH * eyeDelta / (y - horizon);
      if(!Number.isFinite(rowDepth) || rowDepth <= 0.05) continue;
      for(let col = 0; col < RW; col++){
        const cameraX = 2 * (col + 0.5) / RW - 1;
        const wx = px + rowDepth * (dirX + planeX * cameraX);
        const wy = py + rowDepth * (dirY + planeY * cameraX);
        const tx = Math.floor(wx), ty = Math.floor(wy);
        const profile = crHeightfieldProfileAt(tx, ty);
        if(profile.topLevel !== level) continue;
        const material = crHeightfieldMaterialAt(crHeightfieldTopMaterialId(profile));
        if(!material) continue;
        const index = y * RW + col;
        if(rowDepth >= worldDepthPixels[index]) continue;
        const rgb = crHeightfieldMaterialRgb(material, wx - tx, wy - ty, crHeightfieldRotationAt(tx, ty));
        if(!rgb) continue;
        data[index * 4] = rgb[0]; data[index * 4 + 1] = rgb[1]; data[index * 4 + 2] = rgb[2]; data[index * 4 + 3] = 255;
        worldDepthPixels[index] = rowDepth;
        crHeightfieldStats.worldDepthWrites++;
        crHeightfieldStats.topPixels++;
      }
    }
  }
  crHeightfieldPlaneCtx.putImageData(crHeightfieldPlaneImage, 0, 0);
  bctx.drawImage(crHeightfieldPlaneCanvas, 0, 0);
}

function crHeightfieldDrawSprite(kind, obj, tex, hp, px, py, dirX, dirY, planeX, planeY, now){
  if(!obj || !tex) return;
  const rx = obj.x - px, ry = obj.y - py;
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const depth = invDet * (-planeY * rx + planeX * ry);
  const hscr = invDet * (dirY * rx - dirX * ry);
  if(!(depth > 0.12)) return;
  const proj = crProjectBillboardSprite(obj, tex, hp, depth, hscr, now);
  const heightfieldGroundY = crProjectWorldZToScreenY(0, depth, CR_HEIGHTFIELD_CAMERA.eyeZ);
  const top = proj.topY + (heightfieldGroundY - proj.groundBottomY);
  const startCol = Math.max(0, Math.floor(proj.screenX - proj.screenW / 2));
  const endCol = Math.min(RW, Math.ceil(proj.screenX + proj.screenW / 2));
  const bottom = top + proj.screenH;
  for(let col = startCol; col < endCol; col++){
    const u = (col - (proj.screenX - proj.screenW / 2)) / proj.screenW;
    const srcX = Math.max(0, Math.min(tex.width - 1, (u * tex.width) | 0));
    const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(RH, Math.ceil(bottom));
    let runStart = -1;
    for(let y = y0; y <= y1; y++){
      const visible = y < y1 && depth < worldDepthPixels[y * RW + col];
      const sourceY = Math.max(0, Math.min(tex.height - 1, ((y - top) / proj.screenH * tex.height) | 0));
      const opaque = y < y1 && crHeightfieldSpriteOpaqueAt(tex, srcX, sourceY);
      if(visible){
        if(runStart < 0) runStart = y;
        crHeightfieldStats.spriteVisiblePixels++;
        if(opaque && kind === 'can') crHeightfieldStats.canVisiblePixels++;
        else if(opaque && kind === 'npc') crHeightfieldStats.npcVisiblePixels++;
      } else {
        if(y < y1) crHeightfieldStats.spriteOccludedPixels++;
        if(opaque && kind === 'can') crHeightfieldStats.canOccludedPixels++;
        else if(opaque && kind === 'npc') crHeightfieldStats.npcOccludedPixels++;
        if(runStart >= 0){
          const runHeight = y - runStart;
          const sy = (runStart - top) / proj.screenH * tex.height;
          const sh = runHeight / proj.screenH * tex.height;
          bctx.drawImage(tex, srcX, sy, 1, sh, col, runStart, 1, runHeight);
          runStart = -1;
        }
      }
    }
  }
}

function crDrawHeightfieldScene(now, renderPose){
  if(skyBuilt !== game.modifier) buildSky(game.modifier);
  bctx.drawImage(skyCanvas, 0, 0);
  const floor = bctx.createLinearGradient(0, RH / 2, 0, RH);
  floor.addColorStop(0, '#3a3a40'); floor.addColorStop(1, '#1a1a1e');
  bctx.fillStyle = floor; bctx.fillRect(0, RH / 2, RW, RH / 2);

  const px = renderPose ? renderPose.x : player.x;
  const py = renderPose ? renderPose.y : player.y;
  const angle = renderPose ? renderPose.angle : player.angle;
  const dirX = Math.cos(angle), dirY = Math.sin(angle);
  const planeX = -Math.sin(angle) * cfg.fov, planeY = Math.cos(angle) * cfg.fov;
  const visRange = game.modifier === 'rainy' ? 9.0 : 17.0;
  const fog = game.modifier === 'rainy' ? [40, 48, 60] : [196, 168, 128];
  const fogStrength = game.modifier === 'rainy' ? 0.9 : 0.78;
  crHeightfieldResetStats();
  crHeightfieldEnsureWorldDepth();

  for(let col = 0; col < RW; col++){
    zbuffer[col] = Infinity;
    const cameraX = 2 * col / RW - 1;
    const rdx = dirX + planeX * cameraX, rdy = dirY + planeY * cameraX;
    let mapX = px | 0, mapY = py | 0;
    const ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9));
    let stepX, stepY, sdx, sdy;
    if(rdx < 0){ stepX = -1; sdx = (px - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - px) * ddx; }
    if(rdy < 0){ stepY = -1; sdy = (py - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - py) * ddy; }
    let count = 0;
    for(let steps = 0; steps < crHeightfieldDdaScratch.capacity; steps++){
      let side;
      if(sdx < sdy){ sdx += ddx; mapX += stepX; side = 0; } else { sdy += ddy; mapY += stepY; side = 1; }
      const depth = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
      let wallType = World.inBounds(mapX, mapY) ? World.rawCell(mapX, mapY) : WALL.CONCRETE;
      if(wallType === 0) continue;
      const profile = World.inBounds(mapX, mapY) ? crHeightfieldProfileAt(mapX, mapY) : CR_VERTICAL_PROFILES[CR_VERTICAL_PROFILE_IDS.FULL_LEGACY];
       if(profile.topLevel === 0) continue;
      const i = count++;
      crHeightfieldDdaScratch.depth[i] = depth;
      crHeightfieldDdaScratch.wallX[i] = ((side === 0 ? py + depth * rdy : px + depth * rdx) % 1 + 1) % 1;
      crHeightfieldDdaScratch.mapX[i] = mapX; crHeightfieldDdaScratch.mapY[i] = mapY;
      crHeightfieldDdaScratch.wallType[i] = wallType;
      crHeightfieldDdaScratch.profileId[i] = profile.id;
      crHeightfieldDdaScratch.side[i] = side;
      crHeightfieldDdaScratch.stepX[i] = stepX; crHeightfieldDdaScratch.stepY[i] = stepY;
       if(crHeightfieldTopZ(profile) >= 1 || !World.inBounds(mapX, mapY)) break;
    }
    for(let i = count - 1; i >= 0; i--){
      crHeightfieldDrawVerticalSegment(col, i, fog, fogStrength, visRange);
    }
  }
  crHeightfieldRenderRaisedPlanes(px, py, dirX, dirY, planeX, planeY);
  for(const prop of game.props) crHeightfieldDrawSprite('prop', prop, propTex(prop.kind, prop), crHeightfieldSpriteWorldHeight('prop', prop), px, py, dirX, dirY, planeX, planeY, now);
  for(const can of game.pickups) if(!can.taken) crHeightfieldDrawSprite('can', can, TEX.can, crHeightfieldSpriteWorldHeight('can', can), px, py, dirX, dirY, planeX, planeY, now);
  for(const npc of game.npcs) if(!npc.helped) crHeightfieldDrawSprite('npc', npc, npcSpriteTex(npc.kind, npc), crHeightfieldSpriteWorldHeight('npc', npc), px, py, dirX, dirY, planeX, planeY, now);
  if(game.exit && game.exit.active) crHeightfieldDrawSprite('exit', game.exit, TEX.exit, crHeightfieldSpriteWorldHeight('exit', game.exit), px, py, dirX, dirY, planeX, planeY, now);
}
