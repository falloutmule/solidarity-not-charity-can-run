'use strict';
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const REGISTRY=path.join(ROOT,'authoring','asset-gallery','assets.json');
const CATEGORIES=new Set(['character.unhoused','character.volunteer','character.civilian','character.household','building','prop.blocking','prop.nonblocking','pickup.can','marker.delivery','marker.portal','effect','ui','test']);
const STAGES=new Set(['concept','source','compiled','registered','runtime','archived']);
const STATUSES=new Set(['draft','candidate','approved','rejected','superseded','needs-revision']);
function hash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function fail(message){throw new Error(`asset-gallery: ${message}`);}
function validateRegistry(registryPath=REGISTRY){
  const raw=JSON.parse(fs.readFileSync(registryPath,'utf8'));
  if(raw.schema!=='snc-asset-gallery-v1'||!Array.isArray(raw.assets)) fail('expected snc-asset-gallery-v1 assets array');
  const ids=new Set(); const assets=[];
  for(const asset of raw.assets){
    for(const key of ['id','displayName','category','stage','reviewStatus','visualRole','gameplayRole','notes']) if(!asset[key]) fail(`missing ${key}`);
    if(ids.has(asset.id)) fail(`duplicate id ${asset.id}`); ids.add(asset.id);
    if(!CATEGORIES.has(asset.category)) fail(`invalid category ${asset.category}`);
    if(!STAGES.has(asset.stage)) fail(`invalid stage ${asset.stage}`);
    if(!STATUSES.has(asset.reviewStatus)) fail(`invalid reviewStatus ${asset.reviewStatus}`);
    if(!asset.sourcePath&&!asset.runtimeRef) fail(`${asset.id} needs sourcePath or runtimeRef`);
    const record={...asset,sourceHash:null,sourceBytes:null};
    if(asset.sourcePath){
      const file=path.resolve(ROOT,asset.sourcePath);
      if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)) fail(`missing sourcePath ${asset.sourcePath}`);
      record.sourceHash=hash(file); record.sourceBytes=fs.statSync(file).size;
    }
    if(asset.runtimeRef){
      if(!asset.runtimeRef.file||!asset.runtimeRef.symbol) fail(`${asset.id} invalid runtimeRef`);
      const file=path.resolve(ROOT,asset.runtimeRef.file);
      if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)) fail(`${asset.id} missing runtimeRef file`);
      if(!fs.readFileSync(file,'utf8').includes(asset.runtimeRef.symbol)) fail(`${asset.id} runtimeRef symbol absent`);
    }
    assets.push(record);
  }
  return {schema:raw.schema,assets,registryHash:hash(registryPath)};
}
if(require.main===module){try{const result=validateRegistry();console.log(JSON.stringify({pass:true,assets:result.assets.length,registryHash:result.registryHash},null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={validateRegistry,REGISTRY};
