#!/usr/bin/env python3
"""Apply LIVE // EARTH Lunar Stardust v81 to an exact matching repository checkout.

The script refuses to patch if the expected v80 markers don't match. It validates
all target edits before writing any files and creates timestamped file backups.
It never accesses browser storage, IndexedDB, location permissions, or GitHub.
"""
from __future__ import annotations
import argparse
import datetime as dt
import re
import shutil
import sys
from pathlib import Path

BUILD_OLD = 'v80-sun-bluehour-amber'
BUILD_NEW = 'v81-lunar-stardust'
CACHE_OLD = 'live-earth-shell-v80-sun-bluehour-amber'
CACHE_NEW = 'live-earth-shell-v81-lunar-stardust'


def exactly_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise ValueError(f'{label}: expected exactly one match for a known v80 marker; found {count}. No files written.')
    return text.replace(old, new, 1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('repo_root', type=Path, help='Path to a local Live-Earth repository checkout')
    parser.add_argument('--check', action='store_true', help='Validate the patch without writing changes')
    args = parser.parse_args()
    root = args.repo_root.expanduser().resolve()
    package = Path(__file__).resolve().parent
    targets = {name: root / name for name in ('index.html', 'sw.js', 'update-manager.js', 'astronomy.js')}
    missing = [str(p) for p in targets.values() if not p.is_file()]
    if missing:
        print('Missing expected repository files:\n  ' + '\n  '.join(missing), file=sys.stderr)
        return 2

    sources = {name: path.read_text(encoding='utf-8') for name, path in targets.items()}
    outputs = dict(sources)

    # Wire the new layer into the active, sequential boot loader.
    old_loader = "     './sky-view-controller.js',\n     './view-manager.js',\n     './update-manager.js'"
    new_loader = "     './sky-view-controller.js',\n     './view-manager.js',\n     './moon-lunar-interface.js',\n     './update-manager.js'"
    outputs['index.html'] = exactly_once(outputs['index.html'], old_loader, new_loader, 'index.html controller loader')

    # Stage the new file in the existing app shell and use a fresh cache key.
    outputs['sw.js'] = exactly_once(
        outputs['sw.js'],
        '/* LIVE // EARTH — v79 launch update recovery + verified Sun asset shell. */',
        '/* LIVE // EARTH — v81 Lunar Stardust staged update. */',
        'sw.js build comment')
    outputs['sw.js'] = exactly_once(outputs['sw.js'], f'const BUILD_ID = "{BUILD_OLD}";',
                                    f'const BUILD_ID = "{BUILD_NEW}";', 'sw.js BUILD_ID')
    outputs['sw.js'] = exactly_once(outputs['sw.js'], f'const CACHE_NAME = "{CACHE_OLD}";',
                                    f'const CACHE_NAME = "{CACHE_NEW}";', 'sw.js CACHE_NAME')
    outputs['sw.js'] = exactly_once(
        outputs['sw.js'],
        '"./sky-view-controller.js","./view-manager.js",',
        '"./sky-view-controller.js","./view-manager.js","./moon-lunar-interface.js",',
        'sw.js APP_SHELL')

    outputs['update-manager.js'] = exactly_once(
        outputs['update-manager.js'], f'const BUILD_ID = "{BUILD_OLD}";',
        f'const BUILD_ID = "{BUILD_NEW}";', 'update-manager.js BUILD_ID')

    snippet_path = package / 'lunar-rise-set-interval.snippet.js'
    ui_path = package / 'moon-lunar-interface.js'
    if not snippet_path.is_file() or not ui_path.is_file():
        raise ValueError('The package is missing the lunar UI script or astronomy snippet.')
    snippet = snippet_path.read_text(encoding='utf-8').strip()
    astronomy = outputs['astronomy.js']
    if 'function moonPosition(' not in astronomy:
        raise ValueError('astronomy.js no longer contains the expected moonPosition function. No files written.')
    if 'moonRiseSetInterval' in astronomy or 'export { moonPosition };' in astronomy:
        raise ValueError('astronomy.js already contains part of the lunar interval patch. Inspect it manually; no files written.')
    outputs['astronomy.js'] = astronomy.rstrip() + '\n\n' + snippet + '\n'

    new_ui_dest = root / 'moon-lunar-interface.js'
    add_ui = not new_ui_dest.exists()
    ui_content = ui_path.read_text(encoding='utf-8')
    if new_ui_dest.exists() and new_ui_dest.read_text(encoding='utf-8') != ui_content:
        raise ValueError('moon-lunar-interface.js already exists with different content. Inspect manually; no files written.')

    # Cross-file consistency checks before touching disk.
    if outputs['sw.js'].count(f'const BUILD_ID = "{BUILD_NEW}";') != 1:
        raise ValueError('Service worker build ID mismatch.')
    if f'const BUILD_ID = "{BUILD_NEW}";' not in outputs['update-manager.js']:
        raise ValueError('Update manager build ID mismatch.')
    if '"./moon-lunar-interface.js"' not in outputs['sw.js'] or "'./moon-lunar-interface.js'" not in outputs['index.html']:
        raise ValueError('New lunar interface is not both loaded and cached.')
    if 'export function moonRiseSetInterval' not in outputs['astronomy.js']:
        raise ValueError('Lunar interval export missing after patch.')

    changed = [name for name in targets if outputs[name] != sources[name]]
    if args.check:
        print('PASS: exact v80 markers matched; v81 patch validates without writing files.')
        print('Would update: ' + ', '.join(changed) + ' and add moon-lunar-interface.js')
        print('Build IDs: sw.js and update-manager.js both use v81-lunar-stardust.')
        return 0

    timestamp = dt.datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = root / f'.lunar-stardust-v81-backup-{timestamp}'
    backup_dir.mkdir()
    for name in changed:
        shutil.copy2(targets[name], backup_dir / name)
    # Prepare temp outputs first; all validations have succeeded.
    temp_files = []
    try:
        for name in changed:
            temp = targets[name].with_suffix(targets[name].suffix + '.v81tmp')
            temp.write_text(outputs[name], encoding='utf-8', newline='')
            temp_files.append((temp, targets[name]))
        if not new_ui_dest.exists():
            temp_ui = new_ui_dest.with_suffix('.js.v81tmp')
            temp_ui.write_text(ui_content, encoding='utf-8', newline='')
            temp_files.append((temp_ui, new_ui_dest))
        for temp, destination in temp_files:
            temp.replace(destination)
    except Exception:
        for temp, destination in temp_files:
            try:
                if temp.exists(): temp.unlink()
            except OSError:
                pass
        raise
    print('Applied Lunar Stardust v81 to the local checkout.')
    print('Updated: ' + ', '.join(changed) + (', moon-lunar-interface.js (added)' if add_ui else ''))
    print(f'Backup copies: {backup_dir}')
    print('No Git commit, deploy, browser update, or storage operation was performed.')
    print('Commit all changed files together after reviewing the diff.')
    return 0

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        raise SystemExit(1)
