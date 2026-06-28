// ---------------------------------------------------------------------------
// SECTION 4 — COLLISION / WALK HELPERS
// ---------------------------------------------------------------------------
function isWalkableCell(tx, ty){
  if(ty<0||ty>=game.MAP_H||tx<0||tx>=game.MAP_W) return false;
  return game.map[ty][tx] === 0;
}
function isWalkableAt(x, y){
  return isWalkableCell(Math.floor(x), Math.floor(y));
}
function hasClearance(x, y, radius){
  const pts=[
    [0,0],
    [-radius,0],[radius,0],[0,-radius],[0,radius],
    [-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]
  ];
  for(const [ox,oy] of pts){ if(!isWalkableAt(x+ox, y+oy)) return false; }
  return true;
}
function isWall(x,y){ return !isWalkableAt(x,y); }
function canStand(x,y){
  const r=0.22;
  return !isWall(x-r,y-r)&&!isWall(x+r,y-r)&&!isWall(x-r,y+r)&&!isWall(x+r,y+r);
}

/** Grid line-of-sight: true if straight segment does not cross a blocking cell. */
function gridTraceClear(x1, y1, x2, y2, options){
  options = options || {};
  const step = options.step != null ? options.step : 0.2;
  let samples = 0;
  let outOfBounds = false;
  try {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    if(!Number.isFinite(dist) || dist < 1e-9){
      const tx = Math.floor(x1), ty = Math.floor(y1);
      samples = 1;
      if(ty < 0 || ty >= game.MAP_H || tx < 0 || tx >= game.MAP_W){
        return { clear: false, blocked: true, blockedAt: { x: x1, y: y1, tx, ty, cell: null }, samples, outOfBounds: true };
      }
      const walk = isWalkableCell(tx, ty);
      return { clear: walk, blocked: !walk, blockedAt: walk ? null : { x: x1, y: y1, tx, ty, cell: game.map[ty][tx] }, samples, outOfBounds: false };
    }
    const n = Math.max(2, Math.ceil(dist / step));
    for(let i = 1; i <= n; i++){
      const t = i / n;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      const tx = Math.floor(x), ty = Math.floor(y);
      samples++;
      if(ty < 0 || ty >= game.MAP_H || tx < 0 || tx >= game.MAP_W){
        outOfBounds = true;
        return { clear: false, blocked: true, blockedAt: { x, y, tx, ty, cell: null }, samples, outOfBounds: true };
      }
      if(!isWalkableCell(tx, ty)){
        return { clear: false, blocked: true, blockedAt: { x, y, tx, ty, cell: game.map[ty][tx] }, samples, outOfBounds: false };
      }
    }
    return { clear: true, blocked: false, blockedAt: null, samples, outOfBounds: false };
  } catch(e){
    return { clear: false, blocked: true, blockedAt: null, samples, outOfBounds: outOfBounds, error: String(e && e.message || e) };
  }
}

function gridReachableFrom(startX, startY, options){
  options = options || {};
  const errors = [];
  const maxCells = options.maxCells != null ? options.maxCells : (game.MAP_W * game.MAP_H + 8);
  const stx = Math.floor(startX), sty = Math.floor(startY);
  const key = (tx, ty) => ty + ',' + tx;
  if(!isWalkableCell(stx, sty)){
    return { pass: false, count: 0, reachable: {}, startCell: { tx: stx, ty: sty }, errors: ['start not walkable'] };
  }
  const reachable = {};
  const q = [[stx, sty]];
  reachable[key(stx, sty)] = true;
  let qi = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while(qi < q.length){
    if(Object.keys(reachable).length >= maxCells){
      errors.push('maxCells cap');
      break;
    }
    const cell = q[qi++];
    const tx = cell[0], ty = cell[1];
    for(let d = 0; d < dirs.length; d++){
      const nx = tx + dirs[d][0], ny = ty + dirs[d][1];
      if(!isWalkableCell(nx, ny)) continue;
      const k = key(nx, ny);
      if(reachable[k]) continue;
      reachable[k] = true;
      q.push([nx, ny]);
    }
  }
  const count = Object.keys(reachable).length;
  return { pass: errors.length === 0, count, reachable, startCell: { tx: stx, ty: sty }, errors };
}

function isReachableCell(tx, ty, reachable){
  if(!reachable) return false;
  return !!reachable[ty + ',' + tx];
}

function interactionLineClear(playerX, playerY, targetX, targetY){
  return gridTraceClear(playerX, playerY, targetX, targetY, { step: 0.18 });
}

/** 2D movement with axis-separated substeps (q1k3-inspired tunnel guard). */
const CR_MOVE_SUBSTEP_MAX = 0.12;
function movePlayerWithCollision(dx, dy){
  if(!Number.isFinite(dx) || !Number.isFinite(dy)){
    return { steps: 0, moved: false, reason: 'non-finite' };
  }
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if(adx < 1e-9 && ady < 1e-9) return { steps: 0, moved: false };
  const n = Math.max(1, Math.ceil(Math.max(adx, ady) / CR_MOVE_SUBSTEP_MAX));
  const sx = dx / n, sy = dy / n;
  const x0 = player.x, y0 = player.y;
  for(let i = 0; i < n; i++){
    const px = player.x, py = player.y;
    if(canStand(player.x + sx, player.y)) player.x += sx;
    if(canStand(player.x, player.y + sy)) player.y += sy;
    if(!Number.isFinite(player.x) || !Number.isFinite(player.y) || !canStand(player.x, player.y)){
      player.x = px;
      player.y = py;
    }
  }
  return { steps: n, moved: Math.hypot(player.x - x0, player.y - y0) > 1e-7 };
}

