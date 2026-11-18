# LIVE // EARTH — Atmosphere four-field Universal connection

## Four controls, five dataset IDs
- Temperature → `earth.atmosphere.air_temperature` (NOAA GFS TMP, 2 m, °C)
- Pressure → `earth.atmosphere.atmospheric_pressure` (NOAA GFS PRMSL, mean sea level, kPa)
- Wind → `earth.atmosphere.wind_speed` and `earth.atmosphere.wind_direction` (derived from NOAA GFS 10 m UGRD/VGRD, m/s and degrees FROM north)
- Moisture → `earth.atmosphere.humidity` (NOAA GFS RH, 2 m, %)

All fields use the native global GFS 0.25° grid (1440 × 721) and one six-hourly analysis cycle. The collector caches decoded fields within a run and skips a cycle already stored, so the hourly workflow does not repeatedly fetch the same GFS cycle. The central publisher writes one manifest pointing to source retrieval files in `Data/Central-Database/raw`; it does not duplicate the grid payloads.

## Rendering
The Atmosphere selector contains only Temperature, Pressure, Wind, and Moisture. Composition is intentionally removed from this selector and remains its own `atmospheric_composition` World. Wind renders speed as the scalar GPU skin and overlays directional arrows derived from the independently stored direction grid.

## Validation boundary
Local syntax/structure checks can validate the code package, but first live NOAA retrievals, GRIB key decoding and browser rendering must be confirmed by a successful GitHub Actions run and app check.
