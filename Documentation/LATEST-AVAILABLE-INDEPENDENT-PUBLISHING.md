# LIVE // EARTH latest-available collection and independent publishing

- NASA POWER Daily requests use the full available date history (1981 to the request date), then select the newest valid non-fill observation independently for each of the six documented sample points. No fixed freshness window or shared date is imposed.
- NOAA OISST searches backward from yesterday and accepts the newest valid published daily NetCDF file.
- Every world collector writes its snapshot only after validating its own response. A failed world does not overwrite its previous committed snapshot.
- The workflow always runs the commit step after collection. Successful worlds are committed even when another collector fails. The final reporting step still marks the overall run failed if any collector failed, so failures remain visible.
- The six POWER samples are sparse regional point samples, not a global raster.
