// ---------------------------------------------------------------------------
// SECTION 0 — CANVAS / RESOLUTION
// ---------------------------------------------------------------------------
const view = document.getElementById('view');
const ctx  = view.getContext('2d');
const RW = 320, RH = 200;                      // internal render resolution
const buf = document.createElement('canvas'); buf.width = RW; buf.height = RH;
const bctx = buf.getContext('2d');
const zbuffer = new Float32Array(RW);          // per-column wall distance (sprite occlusion)

