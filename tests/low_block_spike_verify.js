'use strict';
const assert=require('assert');
const fs=require('fs'); const http=require('http'); const path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'); const html=fs.readFileSync(path.join(ROOT,'index.html'));
const output=path.join(ROOT,'test-results','low-block-spike',`browser-${process.pid}.json`);
const screenshot=path.join(ROOT,'test-results','low-block-spike',`browser-${process.pid}.png`);
function serve(){ return new Promise((resolve,reject)=>{ const server=http.createServer((req,res)=>{ res.writeHead(req.url.startsWith('/favicon')?204:200,{'content-type':'text/html; charset=utf-8'}); res.end(req.url.startsWith('/favicon')?'':html); }); server.once('error',reject); server.listen(0,'127.0.0.1',()=>resolve({server,url:`http://127.0.0.1:${server.address().port}/`})); }); }
async function main(){
  assert(!fs.readFileSync(path.join(ROOT,'src','js','game-16c-low-block-spike.js'),'utf8').includes('getImageData('), 'spike source must not add canvas readbacks');
  const {server,url}=await serve(); const observed={pageErrors:[],consoleErrors:[],externalRequests:[]}; let browser;
  const result={pass:false,observed,checks:{}};
  try{
    browser=await chromium.launch(); const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}); const page=await context.newPage();
    page.on('pageerror',e=>observed.pageErrors.push(String(e))); page.on('console',m=>{if(m.type()==='error')observed.consoleErrors.push(m.text());}); page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(url))observed.externalRequests.push(r.url());});
    await page.goto(`${url}?lowblockspike=1&mobile=on&portraitlayout=1`,{waitUntil:'load'});
    await page.waitForFunction(()=>window.SNCDiagnostics&&window.SNCDiagnostics.getSnapshot().runtime.customLevel==='low_block_spike',null,{timeout:10000});
    await page.waitForTimeout(400); const before=await page.evaluate(()=>window.SNCDiagnostics.getSnapshot());
    await page.screenshot({path:screenshot,fullPage:true});
    await page.keyboard.down('w'); await page.waitForTimeout(2400); await page.keyboard.up('w'); const after=await page.evaluate(()=>window.SNCDiagnostics.getSnapshot());
    result.before=before.lowBlockSpike; result.after=after.lowBlockSpike; result.player=after.runtime.player;
    result.checks.buildId=before.buildId==='lowblockspike1'; result.checks.play=before.runtime.state==='play'; result.checks.fixture=before.runtime.customLevel==='low_block_spike';
    result.checks.lowBlock=before.lowBlockSpike.enabled&&before.lowBlockSpike.blocks===1&&before.lowBlockSpike.heightScale===0.4&&before.lowBlockSpike.activeColumns>0&&before.lowBlockSpike.capColumns>0&&before.lowBlockSpike.spriteClipColumns>0;
    result.checks.bufferBudget=before.lowBlockSpike.metadataBytes>0&&before.lowBlockSpike.metadataBytes<65536&&before.lowBlockSpike.perFrameReadback===false;
    result.checks.collision=after.runtime.player.x<10.9; result.checks.errors=Object.values(observed).every(v=>v.length===0);
    result.pass=Object.values(result.checks).every(Boolean); await context.close();
  } finally { if(browser) await browser.close(); await new Promise(resolve=>server.close(resolve)); }
  fs.mkdirSync(path.dirname(output),{recursive:true}); fs.writeFileSync(output,JSON.stringify({...result,screenshot:path.relative(ROOT,screenshot)},null,2)+'\n'); console.log(JSON.stringify({pass:result.pass,output:path.relative(ROOT,output),screenshot:path.relative(ROOT,screenshot),checks:result.checks})); if(!result.pass) process.exitCode=1;
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
