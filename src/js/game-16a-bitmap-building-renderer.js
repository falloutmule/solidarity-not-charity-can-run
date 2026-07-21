// ---------------------------------------------------------------------------
// SECTION 7B — GENERIC WHOLE-FACE BITMAP BUILDING RENDERER
// ---------------------------------------------------------------------------
(function(root){
  'use strict';

  const FACE_DIRS = Object.freeze(['south', 'east', 'north', 'west']);
  const faceCache = new Map();

  function bitmapRegistry(){
    return root.BITMAP_BUILDING_ASSET_REGISTRY ||
      root.SNC_BITMAP_BUILDING_ASSET_REGISTRY ||
      root.BITMAP_BUILDING_ASSETS || null;
  }

  function lookupBitmapBuildingAsset(assetId){
    const registry = bitmapRegistry();
    if(!registry || !assetId) return null;
    if(typeof registry.get === 'function') return registry.get(assetId) || null;
    return registry[assetId] || null;
  }

  function resolveBitmapWorldFace(side, stepX, stepY){
    if(side === 0) return stepX > 0 ? 'west' : 'east';
    if(side === 1) return stepY > 0 ? 'north' : 'south';
    return null;
  }

  function inverseRotateBitmapFace(worldFace, rotationQ){
    const worldIndex = FACE_DIRS.indexOf(worldFace);
    if(worldIndex < 0) return null;
    const q = ((rotationQ | 0) % 4 + 4) % 4;
    return FACE_DIRS[(worldIndex + q) % 4];
  }

  function resolveBitmapLocalHit(cell, localFace, rotationQ, wallFraction, w, h){
    const q = ((rotationQ | 0) % 4 + 4) % 4;
    const axis = (localFace === 'south' || localFace === 'north') ? 'x' : 'y';
    const reverseByRotation = [
      Object.freeze({}),
      Object.freeze({ east: true, west: true }),
      Object.freeze({ south: true, east: true, north: true, west: true }),
      Object.freeze({ south: true, north: true })
    ];
    const p = reverseByRotation[q][localFace] ? 1 - wallFraction : wallFraction;
    const span = axis === 'x' ? w : h;
    const localCell = axis === 'x' ? cell.lx : cell.ly;
    return {
      axis,
      localAlong: (Number(localCell) + p) / Number(span)
    };
  }

  function orientBitmapCanonicalU(localFace, localAlong, faceDirection){
    const direction = String(faceDirection || '');
    if(direction === 'increasing' || direction === 'x_increasing' ||
       direction === 'depth_increasing' || direction === 'west_to_east' ||
       direction === 'north_to_south') return localAlong;
    if(direction === 'decreasing' || direction === 'x_decreasing' ||
       direction === 'depth_decreasing' || direction === 'east_to_west' ||
       direction === 'south_to_north') return 1 - localAlong;
    return (localFace === 'east' || localFace === 'north') ? 1 - localAlong : localAlong;
  }

  function resolveFaceDescriptor(asset, localFace){
    if(!asset || !asset.faces) return null;
    const original = asset.faces[localFace];
    if(!original) return null;
    let descriptor = original;
    const seen = Object.create(null);
    while(descriptor && descriptor.reuse){
      if(seen[descriptor.reuse]) return null;
      seen[descriptor.reuse] = true;
      const reused = asset.faces[descriptor.reuse];
      if(!reused) return null;
      descriptor = Object.assign({}, reused, descriptor, {
        slice: descriptor.slice || reused.slice,
        assetRef: descriptor.assetRef || reused.assetRef,
        mirror: descriptor.mirror === true
      });
      delete descriptor.reuse;
    }
    if(!descriptor) return null;
    const referenced = descriptor.assetRef && asset.faceAssets && asset.faceAssets[descriptor.assetRef];
    if(referenced){
      descriptor = Object.assign({}, referenced, descriptor, {
        slice: descriptor.slice || referenced.slice,
        mirror: descriptor.mirror === true
      });
    }
    return { original, resolved: descriptor };
  }

  function normalizedSlice(descriptor){
    const s = descriptor && descriptor.slice;
    if(!s) return null;
    return {
      x: Number(s.x),
      y: Number(s.y),
      width: Number(typeof s.width !== 'undefined' ? s.width : s.w),
      height: Number(typeof s.height !== 'undefined' ? s.height : s.h)
    };
  }

  function atlasInfo(asset){
    const atlas = asset && (asset.atlas || asset.bitmap);
    if(!atlas) return null;
    const state = asset.loadState || atlas.loadState || asset.bitmapLoadState || {};
    const status = typeof state === 'string' ? state : (state.status || state.state || '');
    const image = (typeof state === 'object' && state.image) || atlas.image || asset.image || null;
    return {
      atlas,
      state,
      status,
      image,
      width: Number(atlas.width),
      height: Number(atlas.height),
      identity: atlas.sha256 || atlas.version || asset.version || ''
    };
  }

  function validAssetSchema(asset){
    if(!asset || asset.schema !== 'snc-bitmap-building-asset-v1') return false;
    if(!asset.id || asset.renderMode !== 'importedWholeFaceAsset') return false;
    const footprint = asset.footprint;
    const w = footprint && Number(footprint.widthCells || footprint.wCells || footprint.w);
    const h = footprint && Number(footprint.depthCells || footprint.hCells || footprint.h);
    return Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0 && !!asset.faces;
  }

  function createBitmapCanvas(width, height){
    if(typeof root.OffscreenCanvas !== 'undefined') return new root.OffscreenCanvas(width, height);
    if(root.document && typeof root.document.createElement === 'function'){
      const canvas = root.document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    return null;
  }

  function getBitmapFaceCanvas(asset, localFace){
    if(!validAssetSchema(asset)) return null;
    const entry = resolveFaceDescriptor(asset, localFace);
    const info = atlasInfo(asset);
    if(!entry || !info) return null;
    const descriptor = entry.resolved;
    if(descriptor.mirror === true && descriptor.mirrorSafe !== true && asset.mirrorSafe !== true) return null;
    const slice = normalizedSlice(descriptor);
    if(!slice || !Number.isInteger(slice.x) || !Number.isInteger(slice.y) ||
       !Number.isInteger(slice.width) || !Number.isInteger(slice.height) ||
       slice.x < 0 || slice.y < 0 || slice.width < 1 || slice.height < 1 ||
       slice.x + slice.width > info.width || slice.y + slice.height > info.height) return null;
    if(info.status !== 'loaded' || !info.image || !info.image.complete ||
       info.image.naturalWidth !== info.width || info.image.naturalHeight !== info.height) return null;

    const key = [asset.id, info.identity, descriptor.assetRef || localFace,
      slice.x, slice.y, slice.width, slice.height, descriptor.mirror === true ? 'mirror' : 'plain'].join('::');
    if(faceCache.has(key)) return faceCache.get(key);

    let canvas;
    try {
      canvas = createBitmapCanvas(slice.width, slice.height);
      if(!canvas) return null;
      const context = canvas.getContext('2d');
      if(!context) return null;
      context.imageSmoothingEnabled = false;
      context.drawImage(info.image, slice.x, slice.y, slice.width, slice.height,
        0, 0, slice.width, slice.height);
    } catch(error){
      return null;
    }
    faceCache.set(key, canvas);
    return canvas;
  }

  function drawBitmapFaceColumn(ctx, faceCanvas, sourceX, col, drawStart, sliceH){
    if(!ctx || !faceCanvas || sliceH < 1) return false;
    const sx = Math.max(0, Math.min(faceCanvas.width - 1, Math.floor(sourceX)));
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(faceCanvas, sx, 0, 1, faceCanvas.height, col, drawStart, 1, sliceH);
    } finally {
      ctx.restore();
    }
    return true;
  }

  function drawBitmapFailureColumn(ctx, col, drawStart, sliceH){
    if(!ctx || sliceH < 1) return true;
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(col, drawStart, 1, sliceH);
      if(sliceH > 2){
        ctx.fillStyle = '#240024';
        ctx.fillRect(col, drawStart + ((sliceH / 2) | 0), 1, 1);
      }
    } finally {
      ctx.restore();
    }
    return true;
  }

  function placementFootprint(placement, asset){
    const fp = (asset && asset.footprint) || placement.footprint || placement.gameFootprint || {};
    return {
      width: Number(placement.widthCells || placement.w || fp.widthCells || fp.wCells || fp.w),
      depth: Number(placement.depthCells || placement.h || fp.depthCells || fp.hCells || fp.h)
    };
  }

  function drawWholeFaceBitmapBuildingColumn(hit, placement){
    if(!placement || placement.renderMode !== 'importedWholeFaceAsset') return false;
    const ctx = hit && hit.ctx;
    const col = hit && hit.col;
    const drawStart = hit && hit.drawStart;
    const sliceH = hit && hit.sliceH;
    function fail(){ return drawBitmapFailureColumn(ctx, col, drawStart, sliceH); }

    try {
      const asset = lookupBitmapBuildingAsset(placement.assetId);
      if(!validAssetSchema(asset)) return fail();
      const worldFace = resolveBitmapWorldFace(hit.side, hit.stepX, hit.stepY);
      const localFace = inverseRotateBitmapFace(worldFace, placement.rotation || 0);
      const entry = resolveFaceDescriptor(asset, localFace);
      if(!entry) return fail();
      if(entry.resolved.mirror === true && entry.resolved.mirrorSafe !== true && asset.mirrorSafe !== true) return fail();
      const footprint = placementFootprint(placement, asset);
      if(!(footprint.width > 0) || !(footprint.depth > 0) || !hit.cell) return fail();
      const local = resolveBitmapLocalHit(hit.cell, localFace, placement.rotation || 0,
        Number(hit.wallFraction), footprint.width, footprint.depth);
      if(!Number.isFinite(local.localAlong)) return fail();
      let canonicalU = orientBitmapCanonicalU(localFace, local.localAlong,
        entry.resolved.sourceUDirection || entry.resolved.sourceLeftToRightWorldDirection);
      if(entry.resolved.mirror === true) canonicalU = 1 - canonicalU;
      canonicalU = Math.max(0, Math.min(1 - Number.EPSILON, canonicalU));
      const face = getBitmapFaceCanvas(asset, localFace);
      if(!face) return fail();
      const sourceX = Math.max(0, Math.min(face.width - 1, Math.floor(canonicalU * face.width)));
      try {
        if(!drawBitmapFaceColumn(ctx, face, sourceX, col, drawStart, sliceH)) return fail();
      } catch(error){
        return fail();
      }
      return true;
    } catch(error){
      return fail();
    }
  }

  root.lookupBitmapBuildingAsset = lookupBitmapBuildingAsset;
  root.resolveBitmapWorldFace = resolveBitmapWorldFace;
  root.inverseRotateBitmapFace = inverseRotateBitmapFace;
  root.resolveBitmapLocalHit = resolveBitmapLocalHit;
  root.orientBitmapCanonicalU = orientBitmapCanonicalU;
  root.getBitmapFaceCanvas = getBitmapFaceCanvas;
  root.drawBitmapFaceColumn = drawBitmapFaceColumn;
  root.drawBitmapFailureColumn = drawBitmapFailureColumn;
  root.drawWholeFaceBitmapBuildingColumn = drawWholeFaceBitmapBuildingColumn;
})(typeof globalThis !== 'undefined' ? globalThis : this);
