'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { compileBuilding } = require('./building-asset-compiler');

const ROOT = path.resolve(__dirname, '..');

function dataUri(bytes) {
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function previewHtml(compiled) {
  const { asset, atlas, loaded } = compiled;
  const sourceFaces = Object.entries(loaded.sourceInputs).map(([name, face]) => `<figure><img src="${dataUri(face.bytes)}" alt="${escapeHtml(name)}"><figcaption>${escapeHtml(name)} — ${face.png.width}×${face.png.height}<br><code>${face.sha256}</code></figcaption></figure>`).join('');
  const faceRows = Object.entries(asset.faces).map(([side, descriptor]) => `<tr><th>${side}</th><td>${descriptor.assetRef}</td><td>${descriptor.reuse || '—'}</td><td>${descriptor.mirror ? 'yes' : 'no'}</td></tr>`).join('');
  const rotations = [0, 1, 2, 3].map((rotation) => `<section><h3>rotationQ ${rotation}</h3><canvas class="rotation" data-rotation="${rotation}" width="320" height="220"></canvas></section>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>${escapeHtml(asset.id)} building preview</title><style>body{margin:24px;background:#17130f;color:#eadfc7;font:16px/1.45 system-ui,sans-serif}h1,h2,h3{color:#ffdc71}code{font-size:11px;overflow-wrap:anywhere}figure{display:inline-block;vertical-align:top;margin:8px;max-width:360px}img,canvas{image-rendering:pixelated;image-rendering:crisp-edges;border:1px solid #8d7643;background-color:#ddd;background-image:linear-gradient(45deg,#bbb 25%,transparent 25%),linear-gradient(-45deg,#bbb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#bbb 75%),linear-gradient(-45deg,transparent 75%,#bbb 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0;max-width:100%;height:auto}figcaption{max-width:320px}table{border-collapse:collapse}th,td{border:1px solid #65583d;padding:6px;text-align:left}.grid{display:flex;flex-wrap:wrap;gap:16px}</style><h1>${escapeHtml(asset.id)}</h1><p>Footprint: <strong>${asset.footprint.wCells}×${asset.footprint.hCells} cells</strong> · source mode <strong>${escapeHtml(asset.source.mode)}</strong> · atlas ${atlas.width}×${atlas.height} · <code>${asset.atlas.sha256}</code></p><h2>Canonical source face</h2><div class="grid">${sourceFaces}</div><h2>Packed atlas</h2><img src="${asset.atlas.dataUri}" alt="packed atlas"><h2>Side mapping</h2><table><tr><th>world side</th><th>asset</th><th>reuse</th><th>mirror</th></tr>${faceRows}</table><h2>Quarter-turn preview</h2><div class="grid">${rotations}</div><script>const atlas=new Image();atlas.src=${JSON.stringify(asset.atlas.dataUri)};const slices=${JSON.stringify(asset.faceAssets)};const faces=${JSON.stringify(asset.faces)};const order=['south','east','north','west'];function draw(c,r){const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,c.width,c.height);const side=order[(r)%4];const face=faces[side],s=slices[face.assetRef].slice;const scale=Math.min((c.width-30)/s.w,(c.height-50)/s.h);const w=Math.round(s.w*scale),h=Math.round(s.h*scale);x.drawImage(atlas,s.x,s.y,s.w,s.h,Math.round((c.width-w)/2),22,w,h);x.fillStyle='#473b21';x.font='14px monospace';x.fillText(side+(face.reuse?' ← '+face.reuse:''),12,c.height-12)}atlas.onload=()=>document.querySelectorAll('canvas.rotation').forEach(c=>draw(c,Number(c.dataset.rotation)))</script>`;
}

function runPreview(buildingDir, outputPath) {
  const compiled = compileBuilding(buildingDir);
  const runId = crypto.randomBytes(6).toString('hex');
  const target = outputPath ? path.resolve(outputPath) : path.join(ROOT, 'test-results', 'building-preview', `${compiled.asset.id}-${runId}`, 'index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const html = previewHtml(compiled);
  fs.writeFileSync(target, html, 'utf8');
  return { assetId: compiled.asset.id, output: target, atlasSha256: compiled.asset.atlas.sha256, bytes: Buffer.byteLength(html) };
}

function main(argv) {
  const buildingDir = argv.find((arg) => !arg.startsWith('--'));
  const outputFlag = argv.indexOf('--output');
  if (!buildingDir) throw new Error('usage: node tools/building-asset-preview.js <building-dir> [--output <file>]');
  const result = runPreview(buildingDir, outputFlag >= 0 ? argv[outputFlag + 1] : null);
  process.stdout.write(`${JSON.stringify({ pass: true, ...result, output: path.relative(ROOT, result.output).replace(/\\/g, '/') })}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { previewHtml, runPreview };
