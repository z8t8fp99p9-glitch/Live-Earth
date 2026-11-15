# Weather — Current Design and Behaviour

**Current baseline:** 15 November 2026  
**Implementation:** `Weather/weather-view.js`

## Visual direction

Weather is a full-screen, immersive atmospheric landscape. A local Canvas 2D renderer paints sky, clouds, layered ridges, water/reflections, trees and condition effects. Keep the scene expressive but uncluttered; the illustration is the main visual surface, not a wallpaper behind a stack of cards.

The interface uses large, minimal weather information over the scene: location, local date/time, temperature, condition, feels-like, today's high/low, rain chance, wind and humidity. Preserve safe-area spacing and measured clearance above the shared Orb dock in Portrait and Landscape. Do not modify the dock.

## Live data and privacy

- Provider: Open-Meteo current conditions and daily summary.
- Refresh interval: 15 minutes while the view is active and the page is visible.
- Weather may use only a fresh position already supplied by the explicitly enabled Location service.
- Weather must never call browser geolocation itself.
- Location OFF, offline, waiting for a fresh fix or API failure must show clearly labelled sample/unavailable states, never imply sample values are live.
- Keep requests bounded and cancellable; ignore responses that arrive after the view closes or a newer request starts.

## Scene states

The renderer supports clear, cloudy, rain, storm, snow, fog, wind, hot and night presentation. Conditions influence scene elements and motion. Keep temperature and forecast readings legible against every scene.

## Motion and lifecycle

- Use responsive Canvas sizing and cap device-pixel ratio/particle counts.
- Throttle animation and stop it when the document is hidden or Weather closes.
- Honour `prefers-reduced-motion`.
- Disconnect ResizeObservers, remove listeners, clear timers and abort network requests during cleanup.
- Keep a graceful static fallback if Canvas rendering is unavailable.

## Superseded designs

Earlier Japanese Live Art cards, 10:7 artwork layouts, monochrome palette locks, Living Topography 3D trials and one-off Weather landscape experiments are not the current Weather specification. Their runtime files and assets are not changed by this documentation update. `Weather/Art/` and `Weather/LivingTopography/` contain legacy/prototype material; do not remove or modify those code paths without a separate dependency audit.
