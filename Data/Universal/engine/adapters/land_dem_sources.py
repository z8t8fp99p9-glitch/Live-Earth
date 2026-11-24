from __future__ import annotations

"""Bounded, shared Copernicus DEM samples for Land elevation and terrain."""

import datetime as dt
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window

UTC = dt.timezone.utc
DB_VALUES = Path(__file__).resolve().parents[3] / "Central-Database" / "values"

SITES = [
    {"id": "north_america", "lat": 40.0, "lon": -100.0},
    {"id": "south_america", "lat": -15.0, "lon": -60.0},
    {"id": "europe_north_africa", "lat": 35.0, "lon": 15.0},
    {"id": "east_africa", "lat": 0.0, "lon": 35.0},
    {"id": "south_asia", "lat": 20.0, "lon": 80.0},
    {"id": "east_asia_pacific", "lat": 25.0, "lon": 125.0},
]

SPECS = {
    "earth.land.elevation": {
        "kind": "elevation", "unit": "m",
        "description": "Copernicus DEM GLO-30 digital surface model elevation samples",
    },
    "earth.land.terrain": {
        "kind": "slope", "unit": "degree",
        "description": "Slope in degrees derived from a 3x3 Copernicus DEM GLO-30 neighbourhood",
    },
}

# Shared by the two adjacent dataset jobs in the same collector process.
# Values are small 3x3 windows, never whole raster tiles.
_DEM_SAMPLE_CACHE: dict[str, tuple[float, np.ndarray, float, float, str]] = {}


def _iso_now() -> str:
    return dt.datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _tile_component(value: int, latitude: bool) -> str:
    prefix = ("N" if value >= 0 else "S") if latitude else ("E" if value >= 0 else "W")
    width = 2 if latitude else 3
    return f"{prefix}{abs(value):0{width}d}"


def _dem_url(lat: float, lon: float) -> str:
    lat0, lon0 = math.floor(lat), math.floor(lon)
    name = (
        f"Copernicus_DSM_COG_10_{_tile_component(lat0, True)}_00_"
        f"{_tile_component(lon0, False)}_00_DEM"
    )
    return f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"


def _stored_metadata(dataset_id: str) -> dict:
    path = DB_VALUES / dataset_id / "metadata.json"
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, json.JSONDecodeError):
        return {}


def is_due(dataset: dict) -> bool:
    dataset_id = dataset.get("dataset_id", "")
    if dataset_id not in SPECS:
        return True
    current = _stored_metadata(dataset_id)
    return (
        current.get("source_id") != "copernicus_dem_glo30"
        or current.get("source_revision") != "GLO-30_Public_2021_1"
    )


def _sample_dem(site: dict) -> tuple[float, np.ndarray, float, float, str]:
    # Move exact integer coordinates just inside the intended 1-degree tile.
    lat, lon = site["lat"] + 1e-5, site["lon"] + 1e-5
    url = _dem_url(lat, lon)
    cached = _DEM_SAMPLE_CACHE.get(url)
    if cached is not None:
        return cached

    print(f"LAND_DEM_SAMPLE_START site={site['id']}", flush=True)
    env_options = {
        "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
        "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.tiff",
        "CPL_VSIL_CURL_USE_HEAD": "YES",
        "GDAL_HTTP_MULTIRANGE": "YES",
        "GDAL_HTTP_TIMEOUT": "12",
        "GDAL_HTTP_MAX_RETRY": "0",
        "GDAL_HTTP_RETRY_DELAY": "1",
        "AWS_NO_SIGN_REQUEST": "YES",
    }
    with rasterio.Env(**env_options):
        with rasterio.open(url) as src:
            if src.crs is None or src.crs.to_epsg() != 4326:
                raise RuntimeError("Copernicus DEM tile is not EPSG:4326")
            row, col = src.index(lon, lat)
            if row < 1 or col < 1 or row + 1 >= src.height or col + 1 >= src.width:
                raise RuntimeError(f"DEM sample neighbourhood crosses tile edge at {site['id']}")
            window = src.read(1, window=Window(col - 1, row - 1, 3, 3), masked=True)
            if np.ma.is_masked(window) and np.ma.getmaskarray(window).any():
                raise RuntimeError(f"Copernicus DEM neighbourhood contains nodata at {site['id']}")
            arr = np.asarray(window, dtype=np.float64)
            if arr.shape != (3, 3) or not np.isfinite(arr).all():
                raise RuntimeError(f"Invalid Copernicus DEM neighbourhood at {site['id']}")
            center = float(arr[1, 1])
            res_x, res_y = float(src.res[0]), float(src.res[1])

    result = (center, arr, res_x, res_y, url)
    _DEM_SAMPLE_CACHE[url] = result
    print(f"LAND_DEM_SAMPLE_OK site={site['id']}", flush=True)
    return result


def _slope_degrees(arr: np.ndarray, res_x: float, res_y: float, latitude: float) -> float:
    dx = abs(res_x) * 111320.0 * max(0.01, math.cos(math.radians(latitude)))
    dy = abs(res_y) * 110574.0
    dz_dy, dz_dx = np.gradient(arr, dy, dx)
    return math.degrees(math.atan(math.hypot(float(dz_dx[1, 1]), float(dz_dy[1, 1]))))


def collect(dataset: dict) -> dict:
    dataset_id = dataset.get("dataset_id")
    spec = SPECS.get(dataset_id)
    source_id = dataset.get("collection", {}).get("source_id")
    if spec is None or source_id != "copernicus_dem_glo30":
        raise ValueError(f"Unsupported Copernicus DEM dataset/source: {dataset_id!r}/{source_id!r}")

    retrieved_at = _iso_now()
    rows, urls = [], []
    print(f"LAND_DEM_DATASET_START dataset={dataset_id}", flush=True)
    for site in SITES:
        elevation, arr, res_x, res_y, url = _sample_dem(site)
        value = elevation if spec["kind"] == "elevation" else _slope_degrees(arr, res_x, res_y, site["lat"] + 1e-5)
        rows.append({
            "dataset_id": dataset_id,
            "source_id": source_id,
            "observed_at": "2015-12-31T00:00:00Z",
            "retrieved_at": retrieved_at,
            "value": round(float(value), 3),
            "unit": spec["unit"],
            "latitude": site["lat"],
            "longitude": site["lon"],
            "geometry": {"type": "Point", "coordinates": [site["lon"], site["lat"]]},
            "quality": {
                "sample_tile_id": site["id"],
                "source_observation_period": "2011-2015",
                "source_product": "Copernicus DEM GLO-30 Public",
                "elevation_model_type": "digital_surface_model",
                "terrain_method": "3x3 local DEM gradient; slope in degrees" if spec["kind"] == "slope" else None,
                "sample_mode": "regional_point",
            },
            "provenance": {"source_url": url},
        })
        urls.append(url)

    metadata = {
        "data_kind": "point_samples",
        "format": "records",
        "source_name": "Copernicus DEM GLO-30 Public",
        "source_id": source_id,
        "source_revision": "GLO-30_Public_2021_1",
        "source_observation_period": "2011-2015",
        "observation_time_semantics": "period_end_marker_not_per_pixel_acquisition_timestamp",
        "source_url": urls[0],
        "source_urls": sorted(set(urls)),
        "coverage_mode": "six_sparse_regional_point_samples",
        "units": spec["unit"],
        "sample_sites": SITES,
        "elevation_model_type": "digital_surface_model",
        "description": spec["description"],
    }
    print(f"LAND_DEM_DATASET_READY dataset={dataset_id} records={len(rows)}", flush=True)
    return {"value_payload": None, "metadata": metadata, "observations": rows}
