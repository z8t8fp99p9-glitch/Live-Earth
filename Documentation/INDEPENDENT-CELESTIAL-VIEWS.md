# Independent Celestial Views

**Decision baseline:** 8 November 2026.

## Architecture

Earth, Moon and Sun are three independent primary views. They share the Global Primary View Manager, View Module Registry and full-screen Sky View host. Sharing the host is an integration contract only; it does not merge renderers, cameras, scenes or view-specific state.

| Responsibility | Owner |
|---|---|
| Primary-view transitions | `Global/view-manager.js` |
| Module activation/deactivation | `Global/view-module-registry.js` |
| Full-screen stage and common background | `Global/sky-view-controller.js` |
| Stable public globe factory | `EarthEngine/Core/earth-engine.js` |
| 3D globe assembly and per-view surface/atmosphere setup | `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` |
| Low-level geometry, materials, shared texture lease and disposal | `EarthEngine/Graphics/earth-engine-3d-graphics-core.js` |
| Global quaternion viewpoint lifecycle and transition persistence | `EarthEngine/Core/earth-engine.js` |
| Home Earth scene, fixed camera, renderer, lights, responsive sizing and interaction | Home module in `index.html` |
| Home-only Moon orbit attached to Home Earth group | `Home/moon-orbit.js` |
| Independent Earth 3D scene, camera, renderer and controls | `Earth/earth-view-controller.js` |
| Independent Moon renderer and lunar interface | `Moon/moon-view-controller.js`, `Moon/moon-lunar-interface.js` |
| Independent Sun renderer and solar interface | `Sun/sun-view-controller.js` |
| Home Main Earth integration | Home inline renderer in `index.html`, using Earth Engine only for globe objects |

## Protected Home Earth boundary

- Home Earth uses Earth Engine for its globe group and surface, but retains its fixed zoom framing, own scene, renderer, responsive camera fit, single-pointer rotation and animation. Opening or closing Earth View must not alter Home state.
- The Home Engine surface remains the exact `earth` mesh; the Home Engine group remains the exact `group` attached to Home scene. The Moon orbit, solar/day-night shader, Location marker and Stacks feature-layer interface keep their existing references to those objects.
- Earth View starts at the same fitted globe diameter as Home (75% of the shorter viewport dimension), then performs its own camera-only cinematic zoom inside the independent renderer.
- The Earth View contains no Moon, Moon orbit, lunar geometry or Moon controller dependency.
- Portrait/landscape resizing updates only the active independent Earth renderer and preserves its relative zoom. It cannot redefine Home camera framing.
- Home has one fixed high-detail sphere (96 × 64 segments), no Basic/HD selector and no zoom controls. Basic/HD, zoom and Scanner controls affect only the independent Earth renderer. The independent view maps Basic/HD to generic `standard`/`high` geometry detail levels in Earth Engine.

## Location privacy

Location remains OFF until the user explicitly enables the Location Orb. Earth View never requests geolocation. Its optional Scanner reads only the already-approved, fresh in-memory location supplied by the existing Location service. When Location is OFF, stale or unavailable, the marker is hidden and no coordinates or local location data are shown.

## Offline and compatibility

The Earth View Controller is named `Earth/earth-view-controller.js`. The Earth Engine Core and Graphics modules remain in the verified service-worker app shell so Home and registered views can load the same globe factory offline. The controller implements the independent renderer and registers `earth-independent-renderer`; it obtains its Earth group and surface mesh from `EarthEngine/Core/earth-engine.js` and never changes Home `LiveEarthScene` camera or renderer state.

The manager emits canonical `earth` view events. `getActiveView()` preserves the historic `explorer` label as a compatibility adapter for the protected Orb controller and existing Stacks return paths; `getCanonicalActiveView()` exposes the canonical state.

Three.js remains a separate low-level dependency under the existing `vendor/` runtime paths. The Earth texture is downloaded by the service worker and cached at `EarthEngine/Assets/earth-land-ocean-ice-2048.png`; the supplied snapshot did not include this image as a tracked binary file. No new network-only Earth assets are introduced.

## Verification required

1. Syntax-check all changed JavaScript and the transformed Home module.
2. Confirm Home uses the Engine surface directly, has locked framing and exposes no Basic/HD or zoom controls.
3. Confirm Moon Orbit updates only its own Moon/orbit objects and never looks up or mutates the Home Earth surface or parent transform.
4. Confirm the independent Earth UI maps Basic/HD to generic Engine detail and has no Home camera/renderer mutation calls or Moon-orbit import.
5. Confirm registry contains independent Earth, Moon and Sun modules under the shared stage.
6. Open/close Earth repeatedly and switch Earth → Moon → Sun → Home.
7. Test portrait → landscape → portrait while each view is active; Home Earth must retain its fixed framing.
8. Verify Location OFF never requests geolocation or exposes a marker; enable Location explicitly before using Scanner.
9. Verify online/offline launch and app-shell cache behaviour.
10. Complete the final installed-iPhone visual and touch test before considering the work fully accepted.

Static source validation is not a substitute for the installed-iPhone tests above.
