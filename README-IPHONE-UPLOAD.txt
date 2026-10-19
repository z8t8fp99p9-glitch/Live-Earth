LIVE // EARTH — Moon Orbit Integration (review package)

WHAT THIS PACKAGE DOES
- Keeps the existing Earth mesh, texture, material, rotation gesture, Earth atmosphere, nav buttons and current-day Sun/Moon preview code intact.
- Adds a 3D Moon sphere with an offline procedural lunar surface texture. The Moon is intentionally enlarged to 0.38 Earth radii (about 1.4x its true radius) for visual readability.
- Adds a dotted, Earth-centred 3D orbit and a rolling 30-day path (721 samples, roughly hourly). The path follows calculated orbital angles, but the displayed distance is intentionally reduced to 42% of the calculated radius (mean displayed distance about 25 Earth radii) so the Moon is not a distant speck in landscape framing.
- Adds two-finger pinch zoom so the user can zoom out to reveal the true-scale Moon orbit; one-finger Earth rotation remains in place. The default camera framing remains the existing close Earth view.
- Updates the service-worker cache version and caches moon-orbit.js.

IMPORTANT SCIENCE / VISUAL LIMITS
- Underlying orbital calculation: Earth radius = 1 unit; true Moon radius = 0.2727 Earth radii; mean centre-to-centre distance = about 60.3 Earth radii. DISPLAY OVERRIDE: Moon radius = 0.38 Earth radii and displayed orbital radius is scaled to 42%, giving a mean displayed distance around 25.3 Earth radii. This is deliberate cinematic scaling, not true-scale rendering.
- The orbit uses a lightweight Keplerian approximation, not JPL Horizons-grade ephemerides. Do not describe its surface subpoint or position as exact. The orbital path is calculated; display distance and Moon size are intentionally dramatized.
- The 30-day path is generated locally at page load, centred around current time; it is not a pre-saved fixed calendar file.
- The procedural Moon texture is offline-first and gives crater-like albedo detail, but it is not a scientific lunar elevation/texture dataset.
- Earth and Moon share the same parent group, so the existing one-finger rotation keeps their relative orientation together. The existing Sun direction is unchanged; phase/shadow accuracy is not yet a finished astronomical lighting model.

FILES
1. index.html — integrated homepage code.
2. moon-orbit.js — Moon geometry, path and position calculations.
3. sw.js — cache version v17 and shell entry for moon-orbit.js.
4. dataset-manifest.json — dataset and limitations record.

UPLOAD SAFETY
This ZIP is a replacement-file package, not a full repository. Replace these four files at the repository root while preserving existing manifest.json, icon.svg, data-store.js, astronomy.js and all orb images. Do not upload the ZIP itself into the repository root. Do not upload until reviewed.

MANUAL CHECKS AFTER UPLOAD
- Homepage loads and Earth still renders/rotates.
- Pinch outward on the canvas: Moon and dotted path should become visible at real scale.
- Pinch inward: return to close Earth framing.
- Tap Sun and Moon nav buttons: existing current-day preview should still open.
- Reload twice and test offline after the service worker finishes caching.

GITHUB COMMIT TITLE
Add cinematic Moon orbit layer to LIVE Earth
