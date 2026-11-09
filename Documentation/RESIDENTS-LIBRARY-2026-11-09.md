# LIVE // EARTH — Shared Residents Library

**Prepared:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Base branch:** `main`  
**Base commit:** `a297fc0035becc7d22e34e3088a10eb1301031ef` — `Bring Weather to life with a forecast-driven 2D landscape`

## Purpose

The LIVE // EARTH world now has three permanent little neighbours. Their visual direction is small, childlike and chibi-inspired: large expressive heads, tiny bodies, simple rounded shapes and clear silhouettes. The artwork is original and uses the broad visual language of cute cartoon proportions; it does not copy an existing character or franchise.

The cast is exactly three residents. Their identities, colour palettes, hair silhouettes, SVG artwork and activity poses live in one place: `Residents/resident-library.js`. A view hosts them and chooses what they are doing. A future view can reuse the same residents without redrawing them or making a second character set.

## Library API

`window.LiveEarthResidentLibrary` provides:

- `getRoster()` — the three stable resident records.
- `getActivityCatalog()` — the shared list of supported and planned activities.
- `renderMarkup()` — the shared inline SVG character and prop markup.
- `mount(host)` — installs the artwork in a view-owned host.
- `setActivity(host, state)` — selects a known activity and its supported state, including strong-gust state.
- `unmount(host)` — clears the host during view deactivation.

The library owns identity, art and poses. Views own the context, timing and data that justify an activity. The resident host and CSS use view-neutral activity attributes so other views can reuse them.

## Current Weather activities

Weather is the first resident host. It uses only the selected Open-Meteo hourly forecast state:

- Calm idle behaviour when no special activity is justified.
- Pleasant evening play, including a small football, only under the existing local-hour, temperature, cloud, precipitation and wind thresholds.
- Two umbrellas and one rain-loving resident during rain.
- Coats, scarves, caps and gentle shivering in snow.
- Hand fans and sweat in hot conditions.
- Bracing against fast wind; only the third resident receives the playful brief lift at the strong-gust threshold.
- Quiet stargazing on a clear, calm night.

The Weather view retains one continuous landscape. Activity changes never replace that landscape. The forecast-hour selector updates both the measurements and the residents' activity.

## Shared activity catalogue

The library also includes ready-to-host poses for walking, picnics, kite flying, gardening, local celebrations and camping. Catalogue availability does not mean those activities should appear automatically. The host view must choose an activity at an appropriate time and with relevant context. Festivals must be tied to the selected region and a verified local calendar; never infer a festival or date.

Cyclones remain a separate view and are not part of the Weather residents' activity system. Weather thunderstorms are not cyclone events.

## Performance and lifecycle

The art is vector SVG, with CSS animation and no external images, video, canvas renderer or new large binary assets. The artwork is rendered once per active host. The library respects `prefers-reduced-motion`; the host must unmount the residents on deactivation.

Weather loads the library from the same origin when the Weather module registers. The existing service worker routes non-shell resources through its bounded optional cache. Once the library has fetched successfully, that cache can serve it offline. No essential service-worker shell, update-manager BUILD_ID, Global view registry, Stacks runtime, Orb geometry, Home/Earth renderer, Location permission flow, Moon/Sun renderer or Cyclone implementation is changed by this addition.

## Change and verification boundary

This revision is based on the current `main` commit above. It extracts the existing Weather residents into the shared library, provides additional reusable activities, adds a calm-night stargazing behaviour, and updates feature documentation and focused tests. Local syntax and focused source-contract tests are performed before packaging. GitHub Actions, the uploaded commit, deployment and installed-iPhone appearance can only be verified after the owner uploads the ZIP and tests the resulting app.
