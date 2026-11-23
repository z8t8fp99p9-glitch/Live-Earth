# Native source adapters

`native_sources.py` is the Universal Collector's native adapter module. It retrieves data directly from NOAA/NCEP, NOAA/NCEI, NASA POWER and USGS.

`nasa_geos_cf.py` retrieves the latest anonymous NASA GEOS-CF v2 global fields for the four Atmospheric Composition datasets (CO2, methane, carbon monoxide and dust-attributed PM2.5). It reads only the newest available source time and updates the existing current-value grid in place. It does not create historical snapshots or archive provider responses.

All scheduled collection runs through `Data/Universal/engine/collector.py`. The adapters return source-backed records and metadata for validation and storage by the Universal pipeline; they do not maintain a separate collection or publication system.
