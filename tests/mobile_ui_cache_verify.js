'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'src/js/game-06-section-2b-mobile-touch-input.js');
const menuPath = path.join(root, 'src/js/game-07-section-2c-responsive-mobile-menu-html-overlay.js');

class FakeClassList {
  constructor(){ this.values = new Set(); }
  add(...names){ names.forEach(name => this.values.add(name)); }
  remove(...names){ names.forEach(name => this.values.delete(name)); }
  contains(name){ return this.values.has(name); }
  toggle(name, force){
    const want = force === undefined ? !this.values.has(name) : !!force;
    if(want) this.values.add(name); else this.values.delete(name);
    return want;
  }
}

class FakeElement {
  constructor(id, counters){
    this.id = id;
    this.classList = new FakeClassList();
    this.dataset = {};
    this.listeners = Object.create(null);
    this.children = [];
    this._innerHTML = '';
    this._textContent = '';
    this._counters = counters;
    this.style = new Proxy({}, {
      set: (target, prop, value) => {
        counters.rawStyleAssignments++;
        target[prop] = String(value);
        return true;
      }
    });
  }
  get innerHTML(){ return this._innerHTML; }
  set innerHTML(value){ this._counters.rawInnerHtmlAssignments++; this._innerHTML = String(value); }
  get textContent(){ return this._textContent; }
  set textContent(value){ this._textContent = String(value); }
  get innerText(){ return this._textContent || this._innerHTML.replace(/<[^>]*>/g, ' '); }
  setAttribute(name, value){ this[name] = String(value); }
  appendChild(child){ this.children.push(child); return child; }
  addEventListener(type, fn){ (this.listeners[type] ||= []).push(fn); }
  dispatch(type, event = {}){ for(const fn of this.listeners[type] || []) fn(Object.assign({ target:this, preventDefault(){}, stopPropagation(){} }, event)); }
  querySelector(){ return null; }
  querySelectorAll(){ return []; }
  closest(selector){ return selector === '.rit' && this.classList.contains('rit') ? this : null; }
  focus(){}
  getBoundingClientRect(){ return { left:0, top:0, right:100, bottom:100, width:100, height:100 }; }
  setPointerCapture(){}
  releasePointerCapture(){}
}

function makeHarness(){
  const counters = { rawStyleAssignments:0, rawInnerHtmlAssignments:0, storageGets:0 };
  const elements = new Map();
  const getElement = id => {
    if(!elements.has(id)) elements.set(id, new FakeElement(id, counters));
    return elements.get(id);
  };
  const windowListeners = Object.create(null);
  const documentListeners = Object.create(null);
  const vvListeners = Object.create(null);
  const storage = new Map();
  const visualViewport = {
    width: 390, height: 844, offsetLeft:0, offsetTop:0,
    addEventListener(type, fn){ (vvListeners[type] ||= []).push(fn); },
    dispatch(type){ for(const fn of vvListeners[type] || []) fn({ type }); }
  };
  const document = {
    fullscreenElement:null, webkitFullscreenElement:null,
    documentElement: getElement('documentElement'), body:getElement('body'),
    getElementById:getElement,
    createElement: id => new FakeElement(id, counters),
    addEventListener(type, fn){ (documentListeners[type] ||= []).push(fn); },
    dispatch(type, event = {}){ for(const fn of documentListeners[type] || []) fn(Object.assign({ type }, event)); }
  };
  const sandbox = {
    console, document, visualViewport, innerWidth:390, innerHeight:844,
    location:{ protocol:'https:', search:'' }, URLSearchParams,
    performance:{ now:()=>1000 }, Date, Math, JSON, Object, Array, Number, String, Set, Map, WeakMap,
    setTimeout:()=>1, clearTimeout(){}, setInterval:()=>1, clearInterval(){},
    getComputedStyle(){ return { paddingTop:'10px', paddingRight:'2px', paddingBottom:'20px', paddingLeft:'3px', pointerEvents:'auto', display:'flex' }; },
    matchMedia:()=>({ matches:true }), screen:{ orientation:{ type:'portrait-primary' } },
    addEventListener(type, fn){ (windowListeners[type] ||= []).push(fn); },
    dispatchWindow(type, event = {}){ for(const fn of windowListeners[type] || []) fn(Object.assign({ type }, event)); },
    localStorage:{
      getItem(key){ counters.storageGets++; return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value){ storage.set(key, String(value)); },
      removeItem(key){ storage.delete(key); }
    },
    STATE:{ TITLE:'title', SEEDED:'seeded', STATS:'stats', LB:'lb', OPTIONS:'options', PLAY:'play', UPGRADE:'upgrade', RESULTS:'results' },
    state:'play', paused:false, onboardingOpen:false, seedInput:'', nameInput:'', showMinimap:true,
    options:{
      joySizePx:110, buttonSizePx:85, lookSizePx:112, controlsYOffsetPx:0, controlOpacityValue:0.6,
      touchDeadzonePx:8, mobileControls:'on', mobileTurnSens:0.0062, lookSpeed:1,
      minimapSizePx:82, minimapDefault:true, reduceFx:false, soundOn:true, mouseSens:0.002,
      save(){}
    },
    player:{ angle:0, stamina:100, maxStamina:100, upgrades:{ sprint:0 } },
    game:{ run:{}, district:1, totalScore:0 }, profile:{ name:'RUNNER', save(){} },
    stats:{ data:{} }, leaderboards:{ data:{ highestDistrict:[] } },
    SAVE:{ hasValid:()=>false, save(){}, clear(){} },
    view:getElement('view'), cfg:{},
    _forcePortraitLayout:false, _selfCheckForcePortrait:false,
    isOrientationPortrait(){ return sandbox.visualViewport.height > sandbox.visualViewport.width; },
    isFullscreen(){ return !!sandbox.document.fullscreenElement; },
    portraitLayout(){
      const w = sandbox.visualViewport.width, h = sandbox.visualViewport.height;
      return {
        moveRect:{ left:20, top:h-140, width:110, height:110 }, giveRect:{ left:140, top:h-120, width:85, height:85 },
        lookRect:{ left:w-132, top:h-142, width:112, height:112 }, sprintRect:{ left:w-122, top:h-260, width:85, height:85 },
        menuRect:{ left:w/2-40, top:h-80, width:80, height:40 }, minimapRect:{ x:10, y:10, w:82, h:82 }
      };
    },
    clearInputState(){}, setMsg(){}, showToast(){}, beep(){}, crTriggerSoundCue(){},
    updateFsBtnLabel(){}, toggleFullscreen(){}, startRun(){}, continueRun(){}, restartRun(){}, startCustomLevel(){},
    chooseUpgrade(){}, showOnboardingHelp(){}, syncOnboardingPanel(){}, crCycleSelectedStartDistrict(){},
    buildTitleRmenuBody(){ return '<div class="rit">START</div>'; }, fmtTime(){ return '0:00'; }, prompt(){ return null; }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(inputPath, 'utf8'), sandbox, { filename:inputPath });
  vm.runInContext(fs.readFileSync(menuPath, 'utf8'), sandbox, { filename:menuPath });
  const run = code => vm.runInContext(code, sandbox);
  return { sandbox, counters, elements, storage, visualViewport, document, run };
}

const h = makeHarness();
for(const name of ['crMarkMobileUiDirty','crMarkMobileLayoutDirty','crInvalidateSafeAreaCache','crInvalidateControlOverrideCache','crGetMobileUiSyncStats']){
  assert.strictEqual(typeof h.sandbox[name], 'function', `${name} global API`);
}

// Stable PLAY: one warm-up flush, then 300 calls do no layout/storage/style work.
h.run('mobileMode=true; mobileOverride="on"; state=STATE.PLAY; paused=false; crMarkMobileUiDirty("test-warmup"); drawMobileMenu();');
const stableBefore = h.run('crGetMobileUiSyncStats()');
for(let i=0; i<300; i++) h.run('drawMobileMenu()');
const stableAfter = h.run('crGetMobileUiSyncStats()');
assert.strictEqual(stableAfter.layoutFlushes - stableBefore.layoutFlushes, 0, 'stable calls add no layout flushes');
assert.strictEqual(stableAfter.safeAreaReads - stableBefore.safeAreaReads, 0, 'stable calls add no safe-area reads');
assert.strictEqual(stableAfter.overrideStorageReads - stableBefore.overrideStorageReads, 0, 'stable calls add no override reads');
assert.strictEqual(stableAfter.styleWrites - stableBefore.styleWrites, 0, 'stable calls add no style writes');
assert(stableAfter.stableEarlyOuts - stableBefore.stableEarlyOuts >= 299, 'stable calls early-out at least 299 times');

const transitionResults = [];
function expectOneUiFlush(label, setup){
  const before = h.run('crGetMobileUiSyncStats()');
  setup();
  h.run('drawMobileMenu()');
  const after = h.run('crGetMobileUiSyncStats()');
  assert.strictEqual(after.uiFlushes - before.uiFlushes, 1, `${label}: one UI flush`);
  assert(after.layoutFlushes - before.layoutFlushes <= 1, `${label}: bounded layout flush`);
  transitionResults.push({ label, uiFlushes:after.uiFlushes-before.uiFlushes, layoutFlushes:after.layoutFlushes-before.layoutFlushes });
}
expectOneUiFlush('PLAY -> paused', () => h.run('paused=true'));
expectOneUiFlush('paused -> PLAY', () => h.run('paused=false'));
expectOneUiFlush('PLAY -> RESULTS', () => h.run('state=STATE.RESULTS'));
h.run('state=STATE.TITLE; drawMobileMenu();');
expectOneUiFlush('TITLE -> OPTIONS', () => h.run('state=STATE.OPTIONS'));
expectOneUiFlush('OPTIONS setting change', () => h.run('options.controlOpacityValue=0.75; _optionsMenuStamp++'));

const geometryResults = [];
function expectOneLayoutFlush(label, mutate){
  h.run('drawMobileMenu()');
  const before = h.run('crGetMobileUiSyncStats()');
  mutate();
  h.run('drawMobileMenu()');
  const after = h.run('crGetMobileUiSyncStats()');
  assert.strictEqual(after.layoutFlushes - before.layoutFlushes, 1, `${label}: one layout flush`);
  geometryResults.push({ label, layoutFlushes:after.layoutFlushes-before.layoutFlushes });
  h.run('drawMobileMenu()');
  const final = h.run('crGetMobileUiSyncStats()');
  assert.strictEqual(final.layoutFlushes, after.layoutFlushes, `${label}: stable after flush`);
}
h.run('state=STATE.PLAY; paused=false');
expectOneLayoutFlush('viewport resize', () => { h.sandbox.innerWidth=412; h.visualViewport.width=412; h.sandbox.dispatchWindow('resize'); });
expectOneLayoutFlush('orientation change', () => { h.visualViewport.width=844; h.visualViewport.height=390; h.sandbox.innerWidth=844; h.sandbox.innerHeight=390; h.sandbox.dispatchWindow('orientationchange'); });
expectOneLayoutFlush('fullscreen change', () => { h.document.fullscreenElement=h.elements.get('view'); h.document.dispatch('fullscreenchange'); });
expectOneLayoutFlush('control size option', () => h.run('options.joySizePx=120; crMarkMobileLayoutDirty("option-joy")'));
expectOneLayoutFlush('control edit drag', () => h.run('_controlEditActive=true; crMarkMobileLayoutDirty("control-edit-drag")'));
expectOneLayoutFlush('safe-area invalidation', () => h.run('crInvalidateSafeAreaCache("test-safe-area")'));

// Safe-area cache reads getComputedStyle once per revision.
let safe0 = h.run('crGetMobileUiSyncStats()');
h.run('readSafeAreaInsets(); readSafeAreaInsets();');
let safe1 = h.run('crGetMobileUiSyncStats()');
assert(safe1.safeAreaCacheHits - safe0.safeAreaCacheHits >= 1, 'safe-area stable read hits cache');
h.run('crInvalidateSafeAreaCache("explicit-test"); readSafeAreaInsets();');
let safe2 = h.run('crGetMobileUiSyncStats()');
assert.strictEqual(safe2.safeAreaReads - safe1.safeAreaReads, 1, 'safe-area invalidation causes one fresh read');
assert.strictEqual(safe2.safeAreaInvalidations - safe1.safeAreaInvalidations, 1, 'safe-area invalidation counted');

// Override persistence: storage once, cache thereafter, persist refreshes, clear/storage events invalidate.
h.run('crInvalidateControlOverrideCache("initial-test")');
let ov0 = h.run('crGetMobileUiSyncStats()');
h.run('crLoadControlOverrides(); crLoadControlOverrides();');
let ov1 = h.run('crGetMobileUiSyncStats()');
assert.strictEqual(ov1.overrideStorageReads - ov0.overrideStorageReads, 1, 'first override load reaches storage once');
assert(ov1.overrideCacheHits - ov0.overrideCacheHits >= 1, 'stable override load uses cache');
h.run('crPersistControlOverrides({v:1,overrides:{move:{x:0.1,y:0.6,w:0.2,h:0.2}}});');
const persisted = h.run('crLoadControlOverrides()');
assert(persisted && persisted.overrides.move, 'persist updates in-memory cache');
h.run('crClearControlOverrides(); crLoadControlOverrides();');
let ov2 = h.run('crGetMobileUiSyncStats()');
assert.strictEqual(ov2.overrideStorageReads - ov1.overrideStorageReads, 1, 'clear invalidates and next load reads storage');
h.storage.set('cannedRun.controls.v1', JSON.stringify({v:1,overrides:{look:{x:0.5,y:0.5,w:0.2,h:0.2}}}));
h.sandbox.dispatchWindow('storage', { key:'cannedRun.controls.v1' });
h.run('crLoadControlOverrides()');
let ov3 = h.run('crGetMobileUiSyncStats()');
assert.strictEqual(ov3.overrideStorageReads - ov2.overrideStorageReads, 1, 'storage event invalidates override cache');

// Active menu touch preserves nodes/HTML; deferred dirty state flushes after completion.
h.run('_controlEditActive=false; state=STATE.TITLE; paused=false; crMarkMobileUiDirty("touch-title"); drawMobileMenu();');
const menu = h.elements.get('rmenu');
const moveNode = h.elements.get('ml');
const lookNode = h.elements.get('mlookpad');
const htmlBeforeTouch = menu.innerHTML;
menu._touchAction = 'title-options';
h.run('state=STATE.OPTIONS; crMarkMobileUiDirty("touch-transition"); drawMobileMenu();');
assert.strictEqual(menu.innerHTML, htmlBeforeTouch, 'active touch suppresses destructive menu replacement');
assert.strictEqual(h.elements.get('ml'), moveNode, 'joystick node identity remains stable');
assert.strictEqual(h.elements.get('mlookpad'), lookNode, 'look node identity remains stable');
const deferred = h.run('crGetMobileUiSyncStats()');
assert(deferred.lastDirtyReasons.some(reason => /touch/.test(reason)), 'touch deferral remains dirty');
menu._touchAction = '';
h.run('crMarkMobileUiDirty("touch-complete"); drawMobileMenu();');
assert.notStrictEqual(menu.innerHTML, htmlBeforeTouch, 'deferred menu update flushes after touch completion');

const report = h.run('crGetMobileUiSyncStats()');
assert(Object.isFrozen(report), 'stats snapshot is immutable');
assert.strictEqual(typeof report.lastUiKey, 'string');
assert.strictEqual(typeof report.lastLayoutKey, 'string');
console.log('PASS mobile UI cache verifier', JSON.stringify({
  stableCalls:300,
  stableEarlyOuts:stableAfter.stableEarlyOuts-stableBefore.stableEarlyOuts,
  stableLayoutFlushes:stableAfter.layoutFlushes-stableBefore.layoutFlushes,
  stableSafeAreaReads:stableAfter.safeAreaReads-stableBefore.safeAreaReads,
  stableOverrideStorageReads:stableAfter.overrideStorageReads-stableBefore.overrideStorageReads,
  stableStyleWrites:stableAfter.styleWrites-stableBefore.styleWrites,
  transitions:transitionResults,
  geometry:geometryResults,
  safeAreaReads:report.safeAreaReads,
  safeAreaCacheHits:report.safeAreaCacheHits,
  overrideStorageReads:report.overrideStorageReads,
  overrideCacheHits:report.overrideCacheHits,
  touchSafety:'preserved'
}));
