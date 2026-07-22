'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'index.html');
const OUTPUT = process.argv.find(value => value.startsWith('--output='))?.slice('--output='.length)
  || path.join(ROOT, 'test-results', 'snc-chrome-pointer-path', `chrome-pointer-path-${process.pid}.json`);

function chromium(){
  try { return require('playwright').chromium; }
  catch(error) { throw new Error(`Playwright dependency unavailable: ${error.message}`); }
}

function startServer(){
  const bytes = fs.readFileSync(ARTIFACT);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if(url.pathname === '/favicon.ico'){ response.writeHead(204); response.end(); return; }
    if(url.pathname !== '/'){ response.writeHead(404); response.end('not found'); return; }
    response.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store' });
    response.end(bytes);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, url:`http://127.0.0.1:${server.address().port}/` }));
  });
}

function instrumentPage(page, pointerEventsAvailable){
  return page.addInitScript(({ pointerEventsAvailable: available }) => {
    if(!available) Object.defineProperty(window, 'PointerEvent', { value:undefined, configurable:true, writable:true });
    window.__sncRegistrations = [];
    const nativeAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options){
      const optionObject = typeof options === 'object' && options ? options : {};
      const target = this === document ? 'document' : this === window ? 'window' : (this && this.id ? `#${this.id}` : String(this && this.nodeName || 'other'));
      window.__sncRegistrations.push({ target, type:String(type), passive: optionObject.passive === true });
      return nativeAdd.call(this, type, listener, options);
    };
  }, { pointerEventsAvailable });
}

function observers(page, origin){
  const value = { pageErrors:[], consoleErrors:[], externalRequests:[], requestFailures:[], badResponses:[] };
  page.on('pageerror', error => value.pageErrors.push(String(error.stack || error)));
  page.on('console', message => { if(message.type() === 'error') value.consoleErrors.push(message.text()); });
  page.on('request', request => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) value.externalRequests.push(request.url()); });
  page.on('requestfailed', request => value.requestFailures.push(request.url()));
  page.on('response', response => { if(response.status() >= 400) value.badResponses.push({ url:response.url(), status:response.status() }); });
  return value;
}

async function open(browser, url, pointerEventsAvailable){
  const context = await browser.newContext({ viewport:{ width:412, height:915 }, isMobile:true, hasTouch:true, deviceScaleFactor:1 });
  const page = await context.newPage();
  await instrumentPage(page, pointerEventsAvailable);
  const observed = observers(page, new URL(url).origin);
  await page.goto(`${url}?mobile=on&portraitlayout=1`, { waitUntil:'load', timeout:15000 });
  await page.waitForFunction(() => window.CR && document.querySelector('[data-action="title-start"]'), null, { timeout:10000 });
  return { context, page, observed };
}

async function startPlay(page){
  await page.locator('[data-action="title-start"]').click();
  await page.waitForFunction(() => CR.state === CR.STATE.PLAY, null, { timeout:10000 });
  if(await page.locator('#cronboard.show').count()) await page.locator('#cronboardok').click();
  await page.waitForFunction(() => CR.state === CR.STATE.PLAY && !CR.paused && !CR.onboardingOpen, null, { timeout:5000 });
}

function has(registrations, target, type){ return registrations.some(row => row.target === target && row.type === type); }

async function pointerSmoke(page){
  return page.evaluate(() => {
    const ml = document.getElementById('ml');
    const look = document.getElementById('mlookpad');
    const moveRect = ml.getBoundingClientRect();
    const lookRect = look.getBoundingClientRect();
    const moveX = moveRect.left + moveRect.width / 2;
    const moveY = moveRect.top + moveRect.height / 2;
    const lookX = lookRect.left + lookRect.width / 2;
    const lookY = lookRect.top + lookRect.height / 2;
    const send = (target, type, pointerId, x, y, samples) => {
      const event = new PointerEvent(type, { bubbles:true, cancelable:true, pointerId, pointerType:'touch', clientX:x, clientY:y });
      if(samples) Object.defineProperty(event, 'getCoalescedEvents', { configurable:true, value:() => samples });
      target.dispatchEvent(event);
    };
    const before = { x:CR.player.x, y:CR.player.y, angle:CR.player.angle };
    crResetLookPadApplyCount();
    send(ml, 'pointerdown', 41, moveX, moveY);
    send(look, 'pointerdown', 42, lookX, lookY);
    send(ml, 'pointermove', 41, moveX, moveY - 34);
    send(look, 'pointermove', 42, lookX + 99, lookY, [
      { clientX:lookX + 8, clientY:lookY, timeStamp:10 },
      { clientX:lookX + 16, clientY:lookY, timeStamp:11 },
    ]);
    const coalescedApplyCount = crGetLookPadApplyCount();
    crApplyPendingInputActions();
    CR.update(1 / 30);
    const during = { x:CR.player.x, y:CR.player.y, angle:CR.player.angle };
    send(ml, 'pointerup', 41, moveX, moveY - 34);
    send(look, 'pointerup', 42, lookX + 16, lookY);
    const afterFirstRelease = { x:CR.player.x, y:CR.player.y, angle:CR.player.angle };
    CR.update(0.15);
    const afterFirstStop = { x:CR.player.x, y:CR.player.y, angle:CR.player.angle };
    send(ml, 'pointerdown', 51, moveX, moveY);
    send(look, 'pointerdown', 52, lookX, lookY);
    send(ml, 'pointermove', 51, moveX, moveY - 34);
    send(look, 'pointermove', 52, lookX + 16, lookY);
    send(look, 'pointerup', 52, lookX + 16, lookY);
    send(ml, 'pointerup', 51, moveX, moveY - 34);
    const afterReverseRelease = { x:CR.player.x, y:CR.player.y, angle:CR.player.angle };
    CR.update(0.15);
    const afterReverseStop = { x:CR.player.x, y:CR.player.y, angle:CR.player.angle };
    send(ml, 'pointerdown', 61, moveX, moveY);
    send(look, 'pointerdown', 62, lookX, lookY);
    send(ml, 'pointermove', 61, moveX, moveY - 34);
    send(look, 'pointermove', 62, lookX + 16, lookY);
    send(ml, 'pointercancel', 61, moveX, moveY - 34);
    send(look, 'pointercancel', 62, lookX + 16, lookY);
    const afterCancel = { x:CR.player.x, y:CR.player.y, angle:CR.player.angle, lookPressed:look.classList.contains('pr') };
    CR.update(0.15);
    const afterCancelStep = { x:CR.player.x, y:CR.player.y, angle:CR.player.angle };
    return { before, during, coalescedApplyCount, afterFirstRelease, afterFirstStop, afterReverseRelease, afterReverseStop, afterCancel, afterCancelStep };
  });
}

function distance(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }

async function main(){
  assert(fs.existsSync(ARTIFACT), 'build root index.html before this verifier');
  const source = fs.readFileSync(path.join(ROOT, 'src/js/game-06-section-2b-mobile-touch-input.js'), 'utf8');
  assert(source.includes('function crPointerSamples(event)'), 'coalesced pointer helper missing');
  assert(source.includes("const hasPointerEvents = typeof window.PointerEvent === 'function';"), 'Pointer Event capability gate missing');
  const { server, url } = await startServer();
  const browser = await chromium().launch({ headless:true });
  const evidence = {};
  try {
    const pointer = await open(browser, url, true);
    try {
      const registrations = await pointer.page.evaluate(() => window.__sncRegistrations);
      evidence.pointerRegistrations = registrations;
      for(const target of ['#ml', '#mlookpad']) for(const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) assert(has(registrations, target, type), `${target} missing ${type} in Pointer Event mode`);
      const controlTargets = new Set(['document', '#ml', '#mr', '#mlookpad', '#mg', '#ms', '#mm', '#mp', '#mportmenu', '#fsbtn', '#rmenu']);
      const unexpectedTouchListeners = registrations.filter(row => controlTargets.has(row.target) && row.type.startsWith('touch'));
      assert(!unexpectedTouchListeners.length, `Pointer Event mode must not install legacy control Touch listeners: ${JSON.stringify(unexpectedTouchListeners)}`);
      assert(!registrations.some(row => row.target === 'document' && row.type === 'touchmove' && !row.passive), 'Pointer Event mode installed non-passive document touchmove');
      await startPlay(pointer.page);
      const styles = await pointer.page.evaluate(() => {
        const get = id => getComputedStyle(document.getElementById(id));
        const scrollBefore = window.scrollY;
        window.scrollTo(0, 100);
        const scrollAfter = window.scrollY;
        return {
          view:get('view').touchAction, move:get('ml').touchAction, look:get('mlookpad').touchAction, overlay:get('mob').touchAction,
          viewUserSelect:get('view').userSelect, overlayUserSelect:get('mob').userSelect,
          bodyOverflow:getComputedStyle(document.body).overflow, htmlOverflow:getComputedStyle(document.documentElement).overflow,
          scrollBefore, scrollAfter,
        };
      });
      evidence.styles = styles;
      assert.deepStrictEqual([styles.view, styles.move, styles.look, styles.overlay], ['none','none','none','none'], 'static touch-action must be none before contact');
      assert.strictEqual(styles.viewUserSelect, 'none');
      assert.strictEqual(styles.overlayUserSelect, 'none');
      assert.strictEqual(styles.bodyOverflow, 'hidden');
      assert.strictEqual(styles.htmlOverflow, 'hidden');
      assert.strictEqual(styles.scrollAfter, styles.scrollBefore, 'PLAY surface must not scroll');
      evidence.pointerSmoke = await pointerSmoke(pointer.page);
      const smoke = evidence.pointerSmoke;
      assert.strictEqual(smoke.coalescedApplyCount, 2, 'LOOK must consume two coalesced samples exactly once, not the parent event');
      assert(distance(smoke.during, smoke.before) > 0, 'MOVE + LOOK must move together');
      assert(Math.abs(smoke.during.angle - smoke.before.angle) > 0, 'MOVE + LOOK must turn together');
      assert(distance(smoke.afterFirstStop, smoke.afterFirstRelease) < 1e-9, 'MOVE must stop after MOVE-first release');
      assert(distance(smoke.afterReverseStop, smoke.afterReverseRelease) < 1e-9, 'MOVE must stop after LOOK-first release');
      assert.strictEqual(smoke.afterCancel.lookPressed, false, 'pointercancel must clear LOOK ownership');
      assert(distance(smoke.afterCancelStep, smoke.afterCancel) < 1e-9, 'pointercancel must clear MOVE ownership');
      assert.strictEqual(pointer.observed.pageErrors.length + pointer.observed.consoleErrors.length + pointer.observed.externalRequests.length + pointer.observed.requestFailures.length + pointer.observed.badResponses.length, 0, `pointer browser observers failed: ${JSON.stringify(pointer.observed)}`);
      evidence.pointerObservers = pointer.observed;
    } finally { await pointer.context.close(); }

    const fallback = await open(browser, url, false);
    try {
      const registrations = await fallback.page.evaluate(() => window.__sncRegistrations);
      evidence.fallbackRegistrations = registrations;
      for(const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) assert(has(registrations, '#ml', type) || (type === 'touchmove' && has(registrations, 'document', type)), `Touch fallback missing ${type}`);
      assert(has(registrations, 'document', 'touchmove'), 'Touch fallback must retain its document touchmove route');
      assert.strictEqual(fallback.observed.pageErrors.length + fallback.observed.consoleErrors.length + fallback.observed.externalRequests.length + fallback.observed.requestFailures.length + fallback.observed.badResponses.length, 0, `fallback browser observers failed: ${JSON.stringify(fallback.observed)}`);
      evidence.fallbackObservers = fallback.observed;
    } finally { await fallback.context.close(); }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  const result = { pass:true, buildId:'chromeinput2', evidence };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive:true });
  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(`chrome_pointer_path_verify: PASS ${OUTPUT}`);
}

main().catch(error => { console.error(`chrome_pointer_path_verify: FAIL ${error.stack || error}`); process.exitCode = 1; });
