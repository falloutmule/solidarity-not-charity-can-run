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

