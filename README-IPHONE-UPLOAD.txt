LIVE // EARTH — Cinematic Moon + Stardust Trail (review package)

WHAT THIS PACKAGE ADDS
- Keeps the existing Earth mesh, texture, material, Earth rotation gesture, atmosphere, nav buttons and current-day Sun/Moon preview code intact.
- Adds a 3D Moon sphere with an offline procedural crater-like surface texture.
- Adds a rolling 30-day calculated 3D orbital path and a subtle stardust treatment: faint blue-white grains, a delicate full-path guide, and a brighter flowing starlight segment trailing behind the Moon.
- The starlight trail uses the same Moon position calculation; it is a visual effect, not a separate orbit.
- Keeps one-finger Earth rotation and the existing pinch zoom behaviour.
- Uses service-worker cache version v19 and caches moon-orbit.js.

VISUAL SCALE (INTENTIONALLY CINEMATIC)
- Earth radius is 1 scene unit.
- Display Moon radius is 0.38 Earth radii (slightly enlarged; physical ratio is about 0.273).
- Display orbital distance is 42% of the calculated Earth-centred distance (average displayed centre distance about 25 Earth radii, not 60). This is deliberate visual drama, not a claim of physical scale.
- The underlying orbital direction/timing comes from a low-precision Keplerian approximation, not JPL Horizons-grade ephemerides. Do not describe its positions as exact.
- The 30-day path is generated locally at page load, centred around the current time. It is not a pre-saved fixed calendar file.
- The Moon texture is procedural and offline-first; it is not a scientific lunar surface dataset.

FILES IN THIS REPLACEMENT PATCH
1. index.html — integrated homepage code (Earth implementation preserved; Moon module loaded additively).
2. moon-orbit.js — Moon sphere, orbital path, stardust and trailing light.
3. sw.js — cache version v18 and shell entry for moon-orbit.js.
4. dataset-manifest.json — data and display-scale notes.

IPHONE UPLOAD SAFETY
This is a replacement-file patch, not a full repository. Replace these four files at the repository root, preserving manifest.json, icon.svg, data-store.js, astronomy.js and all orb images. Do not upload the ZIP itself into the repository root. Do not upload until you are ready to test.

CHECK AFTER UPLOAD
- Homepage loads and Earth still renders/rotates exactly as before.
- In landscape, Earth and Moon should both be visible; the Moon begins to the left of Earth. The path should look like subtle stardust and a soft flowing tail, not a harsh dashed line.
- Pinch out/in and verify Moon, orbit and tail stay synchronized with the Earth reference frame.
- Tap Sun and Moon navigation buttons; existing current-day preview should still open.
- Reload twice and test offline after the service worker finishes caching.

GITHUB COMMIT TITLE
Add cinematic Moon starlight trail to LIVE Earth
