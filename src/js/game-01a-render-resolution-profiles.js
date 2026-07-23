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
