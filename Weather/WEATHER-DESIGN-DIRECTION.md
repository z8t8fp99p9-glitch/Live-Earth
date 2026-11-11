# LIVE // EARTH — Weather layout and live Japanese art studio

**Updated:** 11 November 2026  
**Scope:** Production Weather Stacks view only

## Approved visual identity

The Weather view combines three restrained directions:

1. **Expressive English typography** — an editorial weather headline, a large current temperature, and a concise condition/feels-like reading.
2. **A quiet minimalist ground** — warm washi-paper tones by day and a deep ink-paper treatment at night. Photographic wallpaper is not used.
3. **Japanese-inspired 2D artwork** — a weather-reactive landscape and a separate Live Art painting, both drawn locally on Canvas 2D.

Japanese influence is visual artwork only. Do not add Japanese-language interface labels, decorative Japanese characters, or character/mascot figures.

## Portrait composition — approved reference behaviour

- The top header and date/scene selector remain compact.
- The editorial headline sits above the main illustrated scene.
- **The main temperature and condition are overlays inside the same full-width weather illustration.** They must read as one composed visual, not as a separate information card next to or above a small landscape strip.
- The main canvas fills its complete scene stage. Its landscape needs distinct, layered mountain peaks, atmospheric distance, mist/water details and weather-specific marks. Avoid reducing the terrain to shallow parallel waves.
- Show only three summary values below the scene: high/low, rain chance and wind.
- The **Live Art card is inset from the screen edges** and its painting canvas fills the complete card, including the areas behind the title/status and caption/Replay controls. Text and controls float over the painting; the canvas must not appear as a narrow artwork strip inside an empty card.
- Keep the lower area quiet so the shared Orb dock remains visually clear. Do not add an hours-ahead rail to fill the space.
- Preserve safe-area spacing and calculate scroll clearance from the existing shared Orb dock without styling or moving it.

## Landscape composition

- Keep the existing responsive two-column layout rather than stretching the portrait stack.
- The weather headline/readings remain coordinated with the main illustration, with the temperature/condition overlay inside its scene.
- The Live Art canvas fills its card, with the same floating title/status and footer controls.
- Keep both columns within the viewport width and retain safe-area and Orb-dock clearance.

## Illustration and Live Art behaviour

- The main weather landscape remains a local, deterministic Canvas 2D illustration; never replace it with a photo wallpaper.
- Main landscape layers should have recognisable peaks and shoulders, lighter distant ridges, soft ink contours, restrained mist, and water/reflection detail. Sun, clouds, branches, rain, snow, fog and wind should respond to actual selected weather/phase without obscuring the reading overlay.
- The separate Canvas 2D Live Art studio progressively paints an original weather-matched ink study, stroke by stroke. Its artwork fills the full card surface while interface copy floats above it.
- The starter registry contains eight studies: clear pine/red sun, cloudy willow, rainy willow, storm waves, snowy pine, fog temple, windy bamboo, and night moon.
- Tree motifs must remain readable at phone size. Pine boughs should be distinct, layered and asymmetrical, with visible breathing room; avoid dense horizontal lattices. The willow remains a separate, recognisable cascading silhouette.
- Show drawing progress and provide a Replay control. When weather/phase changes, select the corresponding study. Reduced-motion settings render the completed study without progressive animation.
- Drawing is local and deterministic: no AI/image generation at runtime, no external artwork dependency, no WebGL and no 3D renderer.
- The Weather Layout Editor must mirror production dimensions and layering. It must not impose independent canvas aspect ratios or resize a preview differently from the app.

## Weather and data behaviour

- Use the existing Open-Meteo current conditions and daily summary data. The hours-ahead forecast rail and hourly request payload are intentionally removed.
- Actual weather and local day/night state determine the main illustration and selected art study.
- The scene selector supports sample previews for clear, cloudy, rain, storm, snow, fog, wind, night and hot conditions. Sample readings must remain explicitly labelled as samples.
- The view may use only the app's already-enabled fresh Location fix. It must never request browser geolocation itself. Location remains OFF by default.
- Offline/unavailable conditions must not be presented as live readings; the drawing system remains available using a labelled sample scene.

## Protected scope

Changes are limited to `Weather/weather-view.js`, `Tools/WEATHER-LAYOUT-EDITOR.html`, this Weather design note and Weather-specific regression tests. Do not alter Home, Earth/Earth Engine, Moon, Sun, Location, Global Orb/navigation lifecycle, Stacks runtime, service worker, update manager, databases or unrelated views.
