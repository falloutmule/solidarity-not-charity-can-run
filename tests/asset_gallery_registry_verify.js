'use strict';
const assert=require('assert');
const {validateRegistry}=require('../tools/asset-gallery-validate');
const gallery=validateRegistry();
assert(gallery.assets.length>=6,'MVP registry must include concept and runtime references');
assert(gallery.assets.some(a=>a.id==='concept-character-unhoused-001'&&a.reviewStatus==='approved'),'unhoused direction must be recorded');
assert(gallery.assets.some(a=>a.id==='concept-character-volunteer-001'&&a.reviewStatus==='candidate'),'cleaner direction must remain a candidate');
assert(gallery.assets.every(a=>a.sourcePath?!!a.sourceHash:!!a.runtimeRef),'every asset must have a verified source or runtime ref');
console.log(JSON.stringify({pass:true,assets:gallery.assets.length,registryHash:gallery.registryHash},null,2));
