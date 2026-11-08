# Earth Engine texture asset

The runtime texture path is `EarthEngine/Assets/earth-land-ocean-ice-2048.png`.

In the supplied repository snapshot this binary was not committed as a source
file; the service worker already downloads the NASA texture and stores it under
a same-origin virtual URL. This folder keeps that runtime asset's ownership and
path with the Earth Engine. The service worker's primary source is NASA's
`land_ocean_ice_2048.png`, with the existing Three.js sample texture as backup.

NASA credit: NASA Goddard Space Flight Center; image by Reto Stöckli; ocean
color/compositing enhancements by Robert Simmon, with data and technical support
from NASA MODIS teams, USGS EROS Data Center, and NOAA AVHRR.
