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
- The shared Stacks loader registers both modules independently. The shared Orb registry, Prime Earth, dock and close lifecycle remain the common protected infrastructure.
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
- The engine is lazy-loaded and included in the service-worker shell/cache repair path. The Prime Earth globe and shared Orb navigation remain untouched.
- End-to-end playback remains unverified until an eligible `live_video` camera is tested on the deployed iPhone app; provider CORS/auth/payment behavior may still require a server-side broker.


### 2026-11-15 — Live Cams multi-source, GitHub Pages-only expansion

User selected a GitHub Pages-only architecture. Added direct public-source adapters for Fintraffic Digitraffic, Hong Kong Transport Department and Singapore LTA. Caltrans remains deferred pending review of live-image terms; TfL remains deferred pending API registration/key. Existing OpenEye directory remains optional. Provider snapshots are explicitly labelled with their refresh cadence; direct video is enabled only when a provider API supplies a media URL. No backend or proxy is introduced. Browser CORS and device playback remain deployment verification items.


## 15 November — Live Cams retired before rebuild

- The user decided the current camera experience had too many provider restrictions and failed feeds, and requested a complete removal before starting again.
- All active Live Cams view, WHEP player, public camera adapter and six discovery assets were removed. The Stacks registration, bootstrap load, service-worker shell entries and startup repair references were removed with them.
- Traffic remains independent and unchanged in its feature registration and navigation. Historical Live Cams notes remain in the repository as an archive; they do not describe active app code.
- Future Live Cams work starts as a new design, not as a continuation of the retired implementation.


## 18 November 2026 — Atmospheric Composition world separation

- Added `Atmospheric-Composition/atmospheric-composition-view-controller.js` as a separate Stacks world with ID `atmospheric-composition`, title **Atmospheric Composition**, and Orb symbol `◌`.
- At the 18 November checkpoint, registered the world in `Stacks/stacks-feature-views.js` catalogue and sequential module loader, immediately after Atmosphere. The 20 November v155 candidate supersedes that loading method with Orb-selected loading.
- At that checkpoint, added the controller to `sw.js` app-shell cache so the module was available for offline startup. The v155 candidate moves it to the bounded optional cache; first-use offline access requires a previously cached copy.
- Kept Atmosphere distinct and narrowed its catalogue description to temperature, pressure, wind and moisture. Composition is no longer listed as an Atmosphere topic.
- The new controller follows the established numerical-world lifecycle: its own Engine-created globe/view renderer and cleanup, while reusing the shared Earth Engine, Universal Grid System and GPU Grid Skin. It does not create another globe framework or navigation dock.
- No composition data adapter or measurements are connected in this separation phase. The view must remain honest and show readiness only until approved, verified datasets are connected.
- Updated architecture, Stacks feature and numerical-world lifecycle documentation.
- Package is prepared for the user's ZIP upload workflow; no direct GitHub changes were made.


## 20 November — Startup essentials and on-demand Stacks feature views

- Audited the v154 repository source against current GitHub `main` and found 11 feature controllers in the install-time app shell, two feature-only numerical grid helpers there as well, and an Editorial Engine workspace fetched during startup.
- Identified why v153 was not a safe rollback: it registered no-op feature callbacks but did not provide a functioning lazy script-loader in the shared feature registry. v154 restored controllers to startup.
- Prepared a v155 design with synchronous catalogue registration and a real Stacks selection-driven loader. A selected feature downloads its controller, waits for self-registration and opens only if still selected; late responses after close/switch are ignored. Load failures remain local to the feature.
- Keep the shared Stacks catalogue/lifecycle runtime essential, but extract the Elevation view implementation into `Elevation/elevation-view.js`. All 12 Stacks feature-view controllers (including Elevation) load only after their Orb is selected. Move the two numerical-only grid helpers to optional caching; move the Editorial Engine browser workspace from eager Update Manager startup to Orb-selected loading. The retained Editorial Engine utility and retired publishing boundary remain unchanged.
- Candidate install-time resources decrease from 51 distinct app-shell files + 3 runtime dependencies (54) to 37 distinct app-shell files (38 routing entries including the `./` alias) + 3 (40). Package: `LIVE-EARTH-v155-On-Demand-Feature-Views.zip`; manifest commit title: `Move Feature Views Out of Startup Essentials`. No Home, primary Earth, Moon/Sun, dock, Location privacy, core Earth Engine, user data or recovery behavior is intentionally redesigned.
- Candidate passed syntax checks for all modified JavaScript, an expanded mock-runtime test for all 13 optional modules and loader races/retry, and a dedicated Elevation lifecycle/offline-cleanup smoke test. User upload/extraction, Actions/Pages and iPhone acceptance remain pending.


## 21 November 2026 — Atmosphere Wind vector architecture decision

- Approved an additive derived dataset, `earth.atmosphere.wind_vector`, built from time/grid-aligned NOAA 10 m UGRD and VGRD components.
- Preserve existing wind-speed and wind-direction datasets unchanged as independent verification and fallback products. Do not migrate or replace the Central Database schema in the design phase.
- The combined product is planned to carry U, V and derived speed on one shared grid/time definition. Reconstruct meteorological direction FROM north only after vector-component interpolation; animate movement toward `(U,V)`.
- The intended Wind view uses one combined input and one coordinated GPU surface with selectable speed, direction and future vector-flow modes. Do not stack coplanar speed/direction globe skins.
- Any multi-channel support in the Universal Grid System/GPU skin must be optional and backward-compatible; scalar datasets and all non-Wind views remain protected.
- This entry records a design decision, not implementation. Collector, publisher, database, renderer and controller behaviour remain unchanged until separately inspected, implemented and validated.
- Canonical details: `Documentation/WIND-VECTOR-DATA-ARCHITECTURE.md`. The Atmosphere controller contains a matching implementation note beside its dataset configuration.


## 22 November 2026 — v155 on main and Pages deployment

- The current `main` source advanced to `d1aa269836069554cb27888f6b611e446407478c` (`Refresh Universal dataset storage`). The source continues to use the matching `v155-on-demand-feature-views` identity in `sw.js` and `Global/update-manager.js`.
- GitHub Pages workflow run `45076364772` completed successfully for that exact commit at 22:12:42 UTC on 22 November 2026. The published Pages artifact is evidence of a successful Pages build/deployment for that source revision.
- This does not establish that an already-installed iPhone has activated the new service-worker client or passed online/offline acceptance. Device verification remains a separate gate.


## 23 November 2026 — Documentation consolidation and Stacks reliability package prepared

- Prepared a local Priority 1–3 package from the GitHub `main` source checkpoint `d1aa269836069554cb27888f6b611e446407478c`. The 18 existing source files used as the patch baseline were matched against their GitHub tree blob IDs before editing.
- Consolidated documentation ownership: `Documentation/INDEX.md` is the single catalogue; `CURRENT-STATUS.md` is a current snapshot; `PROJECT-HISTORY.md` is the one dated timeline; root governance documents have distinct responsibilities; component contracts remain beside their owners. The complete 20 November status document was retained under `Documentation/Archive/` rather than discarded. Historical audit sections are explicitly time-bound.
- Corrected the current status description to distinguish 37 unique app-shell files from 38 route entries (`./` and `./index.html` alias the same file), plus three runtime dependencies.
- Hardened only the optional-resource cache path: verify status, non-opaque response, resource-appropriate MIME, a bounded body prefix and previously saved entries before use. Invalid saved entries are removed; the optional cache remains capped at 48 and remains separate from Startup Essentials.
- Added a 25-second deadline and retryable failure state for optional Stacks feature scripts. Kept the shared in-flight request and active-feature token safeguards.
- Made Stacks library close immediate inside the Stacks lifecycle while retaining the Orb-collection transition for feature selection. Removed the global `window.setTimeout` shim and its CSS side effect.
- Local verification: three changed JavaScript files passed `node --check`; six inline JavaScript blocks in `index.html` passed syntax checks; 12 optional-response validation cases and seven optional-cache flow cases passed; Stacks loader success/timeout/retry checks and close/selection-motion checks passed; local documentation links resolved; Startup Essentials array declarations remained byte-for-byte unchanged.
- This is a prepared local package only. No GitHub files were written, no upload/extraction was performed, and no live browser or installed-iPhone acceptance test was run.
