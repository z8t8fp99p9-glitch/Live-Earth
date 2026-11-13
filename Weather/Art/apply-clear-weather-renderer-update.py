#!/usr/bin/env python3
"""Apply the minimal Clear Weather selection update to the existing Live Art renderer.

Run from the repository root:
    python3 path/to/apply-clear-weather-renderer-update.py

The script verifies the exact renderer blob fetched from the repository before
making four narrowly scoped replacements. It refuses to patch an unexpected file.
"""
from pathlib import Path
import hashlib
import sys

RENDERER = Path("Weather/Art/live-art-online.js")
EXPECTED_GIT_BLOB_SHA = "d4e03712d324b1b9a8a0cacb3560de09e910d42a"

def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()

def main() -> int:
    if not RENDERER.is_file():
        print(f"ERROR: {RENDERER} not found. Run this script from the repository root.", file=sys.stderr)
        return 2

    original = RENDERER.read_bytes()
    actual_sha = git_blob_sha(original)
    if actual_sha != EXPECTED_GIT_BLOB_SHA:
        print(
            "ERROR: Renderer does not match the inspected baseline.\n"
            f"Expected Git blob: {EXPECTED_GIT_BLOB_SHA}\n"
            f"Found Git blob:    {actual_sha}\n"
            "No file was changed. Inspect the current renderer and adapt the patch deliberately.",
            file=sys.stderr,
        )
        return 3

    try:
        text = original.decode("utf-8")
    except UnicodeDecodeError:
        print("ERROR: Renderer is not valid UTF-8. No file was changed.", file=sys.stderr)
        return 4

    replacements = [
        (
            "      id: String(raw.id || ''),\n      title: String(raw.title || 'Weather study'),",
            "      id: String(raw.id || ''),\n"
            "      weather: Array.isArray(raw.weather) ? raw.weather.map(value => String(value).toLowerCase()) : [],\n"
            "      title: String(raw.title || 'Weather study'),",
            "retain artwork weather tags in the prepared asset",
        ),
        (
            "    const entryWeather = ['rain', 'cloudy'].includes(weather) ? weather : '';",
            "    const entryWeather = ['clear', 'rain', 'cloudy'].includes(weather) ? weather : '';",
            "allow Clear Weather catalogue selection",
        ),
        (
            "    if (currentArt && currentArtId === 'rainy-tea-afternoon-001') return;",
            "    if (currentArt && Array.isArray(currentArt.weather) && currentArt.weather.includes(entryWeather)) return;",
            "make same-artwork matching weather-aware without hard-coding Rain",
        ),
        (
            "    canvas.setAttribute('aria-label', 'A Japanese ink-and-wash rainy tea scene, painted stroke by stroke');",
            "    canvas.setAttribute('aria-label', 'A Japanese ink-and-wash weather scene, painted stroke by stroke');",
            "use an accurate generic canvas label",
        ),
    ]

    updated = text
    for old, new, label in replacements:
        count = updated.count(old)
        if count != 1:
            print(f"ERROR: Expected exactly one match for: {label}; found {count}. No file was changed.", file=sys.stderr)
            return 5
        updated = updated.replace(old, new, 1)

    RENDERER.write_text(updated, encoding="utf-8", newline="\n")
    print("Updated Weather/Art/live-art-online.js with the Clear Weather selection change.")
    print(f"New Git blob SHA: {git_blob_sha(RENDERER.read_bytes())}")
    print("The drawing decoder, path painting, Replay timing, paper treatment, and network/cache behaviour were not changed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
