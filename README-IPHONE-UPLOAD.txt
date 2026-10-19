LIVE // EARTH — Moon Subtle Stardust + Landscape Restore

PATCH CONTENTS
- index.html — original Earth camera framing restored exactly: camera distance is based on 75% of the shortest viewport dimension. The Moon layer is additive; Earth mesh, texture, lighting and one-finger rotation code are not rewritten.
- moon-orbit.js — rolling 30-day calculated 3D orbit, slightly reduced Moon display radius, very faint orbit curve and sparse stardust grains. Removed the comet-like moving tail.
- sw.js — cache version v20 so mobile browsers fetch the corrected package.
- dataset-manifest.json — documents the intentional cinematic scaling and low-precision orbital model.

VISUAL CHOICES
- Moon display radius: 0.32 Earth radii (still slightly enlarged relative to the real 0.273 ratio, but smaller than the previous version).
- Display orbital distance factor: 0.04; mean displayed centre distance about 2.4 Earth radii. This is cinematic, not physical scale.
- Orbit dots are subtle and static along the path. The Moon position updates from a low-precision Keplerian calculation every 30 seconds. This is not a JPL-grade ephemeris.
- No long tail or flashing particles. Orbit may extend beyond the screen at the original Earth framing; Earth is not zoomed out to fit the orbit.

IPHONE UPLOAD NOTES
This is a replacement-file patch, not a full repository. If you decide to test it, replace these four files at the repository root: index.html, moon-orbit.js, sw.js, dataset-manifest.json. Keep manifest.json, icon.svg, data-store.js, astronomy.js and all existing orb images. Do not upload the ZIP itself to the repository root.

TEST CHECKLIST
1. In landscape, Earth should return to the original close framing (75% of the shortest screen dimension).
2. Moon should be slightly smaller than in the previous screenshot.
3. Orbit should read as faint stardust / a delicate curve, not a long comet tail or bright dashed line.
4. Drag with one finger; Earth and the attached Moon system should rotate together.
5. Pinch zoom; Earth, Moon and path should stay in the same coordinate system.
6. Tap Sun/Moon buttons and verify the existing current-day preview still opens.
7. Reload twice and test offline after cache completes.

GITHUB COMMIT TITLE
Restore Earth framing and soften Moon orbital stardust

STATUS
Package checks can validate ZIP integrity, JavaScript syntax and JSON validity, but cannot certify real-iPhone visual behavior. Review before deployment. No GitHub changes were made by preparing this patch.
