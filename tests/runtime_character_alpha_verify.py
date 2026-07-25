#!/usr/bin/env python3
"""Guard runtime-sized gallery cutouts against light-matte edge ringing."""
import json
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'authoring', 'characters', 'character-isolation-v1.json')

with open(MANIFEST, encoding='utf-8') as handle:
    manifest = json.load(handle)

results = []
for asset in manifest['assets']:
    if asset['status'] != 'candidate':
        continue
    path = os.path.join(ROOT, asset['runtimePath'])
    with Image.open(path).convert('RGBA') as image:
        partial = 0
        near_white_partial = 0
        for red, green, blue, alpha in image.get_flattened_data():
            if 0 < alpha < 255:
                partial += 1
                if red >= 235 and green >= 235 and blue >= 235:
                    near_white_partial += 1
    if near_white_partial > 1:
        raise AssertionError(f"{asset['assetId']}: {near_white_partial} near-white partial-alpha pixels")
    results.append({
        'assetId': asset['assetId'],
        'partialAlphaPixels': partial,
        'nearWhitePartialAlphaPixels': near_white_partial
    })

print(json.dumps({'pass': True, 'assets': results}, indent=2))
