'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const outputArg = process.argv.find((arg) => arg.startsWith('--output-dir='));
const outputDir = path.resolve(root, outputArg ? outputArg.slice('--output-dir='.length) : path.join('test-results', 'pr29-seated-anchor-calibration-007', 'source-diagnostic'));
assert(outputDir.startsWith(path.join(root, 'test-results') + path.sep), 'diagnostic output remains ignored');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'authoring/characters/character-assets-v2.json'), 'utf8'));
const asset = manifest.assets.find((candidate) => candidate.assetId === 'npc_unhoused_slumped_001');
assert(asset, 'slumped runtime asset exists');
const sourceBytes = fs.readFileSync(path.join(root, asset.runtimePath));
const png = PNG.sync.read(sourceBytes);
const alpha = (x, y) => png.data[(y * png.width + x) * 4 + 3];
const visible = (x, y) => alpha(x, y) > 0;
const rowStats = Array.from({ length: png.height }, (_, row) => {
  let visiblePixels = 0, opaquePixels = 0, partialPixels = 0, alphaSum = 0, longestSpan = 0, span = 0;
  for(let x = 0; x < png.width; x++){
    const value = alpha(x, row);
    if(value){
      visiblePixels++; alphaSum += value; span++; longestSpan = Math.max(longestSpan, span);
      if(value === 255) opaquePixels++; else partialPixels++;
    } else span = 0;
  }
  return { row, visiblePixels, opaquePixels, partialPixels, meanAlpha: visiblePixels ? alphaSum / visiblePixels : 0, longestSpan };
});
const lowerThirdStart = Math.floor(png.height * 2 / 3);
const visited = new Uint8Array(png.width * png.height);
const lowerThirdComponents = [];
for(let y = lowerThirdStart; y < png.height; y++) for(let x = 0; x < png.width; x++){
  const seed = y * png.width + x;
  if(visited[seed] || !visible(x, y)) continue;
  visited[seed] = 1;
  const stack = [seed];
  let pixels = 0, minX = x, maxX = x, minY = y, maxY = y;
  while(stack.length){
    const index = stack.pop(), cx = index % png.width, cy = (index / png.width) | 0;
    pixels++; minX = Math.min(minX, cx); maxX = Math.max(maxX, cx); minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
    for(const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]){
      const nx = cx + dx, ny = cy + dy, next = ny * png.width + nx;
      if(nx < 0 || nx >= png.width || ny < lowerThirdStart || ny >= png.height || visited[next] || !visible(nx, ny)) continue;
      visited[next] = 1; stack.push(next);
    }
  }
  lowerThirdComponents.push({ pixels, minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 });
}
lowerThirdComponents.sort((a, b) => b.pixels - a.pixels);

const alphaBounds = asset.runtimeAlphaBounds;
const shoeRows = rowStats.filter((entry) => entry.row >= lowerThirdStart && entry.longestSpan >= 80 && entry.opaquePixels / Math.max(1, entry.visiblePixels) >= 0.7);
const detectedShoeContactPixelRow = Math.max(...shoeRows.map((entry) => entry.row));
const detectedFootContactSourceY = detectedShoeContactPixelRow + 1;
const comparisonRows = Object.freeze({ A: detectedFootContactSourceY, B: detectedFootContactSourceY - 4, C: detectedFootContactSourceY - 8 });
const detachedOrShadowComponents = lowerThirdComponents.filter((component) => component.minY >= detectedFootContactSourceY || component.maxY >= detectedFootContactSourceY);
const lowerTailRows = rowStats.filter((entry) => entry.row >= detectedFootContactSourceY && entry.row < alphaBounds.y + alphaBounds.h && entry.visiblePixels > 0);

assert.strictEqual(asset.worldHeight, 0.68, 'canonical seated physical height remains locked');
assert.strictEqual(asset.displayHeightScale, 0.45, 'canonical seated display scale remains locked');
assert.strictEqual(asset.groundContactSourceY, 184, 'canonical seated contact row is not changed by comparison work');
assert.strictEqual(crypto.createHash('sha256').update(sourceBytes).digest('hex'), '0124303d47ccc1fbf0c0f4fd729ad9d82f3e0339cf4e21ee6b0c6f5dcd8b8895', 'source PNG remains byte-locked');
assert.strictEqual(detectedShoeContactPixelRow, 181, 'the last continuous opaque shoe-sole row is detected from artwork');
assert.deepStrictEqual(comparisonRows, { A: 182, B: 178, C: 174 }, 'query-only rows derive from the detected shoe-contact boundary');
assert(lowerTailRows.length > 0, 'artwork contains lower shadow or detached tail pixels after the detected shoe contact');
assert(detachedOrShadowComponents.some((component) => component.maxY >= 188), 'lower-third analysis retains the detached shadow or stray-pixel evidence');

const scale = 4, panelWidth = 260;
const image = new PNG({ width: png.width * scale + panelWidth, height: png.height * scale });
const paint = (x, y, r, g, b, a = 255) => {
  if(x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const index = (y * image.width + x) * 4;
  image.data[index] = r; image.data[index + 1] = g; image.data[index + 2] = b; image.data[index + 3] = a;
};
const fillRect = (x, y, width, height, color) => {
  for(let py = y; py < y + height; py++) for(let px = x; px < x + width; px++) paint(px, py, ...color);
};
const blendRect = (x, y, width, height, color, opacity) => {
  for(let py = y; py < y + height; py++) for(let px = x; px < x + width; px++){
    if(px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
    const index = (py * image.width + px) * 4;
    image.data[index] = Math.round(image.data[index] * (1 - opacity) + color[0] * opacity);
    image.data[index + 1] = Math.round(image.data[index + 1] * (1 - opacity) + color[1] * opacity);
    image.data[index + 2] = Math.round(image.data[index + 2] * (1 - opacity) + color[2] * opacity);
  }
};
for(let y = 0; y < image.height; y++) for(let x = 0; x < image.width; x++){
  const shade = ((x / 16 | 0) + (y / 16 | 0)) % 2 ? 42 : 54;
  paint(x, y, shade, shade + 4, shade + 12);
}
for(let sy = 0; sy < png.height; sy++) for(let sx = 0; sx < png.width; sx++){
  const source = (sy * png.width + sx) * 4, opacity = png.data[source + 3] / 255;
  for(let oy = 0; oy < scale; oy++) for(let ox = 0; ox < scale; ox++){
    const x = sx * scale + ox, y = sy * scale + oy, index = (y * image.width + x) * 4;
    image.data[index] = Math.round(image.data[index] * (1 - opacity) + png.data[source] * opacity);
    image.data[index + 1] = Math.round(image.data[index + 1] * (1 - opacity) + png.data[source + 1] * opacity);
    image.data[index + 2] = Math.round(image.data[index + 2] * (1 - opacity) + png.data[source + 2] * opacity);
    image.data[index + 3] = 255;
  }
}
for(let y = detectedFootContactSourceY - 8; y <= detectedShoeContactPixelRow; y++) for(let x = 0; x < png.width; x++) if(visible(x, y)) blendRect(x * scale, y * scale, scale, scale, [255, 224, 64], 0.42);
for(let y = detectedFootContactSourceY; y < alphaBounds.y + alphaBounds.h; y++) for(let x = 0; x < png.width; x++) if(visible(x, y)) blendRect(x * scale, y * scale, scale, scale, [255, 56, 168], 0.38);
const line = (row, color, thickness = 2) => fillRect(0, row * scale, png.width * scale, thickness, color);
const dashedBox = (x, y, width, height, color) => {
  for(let px = x; px < x + width; px += 10) { fillRect(px, y, 6, 2, color); fillRect(px, y + height - 2, 6, 2, color); }
  for(let py = y; py < y + height; py += 10) { fillRect(x, py, 2, 6, color); fillRect(x + width - 2, py, 2, 6, color); }
};
dashedBox(alphaBounds.x * scale, alphaBounds.y * scale, alphaBounds.w * scale, alphaBounds.h * scale, [72, 232, 255]);
line(detectedShoeContactPixelRow, [255, 224, 64], 2);
line(comparisonRows.A, [0, 232, 255], 3);
line(comparisonRows.B, [255, 154, 61], 3);
line(comparisonRows.C, [255, 78, 203], 3);
line(asset.groundContactSourceY, [234, 234, 234], 2);
for(const [index, component] of detachedOrShadowComponents.slice(0, 6).entries()){
  const color = [[255, 78, 203], [145, 92, 255], [255, 154, 61], [120, 240, 130], [255, 224, 64], [72, 232, 255]][index];
  dashedBox(component.minX * scale, component.minY * scale, component.width * scale, component.height * scale, color);
}
const panelX = png.width * scale + 16;
for(const entry of rowStats.filter((candidate) => candidate.row >= 160 && candidate.row < png.height)){
  const y = entry.row * scale;
  fillRect(panelX, y, Math.round(entry.visiblePixels), 2, [96, 168, 255]);
  fillRect(panelX, y + 2, Math.round(entry.opaquePixels), 2, [255, 224, 64]);
  if(entry.row % 4 === 0) fillRect(panelX - 8, y, 5, 4, [230, 230, 230]);
}
for(const [row, color] of [[detectedShoeContactPixelRow, [255, 224, 64]], [comparisonRows.A, [0, 232, 255]], [comparisonRows.B, [255, 154, 61]], [comparisonRows.C, [255, 78, 203]], [asset.groundContactSourceY, [234, 234, 234]]]) fillRect(panelX - 12, row * scale, panelWidth - 26, 2, color);
const outputJson = path.join(outputDir, 'seated-anchor-source-diagnostic.json');
const outputPng = path.join(outputDir, 'seated-anchor-source-diagnostic.png');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputJson, JSON.stringify({
  schema: 'snc-seated-anchor-source-diagnostic-v1',
  assetId: asset.assetId, runtimePath: asset.runtimePath, runtimeSha256: asset.runtimeSha256, runtimeSize: asset.runtimeSize,
  alphaBounds, lowerThirdStart, canonicalGroundContactSourceY: asset.groundContactSourceY,
  shoeContact: {
    detectedShoeContactPixelRow, detectedFootContactSourceY,
    method: 'last lower-third row with a contiguous 80-pixel shoe span and at least 70% fully opaque pixels',
    rationale: 'Rows 182-188 are fragmented lower-tail, detached-shadow, and anti-alias evidence rather than the continuous shoe sole.'
  },
  comparisonRows, rowOccupancy: rowStats, lowerThirdComponents, detachedOrShadowComponents, lowerTailRows,
  annotations: {
    cyan: 'alpha bounds and candidate A boundary', orange: 'candidate B boundary', magenta: 'candidate C boundary and lower shadow/tail pixels',
    yellow: 'detected continuous shoe sole', white: 'current canonical source row 184', rightPanel: 'row occupancy bars: blue visible pixels; yellow fully opaque pixels'
  }
}, null, 2) + '\n');
fs.writeFileSync(outputPng, PNG.sync.write(image));
console.log(JSON.stringify({ pass: true, outputJson: path.relative(root, outputJson), outputPng: path.relative(root, outputPng), comparisonRows, canonicalGroundContactSourceY: asset.groundContactSourceY }));
