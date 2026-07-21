// ---------------------------------------------------------------------------
// SECTION 0 — CANVAS / RESOLUTION
// ---------------------------------------------------------------------------
const view = document.getElementById('view');
const ctx  = view.getContext('2d');
let RW = 320, RH = 200;                        // profile-driven internal render resolution
let buf = document.createElement('canvas'); buf.width = RW; buf.height = RH;
let bctx = buf.getContext('2d');
bctx.imageSmoothingEnabled = false;
let zbuffer = new Float32Array(RW);            // per-column wall distance (sprite occlusion)

