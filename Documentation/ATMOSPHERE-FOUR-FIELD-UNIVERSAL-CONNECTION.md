# LIVE // EARTH — Atmosphere four-field Universal connection

## Four controls, five dataset IDs
- Temperature → `earth.atmosphere.air_temperature` (NOAA GFS TMP, 2 m, °C)
- Pressure → `earth.atmosphere.atmospheric_pressure` (NOAA GFS PRMSL, mean sea level, kPa)
- Wind → `earth.atmosphere.wind_speed` and `earth.atmosphere.wind_direction` (derived from NOAA GFS 10 m UGRD/VGRD, m/s and degrees FROM north)
- Moisture → `earth.atmosphere.humidity` (NOAA GFS RH, 2 m, %)

All fields use the native global GFS 0.25° grid (1440 × 721) and one six-hourly analysis cycle. Decoded fields are cached within a collection run. The collector writes the actual encoded numeric values to the dataset's stable `Data/Central-Database/values/<dataset_id>/values.bin` path and its grid definition to `metadata.json`. A newer successful cycle replaces those same values; no dated copies or raw GRIB archives are retained.

## Rendering
The Atmosphere selector contains only Temperature, Pressure, Wind, and Moisture. Composition remains its own `atmospheric_composition` World. Wind renders speed as the scalar GPU skin and overlays directional arrows derived from the independently stored direction grid.

## Validation boundary
The current-value reader verifies both the stored-file SHA-256 and the decoded grid-value SHA-256 before rendering. Local syntax/structure checks cannot replace a successful NOAA retrieval, GRIB decoding check, GitHub Actions run and browser rendering check.
