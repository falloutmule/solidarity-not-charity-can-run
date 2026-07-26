#!/usr/bin/env python3
"""Validate and atomically install the approved SNC gallery character packages."""
import argparse
import hashlib
import io
import json
import os
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHARACTER_ROOT = ROOT / 'authoring' / 'characters'
MANIFEST_PATH = CHARACTER_ROOT / 'character-assets-v2.json'
SOURCE_MANIFEST_ROOT = CHARACTER_ROOT / 'source-manifests'
CANDIDATE_ROOT = CHARACTER_ROOT / 'runtime-candidates'

PACKAGES = {
    'dStyle': {
        'sha256': '257acf709f99efff178a38a758fbd5e41fc27d0c006b55015322f7bdc8b52869',
        'manifestFile': 'd-style-package-manifest.json',
        'files': [
            ('01_elderly_woman.png', 'npc_volunteer_elder_cane_001', 'volunteer', 1.4),
            ('02_volunteer.png', 'npc_volunteer_tote_001', 'volunteer', 1.4),
            ('03_miguel.png', 'npc_volunteer_miguel_001', 'volunteer', 1.4),
            ('04_mother_and_child.png', 'npc_household_parent_child_001', 'household', 1.4),
            ('05_backpack_youth.png', 'npc_civilian_backpack_youth_001', 'civilian', 1.4),
            ('06_beanie_person.png', 'npc_civilian_beanie_messenger_001', 'civilian', 1.4),
            ('07_grocery_carrier.png', 'npc_civilian_grocery_carrier_001', 'civilian', 1.4),
            ('08_woman_and_dog.png', 'npc_household_dog_walker_001', 'household', 1.4),
        ],
    },
    'unhoused': {
        'sha256': 'd4c3c6d9653c54dffd19b27b9677e141ba9aedaaf32a523586976019a8bc1c62',
        'manifestFile': 'unhoused-package-manifest.json',
        'files': [
            ('01_top_woman_and_dog.png', 'npc_unhoused_dog_companion_001', 'unhoused', 1.4),
            ('02_top_bike_traveler.png', 'npc_unhoused_bicycle_001', 'unhoused', 1.4),
            ('03_top_walker.png', 'npc_unhoused_cane_001', 'unhoused', 1.4),
            ('04_top_standing_man.png', 'npc_unhoused_work_jacket_001', 'unhoused', 1.4),
            ('05_bottom_woman.png', 'npc_unhoused_dyed_hair_001', 'unhoused', 1.4),
            ('06_bottom_man.png', 'npc_unhoused_blanket_wrap_001', 'unhoused', 1.4),
            ('07_bottom_sitting_person.png', 'npc_unhoused_slumped_001', 'unhoused', 0.96),
            ('08_bottom_cart_woman.png', 'npc_unhoused_cart_001', 'unhoused', 1.4),
        ],
    },
}


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha256_path(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(65536), b''):
            digest.update(chunk)
    return digest.hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def inspect_png(package_key, name, data, source_record, margin):
    with Image.open(io.BytesIO(data)) as image:
        if image.mode != 'RGBA':
            raise ValueError(f'{package_key}:{name}: expected RGBA, got {image.mode}')
        if list(image.size) != source_record['size']:
            raise ValueError(f'{package_key}:{name}: PNG dimensions differ from package manifest')
        rgba = image.copy()
    alpha = rgba.getchannel('A')
    histogram = alpha.histogram()
    if histogram[0] == 0 or sum(histogram[1:255]) == 0 or histogram[255] == 0:
        raise ValueError(f'{package_key}:{name}: transparent, partial, and opaque alpha are all required')
    if alpha.getbbox() is None:
        raise ValueError(f'{package_key}:{name}: missing nontransparent source pixels')
    left, top, right, bottom = alpha.getbbox()
    if min(left, top, rgba.width - right, rgba.height - bottom) < margin:
        raise ValueError(f'{package_key}:{name}: required transparent source margin is missing')
    hidden_rgb = 0
    for red, green, blue, opacity in rgba.get_flattened_data():
        if opacity == 0 and (red or green or blue):
            hidden_rgb += 1
    if hidden_rgb:
        raise ValueError(f'{package_key}:{name}: {hidden_rgb} nonzero RGB pixels under alpha zero')
    return {
        'width': rgba.width,
        'height': rgba.height,
        'alphaBounds': {'x': left, 'y': top, 'w': right - left, 'h': bottom - top},
        'alphaHistogram': {'zero': histogram[0], 'partial': sum(histogram[1:255]), 'opaque': histogram[255]},
    }


def validate_package(package_key, archive_path):
    config = PACKAGES[package_key]
    archive_path = Path(archive_path)
    if not archive_path.is_file():
        raise ValueError(f'{package_key}: archive not found: {archive_path}')
    archive_hash = sha256_path(archive_path)
    if archive_hash != config['sha256']:
        raise ValueError(f'{package_key}: archive SHA-256 mismatch: expected {config["sha256"]}, observed {archive_hash}')
    with zipfile.ZipFile(archive_path, 'r') as archive:
        names = set(archive.namelist())
        expected_names = {name for name, _, _, _ in config['files']} | {'manifest.json'}
        if names != expected_names:
            raise ValueError(f'{package_key}: unexpected archive entries: {sorted(names ^ expected_names)}')
        manifest_bytes = archive.read('manifest.json')
        package_manifest = json.loads(manifest_bytes.decode('utf-8'))
        if package_manifest.get('asset_count') != 8 or len(package_manifest.get('assets', [])) != 8:
            raise ValueError(f'{package_key}: package manifest must contain exactly eight assets')
        if package_manifest.get('margin_pixels') != 24:
            raise ValueError(f'{package_key}: expected 24-pixel source margin')
        if package_manifest.get('transparent_rgb_normalized_to_zero') is not True:
            raise ValueError(f'{package_key}: package manifest does not guarantee transparent RGB normalization')
        source_by_file = {record.get('file'): record for record in package_manifest['assets']}
        if set(source_by_file) != {name for name, _, _, _ in config['files']}:
            raise ValueError(f'{package_key}: package manifest file set differs from approved mapping')
        assets = []
        for name, asset_id, group, display_height_cells in config['files']:
            data = archive.read(name)
            source_record = source_by_file[name]
            actual_hash = sha256_bytes(data)
            if actual_hash != source_record.get('sha256'):
                raise ValueError(f'{package_key}:{name}: inner SHA-256 mismatch')
            details = inspect_png(package_key, name, data, source_record, package_manifest['margin_pixels'])
            assets.append({
                'assetId': asset_id,
                'package': package_key,
                'packageFile': name,
                'group': group,
                'displayHeightCells': display_height_cells,
                'bytes': data,
                'sourceSha256': actual_hash,
                'sourceSize': {'width': details['width'], 'height': details['height']},
                'sourceAlphaBounds': details['alphaBounds'],
                'sourceAlphaHistogram': details['alphaHistogram'],
            })
    return {
        'key': package_key,
        'archivePath': archive_path,
        'archiveName': archive_path.name,
        'archiveSha256': archive_hash,
        'manifestBytes': manifest_bytes,
        'manifestSha256': sha256_bytes(manifest_bytes),
        'marginPixels': 24,
        'assets': assets,
    }


def make_manifest(packages):
    assets = []
    package_records = {}
    for package in packages:
        package_records[package['key']] = {
            'archiveName': package['archiveName'],
            'archiveSha256': package['archiveSha256'],
            'manifestPath': relative(SOURCE_MANIFEST_ROOT / PACKAGES[package['key']]['manifestFile']),
            'manifestSha256': package['manifestSha256'],
            'assetCount': len(package['assets']),
            'sourceMarginPixels': package['marginPixels'],
        }
        for item in package['assets']:
            asset_id = item['assetId']
            assets.append({
                'assetId': asset_id,
                'package': item['package'],
                'packageFile': item['packageFile'],
                'group': item['group'],
                'renderMode': 'billboard-single',
                'collision': 'none',
                'reviewStatus': 'candidate',
                'sourcePath': relative(CANDIDATE_ROOT / f'{asset_id}.png'),
                'sourceSha256': item['sourceSha256'],
                'sourceSize': item['sourceSize'],
                'sourceMarginPixels': package['marginPixels'],
                'sourceAlphaBounds': item['sourceAlphaBounds'],
                'sourceAlphaHistogram': item['sourceAlphaHistogram'],
                'anchor': {'x': 0.5, 'y': 1.0},
                'runtimePath': relative(CHARACTER_ROOT / 'runtime' / f'{asset_id}.png'),
                'runtimeSha256': None,
                'runtimeSize': None,
                'runtimeAlphaBounds': None,
                'runtimeAlphaHistogram': None,
                'displayHeightCells': item['displayHeightCells'],
            })
    return {'schema': 'snc-character-assets-v2', 'packages': package_records, 'assets': assets}


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f'.{path.name}.', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as handle:
            handle.write(data)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def install(packages):
    staging_parent = ROOT / 'test-results' / 'approved-cast-integration'
    staging_parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='approved-character-packages-', dir=staging_parent) as temp:
        stage = Path(temp)
        manifest = make_manifest(packages)
        # Re-importing the same approved package must be idempotent after the
        # deterministic runtime compiler has filled its derived metadata.
        # Source provenance remains authoritative; cached runtime facts survive
        # only when the canonical source hash and runtime path are unchanged.
        if MANIFEST_PATH.is_file():
            active = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
            if active.get('schema') == manifest['schema']:
                active_by_id = {asset.get('assetId'): asset for asset in active.get('assets', [])}
                for asset in manifest['assets']:
                    previous = active_by_id.get(asset['assetId'])
                    if previous and previous.get('sourceSha256') == asset['sourceSha256'] and previous.get('runtimePath') == asset['runtimePath']:
                        for key in ('runtimeSha256', 'runtimeSize', 'runtimeAlphaBounds', 'runtimeAlphaHistogram'):
                            asset[key] = previous.get(key)
        staged_files = []
        for package in packages:
            atomic_write(stage / 'source-manifests' / PACKAGES[package['key']]['manifestFile'], package['manifestBytes'])
            for asset in package['assets']:
                target = stage / 'runtime-candidates' / f"{asset['assetId']}.png"
                atomic_write(target, asset['bytes'])
                staged_files.append((target, CANDIDATE_ROOT / target.name))
        atomic_write(stage / 'character-assets-v2.json', (json.dumps(manifest, indent=2) + '\n').encode('utf-8'))
        # All validation and staging finished before any active source is replaced.
        for source, target in staged_files:
            atomic_write(target, source.read_bytes())
        for package in packages:
            source = stage / 'source-manifests' / PACKAGES[package['key']]['manifestFile']
            atomic_write(SOURCE_MANIFEST_ROOT / source.name, source.read_bytes())
        atomic_write(MANIFEST_PATH, (json.dumps(manifest, indent=2) + '\n').encode('utf-8'))


def check_installed(packages):
    if not MANIFEST_PATH.is_file():
        raise ValueError('missing character-assets-v2.json; run importer with --write')
    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    expected = make_manifest(packages)
    if manifest.get('schema') != expected['schema']:
        raise ValueError('unexpected active character manifest schema')
    if [asset['assetId'] for asset in manifest.get('assets', [])] != [asset['assetId'] for asset in expected['assets']]:
        raise ValueError('active character manifest does not contain the approved stable ID order')
    for package in packages:
        actual_manifest = SOURCE_MANIFEST_ROOT / PACKAGES[package['key']]['manifestFile']
        if not actual_manifest.is_file() or actual_manifest.read_bytes() != package['manifestBytes']:
            raise ValueError(f"{package['key']}: stored source manifest differs from approved package")
        for asset in package['assets']:
            target = CANDIDATE_ROOT / f"{asset['assetId']}.png"
            if not target.is_file() or sha256_path(target) != asset['sourceSha256']:
                raise ValueError(f"{asset['assetId']}: active source PNG differs from approved package")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--d-style', required=True)
    parser.add_argument('--unhoused', required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    packages = [validate_package('dStyle', args.d_style), validate_package('unhoused', args.unhoused)]
    if args.write:
        install(packages)
    check_installed(packages)
    print(json.dumps({
        'pass': True,
        'mode': 'write' if args.write else 'check',
        'assets': sum(len(package['assets']) for package in packages),
        'archives': {package['key']: package['archiveSha256'] for package in packages},
    }, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'approved-character-import: {error}', file=sys.stderr)
        sys.exit(1)
