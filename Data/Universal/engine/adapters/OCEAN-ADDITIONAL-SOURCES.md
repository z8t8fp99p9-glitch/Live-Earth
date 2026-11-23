# Additional Ocean datasets

The `ocean_additional.py` adapter activates the four previously registered but
unconfigured Ocean layers. It does not replace the six established datasets:
those remain on `ocean_fixed` with their existing source IDs and grids.

| Layer | Public source | Native / stored grid | Measurement |
|---|---|---|---|
| Ocean colour | NASA Aqua MODIS R2022 NRT `erdMH1cflh1day_R2022NRT` | 4 km / sampled to 0.125° | Normalized fluorescence line height (`nflh`), not reflectance or chlorophyll |
| Marine productivity | NOAA CoastWatch VIIRS NOAA-20 `productivity_viirs_noaa20_daily_nrt` | 4 km / sampled to 0.125° | Net primary productivity of carbon, `mg C m-2 day-1` |
| Ocean heat | NOAA NCEI monthly 0–2000 m analyzed field | Native 1° | Heat-content anomaly, `10^18 J` |
| Sea ice | NOAA NCEI OISST v2.1 `ice` variable | Native 0.25° | Sea-ice area fraction, 0–1 |

Source metadata:
- [NASA Aqua MODIS fluorescence line height](https://coastwatch.pfeg.noaa.gov/erddap/info/erdMH1cflh1day_R2022NRT/index.html)
- [NOAA VIIRS NOAA-20 primary productivity](https://coastwatch.pfeg.noaa.gov/erddap/info/productivity_viirs_noaa20_daily_nrt/index.html)
- [NOAA NCEI OISST v2.1 sea-ice fraction](https://upwell.pfeg.noaa.gov/erddap/info/ncdcOisst21Agg_LonPM180/index.html)
- [NOAA NCEI monthly 0–2000 m heat-content anomaly fields](https://www.ncei.noaa.gov/access/global-ocean-heat-content/heat_monthly_global.html)

All three ERDDAP fields use the common validated Ocean decoder and preserve
source values by integer-stride sampling only. The source coordinates are
checked against the regular-grid contract with a small tolerance for float32
coordinate serialization noise; material irregularity is rejected. The
monthly heat-content decoder selects the latest time in the published CF
NetCDF, validates the native 180 × 360 one-degree grid, and does not resample.

A failed or stale source does not overwrite the last successfully stored grid.
The monthly heat file is checked by its HTTP modification metadata when
available, avoiding repeated 66 MB downloads during hourly collector runs.
