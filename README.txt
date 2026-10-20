LIVE // EARTH — Solar Day/Night Homepage Patch
Date: 2026-10-20

WHAT IT DOES
- Adds a compact Sun-position calculation to the existing homepage scene through the service worker.
- Updates the existing directional light about once per minute to approximate the real Sun's direction.
- Reduces ambient fill so the night hemisphere becomes visibly darker.
- Preserves index.html, the Earth/Moon geometry and textures, blue atmospheric shell, orbit, camera framing, and five orbs.
- Bumps the service worker cache to v33.

UPLOAD
Replace only sw.js at the root of z8t8fp99p9-glitch/Live-Earth on main.
Commit title: Add live solar day-night lighting to homepage globe

IMPORTANT LIMITS
- This is a visual solar-position approximation, not a navigation-grade ephemeris.
- The effect has not been tested on the user's iPhone or live Pages deployment.
- This patch assumes the current main-branch index.html still contains the exact existing scene anchor and variable names (earth, sun, group, draw, T, canvas). It was prepared against the inspected source.
- The Moon also uses scene lighting, so reducing ambient light may make it darker too; test the Moon appearance after deployment. No homepage framing or object sizes are changed.
- No GitHub files have been written by the assistant.
