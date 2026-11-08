# Independent Celestial Views

**Decision baseline:** 8 November 2026.

## Architecture

Earth, Moon and Sun are three independent primary views. They share the Global Primary View Manager, View Module Registry and full-screen Sky View host. Sharing the host is an integration contract only; it does not merge renderers, cameras, scenes or view-specific state.

| Responsibility | Owner |
|---|---|
| Primary-view transitions | `view-manager.js` |
| Module activation/deactivation | `view-module-registry.js` |
| Full-screen stage and common background | `sky-view-controller.js` |
| Reusable Earth globe objects | `earth-engine.js` |
| Independent Earth 3D scene, camera, renderer and controls | `earth-view-controller.js` |
| Independent Moon renderer and lunar interface | `moon-view-controller.js`, `moon-lunar-interface.js` |
| Independent Sun renderer and solar interface | `sun-view-controller.js` |
| Home Main Earth rendering | Existing inline renderer in `index.html`, unchanged |

## Protected Home Earth boundary

- Home Main Earth is not unlocked, resized, zoomed, rotated or otherwise manipulated by opening or closing Earth View.
- Earth View owns a separate canvas, Three.js scene, camera, renderer, Earth mesh, atmosphere, starfield, lighting and gesture state.
- Earth View starts at the same fitted globe diameter as Home (75% of the shorter viewport dimension), then performs its own camera-only cinematic zoom inside the independent renderer.
- The Earth View contains no Moon, Moon orbit, lunar geometry or Moon controller dependency.
- Portrait/landscape resizing updates only the active independent Earth renderer and preserves its relative zoom. It cannot redefine Home camera framing.
- Basic/HD, zoom and Scanner controls affect only the independent Earth renderer.

## Location privacy

Location remains OFF until the user explicitly enables the Location Orb. Earth View never requests geolocation. Its optional Scanner reads only the already-approved, fresh in-memory location supplied by the existing Location service. When Location is OFF, stale or unavailable, the marker is hidden and no coordinates or local location data are shown.

## Offline and compatibility

The Earth View Controller is named `earth-view-controller.js`. The reusable `earth-engine.js` module is added to the verified service-worker app shell so it can load offline when any registered view requests a globe. The controller implements the independent renderer and registers `earth-independent-renderer`; it obtains its Earth group and surface mesh from `earth-engine.js` and never changes Home `LiveEarthScene` camera or renderer state.

The manager emits canonical `earth` view events. `getActiveView()` preserves the historic `explorer` label as a compatibility adapter for the protected Orb controller and existing Stacks return paths; `getCanonicalActiveView()` exposes the canonical state.

Three.js and the approved Earth texture use the existing same-origin runtime dependency paths already cached by the service worker. No new network-only Earth assets are introduced.

## Verification required

1. Syntax-check all changed JavaScript.
2. Confirm Earth code has no Home camera/renderer mutation calls and no Moon-orbit import.
3. Confirm registry contains independent Earth, Moon and Sun modules under the shared stage.
4. Open/close Earth repeatedly and switch Earth → Moon → Sun → Home.
5. Test portrait → landscape → portrait while each view is active; Home Earth must retain its original framing.
6. Verify Location OFF never requests geolocation or exposes a marker; enable Location explicitly before using Scanner.
7. Verify online/offline launch and app-shell cache behaviour.
8. Complete the final installed-iPhone visual and touch test before considering the work fully accepted.

Static source validation is not a substitute for the installed-iPhone tests above.
