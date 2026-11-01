#!/usr/bin/env python3
"""Install the LIVE // EARTH Python-startup dispatcher used by existing jobs."""
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
    version="1.0.0",
    description="Automatic dispatcher for LIVE // EARTH Global Content Rights Checker",
    py_modules=["live_earth_global_checker_bootstrap"],
    data_files=[(
        PURELIB_RELATIVE,
        [str(ROOT / "live_earth_global_checker_bootstrap.pth")],
    )],
    python_requires=">=3.12",
)
