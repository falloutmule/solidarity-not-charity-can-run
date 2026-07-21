const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ASSET_PATH = path.join(ROOT, 'src', 'imported-handoff-assets', 'custom_next_001.asset.js');

function fail(message){
  console.error('FAIL: ' + message);
  process.exit(1);
}

function equal(actual, expected, message){
  if(actual !== expected) fail(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function pngInfo(buffer){
  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  if(buffer.length < 29 || !buffer.subarray(0, 8).equals(signature)) fail('invalid PNG signature');
  if(buffer.readUInt32BE(8) !== 13 || buffer.toString('ascii', 12, 16) !== 'IHDR') fail('invalid PNG IHDR');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
    compression: buffer[26],
    filter: buffer[27],
    interlace: buffer[28]
  };
}

class FakeImage {
  constructor(){
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    FakeImage.instances.push(this);
  }
  set src(value){ this._src = value; }
  get src(){ return this._src; }
  succeed(width, height){
    this.complete = true;
    this.naturalWidth = width;
    this.naturalHeight = height;
    this.onload();
  }
  fail(){ this.onerror(new Error('synthetic image failure')); }
}
FakeImage.instances = [];

if(!fs.existsSync(ASSET_PATH)) fail('missing canonical asset module');
const assetText = fs.readFileSync(ASSET_PATH, 'utf8');
const windowObject = {};
const sandbox = { window: windowObject, Image: FakeImage, Object, Error };
vm.createContext(sandbox);
vm.runInContext(assetText, sandbox, { filename: ASSET_PATH });

const registry = windowObject.BITMAP_BUILDING_ASSET_REGISTRY;
if(!registry || typeof registry !== 'object') fail('missing generic BITMAP_BUILDING_ASSET_REGISTRY');
const asset = registry.custom_next_001;
if(!asset) fail('custom_next_001 is not registered in the generic registry');
if(windowObject.CUSTOM_NEXT_001 !== asset) fail('stable CUSTOM_NEXT_001 compatibility export is not the registered asset');

equal(asset.schema, 'snc-bitmap-building-asset-v1', 'asset schema');
equal(asset.id, 'custom_next_001', 'asset id');
equal(asset.handoffVersion, 'v0018', 'handoff version');
equal(asset.faceReuseContract, 'FACE_REUSE_CONTRACT_V1', 'face reuse contract');
equal(asset.canonicalFormat, 'bitmap', 'canonical format');
equal(asset.mime, 'image/png', 'MIME');
equal(asset.encoding, 'data-uri', 'encoding');
equal(asset.renderMode, 'importedWholeFaceAsset', 'render mode');
if(Object.prototype.hasOwnProperty.call(asset, 'anchor')) fail('asset must not declare or depend on an inferred anchor');
equal(asset.footprint && asset.footprint.wCells, 6, 'footprint width');
equal(asset.footprint && asset.footprint.hCells, 3, 'footprint depth');

const dataUriMarker = 'data:image/png;base64,';
equal((assetText.match(/data:image\/png;base64,/g) || []).length, 1, 'canonical PNG data URI occurrence count');
if(!asset.atlas || !String(asset.atlas.dataUri || '').startsWith(dataUriMarker)) fail('missing embedded PNG atlas');
const atlasBytes = Buffer.from(asset.atlas.dataUri.slice(dataUriMarker.length), 'base64');
const png = pngInfo(atlasBytes);
const atlasSha256 = crypto.createHash('sha256').update(atlasBytes).digest('hex');
equal(png.width, 1280, 'IHDR width');
equal(png.height, 160, 'IHDR height');
equal(png.bitDepth, 8, 'IHDR bit depth');
equal(png.colorType, 6, 'IHDR color type');
equal(png.compression, 0, 'IHDR compression');
equal(png.filter, 0, 'IHDR filter');
equal(png.interlace, 0, 'IHDR interlace');
equal(atlasBytes.length, 185412, 'decoded PNG byte length');
equal(atlasSha256, 'bffb437c0c6772669233bd58124cded53fe8e32faa9b0e3c96736c4f87ec140c', 'decoded PNG SHA-256');
equal(asset.atlas.width, png.width, 'declared atlas width');
equal(asset.atlas.height, png.height, 'declared atlas height');
equal(asset.atlas.byteLength, atlasBytes.length, 'declared atlas byte length');
equal(asset.atlas.sha256, atlasSha256, 'declared atlas SHA-256');

const expectedFaceAssets = {
  front_unique: { role:'unique', faceType:'front', spanCells:6, slice:{x:0,y:0,w:512,h:160} },
  side_shared: { role:'shared', faceType:'side', spanCells:3, slice:{x:512,y:0,w:256,h:160}, mirrorSafe:false },
  back_shared: { role:'shared', faceType:'back', spanCells:6, slice:{x:768,y:0,w:512,h:160}, mirrorSafe:true }
};
for(const [name, expected] of Object.entries(expectedFaceAssets)){
  const actual = asset.faceAssets && asset.faceAssets[name];
  if(!actual) fail('missing face asset ' + name);
  equal(actual.role, expected.role, `${name} role`);
  equal(actual.faceType, expected.faceType, `${name} face type`);
  equal(actual.spanCells, expected.spanCells, `${name} span`);
  if('mirrorSafe' in expected) equal(actual.mirrorSafe, expected.mirrorSafe, `${name} mirror safety`);
  for(const axis of ['x','y','w','h']) equal(actual.slice && actual.slice[axis], expected.slice[axis], `${name} slice ${axis}`);
  if(actual.slice.x < 0 || actual.slice.y < 0 || actual.slice.x + actual.slice.w > png.width || actual.slice.y + actual.slice.h > png.height){
    fail(name + ' slice is outside atlas bounds');
  }
}

const expectedFaces = {
  south: { role:'unique', assetRef:'front_unique', spanCells:6, sourceUDirection:'x_increasing', mirror:false, reuse:null },
  east: { role:'shared', assetRef:'side_shared', spanCells:3, sourceUDirection:'depth_decreasing', mirror:false, reuse:null },
  north: { role:'shared', assetRef:'back_shared', spanCells:6, sourceUDirection:'x_decreasing', mirror:false, reuse:null },
  west: { role:'reuse', assetRef:'side_shared', spanCells:3, sourceUDirection:'depth_increasing', mirror:false, reuse:'east' }
};
for(const [faceName, expected] of Object.entries(expectedFaces)){
  const face = asset.faces && asset.faces[faceName];
  if(!face) fail('missing local face ' + faceName);
  for(const field of ['role','assetRef','spanCells','sourceUDirection','mirror','reuse']){
    equal(face[field], expected[field], `${faceName} ${field}`);
  }
}
if(asset.faces.east.assetRef !== asset.faces.west.assetRef) fail('east/west side asset is not reused');
if(asset.faceAssets.side_shared.mirrorSafe !== false) fail('shared side must remain mirrorSafe:false');
if(Object.values(asset.faces).some((face) => face.mirror !== false)) fail('custom_next_001 must not request source or canvas mirroring');

if(FakeImage.instances.length !== 1) fail('asset module must create exactly one embedded-atlas image');
const image = FakeImage.instances[0];
equal(image.src, asset.atlas.dataUri, 'preload source');
equal(image.decoding, 'async', 'asynchronous decode hint');
if(asset.loadState.image !== image) fail('generic load state does not expose atlas image');
equal(asset.loadState.status, 'pending', 'initial load state');
equal(asset.loadState.error, null, 'initial load error');
image.succeed(1280, 160);
equal(asset.loadState.status, 'loaded', 'successful load state');
equal(asset.loadState.error, null, 'successful load error');

const invalidWindow = {};
const invalidSandbox = { window: invalidWindow, Image: FakeImage, Object, Error };
vm.createContext(invalidSandbox);
vm.runInContext(assetText, invalidSandbox, { filename: ASSET_PATH });
FakeImage.instances.at(-1).succeed(1279, 160);
equal(invalidWindow.BITMAP_BUILDING_ASSET_REGISTRY.custom_next_001.loadState.status, 'invalid_dimensions', 'invalid-dimension load state');

const failedWindow = {};
const failedSandbox = { window: failedWindow, Image: FakeImage, Object, Error };
vm.createContext(failedSandbox);
vm.runInContext(assetText, failedSandbox, { filename: ASSET_PATH });
FakeImage.instances.at(-1).fail();
equal(failedWindow.BITMAP_BUILDING_ASSET_REGISTRY.custom_next_001.loadState.status, 'failed', 'failed load state');
if(!failedWindow.BITMAP_BUILDING_ASSET_REGISTRY.custom_next_001.loadState.error) fail('failed load state must expose an error');

if(/image\/svg\+xml|<svg\b/i.test(assetText)) fail('SVG content is prohibited');
const withoutDataUri = assetText.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/, '');
if(/https?:\/\//i.test(withoutDataUri)) fail('external runtime URL is prohibited');
for(const forbidden of ['proofZone', 'd1ProofSlotId', 'd1CustomProofSlot', 'slot_02', 'game-16a-custom-next-001-runtime-integration.js']){
  if(assetText.includes(forbidden)) fail('asset validity depends on forbidden proof/adapter vocabulary: ' + forbidden);
}

console.log(JSON.stringify({
  pass: true,
  claim: 'asset contract only; runtime rendering not tested',
  schema: asset.schema,
  assetId: asset.id,
  registry: 'BITMAP_BUILDING_ASSET_REGISTRY',
  footprint: asset.footprint,
  atlas: { width:png.width, height:png.height, byteLength:atlasBytes.length, sha256:atlasSha256 },
  faces: expectedFaces,
  loadStatesVerified: ['pending','loaded','failed','invalid_dimensions'],
  dataUriOccurrences: 1,
  externalUrls: 0,
  svg: false
}, null, 2));
