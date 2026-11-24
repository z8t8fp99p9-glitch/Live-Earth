LIVE // EARTH — Land Batch 1

Scope:
- Route only earth.land.elevation and earth.land.terrain to the new bounded Copernicus DEM adapter.
- Keep all other Land sources and all non-Land collectors unchanged.
- Read a 3x3 neighbourhood for each of the six established sample sites.
- Reuse the in-process DEM sample cache so elevation and terrain share the same six remote sample windows.
- Apply GDAL HTTP timeout/retry bounds and emit per-site progress messages.
- Preserve point-sample coverage, source observation period, source URLs, and DSM caveat.

No new global raster is fabricated. No existing NASA POWER Land temperature code is changed.
