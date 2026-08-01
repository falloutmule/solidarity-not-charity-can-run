#!/usr/bin/env python3
"""Verify World 1 ground decals preserve supplied soft alpha."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'authoring' / 'paths' / 'game-ready' / 'runtime-path-assets.json'

def alpha(path):
    with Image.open(path) as image:
        assert image.mode == 'RGBA', f'{path}: expected RGBA'
        rgba = image.copy()
    h = rgba.getchannel('A').histogram()
    hidden = sum(1 for red, green, blue, opacity in rgba.get_flattened_data() if opacity == 0 and (red or green or blue))
    assert hidden == 0, f'{path}: alpha-zero RGB must be normalized'
    return {'zero': h[0], 'partial': sum(h[1:255]), 'opaque': h[255]}

manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
assert manifest['schema'] == 'snc-runtime-path-assets-v1' and len(manifest['assets']) == 6
assert hashlib.sha256((ROOT / manifest['package']['sourceManifest']).read_bytes()).hexdigest() == manifest['package']['sourceManifestSha256']
rows = []
for asset in manifest['assets']:
    source, runtime = ROOT / asset['sourcePath'], ROOT / asset['runtimePath']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == asset['sourceSha256'], f"{asset['assetId']}: source hash drift"
    source_alpha, runtime_alpha = alpha(source), alpha(runtime)
    assert source_alpha['zero'] > runtime_alpha['zero'] > 0, f"{asset['assetId']}: only the export margin may be removed"
    assert source_alpha['partial'] == runtime_alpha['partial'] > 0, f"{asset['assetId']}: soft edge alpha changed"
    assert source_alpha['opaque'] == runtime_alpha['opaque'] > 0, f"{asset['assetId']}: visible path art changed"
    assert hashlib.sha256(runtime.read_bytes()).hexdigest() == asset['runtimeSha256'], f"{asset['assetId']}: runtime hash drift"
    rows.append({'assetId': asset['assetId'], 'sourceAlpha': source_alpha, 'runtimeAlpha': runtime_alpha})
print(json.dumps({'pass': True, 'assets': rows}, indent=2))
