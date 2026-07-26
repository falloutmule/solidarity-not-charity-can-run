#!/usr/bin/env python3
"""Deterministically compile approved character sources into runtime PNGs and one registry."""
import argparse
import base64
import hashlib
import io
import json
import os
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / 'authoring' / 'characters' / 'character-assets-v2.json'
OUTPUT_PATH = ROOT / 'src' / 'imported-handoff-assets' / 'runtime-character-gallery-assets.js'
MAX_HEIGHT = 192
PAD = 3


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def png_bytes(image):
    output = io.BytesIO()
    image.save(output, format='PNG', optimize=False, compress_level=9)
    return output.getvalue()


def inspect(image):
    rgba = image.convert('RGBA')
    alpha = rgba.getchannel('A')
    histogram = alpha.histogram()
    box = alpha.getbbox()
    if box is None:
        raise ValueError('runtime image has no opaque pixels')
    left, top, right, bottom = box
    hidden_rgb = sum(1 for red, green, blue, opacity in rgba.get_flattened_data() if opacity == 0 and (red or green or blue))
    if hidden_rgb:
        raise ValueError(f'runtime image has {hidden_rgb} nonzero RGB pixels below alpha zero')
    return {
        'size': {'width': rgba.width, 'height': rgba.height},
        'alphaBounds': {'x': left, 'y': top, 'w': right - left, 'h': bottom - top},
        'alphaHistogram': {'zero': histogram[0], 'partial': sum(histogram[1:255]), 'opaque': histogram[255]},
    }


def premultiplied_resize(source):
    rgba = source.convert('RGBA')
    alpha = rgba.getchannel('A')
    box = alpha.getbbox()
    if box is None:
        raise ValueError('source has no nontransparent pixels')
    left, top, right, bottom = box
    crop = rgba.crop((left, top, right, bottom))
    target_inner_height = min(MAX_HEIGHT - PAD * 2, crop.height)
    target_inner_width = max(1, round(crop.width * target_inner_height / crop.height))
    output_size = (target_inner_width + PAD * 2, target_inner_height + PAD * 2)
    premultiplied = Image.new('RGBA', crop.size)
    source_pixels = crop.load()
    premultiplied_pixels = premultiplied.load()
    for y in range(crop.height):
        for x in range(crop.width):
            red, green, blue, opacity = source_pixels[x, y]
            premultiplied_pixels[x, y] = (
                (red * opacity + 127) // 255,
                (green * opacity + 127) // 255,
                (blue * opacity + 127) // 255,
                opacity,
            )
    resized = premultiplied.resize((target_inner_width, target_inner_height), Image.Resampling.LANCZOS)
    result = Image.new('RGBA', output_size, (0, 0, 0, 0))
    result_pixels = result.load()
    resized_pixels = resized.load()
    for y in range(target_inner_height):
        for x in range(target_inner_width):
            red, green, blue, opacity = resized_pixels[x, y]
            if opacity == 0:
                result_pixels[x + PAD, y + PAD] = (0, 0, 0, 0)
            else:
                result_pixels[x + PAD, y + PAD] = (
                    min(255, (red * 255 + opacity // 2) // opacity),
                    min(255, (green * 255 + opacity // 2) // opacity),
                    min(255, (blue * 255 + opacity // 2) // opacity),
                    opacity,
                )
    return result


def load_manifest():
    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    if manifest.get('schema') != 'snc-character-assets-v2':
        raise ValueError('unexpected character asset manifest schema')
    if len(manifest.get('assets', [])) != 16:
        raise ValueError('approved cast requires exactly sixteen assets')
    return manifest


def build(write_runtime):
    manifest = load_manifest()
    records = []
    runtime_payloads = set()
    seen_ids = set()
    changed_manifest = False
    for asset in manifest['assets']:
        asset_id = asset['assetId']
        if asset_id in seen_ids:
            raise ValueError(f'duplicate asset ID: {asset_id}')
        seen_ids.add(asset_id)
        source_path = ROOT / asset['sourcePath']
        source_bytes = source_path.read_bytes()
        if sha256(source_bytes) != asset['sourceSha256']:
            raise ValueError(f'{asset_id}: source PNG hash drift')
        with Image.open(io.BytesIO(source_bytes)) as image:
            runtime_image = premultiplied_resize(image)
        runtime_bytes = png_bytes(runtime_image)
        runtime_sha = sha256(runtime_bytes)
        if runtime_sha in runtime_payloads:
            raise ValueError(f'{asset_id}: duplicate compiled runtime payload')
        runtime_payloads.add(runtime_sha)
        runtime_details = inspect(runtime_image)
        if runtime_details['alphaHistogram']['partial'] == 0:
            raise ValueError(f'{asset_id}: runtime derivative lost partial alpha')
        runtime_path = ROOT / asset['runtimePath']
        if write_runtime:
            runtime_path.parent.mkdir(parents=True, exist_ok=True)
            runtime_path.write_bytes(runtime_bytes)
        elif not runtime_path.is_file() or runtime_path.read_bytes() != runtime_bytes:
            raise ValueError(f'{asset_id}: runtime derivative drift; run characters:build-runtime')
        expected_fields = {
            'runtimeSha256': runtime_sha,
            'runtimeSize': runtime_details['size'],
            'runtimeAlphaBounds': runtime_details['alphaBounds'],
            'runtimeAlphaHistogram': runtime_details['alphaHistogram'],
        }
        if any(asset.get(key) != value for key, value in expected_fields.items()):
            asset.update(expected_fields)
            changed_manifest = True
        records.append({
            'id': asset_id,
            'kind': 'npc',
            'group': asset['group'],
            'renderMode': asset['renderMode'],
            'collision': asset['collision'],
            'approvalStatus': asset['reviewStatus'],
            'sourceRef': f"{asset['package']}:{asset['packageFile']}",
            'anchor': asset['anchor'],
            'heightScale': asset['displayHeightCells'],
            'alphaBounds': runtime_details['alphaBounds'],
            'width': runtime_details['size']['width'],
            'height': runtime_details['size']['height'],
            'sha256': runtime_sha,
            'dataUri': 'data:image/png;base64,' + base64.b64encode(runtime_bytes).decode('ascii'),
        })
    records.sort(key=lambda record: record['id'])
    if len(records) != 16:
        raise ValueError('runtime registry must contain exactly sixteen approved records')
    module_text = '\n'.join([
        '/* GENERATED by tools/build-runtime-character-assets.py; source: authoring/characters/character-assets-v2.json. DO NOT EDIT. */',
        '(function(root){',
        "  'use strict';",
        '  const entries = ' + json.dumps(records, indent=2, separators=(',', ': ')) + ';',
        '  const registry = root.SNC_RUNTIME_ASSET_REGISTRY || Object.create(null);',
        '  for(const entry of entries){',
        '    if(registry[entry.id]) throw new Error("duplicate SNC runtime asset: " + entry.id);',
        '    const image = new Image();',
        '    image.decoding = "async";',
        '    image.src = entry.dataUri;',
        '    image.__sncAssetId = entry.id;',
        '    image.__sncFootY = entry.height;',
        '    registry[entry.id] = Object.freeze(Object.assign({}, entry, { image }));',
        '  }',
        '  root.SNC_RUNTIME_ASSET_REGISTRY = Object.freeze(registry);',
        '})(globalThis);',
        '',
    ])
    if write_runtime:
        if changed_manifest:
            MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
        OUTPUT_PATH.write_text(module_text, encoding='utf-8')
    elif changed_manifest:
        raise ValueError('runtime metadata drift; run characters:build-runtime')
    elif not OUTPUT_PATH.is_file() or OUTPUT_PATH.read_text(encoding='utf-8') != module_text:
        raise ValueError('generated runtime registry drift; run characters:build-runtime')
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    records = build(args.write)
    print(json.dumps({'pass': True, 'assets': len(records), 'uniquePayloads': len(records), 'maxHeight': MAX_HEIGHT}, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'runtime-character-assets: {error}', file=sys.stderr)
        sys.exit(1)
