LIVE // EARTH V52 — EXPLORATION SCANNER + LAST ORIENTATION

Changed files only:
- sw.js
- earth-mode-navigation.js
- location-scanner.js (new)

Upload these three files to the repository root, replacing files with the same names.
Do not upload the full repository ZIP. Do not change index.html, orb-controls-v4.js, solar-lighting code, Home layout, Earth/Moon scale, or the Clouds placeholder.

Commit title:
Add Exploration location scanner and preserve globe orientation

Expected behaviour:
- Home keeps its protected geometry and renderer pixel density from V51.
- Leaving Exploration returns camera framing Home but keeps the latest globe rotation.
- Location Orb OFF means no tracking and no dot.
- Location Orb ON starts a fresh browser location watch. The small red surface dot appears on Home only after a fresh fix.
- Scanner is a separate button visible only during Exploration. It requires Location Orb ON and toggles the dot in Exploration without switching Location OFF.
- Returning Home shows the dot again when Location is ON and a fresh fix is available.
- Location loss/stale fix hides the dot rather than implying the position is live.
- This patch does not add clouds, elevation shading, or high-resolution textures.

Validation performed: JavaScript syntax checks and ZIP integrity. Browser/iPhone runtime validation is still required. Browser permission, GPS availability, and marker longitude alignment must be tested on device before considering this feature complete.
