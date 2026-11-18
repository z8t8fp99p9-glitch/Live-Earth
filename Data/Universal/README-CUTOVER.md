# Universal data architecture cutover

This package makes `Data/Universal` the only scheduled collector path. `native_sources.py` makes direct source requests; it does not import `Data/Scientific` or run legacy World collectors.

## Active verified sources
- NOAA/NCEP GFS global 0.25° 2 m air-temperature grid
- NOAA/NCEI OISST v2.1 global 0.25° NetCDF
- NASA POWER T2M at six sparse regional points
- NASA POWER PRECTOTCORR at six sparse regional points
- USGS all-day earthquake event feed
- NASA POWER ALLSKY_SFC_SW_DWN at six sparse regional points

`bootstrap.py` enables exactly these six dataset IDs and forces every other registry entry to disabled. Grid records are metadata-bearing typed records, not fabricated scalar cells. NASA POWER records remain sparse points. Earthquakes remain events.

## Central storage
Raw source payloads and metadata are stored under `Data/Central-Database/raw`; normalized typed records under `Data/Central-Database/normalized`; each run under `Data/Central-Database/runs`.

## World mapping
`engine/world_data.py` resolves enabled assignments from the World mapping registry and reads records from central storage. World Controllers should call `world_snapshot(world_id)`; the current app's controller files have not been changed by this package because their exact paths/read contracts have not yet been verified.

## Cutover
Replace the existing scheduled workflow with the YML supplied separately. The workflow commits only `Data/Universal` and `Data/Central-Database`; it does not publish or update the old six World snapshot folders. Do not delete old application data readers until they have been explicitly migrated to `world_data.py` and tested in the running app.
