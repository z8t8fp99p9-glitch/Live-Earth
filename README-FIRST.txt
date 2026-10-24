LIVE // EARTH — Sun Blue-Hour Amber Background + Update Test (v80)

This is a DIRECT REPLACEMENT package, not a builder. It contains exactly four app files:
- sw.js
- update-manager.js
- sun-sky-background-landscape.webp
- sun-sky-background-portrait.webp

DESIGN
Blue-hour alpine river valley, broad clean sky for the existing Arc, restrained amber afterglow at the horizon and river. No visible solar disc. No changes to Earth, Moon, the five Orbs, location privacy, or saved data are included.

UPLOAD
1. Extract this ZIP.
2. In the Live-Earth repository root on GitHub, replace the four same-named files with the files from this folder.
3. Commit the four files together.
Suggested commit title:
Update Sun backgrounds and bump app shell to v80

WHY TWO CODE FILES CHANGE
sw.js changes BUILD_ID and CACHE_NAME from v79 to v80. This forces a fresh essential-shell cache and downloads the newly replaced same-named WebP assets. The service worker's APP_SHELL already contains both Sun WebPs and no longer refers to the deleted Sun SVG.
update-manager.js changes its build identifier to the same v80 value. The existing ready-message type is retained for backward compatibility.

SAFETY NOTES
- Do not upload this ZIP as a single file; extract it and upload/replace the four files.
- Do not delete browser data or IndexedDB.
- Do not replace index.html or sky-view-controller.js for this visual update; they already use the Sun WebP filenames and the v79 launch handoff.
- A successful GitHub Pages workflow confirms deployment, but verify the actual browser and installed app receive the new background before marking the update test passed.
