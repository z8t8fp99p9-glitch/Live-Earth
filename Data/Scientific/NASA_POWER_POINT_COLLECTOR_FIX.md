# NASA POWER Daily Point Collector Fix

This patch updates `world_collectors.py` for the three NASA POWER-backed first-pass datasets.

## Data sources and variable semantics

- **Land:** `T2M` (`AG` community), published as `near_surface_air_temperature`. This is NASA POWER's daily 2-metre air temperature, not land-surface skin temperature.
- **Water & Ice:** `PRECTOTCORR` (`AG` community), published as `corrected_precipitation`. This is the observationally corrected daily precipitation forcing.
- **Energy & Humanity:** `ALLSKY_SFC_SW_DWN` (`RE` community), published as `surface_solar_radiation`.

The run logs showed the Daily point endpoint rejecting `community=HY` with HTTP 422. The patched collectors therefore use the documented AG/RE Daily API combinations above, rather than retrying that rejected value. They use the NASA Daily point endpoint with JSON responses, eliminating the prior CSV parser's assumption that point responses contain LAT/LON columns.

## Collection and validation

- One bounded multi-day JSON request is made for each of the six existing sample coordinates.
- Only finite numeric values are accepted; NASA fill values (`-999`, `-9999`) are rejected.
- Returned GeoJSON coordinates are checked against the requested sample point.
- All six sample points must share a valid observation date within the 3–10 day window. The newest common date is selected.
- Output remains explicitly labelled as six sparse regional point samples, not a complete global grid.
- The collectors do not invent values or publish partial six-point snapshots.

## Local validation performed

Python syntax compilation passed. Offline fixture tests passed for all three parameter/community combinations, six-point row generation, common-date selection, fill-value rejection, and coordinate validation.

Live NASA POWER requests were not executable in the local build environment. The next GitHub Actions run is the live-source verification step.


## Follow-up correction — solar latency window
The next live run showed that temperature and corrected precipitation were valid at all six sample points, but solar irradiance had no usable values in the 3–10 day window. NASA's Energy Fluxes documentation explains that daily solar fluxes combine CERES SYN1deg (roughly 3–4 months behind near-real-time) with CERES FLASHFlux (roughly 5–7 days latency). The energy collector now requests 7–30 days and selects the newest date common to all six points. The actual selected date and observation age remain recorded in metadata; no missing values are substituted.
