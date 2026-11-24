# Universal source adapters

`native_sources.py` retrieves existing NOAA/NCEP, NOAA/NCEI, NASA POWER and USGS products for the datasets assigned to it. The Land view reuses the existing global NOAA/NCEP GFS 2 m air-temperature grid from the Atmosphere dataset; it does not create another temperature copy or rely on a regional point request.

`land_sources.py` collects the enabled Land datasets as grids: NOAA/NCEI daily VIIRS NDVI and Hansen Global Forest Change 2025 v1.13. The NOAA 0.05° grid is aggregated to a valid-cell mean 0.25° grid; product QA bit flags are not yet applied. Hansen 1-arc-second GeoTIFF granules are discovered from the official loss-year and data-mask manifests, paired by tile, and aggregated to a 0.25° grid while retaining no-data and mapped-land masks. No six-location point samples are produced.

All adapters return a current encoded value field and one grid descriptor observation to `Data/Universal/engine/collector.py`, which validates and stores the values centrally. A failed fetch, validation or storage operation does not replace the previous committed dataset values.
