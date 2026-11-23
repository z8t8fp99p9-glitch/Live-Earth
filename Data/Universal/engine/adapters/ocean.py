from __future__ import annotations

"""Fresh NOAA/NASA Ocean adapter for the LIVE // EARTH Universal Collector.

Every layer is collected as a current numeric grid and stored through the
existing atomic current-value store. Source grids are sampled only where a
fixed integer stride is declared; no interpolation or synthetic values are
introduced. All sources are public and require no account or API key.
"""

import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import os
import re
import tempfile
import time
from pathlib import Path
from urllib.parse import quote

import numpy as np
import requests
import xarray as xr

UTC = dt.timezone.utc
ROOT = Path(__file__).resolve().parents[4]
DB_ROOT = ROOT / "Data" / "Central-Database"
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "LIVE-EARTH-Universal-Collector/2.0 (public NOAA NASA open-data client)"
})

MAX_INFO_BYTES = 12 * 1024 * 1024
MAX_AXIS_BYTES = 2 * 1024 * 1024
MAX_NETCDF_BYTES = 160 * 1024 * 1024
MAX_GRIB_BYTES = 80 * 1024 * 1024
NODATA = -32768

# Each ERDDAP specification lists dimensions in the exact variable order:
# time, optional singleton vertical dimensions, latitude, longitude.
# Coordinate arrays are read from ERDDAP before requests are constructed, so
# selectors use coordinate values (not array indices).
DATASETS = {
    "earth.oceans.sea_temperature": {
        "kind": "erddap", "dataset_id": "ncdcOisst21Agg_LonPM180",
        "base": "https://upwell.pfeg.noaa.gov/erddap",
        "variables": ("sst",), "extra_dims": ("zlev",),
        "source_id": "noaa_ncei_oisst21", "cadence": "daily",
        "units": "degree_C", "scale": 100, "valid_min": -3.0, "valid_max": 45.0,
        "max_age_days": 30, "stride": 1,
        "provider": "NOAA National Centers for Environmental Information",
        "product": "Daily Optimum Interpolation Sea Surface Temperature (OISST) v2.1, AVHRR-only, final",
        "description": "Global daily sea-surface temperature analysis. NOAA final OISST is a delayed final analysis; the observed time is retained from the source coordinate.",
        "field_label": "Sea surface temperature",
    },
    "earth.oceans.ocean_currents": {
        "kind": "erddap", "dataset_id": "noaacwBLENDEDNRTcurrentsDaily",
        "base": "https://polarwatch.noaa.gov/erddap",
        "variables": ("ugos", "vgos"), "extra_dims": (),
        "source_id": "noaa_coastwatch_nrt_currents", "cadence": "daily",
        "units": "metre_per_second", "scale": 100, "valid_min": 0.0, "valid_max": 8.0,
        "max_age_days": 14, "stride": 1,
        "provider": "NOAA CoastWatch / PolarWatch",
        "product": "Global near-real-time daily geostrophic surface currents from satellite altimetry",
        "description": "Scalar geostrophic current speed derived from the source eastward and northward velocity components; direction is not encoded in this scalar layer.",
        "field_label": "Geostrophic current speed",
    },
    "earth.oceans.sea_level": {
        "kind": "erddap", "dataset_id": "noaacwBLENDEDsshDaily",
        "base": "https://polarwatch.noaa.gov/erddap",
        "variables": ("sla",), "extra_dims": (),
        "source_id": "noaa_coastwatch_nrt_sla", "cadence": "daily",
        "units": "m", "scale": 1000, "valid_min": -5.0, "valid_max": 5.0,
        "max_age_days": 14, "stride": 1,
        "provider": "NOAA CoastWatch / PolarWatch",
        "product": "Global near-real-time daily sea-surface height anomaly from satellite altimetry",
        "description": "Sea-level anomaly relative to the source product reference surface; this is an anomaly field, not absolute ocean depth.",
        "field_label": "Sea level anomaly",
    },
    "earth.oceans.salinity": {
        "kind": "erddap", "dataset_id": "coastwatchSMOSv662SSS1day",
        "base": "https://coastwatch.pfeg.noaa.gov/erddap",
        "variables": ("sss",), "extra_dims": ("altitude",),
        "source_id": "noaa_coastwatch_smos", "cadence": "daily",
        "units": "PSU", "scale": 100, "valid_min": 0.0, "valid_max": 50.0,
        "max_age_days": 14, "stride": 1,
        "provider": "NOAA NESDIS CoastWatch",
        "product": "MIRAS SMOS near-real-time daily sea-surface salinity, global 0.25 degree",
        "description": "Daily sea-surface salinity derived from ESA SMOS satellite observations and distributed openly by NOAA CoastWatch.",
        "field_label": "Sea surface salinity",
    },
    "earth.oceans.wave_height": {
        "kind": "gfswave", "source_id": "noaa_ncep_gfs_wave",
        "base": "https://nomads.ncep.noaa.gov",
        "cadence": "6-hourly", "units": "m", "scale": 100,
        "valid_min": 0.0, "valid_max": 60.0,
        "provider": "NOAA / National Centers for Environmental Prediction",
        "product": "Global GFS-Wave 0.25 degree WAVEWATCH III forecast",
        "description": "Significant height of combined wind waves and swell (HTSGW) from the operational NOAA GFS-Wave forecast. This is a model forecast, not a satellite or buoy observation.",
        "field_label": "Significant wave height", "forecast_hour": 3,
    },
    "earth.oceans.chlorophyll": {
        "kind": "erddap", "dataset_id": "erdMH1chla1day_R2022NRT",
        "base": "https://coastwatch.pfeg.noaa.gov/erddap",
        "variables": ("chlorophyll",), "extra_dims": (),
        "source_id": "nasa_modis_aqua_chlorophyll_noaa_erddap", "cadence": "daily",
        "units": "mg m-3", "scale": 10, "valid_min": 0.001, "valid_max": 100.0,
        "max_age_days": 14, "stride": 3,
        "provider": "NASA Goddard Space Flight Center Ocean Biology Processing Group (NOAA CoastWatch distribution)",
        "product": "Aqua MODIS Level-3 mapped daily chlorophyll-a, R2022 near-real-time, global 4 km",
        "description": "Daily global chlorophyll-a concentration from NASA Aqua MODIS. Every third native source cell is sampled to fit the existing Ocean GPU grid contract; no interpolation is performed.",
        "field_label": "Chlorophyll-a concentration",
    },
}

_LATEST_CACHE: dict[tuple[str, str], dt.datetime] = {}
_INFO_CACHE: dict[tuple[str, str], list[dict]] = {}
_AXIS_CACHE: dict[tuple[str, str, str], np.ndarray] = {}
_WAVE_CACHE: dict[str, dict] = {}


def _iso(value: dt.datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _get(url: str, cap: int, attempts: int = 3) -> requests.Response:
    last_error = None
    for attempt in range(attempts):
        try:
            response = SESSION.get(url, timeout=(25, 240))
            if response.status_code == 429 or 500 <= response.status_code < 600:
                last_error = RuntimeError(f"HTTP {response.status_code}: {response.url}")
                if attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
                    continue
            response.raise_for_status()
            if not response.content or len(response.content) > cap:
                raise RuntimeError(f"Unexpected response size: {len(response.content)} bytes")
            return response
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Public source request failed: {last_error}")


def _dataset_info(spec: dict) -> list[dict]:
    key = (spec["base"], spec["dataset_id"])
    if key in _INFO_CACHE:
        return _INFO_CACHE[key]
    url = f"{spec['base']}/info/{spec['dataset_id']}/index.json"
    payload = _get(url, MAX_INFO_BYTES).json()
    table = payload.get("table") or {}
    columns, rows = table.get("columnNames") or [], table.get("rows") or []
    if not columns or not rows:
        raise RuntimeError(f"ERDDAP metadata has no table rows for {spec['dataset_id']}")
    records = [dict(zip(columns, row)) for row in rows]
    _INFO_CACHE[key] = records
    return records


def _latest_erddap_time(spec: dict) -> dt.datetime:
    key = (spec["base"], spec["dataset_id"])
    if key in _LATEST_CACHE:
        return _LATEST_CACHE[key]
    records = _dataset_info(spec)
    latest = None
    for record in records:
        if (str(record.get("Row Type", "")).lower() == "attribute"
                and record.get("Variable Name") == "time"
                and record.get("Attribute Name") == "actual_range"):
            numbers = re.findall(r"[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?", str(record.get("Value", "")))
            if len(numbers) >= 2:
                latest = dt.datetime.fromtimestamp(float(numbers[-1]), UTC)
                break
    if latest is None:
        for record in records:
            if (str(record.get("Row Type", "")).lower() == "attribute"
                    and record.get("Attribute Name") == "time_coverage_end"):
                try:
                    latest = dt.datetime.fromisoformat(str(record.get("Value", "")).replace("Z", "+00:00"))
                    if latest.tzinfo is None:
                        latest = latest.replace(tzinfo=UTC)
                    latest = latest.astimezone(UTC)
                    break
                except ValueError:
                    pass
    if latest is None:
        raise RuntimeError(f"No latest time coordinate is published for {spec['dataset_id']}")
    age = dt.datetime.now(UTC) - latest
    if age > dt.timedelta(days=int(spec["max_age_days"])):
        raise RuntimeError(
            f"{spec['dataset_id']} latest observation is stale ({age.days} days old; "
            f"limit {spec['max_age_days']} days): {_iso(latest)}"
        )
    _LATEST_CACHE[key] = latest
    return latest


def _resolve_variables(spec: dict) -> tuple[str, ...]:
    """Resolve the provider's current variable names from its public metadata."""
    records = _dataset_info(spec)
    by_name: dict[str, dict[str, str]] = {}
    for row in records:
        name = row.get("Variable Name")
        if not name or str(row.get("Row Type", "")).lower() not in ("variable", "attribute"):
            continue
        attrs = by_name.setdefault(str(name), {})
        attr = row.get("Attribute Name")
        if attr:
            attrs[str(attr).lower()] = str(row.get("Value", ""))
    names = list(by_name)
    preferred = spec["variables"]
    if all(name in by_name for name in preferred):
        return tuple(preferred)

    def text_for(name: str) -> str:
        attrs = by_name[name]
        return " ".join((name, attrs.get("long_name", ""), attrs.get("standard_name", ""), attrs.get("ioos_category", ""))).lower().replace("_", " ")

    if spec.get("field_label") == "Geostrophic current speed":
        east = next((n for n in names if any(k in text_for(n) for k in ("eastward sea water velocity", "zonal component", "eastward current"))), None)
        north = next((n for n in names if any(k in text_for(n) for k in ("northward sea water velocity", "meridional component", "meridian component", "northward current"))), None)
        if east and north:
            return east, north
    if spec.get("field_label") == "Sea level anomaly":
        match = next((n for n in names if any(k in text_for(n) for k in ("sea level anomal", "sea surface height anomal", "sea surface height above sea level"))), None)
        if match:
            return (match,)
    for name in names:
        if "salinity" in text_for(name) and spec.get("units") == "PSU":
            return (name,)
        if "chlorophyll" in text_for(name) and spec.get("units") == "mg m-3":
            return (name,)
        if "sea surface temperature" in text_for(name) and spec.get("units") == "degree_C":
            return (name,)
    raise RuntimeError(f"Could not identify the required field variables in {spec['dataset_id']} metadata; found {names}")


def _axis_values(spec: dict, axis_name: str) -> np.ndarray:
    key = (spec["base"], spec["dataset_id"], axis_name)
    if key in _AXIS_CACHE:
        return _AXIS_CACHE[key]
    url = f"{spec['base']}/griddap/{spec['dataset_id']}.csv?{axis_name}"
    text = _get(url, MAX_AXIS_BYTES).text
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
    if not np.isfinite(step) or abs(step) < 1e-10 or not np.allclose(delta, step, rtol=0.0, atol=max(1e-7, abs(step) * 1e-4)):
        raise RuntimeError(f"{spec['dataset_id']} {axis_name} axis is not a regular native grid")
    _AXIS_CACHE[key] = axis
    return axis


def _number(value: float) -> str:
    return format(float(value), ".12g")


def _axis_selector(axis: np.ndarray, stride: int) -> tuple[str, np.ndarray]:
    if stride < 1:
        raise ValueError("Grid sampling stride must be a positive integer")
    selected = axis[::stride]
    if selected.size < 2:
        raise RuntimeError("Sampling stride leaves fewer than two grid coordinates")
    step = float(np.median(np.diff(axis))) * stride
    if not np.allclose(np.diff(selected), step, rtol=0.0, atol=max(1e-7, abs(step) * 1e-4)):
        raise RuntimeError("Sampled coordinate axis is not regular; refusing to resample")
    return f"[({_number(selected[0])}):{_number(step)}:({_number(selected[-1])})]", selected


def _request_erddap(spec: dict, timestamp: dt.datetime, variable: str) -> tuple[bytes, str, np.ndarray, np.ndarray]:
    lat = _axis_values(spec, "latitude")
    lon = _axis_values(spec, "longitude")
    stride = int(spec.get("stride", 1))
    lat_selector, selected_lat = _axis_selector(lat, stride)
    lon_selector, selected_lon = _axis_selector(lon, stride)
    selectors = [f"[({_iso(timestamp)})]"]
    selectors.extend("[(0)]" for _ in spec.get("extra_dims", ()))
    selectors.extend((lat_selector, lon_selector))
    query = variable + "".join(selectors)
    url = f"{spec['base']}/griddap/{spec['dataset_id']}.nc?{quote(query, safe='[]():,+-.TZ')}"
    raw = _get(url, MAX_NETCDF_BYTES).content
    if not raw.startswith((b"CDF\x01", b"CDF\x02", b"\x89HDF\r\n\x1a\n")):
        raise RuntimeError(f"ERDDAP did not return a NetCDF grid for {spec['dataset_id']} / {variable}")
    return raw, url, selected_lat, selected_lon


def _decode_erddap(spec: dict, timestamp: dt.datetime):
    arrays, urls = [], []
    lat_ref = lon_ref = observed = None
    resolved_variables = _resolve_variables(spec)
    for variable in resolved_variables:
        raw, url, requested_lat, requested_lon = _request_erddap(spec, timestamp, variable)
        urls.append(url)
        fd, path = tempfile.mkstemp(suffix=".nc")
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(raw)
            with xr.open_dataset(path, engine="netcdf4", decode_cf=True, mask_and_scale=True) as ds:
                if variable not in ds.data_vars:
                    raise RuntimeError(f"Source grid is missing variable {variable}")
                field = ds[variable]
                for dim in list(field.dims):
                    if dim not in ("latitude", "longitude"):
                        field = field.isel({dim: 0})
                field = field.transpose("latitude", "longitude")
                values = np.asarray(field.values, dtype=np.float64)
                lat = np.asarray(ds["latitude"].values, dtype=np.float64).reshape(-1)
                lon = np.asarray(ds["longitude"].values, dtype=np.float64).reshape(-1)
                if not np.allclose(lat, requested_lat, rtol=0.0, atol=1e-6):
                    raise RuntimeError("Returned latitude coordinates differ from the requested native sample")
                if not np.allclose(lon, requested_lon, rtol=0.0, atol=1e-6):
                    raise RuntimeError("Returned longitude coordinates differ from the requested native sample")
                if values.shape != (lat.size, lon.size):
                    raise RuntimeError(f"Decoded field shape {values.shape} does not match its coordinates")
                if lat_ref is None:
                    lat_ref, lon_ref = lat, lon
                    time_values = np.asarray(ds["time"].values).reshape(-1) if "time" in ds.variables else []
                    if len(time_values):
                        observed = dt.datetime.fromisoformat(
                            np.datetime_as_string(time_values[0].astype("datetime64[s]"), unit="s")
                        ).replace(tzinfo=UTC)
                    else:
                        observed = timestamp
                elif not (np.array_equal(lat_ref, lat) and np.array_equal(lon_ref, lon)):
                    raise RuntimeError("Paired source variables do not share identical coordinates")
                arrays.append(values)
        except Exception as exc:
            raise RuntimeError(f"Could not decode {spec['dataset_id']} variable {variable}: {exc}") from exc
        finally:
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass

    if len(arrays) == 2:
        values = np.hypot(arrays[0], arrays[1])
        values[~(np.isfinite(arrays[0]) & np.isfinite(arrays[1]))] = np.nan
    else:
        values = arrays[0]
    return values, lat_ref, lon_ref, observed, urls


def _latest_wave_product(spec: dict) -> dict:
    cache_key = "gfswave_global_0p25"
    if cache_key in _WAVE_CACHE:
        return _WAVE_CACHE[cache_key]
    root = f"{spec['base']}/pub/data/nccf/com/gfs/prod"
    now = dt.datetime.now(UTC)
    for back in range(0, 4):
        day = now.date() - dt.timedelta(days=back)
        ymd = day.strftime("%Y%m%d")
        for hour in (18, 12, 6, 0):
            cycle = dt.datetime.combine(day, dt.time(hour), tzinfo=UTC)
            if cycle > now - dt.timedelta(hours=2):
                continue
            hh = f"{hour:02d}"
            directory = f"{root}/gfs.{ymd}/{hh}/wave/gridded/"
            try:
                listing = _get(directory, MAX_INFO_BYTES).text
            except Exception:
                continue
            for forecast_hour in (int(spec.get("forecast_hour", 3)), 0):
                filename = f"gfswave.t{hh}z.global.0p25.f{forecast_hour:03d}.grib2"
                if re.search(re.escape(filename), listing, re.IGNORECASE):
                    if now - cycle > dt.timedelta(hours=18):
                        continue
                    product = {
                        "cycle": cycle, "forecast_hour": forecast_hour,
                        "valid_time": cycle + dt.timedelta(hours=forecast_hour),
                        "filename": filename, "source_url": directory + filename,
                    }
                    _WAVE_CACHE[cache_key] = product
                    return product
    raise RuntimeError("NOAA NOMADS has no complete recent global 0.25-degree GFS-Wave file")


def _decode_wave(spec: dict, product: dict):
    raw = _get(product["source_url"], MAX_GRIB_BYTES).content
    if not raw.startswith(b"GRIB") or len(raw) < 1000:
        raise RuntimeError("NOAA NOMADS did not return a complete GFS-Wave GRIB2 file")
    fd, path = tempfile.mkstemp(suffix=".grib2")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        with xr.open_dataset(
            path, engine="cfgrib",
            backend_kwargs={"filter_by_keys": {"shortName": "swh"}, "indexpath": ""},
        ) as source:
            if not source.data_vars:
                raise RuntimeError("GFS-Wave GRIB2 contains no significant wave-height field")
            name = "swh" if "swh" in source.data_vars else next(iter(source.data_vars))
            field = source[name]
            for dim in list(field.dims):
                if dim not in ("latitude", "longitude"):
                    field = field.isel({dim: 0})
            values = np.asarray(field.transpose("latitude", "longitude").values, dtype=np.float64)
            lat = np.asarray(source["latitude"].values, dtype=np.float64).reshape(-1)
            lon = np.asarray(source["longitude"].values, dtype=np.float64).reshape(-1)
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass
    if values.shape != (721, 1440) or lat.size != 721 or lon.size != 1440:
        raise RuntimeError(f"GFS-Wave returned {values.shape}; expected 1440 × 721")
    if not np.allclose(np.diff(lat), -0.25, atol=1e-5) and not np.allclose(np.diff(lat), 0.25, atol=1e-5):
        raise RuntimeError("GFS-Wave latitude spacing is not 0.25 degrees")
    if not np.allclose(np.diff(lon), 0.25, atol=1e-5):
        raise RuntimeError("GFS-Wave longitude spacing is not 0.25 degrees")
    if not (np.isclose(abs(float(lat[0])), 90.0, atol=1e-5) and np.isclose(abs(float(lat[-1])), 90.0, atol=1e-5)):
        raise RuntimeError("GFS-Wave latitude axis does not span the global -90 to 90 degree grid")
    if not (np.isclose(float(lon[0]), 0.0, atol=1e-5) and np.isclose(float(lon[-1]), 359.75, atol=1e-5)):
        raise RuntimeError("GFS-Wave longitude axis does not span the global 0 to 359.75 degree grid")
    return values, lat, lon


def _pack(values: np.ndarray, spec: dict):
    valid = np.isfinite(values) & (values >= float(spec["valid_min"])) & (values <= float(spec["valid_max"]))
    count = int(valid.sum())
    total = int(values.size)
    if count < max(1000, int(total * 0.02)):
        raise RuntimeError(f"Only {count}/{total} cells are valid; refusing to publish an empty or mostly missing field")
    scale = int(spec["scale"])
    scaled = np.rint(values[valid] * scale)
    if np.any(scaled < -32767) or np.any(scaled > 32767):
        raise RuntimeError(f"Values exceed signed int16 range at scale {scale}")
    packed = np.full(values.shape, NODATA, dtype="<i2")
    packed[valid] = scaled.astype("<i2")
    raw = packed.tobytes(order="C")
    payload = gzip.compress(raw, compresslevel=9, mtime=0)
    return payload, raw, valid, count, total


def _result(dataset: dict, spec: dict, values: np.ndarray, lat: np.ndarray, lon: np.ndarray,
            observed: dt.datetime, source_urls: list[str], extra: dict | None = None) -> dict:
    payload, raw, valid, valid_count, total_count = _pack(values, spec)
    retrieved = _iso(dt.datetime.now(UTC))
    lat_step = float(np.median(np.diff(lat)))
    lon_step = float(np.median(np.diff(lon)))
    stride = int(spec.get("stride", 1))
    scale = int(spec["scale"])
    longitude_convention = "0..360" if float(np.min(lon)) >= 0 else "-180..180"
    metadata = {
        "schema_version": 1, "data_kind": "grid", "format": f"gzip+int16-le-div-{scale}",
        "dataset_id": dataset["dataset_id"], "dataset": spec["field_label"],
        "description": spec["description"], "provider": spec["provider"],
        "product": spec["product"], "source_name": spec["product"],
        "source_id": spec["source_id"], "source_url": source_urls[0], "source_urls": source_urls,
        "source_file": source_urls[0].rsplit("/", 1)[-1],
        "source_variables": list((extra or {}).get("source_variables", spec.get("variables", ("HTSGW",)))),
        "variable": "+".join((extra or {}).get("source_variables", spec.get("variables", ("HTSGW",)))),
        "processing_level": (extra or {}).get("processing_level", "latest_published_source_grid"),
        "valid_time_utc": _iso(observed), "retrieved_at_utc": retrieved,
        "width": int(lon.size), "height": int(lat.size),
        "coordinate_order": "latitude-longitude",
        "row_order": "south-to-north" if lat_step > 0 else "north-to-south",
        "latitude_first": float(lat[0]), "latitude_step": lat_step,
        "longitude_first": float(lon[0]), "longitude_step": lon_step,
        "longitude_convention": longitude_convention,
        "units": spec["units"], "scale_factor": scale,
        "nodata_value": float(np.float32(NODATA / scale)),
        "encoding": f"little-endian signed int16; value = stored_integer / {scale}",
        "compressed_payload": True,
        "native_grid_spacing_degrees": {"latitude": abs(lat_step) / stride, "longitude": abs(lon_step) / stride},
        "stored_grid_spacing_degrees": {"latitude": abs(lat_step), "longitude": abs(lon_step)},
        "source_sample_stride": stride,
        "valid_cell_count": valid_count, "missing_cell_count": total_count - valid_count,
        "sha256_uncompressed_values": hashlib.sha256(raw).hexdigest(),
        "quality_status": "source_grid_downloaded_validated_no_interpolation",
        "observation_note": "Source grid values are retained without interpolation. Missing, land, and out-of-range cells remain no-data.",
    }
    if extra:
        metadata.update(extra)
    observation = {
        "dataset_id": dataset["dataset_id"], "source_id": spec["source_id"],
        "observed_at": _iso(observed), "retrieved_at": retrieved,
        "value": None, "unit": spec["units"],
        "provenance": {
            "source_url": source_urls[0], "source_urls": source_urls,
            "provider": spec["provider"], "product": spec["product"],
            "source_files": [u.rsplit("/", 1)[-1] for u in source_urls],
            "method": "Public source grid decoded, validated, sampled only by declared integer stride, and packed without interpolation.",
        },
        "dimensions": {"width": int(lon.size), "height": int(lat.size)},
        "geometry": {"type": "global_regular_grid", "metadata": metadata},
        "quality": {"status": metadata["quality_status"], "valid_cell_count": valid_count,
                    "missing_cell_count": total_count - valid_count, "sample_mode": "native_grid_stride" if stride > 1 else "native_grid"},
    }
    return {"value_payload": payload, "metadata": metadata, "observations": [observation]}


def is_due(dataset: dict) -> bool:
    """Skip a dataset only when its latest source timestamp is already stored."""
    dataset_id = dataset.get("dataset_id")
    spec = DATASETS.get(dataset_id)
    if spec is None:
        return True
    metadata_path = DB_ROOT / "values" / dataset_id / "metadata.json"
    if not metadata_path.is_file():
        return True
    try:
        current = json.loads(metadata_path.read_text(encoding="utf-8"))
        if spec["kind"] == "gfswave":
            product = _latest_wave_product(spec)
            return (
                current.get("source_cycle_utc") != _iso(product["cycle"])
                or int(current.get("forecast_hour", -1)) != int(product["forecast_hour"])
                or current.get("valid_time_utc") != _iso(product["valid_time"])
            )
        return current.get("valid_time_utc") != _iso(_latest_erddap_time(spec))
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return True


def collect(dataset: dict) -> dict:
    dataset_id = dataset.get("dataset_id")
    spec = DATASETS.get(dataset_id)
    if spec is None:
        raise ValueError(f"Ocean adapter does not support {dataset_id!r}")
    expected_source = dataset.get("collection", {}).get("source_id")
    if expected_source != spec["source_id"]:
        raise ValueError(f"Registry source id mismatch for {dataset_id}: {expected_source!r}")

    if spec["kind"] == "gfswave":
        product = _latest_wave_product(spec)
        values, lat, lon = _decode_wave(spec, product)
        observed = product["valid_time"]
        extra = {
            "source_file": product["filename"], "source_url": product["source_url"],
            "source_cycle_utc": _iso(product["cycle"]), "forecast_hour": product["forecast_hour"],
            "processing_level": f"forecast_f{product['forecast_hour']:03d}",
            "quality_status": "noaa_gfs_wave_forecast_grid_validated_no_interpolation",
            "observation_note": "NOAA GFS-Wave global.0p25 published post-processed model grid; the collector performs no additional interpolation. Forecast, not direct instrument observation.",
        }
        return _result(dataset, spec, values, lat, lon, observed, [product["source_url"]], extra)

    latest = _latest_erddap_time(spec)
    values, lat, lon, observed, urls = _decode_erddap(spec, latest)
    extra = {
        "source_variables": list(_resolve_variables(spec)),
        "source_file": f"{spec['dataset_id']}.nc",
        "processing_level": "latest_published_source_grid",
        "quality_status": "native_source_grid_validated_no_interpolation" if int(spec.get("stride", 1)) == 1 else "native_source_grid_sampled_by_integer_stride_no_interpolation",
    }
    return _result(dataset, spec, values, lat, lon, observed, urls, extra)
