LIVE // EARTH — V53 EXPLORER ORB ROUTING FIX

Purpose: Keep Explorer open when tapping the red Location Orb or Stacks Orb. Only the Earth Orb exits Explorer.

Upload these files to the repository root, replacing files with the same names:
- sw.js
- earth-mode-navigation.js

Do not upload the ZIP itself. Do not change index.html, orb-controls-v4.js, Earth/Moon size or framing, solar lighting, location-scanner.js, or the Clouds placeholder.

The fix removes the capture-phase rule that automatically closed Explorer whenever any non-Earth orb was clicked. The Location and Stacks orbs keep their existing handlers and behavior. Service-worker cache version is bumped to v53 so the update can activate.

Validation performed: JavaScript syntax checks and ZIP integrity check. This is not yet iPhone runtime-tested.

Suggested commit title: Keep Explorer open when using Location and Stacks orbs
