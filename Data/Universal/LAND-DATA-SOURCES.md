# LIVE // EARTH — Land source integration

The Land view is built on the existing Universal Collector, Central Database, Universal Grid System and GPU Grid Skin. It does not use regional point samples.

The temperature layer reuses an already-collected Atmosphere grid. The Land collector itself collects the two dedicated source grids listed below; it does not duplicate the temperature field in a second dataset.

## Land grid layers

| Dataset | Source product | Native source grid | Stored display grid |
|---|---|---:|---:|
| Near-surface temperature | Existing NOAA/NCEP GFS 2 m air-temperature grid (shared from Atmosphere) | 0.25° global model grid | Reused directly; no duplicate dataset or collector |
| Vegetation activity | NOAA/NCEI VIIRS NDVI CDR daily NetCDF | 0.05° global grid | 0.25° valid-cell mean (5 × 5 native cells) |
| Forest change | Hansen Global Forest Change 2025 v1.13 `lossyear` + `datamask` GeoTIFF tiles | 1 arc-second (~30 m) | 0.25° global display grid derived from 10° × 10° source tiles |

All source access is anonymous HTTPS. Current grid values are packed as gzip-compressed little-endian int16 and stored at the stable central path `Data/Central-Database/values/<dataset_id>/values.bin`. Metadata records dimensions, coordinates, grid spacing, units, source revision, observation period/time, valid-cell count, processing method, no-data semantics and both stored/decoded SHA-256 checksums.

## Processing and interpretation

- **Near-surface temperature:** the Land view reuses the already-collected NOAA/NCEP GFS 0.25° global 2 m air-temperature analysis grid from `earth.atmosphere.air_temperature`. It is one shared stored grid, not a duplicate Land collection. It is model analysis data, not a direct observation or satellite land-surface-temperature retrieval. The old `earth.land.land_temperature` point-sample records are retired and that duplicate collector is disabled.
- **Vegetation activity:** NOAA VIIRS NDVI is a daily global vegetation greenness/activity index. The 0.05° native values are aggregated into non-overlapping 5 × 5 blocks by arithmetic mean of valid source cells to produce a 0.25° grid suitable for the mobile GPU texture. Blocks with no valid source cells remain no-data. Fill/out-of-range values are excluded. The product QA bit flags are not currently applied or stored, so this is not a QA-screened NDVI composite.
- **Forest change:** Hansen `lossyear` and `datamask` are read from matching 10° × 10° 1-arc-second source granules discovered from the provider’s official per-layer URL manifests. The collector intersects the two manifests and skips ocean-only mask tiles that do not have a loss-year granule. The display grid keeps the maximum loss-year code within each 0.25° cell and only renders cells where the dominant source mask class is mapped land. Codes 0=no detected loss; 1–25=2001–2025. Water and no-data remain transparent. The displayed maximum year is not an area or percentage estimate.
- Hansen source tiles cover 80°N to 60°S; cells outside the published source extent remain no-data, not zero loss. The loss product maps gross stand-replacement disturbance, not every form of forest degradation. Changes in the v1.13 methodology mean long-period comparisons require caution.

## Deferred Land catalogue entries

Soil moisture, soil properties, elevation, terrain, land cover, surface reflectance and urban expansion remain registered catalogue options but are not enabled for collection or shown as available grid layers in this tranche. They will only be enabled after their global grid source, storage encoding and visual interpretation are verified. No point-sample substitutes are collected for these entries.

## Sources and attribution

- NOAA/NCEP GFS source is collected by the existing Atmosphere grid pipeline; the Land view reads its central current-value grid directly.
- NOAA NCEI NDVI CDR documentation and DOI: https://www.ncei.noaa.gov/products/climate-data-records/normalized-difference-vegetation-index and https://doi.org/10.25921/gakh-st76
- Hansen Global Forest Change v1.13 download and attribution: https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/download.html
- Hansen license: CC-BY-4.0. Display attribution: Source: Hansen/UMD/Google/USGS/NASA.
