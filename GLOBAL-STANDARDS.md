# Global Standards

> **Critical project reference — applies across all LIVE // EARTH work.**

## 1. Global Orb standard

- Orb behaviour and dependencies are protected global infrastructure.
- Preserve the five Home Orbs: Earth, Moon, Sun, Location and Stacks.
- Preserve width-driven circular sizing, approved positions, touch areas, visual states and landscape geometry.
- Primary-view navigation belongs to the existing view manager. Utility Orbs must not unexpectedly replace an active primary view.
- Location is OFF by default; enabling it is an explicit user action, not a navigation side effect.
- `Location/location.js` owns the Home Location Orb permission request, GPS watch, fresh-fix validation and ON/OFF lifecycle. `Earth/earth-view-controller.js` owns the separate Earth View Scanner button and marker visibility; it consumes only the already-approved Location state and never requests GPS permission.
- Preserve Stacks feature lifecycle, the feature dock, hitbox alignment and animation cleanup guards.
- Do not change Orb code or its dependency chain without explicit owner approval and targeted iPhone tests.

## 2. Independent-view standard

Moon and Sun are independent views. The shared sky stage/host is an integration point, not permission to merge renderers or view-specific state.

- Shared host: `Global/sky-view-controller.js`.
- Moon renderer: `Moon/moon-view-controller.js`.
- Moon interface and lunar overlay/scroller: `Moon/moon-lunar-interface.js`.
- Sun controller: `Sun/sun-view-controller.js`.
- Shared module integration uses the existing view registry and stage.
- Keep Sun-specific calculations/rendering out of Moon, and Moon-specific calculations/interface behaviour out of Sun.
- Validate open/close, repeated transitions, portrait/landscape and return-to-Home behaviour on the installed iPhone.

## 3. Feature-workspace standard

- `Stacks/stacks-feature-views.js` owns the shared Stacks feature runtime and Elevation. Weather, Clouds, Traffic and Earthquakes are separate top-level feature folders that register through the shared runtime. Preserve the Global three-Orb lifecycle: active feature Orb closes the view, Location toggles the existing service, and Stacks opens the feature library. Do not change Orb geometry, hitboxes, animation, touch behaviour, or cleanup guards.
- `Editorial-Engine/engine-feature-views.js` registers only the Universal Editorial Engine workspace.
- The Editorial Engine workspace does not create another Orb or alter the global Orb contract.
- No collection, source-discovery, feed, policy-checking, image-processing, database-writing, publishing or magazine workspace is part of the current app.

## 4. Universal Editorial Engine standard

The retained Editorial Engine is deterministic editorial/output infrastructure. Its text-intelligence tools perform source-grounded extractive selection and structure; they do not invent reporting or claim independent fact verification. The retained Python core and browser helper must not be silently replaced by a different engine.

The previous content-collection and publishing services have been removed. Do not imply that a live feed pipeline is running. The preserved Python core still contains its prior read-only approved-record input contract, which is dormant without its former upstream services.

## 5. Offline, privacy and recovery

- Location remains OFF unless manually enabled; no automatic geolocation request.
- Preserve the existing service-worker shell, optional-resource cache and staged update handshake unless the task explicitly concerns them.
- Build identifiers and cache identities must be checked across the service worker and update manager before release.
- Never clear Cache Storage, localStorage, sessionStorage, IndexedDB or local data as generic troubleshooting.
- Use the relevant recovery record and a reversible restore plan. Do not blanket-restore unrelated snapshots or workflow YAML.

## 6. Current-versus-historical rule

Old content-collection, rights-checking and publication notes are historical. They do not describe installed code or active services and must not be used to recreate removed modules. The current repository source and this standard determine the supported application boundary.

- Home is the source of truth for the initial Earth viewpoint. Independent Earth Engine views may consume the orientation snapshot through `Global/earth-viewpoint-bridge.js`; they must never write their rotation back to Home or share Home's scene/camera/renderer.


## Home Earth viewpoint hand-off
Home's settled Earth orientation may be shared with independent Earth renderers through `Global/earth-viewpoint-bridge.js`. The bridge may use same-tab `sessionStorage` to survive page navigation, but must not use or reset app databases, persistent user settings, or caches. Only the initial orientation is shared; views retain independent scenes, cameras, zoom, renderers and interactions. Secondary views must never publish orientation back to Home.
