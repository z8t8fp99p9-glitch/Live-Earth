# LIVE // EARTH — Global Clouds View

## What this implementation does

- Keeps the existing Clouds-only full-screen Earth Engine globe and its rotation, pinch zoom, resize and cleanup lifecycle.
- Replaces the MODIS/Terra daily cloud-fraction colour raster with natural-colour geostationary satellite imagery.
- Discovers the global Geostationary Ring Natural Color RGB and infrared layers from public WMS GetCapabilities documents. It does not guess or hard-code an unverified provider layer identifier.
- Tries the EUMETView WMS first, then the NASA GIBS WMS catalogue.
- Uses a global EPSG:4326 WMS GetMap image as an equirectangular Earth-surface texture.
- Provides a natural-colour / infrared switch, opacity control, hide/show, manual refresh and optional accelerated playback of up to four recent real observation frames.
- Uses the WMS time dimension when available. If the server omits time metadata, it probes bounded 3-hour slots for up to 72 hours.
- Keeps all source and presentation code inside this `Clouds/` folder. No Stacks, Atmosphere, Earth Engine, service-worker or Home files are changed.

## Data interpretation and limits

The global geostationary ring combines imagery from GOES, Meteosat and Himawari satellite systems. The published ring natural-colour product is a multi-satellite composite with approximately 3-hour imagery cadence. The imagery is not a minute-by-minute feed and it does not provide full-quality geostationary coverage at the poles.

Visible/natural-colour imagery is best for daytime cloud appearance. Infrared imagery is available for night-time cloud monitoring, but it is a satellite thermal view rather than a photograph. Satellite cloud imagery helps observe cloud systems; it does not by itself guarantee a rainfall forecast at a particular location.

The controller checks for a newer image hourly while Clouds is open. This check interval does not change the source product's own observation cadence.

## Files

- `clouds-view.js` — full-screen globe, controls, rendering and lifecycle.
- `clouds-satellite.js` — public WMS capability discovery, time selection and image requests.

## Verification required after deployment

- Confirm that the selected WMS provider allows browser CORS from the deployed app.
- Confirm that its capabilities list exposes the global natural-colour and infrared ring layers.
- Check latest available observation time, correct global image orientation and transparency on the globe.
- Check London, Dubai, India, the Americas and Asia against the provider's coverage.
- Check night mode, 3-hour animation playback, offline handling and close/reopen cleanup on an installed iPhone.

The view fails clearly to the clean Earth if the satellite service is unavailable. It does not substitute synthetic clouds or stale cached imagery.
