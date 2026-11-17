#!/usr/bin/env python3
"""Dedicated Energy & Humanity NASA POWER collector entry point."""
from __future__ import annotations
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import world_collectors


def main() -> None:
    # Pass the required NASA POWER community explicitly. RE is the supported
    # Renewable Energy community for ALLSKY_SFC_SW_DWN.
    world_collectors.power_points(
        'energy_humanity',
        'surface_solar_radiation',
        'ALLSKY_SFC_SW_DWN',
        'kWh/m^2/day',
        'NASA POWER daily all-sky surface shortwave downward irradiance, RE community; each point uses its newest valid observation returned by the source.',
        'RE',
    )


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'ENERGY_HUMANITY COLLECTION FAILED: {exc}', file=sys.stderr)
        raise SystemExit(1)
