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
THREDDS = "https://www.ncei.noaa.gov/thredds"
PRODUCTS = {
    "final": {
        "catalog": "ncFC/fc-oisst-daily-avhrr-only-dly/files/catalog.html",
        "file": "ncFC/fc-oisst-daily-avhrr-only-dly/files",
        "pattern": re.compile(r"oisst-avhrr-v02r01\.(\d{8})\.nc"),
    },
    "preliminary": {
        "catalog": "ncFC/fc-oisst-daily-avhrr-only-dly-prelim/files/catalog.html",
        "file": "ncFC/fc-oisst-daily-avhrr-only-dly-prelim/files",
        "pattern": re.compile(r"oisst-avhrr-v02r01\.(\d{8})_preliminary\.nc"),
    },
}
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "LIVE-EARTH-Universal-Collector/1.0 (open-data visualization)"})


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


def _published_candidates(today: dt.date) -> list[tuple[dt.date, int, str, str]]:
    """Return (observation date, tie-break priority, processing level, URL).

    NOAA publishes separate final and preliminary catalogs. A newer valid
    observation date wins regardless of processing level; final wins only on
    an observation-date tie. Keep a short fallback queue from each catalog.
    """
    by_level: dict[str, list[tuple[dt.date, int, str, str]]] = {
        "preliminary": [],
        "final": [],
    }
    for level, spec in PRODUCTS.items():
        listing_url = f"{THREDDS}/catalog/{spec['catalog']}"
        try:
            listing = _get(listing_url, cap=6 * 1024 * 1024).text
        except Exception:
            continue
        for ymd in set(spec["pattern"].findall(listing)):
            try:
                day = dt.datetime.strptime(ymd, "%Y%m%d").date()
            except ValueError:
                continue
            if day > today:
                continue
            month = ymd[:6]
            suffix = "_preliminary" if level == "preliminary" else ""
            filename = f"oisst-avhrr-v02r01.{ymd}{suffix}.nc"
            url = f"{THREDDS}/fileServer/{spec['file']}/{month}/{filename}"
            by_level[level].append((day, 1 if level == "final" else 0, level, url))

    candidates = []
    for level in ("preliminary", "final"):
        candidates.extend(sorted(by_level[level], key=lambda item: item[0], reverse=True)[:8])
    return sorted(candidates, key=lambda item: (item[0], item[1]), reverse=True)


def _decode_candidate(candidate, np, xr):
    day, _priority, level, source_url = candidate
    raw = _get(source_url, cap=24 * 1024 * 1024).content
    if not (raw.startswith((b"CDF\x01", b"CDF\x02", b"\x89HDF\r\n\x1a\n")) and len(raw) > 100_000):
        raise RuntimeError("NOAA response is not a complete NetCDF file")
    fd, filename = tempfile.mkstemp(suffix=".nc")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        with xr.open_dataset(filename, engine="netcdf4", decode_cf=True, mask_and_scale=True) as source:
            if "sst" not in source.data_vars or "lat" not in source or "lon" not in source or "time" not in source:
                raise RuntimeError("NOAA OISST file is missing sst/time/lat/lon")
            field = source["sst"]
            valid_coordinate = np.asarray(source["time"].values).reshape(-1)
            if not valid_coordinate.size:
                raise RuntimeError("NOAA OISST time coordinate is empty")
            # Daily single-file products normally contain one time; if more
            # are present, select the latest coordinate actually in the file.
            time_index = max(range(valid_coordinate.size), key=lambda i: str(valid_coordinate[i]))
            observed = np.datetime64(valid_coordinate[time_index], "s")
            observed_dt = dt.datetime.fromisoformat(np.datetime_as_string(observed, unit="s")).replace(tzinfo=UTC)
            if "time" in field.dims:
                field = field.isel(time=time_index)
            for dimension in ("zlev",):
                if dimension in field.dims:
                    field = field.isel({dimension: 0})
            values = np.asarray(field.values, dtype=np.float32).squeeze()
            latitude = np.asarray(source["lat"].values, dtype=np.float64)
            longitude = np.asarray(source["lon"].values, dtype=np.float64)
        if observed_dt.date() != day:
            raise RuntimeError(f"Filename date {day} does not match NetCDF observation date {observed_dt.date()}")
        if values.shape != (720, 1440):
            raise RuntimeError(f"Unexpected OISST field shape: {values.shape}; expected (720, 1440)")
        if latitude.shape != (720,) or longitude.shape != (1440,):
            raise RuntimeError("NOAA OISST coordinate arrays have unexpected dimensions")
        if not np.isfinite(values).any():
            raise RuntimeError("NOAA OISST contains no valid sea-temperature cells")
        if not np.allclose(np.diff(latitude), 0.25, atol=1e-6) or not np.allclose(np.diff(longitude), 0.25, atol=1e-6):
            raise RuntimeError("NOAA OISST coordinates are not a complete 0.25-degree grid")
        if not np.isclose(latitude[0], -89.875, atol=1e-6) or not np.isclose(longitude[0], 0.125, atol=1e-6):
            raise RuntimeError("NOAA OISST grid origin is not the expected global cell centre")
        if not np.isclose(latitude[-1], 89.875, atol=1e-6) or not np.isclose(longitude[-1], 359.875, atol=1e-6):
            raise RuntimeError("NOAA OISST grid does not reach the expected global cell-centre bounds")
        valid = np.isfinite(values) & (values >= -3.0) & (values <= 45.0)
        if int(valid.sum()) < 100_000:
            raise RuntimeError("NOAA OISST valid-cell count is implausibly low")
        return level, observed_dt, source_url, values, latitude, longitude, valid
    finally:
        try:
            os.unlink(filename)
        except FileNotFoundError:
            pass


def collect(dataset: dict) -> dict:
    if dataset.get("dataset_id") != DATASET_ID:
        raise ValueError(f"Ocean adapter does not support {dataset.get('dataset_id')!r}")
    import numpy as np
    import xarray as xr

    candidates = _published_candidates(dt.datetime.now(UTC).date())
    if not candidates:
        raise RuntimeError("NOAA final and preliminary OISST indexes returned no published daily files")

    selected = None
    failures = []
    for candidate in candidates:
        try:
            selected = _decode_candidate(candidate, np, xr)
            break
        except Exception as exc:
            failures.append(f"{candidate[2]} {candidate[0]}: {exc}")
    if selected is None:
        raise RuntimeError("No valid complete global NOAA OISST grid could be decoded. " + " | ".join(failures[-6:]))

    level, observed_dt, source_url, values, latitude, longitude, valid = selected
    retrieved = _iso(dt.datetime.now(UTC))
    packed = np.full(values.shape, -32768, dtype="<i2")
    packed[valid] = np.rint(values[valid] * 100.0).astype("<i2")
    uncompressed = packed.tobytes(order="C")
    payload = gzip.compress(uncompressed, compresslevel=9, mtime=0)
    # Preserve the actual observation timestamp read from the NetCDF time coordinate.
    valid_time = observed_dt
    product_label = "preliminary" if level == "preliminary" else "final"
    metadata = {
        "data_kind": "grid", "format": "gzip+int16-le-centi-celsius",
        "dataset": "Daily sea surface temperature", "dataset_id": DATASET_ID,
        "provider": "NOAA/NCEI",
        "product": "Optimum Interpolation Sea Surface Temperature (OISST) v2.1 AVHRR-only",
        "source_name": f"NOAA/NCEI OISST v2.1 AVHRR-only daily {product_label}",
        "source_id": dataset["collection"]["source_id"],
        "source_file": source_url.rsplit("/", 1)[-1], "source_url": source_url,
        "processing_level": product_label, "product_version": "v02r01",
        "width": 1440, "height": 720,
        "coordinate_order": "latitude-longitude", "row_order": "south-to-north",
        "latitude_first": float(latitude[0]), "latitude_step": 0.25,
        "longitude_first": float(longitude[0]), "longitude_step": 0.25,
        "longitude_convention": "0..360", "units": "degree_C", "variable": "sst",
        # Match the Float32 value produced by the browser's int16/100 decoder
        # so its strict no-data comparison excludes land/missing cells.
        "nodata_value": -327.67999267578125, "scale_factor": 100,
        "encoding": "little-endian signed int16; value = stored_integer / 100",
        "compressed_payload": True, "valid_time_utc": _iso(valid_time),
        "retrieved_at_utc": retrieved, "native_grid_spacing_degrees": 0.25,
        "valid_cell_count": int(valid.sum()), "missing_cell_count": int(valid.size - valid.sum()),
        "sha256_uncompressed_values": hashlib.sha256(uncompressed).hexdigest(),
        "quality_status": f"{product_label}_source_values_validated_no_interpolation",
        "observation_note": "Complete global daily analysed SST; preliminary uses the near-real-time analysis, final uses the refined analysis. Land and source-missing cells remain no-data.",
    }
    observation = {
        "dataset_id": DATASET_ID, "source_id": "noaa_ncei_oisst",
        "observed_at": _iso(valid_time), "retrieved_at": retrieved,
        "value": None, "unit": "degree_C",
        "provenance": {
            "source_url": source_url, "provider": "NOAA/NCEI",
            "product": metadata["product"], "processing_level": product_label,
            "source_file": metadata["source_file"],
            "method": "latest valid complete global daily field selected across final and preliminary products; final wins same-date ties; decoded and repacked without interpolation",
        },
        "dimensions": {"width": 1440, "height": 720},
        "geometry": {"type": "global_regular_grid", "metadata": metadata},
        "quality": {"valid_cell_count": int(valid.sum()), "missing_cell_count": int(valid.size - valid.sum()), "sample_mode": "native_grid"},
    }
    return {"value_payload": payload, "metadata": metadata, "observations": [observation]}
