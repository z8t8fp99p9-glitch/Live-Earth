# LIVE // EARTH — Live Cams discovery redesign

**Status:** Visual and catalogue follow-up correction prepared for manual upload; not yet deployed or device-verified.  
**Base commit inspected:** `c8880ff0c1994f72fbd2b5ddd8fe94ba806e9f7d` (`main`, 14 November 2026).  
**Patch purpose:** Match the approved cinematic mobile composition, make the empty/failing featured state honest, and backfill the featured rail from the public catalogue when the curated endpoint is sparse.

## Product direction

Live Cams is a cinematic world-discovery workspace rather than a plain camera catalogue. It opens inside the existing Stacks full-screen stage, underneath the protected three-Orb feature dock. The main screen contains an editorial hero preview, a Featured Windows rail, continent discovery windows, category tiles, and a searchable camera directory. Regional selections use broad documented bounding-box searches; these are discovery windows, not exact continent boundaries. Search/category/region results expose a Load more action when the API returns a next-page cursor. Camera details show the supplied frame time and publisher credit, and offer a publisher link only when the API supplies a safe HTTPS link.

The visible brand is **LIVE // EARTH**. The approved mobile composition is a wide cinematic hero with small carousel controls, a compact three-card featured rail, six photographic region windows in one row, compact two-column category tiles, and the directory search immediately below the discovery cards. The page uses a layered atmospheric backdrop and reserves scroll space for the fixed three-Orb dock. The six category tiles and six region tiles use locally packaged scenic image assets rather than decorative orb illustrations. These still artworks are editorial destination backdrops, not live camera feeds. A scenic hero fallback never carries a LIVE badge; a broken remote camera preview is removed rather than disguised as a working feed.

## Data contract

Uses the anonymous OpenEye public REST catalogue:

- `GET https://api.openeye.cam/v1/catalog/featured`
- `GET https://api.openeye.cam/v1/catalog/categories`
- `GET https://api.openeye.cam/v1/catalog?category={category}&embeddable=1&limit=48&sort=fresh`
- `GET https://api.openeye.cam/v1/catalog?bbox={west,south,east,north}&embeddable=1&limit=48&sort=fresh`
- `GET https://api.openeye.cam/v1/catalog?q={query}&embeddable=1&limit=48&sort=fresh`

If the curated featured endpoint returns fewer than six eligible previews, the client backfills from the enriched public `/catalog` feed using `embeddable=1`, then tries `/catalog/random` if fewer than two cameras are available. The random endpoint may return a single camera object rather than an `items` array; the normalizer accepts both documented shapes. If a catalogue query returns a server error, the client retries without the optional `sort=fresh` parameter, then retries without `embeddable=1` and applies the client-side permission checks. If a region/category catalogue query still fails, it falls back to the documented lean `/catalog/map` projection and resolves a small first page of IDs through `/catalog/{id}` to obtain complete records. It never renders the lean map projection as if it were a full camera record.

A directory camera preview is rendered only when all of the following are true:

1. `is_free === true`.
2. `live === true` and a supplied frame timestamp/age is within the documented seven-day directory degradation window.
3. `view.render === "image"`.
4. `redistribution.preview_embed === true`.
5. The API supplies both `redistribution.attribution.name` and a valid HTTPS `redistribution.attribution.url`.
6. The preview URL is HTTPS.

Frames up to 24 hours old are labelled **LIVE**. Frames older than 24 hours, but inside the seven-day directory window, are labelled **RECENT** so an older stored image is not described as current. The directory's documented seven-day window replaces the previous overly strict 24-hour exclusion. Publisher credit remains visible beside each preview and in the detail sheet. Restricted/source-only camera records are not forced into embeds.

## Playback and cost boundary

This release uses public preview frames only. It does not call the paid frame endpoint, request WHEP offers, open continuous video sessions, or handle payment. A still preview is not represented as continuous video playback. Paid cameras are excluded from the cards.

## Lifecycle and protected surfaces

- Registers `live-cams` through `window.LiveEarthFeatureViews`.
- Mounts using `LiveEarthStacksFeatureRuntime.mount('live-cams')` in the existing full-screen stage.
- Aborts outstanding API requests and clears the five-minute refresh timer on close.
- Removes the mounted root and restores the stage card/class safely.
- Does not initialize a globe, map renderer, Three.js renderer, or WebGL context.
- Does not edit Home, Earth, Moon, Sun, the five-Orb Home dock, or the protected three-Orb feature dock.
- Keeps the separate Traffic feature registration and its wallpaper placeholder intact.
- Uses `Traffic/Assets/live-cams-discovery/` for the new local artwork; no new JavaScript cache path is added, so `sw.js` does not need a change.

## Verification boundary

The included Node contract/lifecycle test validates branding, six-across region layout, three-across featured rail, wide hero ratio, hidden-badge enforcement, hero dots, collapsed default results, packaged images, permissions, freshness labelling, curated-to-catalogue-to-random fallback, regional map-to-detail recovery, Stacks registration, and close cleanup. The app has not been launched on the user's iPhone in this session. OpenEye's live service availability, successful camera coverage at runtime, preview image responses, service-worker refresh, deployment, and actual iPhone layout still require a post-upload device check.
