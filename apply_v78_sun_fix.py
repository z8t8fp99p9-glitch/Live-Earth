#!/usr/bin/env python3
"""Safely patch existing sw.js and update-manager.js for the v78 Sun cache fix.

Run this in a copy of the repository root, where both existing files are present:
    python3 apply_v78_sun_fix.py
The script makes backups first and refuses to modify files unless every expected
baseline occurs exactly once. It never edits any other app files.
"""
from pathlib import Path
import sys

sw_path = Path("sw.js")
up_path = Path("update-manager.js")
for path in (sw_path, up_path):
    if not path.is_file():
        sys.exit(f"ERROR: {path} not found in the current directory; no files changed.")

sw = sw_path.read_text(encoding="utf-8")
up = up_path.read_text(encoding="utf-8")

replacements = [
    ('const BUILD_ID = "v77-ios-root-flow-ab-test";',
     'const BUILD_ID = "v78-sun-view-backgrounds";'),
    ('const CACHE_NAME = "live-earth-shell-v77-ios-root-flow-ab-test";',
     'const CACHE_NAME = "live-earth-shell-v78-sun-view-backgrounds";'),
    (' "./moon-sky-background-portrait.webp","./moon-sky-background-landscape.webp",',
     ' "./moon-sky-background-portrait.webp","./moon-sky-background-landscape.webp",\n "./sun-sky-background-portrait.webp","./sun-sky-background-landscape.webp",'),
]
updated_sw = sw
for old, new in replacements:
    count = updated_sw.count(old)
    if count != 1:
        sys.exit(f"ERROR: expected exactly one baseline match in sw.js for {old!r}; found {count}. No files changed.")
    updated_sw = updated_sw.replace(old, new, 1)

old_up = 'const BUILD_ID = "v75-bounded-startup";'
new_up = 'const BUILD_ID = "v78-sun-view-backgrounds";'
if up.count(old_up) != 1:
    sys.exit(f"ERROR: expected exactly one updater build ID match; found {up.count(old_up)}. No files changed.")
updated_up = up.replace(old_up, new_up, 1)

checks = [
    (updated_sw.count('const BUILD_ID = "v78-sun-view-backgrounds";') == 1, "service worker BUILD_ID"),
    (updated_sw.count('const CACHE_NAME = "live-earth-shell-v78-sun-view-backgrounds";') == 1, "service worker CACHE_NAME"),
    (updated_sw.count('"./sun-sky-background-portrait.webp","./sun-sky-background-landscape.webp"') == 1, "Sun WebP shell entries"),
    (updated_up.count(new_up) == 1, "update manager BUILD_ID"),
]
failed = [name for ok, name in checks if not ok]
if failed:
    sys.exit("ERROR: verification failed for " + ", ".join(failed) + ". No files changed.")

backups = [Path("sw.js.pre-v78-backup"), Path("update-manager.js.pre-v78-backup")]
if any(path.exists() for path in backups):
    sys.exit("ERROR: a pre-v78 backup already exists; refusing to overwrite it. No files changed.")

# Do not write one target unless all validation and backup checks have passed.
backups[0].write_text(sw, encoding="utf-8")
backups[1].write_text(up, encoding="utf-8")
sw_path.write_text(updated_sw, encoding="utf-8")
up_path.write_text(updated_up, encoding="utf-8")
print("Patched sw.js and update-manager.js for v78 Sun background caching.")
print("Backups created: sw.js.pre-v78-backup, update-manager.js.pre-v78-backup")
print("Run: node --check sw.js && node --check update-manager.js")
