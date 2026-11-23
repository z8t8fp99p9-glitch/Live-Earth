# Ocean pipeline public-source recovery

This update preserves the existing Universal Ocean collector and storage contract while moving three failing feeds to their current NOAA public distributions.

## Source corrections

- **Sea-surface temperature:** NOAA NCEI ERDDAP dataset `ncdc_oisst_v2_avhrr_by_time_zlev_lat_lon`, the same daily OISST v2.1 AVHRR-only final product. The NCEI feed uses a `depth` singleton dimension and publishes an ISO `time_coverage_end` attribute, which is preferred for latest-time detection.
- **Sea-surface salinity:** NOAA PolarWatch ERDDAP dataset `noaacwSMOSsssDaily`, the same daily global 0.25-degree MIRAS SMOS Level-3 salinity product.
- **Chlorophyll-a:** NOAA CoastWatch ERDDAP dataset `noaacwN20N21DINEOF2kmDaily`, the replacement NOAA-20 + NOAA-21 VIIRS Level-4 DINEOF global 2 km daily product announced by CoastWatch in October 2026. This is not the legacy Aqua MODIS product. NOAA's source product is gap-filled; LIVE // EARTH applies no additional interpolation and samples every sixth native 2 km cell to retain the 2880 × 1440 renderer contract.

## Integrity and scope

- The collector continues to retain the source's actual observation time, source URL, provider, product identity, units, and grid coordinates.
- The chlorophyll source identity is updated in both bootstrap configuration and the dataset registry; it is not mislabeled as NASA MODIS.
- The Ocean currents, sea-level, wave-height adapters and their source definitions are unchanged.
- Atmosphere, other worlds, renderer contracts, storage encoding, and the YAML workflow are unchanged.
- No credentials, accounts, subscriptions, paid services, locally generated values, or collector-side interpolation are introduced.

## Verification

Run:

```bash
python -m unittest Data.Universal.engine.adapters.test_ocean_pipeline -v
python -m unittest Data.Universal.engine.adapters.test_ocean_chlorophyll_axis -v
python -m unittest Data.Universal.engine.adapters.test_ocean_fixed_pipeline -v
```

Then run `LIVE // EARTH Universal Data Refresh` and inspect the three recovered `DATASET_RESULT` lines and the exact source URLs recorded in their metadata.
