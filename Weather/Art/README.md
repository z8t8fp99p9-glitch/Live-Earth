# Weather Art Archive

This folder retains artwork catalogues, painting data, style references and production studies from the superseded Weather Live Art experiments.

They are archival material, not dependencies of the current Weather view.

## Current runtime

- `../weather-view.js` owns the full-screen Canvas 2D atmosphere and all current Weather presentation.
- `live-art-online.js` is now an inert compatibility stub. It no longer observes Home, fetches artwork, paints a canvas or modifies the Weather screen.
- `service-worker-extension.js` keeps that stub in the essential app shell only so older cached Home HTML containing a historical script reference can resolve it offline. It does not inject the old renderer into new Home responses.
- The disconnected `Weather/LivingTopography/` prototype and its obsolete tests have been retired after checking that the active app does not reference them.

The original artwork JSON and reference images remain preserved here. They should not be mistaken for the active Weather design or reconnected without a new, explicit product decision.
