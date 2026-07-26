'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { assetModulePath, registerBuildingAsset } = require('./register-building-asset');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_SCHEMA = 'snc-building-source-v1';
const RUNTIME_SCHEMA = 'snc-bitmap-building-asset-v1';
const COMPILER_VERSION = 'snc-building-asset-compiler-v1';
const DEFAULT_PIXELS_PER_CELL = 128;
const DEFAULT_FACE_HEIGHT = 256;

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function stableJson(value) { return JSON.stringify(value); }
function readJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { throw new Error(`invalid JSON ${filePath}: ${error.message}`); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function isSafeId(value) { return typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value); }
function toSymbol(id) { return id.toUpperCase().replace(/[^A-Z0-9]+/g, '_'); }

function readPng(filePath, label) {
  assert(path.extname(filePath).toLowerCase() === '.png', `${label} must be a PNG file`);
  const bytes = fs.readFileSync(filePath);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${label} is not a PNG`);
  let png;
  try { png = PNG.sync.read(bytes); }
  catch (error) { throw new Error(`${label} cannot be decoded: ${error.message}`); }
  assert(png.width > 0 && png.height > 0, `${label} has invalid dimensions`);
  return { bytes, png, sha256: sha256(bytes), filePath };
}

function resizeNearest(source, width, height) {
  const output = new PNG({ width, height, colorType: 6, inputColorType: 6, inputHasAlpha: true });
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const sourceX = Math.min(source.width - 1, Math.floor(x * source.width / width));
    const sourceY = Math.min(source.height - 1, Math.floor(y * source.height / height));
    const sourceOffset = (sourceY * source.width + sourceX) * 4;
    const outputOffset = (y * width + x) * 4;
    source.data.copy(output.data, outputOffset, sourceOffset, sourceOffset + 4);
  }
  return output;
}

function loadSource(buildingDir) {
  const manifestPath = path.join(buildingDir, 'building.json');
  const source = readJson(manifestPath);
  assert(source.schema === SOURCE_SCHEMA, `building.json schema must be ${SOURCE_SCHEMA}`);
  assert(isSafeId(source.id), 'building.json id must use lowercase letters, digits, and underscores');
  const footprint = source.footprint || {};
  assert(Number.isInteger(footprint.widthCells) && footprint.widthCells > 0, 'footprint.widthCells must be a positive integer');
  assert(Number.isInteger(footprint.depthCells) && footprint.depthCells > 0, 'footprint.depthCells must be a positive integer');
  if (Object.prototype.hasOwnProperty.call(source, 'heightScale')) {
    assert(Number.isFinite(source.heightScale) && source.heightScale > 0 && source.heightScale <= 1,
      'heightScale must be a finite number greater than 0 and at most 1');
  }
  if (Object.prototype.hasOwnProperty.call(source, 'alphaCutout')) assert(typeof source.alphaCutout === 'boolean', 'alphaCutout must be Boolean');
  if (Object.prototype.hasOwnProperty.call(source, 'topCap')) assert(['none', 'solid', 'masked/asset'].includes(source.topCap), 'topCap must be none, solid, or masked/asset');
  const reusableMode = typeof source.face === 'string';
  assert(reusableMode || (source.faces && typeof source.faces === 'object'), 'building.json requires face or faces');
  if (!reusableMode) for (const name of ['front', 'side', 'back']) assert(typeof source.faces[name] === 'string', `faces.${name} is required`);
  const allowed = new Set(['schema', 'id', 'displayName', 'category', 'notes', 'footprint', 'heightScale', 'alphaCutout', 'topCap', 'face', 'faces']);
  for (const key of Object.keys(source)) assert(allowed.has(key), `unknown building.json property: ${key}`);
  const sourceInputs = {};
  const faceFiles = {};
  const facePaths = reusableMode
    ? Object.fromEntries(['front', 'side', 'back', 'west'].map((name) => [name, source.faces && source.faces[name] ? source.faces[name] : source.face]))
    : source.faces;
  if (source.faces) for (const name of Object.keys(source.faces)) assert(['front', 'side', 'back', 'west'].includes(name), `unknown face name: ${name}`);
  for (const [name, relativePath] of Object.entries(facePaths)) {
    assert(!path.isAbsolute(relativePath) && !relativePath.includes('..'), `face path escapes building folder: ${name}`);
    if (!sourceInputs[relativePath]) sourceInputs[relativePath] = readPng(path.join(buildingDir, relativePath), reusableMode && relativePath === source.face ? 'face' : `faces.${name}`);
    faceFiles[name] = sourceInputs[relativePath];
  }
  let pixelsPerCell;
  if (reusableMode) {
    pixelsPerCell = DEFAULT_PIXELS_PER_CELL;
    for (const [name, face] of Object.entries(faceFiles)) {
      const spanCells = (name === 'front' || name === 'back') ? footprint.widthCells : footprint.depthCells;
      faceFiles[name] = { ...face, png: resizeNearest(face.png, spanCells * pixelsPerCell, DEFAULT_FACE_HEIGHT) };
    }
  } else {
    const height = faceFiles.front.png.height;
    for (const [name, face] of Object.entries(faceFiles)) assert(face.png.height === height, `faces.${name} height must match front.png`);
    pixelsPerCell = faceFiles.front.png.width / footprint.widthCells;
    assert(Number.isInteger(pixelsPerCell) && pixelsPerCell > 0, 'front width must divide exactly by footprint.widthCells');
    assert(faceFiles.back.png.width === footprint.widthCells * pixelsPerCell, 'back width must match footprint.widthCells');
    assert(faceFiles.side.png.width === footprint.depthCells * pixelsPerCell, 'side width must match footprint.depthCells');
    if (faceFiles.west) assert(faceFiles.west.png.width === footprint.depthCells * pixelsPerCell, 'west width must match footprint.depthCells');
  }
  return {
    source, manifestPath, faceFiles, pixelsPerCell, reusableMode, sourceInputs,
    hasWestOverride: reusableMode ? Boolean(source.faces && source.faces.west) : Boolean(faceFiles.west)
  };
}

function packAtlas(loaded) {
  const order = ['front', 'side', 'back'];
  if (loaded.hasWestOverride) order.push('west');
  const height = loaded.faceFiles.front.png.height;
  const width = order.reduce((total, name) => total + loaded.faceFiles[name].png.width, 0);
  const atlas = new PNG({ width, height, colorType: 6, inputColorType: 6, inputHasAlpha: true });
  let x = 0;
  const slices = {};
  for (const name of order) {
    const face = loaded.faceFiles[name];
    PNG.bitblt(face.png, atlas, 0, 0, face.png.width, face.png.height, x, 0);
    slices[name] = { x, y: 0, w: face.png.width, h: face.png.height };
    x += face.png.width;
  }
  const bytes = PNG.sync.write(atlas, { colorType: 6, inputColorType: 6, inputHasAlpha: true, deflateLevel: 9, deflateStrategy: 3 });
  return { bytes, width, height, slices };
}

function faceAsset(role, faceType, spanCells, slice, mirrorSafe) {
  const value = { role, faceType, spanCells, slice };
  if (mirrorSafe !== undefined) value.mirrorSafe = mirrorSafe;
  return value;
}

function compileBuilding(buildingDir) {
  const absoluteDir = path.resolve(buildingDir);
  const loaded = loadSource(absoluteDir);
  const { source, faceFiles } = loaded;
  const atlas = packAtlas(loaded);
  const id = source.id;
  const hasWest = loaded.hasWestOverride;
  const sourceHashes = loaded.reusableMode
    ? Object.fromEntries(Object.entries(loaded.sourceInputs).map(([relativePath, face]) => [relativePath === source.face ? 'face' : relativePath, face.sha256]))
    : Object.fromEntries(Object.entries(faceFiles).map(([name, face]) => [name, face.sha256]));
  const faceAssets = {
    front_unique: faceAsset('unique', 'front', source.footprint.widthCells, atlas.slices.front),
    side_shared: faceAsset('shared', 'side', source.footprint.depthCells, atlas.slices.side, false),
    back_unique: faceAsset('unique', 'back', source.footprint.widthCells, atlas.slices.back)
  };
  if (hasWest) faceAssets.west_unique = faceAsset('unique', 'west', source.footprint.depthCells, atlas.slices.west, false);
  const faces = {
    south: { role: 'unique', assetRef: 'front_unique', spanCells: source.footprint.widthCells, sourceUDirection: 'x_increasing', sourceLeftToRightWorldDirection: 'west_to_east', mirror: false, reuse: null },
    east: { role: 'shared', assetRef: 'side_shared', spanCells: source.footprint.depthCells, sourceUDirection: 'depth_decreasing', sourceLeftToRightWorldDirection: 'south_to_north', mirror: false, reuse: null },
    north: { role: 'unique', assetRef: 'back_unique', spanCells: source.footprint.widthCells, sourceUDirection: 'x_decreasing', sourceLeftToRightWorldDirection: 'east_to_west', mirror: false, reuse: null },
    west: hasWest
      ? { role: 'unique', assetRef: 'west_unique', spanCells: source.footprint.depthCells, sourceUDirection: 'depth_increasing', sourceLeftToRightWorldDirection: 'north_to_south', mirror: false, reuse: null }
      : { role: 'reuse', assetRef: 'side_shared', spanCells: source.footprint.depthCells, sourceUDirection: 'depth_increasing', sourceLeftToRightWorldDirection: 'north_to_south', mirror: false, reuse: 'east' }
  };
  const asset = {
    schema: RUNTIME_SCHEMA,
    schemaVersion: 1,
    id,
    generator: COMPILER_VERSION,
    canonicalFormat: 'bitmap',
    mime: 'image/png',
    encoding: 'data-uri',
    renderMode: 'importedWholeFaceAsset',
    approvalStatus: 'unreviewed',
    footprint: { wCells: source.footprint.widthCells, hCells: source.footprint.depthCells },
    heightScale: Number.isFinite(source.heightScale) ? source.heightScale : 1,
    alphaCutout: source.alphaCutout === true,
    topCap: source.topCap || 'none',
    atlas: {
      fileName: `${id}.atlas.png`, mime: 'image/png', encoding: 'data-uri', width: atlas.width, height: atlas.height,
      byteLength: atlas.bytes.length, sha256: sha256(atlas.bytes), dataUri: `data:image/png;base64,${atlas.bytes.toString('base64')}`
    },
    source: {
      schema: SOURCE_SCHEMA,
      mode: loaded.reusableMode ? 'single-reusable-face' : 'directional-faces',
      manifest: path.relative(ROOT, loaded.manifestPath).replace(/\\/g, '/'),
      sourceHashes
    },
    faceAssets,
    faces
  };
  return { asset, atlas, loaded, outputPath: path.join(ROOT, assetModulePath(id)) };
}

function emitAssetModule(compiled) {
  const { asset } = compiled;
  const symbol = toSymbol(asset.id);
  const assetJson = stableJson(asset);
  return `// GENERATED by ${COMPILER_VERSION}; source: ${asset.source.manifest}; DO NOT EDIT.\n` +
`const ${symbol}_LOAD_STATE = { status: "pending", error: null, image: null };\n` +
`const ${symbol} = Object.freeze(Object.assign(${assetJson}, { loadState: ${symbol}_LOAD_STATE }));\n` +
`var BITMAP_BUILDING_ASSET_REGISTRY = (typeof window !== "undefined" && window.BITMAP_BUILDING_ASSET_REGISTRY) || Object.create(null);\n` +
`BITMAP_BUILDING_ASSET_REGISTRY[${symbol}.id] = ${symbol};\n` +
`if(typeof window !== "undefined") { window.BITMAP_BUILDING_ASSET_REGISTRY = BITMAP_BUILDING_ASSET_REGISTRY; window.${symbol} = ${symbol}; }\n` +
`if(typeof Image !== "undefined") {\n` +
`  var ${symbol}_ATLAS_IMAGE = new Image();\n` +
`  ${symbol}_LOAD_STATE.image = ${symbol}_ATLAS_IMAGE;\n` +
`  ${symbol}_ATLAS_IMAGE.decoding = "async";\n` +
`  ${symbol}_ATLAS_IMAGE.onload = function(){\n` +
`    if(${symbol}_ATLAS_IMAGE.naturalWidth !== ${symbol}.atlas.width || ${symbol}_ATLAS_IMAGE.naturalHeight !== ${symbol}.atlas.height){ ${symbol}_LOAD_STATE.status = "invalid_dimensions"; ${symbol}_LOAD_STATE.error = "atlas dimensions do not match the asset contract"; return; }\n` +
`    ${symbol}_LOAD_STATE.status = "loaded"; ${symbol}_LOAD_STATE.error = null;\n` +
`  };\n` +
`  ${symbol}_ATLAS_IMAGE.onerror = function(){ ${symbol}_LOAD_STATE.status = "failed"; ${symbol}_LOAD_STATE.error = "atlas image failed to load"; };\n` +
`  ${symbol}_ATLAS_IMAGE.src = ${symbol}.atlas.dataUri;\n` +
`}\n`;
}

function writeCompiledBuilding(buildingDir, { write = false, register = true } = {}) {
  const compiled = compileBuilding(buildingDir);
  const text = emitAssetModule(compiled);
  const existing = fs.existsSync(compiled.outputPath) ? fs.readFileSync(compiled.outputPath, 'utf8') : null;
  const changed = existing !== text;
  if (write && changed) fs.writeFileSync(compiled.outputPath, text, 'utf8');
  const registration = register && (write || fs.existsSync(compiled.outputPath))
    ? registerBuildingAsset(compiled.asset.id, { write }) : null;
  return { ...compiled, text, changed, registration };
}

function main(argv) {
  const buildingDir = argv.find((arg) => !arg.startsWith('--'));
  if (!buildingDir) throw new Error('usage: node tools/building-asset-compiler.js <building-dir> [--check]');
  const check = argv.includes('--check');
  const result = writeCompiledBuilding(buildingDir, { write: !check });
  if (check && result.changed) throw new Error(`generated asset drift: ${path.relative(ROOT, result.outputPath)}; run building:build`);
  process.stdout.write(`${JSON.stringify({ pass: true, mode: check ? 'check' : 'build', assetId: result.asset.id, output: path.relative(ROOT, result.outputPath).replace(/\\/g, '/'), atlas: { width: result.atlas.width, height: result.atlas.height, sha256: result.asset.atlas.sha256 }, registered: result.registration ? !result.registration.changed || !check : false })}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { COMPILER_VERSION, SOURCE_SCHEMA, RUNTIME_SCHEMA, compileBuilding, emitAssetModule, loadSource, packAtlas, resizeNearest, writeCompiledBuilding };
