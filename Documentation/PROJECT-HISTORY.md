# Project History

This is a short record of durable decisions, not a log of every experiment or patch. Deleted documentation remains available in Git history.

## October 2026 — Product and visual foundation

- LIVE // EARTH established as a lightweight, phone-first Earth and sky explorer.
- Home settled on a realistic 3D Earth globe with fixed framing, one-finger rotation and five Home Orbs.
- Location was defined as explicit opt-in and OFF by default.

## 28–31 October — Navigation and view boundaries

- Primary-view navigation, shared Orb/Stacks lifecycle and iOS root-flow safeguards were formalized.
- Moon and Sun remained separate views. Local data and recovery were protected.
- Alien World changed from an early game concept to an online astronomy discovery view; later plans and prototypes are historical unless present in current source.

## 7–9 November — Architecture consolidation

- The former content collection and publishing pipeline was removed at the owner's direction. The Universal Editorial Engine core and workspace were retained without the old upstream services.
- Weather, Clouds, Traffic and Earthquakes were separated into feature folders using one Stacks runtime.
- Earth Engine became the shared globe factory and sole owner of quaternion-only viewpoint continuity. Home, Earth View, Moon, Sun and Orb boundaries remain protected.

## 10–14 November — Feature refinements

- Weather went through several visual prototypes and layout trials. Those trial specifications are superseded by the current full-screen Weather direction.
- Live Cams discovery and camera-permission handling were refined within the Traffic feature. Current source and tests take precedence over dated patch notes.
- The shared dock and protected Home/Celestial views remained unchanged.

## 15 November — Current Weather rebuild

- Weather was rebuilt as a full-screen, responsive 2D Canvas atmosphere driven by Open-Meteo conditions when an approved Location fix is available.
- It uses labelled samples when live data cannot be used, and keeps its rendering lifecycle inside the existing Stacks runtime.
- GitHub Pages build succeeded for commit `4c2dc6a95088fdebd0f99059b0c46d3989439395`. Installed-iPhone acceptance remains separate and open.


## Independent Traffic and Live Cams modules

- Split the former combined `Traffic/traffic-view.js` implementation into two independent feature modules.
- `Traffic/traffic-view.js` now owns only the Traffic Orb and clearly reports that no verified traffic provider is connected.
- `LiveCams/live-cams-view.js` now owns the camera-directory discovery experience; its six discovery images live under `LiveCams/Assets/`.
- The shared Stacks loader registers both modules independently. The shared Orb registry, Home Earth, dock and close lifecycle remain the common protected infrastructure.
- The service-worker shell cache and repair path include the new Live Cams module and its assets.


## 15 November — Live Cams preview and featured-window correction

- Reviewed the installed-device screenshots showing a static featured camera and catalogue cards that could not open.
- Found that the featured window had manual dots but no timed rotation or swipe handling.
- Found that preview eligibility was narrower than the current OpenEye enriched catalogue contract: approved OpenEye-hosted previews could be hidden when a redundant permission flag or optional attribution object was absent; source-link rows with a verified directory poster were also not rendered.
- Added metadata hydration for incomplete featured/search/category/region rows, then applied strict free-access, freshness and required-attribution checks before enabling media.
- Added featured-window auto-rotation, swipe and keyboard navigation. Reduced-motion and hidden-document states pause rotation.
- Live video/WHEP remains a distinct, potentially metered session and is not auto-started or paid for by this patch.


## 15 November — Live Cams provider-permission correction

- Follow-up device screenshots confirmed featured rotation was fixed, while featured and category cards still showed `ACCESS UNCONFIRMED` and scenic placeholders.
- Compared the app's strict preview gate with the current OpenEye camera API and redistribution contract. Preview embedding permission (`redistribution.preview_embed`) is separate from the full-feed pricing flag (`is_free`); the former can authorise an image preview even when the latter is absent.
- Updated catalogue discovery to request OpenEye's documented `embeddable=1` filter and filtered results to a permitted preview or a confirmed public publisher route.
- Approved preview images are displayable without opening a paid/full feed. Paid or unknown full-feed access remains closed. No WHEP/live-video session, payment handshake, or recurring paid stream is started by the UI.
- Still preview frames and continuous live video remain distinct capabilities. This correction targets reliable still-frame previews and safe public-source links; WHEP video playback remains a separate implementation requiring explicit billing-aware design.


## 15 November — Dedicated in-app Live Video Engine

- Added a separate Live Video Engine using browser-native WebRTC and OpenEye's documented WHEP offer endpoint; snapshot previews remain a separate camera capability.
- Added explicit in-app Play control in camera details for records positively identified as `live_video` and confirmed free/active. No session starts on card selection or modal open.
- Added ICE gathering, SDP offer/answer, remote track attachment, connection state reporting, and WHEP session DELETE cleanup where the provider returns an accepted same-origin `Location`.
- Paid, access-unknown, still-image, and publisher-only records do not start WHEP. HTTP 402 is reported without settling payment; API credentials are not embedded.
- The engine is lazy-loaded and included in the service-worker shell/cache repair path. The Home globe and shared Orb navigation remain untouched.
- End-to-end playback remains unverified until an eligible `live_video` camera is tested on the deployed iPhone app; provider CORS/auth/payment behavior may still require a server-side broker.


### 2026-11-15 — Live Cams multi-source, GitHub Pages-only expansion

User selected a GitHub Pages-only architecture. Added direct public-source adapters for Fintraffic Digitraffic, Hong Kong Transport Department and Singapore LTA. Caltrans remains deferred pending review of live-image terms; TfL remains deferred pending API registration/key. Existing OpenEye directory remains optional. Provider snapshots are explicitly labelled with their refresh cadence; direct video is enabled only when a provider API supplies a media URL. No backend or proxy is introduced. Browser CORS and device playback remain deployment verification items.


## 15 November — Live Cams retired before rebuild

- The user decided the current camera experience had too many provider restrictions and failed feeds, and requested a complete removal before starting again.
- All active Live Cams view, WHEP player, public camera adapter and six discovery assets were removed. The Stacks registration, bootstrap load, service-worker shell entries and startup repair references were removed with them.
- Traffic remains independent and unchanged in its feature registration and navigation. Historical Live Cams notes remain in the repository as an archive; they do not describe active app code.
- Future Live Cams work starts as a new design, not as a continuation of the retired implementation.
