LIVE // EARTH — Bottom Spacing Test (v27)

Purpose:
- Test navigation anchored to the bottom without env(safe-area-inset-bottom).
- Use 9vmin (9% of the shorter viewport dimension), clamped to 32–48 CSS px.
- Keep the row horizontally centred and preserve the existing default-button test.
- Do not change index.html, orb-controls-v4.js, Earth, Moon, or their sizes.

Files:
1. sw.js
2. orb-default-buttons.css

iPhone upload:
1. Download and unzip this package.
2. In GitHub repo z8t8fp99p9-glitch/Live-Earth, branch main, replace sw.js.
3. Replace orb-default-buttons.css with the file from this ZIP.
4. Commit both files.

Commit title:
Test bottom spacing across orientations

After Pages deploys:
- Fully close the Home Screen app.
- Reopen it while online.
- Test portrait, landscape, then portrait again.
- Check whether the buttons remain near the bottom and whether iOS text-selection handles align with the visible labels.

This package is not tested on a physical iPhone. It is a controlled layout experiment, not a confirmed bug fix. The vmin-based CSS is a viewport-relative starting point; if iOS's viewport measurements themselves are stale, this may not solve the interaction-coordinate bug.
