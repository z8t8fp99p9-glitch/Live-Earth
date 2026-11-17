#!/usr/bin/env python3
"""Run all six independent LIVE // EARTH collectors; retain successful outputs."""
from __future__ import annotations
import subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TASKS = [
    ('atmosphere', [sys.executable, str(ROOT/'Data/Scientific/atmosphere_gfs_collector.py')]),
    ('oceans', [sys.executable, str(ROOT/'Data/Scientific/world_collectors.py'), 'oceans']),
    ('land', [sys.executable, str(ROOT/'Data/Scientific/world_collectors.py'), 'land']),
    ('water_ice', [sys.executable, str(ROOT/'Data/Scientific/world_collectors.py'), 'water_ice']),
    ('earth_activity', [sys.executable, str(ROOT/'Data/Scientific/world_collectors.py'), 'earth_activity']),
    # Use a dedicated entry point so the required NASA POWER community is explicit.
    ('energy_humanity', [sys.executable, str(ROOT/'Data/Scientific/energy_humanity_collector.py')]),
]

def main():
    failures = []
    successes = []
    for world, command in TASKS:
        print(f'\n===== {world.upper()} =====', flush=True)
        result = subprocess.run(command, cwd=ROOT)
        if result.returncode:
            failures.append(world)
            print(f'WORLD_RESULT {world}=FAILED; previous committed snapshot will be retained', flush=True)
        else:
            successes.append(world)
            print(f'WORLD_RESULT {world}=SUCCESS; new snapshot is ready to commit', flush=True)
    print('\nCOLLECTION_SUMMARY ' + ','.join(f'{w}:success' for w in successes)
          + ((' ' if successes and failures else '') + ','.join(f'{w}:failed' for w in failures)), flush=True)
    if failures:
        raise SystemExit('Some world collectors failed: ' + ', '.join(failures)
                         + '. Successful world outputs are retained for the workflow commit step.')
    print('All six configured world collectors completed successfully.')

if __name__ == '__main__':
    main()
