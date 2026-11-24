# Universal source adapters

`native_sources.py` retrieves the existing NOAA/NCEP, NOAA/NCEI, NASA POWER and USGS products.

`nasa_geos_cf.py` retrieves the latest anonymous NASA GEOS-CF v2 global fields for the Atmospheric Composition datasets.

`land_sources.py` adds anonymous Land sampling from the NOAA/NCEI VIIRS NDVI Climate Data Record and public scientific raster sources (Copernicus DEM GLO-30, ESA WorldCover 2021 v200 and Hansen Global Forest Change 2025 v1.13). The Land adapters return the same six regional point samples used by the existing Land view; they do not create a parallel database or claim global grid coverage. Static products are source-revision checked and are not redownloaded on every hourly workflow run. The NOAA NDVI adapter checks the public THREDDS catalogue for a newly published source file before deciding whether a download is due.

All adapters return data and metadata to `Data/Universal/engine/collector.py`, which validates and stores the current values centrally. An adapter failure does not overwrite the prior good value set.
