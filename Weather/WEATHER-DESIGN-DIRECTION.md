# LIVE // EARTH — Weather layout and live Japanese art studio

**Updated:** 11 November 2026  
**Scope:** Production Weather Stacks view only

## Approved visual identity

The Weather view combines three restrained directions:

1. **Expressive English typography** — an editorial weather headline, a large current temperature, and a concise condition/feels-like reading.
2. **A quiet minimalist ground** — warm washi-paper tones by day and a deep ink-paper treatment at night. Photographic wallpaper is not used.
3. **Japanese-inspired 2D artwork** — a weather-reactive landscape and a separate Live Art painting, both drawn locally on Canvas 2D.

Japanese influence is visual artwork only. Do not add Japanese-language interface labels, decorative Japanese characters, or character/mascot figures.

## Japanese visual language

- Use warm washi/rice-paper ground, expressive English editorial serif typography, restrained ink-black and muted-sage tones, and selective vermilion accents.
- Use ma (negative space), asymmetric balance, soft ink contours and layered atmospheric distance. Avoid decorative Japanese characters, random props or generic “Japan” motifs added only for decoration.
- Weather is the quiet Japanese landscape; Live Art is the detailed Japanese painting. They share palette and atmosphere, but Live Art owns the expressive brushwork and detail.

## Portrait composition — approved reference behaviour

- The entire portrait content group starts comfortably below the iPhone status/safe area and uses a compact Weather scene to preserve room for the full Live Art card above the Orb dock. Add 20–28 px of breathing room after `safe-area-inset-top`; do not pin the brand or scene controls to the top edge.
- The top header and date/scene selector remain compact.
- The editorial headline sits above the main illustrated scene.
- **The main temperature and condition are overlays inside the same full-width weather illustration.** They must read as one composed visual, not as a separate information card next to or above a small landscape strip.
- The main canvas fills its complete scene stage. Use the same minimalist Japanese landscape painter in portrait and landscape: two restrained mountain ridges, a quiet horizon, a fine water/reflection plane, a vermilion sun/cloud mark where appropriate, and only the selected weather effect. The Weather scene sets the mood; it does not compete with Live Art.
- Keep weather information prominent: a large editorial headline, a very large temperature, a legible condition/feels-like group, and readable high/low, rain chance and wind values.
- Show only three summary values below the scene: high/low, rain chance and wind.
- The **Live Art card is inset from the screen edges** and its painting canvas fills the complete card, including the areas behind the title/status and caption/Replay controls. Text and controls float over the painting; the canvas must not appear as a narrow artwork strip inside an empty card.
- Keep the lower area quiet so the shared Orb dock remains visually clear. Do not add an hours-ahead rail to fill the space.
- Preserve safe-area spacing and calculate scroll clearance from the existing shared Orb dock without styling or moving it.

## Landscape composition — centred Live Art frame

- Use a balanced asymmetric safe-width split: the Weather overview uses about 36% and the Live Art feature area about 64% (`minmax(210px,.56fr) minmax(0,1fr)` before the shared gutter). The card itself does not stretch to fill that area; its 10:7 frame is centred within the feature column and scaled from the usable vertical space.
- Live Art keeps the same **10:7 width-to-height ratio in both orientations**. In landscape, calculate its width from the full usable dashboard height using the largest 10:7 rectangle that fits both the feature-column width and landscape height, then centre it horizontally and vertically inside the Live Art feature area.
- Keep the masthead on one landscape row: brand, date/time, location and scene selector. Respect both `safe-area-inset-left` and `safe-area-inset-right`, and increase label sizes so the notch and rounded corners cannot obscure them.
- The left Weather column is intentionally quiet: a concise headline, temperature and condition overlaid in one minimalist Canvas 2D weather scene, and only high/low, rain chance and wind.
- Use the exact same minimalist Weather illustration language in portrait and landscape. Do not switch between a minimal landscape and a detailed one based on orientation or canvas width.
- The right Live Art column owns the visual emphasis. Its canvas fills the large card; title/status float over the top and caption/Replay float over the bottom, with larger legible controls.
- Keep the shared Orb dock centred and untouched. Use the existing measured dock-clearance variable for content spacing; never style, resize or reposition the dock from Weather.
- Use responsive height limits and allow natural scrolling on shorter landscape viewports. On roomy landscape screens, the painting area may borrow a small, controlled dock-clearance overlap so the art can flow slightly toward the Orb row; the shared dock remains in the foreground, with its geometry, hit targets and behaviour untouched.

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

- **Portrait:** begin the content 20–28 px below the top safe area. Keep the editorial weather story vertically stacked. Live Art is centered at 95% of the viewport width and uses a 10:7 width-to-height ratio (height is 70% of width). The painting fills the card; title, status, caption and Replay remain overlaid.
- **Landscape:** use an approximately 36/64 Weather/Live Art feature-area split. Live Art itself remains 10:7 and is centred within its area, scaled down to fit the usable height between the masthead and dock. The masthead respects both horizontal safe-area insets.
- The shared Orb dock remains owned and positioned by the existing global controller in both orientations. Weather only measures its bounds to reserve clearance.
