LIVE // EARTH — ADAPTIVE ROTATION RECOVERY CANDIDATE

Purpose
- Removes the Orientation Guardian prompt/preference script from service-worker injection.
- Keeps orientation:any and allows normal responsive portrait/landscape adaptation.
- Adds a small recovery helper that waits for iOS viewport settling and cancels a globe drag interrupted by rotation.
- Preserves the existing Earth renderer and approved composition; does not change Earth/Moon sizing or camera settings.

FILES IN THIS ZIP
- sw.js — replace the repository root service worker.
- rotation-recovery.js — add this new file to the repository root.

IMPORTANT MANUAL CLEANUP
1. In the repository root, delete orientation-manager.js (the orientation prompt and Stacks preference patch).
2. Replace sw.js with this package's file.
3. Upload rotation-recovery.js to the root.
4. Do not replace index.html, orb-controls-v4.js, manifest.json, or image assets.
5. Commit the changes together.

WHY THE CACHE VERSION CHANGES
The new service worker uses v27 so its shell no longer depends on the old orientation manager. It retains the app-ready message before deleting older shell caches. No skipWaiting() was added.

TEST CHECKLIST ON THE PHONE
- Open the app and rotate portrait ↔ landscape several times.
- Open Moon, Sun, and Stacks; rotate while each is open; close the panel afterward.
- Drag Earth, rotate during/after the drag, then verify Earth responds to a fresh one-finger drag.
- Verify all five orbs respond and Location starts OFF after a fresh launch.
- Confirm the approved Earth/Moon composition has not changed.

LIMITATION
This is a recovery candidate, not a claim of physical-device verification. The helper clears interrupted touch state and waits for layout settlement; it does not force the OS orientation or guarantee that every Safari/iOS rendering issue is solved. If a test fails, roll back sw.js and remove rotation-recovery.js, then restore the prior service worker file.

GITHUB COMMIT TITLE
Remove orientation prompt and recover touch after rotation
