# Universal data architecture

`Data/Universal` is the only active collection and dataset-registry system.

## Active collection path
- `engine/bootstrap.py` activates the configured dataset registry.
- `engine/collector.py` runs the enabled native source adapters.
- `engine/adapters/native_sources.py` retrieves source payloads directly from NOAA/NCEP, NOAA/NCEI, NASA POWER and USGS.
- Raw payloads and metadata are stored in `Data/Central-Database/raw`.
- Normalized typed records are stored in `Data/Central-Database/normalized`.
- Collection run records are stored in `Data/Central-Database/runs`.
- Published manifests are stored in `Data/Central-Database/published`.

## World and view integration
View Controllers consume the relevant published dataset contracts through the shared Universal Grid System and other existing data readers. Dataset-specific presentation remains owned by each View Controller; shared renderers remain dataset-agnostic.

## Architecture boundary
There is one active data collection architecture: Universal Collector → Central Database → application Views. Retired collection implementations and their standalone storage are not part of the runtime.
