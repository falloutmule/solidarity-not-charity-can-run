// ---------------------------------------------------------------------------
// SECTION 0b — FULLSCREEN API HELPERS
// ---------------------------------------------------------------------------
let _resizeTimer = null;
function _debouncedResize(){
  if(_resizeTimer) clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(()=>{
    resize();
    // CRITICAL: re-evaluate mobile mode and re-apply control layout on orientation/size change.
    // Without this, #mr stays pointer-events:none after rotating from portrait to landscape.
    if(typeof setMobileMode === 'function' && typeof isMobile === 'function'){
      setMobileMode(isMobile());
    }
    if(typeof applyMobileControlSettings === 'function'){
      applyMobileControlSettings();
    }
    if(typeof crMigrateUnsafeControlsYOffset === 'function' && typeof isMobilePortrait === 'function' && isMobilePortrait()){
      crMigrateUnsafeControlsYOffset({ quiet: true });
    }
  }, 120);
}
function isFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}
function enterFullscreen(){
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if(!req){
    showToast('FULLSCREEN NOT AVAILABLE IN THIS BROWSER MODE');
    return false;
  }
  try{
    const p = req.call(el);
    if(p && p.catch) p.catch(()=>{ showToast('FULLSCREEN NOT AVAILABLE IN THIS BROWSER MODE'); });
  }catch(e){
    showToast('FULLSCREEN NOT AVAILABLE IN THIS BROWSER MODE');
    return false;
  }
  return true;
}
function exitFullscreen(){
  const ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if(!ex) return false;
  try{
    const p = ex.call(document);
    if(p && p.catch) p.catch(()=>{});
  }catch(e){ return false; }
  return true;
}
function toggleFullscreen(){
  if(isFullscreen()) exitFullscreen();
  else enterFullscreen();
}
function showToast(msg, ms){
  const t = document.getElementById('fstoast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.classList.remove('show'); }, ms||3000);
}
// Resize canvas on fullscreen transitions
['fullscreenchange','webkitfullscreenchange','msfullscreenchange'].forEach(ev=>{
  document.addEventListener(ev, ()=>{ syncVisualViewportShell(); _debouncedResize(); updateFsBtnLabel(); });
});
// Resize on orientation change with debounce
addEventListener('orientationchange', ()=>{ _debouncedResize(); });

function syncVisualViewportShell(){
  const vv = window.visualViewport;
  const root = document.documentElement;
  let w, h, ox, oy;
  if(vv){
    w = Math.max(1, Math.round(vv.width));
    h = Math.max(1, Math.round(vv.height));
    ox = Math.round(vv.offsetLeft || 0);
    oy = Math.round(vv.offsetTop || 0);
  } else {
    w = Math.max(1, Math.round(innerWidth));
    h = Math.max(1, Math.round(innerHeight));
    ox = oy = 0;
  }
  root.style.setProperty('--app-vw-px', w + 'px');
  root.style.setProperty('--app-vh-px', h + 'px');
  root.style.setProperty('--vv-off-x', ox + 'px');
  root.style.setProperty('--vv-off-y', oy + 'px');
  if(oy || ox){
    try { window.scrollTo(ox, oy); } catch(_e){}
  }
}
function isOrientationPortrait(){
  if(typeof matchMedia === 'function' && matchMedia('(orientation: portrait)').matches) return true;
  try {
    const t = screen.orientation && screen.orientation.type;
    if(t && String(t).indexOf('portrait') >= 0) return true;
  } catch(e){}
  const vv = window.visualViewport;
  if(vv && vv.height > vv.width) return true;
  return innerHeight > innerWidth;
}
function resize(){
  syncVisualViewportShell();
  // Use visualViewport for accurate mobile dimensions (accounts for address bar).
  // Do NOT multiply by devicePixelRatio — all drawing code uses CSS pixel coordinates,
  // so DPR scaling would leave the right/bottom of the backing store undrawn (black).
  // This game upscales a 320x200 buffer with pixelated rendering; DPR adds no benefit.
  let vw = Math.round((window.visualViewport && window.visualViewport.width) || innerWidth);
  let vh = Math.round((window.visualViewport && window.visualViewport.height) || innerHeight);
  if(isOrientationPortrait() && vw > vh){
    const t = vw; vw = vh; vh = t;
  }
  view.width  = vw;
  view.height = vh;
  view.style.width  = vw + 'px';
  view.style.height = vh + 'px';
}
function updateFsBtnLabel(){
  const b = document.getElementById('fsbtn');
  if(b) b.textContent = isFullscreen() ? 'EXIT FS' : 'FULLSCREEN';
}
addEventListener('resize', _debouncedResize);
// Also handle visual viewport resize (mobile address bar) — update immediately for responsiveness
if(window.visualViewport){
  window.__crVvResizeHooked = true;
  window.visualViewport.addEventListener('resize', ()=>{ syncVisualViewportShell(); _debouncedResize(); }, { passive: true });
  window.visualViewport.addEventListener('scroll', ()=>{ syncVisualViewportShell(); _debouncedResize(); }, { passive: true });
}
resize();

