# LIVE // EARTH — Six World Collector Connection Patch

This patch connects one verified initial feed to each of the five worlds that previously had no collector, and updates `refresh_all.py` so all six collectors run in one scheduled workflow. The existing Atmosphere GFS collector is not modified.

## First-pass source coverage

| World | Initial dataset | Official source | Nature of feed |
|---|---|---|---|
| Atmosphere | 2 m air temperature | NOAA/NCEP GFS | Global model analysis grid (existing collector) |
| Oceans | Sea-surface temperature | NOAA/NCEI OISST v2.1 Final via ERDDAP | Global daily analysis, sampled at 1-degree intervals; final-product latency |
| Land | Surface temperature | NASA POWER | Daily regional gridded product, 0.5-degree grid |
| Water & Ice | Precipitation | NASA POWER | Daily regional gridded product, 0.5-degree grid |
| Earth Activity | Earthquakes | USGS ComCat GeoJSON | Global past-24-hour event feed |
| Energy & Humanity | Surface solar radiation | NASA POWER | Daily regional gridded product, 0.5-degree grid |

This is the first live connection for each database, **not all 56 catalog datasets**. Remaining registry entries must remain unconfigured until their own source, variable, units, cadence, license, and validation rules are implemented. NASA POWER is an analysis-ready model/reanalysis product and should not be described as direct observations. OISST is an interpolated/blended analysis, not raw satellite pixels. USGS earthquake events are discrete records, not a continuous raster.

## Files

- `Data/Scientific/world_collectors.py` — new collectors for Oceans, Land, Water & Ice, Earth Activity, Energy & Humanity.
- `Data/Scientific/refresh_all.py` — replaces the skip-missing runner with an explicit six-world runner.
- Existing `Data/Scientific/atmosphere_gfs_collector.py` and requirements are preserved.

## Validation and safety

Each collector fails closed if the response is empty, too large, malformed, or has no valid records. It writes a compressed source payload, metadata, and the corresponding world manifest only after basic validation. It never manufactures records. A failed collector causes the overall workflow to fail, so a partial refresh is visible in GitHub Actions logs.

The NASA POWER global regional request and NOAA ERDDAP slice should be validated in the first GitHub Actions run. If the upstream API changes its CSV response or rejects the global bounding box, that world will fail visibly and must not be marked live until corrected.

## Installation

Upload the ZIP through the repository's existing ZIP extractor. It contains no `.github` files. The existing workflow already runs `Data/Scientific/refresh_all.py` and adds all six database folders. After extraction, run **LIVE // EARTH Scientific Data Refresh** manually from GitHub Actions and inspect all six sections in the job log.

## Source documentation

- NOAA OISST ERDDAP dataset: https://upwell.pfeg.noaa.gov/erddap/griddap/oisst_rclone.html
- NOAA ERDDAP griddap request format: https://upwell.pfeg.noaa.gov/erddap/griddap/documentation.html
- NASA POWER Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- NASA POWER parameter catalog: https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/
- USGS real-time GeoJSON feeds: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- USGS ComCat API documentation: https://earthquake.usgs.gov/fdsnws/event/1/
