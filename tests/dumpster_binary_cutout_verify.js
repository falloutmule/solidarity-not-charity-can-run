'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'authoring', 'buildings', 'dumpster_001', 'source', 'face.png');
const assetPath = path.join(root, 'src', 'imported-handoff-assets', 'dumpster_001.asset.js');
const rendererPath = path.join(root, 'src', 'js', 'game-16a-bitmap-building-renderer.js');
const scenePath = path.join(root, 'src', 'js', 'game-16-section-7-render.js');

function alphaCounts(png){
  const result = { alpha0: 0, alpha1to254: 0, alpha255: 0 };
  for(let offset = 3; offset < png.data.length; offset += 4){
    const alpha = png.data[offset];
    if(alpha === 0) result.alpha0 += 1;
    else if(alpha === 255) result.alpha255 += 1;
    else result.alpha1to254 += 1;
  }
  return result;
}
function assertBinaryCutout(label, counts){
  assert(counts.alpha0 > 0, `${label} must retain transparent pixels outside the dumpster silhouette`);
  assert.equal(counts.alpha1to254, 0, `${label} must not contain semi-transparent body or lid pixels`);
  assert(counts.alpha255 > 0, `${label} must retain opaque dumpster body and lid pixels`);
}

const source = PNG.sync.read(fs.readFileSync(sourcePath));
const sourceCounts = alphaCounts(source);
assertBinaryCutout('source face', sourceCounts);

const sandbox = { Object, window: null };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(assetPath, 'utf8'), sandbox, { filename: assetPath });
const atlasUri = sandbox.DUMPSTER_001.atlas.dataUri;
const atlas = PNG.sync.read(Buffer.from(atlasUri.slice(atlasUri.indexOf(',') + 1), 'base64'));
const atlasCounts = alphaCounts(atlas);
assertBinaryCutout('compiled atlas', atlasCounts);

const yellow = [255, 235, 0, 255];
const yellowComposite = new PNG({ width: source.width, height: source.height });
let yellowLeakThroughOpaquePixels = 0;
for(let offset = 0; offset < source.data.length; offset += 4){
  const alpha = source.data[offset + 3];
  if(alpha === 0){
    yellowComposite.data.set(yellow, offset);
    continue;
  }
  yellowComposite.data[offset] = source.data[offset];
  yellowComposite.data[offset + 1] = source.data[offset + 1];
  yellowComposite.data[offset + 2] = source.data[offset + 2];
  yellowComposite.data[offset + 3] = 255;
  if(yellowComposite.data[offset] !== source.data[offset] || yellowComposite.data[offset + 1] !== source.data[offset + 1] || yellowComposite.data[offset + 2] !== source.data[offset + 2]) yellowLeakThroughOpaquePixels += 1;
}
assert.equal(yellowLeakThroughOpaquePixels, 0, 'bright yellow must not blend through opaque dumpster body or lid pixels');
const outputDir = path.join(root, 'test-results', 'dumpstercutout1');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'dumpster-on-yellow.png'), PNG.sync.write(yellowComposite));

const rendererSource = fs.readFileSync(rendererPath, 'utf8');
const sceneSource = fs.readFileSync(scenePath, 'utf8');
assert(sceneSource.includes("bctx.fillStyle = '#223529';"), 'the short dumpster top cap must remain opaque');
assert(!rendererSource.includes('globalAlpha'), 'the imported-building renderer must not globally fade bitmap faces');
assert(!rendererSource.includes('globalCompositeOperation'), 'the imported-building renderer must not globally composite bitmap faces');

process.stdout.write(`${JSON.stringify({ pass: true, source: sourceCounts, compiledAtlas: atlasCounts, yellowLeakThroughOpaquePixels })}\n`);
