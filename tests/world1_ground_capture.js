'use strict';
const assert = require('assert'), fs = require('fs'), http = require('http'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), artifact = path.join(root, 'index.html');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const output = path.resolve(root, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'world-1-level-1-ground', 'ground-capture.json'));
function assertOutputPath(target){ const evidence = path.join(root, 'test-results'), relative = path.relative(evidence, target); assert(relative && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), 'output must stay below ignored test-results'); }
function serve(html){ return new Promise((resolve, reject) => { const server = http.createServer((request, response) => { const pathname = new URL(request.url, 'http://127.0.0.1').pathname; if(pathname === '/' || pathname === '/index.html'){ response.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'}); response.end(html); return; } response.writeHead(404); response.end('not found'); }); server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve({server, url:`http://127.0.0.1:${server.address().port}/`})); }); }
async function main(){
  assertOutputPath(output); fs.mkdirSync(path.dirname(output), {recursive:true});
  const result = {pass:false,screenshots:[],checks:{},observed:{consoleErrors:[],pageErrors:[],externalRequests:[]},errors:[]}; let server,browser,context,page;
  try{
    ({server,url:result.url}=await serve(fs.readFileSync(artifact,'utf8'))); browser=await chromium.launch(); context=await browser.newContext({viewport:{width:400,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}); page=await context.newPage();
    const origin=new URL(result.url).origin; page.on('console',(message)=>{if(message.type()==='error')result.observed.consoleErrors.push(message.text());}); page.on('pageerror',(error)=>result.observed.pageErrors.push(String(error.stack||error))); page.on('request',(request)=>{if(/^https?:/i.test(request.url())&&new URL(request.url()).origin!==origin)result.observed.externalRequests.push(request.url());});
    await page.goto(result.url+'?mobile=on&portraitlayout=1',{waitUntil:'load'}); await page.locator('[data-action="title-start"]').click(); await page.waitForSelector('#cronboardok',{state:'visible'}); await page.locator('#cronboardok').click();
    await page.waitForFunction(()=>Object.keys(window.SNC_RUNTIME_PATH_ASSET_REGISTRY||{}).length===6&&Object.values(window.SNC_RUNTIME_PATH_ASSET_REGISTRY).every((entry)=>entry.image.complete&&entry.image.naturalWidth>0)); await page.waitForTimeout(180);
    async function capture(name,pose,target){ const file=path.join(path.dirname(output),`${name}.png`); const state=await page.evaluate(({pose,target})=>{player.x=pose.x;player.y=pose.y;player.angle=Math.atan2(target.y-pose.y,target.x-pose.x);showMinimap=true;return {x:player.x,y:player.y,angle:player.angle,portalActive:game.exit.active};},{pose,target}); await page.waitForTimeout(140); await page.screenshot({path:file}); result.screenshots.push({name,file:path.relative(root,file).replace(/\\/g,'/'),state}); }
    result.initial=await page.evaluate(()=>({stats:crGetGroundSurfaceDiagnostics(),samples:[[2.25,2.25],[10.5,10.5],[20.5,11.25],[29.2,11.2],[37.5,17.5]].map(([x,y])=>crGroundSamplePacked(x,y))}));
    await capture('01-start-stand-path', {x:20.5,y:14.5}, {x:19.2,y:10.6});
    await capture('02-central-route', {x:15.0,y:14.5}, {x:10.2,y:9.4});
    await capture('03-outer-route', {x:21.5,y:16.0}, {x:26.4,y:16.0});
    await capture('04-market-wear', {x:25.0,y:10.8}, {x:29.2,y:11.2});
    await capture('05-neighbor-gathering-area', {x:5.5,y:8.4}, {x:8.5,y:8.5});
    await capture('06-tree-dirt-treatment', {x:22.5,y:16.0}, {x:26.4,y:16.0});
    await capture('07-crossover-junction', {x:27.2,y:9.8}, {x:24.6,y:7.1});
    await capture('08-inactive-portal-path', {x:20.5,y:12.5}, {x:21.8,y:10.6});
    await capture('09-long-grass-view', {x:5.5,y:15.5}, {x:18.5,y:5.3});
    await capture('10-close-clean-decal-edge', {x:14.3,y:14.4}, {x:15.1,y:14.4});
    result.delivery=await page.evaluate(()=>{for(const kind of ['hungry','family','elder']){const npc=game.npcs.find((row)=>row.kind===kind&&!row.helped);player.x=npc.x;player.y=npc.y;player.cans=npc.need;player.giveCD=0;game.aimNpc=npc;giveCan();}return {helped:game.helped,delivered:game.delivered,portalActive:game.exit.active};});
    await capture('11-active-portal-path', {x:20.5,y:12.5}, {x:21.8,y:10.6}); await page.waitForTimeout(180);
    result.final=await page.evaluate(()=>({stats:crGetGroundSurfaceDiagnostics(),samples:[[2.25,2.25],[10.5,10.5],[20.5,11.25],[29.2,11.2],[37.5,17.5]].map(([x,y])=>crGroundSamplePacked(x,y)),surface:game.groundSurface}));
    result.checks={captures:result.screenshots.length===11,exactPortraitViewport:true,selectedRuntimeAssets:Object.keys(await page.evaluate(()=>SNC_RUNTIME_PATH_ASSET_REGISTRY)).length===6,broadRoutes:result.final.surface.routes.length===2&&result.final.surface.routes.every((route)=>route.width>=2.5),groundCached:result.final.stats.atlasWidth===640&&result.final.stats.atlasHeight===320&&result.final.stats.atlasBytes===819200&&result.final.stats.frameBufferAllocations===result.initial.stats.frameBufferAllocations&&result.final.stats.frameBufferAllocations===1,decalsComposited:result.final.stats.decalsRendered===6&&result.final.stats.pathAssetsReady===6,worldStable:JSON.stringify(result.initial.samples)===JSON.stringify(result.final.samples),grassVaried:new Set(result.final.samples).size>=3,finalDeliveryActivatesPortal:result.delivery.helped===3&&result.delivery.delivered===5&&result.delivery.portalActive,noErrors:Object.values(result.observed).every((items)=>items.length===0)};
    result.pass=Object.values(result.checks).every(Boolean);
  }catch(error){result.errors.push(String(error.stack||error));}
  finally{for(const resource of [page,context,browser])if(resource)await resource.close();if(server)await new Promise((resolve,reject)=>server.close((error)=>error?reject(error):resolve()));}
  if(result.errors.length)result.pass=false;fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pass:result.pass,output:path.relative(root,output),checks:result.checks,errors:result.errors}));if(!result.pass)process.exitCode=1;
}
main().catch((error)=>{console.error(error.stack||error);process.exitCode=1;});
