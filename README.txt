LIVE // EARTH — Orientation Guardian CANDIDATE

Files in this ZIP:
- sw.js (service-worker shell/cache update; cache version v26)
- orientation-manager.js (one-time 3-second orientation prompt + Stacks orientation preference)

IMPORTANT LIMITATION
This is a candidate, not an iPhone-verified fix. iOS Safari and installed PWAs may reject physical orientation locking. The script attempts Screen Orientation API locking only after a user tap; if iOS rejects it, it stores a session-level preferred view and reports the limitation. This candidate does NOT yet guarantee that the app will physically remain in its launch orientation when the prompt times out. It adds the prompt and Stacks option without editing index.html, Earth/Moon scene sizing, textures, or orb art.

MANUAL UPLOAD
1. Keep a copy of your current working files first.
2. Upload/replace sw.js in the repository root.
3. Upload orientation-manager.js to the repository root as a NEW file.
4. Commit title: Add one-time orientation prompt and Stacks view preference
5. Open the live PWA online once and reload/close-reopen it so the new service worker can install. If it doesn't appear immediately, allow the old page to close and reopen the app.
6. Test: launch portrait; rotate once; confirm the prompt disappears after 3 seconds; open Stacks and try Portrait/Landscape options; verify Earth/Moon artwork and Location OFF behavior.

ROLLBACK
Restore the previous sw.js and delete orientation-manager.js. Do not delete the old known-good ZIP. No GitHub changes have been made by the assistant.
