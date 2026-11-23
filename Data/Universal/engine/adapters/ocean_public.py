from __future__ import annotations

"""Anonymous NOAA/NASA public gridded fields for LIVE // EARTH Oceans.

Fields use the latest published timestamp and the provider's documented grid.
The collector does not interpolate or regrid; the chlorophyll display grid is
sampled at a fixed stride from the NASA source grid to fit the shared GPU path.
No accounts, API keys, or external subscriptions are required.
"""

import datetime as dt
import gzip
import hashlib
import json
import os
import re
import tempfile
import time
from pathlib import Path

import numpy as np
import requests
import xarray as xr

UTC = dt.timezone.utc
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "LIVE-EARTH-Universal-Collector/1.0 (public NOAA open data)"
})
MAX_INFO_BYTES = 8 * 1024 * 1024
MAX_NETCDF_BYTES = 160 * 1024 * 1024
NODATA_INT16 = -32768
DB_ROOT = Path(__file__).resolve().parents[4] / "Data" / "Central-Database"
_LATEST_CACHE: dict[tuple[str, str], dt.datetime] = {}
_WAVE_LATEST_CACHE: dict[str, dict] = {}

# ERDDAP endpoints expose public gridded products; requests are anonymous.
DATASETS = {
    "earth.oceans.ocean_currents": {
        "dataset_id": "nesdisSSH1day", "base": "https://coastwatch.pfeg.noaa.gov/erddap",
        "variables": ("ugos", "vgos"), "units": "metre_per_second", "scale": 100,
        "valid_range": (0.0, 5.0), "width": 1440, "height": 720,
        "source_id": "noaa_coastwatch_altimetry", "cadence": "daily",
        "provider": "NOAA NESDIS CoastWatch",
        "product": "NOAA NESDIS experimental Sea Surface Height Anomalies and Geostrophic Currents from Altimetry, Global, daily",
        "description": "Geostrophic current speed derived as sqrt(ugos² + vgos²) from NOAA NESDIS experimental altimetry; direction components are retained in provenance, not displayed as a scalar vector field.",
        "field_label": "Geostrophic current speed", "latitude": "latitude", "longitude": "longitude",
        "time": "time", "extra_dims": (), "valid_min": 0.0, "valid_max": 5.0,
        "coverage": "global_native_0.25_degree_grid",
    },
    "earth.oceans.sea_level": {
        "dataset_id": "nesdisSSH1day", "base": "https://coastwatch.pfeg.noaa.gov/erddap",
        "variables": ("sla",), "units": "m", "scale": 1000,
        "valid_range": (-5.0, 5.0), "width": 1440, "height": 720,
        "source_id": "noaa_coastwatch_altimetry", "cadence": "daily",
        "provider": "NOAA NESDIS CoastWatch",
        "product": "NOAA NESDIS experimental Sea Surface Height Anomalies and Geostrophic Currents from Altimetry, Global, daily",
        "description": "Sea level anomaly relative to the product reference surface; NOAA labels this altimetry dataset experimental.",
        "field_label": "Sea level anomaly", "latitude": "latitude", "longitude": "longitude",
        "time": "time", "extra_dims": (), "valid_min": -5.0, "valid_max": 5.0,
        "coverage": "global_native_0.25_degree_grid",
    },
    "earth.oceans.salinity": {
        "dataset_id": "coastwatchSMOSv662SSS1day", "base": "https://coastwatch.pfeg.noaa.gov/erddap",
        "variables": ("sss",), "units": "PSU", "scale": 100,
        "valid_range": (0.0, 50.0), "width": 1440, "height": 720,
        "source_id": "noaa_coastwatch_smos", "cadence": "daily",
        "provider": "NOAA NESDIS CoastWatch",
        "product": "MIRAS SMOS Level-3 daily sea surface salinity, global 0.25 degree",
        "description": "Near-real-time sea surface salinity derived from ESA SMOS observations and distributed openly by NOAA CoastWatch.",
        "field_label": "Sea surface salinity", "latitude": "latitude", "longitude": "longitude",
        "time": "time", "extra_dims": ("altitude",), "valid_min": 0.0, "valid_max": 50.0,
        "coverage": "global_native_0.25_degree_grid",
    },
    "earth.oceans.wave_height": {
        "mode": "noaa_ncep_gfswave",
        "dataset_id": "gfswave_global_0p25", "base": "https://nomads.ncep.noaa.gov",
        "units": "m", "scale": 100,
        "valid_range": (0.0, 60.0), "width": 1440, "height": 721,
        "source_id": "noaa_ncep_gfs_wave", "cadence": "6-hourly",
        "provider": "NOAA/NCEP",
        "product": "NOAA NCEP GFS-Wave global.0p25 WAVEWATCH III forecast",
        "description": "Significant height of combined wind waves and swell (HTSGW) from NOAA NCEP's operational GFS-Wave model. The published global.0p25 field is post-processed from the model's underlying wave grids; this is a forecast, not a satellite or buoy observation.",
        "field_label": "Significant wave height", "latitude": "latitude", "longitude": "longitude",
        "time": "time", "extra_dims": (), "valid_min": 0.0, "valid_max": 60.0,
        "coverage": "global_published_0.25_degree_grid_noaa_gfs_wave",
        "forecast_hour": 3,
    },
    "earth.oceans.chlorophyll": {
        "dataset_id": "erdMH1chla1day_R2022NRT", "base": "https://coastwatch.pfeg.noaa.gov/erddap",
        "variables": ("chlorophyll",), "units": "mg m-3", "scale": 10,
        "width": 2880, "height": 1440, "source_width": 8640, "source_height": 4320,
        "subset_stride": 3,
        "source_id": "nasa_modis_aqua_chlorophyll_noaa_erddap", "cadence": "daily",
        "provider": "NASA/GSFC Ocean Biology Processing Group (NOAA CoastWatch ERDDAP distribution)",
        "product": "Aqua MODIS Level-3 mapped daily chlorophyll-a, R2022 near-real-time, global 4 km",
        "description": "Daily chlorophyll-a concentration from NASA MODIS-Aqua observations. The 4 km source grid is sampled at every third native cell (0.125 degree display spacing) without interpolation to fit the shared GPU grid limits.",
        "field_label": "Chlorophyll-a concentration", "latitude": "latitude", "longitude": "longitude",
        "time": "time", "extra_dims": (), "valid_min": 0.001, "valid_max": 100.0,
        "coverage": "global_0.125_degree_sampled_from_native_0.04167_degree_grid",
    },
}


def _iso(value: dt.datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _get(url: str, cap: int, attempts: int = 3) -> requests.Response:
    last_error = None
    for attempt in range(attempts):
        try:
            response = SESSION.get(url, timeout=(20, 240))
            if response.status_code == 429 or 500 <= response.status_code < 600:
                last_error = RuntimeError(f"HTTP {response.status_code}: {response.url}")
                if attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
                    continue
            response.raise_for_status()
            if not response.content or len(response.content) > cap:
                raise RuntimeError(f"Invalid ERDDAP response size: {len(response.content)} bytes")
            return response
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Public ERDDAP request failed: {last_error}")


def _latest_time(base: str, dataset_id: str) -> dt.datetime:
    """Read the last published time coordinate from ERDDAP's info metadata."""
    url = f"{base}/info/{dataset_id}/index.json"
    payload = _get(url, MAX_INFO_BYTES).json()
    table = payload.get("table") or {}
    columns = table.get("columnNames") or []
    rows = table.get("rows") or []
    if not columns or not rows:
        raise RuntimeError(f"ERDDAP metadata for {dataset_id} has no table rows")
    records = [dict(zip(columns, row)) for row in rows]
    # The time coordinate's actual_range is the exact last gridded timestamp.
    # It is more precise than global time_coverage_end, which can represent an
    # ingestion/coverage boundary rather than the coordinate value itself.
    for record in records:
        if (str(record.get("Row Type", "")).lower() == "attribute"
                and record.get("Variable Name") == "time"
                and record.get("Attribute Name") == "actual_range"):
            values = re.findall(r"[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?", str(record.get("Value", "")))
            if len(values) >= 2:
                return dt.datetime.fromtimestamp(float(values[-1]), UTC)
    # Some mirrors omit the coordinate actual_range; then use the global end.
    for record in records:
        if (str(record.get("Row Type", "")).lower() == "attribute"
                and str(record.get("Variable Name", "")) in ("NC_GLOBAL", "global")
                and record.get("Attribute Name") == "time_coverage_end"):
            try:
                parsed = dt.datetime.fromisoformat(str(record.get("Value", "")).replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=UTC)
                return parsed.astimezone(UTC)
            except ValueError:
                pass
    raise RuntimeError(f"ERDDAP metadata for {dataset_id} does not disclose a usable latest time")


def _coordinate(ds, name: str) -> np.ndarray:
    if name not in ds.variables:
        raise RuntimeError(f"ERDDAP NetCDF is missing coordinate {name}")
    values = np.asarray(ds[name].values, dtype=np.float64).reshape(-1)
    if values.size < 2 or not np.isfinite(values).all():
        raise RuntimeError(f"ERDDAP coordinate {name} is empty or non-finite")
    return values


def _validate_axis(values: np.ndarray, label: str) -> float:
    delta = np.diff(values)
    step = float(np.median(delta))
    if not np.isfinite(step) or abs(step) < 1e-9:
        raise RuntimeError(f"ERDDAP {label} coordinate has no usable grid spacing")
    # Universal Grid System stores an affine native grid, not a regridded copy.
    if not np.allclose(delta, step, rtol=0.0, atol=max(1e-6, abs(step) * 1e-4)):
        raise RuntimeError(f"ERDDAP {label} coordinates are not a regular native grid; refusing resampling")
    return step


def _request_netcdf(spec: dict, timestamp: dt.datetime, variable: str) -> tuple[bytes, str]:
    dataset_id = spec["dataset_id"]
    time_text = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    # ERDDAP griddap selectors use coordinate values. Constrain time and any
    # singleton altitude only; omitted trailing axes return their full extents.
    clauses = [f"[({time_text})]"]
    if spec["extra_dims"]:
        clauses.extend("[(0)]" for _ in spec["extra_dims"])
    stride = int(spec.get("subset_stride", 1))
    if stride > 1:
        last_lat = ((int(spec["source_height"]) - 1) // stride) * stride
        last_lon = ((int(spec["source_width"]) - 1) // stride) * stride
        clauses.append(f"[0:{stride}:{last_lat}]")
        clauses.append(f"[0:{stride}:{last_lon}]")
    # Otherwise leaving the trailing latitude/longitude axes unconstrained
    # requests the complete provider grid, including all native coordinate values.
    query = variable + "".join(clauses)
    url = f"{spec['base']}/griddap/{dataset_id}.nc?{query}"
    raw = _get(url, MAX_NETCDF_BYTES).content
    if not raw.startswith((b"CDF\x01", b"CDF\x02", b"\x89HDF\r\n\x1a\n")):
        raise RuntimeError(f"ERDDAP did not return NetCDF for {dataset_id}")
    return raw, url


def _decode(spec: dict, timestamp: dt.datetime, np_module, xr_module):
    variable_arrays = []
    latitude = longitude = observed = None
    source_urls = []
    for variable in spec["variables"]:
        raw, source_url = _request_netcdf(spec, timestamp, variable)
        source_urls.append(source_url)
        filename = None
        try:
            # Use a real temporary NetCDF path for maximum compatibility with
            # the netCDF4 backend. The downloaded response is discarded after
            # decoding; no provider files are archived in the current-value DB.
            fd, filename = tempfile.mkstemp(suffix=".nc")
            with os.fdopen(fd, "wb") as stream:
                stream.write(raw)
            with xr_module.open_dataset(filename, engine="netcdf4", decode_cf=True, mask_and_scale=True) as ds:
                if variable not in ds.data_vars:
                    raise RuntimeError(f"ERDDAP product is missing field {variable}")
                field = ds[variable]
                for dimension in list(field.dims):
                    if dimension not in (spec["latitude"], spec["longitude"]):
                        field = field.isel({dimension: 0})
                field = field.transpose(spec["latitude"], spec["longitude"])
                variable_arrays.append(np_module.asarray(field.values, dtype=np_module.float64))
                current_latitude = _coordinate(ds, spec["latitude"])
                current_longitude = _coordinate(ds, spec["longitude"])
                if latitude is None:
                    latitude, longitude = current_latitude, current_longitude
                    observed = timestamp
                    if spec["time"] in ds.variables:
                        time_values = np_module.asarray(ds[spec["time"]].values).reshape(-1)
                        if time_values.size:
                            observed = dt.datetime.fromisoformat(
                                np_module.datetime_as_string(time_values[0].astype("datetime64[s]"), unit="s")
                            ).replace(tzinfo=UTC)
                elif not (np_module.array_equal(latitude, current_latitude)
                          and np_module.array_equal(longitude, current_longitude)):
                    raise RuntimeError("Paired NOAA fields do not share identical latitude/longitude coordinates")
        except Exception as exc:
            raise RuntimeError(f"Could not decode NOAA {spec['dataset_id']} variable {variable}: {exc}") from exc
        finally:
            if filename:
                try:
                    os.unlink(filename)
                except FileNotFoundError:
                    pass

    lat_step = _validate_axis(latitude, "latitude")
    lon_step = _validate_axis(longitude, "longitude")
    stride = int(spec.get("subset_stride", 1))
    expected_axis_height = (int(spec.get("source_height", spec["height"])) - 1) // stride + 1
    expected_axis_width = (int(spec.get("source_width", spec["width"])) - 1) // stride + 1
    if len(latitude) != expected_axis_height or len(longitude) != expected_axis_width:
        raise RuntimeError(
            f"{spec['dataset_id']} grid changed: {len(longitude)} × {len(latitude)}; "
            f"expected {expected_axis_width} × {expected_axis_height} sampled cells"
        )
    if abs(float(latitude[0])) > 90 or abs(float(latitude[-1])) > 90:
        raise RuntimeError("ERDDAP latitude coordinates are outside the Earth")
    if min(longitude) < -180.001 or max(longitude) > 360.001:
        raise RuntimeError("ERDDAP longitude coordinates are outside a supported convention")

    if len(variable_arrays) == 2:
        if variable_arrays[0].shape != variable_arrays[1].shape:
            raise RuntimeError("Geostrophic current U/V fields do not share the same grid")
        # A scalar speed field is a valid physical magnitude derived from both
        # components; the controller does not claim this field encodes direction.
        values = np_module.hypot(variable_arrays[0], variable_arrays[1])
        values[~(np_module.isfinite(variable_arrays[0]) & np_module.isfinite(variable_arrays[1]))] = np_module.nan
    else:
        values = variable_arrays[0]


    if values.shape != (spec["height"], spec["width"]):
        raise RuntimeError(f"Decoded {spec['dataset_id']} array shape is invalid: {values.shape}")
    return values, latitude, longitude, lat_step, lon_step, observed, source_urls


def _latest_wave_product(spec: dict) -> dict:
    """Find the newest NOAA GFS-Wave cycle with a complete f003 global file."""
    cache_key = spec["dataset_id"]
    if cache_key in _WAVE_LATEST_CACHE:
        return _WAVE_LATEST_CACHE[cache_key]

    root = f"{spec['base']}/pub/data/nccf/com/gfs/prod"
    now = dt.datetime.now(UTC)
    for back in range(0, 4):
        day = now.date() - dt.timedelta(days=back)
        ymd = day.strftime("%Y%m%d")
        for hour in (18, 12, 6, 0):
            cycle = dt.datetime.combine(day, dt.time(hour), tzinfo=UTC)
            if cycle > now:
                continue
            hh = f"{hour:02d}"
            directory = f"{root}/gfs.{ymd}/{hh}/wave/gridded/"
            try:
                listing = _get(directory, MAX_INFO_BYTES).text
            except Exception:
                continue
            # f003 is a short-lead forecast available shortly after the cycle;
            # fall back to the analysis only if that is the only published field.
            for forecast_hour in (int(spec.get("forecast_hour", 3)), 0):
                filename = f"gfswave.t{hh}z.global.0p25.f{forecast_hour:03d}.grib2"
                if re.search(r"(?:href=[\"']?[^\"'>]*/)?" + re.escape(filename) + r"(?:[\"'>]|\s)", listing, re.IGNORECASE):
                    result = {
                        "cycle": cycle,
                        "forecast_hour": forecast_hour,
                        "valid_time": cycle + dt.timedelta(hours=forecast_hour),
                        "filename": filename,
                        "source_url": directory + filename,
                    }
                    _WAVE_LATEST_CACHE[cache_key] = result
                    return result
    raise RuntimeError("NOAA NOMADS has no complete recent GFS-Wave global 0.25-degree file in the latest four days")


def _decode_noaa_gfswave(spec: dict, product: dict):
    """Download and decode NOAA's HTSGW field from a global GFS-Wave GRIB2 file."""
    raw = _get(product["source_url"], cap=80 * 1024 * 1024).content
    if not raw.startswith(b"GRIB") or len(raw) < 1000:
        raise RuntimeError("NOAA NOMADS did not return a complete GFS-Wave GRIB2 file")

    fd, filename = tempfile.mkstemp(suffix=".grib2")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        with xr.open_dataset(
            filename,
            engine="cfgrib",
            backend_kwargs={"filter_by_keys": {"shortName": "swh"}, "indexpath": ""},
        ) as source:
            if not source.data_vars:
                raise RuntimeError("NOAA GFS-Wave GRIB2 contains no significant wave-height field")
            variable = "swh" if "swh" in source.data_vars else next(iter(source.data_vars))
            field = source[variable]
            for dimension in list(field.dims):
                if dimension not in ("latitude", "longitude"):
                    field = field.isel({dimension: 0})
            field = field.transpose("latitude", "longitude")
            values = np.asarray(field.values, dtype=np.float64)
            latitude = _coordinate(source, "latitude")
            longitude = _coordinate(source, "longitude")
    finally:
        try:
            os.unlink(filename)
        except FileNotFoundError:
            pass

    if values.shape != (spec["height"], spec["width"]):
        raise RuntimeError(
            f"NOAA GFS-Wave grid changed: {values.shape[1]} × {values.shape[0]}; "
            f"expected {spec['width']} × {spec['height']}"
        )
    lat_step = _validate_axis(latitude, "latitude")
    lon_step = _validate_axis(longitude, "longitude")
    if not np.allclose(np.abs(lat_step), 0.25, atol=1e-5) or not np.allclose(np.abs(lon_step), 0.25, atol=1e-5):
        raise RuntimeError("NOAA GFS-Wave grid is not the expected global 0.25-degree grid")
    if not np.isclose(latitude[0], 90.0, atol=1e-5) or not np.isclose(latitude[-1], -90.0, atol=1e-5):
        raise RuntimeError("NOAA GFS-Wave latitude axis does not span the documented -90 to 90 degrees")
    if not np.isclose(longitude[0], 0.0, atol=1e-5) or not np.isclose(longitude[-1], 359.75, atol=1e-5):
        raise RuntimeError("NOAA GFS-Wave longitude axis does not span the documented 0 to 359.75 degrees")
    return values, latitude, longitude, lat_step, lon_step


def _latest(spec: dict) -> dt.datetime:
    key = (spec["base"], spec["dataset_id"])
    if key not in _LATEST_CACHE:
        _LATEST_CACHE[key] = _latest_time(*key)
    return _LATEST_CACHE[key]


def is_due(dataset: dict) -> bool:
    """Skip unchanged runs when the source's latest published time has not moved."""
    dataset_id = dataset.get("dataset_id")
    spec = DATASETS.get(dataset_id)
    if spec is None:
        return True
    metadata_path = DB_ROOT / "values" / dataset_id / "metadata.json"
    if not metadata_path.is_file():
        return True
    try:
        current = json.loads(metadata_path.read_text(encoding="utf-8"))
        if spec.get("mode") == "noaa_ncep_gfswave":
            latest = _latest_wave_product(spec)
            return (
                current.get("source_cycle_utc") != _iso(latest["cycle"])
                or int(current.get("forecast_hour", -1)) != latest["forecast_hour"]
                or current.get("valid_time_utc") != _iso(latest["valid_time"])
            )
        return current.get("valid_time_utc") != _iso(_latest(spec))
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return True


def _collect_noaa_gfswave(dataset: dict, spec: dict) -> dict:
    product = _latest_wave_product(spec)
    values, latitude, longitude, lat_step, lon_step = _decode_noaa_gfswave(spec, product)
    retrieved = _iso(dt.datetime.now(UTC))
    observed = _iso(product["valid_time"])
    valid = np.isfinite(values) & (values >= spec["valid_min"]) & (values <= spec["valid_max"])
    valid_count = int(valid.sum())
    total_count = int(values.size)
    if valid_count < max(1000, int(total_count * 0.02)):
        raise RuntimeError(f"{dataset['dataset_id']} has too few plausible wave cells: {valid_count}/{total_count}")

    scale = int(spec["scale"])
    scaled = np.rint(values[valid] * scale)
    if np.any(scaled < -32767) or np.any(scaled > 32767):
        raise RuntimeError("NOAA GFS-Wave values exceed the approved int16 scale")
    packed = np.full(values.shape, NODATA_INT16, dtype="<i2")
    packed[valid] = scaled.astype("<i2")
    uncompressed = packed.tobytes(order="C")
    payload = gzip.compress(uncompressed, compresslevel=9, mtime=0)
    units = spec["units"]
    metadata = {
        "schema_version": 1, "data_kind": "grid", "format": f"gzip+int16-le-div-{scale}",
        "dataset_id": dataset["dataset_id"], "dataset": spec["field_label"],
        "description": spec["description"], "provider": spec["provider"],
        "product": spec["product"], "source_name": spec["product"],
        "source_id": spec["source_id"], "source_url": product["source_url"],
        "source_file": product["filename"], "source_variables": ["HTSGW"], "variable": "HTSGW",
        "processing_level": f"forecast_f{product['forecast_hour']:03d}",
        "source_cycle_utc": _iso(product["cycle"]), "forecast_hour": product["forecast_hour"],
        "valid_time_utc": observed, "retrieved_at_utc": retrieved,
        "width": int(len(longitude)), "height": int(len(latitude)),
        "coordinate_order": "latitude-longitude",
        "row_order": "south-to-north" if lat_step > 0 else "north-to-south",
        "latitude_first": float(latitude[0]), "latitude_step": lat_step,
        "longitude_first": float(longitude[0]), "longitude_step": lon_step,
        "longitude_convention": "0..360", "units": units, "scale_factor": scale,
        "nodata_value": float(np.float32(NODATA_INT16 / scale)),
        "encoding": f"little-endian signed int16; value = stored_integer / {scale}",
        "compressed_payload": True, "published_grid_spacing_degrees": 0.25,
        "valid_cell_count": valid_count, "missing_cell_count": total_count - valid_count,
        "sha256_uncompressed_values": hashlib.sha256(uncompressed).hexdigest(),
        "quality_status": "noaa_gfs_wave_forecast_grid_validated_no_additional_interpolation",
        "coverage": spec["coverage"],
        "observation_note": "NOAA global.0p25 is a published post-processed grid interpolated from three underlying NCEP wave grids; the collector adds no further interpolation. This is a model forecast, not an instrument observation.",
    }
    observation = {
        "dataset_id": dataset["dataset_id"], "source_id": spec["source_id"],
        "observed_at": observed, "retrieved_at": retrieved,
        "value": None, "unit": units,
        "provenance": {
            "source_url": product["source_url"], "provider": spec["provider"],
            "product": spec["product"], "source_file": product["filename"],
            "parameter": "HTSGW", "forecast_hour": product["forecast_hour"],
            "source_cycle_utc": _iso(product["cycle"]),
            "method": "NOAA NCEP GFS-Wave global 0.25-degree GRIB2 HTSGW field; decoded without interpolation",
        },
        "dimensions": {"width": int(len(longitude)), "height": int(len(latitude))},
        "geometry": {"type": "global_regular_grid", "metadata": metadata},
        "quality": {"status": metadata["quality_status"], "valid_cell_count": valid_count,
                    "missing_cell_count": total_count - valid_count, "sample_mode": "native_grid"},
    }
    return {"value_payload": payload, "metadata": metadata, "observations": [observation]}


def collect(dataset: dict) -> dict:
    dataset_id = dataset.get("dataset_id")
    spec = DATASETS.get(dataset_id)
    if spec is None:
        raise ValueError(f"NOAA ocean adapter does not support {dataset_id!r}")
    if spec.get("mode") == "noaa_ncep_gfswave":
        expected_source = dataset.get("collection", {}).get("source_id")
        if expected_source != spec["source_id"]:
            raise ValueError(f"Registry source id mismatch for {dataset_id}: {expected_source!r}")
        return _collect_noaa_gfswave(dataset, spec)
    expected_source = dataset.get("collection", {}).get("source_id")
    if expected_source != spec["source_id"]:
        raise ValueError(f"Registry source id mismatch for {dataset_id}: {expected_source!r}")

    retrieved_dt = dt.datetime.now(UTC)
    latest = _latest(spec)
    values, latitude, longitude, lat_step, lon_step, observed, source_urls = _decode(spec, latest, np, xr)
    source_url = source_urls[0]
    valid = (
        np.isfinite(values)
        & (values >= spec["valid_min"])
        & (values <= spec["valid_max"])
    )
    valid_count = int(valid.sum())
    total_count = int(values.size)
    if valid_count < max(1000, int(total_count * 0.02)):
        raise RuntimeError(f"{dataset_id} has too few plausible native grid cells: {valid_count}/{total_count}")

    scale = int(spec["scale"])
    scaled = np.rint(values[valid] * scale)
    if np.any(scaled < -32767) or np.any(scaled > 32767):
        raise RuntimeError(f"{dataset_id} values exceed the approved int16 scale {scale}")
    packed = np.full(values.shape, NODATA_INT16, dtype="<i2")
    packed[valid] = scaled.astype("<i2")
    uncompressed = packed.tobytes(order="C")
    payload = gzip.compress(uncompressed, compresslevel=9, mtime=0)
    retrieved = _iso(retrieved_dt)
    observed_text = _iso(observed)
    longitude_convention = "0..360" if float(np.min(longitude)) >= 0 else "-180..180"
    row_order = "south-to-north" if lat_step > 0 else "north-to-south"
    units = spec["units"]
    source_name = spec["field_label"]
    metadata = {
        "schema_version": 1,
        "data_kind": "grid",
        "format": f"gzip+int16-le-div-{scale}",
        "dataset_id": dataset_id,
        "dataset": source_name,
        "description": spec["description"],
        "provider": spec["provider"],
        "product": spec["product"],
        "source_name": spec["product"],
        "source_id": expected_source,
        "source_url": source_url,
        "source_urls": source_urls,
        "source_file": f"{spec['dataset_id']}.nc",
        "source_variables": list(spec["variables"]),
        "variable": "+".join(spec["variables"]),
        "processing_level": "latest_published_source_grid",
        "width": int(len(longitude)),
        "height": int(len(latitude)),
        "coordinate_order": "latitude-longitude",
        "row_order": row_order,
        "latitude_first": float(latitude[0]),
        "latitude_step": lat_step,
        "longitude_first": float(longitude[0]),
        "longitude_step": lon_step,
        "longitude_convention": longitude_convention,
        "units": units,
        "scale_factor": scale,
        "nodata_value": float(np.float32(NODATA_INT16 / scale)),
        "encoding": f"little-endian signed int16; value = stored_integer / {scale}",
        "compressed_payload": True,
        "valid_time_utc": observed_text,
        "retrieved_at_utc": retrieved,
        "native_grid_spacing_degrees": {
            "latitude": abs(lat_step) / int(spec.get("subset_stride", 1)),
            "longitude": abs(lon_step) / int(spec.get("subset_stride", 1)),
        },
        "stored_grid_spacing_degrees": {"latitude": abs(lat_step), "longitude": abs(lon_step)},
        "source_sample_stride": int(spec.get("subset_stride", 1)),
        "valid_cell_count": valid_count,
        "missing_cell_count": total_count - valid_count,
        "sha256_uncompressed_values": hashlib.sha256(uncompressed).hexdigest(),
        "quality_status": "native_grid_downloaded_validated_no_interpolation",
        "coverage": spec["coverage"],
        "observation_note": (
            "Source grid values are retained without interpolation; missing and out-of-range cells remain no-data."
            if int(spec.get("subset_stride", 1)) == 1 else
            f"One of every {int(spec['subset_stride'])} source cells is sampled to keep the display grid within common GPU texture limits; no interpolation is applied."
        ),
    }
    observation = {
        "dataset_id": dataset_id,
        "source_id": expected_source,
        "observed_at": observed_text,
        "retrieved_at": retrieved,
        "value": None,
        "unit": units,
        "provenance": {
            "source_url": source_url,
            "source_urls": source_urls,
            "provider": spec["provider"],
            "product": spec["product"],
            "source_variables": list(spec["variables"]),
            "method": spec["description"],
        },
        "dimensions": {"width": int(len(longitude)), "height": int(len(latitude))},
        "geometry": {"type": "global_regular_grid", "metadata": metadata},
        "quality": {
            "status": "native_grid_downloaded_validated_no_interpolation",
            "valid_cell_count": valid_count,
            "missing_cell_count": total_count - valid_count,
            "sample_mode": "sampled_native_grid" if int(spec.get("subset_stride", 1)) > 1 else "native_grid",
        },
    }
    return {"value_payload": payload, "metadata": metadata, "observations": [observation]}
