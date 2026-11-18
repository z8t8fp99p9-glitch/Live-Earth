#!/usr/bin/env python3
"""Collect verified global Atmosphere fields from one NOAA GFS analysis cycle.

All grids are native 0.25-degree GFS fields. Values are packed as little-endian
int16 with a 1/100 scale so the shared Universal Grid System can decode them.
No synthetic or interpolated values are created.
"""
from __future__ import annotations

import datetime as dt
import gzip
import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlencode

import numpy as np
import requests
import xarray as xr

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "atmosphere" / "latest"
GRID_ID = "GRID_NOAA_GFS_025_V1"
MAX_GRIB_BYTES = 80 * 1024 * 1024
MAX_COMPRESSED_BYTES = 12 * 1024 * 1024
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "LIVE-EARTH-scientific-collector/1.1 (research visualization)"})

# One requested variable and its native GFS level per request. This avoids
# mixing incompatible GRIB hypercubes and keeps each downloaded subset small.
FIELDS = [
    {
        "id": "ATMOSPHERE_01", "name": "air_temperature",
        "variable": "TMP", "level": "2_m_above_ground",
        "grib_filter": {"typeOfLevel": "heightAboveGround", "level": 2},
        "convert": lambda a: a - 273.15, "units": "degree_Celsius",
        "description": "2 m air temperature",
    },
    {
        "id": "ATMOSPHERE_02", "name": "mean_sea_level_pressure",
        "variable": "PRMSL", "level": "mean_sea_level",
        "grib_filter": {"typeOfLevel": "meanSea"},
        "convert": lambda a: a / 1000.0, "units": "kilopascal",
        "description": "Mean sea-level pressure",
    },
    {
        "id": "ATMOSPHERE_03", "name": "wind_u_component",
        "variable": "UGRD", "level": "10_m_above_ground",
        "grib_filter": {"typeOfLevel": "heightAboveGround", "level": 10},
        "convert": lambda a: a, "units": "metre_per_second",
        "description": "10 m eastward wind component (U)",
    },
    {
        "id": "ATMOSPHERE_04", "name": "wind_v_component",
        "variable": "VGRD", "level": "10_m_above_ground",
        "grib_filter": {"typeOfLevel": "heightAboveGround", "level": 10},
        "convert": lambda a: a, "units": "metre_per_second",
        "description": "10 m northward wind component (V)",
    },
    {
        "id": "ATMOSPHERE_05", "name": "relative_humidity",
        "variable": "RH", "level": "2_m_above_ground",
        "grib_filter": {"typeOfLevel": "heightAboveGround", "level": 2},
        "convert": lambda a: a, "units": "percent",
        "description": "2 m relative humidity",
    },
    {
        "id": "ATMOSPHERE_06", "name": "dew_point_temperature",
        "variable": "DPT", "level": "2_m_above_ground",
        "grib_filter": {"typeOfLevel": "heightAboveGround", "level": 2},
        "convert": lambda a: a - 273.15, "units": "degree_Celsius",
        "description": "2 m dew-point temperature",
    },
    {
        "id": "ATMOSPHERE_07", "name": "precipitable_water",
        "variable": "PWAT", "level": "entire_atmosphere_(considered_as_a_single_layer)",
        "grib_filter": {"typeOfLevel": "atmosphere"},
        "convert": lambda a: a, "units": "kilogram_per_square_metre",
        "description": "Total-column precipitable water",
    },
    {
        "id": "ATMOSPHERE_08", "name": "total_cloud_cover",
        "variable": "TCDC", "level": "entire_atmosphere",
        "grib_filter": {"typeOfLevel": "atmosphere"},
        "convert": lambda a: a, "units": "percent",
        "description": "Total atmospheric cloud cover",
    },
]

def utcnow():
    return dt.datetime.now(dt.timezone.utc)

def candidate_cycles(now):
    for back in range(0, 3):
        day = now.date() - dt.timedelta(days=back)
        for hour in (18, 12, 6, 0):
            cycle = dt.datetime.combine(day, dt.time(hour), tzinfo=dt.timezone.utc)
            if cycle <= now - dt.timedelta(hours=4):
                yield cycle

def download_field(cycle, field):
    ymd, hh = cycle.strftime("%Y%m%d"), cycle.strftime("%H")
    filename = f"gfs.t{hh}z.pgrb2.0p25.f000"
    params = {
        "file": filename,
        f"var_{field['variable']}": "on",
        f"lev_{field['level']}": "on",
        "subregion": "",
        "leftlon": "0", "rightlon": "359.75",
        "toplat": "90", "bottomlat": "-90",
        "dir": f"/gfs.{ymd}/{hh}/atmos",
    }
    url = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?" + urlencode(params)
    response = SESSION.get(url, timeout=(20, 240))
    response.raise_for_status()
    payload = response.content
    if len(payload) < 1000 or not payload.startswith(b"GRIB"):
        raise RuntimeError(f"NOAA did not return GRIB2 for {field['name']} ({ymd}/{hh}Z)")
    if len(payload) > MAX_GRIB_BYTES:
        raise RuntimeError(f"NOAA subset unexpectedly large for {field['name']}: {len(payload)} bytes")
    return payload, url, filename

def decode_field(grib_bytes, field):
    fd, filename = tempfile.mkstemp(suffix=".grib2")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(grib_bytes)
        dataset = xr.open_dataset(
            filename, engine="cfgrib",
            backend_kwargs={"filter_by_keys": field["grib_filter"], "indexpath": ""}
        )
        try:
            if not dataset.data_vars:
                raise RuntimeError(f"No decoded variable for {field['name']}")
            key = next(iter(dataset.data_vars))
            raw = np.asarray(dataset[key].values, dtype=np.float64).squeeze()
            lat = np.asarray(dataset["latitude"].values, dtype=np.float64)
            lon = np.asarray(dataset["longitude"].values, dtype=np.float64)
            if raw.ndim != 2 or raw.shape != (lat.size, lon.size):
                raise RuntimeError(f"Unexpected grid dimensions for {field['name']}")
            if not np.all(np.isfinite(raw)):
                raise RuntimeError(f"Non-finite source cells in {field['name']}")
            converted = np.asarray(field["convert"](raw), dtype=np.float64)
            packed_values = np.rint(converted * 100.0)
            if not np.all(np.isfinite(packed_values)):
                raise RuntimeError(f"Non-finite converted values in {field['name']}")
            if packed_values.min() < -32768 or packed_values.max() > 32767:
                raise RuntimeError(f"Values exceed int16 encoding range for {field['name']}")
            return packed_values.astype("<i2"), lat, lon, key
        finally:
            dataset.close()
    finally:
        try:
            os.unlink(filename)
        except FileNotFoundError:
            pass

def gzip_bytes(raw):
    return gzip.compress(raw, compresslevel=9, mtime=0)

def main():
    last_error = None
    for cycle in candidate_cycles(utcnow()):
        try:
            prepared = []
            reference_lat = reference_lon = None
            for field in FIELDS:
                grib, source_url, source_file = download_field(cycle, field)
                values, lat, lon, variable = decode_field(grib, field)
                if lat.size != 721 or lon.size != 1440:
                    raise RuntimeError(f"{field['name']} is not the approved 1440x721 grid")
                lat_step = float(np.median(np.diff(lat)))
                lon_step = float(np.median(np.diff(lon)))
                if abs(abs(lat_step) - 0.25) > 1e-5 or abs(abs(lon_step) - 0.25) > 1e-5:
                    raise RuntimeError(f"Unexpected 0.25-degree spacing for {field['name']}")
                if reference_lat is None:
                    reference_lat, reference_lon = lat.copy(), lon.copy()
                elif not (np.array_equal(lat, reference_lat) and np.array_equal(lon, reference_lon)):
                    raise RuntimeError(f"Coordinate grid differs from other Atmosphere fields: {field['name']}")
                raw = values.tobytes(order="C")
                compressed = gzip_bytes(raw)
                if len(compressed) > MAX_COMPRESSED_BYTES:
                    raise RuntimeError(f"Compressed snapshot exceeds 12 MiB: {field['name']}")
                prepared.append((field, raw, compressed, source_url, source_file,
                                 variable, lat_step, lon_step, values.shape))

            # Do not publish any manifest pointer until every field for this
            # single cycle has passed download, decode, grid and range checks.
            now_text = utcnow().isoformat().replace("+00:00", "Z")
            snapshots = []
            for field, raw, compressed, source_url, source_file, variable, lat_step, lon_step, shape in prepared:
                data_path = OUT / f"{field['name']}.bin.gz"
                OUT.mkdir(parents=True, exist_ok=True)
                fd, temp_path = tempfile.mkstemp(prefix=".snapshot-", dir=OUT)
                try:
                    with os.fdopen(fd, "wb") as stream:
                        stream.write(compressed)
                    os.replace(temp_path, data_path)
                finally:
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                digest = hashlib.sha256(raw).hexdigest()
                metadata = {
                    "schema_version": 1, "dataset_id": field["id"],
                    "dataset": field["name"], "description": field["description"],
                    "grid_id": GRID_ID, "provider": "NOAA NCEP",
                    "product": "Global Forecast System (GFS) 0.25 degree analysis",
                    "source_file": source_file, "source_url": source_url,
                    "source_cycle_utc": cycle.isoformat().replace("+00:00", "Z"),
                    "forecast_hour": 0,
                    "valid_time_utc": cycle.isoformat().replace("+00:00", "Z"),
                    "retrieved_at_utc": now_text, "variable": variable,
                    "units": field["units"],
                    "encoding": "little-endian signed int16; value = stored_integer / 100",
                    "scale_factor": 100, "nodata": None,
                    "width": 1440, "height": 721,
                    "coordinate_order": "latitude-longitude",
                    "row_order": "north-to-south" if lat_step < 0 else "south-to-north",
                    "latitude_first": float(reference_lat[0]), "latitude_step": lat_step,
                    "longitude_first": float(reference_lon[0]), "longitude_step": lon_step,
                    "longitude_convention": "0..360",
                    "sha256_uncompressed_values": digest,
                    "compressed_bytes": len(compressed),
                    "source_attribution": "NOAA National Centers for Environmental Prediction (NCEP)",
                    "licence": "U.S. Government work; verify applicable NOAA/NCEP data-use terms before redistribution",
                    "quality_status": "downloaded_and_grid_validated",
                    "note": "GFS model analysis field, not a direct network of instrument observations."
                }
                meta_path = OUT / f"{field['name']}.metadata.json"
                temp_meta = meta_path.with_suffix(".json.tmp")
                temp_meta.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
                os.replace(temp_meta, meta_path)
                snapshots.append({
                    "dataset_id": field["id"], "dataset": field["name"],
                    "grid_id": GRID_ID,
                    "data": f"latest/{field['name']}.bin.gz",
                    "metadata": f"latest/{field['name']}.metadata.json",
                    "sha256_uncompressed_values": digest,
                    "valid_time_utc": metadata["valid_time_utc"]
                })

            manifest = {
                "schema_version": 1, "world": "atmosphere",
                "updated_at_utc": now_text, "snapshots": snapshots
            }
            manifest_path = ROOT / "atmosphere" / "manifest.json"
            temp_manifest = manifest_path.with_suffix(".json.tmp")
            temp_manifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
            os.replace(temp_manifest, manifest_path)
            print(json.dumps({
                "status": "success", "cycle_utc": cycle.isoformat(),
                "datasets": [item[0]["name"] for item in prepared],
                "grid": [1440, 721],
                "compressed_bytes_total": sum(len(item[2]) for item in prepared)
            }, indent=2))
            return 0
        except Exception as exc:
            last_error = f"{cycle.isoformat()}: {exc}"
            print(f"NOAA cycle unavailable/invalid: {last_error}", file=sys.stderr)
    raise RuntimeError(f"No complete valid Atmosphere GFS cycle found in the last 48 hours. Last error: {last_error}")

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ATMOSPHERE COLLECTION FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
