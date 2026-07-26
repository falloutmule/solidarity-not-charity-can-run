'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const load = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const manifestPath = path.join(root, 'authoring', 'characters', 'character-assets-v2.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const oldPaths = [
  'authoring/characters/character-isolation-v1.json',
  'tools/character-isolation.py',
  'tools/build-runtime-character-assets.js',
  'authoring/concepts/characters/unhoused/street-character-exploration-v1.jpg',
  'authoring/concepts/characters/volunteers/volunteer-character-exploration-v1.jpg'
];

assert.strictEqual(manifest.schema, 'snc-character-assets-v2');
assert.strictEqual(manifest.assets.length, 16, 'all approved cast members must be active');
assert.strictEqual(new Set(manifest.assets.map((asset) => asset.assetId)).size, 16, 'asset IDs are unique');
assert.deepStrictEqual(manifest.assets.reduce((groups, asset) => {
  groups[asset.group] = (groups[asset.group] || 0) + 1;
  return groups;
}, {}), { volunteer: 3, household: 2, civilian: 3, unhoused: 8 }, 'approved group counts');
assert.strictEqual(manifest.assets.find((asset) => asset.assetId === 'npc_unhoused_slumped_001').displayHeightCells, 0.52, 'seated asset remains visibly shorter');
for(const asset of manifest.assets.filter((asset) => asset.assetId !== 'npc_unhoused_slumped_001')) assert.strictEqual(asset.displayHeightCells, 0.72, `${asset.assetId}: compact gallery scale`);
for(const asset of manifest.assets){
  assert.strictEqual(asset.reviewStatus, 'candidate', `${asset.assetId}: approved package records stay candidate review art`);
  assert.strictEqual(asset.anchor.y, 1.0, `${asset.assetId}: ground anchor`);
  const sourceBytes = fs.readFileSync(path.join(root, asset.sourcePath));
  const runtimeBytes = fs.readFileSync(path.join(root, asset.runtimePath));
  assert.strictEqual(sha256(sourceBytes), asset.sourceSha256, `${asset.assetId}: untouched package PNG`);
  assert.strictEqual(sha256(runtimeBytes), asset.runtimeSha256, `${asset.assetId}: deterministic runtime PNG`);
  assert(asset.runtimeAlphaHistogram.zero > 0 && asset.runtimeAlphaHistogram.partial > 0 && asset.runtimeAlphaHistogram.opaque > 0, `${asset.assetId}: runtime alpha range`);
}
for(const pathName of oldPaths) assert(!fs.existsSync(path.join(root, pathName)), `superseded source removed: ${pathName}`);
for(const forbidden of ['manualBackgroundSeeds', 'manualForegroundPolygons', 'clearBelowY', '"bounds"']){
  assert(!JSON.stringify(manifest).includes(forbidden), `v2 authority omits ${forbidden}`);
}

const generatedRegistry = load('src/imported-handoff-assets/runtime-character-gallery-assets.js');
assert(generatedRegistry.includes('SNC_RUNTIME_ASSET_REGISTRY'), 'one canonical runtime registry');
assert(generatedRegistry.includes('character-assets-v2.json'), 'registry declares its v2 authority');
assert(!generatedRegistry.includes('.zip') && !generatedRegistry.includes('concepts/characters'), 'runtime registry contains derived PNG payloads only');
const dataUris = [...generatedRegistry.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map((match) => match[1]);
assert.strictEqual(dataUris.length, 16, 'exactly one data URI per approved runtime asset');
assert.strictEqual(new Set(dataUris).size, 16, 'runtime payloads are unique');
for(const asset of manifest.assets) assert(generatedRegistry.includes(asset.assetId), `${asset.assetId}: runtime record exists`);

const level = load('src/levels/asset-gallery-authored.js');
assert(level.includes("schema: 'snc-asset-gallery-level-v1'"), 'special authored gallery level');
assert(!level.includes('data:image/'), 'placements reference IDs rather than bitmap payloads');
for(const asset of manifest.assets) assert(level.includes(asset.assetId), `${asset.assetId}: placement reference`);
assert(level.includes("zone: 'volunteer'") && level.includes("zone: 'civilian'") && level.includes("zone: 'household'") && level.includes("zone: 'unhoused'"), 'four gallery zones');
assert(level.includes("status: 'deferred'"), 'low-block obstruction bays explicitly deferred');
assert(level.includes('low-block raycaster spike acceptance'), 'deferred dependency is recorded');
const placements = [...level.matchAll(/assetId: '([^']+)', zone: '([^']+)', x: ([\d.]+), y: ([\d.]+)/g)].map((match) => ({ assetId: match[1], zone: match[2], x: Number(match[3]), y: Number(match[4]) }));
assert.strictEqual(placements.length, 16, 'all approved characters are placed exactly once');
assert.deepStrictEqual(placements.reduce((groups, placement) => {
  groups[placement.zone] = (groups[placement.zone] || 0) + 1;
  return groups;
}, {}), { volunteer: 3, civilian: 3, household: 2, unhoused: 8 }, 'placement zone counts');
const solid = new Set();
for(let y = 19; y < 22; y++) for(let x = 29; x < 35; x++) solid.add(`${x},${y}`);
const startCell = '4,21';
const reachable = new Set([startCell]);
const frontier = [startCell];
while(frontier.length){
  const cell = frontier.shift();
  const [x, y] = cell.split(',').map(Number);
  for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
    const nx = x + dx, ny = y + dy, next = `${nx},${ny}`;
    if(nx <= 0 || nx >= 39 || ny <= 0 || ny >= 23 || solid.has(next) || reachable.has(next)) continue;
    reachable.add(next); frontier.push(next);
  }
}
for(const placement of placements) assert(reachable.has(`${Math.floor(placement.x)},${Math.floor(placement.y)}`), `${placement.assetId}: reachable from gallery start`);

const galleryMode = load('src/js/game-21b-asset-gallery-mode.js');
assert(galleryMode.includes('heightScale: asset.heightScale'), 'registry display scale reaches the existing NPC renderer path');
assert(galleryMode.includes('galleryStatic: true'), 'gallery characters stay static');
const input = load('src/js/game-20-section-11-update-input.js');
const mobileInput = load('src/js/game-06-section-2b-mobile-touch-input.js');
const responsiveMenu = load('src/js/game-07-section-2c-responsive-mobile-menu-html-overlay.js');
const hud = load('src/js/game-18-section-9-hud-reticle-popups.js');
const mainLoop = load('src/js/game-22-section-13-main-loop.js');
assert(input.includes('if(!assetGallery) SAVE.save();'), 'keyboard and touch pause saves are gallery-guarded');
assert(input.includes("if(!assetGallery && !paused && e.code==='KeyR')"), 'gallery cannot restart a campaign from keyboard');
assert(mobileInput.includes('crAssetGalleryIsActive') && mobileInput.includes('SAVE.save()'), 'mobile pause save is gallery-guarded');
assert(responsiveMenu.includes("action === 'pause-help' || action === 'pause-restart'"), 'gallery pause menu suppresses mutating actions');
assert(hud.includes('function crGalleryHudActive()'), 'HUD owns one gallery-mode predicate');
assert(hud.includes('function drawAssetGalleryHUD()') && hud.includes('crDrawAssetGalleryOverlay()'), 'gallery HUD retains exhibit focus copy');
assert(mainLoop.includes("if(!crGalleryHudActive()){\n    ctx.font = 'bold 9px monospace';"), 'portrait chrome hides normal build copy in gallery mode');
assert(mobileInput.includes("? '<span class=\"mportmenu-t\">MENU</span><span class=\"mportmenu-b\">GALLERY</span>'"), 'portrait menu uses a gallery-neutral label');

const buildManifest = JSON.parse(load('src/build-manifest.json'));
const registryIndex = buildManifest.scripts.indexOf('src/imported-handoff-assets/runtime-character-gallery-assets.js');
const levelIndex = buildManifest.scripts.indexOf('src/levels/asset-gallery-authored.js');
const galleryModeIndex = buildManifest.scripts.indexOf('src/js/game-21b-asset-gallery-mode.js');
assert(registryIndex > buildManifest.scripts.indexOf('src/imported-handoff-assets/custom_next_001.asset.js'), 'registry loads after existing imported assets');
assert(levelIndex > registryIndex, 'gallery references load after registry');
assert(galleryModeIndex > buildManifest.scripts.indexOf('src/js/game-20-section-11-update-input.js'), 'gallery mode loads after normal run helpers');

const palette = JSON.parse(load('authoring/generated/asset-palette.json'));
assert.strictEqual(palette.schema, 'snc-asset-palette-v1');
assert.strictEqual(palette.generatedFrom, 'authoring/characters/character-assets-v2.json');
assert.deepStrictEqual(palette.assets.map((asset) => asset.assetId).sort(), manifest.assets.map((asset) => asset.assetId).sort(), 'future palette uses runtime stable IDs');

console.log(JSON.stringify({ pass: true, assets: 16, groups: { volunteer: 3, civilian: 3, household: 2, unhoused: 8 }, uniquePayloads: dataUris.length, deferredLowBlockBays: true }));
