from __future__ import annotations

import datetime as dt
import gzip
import hashlib
import os
import re
import tempfile
import time

import requests

UTC = dt.timezone.utc
DATASET_ID = "earth.oceans.sea_temperature"
BASE_URL = (
    "https://www.ncei.noaa.gov/data/"
    "sea-surface-temperature-optimum-interpolation/v2.1/access/avhrr"
)
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "LIVE-EARTH-Universal-Collector/1.0 (open-data visualization)"
})


def _iso(value: dt.datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _get(url: str, cap: int, attempts: int = 3) -> requests.Response:
    last_error = None
    for attempt in range(attempts):
        try:
            response = SESSION.get(url, timeout=(20, 180))
            if response.status_code == 429 or 500 <= response.status_code < 600:
                last_error = RuntimeError(f"HTTP {response.status_code}: {response.url}")
                if attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
                    continue
            response.raise_for_status()
            if not response.content or len(response.content) > cap:
                raise RuntimeError(f"Invalid NOAA response size: {len(response.content)}")
            return response
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"NOAA OISST request failed: {last_error}")



def _latest_file():
    today = dt.datetime.now(UTC).date()
    candidates = []
    for offset in range(4):
        month_index = today.year * 12 + today.month - 1 - offset
        year, month0 = divmod(month_index, 12)
        month = f"{year:04d}{month0 + 1:02d}"
        listing_url = f"{BASE_URL}/{month}/"
        try:
            listing = _get(listing_url, cap=2 * 1024 * 1024).text
        except Exception:
            continue
        for ymd in re.findall(r"oisst-avhrr-v02r01\.(\d{8})\.nc", listing):
            try:
                day = dt.datetime.strptime(ymd, "%Y%m%d").date()
            except ValueError:
                continue
            if day <= today:
                candidates.append((day, month, ymd))

    for day, month, ymd in sorted(set(candidates), reverse=True):
        url = f"{BASE_URL}/{month}/oisst-avhrr-v02r01.{ymd}.nc"
        try:
            raw = _get(url, cap=16 * 1024 * 1024).content
            if not (
                raw.startswith((b"CDF\x01", b"CDF\x02", b"\x89HDF\r\n\x1a\n"))
                and len(raw) > 100_000
            ):
                continue
            return day, url, raw
        except Exception:
            continue
    raise RuntimeError("No valid published OISST v2.1 daily file found in the latest four monthly indexes")


def collect(dataset: dict) -> dict:
    dataset_id = dataset.get("dataset_id")
    if dataset_id != DATASET_ID:
        raise ValueError(f"Ocean adapter does not support {dataset_id!r}")

    import numpy as np
    import xarray as xr

    day, source_url, netcdf_bytes = _latest_file()
    retrieved = _iso(dt.datetime.now(UTC))
    fd, filename = tempfile.mkstemp(suffix=".nc")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(netcdf_bytes)
        with xr.open_dataset(
            filename, engine="netcdf4", decode_cf=True, mask_and_scale=True
        ) as source:
            if "sst" not in source.data_vars:
                raise RuntimeError("NOAA OISST file does not contain the expected sst field")
            field = source["sst"]
            for dimension in ("time", "zlev"):
                if dimension in field.dims:
                    field = field.isel({dimension: 0})
            values = np.asarray(field.values, dtype=np.float32).squeeze()
            latitude = np.asarray(source["lat"].values, dtype=np.float64)
            longitude = np.asarray(source["lon"].values, dtype=np.float64)

        if values.shape != (720, 1440):
            raise RuntimeError(f"Unexpected OISST field shape: {values.shape}; expected (720, 1440)")
        if latitude.shape != (720,) or longitude.shape != (1440,):
            raise RuntimeError("NOAA OISST coordinate arrays have unexpected dimensions")
        if not np.isfinite(values).any():
            raise RuntimeError("NOAA OISST contains no valid sea-temperature cells")
        if not np.allclose(np.diff(latitude), 0.25, atol=1e-6):
            raise RuntimeError("NOAA OISST latitude spacing is not 0.25 degrees")
        if not np.allclose(np.diff(longitude), 0.25, atol=1e-6):
            raise RuntimeError("NOAA OISST longitude spacing is not 0.25 degrees")
        if not np.isclose(latitude[0], -89.875, atol=1e-6):
            raise RuntimeError("NOAA OISST latitude origin is not the expected cell centre")
        if not np.isclose(longitude[0], 0.125, atol=1e-6):
            raise RuntimeError("NOAA OISST longitude origin is not the expected cell centre")

        valid = np.isfinite(values) & (values >= -3.0) & (values <= 45.0)
        if int(valid.sum()) < 100_000:
            raise RuntimeError("NOAA OISST valid-cell count is implausibly low")
        packed = np.full(values.shape, -32768, dtype="<i2")
        packed[valid] = np.rint(values[valid] * 100.0).astype("<i2")
        uncompressed = packed.tobytes(order="C")
        payload = gzip.compress(uncompressed, compresslevel=9, mtime=0)
        valid_time = dt.datetime.combine(day, dt.time(12), tzinfo=UTC)

        metadata = {
            "data_kind": "grid",
            "format": "gzip+int16-le-centi-celsius",
            "dataset": "Daily sea surface temperature",
            "dataset_id": DATASET_ID,
            "provider": "NOAA/NCEI",
            "product": "Optimum Interpolation Sea Surface Temperature (OISST) v2.1 AVHRR",
            "source_name": "NOAA/NCEI OISST v2.1 AVHRR daily",
            "source_id": dataset["collection"]["source_id"],
            "source_file": source_url.rsplit("/", 1)[-1],
            "source_url": source_url,
            "width": 1440,
            "height": 720,
            "coordinate_order": "latitude-longitude",
            "row_order": "south-to-north",
            "latitude_first": float(latitude[0]),
            "latitude_step": 0.25,
            "longitude_first": float(longitude[0]),
            "longitude_step": 0.25,
            "longitude_convention": "0..360",
            "units": "degree_C",
            "variable": "sst",
            "nodata_value": -327.67999267578125,
            "scale_factor": 100,
            "encoding": "little-endian signed int16; value = stored_integer / 100",
            "compressed_payload": True,
            "valid_time_utc": _iso(valid_time),
            "retrieved_at_utc": retrieved,
            "native_grid_spacing_degrees": 0.25,
            "valid_cell_count": int(valid.sum()),
            "missing_cell_count": int(valid.size - valid.sum()),
            "sha256_uncompressed_values": hashlib.sha256(uncompressed).hexdigest(),
            "quality_status": "source_values_validated_no_interpolation",
            "observation_note": "Daily analysed sea-surface temperature; land and source-missing cells remain no-data.",
        }
        observation = {
            "dataset_id": DATASET_ID,
            "source_id": "noaa_ncei_oisst",
            "observed_at": _iso(valid_time),
            "retrieved_at": retrieved,
            "value": None,
            "unit": "degree_C",
            "provenance": {
                "source_url": source_url,
                "provider": "NOAA/NCEI",
                "product": "OISST v2.1 AVHRR",
                "source_file": metadata["source_file"],
                "method": "daily analysed gridded field; decoded from source NetCDF and repacked without interpolation",
            },
            "dimensions": {"width": 1440, "height": 720},
            "geometry": {"type": "global_regular_grid", "metadata": metadata},
            "quality": {
                "valid_cell_count": int(valid.sum()),
                "missing_cell_count": int(valid.size - valid.sum()),
                "sample_mode": "native_grid",
            },
        }
        return {
            "value_payload": payload,
            "metadata": metadata,
            "observations": [observation],
        }
    finally:
        try:
            os.unlink(filename)
        except FileNotFoundError:
            pass
