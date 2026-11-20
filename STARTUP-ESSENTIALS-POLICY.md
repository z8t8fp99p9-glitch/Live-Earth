# LIVE // EARTH — v153 startup and optional-view policy

## Essential startup
The install-time app shell retains the Home/Earth renderer, shared view and Orb registries, Stacks feature catalogue/runtime, Sun primary-view controller, Moon/sky controllers, core data/location services, update manager, and startup dependencies.

## On-demand feature controllers
Clouds, Weather, Earthquakes, Traffic, Atmosphere, Atmospheric Composition, Oceans, Land, Water & Ice, Earth Activity, Energy & Humanity, and Editorial Engine controllers are optional resources. Their catalogue entries are registered without downloading their controller scripts. The existing Orb registry loads each controller only after the corresponding feature is explicitly selected.

## Caching and offline behavior
Optional same-origin scripts are handled by the Service Worker's bounded optional cache. Online requests prefer fresh network content and refresh the optional cache; offline requests can use a saved optional copy. The bounded cache remains separate from the versioned app-shell cache and user IndexedDB.

## Update coordination
`sw.js` and `Global/update-manager.js` share the exact build identifier `v153-on-demand-feature-views`. The Service Worker removes retired app-shell caches only after the page reports verified startup with that matching identifier. The optional cache and user IndexedDB are not deleted by that cleanup.

## Preserved behavior
The feature Orb catalogue order is preserved, with Elevation remaining locally implemented in the shared Stacks feature runtime. Existing primary views and shared scene/view lifecycle code are not rewritten.
