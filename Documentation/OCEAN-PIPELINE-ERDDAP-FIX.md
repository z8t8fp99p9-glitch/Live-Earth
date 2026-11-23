# Ocean pipeline ERDDAP correction

This patch keeps the rebuilt NOAA/NASA Ocean collector and its working NOAA GFS-Wave path. It adds a thin corrected adapter entry point and changes only the six Ocean adapter mappings in `bootstrap.py`.

## Root causes fixed

- ERDDAP griddap's middle selector value is an **integer source-index stride**, not a coordinate increment in degrees. Requests such as `:0.25:` for a 0.25-degree grid are invalid. The corrected requests use `:1:` for native resolution and `:3:` for the chlorophyll downsample.
- NASA MODIS 4 km coordinates are documented as evenly spaced at 1/24 degree. CSV serialization can contain harmless floating-point noise; the corrected axis validation accepts tiny representation differences while still rejecting materially irregular axes.

## Scope

- `ocean_fixed.py` delegates all data acquisition, decoding, validation, checksums, metadata, and storage payload creation to the rebuilt `ocean.py` adapter.
- All six Ocean datasets use the corrected entry point. The NOAA GFS-Wave collection logic is unchanged.
- Atmosphere, other datasets, shared collector, scheduler, Universal Grid renderer, and storage contract are unchanged.
- No credentials, accounts, subscriptions, paid services, interpolation, or synthetic values are introduced.

## Verification

Run `python -m unittest Data.Universal.engine.adapters.test_ocean_fixed_pipeline -v` and then run the existing `test_ocean_pipeline.py` suite. After deployment, run `LIVE // EARTH Universal Data Refresh` and inspect all six `DATASET_RESULT earth.oceans.*` lines.
