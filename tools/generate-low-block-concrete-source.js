'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'authoring', 'buildings', 'low_block_concrete_001', 'source');
const SIZE = 64;
const FACE_TONES = Object.freeze({
  north: [111, 116, 118],
  east: [102, 108, 111],
  south: [124, 128, 129],
  west: [115, 119, 120],
  top: [139, 143, 143]
});

function grain(x, y, salt) {
  const value = ((x * 17 + y * 31 + salt * 47) ^ (x * 7 + y * 13 + salt * 19)) & 15;
  return value - 7;
}

function buildFace(name) {
  const png = new PNG({ width: SIZE, height: SIZE, colorType: 6, inputColorType: 6, inputHasAlpha: true });
  const tone = FACE_TONES[name];
  const salt = ['north', 'east', 'south', 'west', 'top'].indexOf(name) + 1;
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
    const offset = (y * SIZE + x) * 4;
    const variation = grain(x, y, salt);
    const joint = name === 'top'
      ? ((x === 31 || x === 32 || y === 31 || y === 32) ? -12 : 0)
      : ((y === 20 || y === 43) ? -9 : 0);
    const edge = (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) ? -5 : 0;
    png.data[offset] = tone[0] + variation + joint + edge;
    png.data[offset + 1] = tone[1] + variation + joint + edge;
    png.data[offset + 2] = tone[2] + variation + joint + edge;
    png.data[offset + 3] = 255;
  }
  return PNG.sync.write(png, { colorType: 6, inputColorType: 6, inputHasAlpha: true, deflateLevel: 9, deflateStrategy: 3 });
}

function main(argv) {
  const check = argv.includes('--check');
  const files = ['north', 'east', 'south', 'west', 'top'].map((name) => ({ name, bytes: buildFace(name) }));
  if (check) {
    for (const file of files) {
      const target = path.join(OUTPUT, `${file.name}.png`);
      if (!fs.existsSync(target) || !fs.readFileSync(target).equals(file.bytes)) throw new Error(`source asset drift: ${path.relative(ROOT, target).replace(/\\/g, '/')}`);
    }
  } else {
    fs.mkdirSync(OUTPUT, { recursive: true });
    for (const file of files) fs.writeFileSync(path.join(OUTPUT, `${file.name}.png`), file.bytes);
  }
  process.stdout.write(`${JSON.stringify({ pass: true, check, output: path.relative(ROOT, OUTPUT).replace(/\\/g, '/'), faces: files.map((file) => file.name) })}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { buildFace, SIZE };
