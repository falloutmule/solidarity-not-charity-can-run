'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'index.html');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const OUTPUT = path.resolve(ROOT, outputArg ? outputArg.slice('--output='.length) : path.join('test-results', 'give-touch-regression', `give-touch-${process.pid}.json`));

function serve(bytes){
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      if(pathname === '/' || pathname === '/index.html'){
        response.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
        response.end(bytes); return;
      }
      response.writeHead(204); response.end();
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({server, url:`http://127.0.0.1:${server.address().port}/`}));
  });
}

function observe(page, origin){
  const value = {consoleErrors:[], pageErrors:[], externalRequests:[]};
  page.on('console', message => { if(message.type() === 'error') value.consoleErrors.push(message.text()); });
  page.on('pageerror', error => value.pageErrors.push(String(error.stack || error)));
  page.on('request', request => {
    if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) value.externalRequests.push(request.url());
  });
  return value;
}

async function startPlay(page){
  await page.locator('[data-action="title-start"]').click();
  await page.waitForSelector('#cronboardok',{state:'visible'});
  await page.locator('#cronboardok').click();
  await page.waitForFunction(()=>state===STATE.PLAY&&!paused);
}

async function stageRecipient(page){
  return page.evaluate(() => {
    const npc = game.npcs.find(row => !row.helped && row.need === 1);
    player.x = npc.x; player.y = npc.y; player.cans = npc.need; player.giveCD = 0; game.aimNpc = npc;
    return {state, paused, seed:game.seed, modifier:game.modifier, helped:game.helped, delivered:game.delivered, npcKind:npc.kind};
  });
}

async function main(){
  const source = fs.readFileSync(path.join(ROOT, 'src/js/game-06-section-2b-mobile-touch-input.js'), 'utf8');
  assert(source.includes('let givePointerId = null;'), 'GIVE pointer ownership guard missing');
  assert(source.includes("mg.addEventListener('touchstart'"), 'GIVE local Touch fallback missing');
  assert(source.includes("mg.addEventListener('click'"), 'GIVE compatibility click shield missing');
  assert(!source.includes("onMobileInput(document, 'touchstart'"), 'GIVE repair must not add a document Touch fallback');
  fs.mkdirSync(path.dirname(OUTPUT), {recursive:true});
  const result = {pass:false, checks:{}, observed:null, errors:[]};
  let server, browser, context, page;
  try {
    ({server, url:result.url} = await serve(fs.readFileSync(ARTIFACT)));
    browser = await chromium.launch({headless:true});
    context = await browser.newContext({viewport:{width:400,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    page = await context.newPage();
    result.observed = observe(page, new URL(result.url).origin);
    await page.goto(result.url+'?mobile=on&portraitlayout=1',{waitUntil:'load'});
    await startPlay(page);
    result.layout = await page.evaluate(() => {
      const ids = ['mg','mlookpad','mportmenu','ml','ms'];
      const rects = Object.fromEntries(ids.map(id => {
        const r = document.getElementById(id).getBoundingClientRect();
        return [id,{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,z:getComputedStyle(document.getElementById(id)).zIndex}];
      }));
      const give = rects.mg;
      const target = document.elementFromPoint(give.left + give.width / 2, give.top + give.height / 2);
      const overlaps = (a,b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      return {rects, giveCenterTarget:target && target.id, giveOverlaps:{look:overlaps(give,rects.mlookpad),menu:overlaps(give,rects.mportmenu),move:overlaps(give,rects.ml),sprint:overlaps(give,rects.ms)}};
    });
    const beforePointer = await stageRecipient(page);
    const giveBox = await page.locator('#mg').boundingBox();
    const cdp = await context.newCDPSession(page);
    const x = giveBox.x + giveBox.width / 2, y = giveBox.y + giveBox.height / 2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    await page.waitForTimeout(100);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(80);
    const afterPointer = await page.evaluate(()=>({state,paused,seed:game.seed,modifier:game.modifier,helped:game.helped,delivered:game.delivered,cans:player.cans,inpGive:inp.give}));
    const beforeTouchFallback = await stageRecipient(page);
    const fallback = await page.evaluate(async () => {
      const mg = document.getElementById('mg');
      const touch = {identifier:77, clientX:mg.getBoundingClientRect().left + 10, clientY:mg.getBoundingClientRect().top + 10};
      const start = new Event('touchstart',{bubbles:true,cancelable:true});
      Object.defineProperty(start,'changedTouches',{value:[touch]});
      mg.dispatchEvent(start);
      await new Promise(resolve=>setTimeout(resolve,100));
      const end = new Event('touchend',{bubbles:true,cancelable:true});
      Object.defineProperty(end,'changedTouches',{value:[touch]});
      mg.dispatchEvent(end);
      return {startPrevented:start.defaultPrevented,endPrevented:end.defaultPrevented};
    });
    await page.waitForTimeout(80);
    const afterTouchFallback = await page.evaluate(()=>({state,paused,seed:game.seed,modifier:game.modifier,helped:game.helped,delivered:game.delivered,cans:player.cans,inpGive:inp.give}));
    result.pointer = {before:beforePointer,after:afterPointer};
    result.touchFallback = {before:beforeTouchFallback,after:afterTouchFallback,fallback};
    result.checks = {
      giveOwnsItsVisibleCenter:result.layout.giveCenterTarget === 'mg',
      giveHasNoControlOverlap:!Object.values(result.layout.giveOverlaps).some(Boolean),
      pointerTapDeliversExactlyOnce:afterPointer.helped === beforePointer.helped + 1 && afterPointer.delivered === beforePointer.delivered + 1 && afterPointer.cans === 0,
      pointerTapDoesNotResetOrChangeWeather:afterPointer.state === beforePointer.state && afterPointer.paused === beforePointer.paused && afterPointer.seed === beforePointer.seed && afterPointer.modifier === beforePointer.modifier && !afterPointer.inpGive,
      touchFallbackConsumesAndDeliversExactlyOnce:fallback.startPrevented && fallback.endPrevented && afterTouchFallback.helped === beforeTouchFallback.helped + 1 && afterTouchFallback.delivered === beforeTouchFallback.delivered + 1 && afterTouchFallback.cans === 0,
      touchFallbackDoesNotResetOrChangeWeather:afterTouchFallback.state === beforeTouchFallback.state && afterTouchFallback.paused === beforeTouchFallback.paused && afterTouchFallback.seed === beforeTouchFallback.seed && afterTouchFallback.modifier === beforeTouchFallback.modifier && !afterTouchFallback.inpGive,
      noErrors:Object.values(result.observed).every(rows=>rows.length === 0),
    };
    result.pass = Object.values(result.checks).every(Boolean);
  } catch(error) { result.errors.push(String(error.stack || error)); }
  finally {
    for(const resource of [page,context,browser]) if(resource) await resource.close();
    if(server) await new Promise(resolve=>server.close(resolve));
  }
  if(result.errors.length) result.pass=false;
  fs.writeFileSync(OUTPUT,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({pass:result.pass,output:path.relative(ROOT,OUTPUT),checks:result.checks,errors:result.errors}));
  if(!result.pass) process.exitCode=1;
}
main().catch(error=>{ console.error(error.stack || error); process.exitCode=1; });
