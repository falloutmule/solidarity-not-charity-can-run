'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/js/game-21b-asset-gallery-mode.js'), 'utf8');
const context = {
  Math,
  innerWidth: 390,
  innerHeight: 844,
  cfg: { fov: 0.66 },
  player: { x: 0, y: 0, angle: 0 },
  readSafeAreaInsets: () => ({ top: 28, right: 0, bottom: 0, left: 12 })
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'game-21b-asset-gallery-mode.js' });

const focusLeft = { category: 'prop', object: { x: 4, y: -1 }, distance: 4.2 };
const rightPlacement = context.crAssetGalleryFocusPanelPlacement(focusLeft, 154, 36);
assert.strictEqual(rightPlacement.side, 'right', 'a left-side subject moves the panel to the right edge');
assert.strictEqual(rightPlacement.y, 36, 'top safe-area inset and fixed gap determine the vertical edge');
assert.strictEqual(rightPlacement.x, 228, 'right placement honors the deterministic viewport edge gap');
const leftBounds = context.crAssetGalleryFocusScreenBounds(focusLeft, 390, 844);
assert.strictEqual(context.crAssetGalleryPanelRectOverlaps(rightPlacement, leftBounds), false, 'right panel clears its focused subject');

const focusRight = { category: 'prop', object: { x: 4, y: 1 }, distance: 4.2 };
const leftPlacement = context.crAssetGalleryFocusPanelPlacement(focusRight, 154, 36);
assert.strictEqual(leftPlacement.side, 'left', 'a right-side subject moves the panel to the left edge');
assert.strictEqual(leftPlacement.x, 20, 'left placement honors the left safe-area inset');
const rightBounds = context.crAssetGalleryFocusScreenBounds(focusRight, 390, 844);
assert.strictEqual(context.crAssetGalleryPanelRectOverlaps(leftPlacement, rightBounds), false, 'left panel clears its focused subject');

const fullWidthBuilding = { category: 'building', object: { x: 1, y: 0, widthCells: 20, depthCells: 20 }, distance: 1 };
assert.strictEqual(context.crAssetGalleryFocusPanelPlacement(fullWidthBuilding, 154, 36), null, 'panel is hidden when neither safe edge clears a focused subject');
assert(source.includes('if(!crAssetGalleryIsActive()) return;'), 'normal mode still returns before any gallery panel work');

console.log(JSON.stringify({ pass: true, placements: ['right', 'left', 'hidden'] }));
