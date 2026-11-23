# LIVE // EARTH — Ocean pipeline rebuild

This package replaces the previous Ocean-specific adapters with one new
`Data.Universal.engine.adapters.ocean` module. It does not change the existing
Universal Collector, hourly GitHub Actions schedule, current-value store, or
Universal Grid System.

## Ocean layers

| Layer | Public source | Cadence | Stored grid |
|---|---|---:|---:|
| Sea temperature | NOAA/NCEI OISST v2.1 final | Daily | 1440 × 720 |
| Ocean currents | NOAA CoastWatch near-real-time daily altimetry currents | Daily | 1440 × 720 |
| Sea level | NOAA CoastWatch near-real-time daily altimetry SLA | Daily | 1440 × 720 |
| Salinity | NOAA CoastWatch / ESA SMOS daily SSS | Daily | 1440 × 720 |
| Wave height | NOAA/NCEP GFS-Wave global 0.25° | 6-hourly | 1440 × 721 |
| Chlorophyll | NASA Aqua MODIS R2022 NRT via NOAA CoastWatch ERDDAP | Daily | 2880 × 1440 |

The adapter reads each ERDDAP coordinate axis and constructs selectors using
coordinate values, not index numbers. Chlorophyll samples every third native
0.0416667° cell to produce the existing 0.125° display grid. This is a fixed
integer-stride sample, not interpolation. All grids are packed into the
existing gzip-compressed little-endian signed-int16 format with a SHA-256
checksum and explicit no-data value.

## Runtime behavior

- `bootstrap.py` routes all six Ocean dataset IDs to the new `ocean` adapter.
- The existing collector calls `is_due()` and then `collect()` per dataset.
- Daily ERDDAP products are skipped when the latest published source time is
  already stored. The wave layer is skipped until a newer GFS-Wave cycle/file
  is available.
- Every field is written through the existing atomic current-value store.
- No run-history folders, raw source archives, credentials, or paid services
  are introduced.
- The two retired adapter files are removed by the upload manifest.
- The previous Ocean `metadata.json` and `values.bin` current-value files are
  removed by the upload manifest, forcing a clean first collection from the
  replacement sources. No other worlds or datasets are cleared.

## Source references

- NOAA/NCEI OISST v2.1: https://upwell.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180.html
- NOAA CoastWatch altimetry product: https://oceanwatch.noaa.gov/cwn/products/sea-level-anomaly-and-geostrophic-currents-multi-mission-global-optimal-interpolation.html
- NOAA CoastWatch SMOS SSS: https://coastwatch.pfeg.noaa.gov/erddap/griddap/coastwatchSMOSv662SSS1day.html
- NOAA/NCEP GFS-Wave: https://www.nco.ncep.noaa.gov/pmb/products/gfs/
- NASA Aqua MODIS chlorophyll R2022 NRT: https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdMH1chla1day_R2022NRT.html

## Local contract tests

Run `python -m unittest Data.Universal.engine.adapters.test_ocean_pipeline -v`
from the repository root. These tests cover all six adapter routes, bootstrap
mapping, coordinate-based sampling, renderer dimensions/units, packed grid
encoding/checksum, and the Universal Grid metadata shape.

## Deployment verification

After the ZIP is uploaded through the repository's existing manifest-validated
extractor, the next Universal Data Refresh run must show each of the six
`earth.oceans.*` datasets as either `SUCCESS` or `SKIPPED` (only if the stored
source timestamp is already current). The Ocean view should then load each
`metadata.json` + `values.bin` pair through `LiveEarthUniversalGridSystem`.
