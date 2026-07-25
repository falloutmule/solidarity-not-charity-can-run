#!/usr/bin/env python3
"""Deterministic, non-generative candidate cutouts from SNC concept sheets."""
import argparse, hashlib, json, os, sys
from collections import deque
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(ROOT, 'authoring', 'characters', 'character-isolation-v1.json')

def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def background_mask(image, threshold=38, neighbor=24, manual_seeds=()):
    """Flood-fill only border-connected pale background; never paints/inpaints."""
    rgb = image.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    samples = []
    for x in range(w):
        samples.extend((px[x, 0], px[x, h - 1]))
    for y in range(h):
        samples.extend((px[0, y], px[w - 1, y]))
    bg = tuple(sorted(c[i] for c in samples)[len(samples) // 2] for i in range(3))
    def dist(a, b):
        return max(abs(a[0]-b[0]), abs(a[1]-b[1]), abs(a[2]-b[2]))
    mask = Image.new('L', (w, h), 255)
    visited = bytearray(w * h)
    queue = deque()
    def seed(x, y):
        n = y * w + x
        if not visited[n] and dist(px[x, y], bg) <= threshold:
            visited[n] = 1; queue.append((x, y))
    for x in range(w): seed(x, 0); seed(x, h - 1)
    for y in range(h): seed(0, y); seed(w - 1, y)
    for point in manual_seeds:
        if not isinstance(point, (list, tuple)) or len(point) != 2:
            raise ValueError('manual background seeds must be [x, y] pairs')
        x, y = int(point[0]), int(point[1])
        if 0 <= x < w and 0 <= y < h:
            seed(x, y)
    while queue:
        x, y = queue.popleft()
        mask.putpixel((x, y), 0)
        current = px[x, y]
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h: continue
            n = ny * w + nx
            if visited[n]: continue
            candidate = px[nx, ny]
            if dist(candidate, bg) <= threshold and dist(candidate, current) <= neighbor:
                visited[n] = 1; queue.append((nx, ny))
    return mask

def alpha_bounds(mask):
    bbox = mask.getbbox()
    if not bbox: return None
    return {'x': bbox[0], 'y': bbox[1], 'w': bbox[2]-bbox[0], 'h': bbox[3]-bbox[1]}

def build_candidate(source, entry, write):
    box = tuple(entry['bounds'])
    image = source.crop(box)
    mask = background_mask(image, manual_seeds=entry.get('manualBackgroundSeeds', ()))
    original_mask = mask.copy()
    clear_below = entry.get('clearBelowY')
    if clear_below is not None:
        clear_below = int(clear_below)
        if clear_below < 0 or clear_below > image.height:
            raise ValueError(f"{entry['assetId']}: clearBelowY outside the candidate crop")
        for y in range(clear_below, image.height):
            for x in range(image.width):
                mask.putpixel((x, y), 0)
    foreground_polygons = entry.get('manualForegroundPolygons', ())
    if foreground_polygons:
        restore = Image.new('L', image.size, 0)
        draw = ImageDraw.Draw(restore)
        for polygon in foreground_polygons:
            if not isinstance(polygon, list) or len(polygon) < 3:
                raise ValueError(f"{entry['assetId']}: manual foreground polygons need at least three points")
            points = []
            for point in polygon:
                if not isinstance(point, list) or len(point) != 2:
                    raise ValueError(f"{entry['assetId']}: manual foreground points must be [x, y] pairs")
                points.append((int(point[0]), int(point[1])))
            draw.polygon(points, fill=255)
        mask.paste(original_mask, mask=restore)
    rgba = image.convert('RGBA')
    rgba.putalpha(mask)
    bounds = alpha_bounds(mask)
    if not bounds or bounds['w'] < 12 or bounds['h'] < 32:
        raise ValueError(f"{entry['assetId']}: no plausible foreground alpha bounds")
    output = os.path.join(ROOT, entry['outputPath'])
    if write:
        os.makedirs(os.path.dirname(output), exist_ok=True)
        rgba.save(output, 'PNG', optimize=False)
    if not os.path.exists(output):
        raise ValueError(f"{entry['assetId']}: missing generated output; run --write")
    with Image.open(output) as result:
        if result.mode != 'RGBA': raise ValueError(f"{entry['assetId']}: output must be RGBA")
        alpha = result.getchannel('A')
        histogram = alpha.histogram()
        if histogram[0] == 0 or histogram[255] == 0:
            raise ValueError(f"{entry['assetId']}: requires both transparent and opaque pixels")
        result_bounds = alpha_bounds(alpha)
    entry['outputSha256'] = sha256(output)
    entry['alphaBounds'] = result_bounds
    entry['alphaHistogram'] = {'zero': histogram[0], 'partial': sum(histogram[1:255]), 'opaque': histogram[255]}
    runtime_path = os.path.join(ROOT, entry['runtimePath'])
    if write:
        with Image.open(output).convert('RGBA') as original:
            max_height = int(entry.get('runtimeMaxHeight', 192))
            scale = min(1.0, max_height / original.height)
            size = (max(1, round(original.width * scale)), max(1, round(original.height * scale)))
            # The candidate mask is intentionally binary. BOX performs area
            # downsampling without LANCZOS's light-matte ringing in partial
            # edge pixels, so the normal billboard path receives clean RGBA.
            runtime = original.resize(size, Image.Resampling.BOX) if size != original.size else original.copy()
            os.makedirs(os.path.dirname(runtime_path), exist_ok=True)
            runtime.save(runtime_path, 'PNG', optimize=False)
    if not os.path.exists(runtime_path):
        raise ValueError(f"{entry['assetId']}: missing runtime output; run --write")
    with Image.open(runtime_path).convert('RGBA') as runtime:
        runtime_alpha = runtime.getchannel('A')
        runtime_histogram = runtime_alpha.histogram()
        entry['runtimeSha256'] = sha256(runtime_path)
        entry['runtimeSize'] = {'width': runtime.width, 'height': runtime.height}
        entry['runtimeAlphaBounds'] = alpha_bounds(runtime_alpha)
        entry['runtimeAlphaHistogram'] = {'zero': runtime_histogram[0], 'partial': sum(runtime_histogram[1:255]), 'opaque': runtime_histogram[255]}
    return output

def contact_sheet(entries):
    rows = [e for e in entries if e['status'] == 'candidate']
    thumbs = []
    for entry in rows:
        output = os.path.join(ROOT, entry['outputPath'])
        with Image.open(output).convert('RGBA') as image:
            image.thumbnail((120, 160))
            thumbs.append((entry['assetId'], image.copy()))
    w, h, cellw, cellh = 720, 420, 180, 210
    out = Image.new('RGBA', (w, h), '#e8c94b')
    draw = ImageDraw.Draw(out)
    for i, (asset_id, image) in enumerate(thumbs):
        x = (i % 4) * cellw + (cellw - image.width) // 2
        y = (i // 4) * cellh + 8
        out.alpha_composite(image, (x, y))
        draw.text(((i % 4) * cellw + 6, (i // 4) * cellh + 174), asset_id.replace('npc_', '')[:25], fill='#17130f')
    result_dir = os.path.join(ROOT, 'test-results', 'runtime-asset-gallery', 'rag-020')
    os.makedirs(result_dir, exist_ok=True)
    out.convert('RGB').save(os.path.join(result_dir, 'isolation-contact-sheet.png'), 'PNG')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    with open(MANIFEST_PATH, encoding='utf-8') as f: manifest = json.load(f)
    if manifest.get('schema') != 'snc-character-isolation-v1': raise ValueError('unexpected manifest schema')
    ids = set()
    sources = {}
    for name, source in manifest['sources'].items():
        path = os.path.join(ROOT, source['path'])
        if sha256(path) != source['sha256']: raise ValueError(f"source hash drift: {name}")
        sources[name] = Image.open(path)
    try:
        for entry in manifest['assets']:
            if entry['assetId'] in ids: raise ValueError('duplicate asset ID')
            ids.add(entry['assetId'])
            if entry['status'] == 'candidate': build_candidate(sources[entry['source']], entry, args.write)
            elif entry['status'] != 'blocked': raise ValueError(f"{entry['assetId']}: invalid status")
        if args.write:
            with open(MANIFEST_PATH, 'w', encoding='utf-8', newline='\n') as f:
                json.dump(manifest, f, indent=2); f.write('\n')
            contact_sheet(manifest['assets'])
        if args.check:
            missing = [e['assetId'] for e in manifest['assets'] if e['status'] == 'candidate' and not e.get('outputSha256')]
            if missing: raise ValueError('candidate outputs missing hashes: ' + ', '.join(missing))
        print(json.dumps({'pass': True, 'candidates': sum(e['status']=='candidate' for e in manifest['assets']), 'blocked': sum(e['status']=='blocked' for e in manifest['assets'])}, indent=2))
    finally:
        for image in sources.values(): image.close()

if __name__ == '__main__':
    try: main()
    except Exception as error:
        print('character-isolation:', error, file=sys.stderr); raise
