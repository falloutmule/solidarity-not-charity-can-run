'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath));
const hash = (relativePath) => crypto.createHash('sha256').update(read(relativePath)).digest('hex');
const source = read('src/js/game-11-section-3b.js').toString('utf8');
const manifest = JSON.parse(read('authoring/characters/character-assets-v2.json').toString('utf8'));

assert.strictEqual(hash('authoring/characters/character-assets-v2.json'), '09eb8c2c9443c18ba0530afc160c7461fec8357880515cd0e810999f979ef023', 'canonical character manifest remains unchanged during runtime-only review');
assert.strictEqual(hash('src/imported-handoff-assets/runtime-character-gallery-assets.js'), '4638fb2dba62a22b24dac3ac1e8962e3432acc990baee641b4b11097af99ad32', 'generated runtime character records remain unchanged during runtime-only review');
assert.strictEqual(hash('src/js/game-15a-variable-height-core.js'), '99cd7ce2abdd927f75f7578aa90dadebcc9b277f17aef8501adacd2ab222df69', 'physical projection remains unchanged');
assert.strictEqual(hash('src/js/game-16d-heightfield-renderer.js'), '9c17a03108ea23deb892119f2f15c82c7d18089d4df38fc8464a763edbae1014', 'heightfield renderer remains unchanged');

const reviewEntries = [...source.matchAll(/assetId: '([^']+)', physicalClass: '([^']+)', reviewWorldHeight: ([\d.]+)/g)].map((match) => ({ assetId: match[1], physicalClass: match[2], reviewWorldHeight: Number(match[3]) }));
assert.strictEqual(reviewEntries.length, 16, 'full-cast review has one entry for each runtime asset');
assert.deepStrictEqual(reviewEntries.map((entry) => entry.assetId), manifest.assets.map((asset) => asset.assetId), 'review ordering maps every manifest asset exactly once');
assert.strictEqual(new Set(reviewEntries.map((entry) => entry.assetId)).size, 16, 'review asset IDs are unique');

const byClass = reviewEntries.reduce((groups, entry) => { (groups[entry.physicalClass] ||= []).push(entry); return groups; }, {});
assert.strictEqual(byClass['standing-adult-review-078'].length, 8, 'eight ordinary adults use the Samsung-approved standing review class');
assert.strictEqual(byClass['standing-adult-locked-078'].length, 1, 'work-jacket keeps its Samsung-approved standing lock');
assert.strictEqual(byClass['seated-locked-068'].length, 1, 'slumped asset keeps its locked seated class');
assert.strictEqual(byClass['youth-unresolved-canonical-096'].length, 1, 'youth remains explicitly unresolved');
assert.strictEqual(byClass['composite-unresolved-canonical-096'].length, 5, 'multi-subject or vehicle scenes remain explicitly unresolved');
for(const entry of [...byClass['standing-adult-review-078'], ...byClass['standing-adult-locked-078']]) assert.strictEqual(entry.reviewWorldHeight, 0.78, `${entry.assetId}: adult review height`);
assert.strictEqual(byClass['seated-locked-068'][0].reviewWorldHeight, 0.68, 'seated review height stays locked');
for(const entry of [...byClass['youth-unresolved-canonical-096'], ...byClass['composite-unresolved-canonical-096']]) assert.strictEqual(entry.reviewWorldHeight, 0.96, `${entry.assetId}: unresolved class keeps only its canonical review value`);

const selectedStanding = manifest.assets.find((asset) => asset.assetId === 'npc_unhoused_work_jacket_001');
const seated = manifest.assets.find((asset) => asset.assetId === 'npc_unhoused_slumped_001');
assert.strictEqual(selectedStanding.worldHeight, 0.78, 'canonical selected standing height remains immutable');
assert.strictEqual(seated.worldHeight, 0.68, 'canonical seated height remains immutable');
assert.strictEqual(seated.groundContactSourceY, 182, 'canonical seated contact pivot remains immutable');
for(const asset of manifest.assets.filter((asset) => asset.assetId !== selectedStanding.assetId && asset.assetId !== seated.assetId)) assert.strictEqual(asset.worldHeight, 0.96, `${asset.assetId}: canonical world height was not silently changed`);

assert(source.includes("params.get('hfcastreview') === '1'"), 'full-cast review is query gated');
assert(source.includes("params.get('hfcanreview') === '1'"), 'can review is query gated');
assert(!source.includes('hfcancomparison'), 'rejected historical can comparison route stays absent');
assert(source.includes('CR_HEIGHTFIELD_CAN_SCALE_REVIEW_V1 = Object.freeze([0.36, 0.40, 0.44])'), 'can review candidates are explicit runtime-only values');
assert(read('src/js/game-15a-variable-height-core.js').toString('utf8').includes('CR_HEIGHTFIELD_SPRITE_WORLD_HEIGHTS = Object.freeze({ can: 0.26 })'), 'canonical can height remains unchanged');

console.log(JSON.stringify({ pass: true, reviewEntries: reviewEntries.length, classes: Object.fromEntries(Object.entries(byClass).map(([key, value]) => [key, value.length])), canonicalCanWorldHeight: 0.26 }));
