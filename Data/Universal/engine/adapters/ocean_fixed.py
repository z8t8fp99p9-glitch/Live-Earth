from __future__ import annotations

"""ERDDAP coordinate compatibility layer for the Universal Ocean adapter.

Keeps the existing collector and all working Ocean sources unchanged. The
chlorophyll grid is published with small coordinate-serialization variations;
validate its axis against a bounded native-grid tolerance rather than an
overly strict adjacent-difference comparison.
"""

import csv
import io

import numpy as np

from . import ocean as _ocean


def _number(value: float) -> str:
    return format(float(value), ".12g")


def _axis_selector(axis: np.ndarray, stride: int) -> tuple[str, np.ndarray]:
    """Build an ERDDAP coordinate selector using an integer index stride."""
    if stride < 1:
        raise ValueError("Grid sampling stride must be a positive integer")
    source = np.asarray(axis, dtype=np.float64)
    selected = source[::stride]
    if selected.size < 2:
        raise RuntimeError("Sampling stride leaves fewer than two grid coordinates")

    delta = np.diff(selected)
    step = float(np.median(delta))
    # Allow only tiny coordinate serialization noise; this is still far
    # smaller than one MODIS 4 km source cell (~0.0417 degrees).
    tolerance = max(5e-4, abs(step) * 1e-4)
    if not np.all(np.isfinite(delta)) or np.any(delta == 0):
        raise RuntimeError("Sampled coordinate axis contains invalid or duplicate coordinates")
    if not (np.all(delta > 0) or np.all(delta < 0)):
        raise RuntimeError("Sampled coordinate axis changes direction")
    if not np.allclose(delta, step, rtol=0.0, atol=tolerance):
        raise RuntimeError("Sampled coordinate axis is materially irregular; refusing to resample")

    return f"[({_number(selected[0])}):{int(stride)}:({_number(selected[-1])})]", selected


def _axis_values(spec: dict, axis_name: str) -> np.ndarray:
    """Read ERDDAP coordinates and validate monotonic, near-regular spacing."""
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
        raise RuntimeError(
            f"ERDDAP did not return a usable {axis_name} coordinate for {spec['dataset_id']}"
        )

    delta = np.diff(axis)
    if not np.all(np.isfinite(delta)) or np.any(delta == 0):
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} axis contains invalid or duplicate coordinates")
    if not (np.all(delta > 0) or np.all(delta < 0)):
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} axis is not monotonic")

    step = float(np.median(delta))
    if not np.isfinite(step) or abs(step) < 1e-10:
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} axis has no usable spacing")

    if spec.get("units") == "mg m-3":
        # MODIS Aqua R2022NRT 4 km coordinates are serialized through ERDDAP
        # with small float precision variations. A 0.0005-degree cap is about
        # 1.2% of a nominal 1/24-degree cell and cannot conceal missing cells.
        tolerance = 5e-4
        if abs(step) < 0.03 or abs(step) > 0.05:
            raise RuntimeError(
                f"{spec['dataset_id']} {axis_name} spacing {step:.8g} is outside "
                "the expected native 4 km grid range"
            )
    else:
        tolerance = max(1e-5, abs(step) * 1e-4)

    deviation = np.abs(delta - step)
    if float(np.max(deviation)) > tolerance:
        raise RuntimeError(
            f"{spec['dataset_id']} {axis_name} axis is materially irregular "
            f"(median step {step:.8g}, max deviation {float(np.max(deviation)):.8g})"
        )

    _ocean._AXIS_CACHE[key] = axis
    return axis


# collect()/is_due() resolve globals in the original module, so patching these
# two helpers routes the existing adapter through the corrected validation.
_ocean._axis_selector = _axis_selector
_ocean._axis_values = _axis_values


def is_due(dataset: dict) -> bool:
    return _ocean.is_due(dataset)


def collect(dataset: dict) -> dict:
    return _ocean.collect(dataset)
