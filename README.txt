LIVE // EARTH — Portrait Touch Coordinate Recovery (v29)

This is a focused test patch for the portrait touch offset seen after switching device orientation.
It does not change index.html, orb-controls-v4.js, the orb artwork, Earth/Moon size, or homepage layout.

Files to upload to the repository root (replace existing files):
- rotation-recovery.js
- sw.js

Before uploading: the currently working orb controls should be left untouched. This patch only resets stale page scroll offsets after orientation changes, waits for the iOS viewport to settle, and forces a fresh hit-test/layout pass. It cannot be considered confirmed until tested on the iPhone.

After upload:
1. Commit title: Fix portrait touch coordinate recovery after rotation
2. Open the published LIVE // EARTH site on the iPhone.
3. Fully close and reopen the site/PWA, then switch portrait → landscape → portrait.
4. Tap each orb near its center. Confirm the selected orb matches the one touched and panels' close buttons work.
5. Confirm the Earth and Moon composition has not moved or changed size.

If the issue remains, do not upload the older V5 candidate. Report whether the offset remains and whether it is still about half an orb; we should diagnose the actual Safari hit-testing behavior before another patch.
