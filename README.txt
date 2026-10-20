LIVE // EARTH — ATTEMPT 1: VIEWPORT RECOVERY
Date: 2026-10-20

PURPOSE
Test a conservative iOS standalone-app viewport recovery after orientation changes.
This is Attempt 1 of a maximum of two. It does not resize, reposition, zoom, or modify
the Earth/Moon canvas or the five orb designs.

FILES IN THIS ZIP
1. sw.js
2. orb-controls-v4.js

WHAT THIS VERSION CHANGES
- Uses a fresh service-worker cache name so the new files can be fetched.
- Stops injecting the failed viewport diagnostic and the temporary bottom-spacing CSS test.
- Re-measures navigation/panel layout immediately and again after 180, 420, and 800 ms
  following rotation/page restoration.
- Clears stale document scroll offsets after orientation changes only.
- Does not change the approved Earth/Moon scene dimensions or orb CSS/design.

UPLOAD (iPhone / GitHub)
1. Open repository z8t8fp99p9-glitch/Live-Earth, branch main.
2. Replace the root file sw.js with this ZIP's sw.js.
3. Replace the root file orb-controls-v4.js with this ZIP's orb-controls-v4.js.
4. Commit both files together using the title below.
5. Open the LIVE // EARTH Home Screen app. If the old code remains cached, fully close
   the app, reopen it while online, wait a few seconds, then close/reopen once more.

TEST
- Test portrait -> landscape -> portrait at least 5 times.
- Tap the centre of each visible orb after each return to portrait.
- Check whether labels, selection handles, and tap targets stay aligned.
- Check that Earth/Moon size and framing are unchanged.
- Report whether the issue is fixed, improved, unchanged, or worse.

ROLLBACK
If anything becomes worse, restore the pre-attempt root files from
LIVE_EARTH_PRE_ROTATION_RECOVERY_BASELINE.zip. Do not proceed to Attempt 2 until this
version has been tested.

GITHUB COMMIT TITLE
LIVE EARTH: test iOS viewport recovery after rotation

IMPORTANT
This ZIP is a candidate patch, not a confirmed fix. It was syntax/archive checked but
cannot be physically tested on your iPhone by me. No GitHub files were changed by me.
