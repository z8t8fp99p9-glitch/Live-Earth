LIVE // EARTH V88.4 — FIX HOME ORB SIZING + STICK STACKS

STATUS
Draft package for manual review. Nothing has been written to GitHub and nothing has been deployed.

WHAT THIS REVISION FIXES
1. Makes index.html use the shortest viewport dimension (vmin) for the Home Orb diameter in portrait and landscape. Removes the older width-based orb-size overrides at the wide-screen and short-height breakpoints.
2. Keeps the five Home Orbs grouped on wide landscape viewports using a max width based on vmin.
3. Moves the Home navigation slightly closer to the bottom in landscape. The CSS uses !important in the runtime override because the legacy button-position stylesheet can use important declarations too.
4. Makes the six feature-picker Orbs smaller than Home Orbs while using the same shortest-side sizing system.
5. Makes the Stacks rail re-query the currently visible Stacks button on every positioning pass. It no longer relies on a hard-coded right edge or a cached button that may have been replaced.
6. Positions the rail's horizontal center and bottom edge relative to the actual Stacks Orb, clamps the rail inside the viewport, and recalculates on resize/orientation/visualViewport resize.
7. Keeps the Stacks chooser transparent (no glass panel or dim/blur scrim) and gives scrolling only to the inner feature list; the heading remains fixed.
8. Supports both the five-Orb Home navigation and the three-Orb active-feature dock as valid Stacks anchors.

FILES TO REVIEW/REPLACE
- index.html — replacement file, based on main blob SHA 5777f8cbf1db2498a6805e71deb17b2615f1fd97.
- view-module-registry.js — replacement file, based on main blob SHA 52caba5ac85fc3a599dacb50868ecefca27ca94e, including the unapproved feature-view draft already discussed.

BASELINE SAFETY
The two ROLLBACK-* files are exact copies of the inspected main-branch source files for those SHAs, not the earlier drafts. Keep them until the new version is fully validated. If your current branch has changed since those blobs, compare before replacing anything. Do not upload old files over newer work.

NO OTHER FILES ARE INCLUDED AS REPLACEMENTS
- Do not replace sw.js, update-manager.js, Moon/Earth rendering files, asset files, or data store files for this task.
- No deployment, service-worker version change, data migration, live data integration, or Earth/Moon geometry change is intended.

MANUAL TEST ORDER
1. Back up the current main files.
2. Review both replacement files against the current repository. If the corresponding current files have newer edits, stop and merge rather than overwrite.
3. Replace index.html and view-module-registry.js on your own branch/repo.
4. Open Stacks in portrait. Confirm the floating feature column sits directly above/over the Stacks Orb at the right, not over the center of Earth.
5. Scroll the feature list. Confirm only the list moves, while its heading, Earth scene, and Home Orbs remain fixed.
6. Select Weather, then open Stacks from the three-Orb dock. Confirm the rail aligns to the dock's Stacks Orb too.
7. Rotate to landscape and back. Confirm Home Orbs remain the same diameter, the Home row stays compact and slightly lower in landscape, and the Stacks rail re-anchors.
8. Test switching features, closing the active feature, Location ON/OFF, installed PWA and browser. Confirm the Home scene remains approved and local data remains intact.

COMMIT TITLE
LIVE // EARTH V88.4 — Fix Global Orb Sizing and Stick Stacks Rail
