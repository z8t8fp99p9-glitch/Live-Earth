# Atmosphere multi-dataset ingestion — Phase 2

## Scope
Atmosphere contains four groups: Temperature, Pressure, Wind, and Moisture. Atmospheric Composition is a separate world and is intentionally excluded from this registry.

## Configured NOAA GFS fields
All fields use one NOAA/NCEP GFS 0.25-degree analysis cycle and the native 1440 x 721 grid.

| Dataset ID | Dataset | GFS field / level | Stored units |
|---|---|---|---|
| ATMOSPHERE_01 | air_temperature | TMP / 2 m above ground | °C |
| ATMOSPHERE_02 | mean_sea_level_pressure | PRMSL / mean sea level | kPa |
| ATMOSPHERE_03 | wind_u_component | UGRD / 10 m above ground | m/s |
| ATMOSPHERE_04 | wind_v_component | VGRD / 10 m above ground | m/s |
| ATMOSPHERE_05 | relative_humidity | RH / 2 m above ground | % |
| ATMOSPHERE_06 | dew_point_temperature | DPT / 2 m above ground | °C |
| ATMOSPHERE_07 | precipitable_water | PWAT / entire atmosphere | kg/m² |
| ATMOSPHERE_08 | total_cloud_cover | TCDC / entire atmosphere | % |

Wind speed and direction are derived from the U and V components. They are not separately downloaded or represented as independent source measurements.

## Collector behaviour
- Uses the existing hourly GitHub Actions workflow, Python 3.12, `requirements-refresh.txt`, and `refresh_all.py`.
- Searches recent GFS analysis cycles (00, 06, 12, 18 UTC), newest first.
- Downloads each required field as a small NOAA NOMADS GRIB2 subset.
- Decodes each field separately with cfgrib/ecCodes to avoid mixing incompatible GRIB levels.
- Requires every field to have finite values, expected dimensions, 0.25-degree spacing, and exactly matching coordinates.
- Requires all fields to belong to one analysis cycle.
- Converts values into scaled signed int16 (stored integer / 100); pressure uses kPa to remain inside the int16 range.
- Publishes per-field gzip grids and metadata, then updates the manifest with all eight dataset references.
- Does not create interpolated or synthetic values.

## Validation and status
The collector has been syntax-checked locally. A live NOAA download and GitHub Actions run are still required to confirm provider availability, exact decoded GRIB level keys, and first successful publication. Until then, datasets 2–8 remain `collector_configured_pending_first_success` in the registry. The existing temperature snapshot is preserved.

## Rendering
This phase configures and stores the scientific fields. The Atmosphere view currently has a verified temperature rendering path; pressure, wind, and moisture must receive correctly unit-aware visual adapters before their selectors are enabled. The shared Earth Engine, Universal Grid System, GPU Grid Skin, and verified temperature geographic alignment are protected.
