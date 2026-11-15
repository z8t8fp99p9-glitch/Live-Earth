# Weather — Current Design and Behaviour

**Current baseline:** 15 November 2026  
**Implementation:** `Weather/weather-view.js`

## Visual direction

Weather is a full-screen, immersive atmospheric landscape. A local Canvas 2D renderer paints sky, clouds, layered ridges, water and reflections, trees, and condition effects. The scene is the main visual surface, not a wallpaper behind a stack of cards.

The interface keeps information large and minimal: location, local date/time, temperature, condition, feels-like, today's high/low, rain chance, wind and humidity. Preserve safe-area spacing and measured clearance above the shared Orb dock in Portrait and Landscape. Do not modify the dock.

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

- Use responsive Canvas sizing and bounded particle counts.
- Throttle animation and stop it when the document is hidden or Weather closes.
- Honour `prefers-reduced-motion`.
- Disconnect ResizeObservers, remove listeners, clear timers and abort network requests during cleanup.
- Keep a graceful static fallback if Canvas rendering is unavailable.

## Retired experiments and preserved archive

The earlier Japanese Live Art cards, 10:7 layouts, and one-off landscape experiments are superseded. The old Live Art renderer is now an inert compatibility stub; its artwork catalogues and reference images remain archived under `Weather/Art/`.

The disconnected `Weather/LivingTopography/` prototype was removed after checking the repository for active references. It was not part of the current Weather view.
