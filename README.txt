LIVE // EARTH — Portrait panel touch fix (candidate)

WHY
The current page applies touch-action:none to both html and body. That ancestor-level restriction can block vertical touch scrolling in the overflow:auto Moon/Sun or Stacks panel, which is most noticeable in portrait when the card is taller than the screen. The globe canvas keeps its own touch-action:none so one-finger globe rotation is retained.

FILES
- sw.js: bumps the shell cache to v28 so the changed recovery helper is fetched.
- rotation-recovery.js: permits vertical gestures outside the globe canvas, refreshes panel bounds after viewport settling, and cancels a globe drag interrupted by rotation.

MANUAL iPHONE UPLOAD
1. In the Live-Earth repository, branch main, replace sw.js with the supplied file.
2. Replace rotation-recovery.js with the supplied file.
3. Keep orientation-manager.js deleted (the orientation prompt has been removed).
4. Commit the two files together. Do not replace index.html, orb-controls-v4.js, manifest.json, or any art assets.

TEST
- In portrait, open Moon or Sun and try scrolling the panel vertically; test its close button.
- Open Stacks and scroll its options if they exceed the screen height.
- Rotate portrait -> landscape -> portrait while a panel is open; check close button and all orbs.
- Rotate while dragging Earth; verify the globe is not left in a stuck drag.
- Confirm Location starts OFF on a fresh launch.

STATUS
Candidate only. JavaScript syntax and ZIP integrity checks should be run before upload. This has not been tested on a physical iPhone; report the actual result before treating it as fixed.
