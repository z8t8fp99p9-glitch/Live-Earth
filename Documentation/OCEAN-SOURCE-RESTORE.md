# Ocean source restoration

This patch corrects the two source endpoints that returned 404 in the latest
Universal Data Refresh run.

- Sea temperature restores NOAA NCEI OISST v2.1 final:
  `https://coastwatch.pfeg.noaa.gov/erddap`
  dataset `ncdcOisst21Agg_LonPM180`, variable `sst`, singleton `zlev`.
- Chlorophyll restores NASA Aqua MODIS daily Level-3 mapped chlorophyll:
  `https://coastwatch.pfeg.noaa.gov/erddap`
  dataset `erdMH1chla1day_R2022NRT`, variable `chlorophyll`.
  Native grid is 4320 x 8640 at approximately 1/24 degree. Sampling every
  third cell preserves the existing 1440 x 2880 output grid (height x width).

Only the source definitions, adapter bootstrap source IDs, and source-focused
tests are changed. Other Ocean source definitions, Atmosphere, grid storage,
and renderer contracts are retained.

Run the new focused test:
`python -m unittest Data.Universal.engine.adapters.test_ocean_source_restore -v`

Then run the existing Ocean test modules. The live NOAA metadata pages were
checked before packaging; this patch has not yet been run through GitHub Actions.
