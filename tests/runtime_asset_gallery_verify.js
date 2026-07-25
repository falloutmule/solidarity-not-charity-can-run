'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'authoring', 'characters', 'character-isolation-v1.json'), 'utf8'));
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

assert.strictEqual(manifest.schema, 'snc-character-isolation-v1');
const candidates = manifest.assets.filter((asset) => asset.status === 'candidate');
const blocked = manifest.assets.filter((asset) => asset.status === 'blocked');
assert.strictEqual(candidates.length, 7, 'only clean candidates may enter the runtime registry');
assert.strictEqual(blocked.length, 9, 'unsafe street-sheet extractions remain blocked');
assert.strictEqual(new Set(manifest.assets.map((asset) => asset.assetId)).size, manifest.assets.length, 'asset IDs are unique');
for(const asset of candidates){
  assert(asset.runtimePath && asset.runtimeSha256 && asset.runtimeSize, `${asset.assetId}: runtime candidate metadata`);
  const bytes = fs.readFileSync(path.join(root, asset.runtimePath));
  assert.strictEqual(sha256(bytes), asset.runtimeSha256, `${asset.assetId}: runtime PNG hash`);
  assert(asset.runtimeAlphaHistogram.zero > 0 && asset.runtimeAlphaHistogram.opaque > 0, `${asset.assetId}: transparent candidate PNG`);
}

const generatedRegistry = source('src/imported-handoff-assets/runtime-character-gallery-assets.js');
assert(generatedRegistry.includes('SNC_RUNTIME_ASSET_REGISTRY'), 'one canonical runtime registry');
assert.strictEqual((generatedRegistry.match(/data:image\/png;base64,/g) || []).length, candidates.length, 'one embedded payload per candidate');
const dataUris = [...generatedRegistry.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map((match) => match[1]);
assert.strictEqual(new Set(dataUris).size, dataUris.length, 'runtime payloads are not duplicated');
for(const asset of candidates) assert(generatedRegistry.includes(asset.assetId), `${asset.assetId}: registered`);

const level = source('src/levels/asset-gallery-authored.js');
assert(level.includes("schema: 'snc-asset-gallery-level-v1'"), 'special authored gallery level');
assert(!level.includes('data:image/'), 'placements reference IDs rather than bitmap payloads');
for(const asset of candidates) assert(level.includes(asset.assetId), `${asset.assetId}: placement reference`);
assert(level.includes("status: 'deferred'"), 'low-block obstruction bays explicitly deferred');
assert(level.includes('low-block raycaster spike acceptance'), 'deferred dependency is recorded');

const input = source('src/js/game-20-section-11-update-input.js');
const mobileInput = source('src/js/game-06-section-2b-mobile-touch-input.js');
const responsiveMenu = source('src/js/game-07-section-2c-responsive-mobile-menu-html-overlay.js');
const hud = source('src/js/game-18-section-9-hud-reticle-popups.js');
const mainLoop = source('src/js/game-22-section-13-main-loop.js');
assert(input.includes('if(!assetGallery) SAVE.save();'), 'keyboard and touch pause saves are gallery-guarded');
assert(input.includes('if(!assetGallery && !paused && e.code===\'KeyR\')'), 'gallery cannot restart a campaign from keyboard');
assert(mobileInput.includes('crAssetGalleryIsActive') && mobileInput.includes('SAVE.save()'), 'mobile pause save is gallery-guarded');
assert(responsiveMenu.includes("action === 'pause-help' || action === 'pause-restart'"), 'gallery pause menu suppresses mutating actions');
assert(hud.includes('function crGalleryHudActive()'), 'HUD owns one gallery-mode predicate');
assert(hud.includes('if(crGalleryHudActive()){\n    drawAssetGalleryHUD();\n    return;\n  }'), 'gallery HUD exits before ordinary run status');
assert(hud.includes('function drawAssetGalleryHUD()') && hud.includes('crDrawAssetGalleryOverlay()'), 'gallery HUD retains exhibit focus copy');
assert(mainLoop.includes('if(!crGalleryHudActive()){\n    ctx.font = \'bold 9px monospace\';'), 'portrait chrome hides normal build copy in gallery mode');
assert(mobileInput.includes("? '<span class=\"mportmenu-t\">MENU</span><span class=\"mportmenu-b\">GALLERY</span>'"), 'portrait menu uses a gallery-neutral label');

const buildManifest = JSON.parse(source('src/build-manifest.json'));
const registryIndex = buildManifest.scripts.indexOf('src/imported-handoff-assets/runtime-character-gallery-assets.js');
const levelIndex = buildManifest.scripts.indexOf('src/levels/asset-gallery-authored.js');
const galleryModeIndex = buildManifest.scripts.indexOf('src/js/game-21b-asset-gallery-mode.js');
assert(registryIndex > buildManifest.scripts.indexOf('src/imported-handoff-assets/custom_next_001.asset.js'), 'registry loads after existing imported assets');
assert(levelIndex > registryIndex, 'gallery references load after registry');
assert(galleryModeIndex > buildManifest.scripts.indexOf('src/js/game-20-section-11-update-input.js'), 'gallery mode loads after normal run helpers');

const palette = JSON.parse(source('authoring/generated/asset-palette.json'));
assert.strictEqual(palette.schema, 'snc-asset-palette-v1');
assert.deepStrictEqual(palette.assets.map((asset) => asset.assetId).sort(), candidates.map((asset) => asset.assetId).sort(), 'future palette uses the runtime candidate IDs');

console.log(JSON.stringify({ pass: true, candidates: candidates.length, blocked: blocked.length, uniquePayloads: dataUris.length, deferredLowBlockBays: true }));
