#!/usr/bin/env python3
"""Verify the source-master and optimized-runtime alpha contracts for World 1 signs."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'authoring' / 'signs' / 'game-ready' / 'runtime-sign-assets.json'


def inspect(path, require_zero_rgb):
    with Image.open(path) as image:
        if image.mode != 'RGBA':
            raise AssertionError(f'{path}: expected RGBA, got {image.mode}')
        rgba = image.copy()
    histogram = rgba.getchannel('A').histogram()
    if histogram[0] == 0 or sum(histogram[1:255]) == 0 or histogram[255] == 0:
        raise AssertionError(f'{path}: must retain transparent, partial, and opaque alpha')
    if require_zero_rgb:
        hidden = sum(1 for red, green, blue, opacity in rgba.get_flattened_data() if opacity == 0 and (red or green or blue))
        if hidden:
            raise AssertionError(f'{path}: {hidden} nonzero RGB values beneath alpha zero')
    return {'zero': histogram[0], 'partial': sum(histogram[1:255]), 'opaque': histogram[255]}


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
assert manifest['schema'] == 'snc-runtime-sign-assets-v1'
assert len(manifest['assets']) == 5
assert hashlib.sha256((ROOT / manifest['package']['sourceManifest']).read_bytes()).hexdigest() == manifest['package']['sourceManifestSha256'], 'source package manifest drift'
seen = set()
results = []
for asset in manifest['assets']:
    assert asset['assetId'] not in seen
    seen.add(asset['assetId'])
    source = ROOT / asset['sourcePath']
    runtime = ROOT / asset['runtimePath']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == asset['sourceSha256'], f"{asset['assetId']}: source hash drift"
    source_alpha = inspect(source, False)
    runtime_alpha = inspect(runtime, True)
    assert hashlib.sha256(runtime.read_bytes()).hexdigest() == asset['runtimeSha256'], f"{asset['assetId']}: runtime hash drift"
    assert asset['runtimeSize']['width'] < Image.open(source).width and asset['runtimeSize']['height'] < Image.open(source).height, f"{asset['assetId']}: transparent source margin was not cropped"
    assert asset['runtimeAlphaBounds'] == {'x': 0, 'y': 0, 'w': asset['runtimeSize']['width'], 'h': asset['runtimeSize']['height']}, f"{asset['assetId']}: runtime crop must be tightly grounded"
    results.append({'assetId': asset['assetId'], 'sourceAlpha': source_alpha, 'runtimeAlpha': runtime_alpha})

print(json.dumps({'pass': True, 'assets': results}, indent=2))
