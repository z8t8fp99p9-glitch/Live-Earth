LIVE // EARTH — Atmospheric Composition source overlay

Files in this ZIP are intended to be extracted over the repository root.

Included:
- Data/Universal/engine/bootstrap.py
- Data/Universal/engine/adapters/atmosphere_composition.py

The bootstrap enables three anonymous public NOAA GFS model fields:
1. Water vapour -> total-column precipitable water (PWAT), kg/m².
2. Cloud properties -> total cloud cover (TCDC), percent.
3. Ozone -> total-column ozone (TOZNE), Dobson units.

Important scientific labels:
- PWAT is integrated column water vapour, not 2 m relative humidity.
- TCDC is total cloud cover, not a complete cloud microphysics dataset.
- TOZNE is total-column ozone, not a vertical ozone profile.
- All three are GFS forecast-model fields, not direct satellite observations.

NOAA GFS NOMADS is public and does not require a login/API key.
The collector requests forecast hour 003 because these fields are published
in the forecast product. It validates GRIB2, coordinates, physical range,
grid dimensions, int16 encoding, and SHA-256 before writing to the existing
Central Database. It does not synthesize or fill missing cells.

The other four options (CO2, methane, carbon monoxide, aerosols/dust) remain
disabled in the Universal Dataset Registry because a verified anonymous
global grid source has not yet been established. Station measurements must
not be rendered as global grids.

No existing Atmosphere adapter, Globe renderer, Composition controller,
navigation, or Stacks registration is replaced by this overlay.
