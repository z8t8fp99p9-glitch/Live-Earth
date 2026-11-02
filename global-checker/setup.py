#!/usr/bin/env python3
"""Install the LIVE // EARTH startup dispatcher and Newsroom Publisher gate."""
from pathlib import Path
import sys
import sysconfig

from setuptools import setup

ROOT = Path(__file__).resolve().parent
PURELIB = Path(sysconfig.get_path("purelib")).resolve()
PREFIX = Path(sys.prefix).resolve()
try:
    PURELIB_RELATIVE = PURELIB.relative_to(PREFIX).as_posix()
except ValueError as exc:
    raise RuntimeError("Cannot determine the Python site-packages installation path.") from exc

setup(
    name="live-earth-global-checker-bootstrap",
    version="1.1.0",
    description="Automatic LIVE // EARTH dispatcher and Newsroom Publisher approval gate",
    py_modules=[
        "live_earth_global_checker_bootstrap",
        "newsroom_publisher_gate",
    ],
    data_files=[(
        PURELIB_RELATIVE,
        [str(ROOT / "live_earth_global_checker_bootstrap.pth")],
    )],
    python_requires=">=3.12",
)
