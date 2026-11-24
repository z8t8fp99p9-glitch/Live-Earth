# LIVE // EARTH — Land source integration

The Land view currently uses six stable regional point locations. The first Land source tranche preserves that representation and does not pretend those points are a global continuous raster.

## Configured in this tranche

| Dataset | Source | Product time | Stored sample |
|---|---|---|---|
| Land temperature | NASA POWER (existing collector, unchanged) | Latest available daily record per point | 2 m air temperature |
| Elevation | Copernicus DEM GLO-30 Public | Source acquisition period 2011–2015; release/revision tracked separately | Digital surface model elevation in metres |
| Terrain | Derived from the same Copernicus DEM GLO-30 | Same source period as elevation | Local 3x3 slope estimate in degrees |
| Land cover | ESA WorldCover 10 m 2021 v200 | 2021 product epoch | Original WorldCover class code |
| Vegetation health indicator | NOAA/NCEI VIIRS NDVI CDR | Latest date-stamped public daily file found in anonymous THREDDS catalog | NDVI, with raw QA value retained when present |
| Forest change | Hansen Global Forest Change 2025 v1.13 | Forest-loss period 2001–2025 | Last detected gross loss year (0 means no detected loss in product period) |

All newly added sources are accessed through public, anonymous HTTPS downloads. No account, subscription, API key or credential is used. COG/GeoTIFF assets are sampled remotely; the adapter does not download complete global mosaics.

## Interpretation and limits

- The six records are regional point samples matching the existing Land view's sample positions. They are not a full global data cube.
- Copernicus GLO-30 is a digital surface model (DSM), so vegetation and buildings can affect height. Its source acquisition period is stored as a period, not represented as a per-pixel timestamp. Terrain slope is derived from a 3x3 neighbourhood of that same DSM.
- ESA WorldCover 2021 v200 is a static reference epoch. It is not a current or daily land-cover observation. Class codes are preserved, not converted to guessed percentages.
- NOAA NDVI is a vegetation greenness/activity indicator, not a medical or ecological diagnosis of plant health. The source QA code is retained unmodified; this collector does not invent its interpretation.
- Hansen `lossyear` codes are translated to years 2001–2025. Code 0 means no detected forest loss in the mapped period. The `datamask` is used to distinguish mapped land, water and no-data samples. This is gross stand-replacement loss, not every type of forest degradation.
- Source observation time, source product period/revision and retrieval time are kept distinct in the metadata/records.

## Still deferred (not enabled)

- Soil moisture: NASA SMAP standard archive routes require Earthdata authentication; NOAA CPC has a public model-derived monthly product, but its live file format and newest publication cycle need a verified anonymous file test before collection is enabled. We will not label that model estimate as direct satellite measurement.
- Soil properties: FAO HWSD requires a verified direct anonymous v2.0 file and a checked raster-to-attribute-table mapping before use.
- Surface reflectance: Sentinel-2 STAC discovery is public, but this project requirement excludes API-based discovery; a stable direct anonymous file route still needs verification.
- Urban expansion: GHSL has an anonymous open download route, but a specific observed epoch, tile scheme and sample mapping must be validated before enabling it. Future projected epochs must never be reported as observations.

NASA/NOAA products remain the first choice when anonymous direct file access is verified. Alternative scientific sources are used only where they meet the same access and provenance rules.
