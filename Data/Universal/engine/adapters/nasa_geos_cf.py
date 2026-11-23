from __future__ import annotations

"""Latest anonymous NASA GEOS-CF global fields for Atmospheric Composition.

The adapter fetches one newest valid 1440x721 field per dataset from NASA's
public OPeNDAP `latest` products. It writes only the current grid to the
existing Universal current-value store; it does not archive source files,
forecast sequences, or historical snapshots.

Scientific meanings are intentionally explicit:
- xco2: column-averaged dry-air CO2, converted to ppm.
- xch4: column-averaged dry-air methane, converted to ppb.
- co: near-surface (NASA surface product) dry-air CO mole fraction, ppb.
- pm25du_rh35: dust contribution to PM2.5 at RH 35%, ug m-3.

All values are GEOS-CF model output, not direct satellite/instrument
observations. No interpolation, gap filling, or synthetic values are used.
"""

import datetime as dt
import gzip
import hashlib
import json
import os
import re

import numpy as np
import xarray as xr

UTC = dt.timezone.utc
BASE = "https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/fcst"
PRODUCTS = {
    "ghg": f"{BASE}/ghg_inst_3hr_glo_L1440x721_v72.latest",
    "chem_surface": f"{BASE}/chm_tavg_1hr_glo_L1440x721_slv.latest",
}

DATASETS = {
    "earth.atmosphere.co2_concentration": {
        "product": "ghg", "variable": "xco2", "unit": "ppm",
        "conversion": 1_000_000.0, "scale": 10, "source_units": "mol mol-1 (dry-air column average)",
        "description": "Column-averaged dry-air carbon dioxide mole fraction from NASA GEOS-CF v2.",
        "scientific_level": "column_average", "range": (250.0, 650.0),
    },
    "earth.atmosphere.methane": {
        "product": "ghg", "variable": "xch4", "unit": "ppb",
        "conversion": 1_000_000_000.0, "scale": 10, "source_units": "mol mol-1 (dry-air column average)",
        "description": "Column-averaged dry-air methane mole fraction from NASA GEOS-CF v2.",
        "scientific_level": "column_average", "range": (300.0, 10000.0),
    },
    "earth.atmosphere.carbon_monoxide": {
        "product": "chem_surface", "variable": "co", "unit": "ppb",
        "conversion": 1_000_000_000.0, "scale": 0.1, "source_units": "mol mol-1 (dry air)",
        "description": "Near-surface carbon monoxide dry-air mole fraction from NASA GEOS-CF v2 surface chemistry product.",
        "scientific_level": "surface_level_singleton_coordinate", "range": (0.0, 100000.0),
    },
    "earth.atmosphere.aerosols_dust": {
        "product": "chem_surface", "variable": "pm25du_rh35", "unit": "ug/m^3",
        "conversion": 1.0, "scale": 1, "source_units": "ug m-3",
        "description": "Dust-attributed PM2.5 mass concentration at 35% relative humidity from NASA GEOS-CF v2.",
        "scientific_level": "surface_level_singleton_coordinate", "range": (0.0, 5000.0),
    },
}


def _parse_grads_start(value: str) -> dt.datetime:
    """Parse GrADS labels such as 12z08nov2026 or 09:30z21nov2026."""
    match = re.fullmatch(r"(?:(\d{1,2}):(\d{2})|(\d{1,2}))z(\d{1,2})([a-z]{3})(\d{4})", value.strip().lower())
    if not match:
        raise RuntimeError(f"Unsupported NASA GEOS-CF time origin: {value!r}")
    if match.group(3) is not None:
        hour, minute = int(match.group(3)), 0
    else:
        hour, minute = int(match.group(1)), int(match.group(2))
    month = {name.lower(): number for number, name in enumerate(
        ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"), 1
    )}[match.group(5)]
    return dt.datetime(int(match.group(6)), month, int(match.group(4)), hour, minute, tzinfo=UTC)


def _valid_time(dataset: xr.Dataset, index: int) -> dt.datetime:
    time_var = dataset["time"]
    attrs = time_var.attrs
    start = _parse_grads_start(str(attrs.get("grads_min", "")))
    step = str(attrs.get("grads_step", "")).strip().lower()
    match = re.fullmatch(r"(\d+(?:\.\d+)?)(mn|hr|dy)", step)
    if not match:
        raise RuntimeError(f"NASA GEOS-CF time step is missing or unsupported: {step!r}")
    amount = float(match.group(1))
    unit = match.group(2)
    seconds = amount * {"mn": 60, "hr": 3600, "dy": 86400}[unit]
    return start + dt.timedelta(seconds=seconds * index)


def _iso(value: dt.datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _open_product(product: str) -> xr.Dataset:
    # pydap is installed as an explicit Universal dependency. decode_times=False
    # preserves the GrADS time metadata used for exact source valid-time reporting.
    try:
        return xr.open_dataset(PRODUCTS[product], engine="pydap", decode_times=False)
    except Exception as exc:
        raise RuntimeError(f"Could not open anonymous NASA GEOS-CF {product} OPeNDAP product: {exc}") from exc


def _extract_latest(dataset: xr.Dataset, spec: dict):
    variable_name = spec["variable"]
    if variable_name not in dataset.data_vars:
        raise RuntimeError(f"NASA GEOS-CF product does not expose required field {variable_name!r}")
    variable = dataset[variable_name]
    if "time" not in variable.dims:
        raise RuntimeError(f"NASA GEOS-CF field {variable_name} has no time dimension")
    time_count = int(variable.sizes["time"])
    if time_count < 1:
        raise RuntimeError(f"NASA GEOS-CF field {variable_name} has no available time slices")

    # Select the newest source time. Surface products contain a singleton lev
    # dimension; column-average greenhouse-gas fields may not.
    selected = variable.isel(time=time_count - 1)
    if "lev" in selected.dims:
        if int(selected.sizes["lev"]) != 1:
            raise RuntimeError(
                f"NASA GEOS-CF {variable_name} is not a documented surface/column field; "
                "refusing to choose an arbitrary vertical level"
            )
        selected = selected.isel(lev=0)
    values = np.asarray(selected.values, dtype=np.float64).squeeze()
    lat = np.asarray(dataset["lat"].values, dtype=np.float64).squeeze()
    lon = np.asarray(dataset["lon"].values, dtype=np.float64).squeeze()
    if values.shape != (lat.size, lon.size) or values.ndim != 2:
        raise RuntimeError(f"NASA GEOS-CF {variable_name} returned unexpected grid shape {values.shape}")
    if lat.size != 721 or lon.size != 1440:
        raise RuntimeError(f"NASA GEOS-CF {variable_name} is not a 1440x721 native 0.25-degree grid")
    if not np.all(np.isfinite(values)) or np.any(np.abs(values) >= 1.0e14):
        raise RuntimeError(f"NASA GEOS-CF {variable_name} contains missing or non-finite cells")
    if not np.allclose(np.abs(np.diff(lat)), 0.25, atol=1e-5):
        raise RuntimeError("NASA GEOS-CF latitude coordinates are not native 0.25-degree spacing")
    if not np.allclose(np.abs(np.diff(lon)), 0.25, atol=1e-5):
        raise RuntimeError("NASA GEOS-CF longitude coordinates are not native 0.25-degree spacing")

    valid_time = _valid_time(dataset, time_count - 1)
    # Convert source coordinates (-180..179.75, south-to-north) to the
    # Universal grid convention (0..359.75, north-to-south).
    longitude_order = np.argsort(np.mod(lon, 360.0))
    values = values[::-1, :][:, longitude_order]
    lon_sorted = np.mod(lon[longitude_order], 360.0)
    lat_sorted = lat[::-1]
    if not np.allclose(lon_sorted, np.arange(1440) * 0.25, atol=1e-5):
        raise RuntimeError("NASA GEOS-CF longitude grid cannot be normalized without resampling")
    if not np.allclose(lat_sorted, 90.0 - np.arange(721) * 0.25, atol=1e-5):
        raise RuntimeError("NASA GEOS-CF latitude grid cannot be normalized without resampling")

    converted = values * spec["conversion"]
    low, high = spec["range"]
    if float(np.min(converted)) < low or float(np.max(converted)) > high:
        raise RuntimeError(
            f"NASA GEOS-CF {variable_name} values outside approved physical range "
            f"{low}..{high} {spec['unit']}"
        )
    packed_float = np.rint(converted * spec["scale"])
    if float(np.min(packed_float)) < -32768 or float(np.max(packed_float)) > 32767:
        raise RuntimeError(f"NASA GEOS-CF {variable_name} exceeds the Universal int16 encoding range")
    packed = packed_float.astype("<i2")
    raw = packed.tobytes(order="C")
    return gzip.compress(raw, compresslevel=9, mtime=0), raw, valid_time


def is_due(dataset: dict) -> bool:
    """Check only NASA's latest time/history before deciding to download a full grid."""
    dataset_id = dataset["dataset_id"]
    spec = DATASETS.get(dataset_id)
    if spec is None:
        return True
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Central-Database", "values"))
    metadata_path = os.path.join(root, dataset_id, "metadata.json")
    stored = {}
    if os.path.isfile(metadata_path):
        try:
            with open(metadata_path, encoding="utf-8") as stream:
                stored = json.load(stream)
        except (OSError, ValueError, json.JSONDecodeError):
            stored = {}
    source = _open_product(spec["product"])
    try:
        count = int(source[spec["variable"]].sizes.get("time", 0))
        if count < 1:
            return True
        latest_time = _iso(_valid_time(source, count - 1))
        history = str(source.attrs.get("history", ""))
        return (
            stored.get("valid_time_utc") != latest_time
            or stored.get("source_product_history") != history
        )
    finally:
        source.close()


def collect(dataset: dict) -> dict:
    dataset_id = dataset["dataset_id"]
    spec = DATASETS.get(dataset_id)
    if spec is None:
        raise ValueError(f"No NASA GEOS-CF field configured for {dataset_id}")

    source = _open_product(spec["product"])
    try:
        compressed, raw, valid_time = _extract_latest(source, spec)
        variable = source[spec["variable"]]
        retrieved = dt.datetime.now(UTC)
        source_url = PRODUCTS[spec["product"]]
        scale = spec["scale"]
        metadata = {
            "schema_version": 1,
            "world": "atmosphere",
            "data_kind": "grid",
            "dataset_id": dataset_id,
            "dataset": dataset_id.rsplit(".", 1)[-1],
            "description": spec["description"],
            "grid_id": "GRID_NASA_GEOS_CF_025_V1",
            "provider": "NASA Global Modeling and Assimilation Office (GMAO)",
            "product": "GEOS-CF v2 " + spec["product"],
            "source_url": source_url,
            "source_variable": spec["variable"],
            "source_units": spec["source_units"],
        "source_cycle_utc": _iso(_parse_grads_start(str(source["time"].attrs.get("grads_min", "")))),
        "forecast_lead_hours": int((valid_time - _parse_grads_start(str(source["time"].attrs.get("grads_min", "")))).total_seconds() // 3600),
            "units": spec["unit"],
            "scientific_level": spec["scientific_level"],
            "source_model": "GEOS-CF model output; not direct satellite or instrument observation",
            "valid_time_utc": _iso(valid_time),
            "retrieved_at_utc": _iso(retrieved),
            "width": 1440,
            "height": 721,
            "coordinate_order": "latitude-longitude",
            "row_order": "north-to-south",
            "latitude_first": 90.0,
            "latitude_step": -0.25,
            "longitude_first": 0.0,
            "longitude_step": 0.25,
            "longitude_convention": "0..360",
            "encoding": f"little-endian signed int16; value = stored_integer / {scale}",
            "scale_factor": scale,
            "nodata": None,
            "sha256_uncompressed_values": hashlib.sha256(raw).hexdigest(),
            "compressed_bytes": len(compressed),
            "quality_status": "downloaded_and_grid_validated",
            "note": "Latest available NASA GEOS-CF source time only. No historical snapshots, interpolation, or gap filling.",
        }
        observation = {
            "dataset_id": dataset_id,
            "source_id": "nasa_geos_cf_v2",
            "observed_at": _iso(valid_time),
            "retrieved_at": _iso(retrieved),
            "value": None,
            "unit": spec["unit"],
            "dimensions": {"width": 1440, "height": 721},
            "geometry": {"type": "global_regular_grid", "metadata": metadata},
            "quality": {"status": "downloaded_and_grid_validated", "grid_id": "GRID_NASA_GEOS_CF_025_V1"},
            "provenance": {
                "source_url": source_url,
                "source_variables": [spec["variable"]],
                "source_valid_time_utc": _iso(valid_time),
            },
        }
        return {"value_payload": compressed, "metadata": metadata, "observations": [observation]}
    finally:
        source.close()
