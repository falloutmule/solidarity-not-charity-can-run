'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'js', 'game-21c-short-building-gallery-compat.js');
const originalOpaqueRuns = Object.freeze([{ start: 3, end: 11 }]);
const dumpsterAsset = Object.freeze({
  id: 'dumpster_001',
  footprint: Object.freeze({ wCells: 1, hCells: 2 })
});

const sandbox = {
  Object, Set, Number, Math,
  resolveBitmapWorldFace(side, stepX, stepY){
    if(side === 0) return stepX > 0 ? 'west' : 'east';
    if(side === 1) return stepY > 0 ? 'north' : 'south';
    return null;
  },
  resolveWholeFaceBitmapBuildingColumn(){
    return { asset: dumpsterAsset, face: {}, sourceX: 7, opaqueRuns: originalOpaqueRuns, localFace: 'south' };
  }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), sandbox, { filename: sourcePath });

const placement = {
  assetId: 'dumpster_001',
  x: 3, y: 3, x0: 3, y0: 3,
  widthCells: 1, depthCells: 2,
  w: 1, h: 2,
  footprint: { widthCells: 1, depthCells: 2 }
};

function resolve({ side, stepX, stepY, px, py }){
  return sandbox.resolveWholeFaceBitmapBuildingColumn({ side, stepX, stepY, px, py }, placement);
}

// Directly south/front: south is visible; adjacent west face is transparent.
let result = resolve({ side: 1, stepX: 1, stepY: -1, px: 3.5, py: 5.7 });
assert.equal(result.selectedWorldFace, 'south');
assert.equal(result.worldFace, 'south');
assert.equal(result.singlePlaneSuppressed, false);
assert.strictEqual(result.opaqueRuns, originalOpaqueRuns);
result = resolve({ side: 0, stepX: 1, stepY: -1, px: 3.5, py: 5.7 });
assert.equal(result.selectedWorldFace, 'south');
assert.equal(result.worldFace, 'west');
assert.equal(result.singlePlaneSuppressed, true);
assert.equal(result.opaqueRuns.length, 0);

// Close southwest corner: exactly one dominant exterior plane remains opaque.
result = resolve({ side: 0, stepX: 1, stepY: -1, px: 2.55, py: 5.45 });
assert.equal(result.selectedWorldFace, 'west');
assert.equal(result.worldFace, 'west');
assert.equal(result.singlePlaneSuppressed, false);
result = resolve({ side: 1, stepX: 1, stepY: -1, px: 2.55, py: 5.45 });
assert.equal(result.selectedWorldFace, 'west');
assert.equal(result.worldFace, 'south');
assert.equal(result.singlePlaneSuppressed, true);
assert.equal(result.opaqueRuns.length, 0);

const diagnostics = sandbox.crGetSinglePlaneCutoutDiagnostics();
assert.equal(diagnostics.active, true);
assert.equal(diagnostics.assetId, 'dumpster_001');
assert.equal(diagnostics.selectedWorldFace, 'west');
assert(diagnostics.visibleColumns > 0);
assert(diagnostics.suppressedColumns > 0);

// Other imported cutouts remain on the generic renderer path.
const otherPlacement = Object.assign({}, placement, { assetId: 'other_cutout' });
const unaffected = sandbox.resolveWholeFaceBitmapBuildingColumn(
  { side: 1, stepX: 1, stepY: -1, px: 3.5, py: 5.7 }, otherPlacement);
assert.strictEqual(unaffected.opaqueRuns, originalOpaqueRuns);
assert.equal(unaffected.singlePlaneSuppressed, undefined);

process.stdout.write(`${JSON.stringify({
  pass: true,
  selectedWorldFace: diagnostics.selectedWorldFace,
  visibleColumns: diagnostics.visibleColumns,
  suppressedColumns: diagnostics.suppressedColumns
})}\n`);
