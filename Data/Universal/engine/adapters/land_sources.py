from __future__ import annotations

"""Anonymous NASA/NOAA-first and open global-source adapters for Land.

The current Land view is intentionally fed with the same six stable regional
sample points as NASA POWER. These are point samples, not a fabricated global
raster. Static source epochs and product quality/mask information are retained.
"""

import datetime as dt
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
from rasterio.windows import Window

UTC = dt.timezone.utc
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "LIVE-EARTH-Universal-Collector/1.0 (open public Earth data)"})

SITES = [
    {"id": "north_america", "lat": 40.0, "lon": -100.0},
    {"id": "south_america", "lat": -15.0, "lon": -60.0},
    {"id": "europe_north_africa", "lat": 35.0, "lon": 15.0},
    {"id": "east_africa", "lat": 0.0, "lon": 35.0},
    {"id": "south_asia", "lat": 20.0, "lon": 80.0},
    {"id": "east_asia_pacific", "lat": 25.0, "lon": 125.0},
]

STATIC_SOURCES = {
    "earth.land.elevation": {
        "source_id": "copernicus_dem_glo30",
        "revision": "GLO-30_Public_2021_1",
        "kind": "dem",
        "unit": "m",
        "observed_at": "2015-12-31T00:00:00Z",
        "observation_period": "2011-2015",
    },
    "earth.land.terrain": {
        "source_id": "copernicus_dem_glo30",
        "revision": "GLO-30_Public_2021_1",
        "kind": "slope",
        "unit": "degree",
        "observed_at": "2015-12-31T00:00:00Z",
        "observation_period": "2011-2015",
    },
    "earth.land.land_cover": {
        "source_id": "esa_worldcover_2021_v200",
        "revision": "2021_v200",
        "kind": "worldcover",
        "unit": "class_code",
        "observed_at": "2021-12-31T00:00:00Z",
        "observation_period": "2021",
    },
    "earth.land.forest_change": {
        "source_id": "hansen_global_forest_change_2025_v1_13",
        "revision": "GFC-2025-v1.13",
        "kind": "forest_loss_year",
        "unit": "year",
        "observed_at": "2025-12-31T00:00:00Z",
        "observation_period": "2001-2025",
    },
}
NDVI_DATASET_ID = "earth.land.vegetation_health"
NDVI_SOURCE_ID = "noaa_cdr_viirs_ndvi_daily"
NDVI_CATALOG_ROOT = "https://www.ncei.noaa.gov/thredds/catalog/cdr/ndvi"
NDVI_FILESERVER_ROOT = "https://www.ncei.noaa.gov/thredds/fileServer"
DB_VALUES = Path(__file__).resolve().parents[3] / "Central-Database" / "values"
_LATEST_NDVI = None


def _iso(value: dt.datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _get(url: str, *, cap: int = 500 * 1024 * 1024, attempts: int = 3) -> requests.Response:
    last_error = None
    for attempt in range(attempts):
        try:
            response = SESSION.get(url, timeout=(25, 240))
            if response.status_code == 429 or 500 <= response.status_code < 600:
                last_error = RuntimeError(f"HTTP {response.status_code} from {url}")
                if attempt + 1 < attempts:
                    time.sleep(2 ** attempt)
                    continue
            response.raise_for_status()
            if not response.content or len(response.content) > cap:
                raise RuntimeError(f"Invalid response size ({len(response.content)} bytes) from {url}")
            return response
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"Public source request failed: {last_error}")


def _record(dataset_id, source_id, observed_at, retrieved_at, value, unit, source_url, site, **extra):
    return {
        "dataset_id": dataset_id,
        "source_id": source_id,
        "observed_at": observed_at,
        "retrieved_at": retrieved_at,
        "value": value,
        "unit": unit,
        "latitude": site["lat"],
        "longitude": site["lon"],
        "geometry": {"type": "Point", "coordinates": [site["lon"], site["lat"]]},
        "quality": {"sample_tile_id": site["id"], **extra.pop("quality", {})},
        "provenance": {"source_url": source_url},
        **extra,
    }


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


def _tile_component(value: int, latitude: bool) -> str:
    prefix = ("N" if value >= 0 else "S") if latitude else ("E" if value >= 0 else "W")
    width = 2 if latitude else 3
    return f"{prefix}{abs(value):0{width}d}"


def _copernicus_dem_url(lat: float, lon: float) -> str:
    lat0, lon0 = math.floor(lat), math.floor(lon)
    name = f"Copernicus_DSM_COG_10_{_tile_component(lat0, True)}_00_{_tile_component(lon0, False)}_00_DEM"
    return f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"


def _worldcover_url(lat: float, lon: float) -> str:
    lat0 = math.floor(lat / 3.0) * 3
    lon0 = math.floor(lon / 3.0) * 3
    tile = f"{_tile_component(lat0, True)}{_tile_component(lon0, False)}"
    name = f"ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
    return f"https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/{name}"


def _hansen_tile(lat: float, lon: float):
    # Hansen granules use the form 40N_080W: north-west corner of a 10x10 tile.
    north = math.ceil(lat / 10.0) * 10
    west = math.floor(lon / 10.0) * 10
    lat_part = f"{abs(north):02d}{'N' if north >= 0 else 'S'}"
    lon_part = f"{abs(west):03d}{'E' if west >= 0 else 'W'}"
    return f"{lat_part}_{lon_part}"


def _hansen_url(lat: float, lon: float, layer: str) -> str:
    tile = _hansen_tile(lat, lon)
    filename = f"Hansen_GFC-2025-v1.13_{layer}_{tile}.tif"
    return f"https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/{filename}"


def _raster_env():
    return rasterio.Env(
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif,.tiff",
        CPL_VSIL_CURL_USE_HEAD="YES",
        GDAL_HTTP_MULTIRANGE="YES",
        AWS_NO_SIGN_REQUEST="YES",
    )


def _read_pixel_and_window(url: str, lat: float, lon: float, window_size: int = 1):
    """Read only a pixel or small local neighbourhood from a public COG/GeoTIFF."""
    with _raster_env():
        with rasterio.open(url) as src:
            if src.crs is None or src.crs.to_epsg() != 4326:
                raise RuntimeError(f"Expected an EPSG:4326 source raster: {url}")
            row, col = src.index(lon, lat)
            if row < 0 or col < 0 or row >= src.height or col >= src.width:
                raise RuntimeError(f"Sample coordinate falls outside source tile: {url}")
            if window_size == 1:
                result = src.read(1, window=Window(col, row, 1, 1), masked=True)
                value = result[0, 0]
                if np.ma.is_masked(value) or not np.isfinite(float(value)):
                    return None, None
                return float(value), None
            half = window_size // 2
            if row < half or col < half or row + half >= src.height or col + half >= src.width:
                raise RuntimeError(f"Terrain neighbourhood crosses DEM tile edge: {url}")
            result = src.read(1, window=Window(col - half, row - half, window_size, window_size), masked=True)
            arr = np.asarray(result.filled(np.nan), dtype=np.float64)
            if arr.shape != (window_size, window_size) or not np.isfinite(arr).all():
                raise RuntimeError(f"DEM neighbourhood contains nodata: {url}")
            return float(arr[half, half]), (arr, float(src.res[0]), float(src.res[1]))


def _collect_dem(dataset, retrieved_at: str, terrain: bool):
    dataset_id = dataset["dataset_id"]
    spec = STATIC_SOURCES[dataset_id]
    rows, urls = [], []
    for site in SITES:
        # Keep boundary points just inside the tile chosen by the standard floor rule.
        sample_lat, sample_lon = site["lat"] + 1e-5, site["lon"] + 1e-5
        url = _copernicus_dem_url(sample_lat, sample_lon)
        value, detail = _read_pixel_and_window(url, sample_lat, sample_lon, 3 if terrain else 1)
        if value is None:
            raise RuntimeError(f"Copernicus DEM has no valid elevation at {site['id']}")
        if terrain:
            arr, res_x, res_y = detail
            dx = abs(res_x) * 111320.0 * max(0.01, math.cos(math.radians(sample_lat)))
            dy = abs(res_y) * 110574.0
            dz_dy, dz_dx = np.gradient(arr, dy, dx)
            slope = math.degrees(math.atan(math.sqrt(float(dz_dx[1, 1]) ** 2 + float(dz_dy[1, 1]) ** 2)))
            value = float(slope)
        urls.append(url)
        rows.append(_record(
            dataset_id, spec["source_id"], spec["observed_at"], retrieved_at,
            round(value, 3), spec["unit"], url, site,
            quality={
                "source_observation_period": spec["observation_period"],
                "source_product": "Copernicus DEM GLO-30 Public",
                "elevation_model_type": "digital_surface_model",
                "terrain_method": "3x3 local DEM gradient; slope in degrees" if terrain else None,
                "sample_mode": "regional_point",
            },
        ))
    meta = {
        "data_kind": "point_samples", "format": "records",
        "source_name": "Copernicus DEM GLO-30 Public",
        "source_id": spec["source_id"], "source_revision": spec["revision"],
        "source_observation_period": spec["observation_period"],
        "observation_time_semantics": "period_end_marker_not_per_pixel_acquisition_timestamp",
        "source_url": urls[0], "source_urls": sorted(set(urls)),
        "coverage_mode": "six_sparse_regional_point_samples",
        "units": spec["unit"], "sample_sites": SITES,
        "elevation_model_type": "digital_surface_model",
        "description": "Slope is derived from a 3x3 neighbourhood of the same DEM; elevation includes surface objects such as vegetation and buildings.",
    }
    return {"value_payload": None, "metadata": meta, "observations": rows}


def _collect_worldcover(dataset, retrieved_at: str):
    dataset_id = dataset["dataset_id"]
    spec = STATIC_SOURCES[dataset_id]
    rows, urls = [], []
    for site in SITES:
        sample_lat, sample_lon = site["lat"] + 1e-5, site["lon"] + 1e-5
        url = _worldcover_url(sample_lat, sample_lon)
        value, _ = _read_pixel_and_window(url, sample_lat, sample_lon)
        if value is None:
            raise RuntimeError(f"ESA WorldCover has no valid land-cover class at {site['id']}")
        code = int(round(value))
        if code not in {10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100}:
            raise RuntimeError(f"Unexpected ESA WorldCover class code {code} at {site['id']}")
        urls.append(url)
        rows.append(_record(
            dataset_id, spec["source_id"], spec["observed_at"], retrieved_at,
            code, spec["unit"], url, site,
            quality={"source_observation_period": "2021", "class_code": code,
                     "sample_mode": "regional_point", "raster_resolution_m": 10},
        ))
    return {
        "value_payload": None,
        "metadata": {
            "data_kind": "point_samples", "format": "records",
            "source_name": "ESA WorldCover 10 m 2021 v200",
            "source_id": spec["source_id"], "source_revision": spec["revision"],
            "source_observation_period": "2021", "source_url": urls[0],
            "source_urls": sorted(set(urls)), "coverage_mode": "six_sparse_regional_point_samples",
            "units": spec["unit"], "sample_sites": SITES,
            "class_codes": {"10": "Tree cover", "20": "Shrubland", "30": "Grassland", "40": "Cropland",
                            "50": "Built-up", "60": "Bare or sparse vegetation", "70": "Snow and ice",
                            "80": "Permanent water bodies", "90": "Herbaceous wetland", "95": "Mangroves",
                            "100": "Moss and lichen"},
            "attribution": "© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium",
        },
        "observations": rows,
    }


def _collect_forest_change(dataset, retrieved_at: str):
    dataset_id = dataset["dataset_id"]
    spec = STATIC_SOURCES[dataset_id]
    rows, urls = [], []
    for site in SITES:
        # Hansen's granules use a north-west corner naming convention.
        sample_lat = site["lat"] - 1e-5
        sample_lon = site["lon"] + 1e-5
        loss_url = _hansen_url(sample_lat, sample_lon, "lossyear")
        mask_url = _hansen_url(sample_lat, sample_lon, "datamask")
        code, _ = _read_pixel_and_window(loss_url, sample_lat, sample_lon)
        mask, _ = _read_pixel_and_window(mask_url, sample_lat, sample_lon)
        if code is None or mask is None:
            year = None
            status = "nodata"
        elif int(round(mask)) == 2:
            year = None
            status = "water"
        elif int(round(mask)) != 1:
            year = None
            status = "unmapped"
        else:
            loss_code = int(round(code))
            if not 0 <= loss_code <= 25:
                raise RuntimeError(f"Unexpected Hansen lossyear code {loss_code} at {site['id']}")
            year = 2000 + loss_code if loss_code else 0
            status = "mapped_land"
        urls.extend([loss_url, mask_url])
        rows.append(_record(
            dataset_id, spec["source_id"], spec["observed_at"], retrieved_at,
            year, spec["unit"], loss_url, site,
            quality={"source_observation_period": "2001-2025", "lossyear_code": None if code is None else int(round(code)),
                     "data_mask": None if mask is None else int(round(mask)), "sample_status": status,
                     "zero_means": "no detected forest loss during 2001-2025", "sample_mode": "regional_point"},
            related_source_url=mask_url,
        ))
    return {
        "value_payload": None,
        "metadata": {
            "data_kind": "point_samples", "format": "records",
            "source_name": "Hansen Global Forest Change 2025 v1.13",
            "source_id": spec["source_id"], "source_revision": spec["revision"],
            "source_observation_period": "2001-2025", "source_url": urls[0],
            "source_urls": sorted(set(urls)), "coverage_mode": "six_sparse_regional_point_samples",
            "units": spec["unit"], "sample_sites": SITES,
            "lossyear_encoding": "0=no detected loss; 1-25 represent 2001-2025",
            "data_mask_encoding": {"0": "no data", "1": "mapped land", "2": "persistent water"},
            "interpretation_warning": "The product maps gross stand-replacement forest loss, not every form of forest degradation. Yearly pixel counts should not be treated as definitive area estimates without the source's methodological caveats.",
            "license": "CC-BY-4.0",
            "attribution": "Source: Hansen/UMD/Google/USGS/NASA",
        },
        "observations": rows,
    }


def _parse_date_from_name(value: str):
    for token in re.findall(r"(?<!\d)(?:19|20)\d{6}(?!\d)", value):
        try:
            return dt.datetime.strptime(token, "%Y%m%d").replace(tzinfo=UTC)
        except ValueError:
            continue
    return None


def _latest_ndvi_file():
    """Find the latest published NOAA NCEI VIIRS CDR file via anonymous THREDDS catalog."""
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
        if not candidates:
            continue
        # Prefer the VIIRS stream for recent data; AVHRR is a historical fallback only.
        viirs = [item for item in candidates if "viirs" in (item[1] + item[2]).lower()]
        chosen = max(viirs or candidates, key=lambda item: item[0])
        valid_time, url_path, name = chosen
        return {
            "valid_time": valid_time,
            "name": name or Path(url_path).name,
            "url_path": url_path,
            "source_url": f"{NDVI_FILESERVER_ROOT}/{url_path.lstrip('/')}",
            "catalog_url": catalog_url,
        }
    raise RuntimeError("NOAA NCEI NDVI THREDDS catalog has no date-stamped public NetCDF file in available yearly catalogs")


def _coordinate_name(ds: xr.Dataset, axis: str) -> str:
    wanted = "latitude" if axis == "lat" else "longitude"
    for name, coord in ds.variables.items():
        standard = str(coord.attrs.get("standard_name", "")).lower()
        units = str(coord.attrs.get("units", "")).lower()
        if standard == wanted or name.lower() in ({"lat", "latitude"} if axis == "lat" else {"lon", "longitude"}):
            if coord.ndim == 1:
                return name
        if axis == "lat" and units in {"degrees_north", "degree_north", "degrees_n"} and coord.ndim == 1:
            return name
        if axis == "lon" and units in {"degrees_east", "degree_east", "degrees_e"} and coord.ndim == 1:
            return name
    raise RuntimeError(f"NOAA NDVI NetCDF has no 1-D {wanted} coordinate")


def _nearest_index(values: np.ndarray, target: float) -> int:
    arr = np.asarray(values, dtype=np.float64)
    return int(np.nanargmin(np.abs(arr - target)))


def _collect_ndvi(dataset, retrieved_at: str):
    spec = _LATEST_NDVI or _latest_ndvi_file()
    raw = _get(spec["source_url"], cap=500 * 1024 * 1024).content
    fd, path = tempfile.mkstemp(prefix="live-earth-ndvi-", suffix=".nc")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
        with xr.open_dataset(path, engine="netcdf4", decode_cf=True, mask_and_scale=True) as ds:
            var_name = next((name for name in ds.data_vars if name.lower() == "ndvi"), None)
            if var_name is None:
                raise RuntimeError("NOAA NDVI NetCDF does not contain an NDVI variable")
            lat_name = _coordinate_name(ds, "lat")
            lon_name = _coordinate_name(ds, "lon")
            variable = ds[var_name]
            for dim in list(variable.dims):
                if dim.lower() in {"time", "times"}:
                    variable = variable.isel({dim: -1})
            variable = variable.squeeze(drop=True)
            lat_values = np.asarray(ds[lat_name].values, dtype=np.float64)
            lon_values = np.asarray(ds[lon_name].values, dtype=np.float64)
            lat_dim = ds[lat_name].dims[0]
            lon_dim = ds[lon_name].dims[0]
            if lat_dim not in variable.dims or lon_dim not in variable.dims:
                raise RuntimeError("NOAA NDVI field dimensions do not match latitude/longitude coordinates")
            qa_name = next((name for name in ds.data_vars if name.lower() in {"qa", "quality", "quality_flag"}), None)
            qa_var = ds[qa_name].squeeze(drop=True) if qa_name else None
            rows = []
            for site in SITES:
                lon_target = site["lon"] % 360.0 if np.nanmax(lon_values) > 180.0 else site["lon"]
                iy = _nearest_index(lat_values, site["lat"])
                ix = _nearest_index(lon_values, lon_target)
                selected = variable.isel({lat_dim: iy, lon_dim: ix})
                value_raw = np.asarray(selected.values).item()
                value = None
                if value_raw is not None and np.isfinite(value_raw):
                    value = float(value_raw)
                    if not -1.05 <= value <= 1.05:
                        raise RuntimeError(f"NOAA NDVI value outside physical range at {site['id']}: {value}")
                qa_value = None
                if qa_var is not None and lat_dim in qa_var.dims and lon_dim in qa_var.dims:
                    qa_raw = np.asarray(qa_var.isel({lat_dim: iy, lon_dim: ix}).values).item()
                    if qa_raw is not None and np.isfinite(qa_raw):
                        qa_value = int(qa_raw)
                rows.append(_record(
                    dataset["dataset_id"], NDVI_SOURCE_ID, _iso(spec["valid_time"]), retrieved_at,
                    value, "1", spec["source_url"], site,
                    quality={"sample_mode": "nearest_native_grid_cell", "native_grid_spacing_degrees": 0.05,
                             "quality_flag_raw": qa_value, "quality_flag_interpretation": "raw source code retained; not reclassified by collector",
                             "sample_status": "valid" if value is not None else "source_nodata"},
                ))
            metadata = {
                "data_kind": "point_samples", "format": "records",
                "source_name": "NOAA CDR VIIRS Normalized Difference Vegetation Index",
                "source_id": NDVI_SOURCE_ID, "source_revision": "NOAA_NCEI_VIIRS_CDR",
                "source_url": spec["source_url"], "catalog_url": spec["catalog_url"],
                "source_file": spec["name"], "valid_time_utc": _iso(spec["valid_time"]),
                "source_observation_period": "daily product; actual file date recorded as valid_time_utc",
                "coverage_mode": "six_sparse_regional_point_samples",
                "native_grid_spacing_degrees": 0.05, "units": "1",
                "sample_sites": SITES,
                "description": "NDVI is a satellite-derived vegetation greenness/activity index, not a direct diagnosis of plant health.",
                "citation": "NOAA Climate Data Record of VIIRS NDVI, Version 1; DOI: 10.25921/gakh-st76",
            }
            return {"value_payload": None, "metadata": metadata, "observations": rows}
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass


def is_due(dataset: dict) -> bool:
    dataset_id = dataset.get("dataset_id")
    current = _stored_metadata(dataset_id)
    if dataset_id == NDVI_DATASET_ID:
        global _LATEST_NDVI
        try:
            _LATEST_NDVI = _latest_ndvi_file()
        except Exception:
            # Do not destroy a good existing value just because the small catalog is
            # temporarily unavailable. A first collection must still attempt a fetch.
            return not bool(current)
        return current.get("source_id") != NDVI_SOURCE_ID or current.get("source_url") != _LATEST_NDVI["source_url"]
    spec = STATIC_SOURCES.get(dataset_id)
    if spec is None:
        return True
    return current.get("source_id") != spec["source_id"] or current.get("source_revision") != spec["revision"]


def collect(dataset: dict) -> dict:
    dataset_id = dataset.get("dataset_id")
    source_id = dataset.get("collection", {}).get("source_id")
    retrieved_at = _iso(dt.datetime.now(UTC))
    if dataset_id == NDVI_DATASET_ID:
        if source_id != NDVI_SOURCE_ID:
            raise ValueError(f"NOAA NDVI source id mismatch: {source_id!r}")
        return _collect_ndvi(dataset, retrieved_at)
    spec = STATIC_SOURCES.get(dataset_id)
    if spec is None:
        raise ValueError(f"No Land source adapter for {dataset_id!r}")
    if source_id != spec["source_id"]:
        raise ValueError(f"Land source id mismatch for {dataset_id}: {source_id!r}")
    kind = spec["kind"]
    if kind == "dem":
        return _collect_dem(dataset, retrieved_at, terrain=False)
    if kind == "slope":
        return _collect_dem(dataset, retrieved_at, terrain=True)
    if kind == "worldcover":
        return _collect_worldcover(dataset, retrieved_at)
    if kind == "forest_loss_year":
        return _collect_forest_change(dataset, retrieved_at)
    raise ValueError(f"Unsupported Land source kind {kind!r}")
