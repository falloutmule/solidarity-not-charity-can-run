#!/usr/bin/env python3
"""Render reproducible contact sheets and payload evidence for the approved gallery cast."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / 'authoring' / 'characters' / 'character-assets-v2.json'
BACKGROUNDS = {
    'black': (0, 0, 0, 255),
    'white': (255, 255, 255, 255),
    'yellow': (255, 238, 0, 255),
    'asphalt': (48, 51, 58, 255),
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def contact_sheet(assets, source_key, background, output):
    columns, cell_width, cell_height = 4, 260, 240
    rows = (len(assets) + columns - 1) // columns
    sheet = Image.new('RGBA', (columns * cell_width, rows * cell_height), background)
    draw = ImageDraw.Draw(sheet)
    for index, asset in enumerate(assets):
        column, row = index % columns, index // columns
        x0, y0 = column * cell_width, row * cell_height
        draw.rectangle((x0, y0, x0 + cell_width - 1, y0 + cell_height - 1), outline=(83, 190, 220, 255))
        image = Image.open(ROOT / asset[source_key]).convert('RGBA')
        image.thumbnail((cell_width - 16, cell_height - 42), Image.Resampling.LANCZOS)
        sheet.alpha_composite(image, (x0 + (cell_width - image.width) // 2, y0 + 6))
        draw.rectangle((x0, y0 + cell_height - 34, x0 + cell_width - 1, y0 + cell_height - 1), fill=(8, 10, 12, 220))
        draw.text((x0 + 6, y0 + cell_height - 29), asset['assetId'], fill=(220, 240, 255, 255))
        draw.text((x0 + 6, y0 + cell_height - 15), f"{asset['group']} · display {asset['displayHeightScale']:.2f} / class {asset['worldHeightClass']}", fill=(240, 215, 160, 255))
    sheet.convert('RGB').save(output, format='PNG', optimize=False, compress_level=9)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, help='ignored evidence directory, relative to repository root or absolute')
    args = parser.parse_args()
    output = Path(args.output)
    if not output.is_absolute():
        output = ROOT / output
    if ROOT not in output.parents:
        raise ValueError('evidence output must stay inside the repository')
    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    if manifest.get('schema') != 'snc-character-assets-v2' or len(manifest.get('assets', [])) != 16:
        raise ValueError('expected sixteen approved v2 assets')
    output.mkdir(parents=True, exist_ok=True)
    for name, background in BACKGROUNDS.items():
        contact_sheet(manifest['assets'], 'sourcePath', background, output / f'source-{name}.png')
        contact_sheet(manifest['assets'], 'runtimePath', background, output / f'runtime-{name}.png')
    report = {'assets': [
        {
            'assetId': asset['assetId'],
            'group': asset['group'],
            'displayHeightScale': asset['displayHeightScale'],
            'worldHeightClass': asset['worldHeightClass'],
            'sourceBytes': (ROOT / asset['sourcePath']).stat().st_size,
            'runtimeBytes': (ROOT / asset['runtimePath']).stat().st_size,
            'sourceSha256': sha256(ROOT / asset['sourcePath']),
            'runtimeSha256': sha256(ROOT / asset['runtimePath']),
        }
        for asset in manifest['assets']
    ]}
    report['sourceBytes'] = sum(record['sourceBytes'] for record in report['assets'])
    report['runtimeBytes'] = sum(record['runtimeBytes'] for record in report['assets'])
    report['uniqueRuntimePayloads'] = len({record['runtimeSha256'] for record in report['assets']})
    (output / 'payload-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'pass': True, 'assets': 16, 'uniqueRuntimePayloads': report['uniqueRuntimePayloads'], 'output': str(output)}, indent=2))


if __name__ == '__main__':
    main()
