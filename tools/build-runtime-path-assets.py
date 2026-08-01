#!/usr/bin/env python3
"""Build deterministic soft-alpha ground-path assets for World 1."""
import argparse
import base64
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / 'authoring' / 'paths' / 'game-ready' / 'runtime-path-assets.json'
OUTPUT_PATH = ROOT / 'src' / 'imported-handoff-assets' / 'runtime-path-assets.js'


def sha256(data): return hashlib.sha256(data).hexdigest()


def png_bytes(image):
    output = io.BytesIO()
    image.save(output, format='PNG', optimize=False, compress_level=9)
    return output.getvalue()


def inspect(image):
    rgba = image.convert('RGBA')
    histogram = rgba.getchannel('A').histogram()
    box = rgba.getchannel('A').getbbox()
    if box is None: raise ValueError('runtime image has no visible pixels')
    hidden = sum(1 for red, green, blue, opacity in rgba.get_flattened_data() if opacity == 0 and (red or green or blue))
    if hidden: raise ValueError(f'runtime image has {hidden} RGB values beneath alpha zero')
    left, top, right, bottom = box
    return {'size': {'width': rgba.width, 'height': rgba.height}, 'alphaBounds': {'x': left, 'y': top, 'w': right-left, 'h': bottom-top}, 'alphaHistogram': {'zero': histogram[0], 'partial': sum(histogram[1:255]), 'opaque': histogram[255]}}


def grade_warm_dirt(rgba):
    """Keep supplied alpha while compressing path color into a warm, readable range."""
    pixels = rgba.load()
    darkest, lightest = (122, 90, 52), (178, 138, 82)
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, opacity = pixels[x, y]
            if opacity == 0:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            # The supplied texture has opaque black detail.  Preserve its luminance
            # variation, but map it to a constrained warm-brown palette so it reads
            # as compacted dirt rather than floor holes at nearest-neighbor scale.
            luminance = (299 * red + 587 * green + 114 * blue) / 255000
            pixels[x, y] = tuple(round(low + (high - low) * luminance) for low, high in zip(darkest, lightest)) + (opacity,)
    return rgba


def crop_runtime(source):
    rgba = source.convert('RGBA')
    box = rgba.getchannel('A').getbbox()
    if box is None: raise ValueError('source has no visible pixels')
    cropped = rgba.crop(box)
    return grade_warm_dirt(cropped)


def load_manifest():
    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    if manifest.get('schema') != 'snc-runtime-path-assets-v1': raise ValueError('unexpected path manifest schema')
    package = manifest.get('package', {})
    source_manifest = ROOT / package.get('sourceManifest', '')
    if not source_manifest.is_file() or sha256(source_manifest.read_bytes()) != package.get('sourceManifestSha256'): raise ValueError('source package manifest hash drift')
    assets = manifest.get('assets', [])
    if not assets or len({asset.get('assetId') for asset in assets}) != len(assets): raise ValueError('path asset IDs must be unique')
    return manifest


def build(write_runtime):
    manifest = load_manifest(); package = manifest['package']; records = []; changed_manifest = False
    for asset in sorted(manifest['assets'], key=lambda row: row['assetId']):
        source_path = ROOT / asset['sourcePath']; source_bytes = source_path.read_bytes()
        if sha256(source_bytes) != asset['sourceSha256']: raise ValueError(f"{asset['assetId']}: source PNG hash drift")
        with Image.open(io.BytesIO(source_bytes)) as image: runtime_image = crop_runtime(image)
        runtime_bytes = png_bytes(runtime_image); details = inspect(runtime_image)
        if details['alphaHistogram']['partial'] == 0: raise ValueError(f"{asset['assetId']}: path art must retain soft alpha")
        runtime_path = ROOT / asset['runtimePath']
        if write_runtime:
            runtime_path.parent.mkdir(parents=True, exist_ok=True); runtime_path.write_bytes(runtime_bytes)
        elif not runtime_path.is_file() or runtime_path.read_bytes() != runtime_bytes:
            raise ValueError(f"{asset['assetId']}: runtime derivative drift; run paths:build-runtime")
        expected = {'runtimeSha256': sha256(runtime_bytes), 'runtimeSize': details['size'], 'runtimeAlphaBounds': details['alphaBounds'], 'runtimeAlphaHistogram': details['alphaHistogram']}
        if any(asset.get(key) != value for key, value in expected.items()): asset.update(expected); changed_manifest = True
        records.append({'id': asset['assetId'], 'kind': 'ground-decal', 'renderMode': 'ground-plane-decal', 'sourceRef': f"{package['archiveName']}:{asset['sourceFile']}", 'anchor': {'x': 0.5, 'y': 0.5}, 'width': details['size']['width'], 'height': details['size']['height'], 'alphaBounds': details['alphaBounds'], 'alphaHistogram': details['alphaHistogram'], 'sha256': expected['runtimeSha256'], 'dataUri': 'data:image/png;base64,' + base64.b64encode(runtime_bytes).decode('ascii')})
    if write_runtime and changed_manifest: MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    module_text = '\n'.join(['/* GENERATED by tools/build-runtime-path-assets.py; source: authoring/paths/game-ready/runtime-path-assets.json. DO NOT EDIT. */', '(function(root){', "  'use strict';", '  const entries = ' + json.dumps(records, indent=2, separators=(',', ': ')) + ';', '  const registry = Object.create(null);', '  for(const entry of entries){', '    const image = new Image();', '    image.decoding = "async";', '    image.src = entry.dataUri;', '    image.__sncAssetId = entry.id;', '    registry[entry.id] = Object.freeze(Object.assign({}, entry, { image }));', '  }', '  root.SNC_RUNTIME_PATH_ASSET_REGISTRY = Object.freeze(registry);', '})(globalThis);', ''])
    if write_runtime: OUTPUT_PATH.write_text(module_text, encoding='utf-8')
    elif changed_manifest or not OUTPUT_PATH.is_file() or OUTPUT_PATH.read_text(encoding='utf-8') != module_text: raise ValueError('generated path registry drift; run paths:build-runtime')
    return records


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); mode = parser.add_mutually_exclusive_group(required=True); mode.add_argument('--write', action='store_true'); mode.add_argument('--check', action='store_true'); args = parser.parse_args()
    try:
        records = build(args.write); print(json.dumps({'pass': True, 'assets': len(records), 'runtimeBytes': sum(record['width']*record['height']*4 for record in records)}, indent=2))
    except Exception as error:
        print(f'runtime-path-assets: {error}', file=sys.stderr); sys.exit(1)
