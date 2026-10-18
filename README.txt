LIVE // EARTH — Globe Loading Fix

This package contains two replacement files for the existing Live-Earth GitHub Pages site.

FILES
- index.html: corrects the NASA Earth texture URL.
- sw.js: bumps the app cache version so the updated homepage can load.

IMPORTANT
Do NOT upload this ZIP itself as the website replacement. Extract the ZIP first, then upload the two files inside to the ROOT of the existing Live-Earth repository, replacing the existing index.html and sw.js. Keep manifest.json and icon.svg unchanged.

GitHub commit message: Fix Earth texture loading and refresh app cache

After committing, wait for GitHub Pages to deploy, then open https://z8t8fp99p9-glitch.github.io/Live-Earth/ in Safari and refresh. This is a targeted fix, not yet a guarantee that the whole app works on every device.
