# Land data view

The Land World reads current numerical grids from the shared Universal Central Database and renders them through the shared Universal Grid System and GPU Grid Skin.

- Global near-surface temperature reuses the existing NOAA/NCEP GFS 0.25° 2 m air-temperature grid owned by the Atmosphere dataset. It is a shared reference, not a duplicate Land collection.
- Vegetation activity uses the NOAA/NCEI daily VIIRS NDVI grid, aggregated from native 0.05° cells to a 0.25° display grid.
- Forest change uses Hansen Global Forest Change 2025 v1.13 `lossyear` and `datamask` GeoTIFF granules, reduced to a 0.25° global display grid. The published source coverage is 80°N to 60°S.

Each dataset's metadata is stored beside its stable `values.bin` path and retains the source, time, dimensions, coordinates, units, processing method, no-data semantics and checksums. The Land view does not use six-region point samples as a substitute for a grid.
