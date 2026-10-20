LIVE // EARTH — Viewport Diagnostic Test v28

Purpose
Temporarily measure iOS viewport geometry and navigation hitbox rectangles during rotation. The diagnostic panel is OFF during normal app use and appears only when the app URL includes ?viewport-debug=1.

Files in this ZIP (3)
- sw.js (replace existing sw.js)
- viewport-diagnostic.js (add this new file to repository root)
- README.txt

Manual iPhone upload
1. Keep a copy of the current sw.js before replacing it.
2. In GitHub main, replace sw.js with this ZIP's sw.js.
3. Upload viewport-diagnostic.js to the repository root.
4. Commit title: Add temporary viewport diagnostics
5. Wait for GitHub Pages to finish deploying.
6. Open the app ONLINE once to let the service worker update. Fully close the Home Screen app and reopen it.
7. Open the app URL with ?viewport-debug=1 appended, for example:
   https://z8t8fp99p9-glitch.github.io/Live-Earth/?viewport-debug=1
   If opening the URL from the Home Screen app is awkward, open that exact URL in Safari first; note that standalone mode is the key test, so ideally launch the installed Home Screen app at the same URL if iOS permits it.
8. Rotate portrait -> landscape -> portrait. Tap outside the panel to record touch coordinates. Use Copy log and paste the result into ChatGPT.
9. Remove ?viewport-debug=1 or press Close diagnostics for normal display. The script does not show its panel unless the query parameter is present.

What it measures
- screen and available screen dimensions
- device pixel ratio
- inner/outer window dimensions
- document client/scroll dimensions
- visualViewport width/height/offset/page position/scale
- actual getBoundingClientRect values for nav row, buttons, orb shells, and labels
- tap client/page/screen coordinates

Safety
This is a diagnostic experiment, not a fix. It does not modify index.html, globe rendering, Earth/Moon sizes, or orb layout CSS. It is not device-tested; syntax and ZIP integrity should be validated before upload. Keep the previous sw.js so you can restore it if needed.
