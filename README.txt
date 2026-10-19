LIVE // EARTH — CONTROL CACHE-BUST CANDIDATE v4

This package targets the reported stale Earth experience panel by using a NEW controller filename and NEW service-worker cache name. It is still a candidate and must be tested on the deployed PWA.

FILES
- sw.js — replace the root service worker
- orb-controls-v4.js — upload this new file to the repository root
- README.txt — instructions

EXPECTED BEHAVIOR
- Homepage is always the default; Earth orb does not open Earth experience panel.
- Inactive orbs are dimmed; active navigation/location state shows its effect.
- Only the red Location orb toggles the app-owned Location state.
- Choosing Offline does not switch Location OFF.
- Moon/Sun open the existing astronomy preview; Stacks shows a panel with not-yet-connected layers.

IMPORTANT
The HD/Offline Earth modes are still preferences/placeholders, not fully implemented globe data modes. Stacks layers are not implemented. No device testing or deployment has been performed by the assistant.

UPLOAD
1. In the Live-Earth repository on main, replace root sw.js.
2. Upload orb-controls-v4.js to the root (do not rename it).
3. Commit both together.
4. Reopen the published site. If the installed PWA still shows old behavior, close the PWA fully, open the site in Safari, refresh, then reopen the PWA. If it remains stale, inspect the service worker status before further changes.
5. To roll back, restore the prior sw.js and remove orb-controls-v4.js.

COMMIT TITLE
Fix stale orb controls and preserve homepage default

This does not alter index.html, globe rendering, camera, Earth size, Moon size, or orbit.
