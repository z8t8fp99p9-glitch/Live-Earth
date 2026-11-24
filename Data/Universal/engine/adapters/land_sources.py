from __future__ import annotations

"""Global Land grid adapters for the LIVE // EARTH Universal Collector.

NOAA VIIRS NDVI is spatially binned from its published coordinate arrays into a
fixed 0.25-degree global grid. Hansen 30 m tiles are reduced with GDAL warp
resampling into the same display grid. No regional point sampling is used.
"""

import concurrent.futures
import datetime as dt
import gzip
import hashlib
import json
import math
import os
import re
import tempfile
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import rasterio
import requests
import xarray as xr
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.warp import reproject

UTC = dt.timezone.utc
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "LIVE-EARTH-Universal-Collector/2.0 (open public Earth data; grid collection)"})
DB_VALUES = Path(__file__).resolve().parents[3] / "Central-Database" / "values"

NDVI_DATASET_ID = "earth.land.vegetation_health"
NDVI_SOURCE_ID = "noaa_cdr_viirs_ndvi_daily"
NDVI_CATALOG_ROOT = "https://www.ncei.noaa.gov/thredds/catalog/cdr/ndvi"
NDVI_FILESERVER_ROOT = "https://www.ncei.noaa.gov/thredds/fileServer"
NDVI_NATIVE_RESOLUTION = 0.05
NDVI_DISPLAY_RESOLUTION = 0.25
NDVI_NO_DATA_INT16 = -32768

FOREST_DATASET_ID = "earth.land.forest_change"
FOREST_SOURCE_ID = "hansen_global_forest_change_2025_v1_13"
FOREST_REVISION = "GFC-2025-v1.13"
FOREST_BASE_URL = "https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13"
FOREST_CATALOG_URL = f"{FOREST_BASE_URL}/download.html"
FOREST_LOSSYEAR_LIST_URL = f"{FOREST_BASE_URL}/lossyear.txt"
FOREST_DATAMASK_LIST_URL = f"{FOREST_BASE_URL}/datamask.txt"
FOREST_NATIVE_RESOLUTION_DEGREES = 1.0 / 3600.0
FOREST_DISPLAY_RESOLUTION = 0.25
FOREST_TILE_OUTPUT_SIZE = 40
FOREST_NO_DATA_INT16 = -32768


def _iso(value: dt.datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _get(url: str, *, params=None, cap: int = 600 * 1024 * 1024, attempts: int = 3) -> requests.Response:
    last_error = None
    for attempt in range(attempts):
        try:
            response = SESSION.get(url, params=params, timeout=(25, 240))
            if response.status_code == 429 or 500 <= response.status_code < 600:
                last_error = RuntimeError(f"HTTP {response.status_code} from {response.url}")
                if attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
                    continue
            response.raise_for_status()
            if not response.content or len(response.content) > cap:
                raise RuntimeError(f"Invalid response size ({len(response.content)} bytes) from {response.url}")
            return response
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Public source request failed: {last_error}")


def _metadata_path(dataset_id: str) -> Path:
    return DB_VALUES / dataset_id / "metadata.json"


def _stored_metadata(dataset_id: str) -> dict:
    path = _metadata_path(dataset_id)
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError):
        return {}


def _coordinate_name(ds: xr.Dataset, axis: str) -> str:
    wanted = "latitude" if axis == "lat" else "longitude"
    aliases = {"lat", "latitude"} if axis == "lat" else {"lon", "longitude"}
    for name, coord in ds.variables.items():
        standard = str(coord.attrs.get("standard_name", "")).lower()
        units = str(coord.attrs.get("units", "")).lower()
        if coord.ndim == 1 and (standard == wanted or name.lower() in aliases):
            return name
        if coord.ndim == 1 and axis == "lat" and units in {"degrees_north", "degree_north", "degrees_n"}:
            return name
        if coord.ndim == 1 and axis == "lon" and units in {"degrees_east", "degree_east", "degrees_e"}:
            return name
    raise RuntimeError(f"Source NetCDF has no one-dimensional {wanted} coordinate")


def _median_spacing(values: np.ndarray, label: str, expected: float) -> float:
    if values.ndim != 1 or values.size < 2 or not np.isfinite(values).all():
        raise RuntimeError(f"Source {label} coordinate is not a valid one-dimensional array")
    differences = np.diff(values)
    if np.any(differences == 0) or not (np.all(differences > 0) or np.all(differences < 0)):
        raise RuntimeError(f"Source {label} coordinate is not strictly monotonic")
    step = float(np.median(differences))
    # Allow small coordinate irregularities/float quantisation. Spatial binning
    # below uses each actual coordinate, so no regular-grid reshape is assumed.
    if not math.isclose(abs(step), expected, rel_tol=0.02, abs_tol=1e-5):
        raise RuntimeError(f"Unexpected {label} resolution {step}; expected approximately {expected}")
    if float(np.max(np.abs(differences))) > expected * 1.75:
        raise RuntimeError(f"Source {label} coordinate contains a gap too large for safe display-grid binning")
    return step


def _pack_grid(values: np.ndarray, *, scale: int, no_data_code: int, metadata: dict):
    field = np.asarray(values, dtype=np.float32)
    if field.ndim != 2 or field.size == 0:
        raise RuntimeError("Grid field must be a non-empty two-dimensional array")
    if not np.isfinite(scale) or scale <= 0 or not -32768 <= no_data_code <= 32767:
        raise ValueError("Invalid grid packing parameters")
    valid = np.isfinite(field)
    if not valid.any():
        raise RuntimeError("Source grid contains no valid numeric cells")
    encoded = np.full(field.shape, no_data_code, dtype="<i2")
    packed = np.rint(field[valid] * scale)
    if np.any(packed < -32767) or np.any(packed > 32767):
        raise RuntimeError("Source values exceed the approved int16 storage range")
    encoded[valid] = packed.astype("<i2")
    raw_values = encoded.tobytes(order="C")
    payload = gzip.compress(raw_values, compresslevel=9, mtime=0)
    meta = dict(metadata)
    meta.update({
        "data_kind": "grid", "format": "gzip+int16-le",
        "width": int(field.shape[1]), "height": int(field.shape[0]),
        "coordinate_order": "latitude-longitude", "row_order": "north-to-south",
        "longitude_convention": meta.get("longitude_convention", "0..360"),
        "units": meta["units"], "scale_factor": int(scale),
        "encoding": f"little-endian signed int16; value = stored_integer / {int(scale)}",
        "nodata_value": float(np.float32(no_data_code / scale)),
        "compressed_payload": True, "valid_cell_count": int(valid.sum()),
        "source_min": float(np.min(field[valid])), "source_max": float(np.max(field[valid])),
        "sha256_uncompressed_values": hashlib.sha256(raw_values).hexdigest(),
    })
    return payload, meta


def _descriptor(dataset_id: str, source_id: str, observed_at: str, retrieved_at: str, unit: str, source_url: str, metadata: dict):
    return [{
        "dataset_id": dataset_id, "source_id": source_id,
        "observed_at": observed_at, "retrieved_at": retrieved_at,
        "value": None, "unit": unit, "provenance": {"source_url": source_url},
        "geometry": {"type": "global_regular_grid", "metadata": {
            "width": metadata["width"], "height": metadata["height"],
            "latitude_first": metadata["latitude_first"], "latitude_step": metadata["latitude_step"],
            "longitude_first": metadata["longitude_first"], "longitude_step": metadata["longitude_step"],
            "longitude_convention": metadata["longitude_convention"],
        }},
    }]


def _normalise_global_field(variable: xr.DataArray, lat_values: np.ndarray, lon_values: np.ndarray,
                            lat_dim: str, lon_dim: str):
    if variable.ndim != 2 or lat_dim not in variable.dims or lon_dim not in variable.dims or lat_dim == lon_dim:
        raise RuntimeError(f"Source field dimensions do not match latitude/longitude coordinates: {variable.dims}")
    field = np.asarray(variable.transpose(lat_dim, lon_dim).values, dtype=np.float32)
    if field.shape != (lat_values.size, lon_values.size):
        raise RuntimeError("Source field shape does not match its latitude/longitude coordinates")
    lat_order = np.argsort(lat_values)[::-1]
    lon_360 = np.mod(lon_values, 360.0)
    lon_order = np.argsort(lon_360)
    lon_sorted_all = lon_360[lon_order]
    keep_lon = np.ones(lon_sorted_all.shape, dtype=bool)
    if lon_sorted_all.size > 1:
        keep_lon[1:] = np.diff(lon_sorted_all) > 1e-7
    lon_order = lon_order[keep_lon]
    field = field[np.ix_(lat_order, lon_order)]
    lat_sorted = lat_values[lat_order]
    lon_sorted = lon_360[lon_order]
    lat_step = _median_spacing(lat_sorted, "latitude", NDVI_NATIVE_RESOLUTION)
    lon_step = _median_spacing(lon_sorted, "longitude", NDVI_NATIVE_RESOLUTION)
    if lat_step >= 0 or lon_step <= 0:
        raise RuntimeError("Source coordinates could not be normalized to north-to-south / eastward order")
    if not (math.isclose(float(lat_sorted[0]), 90.0, abs_tol=0.3) and math.isclose(float(lat_sorted[-1]), -90.0, abs_tol=0.3)):
        raise RuntimeError("Source latitude grid does not cover the globe")
    if not math.isclose(float(lon_sorted[-1] - lon_sorted[0] + lon_step), 360.0, abs_tol=0.08):
        raise RuntimeError("Source longitude grid does not cover 360 degrees")
    return field, lat_sorted, lon_sorted, lat_step, lon_step


def _aggregate_ndvi_by_coordinates(field: np.ndarray, latitudes: np.ndarray, longitudes: np.ndarray):
    """Mean valid source cells into fixed 0.25° bins using actual coordinates."""
    valid = np.isfinite(field) & (field >= -1.05) & (field <= 1.05)
    rows = np.floor((90.0 - latitudes) / NDVI_DISPLAY_RESOLUTION).astype(np.int64)
    cols = np.floor(longitudes / NDVI_DISPLAY_RESOLUTION).astype(np.int64)
    rows = np.clip(rows, 0, 719)
    cols = np.mod(cols, 1440)
    row_grid = np.broadcast_to(rows[:, None], field.shape)
    col_grid = np.broadcast_to(cols[None, :], field.shape)
    flat_index = (row_grid * 1440 + col_grid)[valid]
    sums = np.bincount(flat_index, weights=field[valid].astype(np.float64), minlength=720 * 1440)
    counts = np.bincount(flat_index, minlength=720 * 1440)
    result = np.full(720 * 1440, np.nan, dtype=np.float32)
    np.divide(sums, counts, out=result, where=counts > 0, casting="unsafe")
    return result.reshape(720, 1440), int(valid.sum())


def _parse_date_from_name(value: str):
    for token in re.findall(r"(?<!\d)(?:19|20)\d{6}(?!\d)", value):
        try:
            return dt.datetime.strptime(token, "%Y%m%d").replace(tzinfo=UTC)
        except ValueError:
            continue
    return None


def _latest_ndvi_file():
    now = dt.datetime.now(UTC)
    for year in range(now.year, 2013, -1):
        catalog_url = f"{NDVI_CATALOG_ROOT}/{year}/catalog.xml"
        try:
            response = _get(catalog_url, cap=8 * 1024 * 1024)
            root = ET.fromstring(response.content)
        except Exception:
            continue
        candidates = []
        for element in root.iter():
            url_path = element.attrib.get("urlPath", "")
            name = element.attrib.get("name", "")
            if not url_path.lower().endswith(".nc"):
                continue
            valid_time = _parse_date_from_name(name or url_path)
            if valid_time is None or valid_time.year != year:
                continue
            candidates.append((valid_time, url_path, name))
        viirs = [item for item in candidates if "viirs" in (item[1] + item[2]).lower()]
        if viirs:
            valid_time, url_path, name = max(viirs, key=lambda item: item[0])
            return {
                "valid_time": valid_time, "name": name or Path(url_path).name,
                "url_path": url_path,
                "source_url": f"{NDVI_FILESERVER_ROOT}/{url_path.lstrip('/')}",
                "catalog_url": catalog_url,
            }
    raise RuntimeError("NOAA NCEI NDVI THREDDS catalogue has no date-stamped public NetCDF file")


def _collect_ndvi(dataset: dict, retrieved_at: str):
    spec = _LATEST_NDVI or _latest_ndvi_file()
    raw = _get(spec["source_url"], cap=550 * 1024 * 1024).content
    fd, path = tempfile.mkstemp(prefix="live-earth-ndvi-grid-", suffix=".nc")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        with xr.open_dataset(path, engine="netcdf4", decode_cf=True, mask_and_scale=True) as ds:
            var_name = next((name for name in ds.data_vars if name.lower() == "ndvi"), None)
            if not var_name:
                raise RuntimeError("NOAA CDR NetCDF does not contain the NDVI variable")
            lat_name, lon_name = _coordinate_name(ds, "lat"), _coordinate_name(ds, "lon")
            variable = ds[var_name]
            for dim in list(variable.dims):
                if dim.lower() in {"time", "times"}:
                    variable = variable.isel({dim: -1})
            variable = variable.squeeze(drop=True)
            lat_values = np.asarray(ds[lat_name].values, dtype=np.float64)
            lon_values = np.asarray(ds[lon_name].values, dtype=np.float64)
            field, lat_sorted, lon_sorted, lat_step, lon_step = _normalise_global_field(
                variable, lat_values, lon_values, ds[lat_name].dims[0], ds[lon_name].dims[0]
            )
            aggregated, valid_native = _aggregate_ndvi_by_coordinates(field, lat_sorted, lon_sorted)
            valid_display = int(np.isfinite(aggregated).sum())
            if valid_display == 0:
                raise RuntimeError("NOAA NDVI coordinate aggregation produced no valid display cells")
            source_url = spec["source_url"]
            observed = _iso(spec["valid_time"])
            payload, metadata = _pack_grid(aggregated, scale=10000, no_data_code=NDVI_NO_DATA_INT16, metadata={
                "dataset_id": NDVI_DATASET_ID,
                "source_name": "NOAA CDR VIIRS Normalized Difference Vegetation Index",
                "source_id": NDVI_SOURCE_ID,
                "source_revision": "NOAA_NCEI_VIIRS_CDR_V1",
                "provider": "NOAA National Centers for Environmental Information",
                "product": "Daily VIIRS Climate Data Record NDVI",
                "processing_level": "native 0.05° VIIRS coordinate cells binned by geographic location to a 0.25° display grid",
                "source_url": source_url, "catalog_url": spec["catalog_url"],
                "source_file": spec["name"], "valid_time_utc": observed,
                "source_observation_period": "daily source file; valid time follows the date in the source filename",
                "native_grid_spacing_degrees": NDVI_NATIVE_RESOLUTION,
                "grid_resolution_degrees": NDVI_DISPLAY_RESOLUTION,
                "native_grid_width": int(field.shape[1]), "native_grid_height": int(field.shape[0]),
                "native_valid_cell_count": valid_native,
                "native_latitude_spacing_degrees": abs(lat_step),
                "native_longitude_spacing_degrees": abs(lon_step),
                "aggregation_method": "Arithmetic mean of valid native NDVI cells assigned by their actual latitude/longitude coordinates to each 0.25° cell; empty cells remain no-data.",
                "latitude_first": 89.875, "latitude_step": -NDVI_DISPLAY_RESOLUTION,
                "longitude_first": 0.125, "longitude_step": NDVI_DISPLAY_RESOLUTION,
                "longitude_convention": "0..360", "units": "1", "variable": var_name,
                "quality_policy": "Native fill and non-physical values are excluded. Raw QA flags are not reclassified; no undocumented QA bit interpretation is applied.",
                "description": "NDVI is a satellite-derived vegetation greenness/activity index, not a direct diagnosis of plant health.",
                "citation": "NOAA Climate Data Record of VIIRS NDVI, Version 1; DOI: 10.25921/gakh-st76",
            })
            metadata["display_valid_cell_count"] = valid_display
            return {"value_payload": payload, "metadata": metadata,
                    "observations": _descriptor(NDVI_DATASET_ID, NDVI_SOURCE_ID, observed, retrieved_at, "1", source_url, metadata)}
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass


def _hansen_tile_name(north: int, west: int) -> str:
    lat_part = f"{abs(north):02d}{'N' if north >= 0 else 'S'}"
    lon_part = f"{abs(west):03d}{'E' if west >= 0 else 'W'}"
    return f"{lat_part}_{lon_part}"


def _hansen_tile_urls(north: int, west: int):
    tile = _hansen_tile_name(north, west)
    prefix = "Hansen_GFC-2025-v1.13"
    return (
        f"{FOREST_BASE_URL}/{prefix}_lossyear_{tile}.tif",
        f"{FOREST_BASE_URL}/{prefix}_datamask_{tile}.tif",
    )


def _hansen_tile_specs() -> list[tuple[int, int]]:
    """Use the provider's official per-layer manifests, not a guessed tile matrix."""
    loss_response = _get(FOREST_LOSSYEAR_LIST_URL, cap=2 * 1024 * 1024)
    mask_response = _get(FOREST_DATAMASK_LIST_URL, cap=2 * 1024 * 1024)

    def parse_layer(text: str, layer: str) -> set[tuple[int, int]]:
        specs = set()
        suffix = re.compile(rf"Hansen_GFC-2025-v1\.13_{layer}_(\d{{2}}[NS])_(\d{{3}}[EW])\.tif$", re.IGNORECASE)
        for raw_line in text.splitlines():
            url = raw_line.strip()
            if not url:
                continue
            parsed = suffix.search(url)
            if not parsed or not url.startswith(FOREST_BASE_URL + "/"):
                raise RuntimeError(f"Unexpected URL in Hansen {layer} manifest: {url[:180]}")
            lat_token, lon_token = parsed.groups()
            north = int(lat_token[:2]) * (1 if lat_token[-1].upper() == "N" else -1)
            west = int(lon_token[:3]) * (1 if lon_token[-1].upper() == "E" else -1)
            if north < -60 or north > 80 or north % 10 or west < -180 or west >= 180 or west % 10:
                raise RuntimeError(f"Hansen manifest contains an out-of-range tile: {url}")
            spec = (north, west)
            if spec in specs:
                raise RuntimeError(f"Hansen {layer} manifest contains a duplicate tile: {url}")
            specs.add(spec)
        if not specs:
            raise RuntimeError(f"Hansen {layer} manifest contains no valid tiles")
        return specs

    loss_tiles = parse_layer(loss_response.text, "lossyear")
    mask_tiles = parse_layer(mask_response.text, "datamask")
    missing = loss_tiles - mask_tiles
    if missing:
        raise RuntimeError(f"Hansen datamask manifest is missing {len(missing)} loss-year tiles")
    return sorted(loss_tiles, key=lambda item: (-item[0], item[1]))


def _raster_env():
    return rasterio.Env(
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif,.tiff",
        CPL_VSIL_CURL_USE_HEAD="YES",
        GDAL_HTTP_MULTIRANGE="YES",
        GDAL_HTTP_TIMEOUT="60",
        GDAL_HTTP_MAX_RETRY="2",
        GDAL_HTTP_RETRY_DELAY="1",
        AWS_NO_SIGN_REQUEST="YES",
    )


def _warp_band(src, destination, transform, *, resampling, src_nodata=None, dst_nodata=None):
    reproject(
        source=rasterio.band(src, 1),
        destination=destination,
        src_transform=src.transform,
        src_crs=src.crs,
        src_nodata=src_nodata,
        dst_transform=transform,
        dst_crs="EPSG:4326",
        dst_nodata=dst_nodata,
        resampling=resampling,
        init_dest_nodata=True,
        num_threads=2,
    )


def _read_hansen_display_tile(north: int, west: int):
    loss_url, mask_url = _hansen_tile_urls(north, west)
    transform = from_origin(float(west), float(north), FOREST_DISPLAY_RESOLUTION, FOREST_DISPLAY_RESOLUTION)
    with _raster_env():
        with rasterio.open(loss_url) as loss_src, rasterio.open(mask_url) as mask_src:
            expected_bounds = (float(west), float(north - 10), float(west + 10), float(north))
            for src, label in ((loss_src, "lossyear"), (mask_src, "datamask")):
                if src.crs is None or src.crs.to_epsg() != 4326:
                    raise RuntimeError(f"Hansen {label} tile has an unexpected CRS: {_hansen_tile_name(north, west)}")
                if src.width < 1000 or src.height < 1000:
                    raise RuntimeError(f"Hansen {label} tile is unexpectedly small: {_hansen_tile_name(north, west)}")
                bounds = (src.bounds.left, src.bounds.bottom, src.bounds.right, src.bounds.top)
                if any(abs(a - b) > 0.002 for a, b in zip(bounds, expected_bounds)):
                    raise RuntimeError(f"Hansen {label} tile bounds {bounds} do not match named tile {expected_bounds}")
            # lossyear code 0 is meaningful (no detected loss), so do not
            # declare zero as source nodata. The data mask is authoritative.
            loss = np.full((FOREST_TILE_OUTPUT_SIZE, FOREST_TILE_OUTPUT_SIZE), -1, dtype=np.int16)
            _warp_band(loss_src, loss, transform, resampling=Resampling.max, src_nodata=None, dst_nodata=-1)
            # In the Hansen data mask, class 0 is unmapped/no-data, 1 is land,
            # and 2 is water. Ignore class 0 while choosing the dominant class.
            data_mask = np.zeros((FOREST_TILE_OUTPUT_SIZE, FOREST_TILE_OUTPUT_SIZE), dtype=np.uint8)
            _warp_band(mask_src, data_mask, transform, resampling=Resampling.mode, src_nodata=0, dst_nodata=0)
    if np.any(~np.isin(data_mask, (0, 1, 2))):
        raise RuntimeError(f"Hansen datamask has unknown classes in tile {_hansen_tile_name(north, west)}")
    valid_land = data_mask == 1
    if np.any(loss[valid_land] < 0) or np.any(loss[valid_land] > 25):
        raise RuntimeError(f"Hansen lossyear has an unknown code in tile {_hansen_tile_name(north, west)}")
    result = np.full((FOREST_TILE_OUTPUT_SIZE, FOREST_TILE_OUTPUT_SIZE), np.nan, dtype=np.float32)
    result[valid_land] = loss[valid_land].astype(np.float32)
    return north, west, result, int(valid_land.sum())


def _collect_forest_change(dataset: dict, retrieved_at: str):
    output = np.full((720, 1440), np.nan, dtype=np.float32)
    tile_specs = _hansen_tile_specs()
    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        futures = [pool.submit(_read_hansen_display_tile, north, west) for north, west in tile_specs]
        for future in concurrent.futures.as_completed(futures):
            north, west, tile_values, tile_valid = future.result()
            row_start = int(round((89.875 - (north - 0.125)) / FOREST_DISPLAY_RESOLUTION))
            col_start = int(round(((west % 360.0) + 0.125) / FOREST_DISPLAY_RESOLUTION)) % 1440
            row_end, col_end = row_start + FOREST_TILE_OUTPUT_SIZE, col_start + FOREST_TILE_OUTPUT_SIZE
            if row_start < 0 or row_end > output.shape[0] or col_end > output.shape[1]:
                raise RuntimeError(f"Hansen tile placement is outside global display grid: {_hansen_tile_name(north, west)}")
            if col_end <= output.shape[1]:
                output[row_start:row_end, col_start:col_end] = tile_values
            else:
                split = output.shape[1] - col_start
                output[row_start:row_end, col_start:] = tile_values[:, :split]
                output[row_start:row_end, :col_end - output.shape[1]] = tile_values[:, split:]
            completed += 1
            if completed % 36 == 0:
                print(f"LAND_FOREST_GRID_TILES completed={completed}/{len(tile_specs)}", flush=True)
    if completed != len(tile_specs):
        raise RuntimeError(f"Hansen forest grid is incomplete: {completed}/{len(tile_specs)} tiles")
    if not np.isfinite(output).any():
        raise RuntimeError("Hansen forest grid contains no mapped land cells")
    observed = "2025-12-31T00:00:00Z"
    payload, metadata = _pack_grid(output, scale=1, no_data_code=FOREST_NO_DATA_INT16, metadata={
        "dataset_id": FOREST_DATASET_ID,
        "source_name": "Hansen Global Forest Change 2025 v1.13",
        "source_id": FOREST_SOURCE_ID, "source_revision": FOREST_REVISION,
        "provider": "University of Maryland GLAD / Hansen Global Forest Change",
        "product": "Global gross forest loss year and data mask",
        "processing_level": "30 m source tiles warped to a 0.25° display grid",
        "source_url": FOREST_CATALOG_URL,
        "source_tile_manifests": [FOREST_LOSSYEAR_LIST_URL, FOREST_DATAMASK_LIST_URL],
        "valid_time_utc": observed, "source_observation_period": "2001-2025",
        "native_grid_spacing_degrees": FOREST_NATIVE_RESOLUTION_DEGREES,
        "grid_resolution_degrees": FOREST_DISPLAY_RESOLUTION,
        "latitude_first": 89.875, "latitude_step": -FOREST_DISPLAY_RESOLUTION,
        "longitude_first": 0.125, "longitude_step": FOREST_DISPLAY_RESOLUTION,
        "longitude_convention": "0..360", "units": "year_code", "variable": "lossyear",
        "source_tile_size_degrees": 10, "source_tile_count": len(tile_specs),
        "source_layer_files": ["lossyear", "datamask"],
        "source_tile_selection": "Intersection of official provider lossyear.txt and datamask.txt manifests.",
        "aggregation_method": "GDAL warp max resampling for lossyear (including valid code 0), and mode resampling for mapped datamask classes; render only where dominant class is mapped land (1).",
        "coverage_note": "Source granules cover 80°N to 60°S; outside this extent cells are no-data.",
        "interpretation_note": "The value is the latest detected loss-year code within the coarse cell, not a percentage of forest lost or an area estimate.",
        "license": "CC-BY-4.0", "attribution": "Source: Hansen/UMD/Google/USGS/NASA",
    })
    metadata["mapped_land_display_cells"] = int(np.isfinite(output).sum())
    return {"value_payload": payload, "metadata": metadata,
            "observations": _descriptor(FOREST_DATASET_ID, FOREST_SOURCE_ID, observed, retrieved_at, "year_code", FOREST_CATALOG_URL, metadata)}


_LATEST_NDVI = None


def is_due(dataset: dict) -> bool:
    dataset_id = dataset.get("dataset_id")
    current = _stored_metadata(dataset_id)
    if dataset_id == NDVI_DATASET_ID:
        global _LATEST_NDVI
        try:
            _LATEST_NDVI = _latest_ndvi_file()
        except Exception:
            return not (current.get("data_kind") == "grid" and current.get("value_file") == "values.bin")
        return (current.get("data_kind") != "grid" or
                current.get("source_id") != NDVI_SOURCE_ID or
                current.get("source_url") != _LATEST_NDVI["source_url"] or
                current.get("grid_resolution_degrees") != NDVI_DISPLAY_RESOLUTION)
    if dataset_id == FOREST_DATASET_ID:
        return not (current.get("data_kind") == "grid" and
                    current.get("source_id") == FOREST_SOURCE_ID and
                    current.get("source_revision") == FOREST_REVISION and
                    current.get("width") == 1440 and current.get("height") == 720)
    return True


def collect(dataset: dict) -> dict:
    dataset_id = dataset.get("dataset_id")
    source_id = dataset.get("collection", {}).get("source_id")
    retrieved_at = _iso(dt.datetime.now(UTC))
    expected = {NDVI_DATASET_ID: NDVI_SOURCE_ID, FOREST_DATASET_ID: FOREST_SOURCE_ID}
    if dataset_id not in expected:
        raise ValueError(f"No global Land grid adapter is configured for {dataset_id!r}")
    if source_id != expected[dataset_id]:
        raise ValueError(f"Land source id mismatch for {dataset_id}: {source_id!r}")
    if dataset_id == NDVI_DATASET_ID:
        return _collect_ndvi(dataset, retrieved_at)
    return _collect_forest_change(dataset, retrieved_at)
