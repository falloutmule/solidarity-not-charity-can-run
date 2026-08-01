#!/usr/bin/env python3
"""Verify v2 source and runtime character alpha contracts without altering source art."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'authoring' / 'characters' / 'character-assets-v2.json'


def inspect(path):
    with Image.open(path) as image:
        if image.mode != 'RGBA':
            raise AssertionError(f'{path}: expected RGBA, got {image.mode}')
        rgba = image.copy()
    alpha = rgba.getchannel('A')
    histogram = alpha.histogram()
    box = alpha.getbbox()
    if box is None or histogram[0] == 0 or sum(histogram[1:255]) == 0 or histogram[255] == 0:
        raise AssertionError(f'{path}: must retain zero, partial, and opaque alpha')
    hidden = sum(1 for red, green, blue, opacity in rgba.get_flattened_data() if opacity == 0 and (red or green or blue))
    if hidden:
        raise AssertionError(f'{path}: {hidden} RGB values are visible beneath alpha zero')
    return {'zero': histogram[0], 'partial': sum(histogram[1:255]), 'opaque': histogram[255]}


manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
assert manifest['schema'] == 'snc-character-assets-v2'
assert len(manifest['assets']) == 16
results = []
for asset in manifest['assets']:
    source_path = ROOT / asset['sourcePath']
    runtime_path = ROOT / asset['runtimePath']
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    assert source_hash == asset['sourceSha256'], f"{asset['assetId']}: source hash drift"
    source_histogram = inspect(source_path)
    runtime_histogram = inspect(runtime_path)
    assert runtime_path.stat().st_size > 0
    assert asset['runtimeSha256'] == hashlib.sha256(runtime_path.read_bytes()).hexdigest(), f"{asset['assetId']}: runtime hash drift"
    assert asset['runtimeSize']['height'] <= 192, f"{asset['assetId']}: exceeds runtime height limit"
    results.append({'assetId': asset['assetId'], 'source': source_histogram, 'runtime': runtime_histogram})

print(json.dumps({'pass': True, 'assets': results}, indent=2))
