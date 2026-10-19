LIVE // EARTH — CURRENT-DAY SUN & MOON PREVIEW

Ready-to-upload files for repository root, branch main:
- index.html (full replacement; retains globe and orb effects)
- astronomy.js (on-device calculations)
- sw.js (cache v16; precaches astronomy.js and cleans obsolete shell caches)
- dataset-manifest.json (updated astronomy dataset description)

SCOPE
- Sun/Moon buttons open only a current local-day preview.
- Device location is requested only after tapping Sun or Moon.
- Sun: sunrise, sunset, solar noon, daylight duration, current altitude/direction.
- Moon: phase, illumination, approximate moonrise/moonset, current altitude/direction.
- Results are saved in the existing IndexedDB astronomy_cache, keyed by local date and rounded coordinates. Reuse saved result for that date/location; Refresh forces recalculation.
- Existing 30-day astronomy cache retention remains. UI displays only today's data.
- No astronomy API and no location/data sent to a server. Other files, including data-store.js, manifest.json, icon.svg and orb images, remain in place.

UPLOAD FROM IPHONE
1. Extract ZIP in Files.
2. Open https://github.com/z8t8fp99p9-glitch/Live-Earth, branch main.
3. Upload/replace the four included files in the repository root. Do not delete other files.
4. Commit title: Add current-day Sun and Moon preview data
5. Wait for Pages deployment; open app online and tap Sun or Moon. Allow location permission when prompted.

Accuracy: preview-grade approximations; moonrise/moonset are estimated by checking lunar altitude in 10-minute steps. Not for navigation. Package has not been deployed or tested on a physical iPhone.
