LIVE // EARTH — CLEAN SKY VIEW PATCH (V60)
Branch: main
Repository: z8t8fp99p9-glitch/Live-Earth

GOAL
Sun and Moon views show only their existing background wallpaper and the existing five main orbs.
No titles, arcs, event panels, altitude/azimuth, location text, sliders, timelines, or extra overlays.
Keep the discreet close button. Do not change index.html, orb-controls-v4.js, earth-mode-navigation.js,
Home composition, orb geometry, sizes, positions, artwork, or glow behavior.

SOURCE AUDIT
- Current main/sky-views.js (SHA b74bf0b85c3e1270014718749f3bc8e0af3261fa) already creates only
  a background canvas and close button. It does not create the old arc, event panel, or timeline.
- Current main/sw.js (SHA dd3aa24ea3ffd45c9c9e1692417575450d8b9561) is still V58 and does not
  precache either responsive SVG background. That can allow the old cached script/background setup to persist.
- Current index.html (SHA 77d05cefeab14c7bec730bcc2f7d5e278b79a7db) contains an unrelated legacy #astroPanel.
  Do NOT delete or alter it in this patch: it is part of the existing Home/preview implementation and is not
  the source of the clean Sky View overlay itself.

MINIMAL CHANGE TO sw.js
1. Change:
   const CACHE_NAME = "live-earth-shell-v58-sky-views";
   to:
   const CACHE_NAME = "live-earth-shell-v60-clean-sky-wallpapers";

2. Add the two existing committed responsive backgrounds to APP_SHELL, keeping every current entry:
   "./sun-sky-background-responsive.svg",
   "./moon-sky-background-responsive.svg",

   For example, the APP_SHELL section should include them beside "./sky-views.js":
   "./","./index.html","./sky-views.js",
   "./sun-sky-background-responsive.svg","./moon-sky-background-responsive.svg",
   "./orb-controls-v4.js","./earth-mode-navigation.js",

   Do not replace the rest of APP_SHELL. Preserve all other service-worker code exactly.

WHY THIS IS NEEDED
The cache name change causes a new shell cache to install, and adding the SVGs ensures the current wallpaper
assets are available offline. The existing sky-views.js on main already has the requested minimal canvas,
so do not replace it with another implementation.

AFTER APPLYING
- Verify the service worker installs without an APP_SHELL addAll failure.
- Open the deployed site and hard-reload/reopen it so the new worker activates.
- Test Sun and Moon in portrait and landscape.
- Confirm only wallpaper + the five existing orbs + close button are visible.
- Confirm Location and Stacks still respond and Earth closes Sky View before entering Explorer.
- Confirm Home composition is unchanged.

IMPORTANT LIMIT
This is a narrow source-based patch plan, not a claim that the live iPhone build has been tested. I did not write,
commit, push, or deploy to GitHub. The screenshot still showing the old rich panel indicates the deployed client
is not currently using the clean sky-views.js behavior; after cache busting, if the old panel remains, inspect
the active service worker and deployed response before changing any additional files.

Suggested GitHub commit title:
Fix clean Sun and Moon Sky View wallpaper caching
