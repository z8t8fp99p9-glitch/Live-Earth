# LIVE // EARTH — Live Cams discovery and regional recovery

**Status:** Focused functional recovery patch prepared for manual upload; deployment and device verification pending.  
**Base commit inspected:** `80cb82fbed57911b911555b2bc158975bab57c8e` (`main`, 14 November 2026).  
**Patch purpose:** Recover camera discovery when a regional catalogue query succeeds with an empty page, correctly handle zoom-dependent map clusters, and keep valid no-preview directory records visible without misrepresenting them as working camera feeds.

## Product and integration boundaries

The existing Live Cams design remains unchanged. Live Cams continues to mount inside the existing Stacks full-screen stage. The separate Traffic wallpaper registration, Home, Earth, Moon, Sun, the five-Orb Home dock and the protected three-Orb feature dock are not changed. No globe, map renderer, WebGL context, paid frame endpoint or metered continuous-video session is created by this patch.

## OpenEye directory contract

Uses anonymous public GET endpoints from `https://api.openeye.cam/v1`:

- `/catalog/featured` for the curated homepage showcase.
- `/catalog/categories` for category counts.
- `/catalog?bbox={west,south,east,north}&limit=48&sort=fresh` for a regional directory page.
- `/catalog?category={category}&limit=48&sort=fresh` for a category page.
- `/catalog?q={query}&limit=48&sort=fresh` for text search.
- `/catalog/map` for a lean spatial candidate projection when a regional/category directory page has no usable records.
- `/catalog/{id}` to resolve a map candidate into its enriched camera record.
- `/catalog/random` for homepage-only last-resort backfill.

The directory queries deliberately do not apply `embeddable=1`: the API documents that filter as showable-preview-only, which removes useful source-link camera records from discovery.

## Regional recovery behaviour

A successful HTTP 200 response with no usable records is not treated as proof that a region has no cameras. The client tries the supported simpler query variants and then calls `/catalog/map` with `zoom=11`, `cluster=auto`, and a bounded candidate limit. OpenEye documents count clusters below zoom 10 and camera-level representatives at higher zooms. The client defensively reads IDs from both `items` and `clusters`, de-duplicates them, and resolves them through `/catalog/{id}` before rendering. This recovery runs for empty/unusable successful responses as well as server errors.

A map response is only a candidate projection. It is never rendered directly as a camera card. Candidate IDs are resolved through the enriched detail endpoint before any card is created. The detail payload is then evaluated for presentation rights and access state.

## Camera presentation and permissions

Directory discovery and preview eligibility are separate states. A camera row with a valid API `id` is retained in directory results even when it has no image, no publisher-view URL, is marked offline, has stale media, or does not provide optional freshness fields. The card is labelled with its actual state and is disabled whenever it cannot safely open a free preview or publisher page. Paid feeds and rows without a confirmed free-access flag are never opened from Live Cams.

Presentation follows the enriched record:

1. **OpenEye preview image:** `view.render === "image"`, `is_free === true`, the camera is inside the current seven-day health window, `redistribution.preview_embed === true`, valid publisher attribution is present, and the URL is HTTPS.
2. **Direct-source image:** `view.render === "image"`, `view.hosted === "source"`, `view.url_type === "image"`, free/live status is valid, publisher attribution is present, and the URL is HTTPS. This matches the documented NYC DOT/511NY-style direct-image case without treating arbitrary pages as images.
3. **Publisher-hosted view:** `view.render === "link"` and a safe HTTPS `view.url` is supplied. The URL is opened as a page, never loaded into an image element.
4. **No public view:** `view.render === "none"` remains a neutral disabled directory card. Scenic artwork is only a labelled placeholder and is never represented as a camera frame.

Frame age is read from `last_frame_age_s` or `frame_ts`. Numeric timestamps in milliseconds, epoch seconds, and ISO date strings are handled. A camera marked offline or beyond the seven-day window is not labelled LIVE and does not receive a preview image. Within the image display rules, frames up to 24 hours old are labelled **LIVE** and older frames within the seven-day window **RECENT**. A still preview is not represented as continuous video playback.

## On-device diagnostics

The view now provides a collapsed **Camera connection details** panel and a **Copy diagnostics** action. It records endpoint, HTTP status, elapsed time, response shape, result/cluster counts, IDs, live flags, render types, total/free counts, and detail-resolution failures. The same compact report is exposed as `window.LiveEarthCameraDiagnostics` for inspection. This makes network/CORS errors, empty backend results, map results, and rejected/unsupported camera records distinguishable without relying on screenshots of the empty card state.

## Tests and verification boundary

`Tests/live-cameras-workspace.test.cjs` covers:

- HTTP 200 with an empty Africa catalogue page triggering zoom-11 map recovery.
- Cluster representative IDs being resolved through the enriched detail endpoint.
- A successful no-preview record being visible but disabled and labelled unavailable.
- Direct-source image records, ISO/epoch timestamp handling, and paid/access-unknown records never being opened.
- On-device API diagnostics reporting endpoint status, response shape, render mode counts and map-detail resolution.
- The existing HTTP 5xx region fallback.
- Publisher-only viewing, preview permissions, featured backfill, image safety, Stacks registration and idempotent close cleanup.

`node --check Traffic/traffic-view.js` and the Node contract/lifecycle test pass in the local build environment. The live REST endpoints could not be called from the build environment because outbound DNS/network access is unavailable there; tests use response shapes and camera states from the current published OpenEye API contract. The new in-app diagnostics are specifically intended to capture real endpoint responses on the iPhone after deployment. Actual regional coverage, third-party preview availability, publisher navigation, service-worker refresh and iPhone runtime still require that live check.
