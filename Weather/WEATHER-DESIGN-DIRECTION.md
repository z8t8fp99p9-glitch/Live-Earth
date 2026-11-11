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

## Landscape composition — approved 50/50 split

- Use two equal flexible columns: **50% Weather overview on the left and 50% Live Art on the right**, measured within the safe content width. The inter-column gutter is shared equally and must not create a wider preferred side.
- Keep the shared header and date/scene selector across the top.
- The left Weather column contains the editorial headline, then one continuous full-scene illustration with the temperature and condition overlaid inside that same artwork, then the high/low, rain chance and wind summary.
- The right Live Art column is one complete painted card. Its canvas fills the card; title/status float over the top and caption/Replay float over the bottom.
- Give both columns the same available dashboard height. Do not retain the previous asymmetric `.88fr / 1.12fr` ratio or place the main Weather illustration on a separate side from its readings.
- Keep the shared Orb dock centred and untouched. Use the existing measured dock-clearance variable for content spacing; never style, resize or reposition the dock from Weather.
- Use responsive height limits and allow natural scrolling on shorter landscape viewports. Do not force a desktop dashboard or crop content beneath the shared dock.

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


## Orientation-specific composition (11 November 2026)

- **Portrait:** keep the editorial weather story vertically stacked. Live Art is centered at 95% of the viewport width and uses a 10:7 width-to-height ratio (height is 70% of width). The painting fills the card; title, status, caption and Replay remain overlaid.
- **Landscape:** use equal 1fr / 1fr columns. Weather information and its integrated weather illustration occupy the left half; the full-card Live Art painting occupies the right half.
- The shared Orb dock remains owned and positioned by the existing global controller in both orientations. Weather only measures its bounds to reserve clearance.
