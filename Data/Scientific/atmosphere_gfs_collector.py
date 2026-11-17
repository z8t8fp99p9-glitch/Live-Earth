#!/usr/bin/env python3
"""Fetch the latest available NOAA GFS 0.25-degree 2 m air-temperature analysis.

Publishes one current snapshot only. No sample data or fabricated values.
Output: atmosphere/latest/air_temperature.bin.gz + metadata.json
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
MAX_BYTES = 12 * 1024 * 1024
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "LIVE-EARTH-scientific-collector/1.0 (research visualization)"})


def utcnow():
    return dt.datetime.now(dt.timezone.utc)


def candidate_cycles(now):
    # GFS cycles are 00, 06, 12 and 18 UTC. Search newest first, up to 48 hours.
    day = now.date()
    for back in range(0, 3):
        date = day - dt.timedelta(days=back)
        for hour in (18, 12, 6, 0):
            cycle = dt.datetime.combine(date, dt.time(hour), tzinfo=dt.timezone.utc)
            if cycle <= now - dt.timedelta(hours=4):
                yield cycle


def download_cycle(cycle):
    ymd, hh = cycle.strftime("%Y%m%d"), cycle.strftime("%H")
    filename = f"gfs.t{hh}z.pgrb2.0p25.f000"
    params = {
        "file": filename,
        "var_TMP": "on",
        "lev_2_m_above_ground": "on",
        "subregion": "",
        "leftlon": "0",
        "rightlon": "359.75",
        "toplat": "90",
        "bottomlat": "-90",
        "dir": f"/gfs.{ymd}/{hh}/atmos",
    }
    url = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?" + urlencode(params)
    response = SESSION.get(url, timeout=(20, 240))
    response.raise_for_status()
    data = response.content
    if len(data) < 1000 or not data.startswith(b"GRIB"):
        raise RuntimeError(f"NOMADS did not return a GRIB2 payload for {ymd}/{hh}Z")
    if len(data) > 80 * 1024 * 1024:
        raise RuntimeError(f"Filtered NOAA file unexpectedly large: {len(data)} bytes")
    return data, url, filename


def decode_temperature(grib_bytes):
    # cfgrib requires ecCodes. Decode from a temporary file to avoid writing source data into the repo.
    fd, name = tempfile.mkstemp(suffix=".grib2")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(grib_bytes)
        ds = xr.open_dataset(
            name, engine="cfgrib",
            backend_kwargs={"filter_by_keys": {"typeOfLevel": "heightAboveGround", "level": 2},
                            "indexpath": ""}
        )
        try:
            var = "t2m" if "t2m" in ds.data_vars else next(iter(ds.data_vars))
            values = np.asarray(ds[var].values, dtype=np.float32).squeeze()
            lat = np.asarray(ds["latitude"].values, dtype=np.float64)
            lon = np.asarray(ds["longitude"].values, dtype=np.float64)
            if values.ndim != 2 or lat.ndim != 1 or lon.ndim != 1:
                raise RuntimeError("Unexpected NOAA GFS grid dimensions")
            if values.shape != (lat.size, lon.size):
                raise RuntimeError("NOAA GFS values and coordinate dimensions do not match")
            if not np.all(np.isfinite(values)):
                raise RuntimeError("NOAA GFS temperature contains non-finite cells")
            # GFS temperatures are Kelvin. Store signed centi-degrees Celsius as int16.
            centi_c = np.rint((values - 273.15) * 100.0)
            if np.nanmin(centi_c) < -32768 or np.nanmax(centi_c) > 32767:
                raise RuntimeError("Temperature values exceed int16 encoding range")
            packed = centi_c.astype("<i2")
            return packed, lat, lon, var
        finally:
            ds.close()
    finally:
        try: os.unlink(name)
        except FileNotFoundError: pass


def atomic_gzip(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".snapshot-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as raw:
            with gzip.GzipFile(fileobj=raw, mode="wb", compresslevel=9, mtime=0) as gz:
                gz.write(payload)
        if os.path.getsize(temp) > MAX_BYTES:
            raise RuntimeError("Compressed snapshot exceeds 12 MiB safety limit")
        os.replace(temp, path)
    finally:
        if os.path.exists(temp): os.unlink(temp)


def main():
    now = utcnow()
    last_error = None
    for cycle in candidate_cycles(now):
        try:
            grib, source_url, source_file = download_cycle(cycle)
            values, lat, lon, variable = decode_temperature(grib)
            if lat.size < 2 or lon.size < 2:
                raise RuntimeError("NOAA grid is too small")
            lat_step = float(np.median(np.diff(lat)))
            lon_step = float(np.median(np.diff(lon)))
            if abs(abs(lat_step) - 0.25) > 1e-5 or abs(abs(lon_step) - 0.25) > 1e-5:
                raise RuntimeError(f"Unexpected grid spacing: {lat_step}, {lon_step}")
            if values.shape != (lat.size, lon.size):
                raise RuntimeError("Grid shape mismatch")

            # Values are row-major, latitude coordinate order as returned by NOAA.
            raw = values.tobytes(order="C")
            data_path = OUT / "air_temperature.bin.gz"
            atomic_gzip(data_path, raw)
            data_sha = hashlib.sha256(raw).hexdigest()
            metadata = {
                "schema_version": 1,
                "dataset_id": "ATMOSPHERE_01",
                "dataset": "air_temperature",
                "grid_id": GRID_ID,
                "provider": "NOAA NCEP",
                "product": "Global Forecast System (GFS) 0.25 degree analysis",
                "source_file": source_file,
                "source_url": source_url,
                "source_cycle_utc": cycle.isoformat().replace("+00:00", "Z"),
                "forecast_hour": 0,
                "valid_time_utc": cycle.isoformat().replace("+00:00", "Z"),
                "retrieved_at_utc": utcnow().isoformat().replace("+00:00", "Z"),
                "variable": variable,
                "units": "degree_Celsius",
                "encoding": "little-endian signed int16; value = stored_integer / 100",
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
                "sha256_uncompressed_values": data_sha,
                "compressed_bytes": data_path.stat().st_size,
                "source_attribution": "NOAA National Centers for Environmental Prediction (NCEP)",
                "licence": "U.S. Government work; verify applicable NOAA/NCEP data-use terms before redistribution",
                "quality_status": "downloaded_and_grid_validated",
                "note": "GFS analysis field; model analysis, not a direct thermometer observation."
            }
            meta_path = OUT / "air_temperature.metadata.json"
            tmp = meta_path.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
            os.replace(tmp, meta_path)

            manifest = {
                "schema_version": 1,
                "world": "atmosphere",
                "updated_at_utc": metadata["retrieved_at_utc"],
                "snapshots": [{
                    "dataset_id": "ATMOSPHERE_01",
                    "dataset": "air_temperature",
                    "grid_id": GRID_ID,
                    "data": "latest/air_temperature.bin.gz",
                    "metadata": "latest/air_temperature.metadata.json",
                    "sha256_uncompressed_values": data_sha,
                    "valid_time_utc": metadata["valid_time_utc"]
                }]
            }
            manifest_path = ROOT / "atmosphere" / "manifest.json"
            manifest_path.parent.mkdir(parents=True, exist_ok=True)
            mtmp = manifest_path.with_suffix(".json.tmp")
            mtmp.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
            os.replace(mtmp, manifest_path)
            print(json.dumps({"status":"success","dataset":"air_temperature",
                              "valid_time_utc":metadata["valid_time_utc"],
                              "grid":[int(lon.size),int(lat.size)],
                              "compressed_bytes":data_path.stat().st_size,
                              "sha256":data_sha}, indent=2))
            return 0
        except Exception as exc:
            last_error = f"{cycle.isoformat()}: {exc}"
            print(f"NOAA cycle unavailable/invalid: {last_error}", file=sys.stderr)
    raise RuntimeError(f"No valid NOAA GFS analysis found in last 48 hours. Last error: {last_error}")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ATMOSPHERE COLLECTION FAILED: {exc}", file=sys.stderr)
        raise SystemExit(1)
