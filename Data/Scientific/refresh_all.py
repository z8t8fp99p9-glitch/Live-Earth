#!/usr/bin/env python3
"""Orchestrate independent latest-snapshot collectors for the six LIVE // EARTH worlds."""
from __future__ import annotations
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COLLECTORS = [
    ("atmosphere", ROOT / "Data/Scientific/atmosphere_gfs_collector.py"),
    ("oceans", ROOT / "Data/Scientific/oceans_collector.py"),
    ("land", ROOT / "Data/Scientific/land_collector.py"),
    ("water_ice", ROOT / "Data/Scientific/water_ice_collector.py"),
    ("earth_activity", ROOT / "Data/Scientific/earth_activity_collector.py"),
    ("energy_humanity", ROOT / "Data/Scientific/energy_humanity_collector.py"),
]

def main():
    failures = []
    for world, script in COLLECTORS:
        if not script.exists():
            print(f"{world}: collector not configured yet; store left unchanged.")
            continue
        print(f"Starting {world} collector...")
        result = subprocess.run([sys.executable, str(script)], cwd=ROOT)
        if result.returncode:
            failures.append(world)
    if failures:
        raise SystemExit("Collectors failed: " + ", ".join(failures))
    print("Configured collectors completed. Unconfigured worlds were safely skipped.")

if __name__ == "__main__":
    main()
