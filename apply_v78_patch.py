#!/usr/bin/env python3
"""Safely apply the LIVE // EARTH v78 Sun background patch to a local sw.js.

Run from the directory containing the existing, current sw.js:
    python3 apply_v78_patch.py
The script refuses to proceed if the expected baseline strings are missing or
ambiguous, writes a backup, and changes only the three intended locations.
"""
from pathlib import Path
import sys

path = Path("sw.js")
if not path.is_file():
    sys.exit("ERROR: sw.js not found in the current directory; no files changed.")
source = path.read_text(encoding="utf-8")
replacements = [
    ('const BUILD_ID = "v77-ios-root-flow-ab-test";',
     'const BUILD_ID = "v78-sun-view-backgrounds";'),
    ('const CACHE_NAME = "live-earth-shell-v77-ios-root-flow-ab-test";',
     'const CACHE_NAME = "live-earth-shell-v78-sun-view-backgrounds";'),
    (' "./moon-sky-background-portrait.webp","./moon-sky-background-landscape.webp",',
     ' "./moon-sky-background-portrait.webp","./moon-sky-background-landscape.webp",\n "./sun-sky-background-portrait.webp","./sun-sky-background-landscape.webp",'),
]
updated = source
for old, new in replacements:
    count = updated.count(old)
    if count != 1:
        sys.exit(f"ERROR: expected exactly one match for {old!r}, found {count}; no files changed.")
    updated = updated.replace(old, new, 1)
checks = [
    'const BUILD_ID = "v78-sun-view-backgrounds";',
    'const CACHE_NAME = "live-earth-shell-v78-sun-view-backgrounds";',
    '"./sun-sky-background-portrait.webp","./sun-sky-background-landscape.webp"',
]
if any(updated.count(item) != 1 for item in checks):
    sys.exit("ERROR: post-patch verification failed; no files changed.")
backup = Path("sw.js.v77-backup")
if backup.exists():
    sys.exit("ERROR: sw.js.v77-backup already exists; refusing to overwrite it.")
backup.write_text(source, encoding="utf-8")
path.write_text(updated, encoding="utf-8")
print("Patched sw.js with exactly three intended changes.")
print("Created backup: sw.js.v77-backup")
print("Please inspect the diff and run: node --check sw.js")
