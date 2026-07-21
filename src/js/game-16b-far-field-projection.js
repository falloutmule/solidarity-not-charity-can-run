'use strict';

const CR_FFPROJ_ALLOWLIST = Object.freeze(['legacy', 'subpixel']);

function crParseFarFieldProjectionMode(params){
  if(!params || typeof params.get !== 'function') return 'subpixel';
  let value;
  try{ value = params.get('ffproj'); }catch(_error){ return 'subpixel'; }
  return CR_FFPROJ_ALLOWLIST.indexOf(value) >= 0 ? value : 'subpixel';
}

function crInitialFarFieldProjectionParams(){
  try{
    if(typeof URLSearchParams === 'function' && typeof location !== 'undefined'){
      return new URLSearchParams(location.search || '');
    }
  }catch(_error){}
  return null;
}

const _crFarFieldProjectionMode = crParseFarFieldProjectionMode(crInitialFarFieldProjectionParams());

function crResolveFarFieldProjectionMode(params){
  if(arguments.length > 0) return crParseFarFieldProjectionMode(params);
  return _crFarFieldProjectionMode;
}

const CR_FAR_FIELD_DEPTH_THRESHOLD = 8;
const _crProjectionQuantizationStats = {
  projectedSpriteCount: 0,
  distantSpriteCount: 0,
  projectedWidthSum: 0,
  fractionalScreenXSum: 0,
  legacySnapCount: 0,
  subpixelMovementCount: 0,
  repeatedProjectedXFramesWhileMoving: 0
};
const _crProjectionContinuity = new Map();

function crFiniteCumulativeAdd(value, delta, integer){
  const ceiling = integer ? Number.MAX_SAFE_INTEGER : Number.MAX_VALUE;
  if(value >= ceiling || delta >= ceiling - value) return ceiling;
  return value + delta;
}

function crRecordProjectionQuantization(input, projected, floatingLeft, floatingRight){
  const stats = _crProjectionQuantizationStats;
  stats.projectedSpriteCount = crFiniteCumulativeAdd(stats.projectedSpriteCount, 1, true);
  stats.projectedWidthSum = crFiniteCumulativeAdd(stats.projectedWidthSum, projected.screenW, false);
  const fractionalX = Math.abs(projected.screenX - Math.round(projected.screenX));
  stats.fractionalScreenXSum = crFiniteCumulativeAdd(stats.fractionalScreenXSum, fractionalX, false);
  if(!projected.distant) return;

  stats.distantSpriteCount = crFiniteCumulativeAdd(stats.distantSpriteCount, 1, true);
  const representation = projected.mode === 'legacy'
    ? `${Math.floor(floatingLeft)}:${Math.ceil(floatingRight)}`
    : projected.screenX;
  const previous = _crProjectionContinuity.get(input.spriteKey);
  if(input.moving && previous){
    const floatingChanged = projected.screenX !== previous.screenX;
    if(projected.mode === 'legacy' && floatingChanged && representation === previous.representation){
      stats.legacySnapCount = crFiniteCumulativeAdd(stats.legacySnapCount, 1, true);
    }
    if(projected.mode === 'subpixel' && floatingChanged){
      stats.subpixelMovementCount = crFiniteCumulativeAdd(stats.subpixelMovementCount, 1, true);
    }
    if(representation === previous.representation){
      stats.repeatedProjectedXFramesWhileMoving = crFiniteCumulativeAdd(
        stats.repeatedProjectedXFramesWhileMoving, 1, true
      );
    }
  }
  _crProjectionContinuity.set(input.spriteKey, {
    screenX: projected.screenX,
    representation
  });
}

function crGetProjectionQuantizationStats(){
  const stats = _crProjectionQuantizationStats;
  return Object.freeze({
    mode: _crFarFieldProjectionMode,
    depthThreshold: CR_FAR_FIELD_DEPTH_THRESHOLD,
    projectedSpriteCount: stats.projectedSpriteCount,
    distantSpriteCount: stats.distantSpriteCount,
    projectedWidthSum: stats.projectedWidthSum,
    fractionalScreenXSum: stats.fractionalScreenXSum,
    legacySnapCount: stats.legacySnapCount,
    subpixelMovementCount: stats.subpixelMovementCount,
    repeatedProjectedXFramesWhileMoving: stats.repeatedProjectedXFramesWhileMoving
  });
}

function crFiniteProjectionGeometry(input){
  if(!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const projection = input.projection;
  if(!projection || typeof projection !== 'object' || Array.isArray(projection)) return false;
  const required = [
    input.depth, input.textureWidth, input.renderWidth,
    projection.screenX, projection.screenW, projection.screenH,
    projection.groundBottomY, projection.topY, projection.feetY,
    projection.footAnchor, projection.yoffUsed
  ];
  if(!required.every(Number.isFinite)) return false;
  if(projection.groundedDelta !== null && !Number.isFinite(projection.groundedDelta)) return false;
  return typeof input.moving === 'boolean' && typeof input.spriteKey === 'string' &&
    input.depth > 0 && input.textureWidth > 0 && Number.isInteger(input.textureWidth) &&
    input.renderWidth > 0 && Number.isInteger(input.renderWidth) &&
    projection.screenW > 0 && projection.screenH > 0;
}

function crProjectFarFieldSprite(input){
  if(!crFiniteProjectionGeometry(input)) return null;
  const projection = input.projection;
  const depth = input.depth;
  const sourceWidth = input.textureWidth;
  const renderWidth = input.renderWidth;
  const distant = depth >= CR_FAR_FIELD_DEPTH_THRESHOLD;
  const mode = distant && _crFarFieldProjectionMode === 'subpixel' ? 'subpixel' : 'legacy';
  const floatingLeft = projection.screenX - projection.screenW / 2;
  const floatingRight = projection.screenX + projection.screenW / 2;
  if(!Number.isFinite(floatingLeft) || !Number.isFinite(floatingRight) || floatingRight <= floatingLeft) return null;
  const coverageStart = Math.max(0, Math.min(renderWidth, Math.floor(floatingLeft)));
  const coverageEnd = Math.max(0, Math.min(renderWidth, Math.ceil(floatingRight)));
  const visualLeft = mode === 'subpixel' ? floatingLeft : Math.floor(floatingLeft);
  const visualRight = mode === 'subpixel' ? floatingRight : Math.ceil(floatingRight);

  const result = Object.freeze({
    mode,
    distant,
    depth,
    screenX: projection.screenX,
    screenW: projection.screenW,
    screenH: projection.screenH,
    topY: projection.topY,
    groundBottomY: projection.groundBottomY,
    visualLeft,
    visualRight,
    visualWidth: visualRight - visualLeft,
    occlusionStartCol: coverageStart,
    occlusionEndCol: coverageEnd,
    sourceWidth
  });
  crRecordProjectionQuantization(input, result, floatingLeft, floatingRight);
  return result;
}

function crFarFieldRun(startCol, endCol, destLeft, destRight, sourceLeft, sourceRight){
  return Object.freeze({
    startCol,
    endCol,
    destLeft,
    destRight,
    destWidth: destRight - destLeft,
    sourceLeft,
    sourceRight,
    sourceWidth: sourceRight - sourceLeft
  });
}

function crValidProjectedSprite(projected){
  if(!projected || typeof projected !== 'object') return false;
  const finite = [
    projected.depth, projected.screenX, projected.screenW, projected.screenH,
    projected.topY, projected.groundBottomY, projected.visualLeft,
    projected.visualRight, projected.visualWidth, projected.occlusionStartCol,
    projected.occlusionEndCol, projected.sourceWidth
  ];
  return finite.every(Number.isFinite) &&
    (projected.mode === 'legacy' || projected.mode === 'subpixel') &&
    projected.depth > 0 && projected.screenW > 0 && projected.screenH > 0 &&
    projected.sourceWidth > 0 && Number.isInteger(projected.sourceWidth) &&
    Number.isInteger(projected.occlusionStartCol) && Number.isInteger(projected.occlusionEndCol) &&
    projected.occlusionStartCol >= 0 && projected.occlusionEndCol >= projected.occlusionStartCol;
}

function crBuildFarFieldSpriteDrawRuns(projected, zbuffer){
  if(!crValidProjectedSprite(projected) || !zbuffer || typeof zbuffer.length !== 'number') return Object.freeze([]);
  if(zbuffer.length < projected.occlusionEndCol) return Object.freeze([]);
  const visible = [];
  for(let col = projected.occlusionStartCol; col < projected.occlusionEndCol; col++){
    if(projected.depth < zbuffer[col]) visible.push(col);
  }
  if(visible.length === 0) return Object.freeze([]);

  const floatingLeft = projected.screenX - projected.screenW / 2;
  const floatingRight = projected.screenX + projected.screenW / 2;
  const runs = [];
  if(projected.mode === 'legacy'){
    for(const col of visible){
      const u = (col - floatingLeft) / projected.screenW;
      const sourceX = Math.max(0, Math.min(projected.sourceWidth - 1, (u * projected.sourceWidth) | 0));
      runs.push(crFarFieldRun(col, col + 1, col, col + 1, sourceX, sourceX + 1));
    }
    return Object.freeze(runs);
  }

  let runStart = visible[0];
  let previous = visible[0];
  function appendSubpixelRun(startCol, endCol){
    const destLeft = Math.max(floatingLeft, startCol);
    const destRight = Math.min(floatingRight, endCol);
    if(!(destRight > destLeft)) return;
    const sourceLeft = Math.max(0, Math.min(projected.sourceWidth,
      (destLeft - floatingLeft) / projected.screenW * projected.sourceWidth));
    const sourceRight = Math.max(0, Math.min(projected.sourceWidth,
      (destRight - floatingLeft) / projected.screenW * projected.sourceWidth));
    if(!(sourceRight > sourceLeft)) return;
    runs.push(crFarFieldRun(startCol, endCol, destLeft, destRight, sourceLeft, sourceRight));
  }
  for(let index = 1; index < visible.length; index++){
    const col = visible[index];
    if(col !== previous + 1){
      appendSubpixelRun(runStart, previous + 1);
      runStart = col;
    }
    previous = col;
  }
  appendSubpixelRun(runStart, previous + 1);
  return Object.freeze(runs);
}

function crDrawFarFieldSpriteRuns(ctx, texture, projected, zbuffer){
  if(!ctx || typeof ctx.drawImage !== 'function' || !texture || !crValidProjectedSprite(projected) ||
      !Number.isFinite(texture.width) || !Number.isFinite(texture.height) ||
      texture.width !== projected.sourceWidth || texture.height <= 0) return 0;
  const runs = crBuildFarFieldSpriteDrawRuns(projected, zbuffer);
  ctx.imageSmoothingEnabled = false;
  for(const run of runs){
    ctx.drawImage(
      texture,
      run.sourceLeft, 0, run.sourceWidth, texture.height,
      run.destLeft, projected.topY, run.destWidth, projected.screenH
    );
  }
  return runs.length;
}
