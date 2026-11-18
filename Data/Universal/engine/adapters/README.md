# Native source adapters

`native_sources.py` is the Universal Collector's native adapter module. It retrieves data directly from NOAA/NCEP, NOAA/NCEI, NASA POWER and USGS.

All scheduled collection runs through `Data/Universal/engine/collector.py`. The adapters return source-backed records and metadata for validation and storage by the Universal pipeline; they do not maintain a separate collection or publication system.
