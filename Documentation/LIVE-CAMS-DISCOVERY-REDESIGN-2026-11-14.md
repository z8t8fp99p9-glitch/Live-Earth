# LIVE // EARTH — Live Cams discovery redesign

**Status:** Patch prepared for user upload; not yet deployed or device-verified.  
**Base commit:** `bf5b909245614a5f36e787d28d846abbdb9a4f23` (`main`).

## Product direction

Live Cams is a cinematic world-discovery workspace rather than a plain camera catalogue. It opens inside the existing Stacks full-screen stage, underneath the protected three-Orb feature dock. The main screen contains an editorial hero preview, a Featured Windows rail, continent discovery windows, category tiles, and a searchable camera directory. Regional selections use broad documented bounding-box searches; these are discovery windows, not exact continent boundaries. Search/category/region results expose a Load more action when the API returns a next-page cursor. Camera details show the most recent supplied frame time and publisher credit, and offer a publisher link only when the API supplies a safe HTTPS link.

## Data contract

Uses the anonymous OpenEye public REST catalogue:

- `GET https://api.openeye.cam/v1/catalog/featured`
- `GET https://api.openeye.cam/v1/catalog/categories`
- `GET https://api.openeye.cam/v1/catalog?category={category}&embeddable=1&limit=48&sort=fresh`
- `GET https://api.openeye.cam/v1/catalog?bbox={west,south,east,north}&embeddable=1&limit=48&sort=fresh`
- `GET https://api.openeye.cam/v1/catalog?q={query}&embeddable=1&limit=48&sort=fresh`

A camera image is rendered only when all of the following are true:

1. `is_free === true`.
2. `live === true` and the displayed frame is no older than 24 hours.
3. `view.render === "image"`.
4. `redistribution.preview_embed === true`.
5. The API supplies both `redistribution.attribution.name` and a valid HTTPS `redistribution.attribution.url`.
6. The preview URL is HTTPS.

Publisher credit is shown beside each image and in the detail sheet. Images are never sourced from guessed URLs or decorative stock placeholders. Restricted/source-only camera records are not forced into embeds; they are omitted from image cards until an appropriate publisher-link presentation is available.

## Playback and cost boundary

This first visual release uses public preview frames only. It does not call the paid frame endpoint, request WHEP offers, open continuous video sessions, or handle payment. A still preview is not represented as continuous video playback. Paid cameras are excluded from the cards.

## Lifecycle and protected surfaces

- Registers `live-cams` through `window.LiveEarthFeatureViews`.
- Mounts using `LiveEarthStacksFeatureRuntime.mount('live-cams')` in the existing full-screen stage.
- Aborts outstanding API requests and clears the five-minute refresh timer on close.
- Removes the mounted root and restores the stage card/class safely.
- Does not initialize a globe, map, Three.js renderer, or WebGL context.
- Does not edit Home, Earth, Moon, Sun, the five-Orb Home dock, or the protected three-Orb feature dock.
- `sw.js` already lists `Traffic/traffic-view.js` in the app shell, so no new service-worker path is needed.

## Verification boundary

The included Node contract/lifecycle test validates the source guards, registry integration, close cleanup, request timeout cleanup, and refresh timer cleanup. It does not prove OpenEye availability, current camera coverage, camera image freshness at runtime, publisher playback, service-worker update, deployment, or iPhone layout. Those must be checked after the user uploads the ZIP and reloads the app.
