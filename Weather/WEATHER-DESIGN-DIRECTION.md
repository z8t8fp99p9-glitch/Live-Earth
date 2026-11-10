# LIVE // EARTH — Weather layout and live Japanese art studio

**Updated:** 10 November 2026  
**Scope:** Production Weather Stacks view only

## Approved visual identity

The Weather view combines three restrained directions:

1. **Expressive English typography** — large current temperature, an editorial weather headline, and large serif temperatures in the six-hour forecast.
2. **A quiet minimalist ground** — warm washi-paper tones by day and a deep ink-paper treatment at night. The photographic wallpaper is removed.
3. **Japanese-inspired live artwork** — the existing locally generated weather landscape remains, with a separate Live Art panel that paints a weather-matched Japanese ink study stroke by stroke.

Japanese influence is visual artwork only. Do not add Japanese-language interface labels, decorative Japanese characters, or character/mascot figures.

## Two coordinated displays

### Portrait

- Stack the current-weather headline and temperature first.
- Give the existing live weather illustration its own breathing room.
- Show only three summary values: high/low, rain chance, and wind.
- Place the Live Art Studio directly after the summary so its drawing performance is easy to discover.
- Place the six-hour forecast after the studio, with large temperatures and clear condition symbols.
- Preserve safe-area spacing and enough scroll clearance for the shared Orb dock.

### Landscape

- Use a true two-column composition rather than stretching the portrait stack.
- Forecast column: current headline/temperature, high/low, rain chance, wind, and six-hour forecast.
- Art column: existing weather illustration above the dedicated Live Art Studio.
- Keep both columns within the viewport width and retain safe-area and Orb-dock clearance.

## Live art behaviour

- Keep the existing locally generated weather illustration; do not replace it with a photo wallpaper.
- A separate Canvas 2D studio progressively draws an original weather-matched ink study, stroke by stroke.
- The starter registry contains eight studies: clear pine/red sun, cloudy willow, rainy willow, storm waves, snowy pine, fog temple, windy bamboo, and night moon.
- Each study is represented by ordered vector-like brush strokes and can be expanded with additional IDs, weather tags, motifs and stroke data. The eight starter studies are not a claim that thousands of finished works are already included.
- Show drawing progress and provide a replay control. When the selected weather/phase changes, select and begin the corresponding study.
- Reduced-motion settings render the completed study without the progressive animation.
- Drawing is local and deterministic: no AI/image generation at runtime, no external artwork dependency, no WebGL and no 3D renderer.

## Weather and data behaviour

- Continue using the existing Open-Meteo current, hourly and daily forecast flow.
- Actual weather and local day/night state determine the main illustration and selected art study.
- The scene selector supports sample previews for clear, cloudy, rain, storm, snow, fog, wind, night and hot conditions. Sample readings must remain explicitly labelled as samples.
- The view may use only the app's already-enabled fresh Location fix. It must never request browser geolocation itself. Location remains OFF by default.
- Offline/unavailable conditions must not be presented as live readings; the drawing system remains available using a labelled sample scene.

## Protected scope

This package changes only `Weather/weather-view.js`, this Weather design note, and Weather-specific regression tests. It must not alter Home, Earth/Earth Engine, Moon, Sun, Location, Global Orb/navigation lifecycle, Stacks runtime, service worker, update manager, databases, or other views.
