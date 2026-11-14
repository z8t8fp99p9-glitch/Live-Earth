# LIVE // EARTH — Live Cams discovery and regional recovery

**Status:** Focused functional recovery patch prepared for manual upload; deployment and device verification pending.  
**Base commit inspected:** `d0ea4937f76ead886df63d9147bc82a7f437a0fe` (`main`, 14 November 2026).  
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

A map response is only a candidate projection. It is never rendered directly as a camera card. Only the enriched detail response is evaluated for public/free/live status and presentation permissions.

## Camera presentation and permissions

A directory card remains discoverable when it has an ID, `is_free === true`, `live === true`, and a supplied frame age within the documented seven-day degradation window. Presentation is then selected by the API record:

1. An image is loaded only when `view.render === "image"`, `redistribution.preview_embed === true`, a required publisher attribution with a valid HTTPS URL exists, and the preview URL is HTTPS.
2. A `view.render === "link"` record is shown as a publisher-view destination. Its URL is opened only as an HTTPS link and is never used as an image source.
3. A `view.render === "none"` record remains visible as a neutral, disabled **PREVIEW UNAVAILABLE** card. The UI does not invent a publisher URL or pretend the scenic directory artwork is camera footage.

Frames up to 24 hours old are labelled **LIVE**; older frames within the seven-day window are labelled **RECENT**. A still preview is not represented as continuous video playback.

## Tests and verification boundary

`Tests/live-cameras-workspace.test.cjs` covers:

- HTTP 200 with an empty Africa catalogue page triggering zoom-11 map recovery.
- Cluster representative IDs being resolved through the enriched detail endpoint.
- A successful no-preview record being visible but disabled and labelled unavailable.
- The existing HTTP 5xx region fallback.
- Publisher-only viewing, preview permissions, featured backfill, image safety, Stacks registration and idempotent close cleanup.

`node --check Traffic/traffic-view.js` and the Node contract/lifecycle test pass in the local build environment. The live REST endpoints could not be called from that environment; the tests use representative payloads based on the current published OpenEye API contract. Actual regional coverage, third-party preview availability, publisher navigation, GitHub Actions, deployment/service-worker refresh and iPhone runtime still require post-upload verification.
