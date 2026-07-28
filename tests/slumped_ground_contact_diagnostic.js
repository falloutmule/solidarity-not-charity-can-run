'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const outputArg = process.argv.find((arg) => arg.startsWith('--output-dir='));
const outputDir = path.resolve(root, outputArg ? outputArg.slice('--output-dir='.length) : path.join('test-results', 'pr29-standing-lock-seated-ground-fix-006', 'slumped-contact-diagnostic'));
assert(outputDir.startsWith(path.join(root, 'test-results') + path.sep), 'diagnostic output must remain under ignored test-results');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'authoring/characters/character-assets-v2.json'), 'utf8'));
const asset = manifest.assets.find((candidate) => candidate.assetId === 'npc_unhoused_slumped_001');
assert(asset, 'slumped asset exists');
const png = PNG.sync.read(fs.readFileSync(path.join(root, asset.runtimePath)));
const alpha = (x, y) => png.data[(y * png.width + x) * 4 + 3];
const isVisible = (x, y) => alpha(x, y) > 0;
const rowOccupancy = Array.from({ length: png.height }, (_, row) => {
  let visible = 0, opaque = 0, partial = 0, alphaSum = 0;
  for(let x = 0; x < png.width; x++){
    const value = alpha(x, row);
    if(!value) continue;
    visible++; alphaSum += value;
    if(value === 255) opaque++; else partial++;
  }
  return { row, visible, opaque, partial, meanAlpha: visible ? alphaSum / visible : 0 };
});
const visited = new Uint8Array(png.width * png.height);
const components = [];
for(let y = 0; y < png.height; y++) for(let x = 0; x < png.width; x++){
  const seed = y * png.width + x;
  if(visited[seed] || !isVisible(x, y)) continue;
  const stack = [seed]; visited[seed] = 1;
  let pixels = 0, minX = x, maxX = x, minY = y, maxY = y;
  while(stack.length){
    const index = stack.pop(), cx = index % png.width, cy = (index / png.width) | 0;
    pixels++; minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
    for(const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]){
      const nx = cx + dx, ny = cy + dy;
      if(nx < 0 || ny < 0 || nx >= png.width || ny >= png.height) continue;
      const next = ny * png.width + nx;
      if(!visited[next] && isVisible(nx, ny)){ visited[next] = 1; stack.push(next); }
    }
  }
  components.push({ pixels, minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 });
}
components.sort((a, b) => b.pixels - a.pixels);

const alphaBounds = asset.runtimeAlphaBounds;
const selectedRow = asset.groundContactSourceY;
const alphaBottom = alphaBounds.y + alphaBounds.h;
const candidates = [173, 181, 182, alphaBottom].map((row) => ({
  row,
  selected: row === selectedRow,
  role: row === selectedRow ? 'chosen physical-contact boundary below the last intended shoe-contact row' : (row === alphaBottom ? 'old alpha-bound-bottom assumption' : 'reviewed shoe-contact marker')
}));
const lowerTail = rowOccupancy.filter((entry) => entry.row >= selectedRow && entry.row < alphaBottom);
assert.strictEqual(selectedRow, 182, 'seated source contact is the reviewed physical-contact boundary');
assert(alphaBounds.y < selectedRow && selectedRow <= alphaBottom, 'contact row lies within visible source bounds');
assert(rowOccupancy[173].visible > 0 && rowOccupancy[181].visible > 0, 'intended shoe/contact component occupies rows 173 through 181');
assert(rowOccupancy[selectedRow - 1].opaque > 0, 'chosen boundary follows the final intended shoe-contact row');
assert(lowerTail.some((entry) => entry.visible > 0), 'authored lower shadow/anti-alias pixels exist below the physical contact');
assert(rowOccupancy[alphaBottom - 1].opaque === 0, 'old alpha-bound-bottom row is only partial-alpha tail, not a physical contact row');

const scale = 4, panel = 176;
const outputImage = new PNG({ width: png.width * scale + panel, height: png.height * scale });
const paint = (x, y, r, g, b, a = 255) => {
  if(x < 0 || y < 0 || x >= outputImage.width || y >= outputImage.height) return;
  const index = (y * outputImage.width + x) * 4;
  outputImage.data[index] = r; outputImage.data[index + 1] = g; outputImage.data[index + 2] = b; outputImage.data[index + 3] = a;
};
for(let y = 0; y < outputImage.height; y++) for(let x = 0; x < outputImage.width; x++){
  const light = ((x / (scale * 4) | 0) + (y / (scale * 4) | 0)) % 2 === 0;
  paint(x, y, light ? 46 : 58, light ? 50 : 62, light ? 58 : 70);
}
for(let sy = 0; sy < png.height; sy++) for(let sx = 0; sx < png.width; sx++){
  const source = (sy * png.width + sx) * 4, opacity = png.data[source + 3] / 255;
  for(let oy = 0; oy < scale; oy++) for(let ox = 0; ox < scale; ox++){
    const x = sx * scale + ox, y = sy * scale + oy, target = (y * outputImage.width + x) * 4;
    outputImage.data[target] = Math.round(outputImage.data[target] * (1 - opacity) + png.data[source] * opacity);
    outputImage.data[target + 1] = Math.round(outputImage.data[target + 1] * (1 - opacity) + png.data[source + 1] * opacity);
    outputImage.data[target + 2] = Math.round(outputImage.data[target + 2] * (1 - opacity) + png.data[source + 2] * opacity);
    outputImage.data[target + 3] = 255;
  }
}
const line = (row, color, thickness = 1) => {
  const y = row * scale;
  for(let offset = 0; offset < thickness; offset++) for(let x = 0; x < png.width * scale; x++) paint(x, y + offset, ...color);
};
for(let row = 0; row < png.height; row += 8){
  line(row, [255, 255, 255, 70]);
  for(let y = row * scale; y < Math.min(outputImage.height, row * scale + scale); y++) for(let x = png.width * scale; x < png.width * scale + 10; x++) paint(x, y, 220, 220, 220);
}
line(alphaBounds.y, [60, 220, 132], 2);
line(173, [255, 202, 40], 2);
line(181, [255, 153, 60], 2);
line(selectedRow, [0, 230, 255], 3);
line(alphaBottom, [235, 64, 52], 3);
const outputJson = path.join(outputDir, 'slumped-ground-contact-diagnostic.json');
const outputPng = path.join(outputDir, 'slumped-ground-contact-diagnostic.png');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputJson, JSON.stringify({
  schema: 'snc-slumped-ground-contact-diagnostic-v1',
  assetId: asset.assetId, runtimePath: asset.runtimePath, runtimeSha256: asset.runtimeSha256,
  runtimeSize: asset.runtimeSize, alphaBounds, alphaBottomExclusive: alphaBottom,
  currentAssumedRow: alphaBottom, selectedGroundContactSourceY: selectedRow,
  candidates, rowOccupancy,
  bottomThirdComponents: components.filter((component) => component.maxY >= Math.floor(png.height * 2 / 3)),
  rationale: 'Rows 173 through 181 are the intended shoe/contact component. Rows 182 through 188 are lower shadow, detached, and anti-alias pixels, so row 182 is the physical contact boundary; the legacy alpha-bound bottom 189 is not physical ground.'
}, null, 2) + '\n');
fs.writeFileSync(outputPng, PNG.sync.write(outputImage));
console.log(JSON.stringify({ pass: true, outputJson: path.relative(root, outputJson), outputPng: path.relative(root, outputPng), selectedGroundContactSourceY: selectedRow, alphaBottom }));
