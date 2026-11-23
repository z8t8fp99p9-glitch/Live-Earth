from __future__ import annotations

"""Corrected ERDDAP request/axis compatibility layer for the Ocean adapter.

The original ocean adapter remains the single source of collection logic.
This module patches two ERDDAP-specific helpers before delegating collection:
1) griddap stride is an integer index stride, not a coordinate-unit step;
2) regular 4 km axes can contain harmless float32 representation noise.
"""

import csv
import io

import numpy as np

from . import ocean as _ocean


def _number(value: float) -> str:
    return format(float(value), ".12g")


def _axis_selector(axis: np.ndarray, stride: int) -> tuple[str, np.ndarray]:
    """Build ERDDAP's coordinate-value selector with an INDEX stride.

    ERDDAP syntax is [(coordinate_start):index_stride:(coordinate_stop)].
    The stride is not the physical coordinate spacing (e.g. 0.25 degrees).
    """
    if stride < 1:
        raise ValueError("Grid sampling stride must be a positive integer")
    selected = np.asarray(axis, dtype=np.float64)[::stride]
    if selected.size < 2:
        raise RuntimeError("Sampling stride leaves fewer than two grid coordinates")
    delta = np.diff(selected)
    step = float(np.median(delta))
    tolerance = max(1e-5, abs(step) * 1e-4)
    if not np.allclose(delta, step, rtol=0.0, atol=tolerance):
        raise RuntimeError("Sampled coordinate axis is not regular; refusing to resample")
    return f"[({_number(selected[0])}):{int(stride)}:({_number(selected[-1])})]", selected


def _axis_values(spec: dict, axis_name: str) -> np.ndarray:
    """Read a coordinate CSV and tolerate documented float32 grid rounding."""
    key = (spec["base"], spec["dataset_id"], axis_name)
    if key in _ocean._AXIS_CACHE:
        return _ocean._AXIS_CACHE[key]
    url = f"{spec['base']}/griddap/{spec['dataset_id']}.csv?{axis_name}"
    text = _ocean._get(url, _ocean.MAX_AXIS_BYTES).text
    values = []
    for row in csv.reader(io.StringIO(text)):
        if not row:
            continue
        try:
            value = float(row[0].strip().strip('"'))
            if np.isfinite(value):
                values.append(value)
        except (ValueError, TypeError):
            continue
    axis = np.asarray(values, dtype=np.float64)
    if axis.size < 2:
        raise RuntimeError(f"ERDDAP did not return a usable {axis_name} coordinate for {spec['dataset_id']}")
    delta = np.diff(axis)
    step = float(np.median(delta))
    # The NASA MODIS 4 km grid is published as evenly spaced at 1/24 degree.
    # ERDDAP's CSV coordinate serialization can introduce tiny float32 noise;
    # this tolerance is far below a meaningful fraction of a source cell.
    tolerance = max(1e-5, abs(step) * 1e-4)
    if not np.isfinite(step) or abs(step) < 1e-10 or not np.allclose(
        delta, step, rtol=0.0, atol=tolerance
    ):
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} axis is not a regular native grid")
    _ocean._AXIS_CACHE[key] = axis
    return axis


# Patch the helpers in the original module. Its collect()/is_due() functions
# resolve globals from that module, so all six layers use the corrected logic.
_ocean._axis_selector = _axis_selector
_ocean._axis_values = _axis_values


def is_due(dataset: dict) -> bool:
    return _ocean.is_due(dataset)


def collect(dataset: dict) -> dict:
    return _ocean.collect(dataset)
