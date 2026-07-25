// ---------------------------------------------------------------------------
// SECTION 7C — LOW-BLOCK RAYCASTER SPIKE (query-gated; not production content)
// ---------------------------------------------------------------------------
const CR_LOW_BLOCK_SPIKE = new URLSearchParams(location.search).get('lowblockspike') === '1';
const CR_LOW_BLOCK_HEIGHT = 0.5;
let crLowBlockFrame = null;
let crLowBlockCapX = null;
let crLowBlockCapY = null;
let crLowBlockSpanTop = 0;
let crLowBlockSpanBottom = 0;
let crLowBlockSpriteClipColumns = 0;

function crLowBlockEnsureFrame(){
  if(crLowBlockFrame && crLowBlockFrame.width === RW) return crLowBlockFrame;
  crLowBlockFrame = {
    width: RW,
    active: new Uint8Array(RW),
    nearDepth: new Float32Array(RW),
    sideTop: new Uint16Array(RW),
    sideBottom: new Uint16Array(RW),
    capTop: new Uint16Array(RW),
    capBottom: new Uint16Array(RW),
  };
  crLowBlockCapX = new Float32Array(4);
  crLowBlockCapY = new Float32Array(4);
  return crLowBlockFrame;
}
function crLowBlockResetFrame(){
  const f = crLowBlockEnsureFrame();
  f.active.fill(0);
  f.capTop.fill(0); f.capBottom.fill(0);
  crLowBlockSpriteClipColumns=0;
  return f;
}
function crLowBlockIsEnabled(){ return CR_LOW_BLOCK_SPIKE && !!(game && game.lowBlocks && game.lowBlocks.length); }
function crGetLowBlockSpikeStats(){
  const f=crLowBlockFrame;
  let activeColumns=0, capColumns=0;
  if(f) for(let i=0;i<f.capBottom.length;i++) capColumns+=f.capBottom[i]>f.capTop[i] ? 1 : 0;
  if(f) for(let i=0;i<f.active.length;i++) activeColumns+=f.active[i] ? 1 : 0;
  return Object.freeze({
    enabled: CR_LOW_BLOCK_SPIKE,
    heightScale: CR_LOW_BLOCK_HEIGHT,
    blocks: game && game.lowBlocks ? game.lowBlocks.length : 0,
    activeColumns,
    capColumns,
    spriteClipColumns: crLowBlockSpriteClipColumns,
    metadataBytes: f ? f.active.byteLength + f.nearDepth.byteLength + f.sideTop.byteLength + f.sideBottom.byteLength + f.capTop.byteLength + f.capBottom.byteLength : 0,
    perFrameReadback: false,
  });
}
function crLowBlockCellOwner(x, y){
  return game.lowBlockGrid && game.lowBlockGrid[y] ? game.lowBlockGrid[y][x] || null : null;
}
function crLowBlockShadeFog(ctx, col, top, bottom, side, depth, fog, fogStrength, visRange){
  const h = bottom - top;
  if(h < 1) return;
  if(side === 1){ ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(col, top, 1, h); }
  const f = Math.min(1, depth / visRange) * fogStrength;
  if(f > 0){ ctx.fillStyle=`rgba(${fog[0]},${fog[1]},${fog[2]},${f.toFixed(3)})`; ctx.fillRect(col, top, 1, h); }
}
function crDrawLowBlockSideColumn(ctx, col, top, bottom, side, depth, fog, fogStrength, visRange){
  const h = bottom - top;
  if(h < 1) return;
  ctx.fillStyle = side === 0 ? '#e0523d' : '#a63426';
  ctx.fillRect(col, top, 1, h);
  if((col & 7) === 0){ ctx.fillStyle='rgba(205,220,186,0.25)'; ctx.fillRect(col, top + Math.max(1, (h * 0.16) | 0), 1, Math.max(1, (h * 0.06) | 0)); }
  crLowBlockShadeFog(ctx, col, top, bottom, side, depth, fog, fogStrength, visRange);
}
function crLowBlockProjectCapCorner(i, wx, wy, px, py, dirX, dirY, planeX, planeY, height){
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const rx = wx - px, ry = wy - py;
  const depth = invDet * (-planeY * rx + planeX * ry);
  const hscr = invDet * (dirY * rx - dirX * ry);
  crLowBlockCapX[i] = depth > 0.05 ? RW * 0.5 * (1 + hscr / depth) : NaN;
  crLowBlockCapY[i] = depth > 0.05 ? RH * 0.5 + (0.5 - height) * RH / depth : NaN;
}
function crLowBlockProjectCap(block, px, py, dirX, dirY, planeX, planeY){
  const h = block.heightScale;
  crLowBlockProjectCapCorner(0,block.x,block.y,px,py,dirX,dirY,planeX,planeY,h);
  crLowBlockProjectCapCorner(1,block.x+block.widthCells,block.y,px,py,dirX,dirY,planeX,planeY,h);
  crLowBlockProjectCapCorner(2,block.x+block.widthCells,block.y+block.depthCells,px,py,dirX,dirY,planeX,planeY,h);
  crLowBlockProjectCapCorner(3,block.x,block.y+block.depthCells,px,py,dirX,dirY,planeX,planeY,h);
}
function crLowBlockCapSpanAt(x){
  let lo=Infinity, hi=-Infinity;
  for(let i=0;i<4;i++){
    const j=(i+1)&3, x0=crLowBlockCapX[i], x1=crLowBlockCapX[j];
    if(!Number.isFinite(x0)||!Number.isFinite(x1)||x0===x1) continue;
    if((x0<=x && x<x1)||(x1<=x && x<x0)){
      const t=(x-x0)/(x1-x0), y=crLowBlockCapY[i]+(crLowBlockCapY[j]-crLowBlockCapY[i])*t;
      if(y<lo) lo=y;
      if(y>hi) hi=y;
    }
  }
  if(lo>hi) return false;
  crLowBlockSpanTop=Math.max(0,Math.floor(lo));
  crLowBlockSpanBottom=Math.min(RH,Math.ceil(hi));
  return crLowBlockSpanBottom>crLowBlockSpanTop;
}
function crLowBlockDrawCap(px, py, dirX, dirY, planeX, planeY, fog, fogStrength, visRange){
  if(!crLowBlockIsEnabled()) return;
  const block=game.lowBlocks[0], f=crLowBlockEnsureFrame();
  crLowBlockProjectCap(block, px, py, dirX, dirY, planeX, planeY);
  for(let col=0;col<RW;col++){
    if(!f.active[col]) continue;
    if(!crLowBlockCapSpanAt(col+0.5)) continue;
    f.capTop[col]=crLowBlockSpanTop; f.capBottom[col]=crLowBlockSpanBottom;
    bctx.fillStyle='#3777c7'; bctx.fillRect(col,crLowBlockSpanTop,1,crLowBlockSpanBottom-crLowBlockSpanTop);
    crLowBlockShadeFog(bctx,col,crLowBlockSpanTop,crLowBlockSpanBottom,0,f.nearDepth[col],fog,fogStrength,visRange);
  }
}
function crDrawLowBlockClippedSpriteColumn(ctx, texture, srcX, col, top, screenH, depth){
  const f=crLowBlockEnsureFrame();
  const bottom=top+screenH;
  function drawSegment(y0,y1){
    y0=Math.max(top,y0); y1=Math.min(bottom,y1);
    if(y1<=y0) return;
    const sy=(y0-top)/screenH*texture.height, sh=(y1-y0)/screenH*texture.height;
    ctx.drawImage(texture,srcX,sy,1,sh,col,y0,1,y1-y0);
  }
  if(!f.active[col] || depth < f.nearDepth[col]){ drawSegment(top,bottom); return; }
  crLowBlockSpriteClipColumns++;
  const a=Math.min(f.sideTop[col],f.capTop[col]||f.sideTop[col]);
  const b=Math.max(f.sideBottom[col],f.capBottom[col]||f.sideBottom[col]);
  drawSegment(top,a); drawSegment(b,bottom);
}
