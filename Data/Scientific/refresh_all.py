#!/usr/bin/env python3
"""Run the six independent LIVE // EARTH world collectors; fail if any configured world fails."""
from __future__ import annotations
import subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
TASKS=[
 ('atmosphere',[sys.executable,str(ROOT/'Data/Scientific/atmosphere_gfs_collector.py')]),
 ('oceans',[sys.executable,str(ROOT/'Data/Scientific/world_collectors.py'),'oceans']),
 ('land',[sys.executable,str(ROOT/'Data/Scientific/world_collectors.py'),'land']),
 ('water_ice',[sys.executable,str(ROOT/'Data/Scientific/world_collectors.py'),'water_ice']),
 ('earth_activity',[sys.executable,str(ROOT/'Data/Scientific/world_collectors.py'),'earth_activity']),
 ('energy_humanity',[sys.executable,str(ROOT/'Data/Scientific/world_collectors.py'),'energy_humanity']),
]
def main():
 failures=[]
 for world,cmd in TASKS:
  print(f'\n===== {world.upper()} =====',flush=True)
  result=subprocess.run(cmd,cwd=ROOT)
  if result.returncode: failures.append(world)
 if failures: raise SystemExit('One or more world collectors failed: '+', '.join(failures))
 print('\nAll six configured world collectors completed successfully.')
if __name__=='__main__': main()
