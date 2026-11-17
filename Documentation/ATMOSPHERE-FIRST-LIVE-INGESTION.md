# Atmosphere first live ingestion

## Implemented first dataset
- Air temperature, NOAA/NCEP GFS 0.25-degree analysis, forecast hour 0.
- Latest available cycle is searched among the four daily cycles and recent dates.
- NOAA GRIB2 is subset to 2 m temperature only, decoded with ecCodes/cfgrib.
- Values are converted from Kelvin to signed int16 centi-degrees Celsius.
- Current snapshot only: `atmosphere/latest/air_temperature.bin.gz`.
- Metadata and `atmosphere/manifest.json` carry grid, time, provenance and checksum.

## Honest limitations
- This is a GFS model analysis field, not direct thermometer observations.
- This first collector populates only Atmosphere dataset 1 (air temperature).
- Other five world collector adapters are not yet implemented; they are safely skipped.
- The GitHub Actions workflow must install `Data/Scientific/requirements-refresh.txt` before running `refresh_all.py`.
- The workflow currently runs hourly, but GFS cycles are produced four times daily; repeated runs should detect same valid cycle and avoid unnecessary Git commits (Git commits only occur if content changes).

## Grid
The collector validates a 0.25-degree regular latitude/longitude grid, stores row-major values, and records coordinate order and spacing in metadata. It does not alter or resample native grid resolution.
