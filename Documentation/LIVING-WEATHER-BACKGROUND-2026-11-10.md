# LIVE // EARTH — Living Weather Background

Date: 2026-11-10

## Direction
Replace the 3D terrain experiment with one simple, immersive, illustrated landscape background. The background is the Weather view. It changes atmosphere from fresh current weather and local day/night. No 3D meshes, island, terrain platform, weather dashboard, readout, forecast strip, slider, refresh button, attribution, or additional controls.

## Visual composition
- Full-screen continuous illustrated landscape.
- Broad open sky, layered soft hills, distant rolling mountains, and a natural winding river.
- Dedicated portrait and landscape SVG compositions share the same visual language. Orientation selects the appropriate composition.
- Each SVG uses `preserveAspectRatio="xMidYMid slice"`; it crops adaptively and never stretches the artwork.
- The existing Global Orb dock remains owned by the shared app shell and is not modified.
- No people, trees, decorative objects, separate ocean, or 3D props in this first background.

## Weather adaptation
Fresh Open-Meteo current values `weather_code`, `cloud_cover`, and `is_day` choose the visual state:
- Clear, partly cloudy, overcast, rain, storm, snow, fog.
- Dawn, day, evening, night.
- Sky palette, sun/moon/stars, cloud opacity, rain/snow and mist change with the selected state.
- The river has a restrained surface-flow animation.
- The landscape itself remains recognisable across conditions.

## Data and privacy
- Use only the already-enabled shared Location service: `window.liveEarthLocationAllowed()` and `runtime.globe()?.getLocation()`.
- Never request Geolocation directly.
- Clear the visual weather state when Location is off, offline, or the fresh fix is unavailable.
- No stale forecast is presented as current.
- No location coordinates are stored.

## Lifecycle and responsive behavior
- Full-bleed stage inside existing Weather route.
- SVG `preserveAspectRatio="xMidYMid slice"` crops rather than distorts.
- `prefers-reduced-motion` disables animation.
- Abort outstanding weather requests and remove listeners on deactivation.
- Existing Global Orbs and Stacks lifecycle are untouched.

## Changed files
- `Weather/weather-view.js`
- `Tests/weather-immersive-background.test.cjs`

## Verification
Source syntax and focused assertions are run locally. This is a vector illustration and CSS state transition implementation, not a 3D/WebGL renderer. Actual iPhone rendering and visual approval remain pending deployment.
