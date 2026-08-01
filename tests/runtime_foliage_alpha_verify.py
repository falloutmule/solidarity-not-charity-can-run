#!/usr/bin/env python3
"""Verify World 1 foliage preserves its supplied soft-alpha silhouette."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'authoring' / 'foliage' / 'game-ready' / 'runtime-foliage-assets.json'


def inspect(path):
    with Image.open(path) as image:
        if image.mode != 'RGBA':
            raise AssertionError(f'{path}: expected RGBA, got {image.mode}')
        rgba = image.copy()
    histogram = rgba.getchannel('A').histogram()
    hidden = sum(1 for red, green, blue, opacity in rgba.get_flattened_data() if opacity == 0 and (red or green or blue))
    if hidden:
        raise AssertionError(f'{path}: {hidden} nonzero RGB values beneath alpha zero')
    return {'zero': histogram[0], 'partial': sum(histogram[1:255]), 'opaque': histogram[255]}


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
assert manifest['schema'] == 'snc-runtime-foliage-assets-v1'
assert len(manifest['assets']) == 7
assert hashlib.sha256((ROOT / manifest['package']['sourceManifest']).read_bytes()).hexdigest() == manifest['package']['sourceManifestSha256'], 'source package manifest drift'
results = []
for asset in manifest['assets']:
    source = ROOT / asset['sourcePath']
    runtime = ROOT / asset['runtimePath']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == asset['sourceSha256'], f"{asset['assetId']}: source hash drift"
    source_alpha = inspect(source)
    runtime_alpha = inspect(runtime)
    assert source_alpha['zero'] > runtime_alpha['zero'] > 0, f"{asset['assetId']}: only the supplied export margin may be cropped"
    assert source_alpha['partial'] == runtime_alpha['partial'] > 0, f"{asset['assetId']}: soft alpha must survive runtime processing"
    assert source_alpha['opaque'] == runtime_alpha['opaque'] > 0, f"{asset['assetId']}: visible artwork must be unchanged"
    assert hashlib.sha256(runtime.read_bytes()).hexdigest() == asset['runtimeSha256'], f"{asset['assetId']}: runtime hash drift"
    assert asset['runtimeAlphaBounds'] == {'x': 0, 'y': 0, 'w': asset['runtimeSize']['width'], 'h': asset['runtimeSize']['height']}, f"{asset['assetId']}: runtime alpha bounds must be tightly cropped"
    results.append({'assetId': asset['assetId'], 'sourceAlpha': source_alpha, 'runtimeAlpha': runtime_alpha})

print(json.dumps({'pass': True, 'assets': results}, indent=2))
