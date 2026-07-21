// ---------------------------------------------------------------------------
// FAR-FIELD LAB — SELECTABLE INTERNAL RENDER RESOLUTION PROFILES
// ---------------------------------------------------------------------------
const CR_FFRES_ALLOWLIST = Object.freeze(['320', '400', '480']);
const CR_RENDER_PROFILES = Object.freeze({
  '320': Object.freeze({ id: '320', width: 320, height: 200, scale: 1 }),
  '400': Object.freeze({ id: '400', width: 400, height: 250, scale: 1.25 }),
  '480': Object.freeze({ id: '480', width: 480, height: 300, scale: 1.5 })
});

function crResolveRenderProfile(params){
  let query = params;
  if(query == null){
    try {
      query = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    } catch(_err) {
      query = null;
    }
  }
  if(!query || typeof query.get !== 'function') return CR_RENDER_PROFILES['400'];
  let id;
  try { id = query.get('ffres'); }
  catch(_err) { return CR_RENDER_PROFILES['400']; }
  return Object.prototype.hasOwnProperty.call(CR_RENDER_PROFILES, id)
    ? CR_RENDER_PROFILES[id]
    : CR_RENDER_PROFILES['400'];
}

let crResolvedRenderProfile = crResolveRenderProfile();
let crAppliedRenderProfile = null;
let crRenderProfileProof = null;
let crRenderProjectionTables = null;
let crRenderTargetRebuildCount = 0;

function crCanonicalRenderProfile(profile){
  if(!profile || typeof profile !== 'object') return CR_RENDER_PROFILES['400'];
  let id;
  try { id = profile.id; }
  catch(_err) { return CR_RENDER_PROFILES['400']; }
  return Object.prototype.hasOwnProperty.call(CR_RENDER_PROFILES, id)
    ? CR_RENDER_PROFILES[id]
    : CR_RENDER_PROFILES['400'];
}

function crGetRenderProfile(){
  return crAppliedRenderProfile || crResolvedRenderProfile;
}

function crRenderTargetsMatch(profile){
  return RW === profile.width && RH === profile.height &&
    !!buf && buf.width === profile.width && buf.height === profile.height &&
    !!bctx && zbuffer instanceof Float32Array && zbuffer.length === profile.width;
}

function crResetRenderTargets(profile){
  const selected = crCanonicalRenderProfile(profile);
  const rebuilt = !crRenderTargetsMatch(selected);
  let nextBuf = buf;
  let nextBctx = bctx;
  let nextZbuffer = zbuffer;

  // Build replacement targets first so the renderer cannot observe mixed dimensions.
  if(rebuilt){
    nextBuf = document.createElement('canvas');
    nextBuf.width = selected.width;
    nextBuf.height = selected.height;
    nextBctx = nextBuf.getContext('2d');
    if(!nextBctx) throw new Error('Unable to create internal render context');
    nextBctx.imageSmoothingEnabled = false;
    nextZbuffer = new Float32Array(selected.width);
  } else {
    bctx.imageSmoothingEnabled = false;
  }

  if(rebuilt){
    RW = selected.width;
    RH = selected.height;
    buf = nextBuf;
    bctx = nextBctx;
    zbuffer = nextZbuffer;
    if(typeof skyCanvas !== 'undefined') skyCanvas = null;
    if(typeof skyBuilt !== 'undefined') skyBuilt = null;
    crRenderProjectionTables = null;
    crRenderTargetRebuildCount++;
  }

  crRenderProfileProof = Object.freeze({
    profile: selected,
    bufferWidth: buf.width,
    bufferHeight: buf.height,
    zbufferLength: zbuffer.length,
    skyInvalidated: rebuilt,
    rebuilt
  });
  return crRenderProfileProof;
}

function crGetRenderResolutionStats(){
  const profile = crGetRenderProfile();
  return Object.freeze({
    profileId: profile.id,
    internalWidth: RW,
    internalHeight: RH,
    wallColumnsPerFrame: RW,
    // The renderer/profiler coordinator supplies measured column/timing facts.
    spriteColumnsDrawn: null,
    sceneAverage: null,
    sceneP95: null,
    sceneWorst: null,
    frameP95: null,
    targetRebuildCount: crRenderTargetRebuildCount
  });
}

function crApplyRenderProfile(profile){
  const selected = crCanonicalRenderProfile(profile);
  if(crAppliedRenderProfile === selected && crRenderTargetsMatch(selected)) return selected;
  crResetRenderTargets(selected);
  crAppliedRenderProfile = selected;
  crResolvedRenderProfile = selected;
  return selected;
}
