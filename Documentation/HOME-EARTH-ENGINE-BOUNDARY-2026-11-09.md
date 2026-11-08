# LIVE // EARTH — Home Composition Boundary (9 November 2026)

**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Baseline:** `d96e745b4735118be9b93742733cd0045cb678ca`  
**Scope:** Return Home to a minimal Engine-owned Earth composition while preserving its established presentation.

## Home is instructed to do only this around the Engine globe

1. Create one high-detail Earth directly through `EarthEngine/Core/earth-engine.js`.
2. Attach the exact Engine group directly to the existing Home scene.
3. Keep the Home camera/framing fixed and attach the Engine's shared quaternion rotation with pinch zoom disabled.
4. Keep the existing Home star field.
5. Keep `Home/moon-orbit.js` attached to the same Engine group, including the Moon, two orbit paths, and stardust particles.

## Temporarily disabled Home responsibilities

- Home no longer creates its own AmbientLight or DirectionalLight instances. The Earth Engine supplies its fallback light rig. Other views that already supply their own lights are reused by the Engine instead of receiving a second active rig.
- The Home Location marker geometry and visual attachment are disabled in the Service Worker-injected Home API. Location coordinates and API methods remain available so this does not remove the existing Location service integration.
- The Service Worker no longer calls the legacy `injectSolarDayNight()` Home injection. Shared solar/day-night behavior remains Engine-owned; the old injector is retained as a commented rollback reference only.

## Protected Home presentation

No Home CSS/layout, brand, background, camera type/FOV, camera fitting, renderer settings, resize observers, star field, bottom five-orb navigation, navigation behavior, startup gate, redraw scheduling, or visibility behavior is changed. Home remains locked zoom. The existing Moon scale and orbit calculation are unchanged.

## Files changed for this adjustment

- `index.html` — remove Home-local light construction; retain Engine globe, locked zoom interaction, Moon/orbit and stars.
- `sw.js` — disable Home Location marker visuals and comment out the legacy solar/day-night injection call.
- `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` — provide Engine-owned fallback lighting and reuse view-provided lights where available.
- `EarthEngine/Core/earth-engine.js` — describe Engine lighting ownership and increment the public contract version to `2.3.0`.
- `Documentation/EARTH-ENGINE-DAYLIGHT-CONTRACT-2026-11-09.md` — update lighting ownership contract.
- `Tests/earth-engine-daylight-contract.test.cjs` and `Tests/earth-engine-view-separation.test.cjs` — validate the new Home/Engine ownership boundaries.

## Verification boundary

Code-level tests and syntax checks are run before packaging. A real browser/iPhone visual check is still required after upload/deployment, especially Home initial render, daylight appearance, Moon/orbit visibility, fixed zoom, and Earth View's existing lighting/Basic-HD behavior.

No `.github/` workflow files are changed. The repository owner uploads through the existing ZIP extractor; no direct GitHub write is performed by the assistant.
