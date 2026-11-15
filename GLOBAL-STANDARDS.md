# Global Standards

These standards apply throughout LIVE // EARTH.

## Navigation and Orbs

- Home has five Orbs: Earth, Moon, Sun, Location and Stacks.
- The shared Stacks feature dock has three controls: active feature (tap to close), Location and Stacks library.
- `Global/view-manager.js` is the sole primary-view transition authority.
- Preserve Orb geometry, touch targets, orientation behaviour, hitbox alignment and close cleanup. Do not add a competing dock or close control.

## Views and engines

- Moon and Sun share a sky host but retain separate controllers, renderers, calculations and UI.
- `EarthEngine/Core/earth-engine.js` is the shared Earth globe factory. Each view owns its scene, camera and renderer. Only the user-controlled parent-group quaternion is handed between Engine-owned Earth views.
- Stacks features register through `Stacks/stacks-feature-views.js`; a feature must not create another navigation system or dock.

## Location and privacy

- Location is OFF by default and requires an explicit user action.
- `Location/location.js` owns permission, GPS watch, fresh-fix validation and ON/OFF state.
- Other views consume only an already-approved fresh position. They must not invoke browser geolocation directly.
- Do not store, expose or display observer-local values while Location is OFF unless the feature has another valid source.

## Offline, updates and recovery

- Preserve the service-worker shell, optional-resource cache, readiness checks and staged update flow.
- `sw.js` and `Global/update-manager.js` must use matching build identities.
- Do not clear Cache Storage, localStorage, sessionStorage, IndexedDB or user data as a generic fix.
- Trace runtime dependencies before removing or moving files.

## Editorial Engine boundary

The retained Universal Editorial Engine provides source-grounded extractive text and editorial utilities. It is not a live source collector, rights checker, feed publisher, database writer or magazine scheduler. Do not restore the retired publishing systems.

## Release discipline

The user uploads and commits through the root manifest-validated ZIP workflow. Do not edit `.github/` through that ZIP or write directly to GitHub. Verify ZIP extraction, resulting commit, Pages deployment and installed-device behaviour separately.
