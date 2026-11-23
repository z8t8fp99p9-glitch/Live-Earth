from __future__ import annotations

"""Corrected NOAA ERDDAP source configuration and coordinate handling."""

import csv
import io
import numpy as np
from . import ocean as _ocean

# Restore the two verified public source definitions. Keep all other Ocean
# source definitions, storage, encoding, and renderer contracts untouched.
_sst = _ocean.DATASETS["earth.oceans.sea_temperature"]
_sst.update({
    "dataset_id": "ncdcOisst21Agg_LonPM180",
    "base": "https://coastwatch.pfeg.noaa.gov/erddap",
    "variables": ("sst",),
    "extra_dims": ("zlev",),
    "source_id": "noaa_ncei_oisst21",
    "product": "NOAA NCEI OISST v2.1 AVHRR-only final, global 0.25 degree",
    "description": "Daily NOAA NCEI OISST v2.1 final sea-surface temperature analysis.",
})
_chl = _ocean.DATASETS["earth.oceans.chlorophyll"]
_chl.update({
    "dataset_id": "erdMH1chla1day_R2022NRT",
    "base": "https://coastwatch.pfeg.noaa.gov/erddap",
    "variables": ("chlorophyll",),
    "extra_dims": (),
    "source_id": "nasa_aqua_modis_chlorophyll_4km",
    "stride": 3,
    "expected_native_spacing_degrees": 1.0 / 24.0,
    "product": "NASA Aqua MODIS Level-3 mapped global daily chlorophyll-a, 4 km, R2022 NRT",
    "description": "NASA Aqua MODIS daily chlorophyll-a distributed openly through NOAA CoastWatch ERDDAP. Every third native 4 km cell is sampled to preserve the existing 0.125-degree renderer grid; no interpolation is applied.",
})

def _number(value: float) -> str:
    return format(float(value), ".12g")

def _axis_selector(axis: np.ndarray, stride: int):
    if stride < 1:
        raise ValueError("Grid sampling stride must be a positive integer")
    source = np.asarray(axis, dtype=np.float64)
    selected = source[::stride]
    if selected.size < 2:
        raise RuntimeError("Sampling stride leaves fewer than two grid coordinates")
    delta = np.diff(source)
    native_step = float(np.median(delta))
    step = native_step * int(stride)
    sampled_delta = np.diff(selected)
    tolerance = max(5e-5, abs(step) * 2e-3)
    if (not np.all(np.isfinite(sampled_delta)) or np.any(sampled_delta == 0)
            or not (np.all(sampled_delta > 0) or np.all(sampled_delta < 0))
            or not np.allclose(sampled_delta, step, rtol=0.0, atol=tolerance)):
        raise RuntimeError("Sampled coordinate axis is materially irregular; refusing to resample")
    return f"[({_number(selected[0])}):{_number(step)}:({_number(selected[-1])})]", selected

def _axis_values(spec: dict, axis_name: str) -> np.ndarray:
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
    if (not np.all(np.isfinite(delta)) or np.any(delta == 0)
            or not (np.all(delta > 0) or np.all(delta < 0))):
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} axis is not monotonic")
    step = float(np.median(delta))
    expected = spec.get("expected_native_spacing_degrees")
    tolerance = max(5e-5, abs(step) * 2e-3)
    if expected is not None and abs(abs(step) - float(expected)) > max(5e-5, float(expected) * 0.02):
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} spacing {step:.8g} does not match its documented native grid")
    deviation = float(np.max(np.abs(delta - step)))
    if deviation > tolerance:
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} axis is materially irregular (max deviation {deviation:.8g})")
    _ocean._AXIS_CACHE[key] = axis
    return axis

# Existing collector code resolves these helpers from ocean.py.
_ocean._axis_selector = _axis_selector
_ocean._axis_values = _axis_values

def is_due(dataset: dict) -> bool:
    return _ocean.is_due(dataset)

def collect(dataset: dict) -> dict:
    return _ocean.collect(dataset)
