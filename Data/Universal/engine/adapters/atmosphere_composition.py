from __future__ import annotations

"""Anonymous NOAA GFS fields for Atmospheric Composition.

The three fields are global forecast-model products:
- PWAT: total-column precipitable water (kg m-2)
- TCDC: total cloud cover (%)
- TOZNE: total-column ozone (Dobson units)

They are not direct satellite/instrument observations. The collector stores
only the latest verified global grid in the existing Universal Database.
"""

import datetime as dt
import gzip
import hashlib
import json
import os
import tempfile
import time
from urllib.parse import urlencode

import numpy as np
import requests
import xarray as xr

UTC = dt.timezone.utc
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "LIVE-EARTH-Universal-Collector/1.0 (open-data visualization)"
})
MAX_GRIB_BYTES = 80 * 1024 * 1024
MAX_COMPRESSED_BYTES = 12 * 1024 * 1024

DATASETS = {
    "earth.atmosphere.water_vapour": {
        "name": "water_vapour",
        "variable": "PWAT",
        "level": "entire_atmosphere_(considered_as_a_single_layer)",
        "filter": {"typeOfLevel": "atmosphere"},
        "units": "kg/m^2",
        "scale": 100,
        "description": "Total-column precipitable water from NOAA GFS; not near-surface humidity.",
        "expected_name": "precipitable water",
        "range": (0.0, 150.0),
    },
    "earth.atmosphere.cloud_properties": {
        "name": "cloud_properties",
        "variable": "TCDC",
        "level": "entire_atmosphere",
        "filter": {"typeOfLevel": "atmosphere"},
        "units": "percent",
        "scale": 100,
        "description": "Total cloud cover from NOAA GFS; this is cloud fraction, not a full cloud microphysics product.",
        "expected_name": "total cloud cover",
        "range": (0.0, 100.0),
    },
    "earth.atmosphere.ozone": {
        "name": "ozone",
        "variable": "TOZNE",
        "level": "entire_atmosphere_(considered_as_a_single_layer)",
        "filter": {"typeOfLevel": "atmosphere"},
        "units": "Dobson_unit",
        "scale": 10,
        "description": "Total-column ozone from NOAA GFS, expressed in Dobson units.",
        "expected_name": "total ozone",
        "range": (0.0, 1000.0),
    },
}


def _iso(value):
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def latest_cycle(now=None):
    now = now or dt.datetime.now(UTC)
    for back in range(0, 4):
        day = now.date() - dt.timedelta(days=back)
        for hour in (18, 12, 6, 0):
            cycle = dt.datetime.combine(day, dt.time(hour), tzinfo=UTC)
            # The collector uses forecast hour 003, so allow that file to publish.
            if cycle <= now - dt.timedelta(hours=4):
                return cycle
    return None


def is_due(dataset):
    cycle = latest_cycle()
    if cycle is None:
        return True
    dataset_id = dataset["dataset_id"]
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "Data", "Central-Database", "values"))
    metadata_path = os.path.join(root, dataset_id, "metadata.json")
    if not os.path.isfile(metadata_path):
        return True
    try:
        with open(metadata_path, encoding="utf-8") as stream:
            metadata = json.load(stream)
        return metadata.get("source_cycle_utc") != _iso(cycle)
    except (OSError, ValueError, json.JSONDecodeError):
        return True


def _request(spec, cycle):
    ymd, hh = cycle.strftime("%Y%m%d"), cycle.strftime("%H")
    filename = f"gfs.t{hh}z.pgrb2.0p25.f003"
    params = {
        "file": filename,
        f"var_{spec['variable']}": "on",
        f"lev_{spec['level']}": "on",
        "subregion": "",
        "leftlon": "0",
        "rightlon": "359.75",
        "toplat": "90",
        "bottomlat": "-90",
        "dir": f"/gfs.{ymd}/{hh}/atmos",
    }
    url = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?" + urlencode(params)
    last_error = None
    for attempt in range(3):
        try:
            response = SESSION.get(url, timeout=(20, 240))
            if response.status_code == 429 or response.status_code >= 500:
                last_error = RuntimeError(f"NOAA NOMADS HTTP {response.status_code}")
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
            response.raise_for_status()
            payload = response.content
            if not payload.startswith(b"GRIB") or len(payload) < 1000 or len(payload) > MAX_GRIB_BYTES:
                raise RuntimeError(f"NOAA returned an invalid GRIB2 payload ({len(payload)} bytes)")
            return payload, response.url, filename
        except (requests.Timeout, requests.ConnectionError, requests.HTTPError) as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"NOAA GFS request failed for {spec['variable']}: {last_error}")


def _decode(grib, spec):
    fd, path = tempfile.mkstemp(suffix=".grib2")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(grib)
        try:
            ds = xr.open_dataset(
                path,
                engine="cfgrib",
                backend_kwargs={
                    "filter_by_keys": spec["filter"],
                    "indexpath": "",
                },
            )
        except Exception as exc:
            raise RuntimeError(
                f"Could not decode NOAA {spec['variable']} at the documented atmospheric level: {exc}"
            ) from exc
        try:
            candidates = []
            for name in ds.data_vars:
                variable = ds[name]
                grib_name = str(variable.attrs.get("GRIB_name", "")).lower()
                if spec["expected_name"] in grib_name:
                    candidates.append(name)
            if len(candidates) != 1:
                raise RuntimeError(
                    f"Expected one {spec['variable']} field, found {len(candidates)} in decoded NOAA file"
                )
            name = candidates[0]
            values = np.asarray(ds[name].values, dtype=np.float64).squeeze()
            lat = np.asarray(ds.latitude.values, dtype=np.float64).squeeze()
            lon = np.asarray(ds.longitude.values, dtype=np.float64).squeeze()
            if values.ndim != 2 or values.shape != (lat.size, lon.size):
                raise RuntimeError(f"Unexpected {spec['variable']} grid shape {values.shape}")
            if lat.size != 721 or lon.size != 1440:
                raise RuntimeError(
                    f"{spec['variable']} is not the native 1440x721 GFS 0.25-degree grid"
                )
            if not np.isfinite(values).all():
                raise RuntimeError(f"{spec['variable']} contains non-finite cells")
            if (
                abs(abs(float(np.median(np.diff(lat)))) - 0.25) > 1e-5
                or abs(abs(float(np.median(np.diff(lon)))) - 0.25) > 1e-5
            ):
                raise RuntimeError(f"{spec['variable']} coordinates are not 0.25 degrees")
            low, high = spec["range"]
            if float(values.min()) < low or float(values.max()) > high:
                raise RuntimeError(
                    f"{spec['variable']} values fall outside the physical validation range "
                    f"{low}..{high} {spec['units']}"
                )
            return values, lat, lon
        finally:
            ds.close()
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass


def collect(dataset):
    dataset_id = dataset["dataset_id"]
    spec = DATASETS.get(dataset_id)
    if spec is None:
        raise ValueError(f"No NOAA composition field configured for {dataset_id}")

    cycle = latest_cycle()
    if cycle is None:
        raise RuntimeError("No complete NOAA GFS cycle is ready for collection")

    grib, source_url, filename = _request(spec, cycle)
    values, lat, lon = _decode(grib, spec)

    packed_float = np.rint(values * spec["scale"])
    if packed_float.min() < -32768 or packed_float.max() > 32767:
        raise RuntimeError(f"{dataset_id} exceeds the approved int16 encoding range")
    packed = packed_float.astype("<i2")
    raw = packed.tobytes(order="C")
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    if len(compressed) > MAX_COMPRESSED_BYTES:
        raise RuntimeError(f"{dataset_id} compressed grid exceeds the database size limit")

    retrieved = dt.datetime.now(UTC)
    valid_time = cycle + dt.timedelta(hours=3)
    lat_step = float(np.median(np.diff(lat)))
    lon_step = float(np.median(np.diff(lon)))
    metadata = {
        "schema_version": 1,
        "world": "atmosphere",
        "data_kind": "grid",
        "dataset_id": dataset_id,
        "dataset": spec["name"],
        "description": spec["description"],
        "grid_id": "GRID_NOAA_GFS_025_V1",
        "provider": "NOAA NCEP",
        "product": "Global Forecast System (GFS) 0.25 degree forecast hour 003",
        "source_file": filename,
        "source_url": source_url,
        "source_cycle_utc": _iso(cycle),
        "forecast_hour": 3,
        "valid_time_utc": _iso(valid_time),
        "retrieved_at_utc": _iso(retrieved),
        "variable": spec["variable"],
        "units": spec["units"],
        "encoding": f"little-endian signed int16; value = stored_integer / {spec['scale']}",
        "scale_factor": spec["scale"],
        "nodata": None,
        "width": int(lon.size),
        "height": int(lat.size),
        "coordinate_order": "latitude-longitude",
        "row_order": "north-to-south" if lat_step < 0 else "south-to-north",
        "latitude_first": float(lat[0]),
        "latitude_step": lat_step,
        "longitude_first": float(lon[0]),
        "longitude_step": lon_step,
        "longitude_convention": "0..360",
        "sha256_uncompressed_values": hashlib.sha256(raw).hexdigest(),
        "compressed_bytes": len(compressed),
        "source_attribution": "NOAA National Centers for Environmental Prediction (NCEP)",
        "quality_status": "downloaded_and_grid_validated",
        "note": (
            "Public NOAA GFS forecast-model field; not a direct satellite or instrument observation. "
            "Values are not interpolated or gap-filled."
        ),
    }

    observation = {
        "dataset_id": dataset_id,
        "source_id": "noaa_ncep_gfs_025",
        "observed_at": _iso(valid_time),
        "retrieved_at": _iso(retrieved),
        "value": None,
        "unit": spec["units"],
        "dimensions": {"width": int(lon.size), "height": int(lat.size)},
        "geometry": {"type": "global_regular_grid", "metadata": metadata},
        "quality": {
            "status": "downloaded_and_grid_validated",
            "grid_id": "GRID_NOAA_GFS_025_V1",
        },
        "provenance": {
            "source_url": source_url,
            "source_variables": [spec["variable"]],
            "forecast_hour": 3,
        },
    }
    return {
        "value_payload": compressed,
        "metadata": metadata,
        "observations": [observation],
    }
