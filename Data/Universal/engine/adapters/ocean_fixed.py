from __future__ import annotations

"""NOAA ocean source configuration and strict ERDDAP grid selection."""

import csv
import datetime as dt
import io
import re
import os
import tempfile

import numpy as np
from . import ocean as _ocean

# NOAA's Upwell ERDDAP mirror serves the same NOAA NCEI OISST v2.1 final
# dataset and grid. Keep the chlorophyll product as NASA Aqua MODIS R2022 NRT.
_sst = _ocean.DATASETS["earth.oceans.sea_temperature"]
_sst.update({
    "dataset_id": "ncdcOisst21Agg_LonPM180",
    "base": "https://upwell.pfeg.noaa.gov/erddap",
    "variables": ("sst",),
    "extra_dims": ("zlev",),
    "source_id": "noaa_ncei_oisst21",
    "product": "NOAA NCEI OISST v2.1 AVHRR-only final, global 0.25 degree",
    "description": "Daily NOAA NCEI OISST v2.1 final sea-surface temperature analysis, accessed through NOAA Upwell ERDDAP.",
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
    "max_age_days": 7,
    "product": "NASA Aqua MODIS Level-3 mapped global daily chlorophyll-a, 4 km, R2022 NRT",
    "description": "NASA Aqua MODIS daily chlorophyll-a observations distributed by NOAA CoastWatch ERDDAP. Every third native 4 km cell is selected to match the existing 0.125-degree renderer grid; no interpolation or gap-filling is applied.",
})

# Use a clear application identity rather than impersonating a desktop browser.
_ocean.SESSION.headers.update({
    "User-Agent": "LIVE-EARTH-open-data-collector/1.0 (NOAA/NASA public data; contact: project-maintainer)",
    "Accept": "application/json,text/csv,application/x-netcdf,*/*",
})


def _number(value: float) -> str:
    return format(float(value), ".12g")


def _axis_selector(axis: np.ndarray, stride: int):
    """Build ERDDAP's integer-index stride selector, not a degree stride."""
    if not isinstance(stride, (int, np.integer)) or stride < 1:
        raise ValueError("Grid sampling stride must be a positive integer")
    source = np.asarray(axis, dtype=np.float64)
    if source.ndim != 1 or source.size < 2 or not np.all(np.isfinite(source)):
        raise RuntimeError("Source coordinate axis is not a usable one-dimensional grid")
    selected = source[::int(stride)]
    if selected.size < 2:
        raise RuntimeError("Sampling stride leaves fewer than two grid coordinates")
    delta = np.diff(source)
    if (not np.all(np.isfinite(delta)) or np.any(delta == 0)
            or not (np.all(delta > 0) or np.all(delta < 0))):
        raise RuntimeError("Source coordinate axis is not strictly monotonic")
    native_step = float(np.median(delta))
    expected = _ocean.DATASETS["earth.oceans.chlorophyll"].get("expected_native_spacing_degrees")
    if expected is not None and stride == 3 and abs(abs(native_step) - float(expected)) > 5e-5:
        raise RuntimeError("Aqua MODIS native grid spacing does not match the documented 4 km grid")
    sampled_step = native_step * int(stride)
    if not np.allclose(np.diff(selected), sampled_step, rtol=0.0, atol=max(1e-7, abs(sampled_step) * 1e-4)):
        raise RuntimeError("Sampled coordinate axis is irregular; refusing to resample")
    return f"[({_number(selected[0])}):{int(stride)}:({_number(selected[-1])})]", selected


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
    if float(np.max(np.abs(delta - step))) > tolerance:
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} axis is materially irregular")
    _ocean._AXIS_CACHE[key] = axis
    return axis



def _validate_returned_axis(requested: np.ndarray, returned: np.ndarray,
                            axis_name: str) -> np.ndarray:
    """Validate ERDDAP's decoded coordinates without rejecting float precision.

    ERDDAP's CSV coordinate endpoint and NetCDF response can serialize the
    same MODIS coordinates at different floating-point precision. Compare
    positions within a strict sub-cell tolerance, then retain the coordinates
    actually embedded in the NetCDF response for downstream metadata.
    """
    expected = np.asarray(requested, dtype=np.float64).reshape(-1)
    actual = np.asarray(returned, dtype=np.float64).reshape(-1)
    if actual.size != expected.size or actual.size < 2:
        raise RuntimeError(
            f"Returned {axis_name} coordinate count {actual.size} does not match "
            f"requested count {expected.size}"
        )
    if not np.all(np.isfinite(actual)):
        raise RuntimeError(f"Returned {axis_name} coordinates contain non-finite values")

    expected_step = float(np.median(np.diff(expected)))
    actual_delta = np.diff(actual)
    actual_step = float(np.median(actual_delta))
    step_tolerance = max(5e-5, abs(expected_step) * 2e-3)
    if (not np.all(np.isfinite(actual_delta)) or np.any(actual_delta == 0)
            or not (np.all(actual_delta > 0) or np.all(actual_delta < 0))
            or abs(actual_step - expected_step) > step_tolerance
            or float(np.max(np.abs(actual_delta - actual_step))) > step_tolerance):
        raise RuntimeError(
            f"Returned {axis_name} grid is not the requested regular native sample "
            f"(requested step {expected_step:.10g}, returned step {actual_step:.10g})"
        )

    difference = actual - expected
    if axis_name.lower() in {"longitude", "lon"}:
        difference = (difference + 180.0) % 360.0 - 180.0
    max_offset = float(np.max(np.abs(difference)))
    # 0.00005 degrees is far below one native MODIS cell (~0.04167 degrees),
    # but safely covers float32 coordinate serialization near +/-180 degrees.
    if max_offset > 5e-5:
        index = int(np.argmax(np.abs(difference)))
        raise RuntimeError(
            f"Returned {axis_name} coordinates are genuinely offset from the "
            f"requested MODIS sample (max offset {max_offset:.8g} degrees at "
            f"index {index}; requested {expected[index]:.10g}, "
            f"returned {actual[index]:.10g})"
        )
    return actual


_original_request_erddap = _ocean._request_erddap

def _request_erddap(spec: dict, timestamp: dt.datetime, variable: str):
    """Read and validate the coordinates embedded in the returned NetCDF.

    The previous decoder compared CSV axis values to NetCDF coordinate values
    at 1e-6 degrees. That is stricter than the provider's float serialization
    and caused valid Aqua MODIS grids to fail after successful downloads.
    """
    raw, url, requested_lat, requested_lon = _original_request_erddap(
        spec, timestamp, variable
    )
    if spec.get("source_id") != "nasa_aqua_modis_chlorophyll_4km":
        return raw, url, requested_lat, requested_lon

    fd, path = tempfile.mkstemp(suffix=".nc")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        with _ocean.xr.open_dataset(
            path, engine="netcdf4", decode_cf=True, mask_and_scale=True
        ) as ds:
            if "latitude" not in ds.variables or "longitude" not in ds.variables:
                raise RuntimeError("Returned MODIS NetCDF is missing latitude/longitude coordinates")
            actual_lat = _validate_returned_axis(
                requested_lat, ds["latitude"].values, "latitude"
            )
            actual_lon = _validate_returned_axis(
                requested_lon, ds["longitude"].values, "longitude"
            )
            if actual_lat.size != 1440 or actual_lon.size != 2880:
                raise RuntimeError(
                    f"Returned Aqua MODIS grid is {actual_lon.size}x{actual_lat.size}; "
                    "renderer requires 2880x1440"
                )
        return raw, url, actual_lat, actual_lon
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

_original_latest_erddap_time = _ocean._latest_erddap_time


def _latest_erddap_time(spec: dict) -> dt.datetime:
    """Use NASA's dated NRT product_name; ERDDAP time actual_range can lag."""
    if spec.get("source_id") == "nasa_aqua_modis_chlorophyll_4km":
        records = _ocean._dataset_info(spec)
        for record in records:
            if (str(record.get("Row Type", "")).lower() == "attribute"
                    and record.get("Attribute Name") == "product_name"):
                match = re.search(r"AQUA_MODIS\.(\d{8})\.L3m\.DAY\.CHL\.chlor_a\.4km\.NRT", str(record.get("Value", "")))
                if match:
                    day = dt.datetime.strptime(match.group(1), "%Y%m%d").date()
                    latest = dt.datetime.combine(day, dt.time(12), tzinfo=dt.timezone.utc)
                    age = dt.datetime.now(dt.timezone.utc) - latest
                    if age > dt.timedelta(days=int(spec["max_age_days"])):
                        raise RuntimeError(
                            f"NASA Aqua MODIS latest product is stale ({age.days} days; "
                            f"limit {spec['max_age_days']}): {latest.date().isoformat()}"
                        )
                    _ocean._LATEST_CACHE[(spec["base"], spec["dataset_id"])] = latest
                    return latest
        raise RuntimeError("NOAA ERDDAP metadata did not publish a dated NASA Aqua MODIS NRT product_name")
    return _original_latest_erddap_time(spec)


# The collector resolves these helpers from ocean.py at runtime.
_ocean._axis_selector = _axis_selector
_ocean._axis_values = _axis_values
_ocean._latest_erddap_time = _latest_erddap_time
_ocean._request_erddap = _request_erddap


def is_due(dataset: dict) -> bool:
    return _ocean.is_due(dataset)


def collect(dataset: dict) -> dict:
    return _ocean.collect(dataset)
