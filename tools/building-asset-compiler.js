'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { assetModulePath, registerBuildingAsset } = require('./register-building-asset');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_SCHEMA = 'snc-building-source-v1';
const RUNTIME_SCHEMA = 'snc-bitmap-building-asset-v1';
const SOLID_HEIGHT_SOURCE_SCHEMA = 'snc-solid-height-asset-v1';
const SOLID_HEIGHT_RUNTIME_SCHEMA = 'snc-solid-height-runtime-v1';
const COMPILER_VERSION = 'snc-building-asset-compiler-v1';
const SOLID_HEIGHT_FACE_ORDER = Object.freeze(['north', 'east', 'south', 'west', 'top']);
const SOLID_HEIGHT_FACE_SIZE = 64;

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

function assertFullyOpaque(face, label) {
  for (let offset = 3; offset < face.png.data.length; offset += 4) {
    assert(face.png.data[offset] === 255, `${label} must be fully opaque`);
  }
}

function normalizePng(png) {
  return PNG.sync.write(png, { colorType: 6, inputColorType: 6, inputHasAlpha: true, deflateLevel: 9, deflateStrategy: 3 });
}

function loadSolidHeightSource(buildingDir, source, manifestPath) {
  const allowed = new Set([
    'schema', 'id', 'displayName', 'category', 'renderMode', 'footprint', 'solidTopLevel',
    'collision', 'faces', 'alphaMode', 'filter', 'rotationMode'
  ]);
  for (const key of Object.keys(source)) assert(allowed.has(key), `unknown solid-height building.json property: ${key}`);
  assert(isSafeId(source.id), 'building.json id must use lowercase letters, digits, and underscores');
  assert(typeof source.displayName === 'string' && source.displayName.length > 0, 'building.json displayName is required');
  assert(typeof source.category === 'string' && source.category.length > 0, 'building.json category is required');
  assert(source.renderMode === 'solidHeightfield', 'renderMode must be solidHeightfield');
  assert(source.footprint && source.footprint.widthCells === 1 && source.footprint.depthCells === 1, 'solid-height footprint must be exactly 1x1');
  assert(source.solidTopLevel === 1, 'solidTopLevel must be the accepted half-height level 1');
  assert(source.collision === 'solid', 'collision must be solid');
  assert(source.alphaMode === 'opaque', 'alphaMode must be opaque');
  assert(source.filter === 'nearest', 'filter must be nearest');
  assert(source.rotationMode === 'quarterTurns', 'rotationMode must be quarterTurns');
  assert(source.faces && typeof source.faces === 'object', 'building.json faces are required');
  assert(Object.keys(source.faces).length === SOLID_HEIGHT_FACE_ORDER.length, 'solid-height faces must contain exactly five entries');
  assert(Object.keys(source.faces).every((name) => SOLID_HEIGHT_FACE_ORDER.includes(name)), 'solid-height faces contain an unknown entry');
  const paths = [];
  const faceFiles = {};
  for (const name of SOLID_HEIGHT_FACE_ORDER) {
    const relativePath = source.faces[name];
    assert(typeof relativePath === 'string', `faces.${name} is required`);
    assert(!path.isAbsolute(relativePath) && !relativePath.includes('..'), `face path escapes building folder: ${name}`);
    paths.push(relativePath);
    const face = readPng(path.join(buildingDir, relativePath), `faces.${name}`);
    assert(face.png.width === SOLID_HEIGHT_FACE_SIZE && face.png.height === SOLID_HEIGHT_FACE_SIZE,
      `faces.${name} must be ${SOLID_HEIGHT_FACE_SIZE}x${SOLID_HEIGHT_FACE_SIZE}`);
    assertFullyOpaque(face, `faces.${name}`);
    faceFiles[name] = face;
  }
  assert(new Set(paths).size === SOLID_HEIGHT_FACE_ORDER.length, 'solid-height faces must use five independent source files');
  return { kind: 'solidHeight', source, manifestPath, faceFiles, pixelsPerCell: SOLID_HEIGHT_FACE_SIZE };
}

function loadSource(buildingDir) {
  const manifestPath = path.join(buildingDir, 'building.json');
  const source = readJson(manifestPath);
  if (source.schema === SOLID_HEIGHT_SOURCE_SCHEMA) return loadSolidHeightSource(buildingDir, source, manifestPath);
  assert(source.schema === SOURCE_SCHEMA, `building.json schema must be ${SOURCE_SCHEMA}`);
  assert(isSafeId(source.id), 'building.json id must use lowercase letters, digits, and underscores');
  const footprint = source.footprint || {};
  assert(Number.isInteger(footprint.widthCells) && footprint.widthCells > 0, 'footprint.widthCells must be a positive integer');
  assert(Number.isInteger(footprint.depthCells) && footprint.depthCells > 0, 'footprint.depthCells must be a positive integer');
  assert(source.faces && typeof source.faces === 'object', 'building.json faces are required');
  for (const name of ['front', 'side', 'back']) assert(typeof source.faces[name] === 'string', `faces.${name} is required`);
  const allowed = new Set(['schema', 'id', 'displayName', 'category', 'notes', 'footprint', 'faces']);
  for (const key of Object.keys(source)) assert(allowed.has(key), `unknown building.json property: ${key}`);
  const faceFiles = {};
  for (const [name, relativePath] of Object.entries(source.faces)) {
    assert(['front', 'side', 'back', 'west'].includes(name), `unknown face name: ${name}`);
    assert(!path.isAbsolute(relativePath) && !relativePath.includes('..'), `face path escapes building folder: ${name}`);
    faceFiles[name] = readPng(path.join(buildingDir, relativePath), `faces.${name}`);
  }
  const height = faceFiles.front.png.height;
  for (const [name, face] of Object.entries(faceFiles)) assert(face.png.height === height, `faces.${name} height must match front.png`);
  const pixelsPerCell = faceFiles.front.png.width / footprint.widthCells;
  assert(Number.isInteger(pixelsPerCell) && pixelsPerCell > 0, 'front width must divide exactly by footprint.widthCells');
  assert(faceFiles.back.png.width === footprint.widthCells * pixelsPerCell, 'back width must match footprint.widthCells');
  assert(faceFiles.side.png.width === footprint.depthCells * pixelsPerCell, 'side width must match footprint.depthCells');
  if (faceFiles.west) assert(faceFiles.west.png.width === footprint.depthCells * pixelsPerCell, 'west width must match footprint.depthCells');
  return { kind: 'bitmapBuilding', source, manifestPath, faceFiles, pixelsPerCell };
}

function packAtlas(loaded) {
  const order = ['front', 'side', 'back'];
  if (loaded.faceFiles.west) order.push('west');
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

function compileSolidHeightAsset(loaded) {
  const { source, faceFiles } = loaded;
  const sourceHashes = {};
  const compiledFaces = {};
  for (const faceName of SOLID_HEIGHT_FACE_ORDER) {
    const face = faceFiles[faceName];
    const normalizedBytes = normalizePng(face.png);
    sourceHashes[faceName] = face.sha256;
    compiledFaces[faceName] = {
      stableId: `${source.id}_${faceName}`,
      face: faceName,
      width: face.png.width,
      height: face.png.height,
      mime: 'image/png',
      encoding: 'data-uri',
      byteLength: normalizedBytes.length,
      sha256: sha256(normalizedBytes),
      dataUri: `data:image/png;base64,${normalizedBytes.toString('base64')}`,
      opaque: true,
      filter: 'nearest'
    };
  }
  const descriptor = {
    schema: SOLID_HEIGHT_RUNTIME_SCHEMA,
    schemaVersion: 1,
    id: source.id,
    generator: COMPILER_VERSION,
    displayName: source.displayName,
    category: source.category,
    renderMode: source.renderMode,
    footprint: { widthCells: 1, depthCells: 1 },
    solidTopLevel: source.solidTopLevel,
    collision: source.collision,
    alphaMode: source.alphaMode,
    filter: source.filter,
    rotationMode: source.rotationMode,
    materials: compiledFaces,
    source: {
      schema: SOLID_HEIGHT_SOURCE_SCHEMA,
      manifest: path.relative(ROOT, loaded.manifestPath).replace(/\\/g, '/'),
      sourceHashes
    }
  };
  const asset = Object.assign(descriptor, { compiledHash: sha256(Buffer.from(stableJson(descriptor), 'utf8')) });
  return { asset, loaded, outputPath: path.join(ROOT, assetModulePath(asset.id)) };
}

function compileBuilding(buildingDir) {
  const absoluteDir = path.resolve(buildingDir);
  const loaded = loadSource(absoluteDir);
  if (loaded.kind === 'solidHeight') return compileSolidHeightAsset(loaded);
  const { source, faceFiles } = loaded;
  const atlas = packAtlas(loaded);
  const id = source.id;
  const hasWest = Boolean(faceFiles.west);
  const sourceHashes = Object.fromEntries(Object.entries(faceFiles).map(([name, face]) => [name, face.sha256]));
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
    atlas: {
      fileName: `${id}.atlas.png`, mime: 'image/png', encoding: 'data-uri', width: atlas.width, height: atlas.height,
      byteLength: atlas.bytes.length, sha256: sha256(atlas.bytes), dataUri: `data:image/png;base64,${atlas.bytes.toString('base64')}`
    },
    source: { schema: SOURCE_SCHEMA, manifest: path.relative(ROOT, loaded.manifestPath).replace(/\\/g, '/'), sourceHashes },
    faceAssets,
    faces
  };
  return { asset, atlas, loaded, outputPath: path.join(ROOT, assetModulePath(id)) };
}

function emitSolidHeightAssetModule(compiled) {
  const { asset } = compiled;
  const symbol = toSymbol(asset.id);
  const assetJson = stableJson(asset);
  return `// GENERATED by ${COMPILER_VERSION}; source: ${asset.source.manifest}; DO NOT EDIT.\n` +
`const ${symbol}_MATERIAL_LOAD_STATES = Object.create(null);\n` +
`const ${symbol} = Object.freeze(Object.assign(${assetJson}, { materialLoadStates: ${symbol}_MATERIAL_LOAD_STATES }));\n` +
`var SOLID_HEIGHT_ASSET_REGISTRY = (typeof window !== "undefined" && window.SOLID_HEIGHT_ASSET_REGISTRY) || Object.create(null);\n` +
`SOLID_HEIGHT_ASSET_REGISTRY[${symbol}.id] = ${symbol};\n` +
`if(typeof window !== "undefined") { window.SOLID_HEIGHT_ASSET_REGISTRY = SOLID_HEIGHT_ASSET_REGISTRY; window.${symbol} = ${symbol}; }\n` +
`Object.keys(${symbol}.materials).forEach(function(face){\n` +
`  var material = ${symbol}.materials[face];\n` +
`  var loadState = ${symbol}_MATERIAL_LOAD_STATES[face] = { status: "pending", error: null, image: null };\n` +
`  if(typeof Image === "undefined") return;\n` +
`  var image = new Image();\n` +
`  loadState.image = image; image.decoding = "async";\n` +
`  image.onload = function(){\n` +
`    if(image.naturalWidth !== material.width || image.naturalHeight !== material.height){ loadState.status = "invalid_dimensions"; loadState.error = "material dimensions do not match the asset contract"; return; }\n` +
`    loadState.status = "loaded"; loadState.error = null;\n` +
`  };\n` +
`  image.onerror = function(){ loadState.status = "failed"; loadState.error = "material image failed to load"; };\n` +
`  image.src = material.dataUri;\n` +
`});\n`;
}

function emitAssetModule(compiled) {
  const { asset } = compiled;
  if (asset.schema === SOLID_HEIGHT_RUNTIME_SCHEMA) return emitSolidHeightAssetModule(compiled);
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
  const artifact = result.asset.schema === SOLID_HEIGHT_RUNTIME_SCHEMA
    ? { compiledHash: result.asset.compiledHash, materials: Object.fromEntries(Object.entries(result.asset.materials).map(([face, material]) => [face, material.sha256])) }
    : { atlas: { width: result.atlas.width, height: result.atlas.height, sha256: result.asset.atlas.sha256 } };
  process.stdout.write(`${JSON.stringify({ pass: true, mode: check ? 'check' : 'build', assetId: result.asset.id, output: path.relative(ROOT, result.outputPath).replace(/\\/g, '/'), ...artifact, registered: result.registration ? !result.registration.changed || !check : false })}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { COMPILER_VERSION, SOURCE_SCHEMA, RUNTIME_SCHEMA, SOLID_HEIGHT_SOURCE_SCHEMA, SOLID_HEIGHT_RUNTIME_SCHEMA, SOLID_HEIGHT_FACE_ORDER, SOLID_HEIGHT_FACE_SIZE, compileBuilding, emitAssetModule, loadSource, packAtlas, writeCompiledBuilding };
