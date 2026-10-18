LIVE // EARTH — Faster One-Finger Rotation

Upload ONLY index.html and sw.js to the root of the Live-Earth repository, replacing the existing files. Leave every other file untouched.

Changes:
- Horizontal drag sensitivity increased from 0.005 to 0.009 (1.8x).
- Vertical drag sensitivity increased from 0.003 to 0.0055.
- Removed an unnecessary preventDefault call from pointer-move handling; touch-action:none still prevents page gestures.
- Cache version bumped to v9 so the browser requests the updated app shell.

Commit title:
Make one-finger globe rotation more responsive

This has been source-checked, but not verified on the user's physical iPhone. After deployment, test a short swipe and a slow drag.
