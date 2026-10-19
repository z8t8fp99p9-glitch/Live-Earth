LIVE // EARTH — Orientation + Location OFF Fix (candidate v1)

UPLOAD ONLY AFTER REVIEW. This package contains only files to replace at the repository root:
- orb-controls-v4.js — adds orientation/visual-viewport recovery, keeps the orb row tappable above the custom Stacks panel, makes feature switches hide stale panels immediately, and resets app-owned Live Location to OFF on every fresh page load.
- sw.js — increments the shell cache version so the updated controller can be fetched without deleting the known-good version before the new page reports ready.

Preservation: does not include or modify index.html, Earth/Moon geometry, globe framing, textures, orb images, or visual composition.

Manual iPhone GitHub upload: replace these two root files only, then commit using:
Fix orientation recovery and default Live Location off

Validation performed here: JavaScript syntax checks, ZIP integrity, and source-level checks. This is NOT an iPhone runtime test. After upload, test: open Sun in landscape -> rotate to portrait -> close -> tap Moon/Stacks; repeat portrait -> landscape; confirm Location starts OFF after fully closing and relaunching the app.
