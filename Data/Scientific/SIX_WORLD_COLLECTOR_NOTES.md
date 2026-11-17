# LIVE // EARTH — Six-world collector correction

## Why this patch exists
The previous collector attempted a near-global NASA POWER regional request. NASA POWER regional requests are bounded; the full-world request returned HTTP 422. The previous OISST route used an ERDDAP endpoint that returned HTTP 403 in the scheduled run.

## What changes
- **Oceans:** downloads the original daily global NOAA/NCEI OISST v2.1 AVHRR NetCDF file from the NCEI daily archive. It validates the NetCDF signature and stores the source file unchanged. This is a native 0.25-degree global grid; it is not an image.
- **Land:** NASA POWER daily `TSURF` samples from six fixed regional windows.
- **Water & Ice:** NASA POWER daily `PRECTOT` samples from the same six windows. This is precipitation, not flood extent, glacier, or groundwater data.
- **Energy & Humanity:** NASA POWER daily `ALLSKY_SFC_SW_DWN` samples from the same six windows.
- **Earth Activity:** retains the validated USGS all-day earthquake GeoJSON event feed.

## Coverage honesty
NASA POWER regional windows are limited to 4.5 × 4.5 degrees (up to 100 grid cells). The three POWER outputs are therefore explicitly marked `sparse_regional_samples`, with each tile ID and request URL recorded in metadata. They must not be rendered as complete global rasters. OISST is a global native grid; USGS is an event feed, not a continuous field.

## Validation
The collector rejects HTTP errors with a short response-body diagnostic, empty or malformed data, invalid numeric rows, and non-NetCDF OISST payloads. It writes snapshots atomically and records SHA-256 hashes. The GitHub Actions run remains the required live-network validation; local syntax checks do not prove that upstream services are reachable.

## Sources
- NASA POWER Daily API documentation: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- NOAA/NCEI OISST v2.1 archive: https://www.ncei.noaa.gov/data/sea-surface-temperature-optimum-interpolation/v2.1/access/avhrr/
- USGS Earthquake GeoJSON feed: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
