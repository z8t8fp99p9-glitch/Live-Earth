# LIVE // EARTH Feed Collector — browser mode

This workspace is an independent, user-triggered, read-only website/feed inspector. It is launched by the existing `feed-collector-view.js` feature registration and stays inside the Feed Collector iframe. It does not add an Orb or connect to Nature, Alien World, any other View, Manager, Checker, Editorial Engine, database writer or Publisher.

## How it works on the current GitHub Pages app

`browser-engine.js` intercepts only the three existing Feed Collector API routes and runs discovery/inspection in the browser. It uses ordinary HTTPS `fetch` with browser CORS enforcement, parses RSS 2.0, Atom and JSON Feed, and extracts article metadata, text and image references when the source permits access. The existing `discovery.js` UI and response contract are retained.

**Important browser limitation:** GitHub Pages is static hosting. A browser cannot bypass a publisher's CORS policy. If a site blocks cross-origin access, the browser reports that limitation; it does not proxy, scrape around, or pretend that content was collected. Try the website's direct public feed URL if available. Universal access to arbitrary sites would require a server-side retrieval endpoint hosted on infrastructure the owner controls; this browser build does not depend on a third-party service.

## Record and safety rules

- Each displayed article record has the same 38 top-level field names as `global_collector/universal_post.py` (`LIVE_EARTH_UNIVERSAL_POST_V1`). Missing source values remain empty; source-specific material is preserved under `sourceMetadata`.
- IDs are stable within the browser adapter for a given source item, but are not Manager job IDs.
- `viewId`, `sourceId`, Manager job, assignment, profile and database destination fields remain empty/not applicable.
- No image binaries are downloaded or stored. Only image URLs and source-provided metadata are recorded.
- Rights information is evidence only. Public visibility, education or non-commercial intent is not treated as permission. No Checker decision is made.
- No persistent storage, database writes, scheduled collection, publishing or background requests occur.
- Requests are HTTPS-only, credential-free, bounded to 2 MB, and candidate discovery is bounded. The browser enforces CORS and normal same-origin protections.

## Files

- `discovery.html` — independent interface shell and script loading.
- `discovery.js` — existing presentation and user interaction layer; retained unchanged.
- `browser-engine.js` — browser-native retrieval, feed parsing, article inspection and 38-field mapping.
- `discovery-config.js` — static-site API route compatibility.
- `feed-collector-view.js` — existing feature registration; intentionally unchanged.

## Verification

The release package includes a structural test that checks the 38-field contract and verifies that the browser adapter contains no persistence, publishing, Manager or Checker calls. Live source access must still be tested from the deployed iPhone/browser because CORS permission is controlled by each publisher.
