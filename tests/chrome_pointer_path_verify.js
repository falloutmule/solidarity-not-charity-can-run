'use strict';

// This is intentionally a production-artifact smoke. It must not depend on
// the retired mutable CR harness API.
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'index.html');
const OUTPUT = process.argv.find((value) => value.startsWith('--output='))?.slice('--output='.length)
  || path.join(ROOT, 'test-results', 'snc-chrome-pointer-path', `chrome-pointer-path-${process.pid}.json`);

function serve(){
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

function installRegistrationObserver(page, pointerEventsAvailable){
  return page.addInitScript(({ available }) => {
    if(!available) Object.defineProperty(window, 'PointerEvent', { value:undefined, configurable:true, writable:true });
    window.__sncRegistrations = [];
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options){
      const optionObject = typeof options === 'object' && options ? options : {};
      const target = this === document ? 'document' : this === window ? 'window' : (this && this.id ? `#${this.id}` : String(this && this.nodeName || 'other'));
      window.__sncRegistrations.push({ target, type:String(type), passive:optionObject.passive === true });
      return add.call(this, type, listener, options);
    };
  }, { available:pointerEventsAvailable });
}

function observe(page, origin){
  const value = { pageErrors:[], consoleErrors:[], externalRequests:[], requestFailures:[], badResponses:[] };
  page.on('pageerror', (error) => value.pageErrors.push(String(error.stack || error)));
  page.on('console', (message) => { if(message.type() === 'error') value.consoleErrors.push(message.text()); });
  page.on('request', (request) => { if(/^https?:/i.test(request.url()) && new URL(request.url()).origin !== origin) value.externalRequests.push(request.url()); });
  page.on('requestfailed', (request) => value.requestFailures.push(request.url()));
  page.on('response', (response) => { if(response.status() >= 400) value.badResponses.push({ url:response.url(), status:response.status() }); });
  return value;
}

async function open(browser, url, pointerEventsAvailable){
  const context = await browser.newContext({ viewport:{ width:412, height:915 }, isMobile:true, hasTouch:true, deviceScaleFactor:1 });
  const page = await context.newPage();
  await installRegistrationObserver(page, pointerEventsAvailable);
  const observed = observe(page, new URL(url).origin);
  await page.goto(`${url}?mobile=on&portraitlayout=1`, { waitUntil:'load', timeout:15000 });
  await page.waitForSelector('[data-action="title-start"]', { timeout:10000 });
  await page.waitForFunction(() => !!window.SNCDiagnostics && typeof window.SNCDiagnostics.getSnapshot === 'function');
  return { context, page, observed };
}

async function snapshot(page){
  return page.evaluate(() => window.SNCDiagnostics.getSnapshot());
}

async function startPlay(page){
  await page.locator('[data-action="title-start"]').click();
  await page.waitForFunction(() => window.SNCDiagnostics.getSnapshot().runtime.state === 'play', null, { timeout:10000 });
  if(await page.locator('#cronboard.show').count()) await page.locator('#cronboardok').click();
  await page.waitForFunction(() => {
    const runtime = window.SNCDiagnostics.getSnapshot().runtime;
    return runtime.state === 'play' && !runtime.paused;
  }, null, { timeout:5000 });
}

function has(registrations, target, type){ return registrations.some((row) => row.target === target && row.type === type); }
function distance(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }
function allObserversClean(observed){ return Object.values(observed).every((rows) => rows.length === 0); }

async function concurrentPointerSmoke(page){
  const before = await snapshot(page);
  await page.evaluate(() => {
    const move = document.getElementById('ml');
    const look = document.getElementById('mlookpad');
    const mr = move.getBoundingClientRect();
    const lr = look.getBoundingClientRect();
    const send = (target, type, pointerId, x, y, samples) => {
      const event = new PointerEvent(type, { bubbles:true, cancelable:true, pointerId, pointerType:'touch', clientX:x, clientY:y });
      if(samples) Object.defineProperty(event, 'getCoalescedEvents', { configurable:true, value:() => samples });
      target.dispatchEvent(event);
    };
    const mx = mr.left + mr.width / 2, my = mr.top + mr.height / 2;
    const lx = lr.left + lr.width / 2, ly = lr.top + lr.height / 2;
    send(move, 'pointerdown', 41, mx, my);
    send(look, 'pointerdown', 42, lx, ly);
    send(move, 'pointermove', 41, mx, my - 34);
    send(look, 'pointermove', 42, lx + 99, ly, [{ clientX:lx + 8, clientY:ly }, { clientX:lx + 16, clientY:ly }]);
  });
  await page.waitForTimeout(300);
  const during = await snapshot(page);
  await page.evaluate(() => {
    const move = document.getElementById('ml');
    const look = document.getElementById('mlookpad');
    const mr = move.getBoundingClientRect(), lr = look.getBoundingClientRect();
    const event = (target, type, pointerId, rect) => target.dispatchEvent(new PointerEvent(type, { bubbles:true, cancelable:true, pointerId, pointerType:'touch', clientX:rect.left + rect.width / 2, clientY:rect.top + rect.height / 2 }));
    event(move, 'pointerup', 41, mr);
    event(look, 'pointerup', 42, lr);
  });
  await page.waitForTimeout(150);
  const released = await snapshot(page);
  await page.waitForTimeout(200);
  const settled = await snapshot(page);
  await page.evaluate(() => {
    const move = document.getElementById('ml');
    const look = document.getElementById('mlookpad');
    const mr = move.getBoundingClientRect(), lr = look.getBoundingClientRect();
    const send = (target, type, pointerId, x, y) => target.dispatchEvent(new PointerEvent(type, { bubbles:true, cancelable:true, pointerId, pointerType:'touch', clientX:x, clientY:y }));
    const mx = mr.left + mr.width / 2, my = mr.top + mr.height / 2;
    const lx = lr.left + lr.width / 2, ly = lr.top + lr.height / 2;
    send(move, 'pointerdown', 61, mx, my); send(look, 'pointerdown', 62, lx, ly);
    send(move, 'pointermove', 61, mx, my - 34);
    send(look, 'pointermove', 62, lx + 16, ly);
    send(move, 'pointercancel', 61, mx, my); send(look, 'pointercancel', 62, lx, ly);
  });
  await page.waitForTimeout(150);
  const cancelled = await snapshot(page);
  const lookPressed = await page.locator('#mlookpad').evaluate((element) => element.classList.contains('pr'));
  return { before, during, released, settled, cancelled, lookPressed };
}

async function main(){
  assert(fs.existsSync(ARTIFACT), 'root production index.html must exist');
  const source = fs.readFileSync(path.join(ROOT, 'src/js/game-06-section-2b-mobile-touch-input.js'), 'utf8');
  assert(source.includes('function crPointerSamples(event)'), 'coalesced pointer helper missing');
  assert(source.includes('const samples = event.getCoalescedEvents();') && source.includes('if(samples && samples.length) return Array.from(samples);'), 'coalesced samples must replace, not supplement, the parent event');
  assert(source.includes("const hasPointerEvents = typeof window.PointerEvent === 'function';"), 'Pointer Event capability gate missing');
  const { server, url } = await serve();
  const browser = await chromium.launch({ headless:true });
  const evidence = {};
  try {
    const pointer = await open(browser, url, true);
    try {
      const registrations = await pointer.page.evaluate(() => window.__sncRegistrations);
      evidence.pointerRegistrations = registrations;
      for(const target of ['#ml', '#mlookpad']) for(const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) assert(has(registrations, target, type), `${target} missing ${type} in Pointer Event mode`);
      const targets = new Set(['document', '#ml', '#mr', '#mlookpad', '#mg', '#ms', '#mm', '#mp', '#mportmenu', '#fsbtn', '#rmenu']);
      const touchListeners = registrations.filter((row) => targets.has(row.target) && row.type.startsWith('touch'));
      assert(!touchListeners.length, `Pointer Event mode must not install legacy control Touch listeners: ${JSON.stringify(touchListeners)}`);
      assert(!registrations.some((row) => row.target === 'document' && row.type === 'touchmove' && !row.passive), 'Pointer Event mode installed non-passive document touchmove');
      await startPlay(pointer.page);
      const styles = await pointer.page.evaluate(() => {
        const get = (id) => getComputedStyle(document.getElementById(id));
        const before = window.scrollY; window.scrollTo(0, 100);
        return { view:get('view').touchAction, move:get('ml').touchAction, look:get('mlookpad').touchAction, overlay:get('mob').touchAction, viewUserSelect:get('view').userSelect, overlayUserSelect:get('mob').userSelect, bodyOverflow:getComputedStyle(document.body).overflow, htmlOverflow:getComputedStyle(document.documentElement).overflow, scrollBefore:before, scrollAfter:window.scrollY };
      });
      evidence.styles = styles;
      assert.deepStrictEqual([styles.view, styles.move, styles.look, styles.overlay], ['none', 'none', 'none', 'none'], 'static touch-action must be none before contact');
      assert.strictEqual(styles.viewUserSelect, 'none'); assert.strictEqual(styles.overlayUserSelect, 'none');
      assert.strictEqual(styles.bodyOverflow, 'hidden'); assert.strictEqual(styles.htmlOverflow, 'hidden'); assert.strictEqual(styles.scrollAfter, styles.scrollBefore, 'PLAY surface must not scroll');
      const smoke = evidence.pointerSmoke = await concurrentPointerSmoke(pointer.page);
      assert(distance(smoke.during.runtime.player, smoke.before.runtime.player) > 0, 'MOVE + LOOK must move together');
      assert(Math.abs(smoke.during.runtime.player.angle - smoke.before.runtime.player.angle) > 0, 'MOVE + LOOK must turn together');
      assert.strictEqual(smoke.released.runtime.joy.active, false, 'both release orders must clear MOVE ownership');
      assert(distance(smoke.settled.runtime.player, smoke.released.runtime.player) < 0.02, 'released MOVE must not continue after the next frames');
      assert.strictEqual(smoke.cancelled.runtime.joy.active, false, 'pointercancel must clear MOVE ownership');
      assert.strictEqual(smoke.lookPressed, false, 'pointercancel must clear LOOK ownership');
      assert(allObserversClean(pointer.observed), `pointer browser observers failed: ${JSON.stringify(pointer.observed)}`);
      evidence.pointerObservers = pointer.observed;
    } finally { await pointer.context.close(); }

    const fallback = await open(browser, url, false);
    try {
      const registrations = await fallback.page.evaluate(() => window.__sncRegistrations);
      evidence.fallbackRegistrations = registrations;
      for(const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) assert(has(registrations, '#ml', type) || (type === 'touchmove' && has(registrations, 'document', type)), `Touch fallback missing ${type}`);
      assert(has(registrations, 'document', 'touchmove'), 'Touch fallback must retain its document touchmove route');
      assert(allObserversClean(fallback.observed), `fallback browser observers failed: ${JSON.stringify(fallback.observed)}`);
      evidence.fallbackObservers = fallback.observed;
    } finally { await fallback.context.close(); }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive:true });
  fs.writeFileSync(OUTPUT, JSON.stringify({ pass:true, buildId:'chromeinput2', evidence }, null, 2));
  console.log(`chrome_pointer_path_verify: PASS ${OUTPUT}`);
}

main().catch((error) => { console.error(`chrome_pointer_path_verify: FAIL ${error.stack || error}`); process.exitCode = 1; });
