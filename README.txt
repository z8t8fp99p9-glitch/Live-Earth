LIVE // EARTH — 75% Shortest-Dimension Adaptive Framing

Upload ONLY index.html and sw.js to the root of the Live-Earth repository, replacing the existing files. Leave all other files untouched.

Rule implemented: projected globe diameter = 75% × min(viewport width, viewport height), recalculated on resize and device orientation changes. The camera distance is computed from the vertical field of view so this is a pixel-diameter rule, not a guessed percentage tier. One-finger rotation remains; pinch zoom stays disabled.

Commit title:
Set globe diameter to 75% of shortest screen dimension

This file has been code-checked but not physically tested on the user's iPhone. After GitHub Pages deploys, verify on phone and desktop.
