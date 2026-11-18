# Atmosphere data store

Independent latest-snapshot store for the Atmosphere world.

## Dataset groups
- **Temperature:** 2 m air temperature
- **Pressure:** mean sea-level pressure
- **Wind:** 10 m U (eastward) and V (northward) components; speed and direction are derived from these two real fields
- **Moisture:** 2 m relative humidity, 2 m dew point, total-column precipitable water, and total cloud cover

## Shared source and grid
The configured collector uses NOAA/NCEP Global Forecast System (GFS) 0.25-degree analysis fields. Every field in a published Atmosphere snapshot must come from the same GFS cycle and match the native 1440 x 721 latitude/longitude grid. No resampling or synthetic values are used.

- Registry: `registry/datasets.json`
- Current data: `latest/`
- Snapshot manifest: `manifest.json`
- Collector: `Data/Scientific/atmosphere_gfs_collector.py`

Only verified provider data may be written here. Each published snapshot records source, source timestamp, retrieval timestamp, units, grid definition/ID, encoding, checksum, and quality status. The manifest is replaced only after all configured fields pass download, decode, grid, and numeric validation.

## Encoding
All grid fields use little-endian signed int16 with a scale of 100 (decoded value = stored integer / 100). Units are chosen per field to preserve useful precision while remaining within the signed int16 range. For example, pressure is stored in kilopascals rather than pascals.

## Scientific limitations
GFS fields are model analysis values, not direct measurements from a global network of instruments. The analysis cycle is available four times daily; the GitHub workflow may check hourly, but repeated checks can resolve to the same latest complete cycle. Atmospheric gases and chemical constituents belong to the separate **Atmospheric Composition** world.
