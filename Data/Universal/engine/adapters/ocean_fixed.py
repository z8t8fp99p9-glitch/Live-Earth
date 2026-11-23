from __future__ import annotations

"""NOAA ocean source configuration and strict ERDDAP grid selection."""

import csv
import datetime as dt
import io
import json
import os
import re
import tempfile

import numpy as np
from . import ocean as _ocean

# NOAA's Upwell ERDDAP mirror serves the same NOAA NCEI OISST v2.1 final
# dataset and grid. The two products below are temporal composites: one
# centered 3-day SMOS mean and one centered 8-day Aqua MODIS mean.
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

_sal = _ocean.DATASETS["earth.oceans.salinity"]
_sal.update({
    "dataset_id": "coastwatchSMOSv662SSS3day",
    "base": "https://coastwatch.pfeg.noaa.gov/erddap",
    "variables": ("sss",),
    "extra_dims": ("altitude",),
    "source_id": "noaa_coastwatch_smos_3day_composite",
    "cadence": "3-day",
    "units": "PSU",
    "scale": 100,
    "valid_min": 25.0,
    "valid_max": 40.0,
    "max_age_days": 14,
    "stride": 1,
    "expected_native_spacing_degrees": 0.25,
    "provider": "NOAA NESDIS CoastWatch",
    "product": "NOAA CoastWatch MIRAS SMOS Level-3 global 0.25-degree 3-day mean sea-surface salinity composite",
    "description": "NOAA CoastWatch's precomputed 3-day mean of ESA SMOS MIRAS Level-2 corrected sea-surface salinity. One centered composite is fetched as a complete 720 by 1440 global grid; no daily grids are assembled locally and no interpolation is applied.",
    "field_label": "Sea surface salinity",
    "temporal_composite": "3-day mean",
})

_chl = _ocean.DATASETS["earth.oceans.chlorophyll"]
_chl.update({
    "dataset_id": "erdMH1chla8day_R2022NRT",
    "base": "https://coastwatch.pfeg.noaa.gov/erddap",
    "variables": ("chlorophyll",),
    "extra_dims": (),
    "source_id": "nasa_aqua_modis_chlorophyll_8day",
    "cadence": "8-day",
    "aggregation_factor": 3,
    "expected_native_spacing_degrees": 1.0 / 24.0,
    "max_age_days": 14,
    "product": "NASA Aqua MODIS Level-3 mapped global 8-day chlorophyll-a composite, 4 km, R2022 NRT",
    "description": "NASA Aqua MODIS R2022 near-real-time 8-day Level-3 mapped chlorophyll-a composite distributed by NOAA CoastWatch ERDDAP. The complete 4320 by 8640 native source grid is reduced into LIVE // EARTH's existing 1440 by 2880 target grid by taking the mean of valid measured source pixels within each aligned 3 by 3 block. Missing source pixels are excluded; blocks with no valid measurements remain no-data. No interpolation or gap-filling is applied.",
    "field_label": "Chlorophyll-a concentration",
    "temporal_composite": "8-day centered composite",
})

# Expected native dimensions are validated before decoding. Chlorophyll is
# subsequently reduced to the existing 1440 x 2880 Oceans storage contract.
_COMPOSITE_TARGET_SHAPES = {
    "noaa_coastwatch_smos_3day_composite": (720, 1440),
    "nasa_aqua_modis_chlorophyll_8day": (4320, 8640),
}

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
    """Validate returned NetCDF coordinates while allowing float32 serialization noise."""
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
    # Far below one source cell, but large enough for float32 coordinate output.
    if max_offset > 5e-5:
        index = int(np.argmax(np.abs(difference)))
        raise RuntimeError(
            f"Returned {axis_name} coordinates are genuinely offset from the "
            f"requested sample (max offset {max_offset:.8g} degrees at index "
            f"{index}; requested {expected[index]:.10g}, returned {actual[index]:.10g})"
        )
    return actual


_original_request_erddap = _ocean._request_erddap


def _request_erddap(spec: dict, timestamp: dt.datetime, variable: str):
    """Validate exact native source dimensions and coordinates for the composites."""
    request_spec = spec
    if spec.get("source_id") == "nasa_aqua_modis_chlorophyll_8day":
        request_spec = dict(spec)
        request_spec["stride"] = 1
    raw, url, requested_lat, requested_lon = _original_request_erddap(
        request_spec, timestamp, variable
    )
    expected_shape = _COMPOSITE_TARGET_SHAPES.get(spec.get("source_id"))
    if expected_shape is None:
        return raw, url, requested_lat, requested_lon

    fd, path = tempfile.mkstemp(suffix=".nc")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        with _ocean.xr.open_dataset(
            path, engine="netcdf4", decode_cf=True, mask_and_scale=True
        ) as ds:
            if "latitude" not in ds.variables or "longitude" not in ds.variables:
                raise RuntimeError(f"Returned {spec['product']} NetCDF is missing latitude/longitude coordinates")
            actual_lat = _validate_returned_axis(
                requested_lat, ds["latitude"].values, "latitude"
            )
            actual_lon = _validate_returned_axis(
                requested_lon, ds["longitude"].values, "longitude"
            )
            actual_shape = (actual_lat.size, actual_lon.size)
            if actual_shape != expected_shape:
                raise RuntimeError(
                    f"{spec['dataset_id']} returned grid {actual_shape}; "
                    f"expected {expected_shape} for the existing Oceans target grid"
                )
        return raw, url, actual_lat, actual_lon
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass


def _metadata_value(records: list[dict], variable: str | None, attribute: str) -> str | None:
    for record in records:
        record_variable = record.get("Variable Name")
        variable_matches = (
            record_variable == variable if variable is not None
            else record_variable in (None, "", "NC_GLOBAL")
        )
        if (str(record.get("Row Type", "")).lower() == "attribute"
                and variable_matches
                and str(record.get("Attribute Name", "")).lower() == attribute.lower()):
            value = record.get("Value")
            return None if value is None else str(value)
    return None


def _validate_composite_product(spec: dict) -> None:
    """Fail closed if an endpoint stops serving the intended composite product."""
    source_id = spec.get("source_id")
    if source_id not in _COMPOSITE_TARGET_SHAPES:
        return
    records = _ocean._dataset_info(spec)

    if source_id == "noaa_coastwatch_smos_3day_composite":
        cell_methods = _metadata_value(records, "sss", "cell_methods") or ""
        product_name = _metadata_value(records, None, "product_name") or ""
        if not re.search(r"time\s*:\s*mean\s*\(\s*interval\s*:\s*3\s*day\s*\)", cell_methods, re.I):
            raise RuntimeError(
                "NOAA SMOS source no longer identifies sss as a 3-day mean composite; refusing daily or unknown data"
            )
        if product_name and not re.search(r"_3days\.nc$", product_name, re.I):
            raise RuntimeError(f"Unexpected NOAA SMOS composite product name: {product_name}")
        return

    temporal_range = _metadata_value(records, None, "temporal_range") or ""
    product_name = _metadata_value(records, None, "product_name") or ""
    if temporal_range.strip().lower() != "8-day":
        raise RuntimeError(
            f"NASA Aqua MODIS endpoint does not declare an 8-day temporal range: {temporal_range!r}"
        )
    if not re.search(
        r"^AQUA_MODIS\.\d{8}_\d{8}\.L3m\.8D\.CHL\.chlor_a\.4km\.NRT(?:\.nc)?$",
        product_name,
        re.I,
    ):
        raise RuntimeError(f"Unexpected NASA Aqua MODIS 8-day product name: {product_name!r}")


_original_latest_erddap_time = _ocean._latest_erddap_time


def _latest_erddap_time(spec: dict) -> dt.datetime:
    """Use the source's centered ERDDAP time coordinate for each composite."""
    _validate_composite_product(spec)
    # For 8-day Aqua MODIS, ERDDAP's time axis is explicitly "Centered Time".
    # Its actual_range is the composite center; do not substitute either date
    # in product_name (the latter is a coverage window, not the time coordinate).
    return _original_latest_erddap_time(spec)


def _aggregate_chlorophyll_3x3(values: np.ndarray, lat: np.ndarray, lon: np.ndarray,
                                spec: dict) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Mean only valid measured Aqua MODIS pixels in each aligned 3x3 block."""
    factor = int(spec.get("aggregation_factor", 0))
    if factor != 3:
        raise RuntimeError("Chlorophyll aggregation factor must remain exactly 3")
    values = np.asarray(values, dtype=np.float64)
    lat = np.asarray(lat, dtype=np.float64).reshape(-1)
    lon = np.asarray(lon, dtype=np.float64).reshape(-1)
    if (values.ndim != 2 or values.shape[0] % factor or values.shape[1] % factor
            or lat.size != values.shape[0] or lon.size != values.shape[1]):
        raise RuntimeError(
            "Aqua MODIS native chlorophyll grid must be a 2-D array divisible "
            f"by {factor} on both axes and match its coordinates; received "
            f"values={values.shape}, latitude={lat.size}, longitude={lon.size}"
        )
    out_height, out_width = values.shape[0] // factor, values.shape[1] // factor
    dlat = np.diff(lat)
    dlon = np.diff(lon)
    native = float(spec["expected_native_spacing_degrees"])
    if (not np.all(np.isfinite(lat)) or not np.all(np.isfinite(lon))
            or not np.allclose(dlat, np.median(dlat), rtol=0.0, atol=5e-5)
            or not np.allclose(dlon, np.median(dlon), rtol=0.0, atol=5e-5)
            or abs(abs(float(np.median(dlat))) - native) > 5e-5
            or abs(abs(float(np.median(dlon))) - native) > 5e-5):
        raise RuntimeError("Aqua MODIS native coordinates are irregular or not 1/24 degree")

    blocks = values.reshape(out_height, factor, out_width, factor)
    valid = (np.isfinite(blocks)
             & (blocks >= float(spec["valid_min"]))
             & (blocks <= float(spec["valid_max"])))
    sums = np.where(valid, blocks, 0.0).sum(axis=(1, 3), dtype=np.float64)
    counts = valid.sum(axis=(1, 3))
    aggregated = np.full((out_height, out_width), np.nan, dtype=np.float64)
    np.divide(sums, counts, out=aggregated, where=counts > 0)

    # The middle native pixel is the geometric center of each odd-sized block.
    target_lat = lat[factor // 2::factor]
    target_lon = lon[factor // 2::factor]
    if target_lat.size != out_height or target_lon.size != out_width:
        raise RuntimeError("Chlorophyll aggregation produced unexpected target axes")
    return aggregated, target_lat, target_lon


_original_decode_erddap = _ocean._decode_erddap


def _decode_erddap(spec: dict, timestamp: dt.datetime):
    values, lat, lon, observed, urls = _original_decode_erddap(spec, timestamp)
    if spec.get("source_id") == "nasa_aqua_modis_chlorophyll_8day":
        values, lat, lon = _aggregate_chlorophyll_3x3(values, lat, lon, spec)
    return values, lat, lon, observed, urls


# The collector resolves these helpers from ocean.py at runtime.
_ocean._axis_selector = _axis_selector
_ocean._axis_values = _axis_values
_ocean._latest_erddap_time = _latest_erddap_time
_ocean._request_erddap = _request_erddap
_ocean._decode_erddap = _decode_erddap


def is_due(dataset: dict) -> bool:
    """Force a fetch when source identity changes, even if timestamps match."""
    dataset_id = dataset.get("dataset_id")
    spec = _ocean.DATASETS.get(dataset_id)
    if spec is None:
        return True
    db_root = getattr(_ocean, "DB_ROOT", None)
    if db_root is not None:
        metadata_path = db_root / "values" / dataset_id / "metadata.json"
        if metadata_path.is_file():
            try:
                current = json.loads(metadata_path.read_text(encoding="utf-8"))
                if current.get("source_id") != spec.get("source_id"):
                    return True
                if spec.get("kind") == "erddap":
                    expected_prefix = (
                        f"{spec['base']}/griddap/{spec['dataset_id']}.nc?"
                    )
                    if not str(current.get("source_url", "")).startswith(expected_prefix):
                        return True
            except (OSError, ValueError, TypeError, json.JSONDecodeError):
                return True
    return _ocean.is_due(dataset)


def collect(dataset: dict) -> dict:
    return _ocean.collect(dataset)
