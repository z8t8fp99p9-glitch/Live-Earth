LIVE // EARTH — Global Feature Orb Contract (prototype)
Target baseline: z8t8fp99p9-glitch/Live-Earth, branch main, V87

WHAT THIS PACKAGE DOES
- Replaces the existing view-module-registry.js only.
- Keeps the five Home Orbs and approved Home/Earth framing unchanged while idle.
- Converts Stacks into a scrollable library of default-look feature Orbs:
  Clouds, Weather, Alien World, Elevation, Earthquakes, Traffic.
- On activation, switches to three controls: active feature Orb, Location, Stacks.
- Tapping the active feature Orb closes that feature (no X button).
- Tapping Stacks opens/closes the library. Selecting a different feature deactivates
  the outgoing feature before activating the next one.
- Restores the same underlying primary view when a feature closes.
- Provides LiveEarthFeatureViews.register/open/close/list hooks for later data modules.

IMPORTANT LIMIT
This is a navigation/UI prototype. The six feature entries use honest preview shells;
Weather, Cloud, Alien World, Elevation, Earthquake, and Traffic data are NOT integrated.
A successful local smoke test is not the same as iPhone/browser/offline validation.
Do not call this a finished release until the device test checklist passes.

SAFE APPLICATION
1. Preserve a copy of the current view-module-registry.js first.
2. Replace only repository root view-module-registry.js with the file of the same name
   from this package.
3. Do not upload ROLLBACK-view-module-registry-V87.js as the active file; it is backup only.
4. Do not change index.html or sw.js for this prototype. The existing HTML bootstrap and
   service-worker shell already load/cache view-module-registry.js.
5. Commit/deploy manually only after reviewing the file diff. Do not overwrite other files.

GITHUB COMMIT TITLE
LIVE // EARTH V88 — Add Global Feature Orb Prototype
