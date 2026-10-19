LIVE // EARTH — ORB CONTROLS CANDIDATE PACKAGE

IMPORTANT: This is a candidate integration, NOT a fully finished release. It does not change the 3D Earth canvas, camera, texture, moon orbit, or sizing. The updated service worker injects orb-controls.js into the existing homepage response and uses a new cache version.

CONTENTS
- sw.js: replacement service worker (includes orb-controls.js in the app shell and injects it into index.html responses)
- orb-controls.js: control layer for navigation toggle behavior, Location switch state/gating, Earth choice panel, and Stacks placeholder panel.

WHAT IS IMPLEMENTED IN THIS CANDIDATE
- Red Location orb toggles an app-owned Location ON/OFF preference (default OFF).
- OFF blocks new geolocation API calls made by the homepage and signals stop events.
- Earth/Moon/Sun/Stacks behave as toggle navigation; tap the active one again returns to Home.
- Homepage is always the default; the Earth orb does not open a selection panel and is never shown as an active navigation orb.
- Inactive orbs are uniformly dimmed; active navigation/location states reveal the glow.
- Offline selection does not toggle Location OFF; only the red Location orb controls the Location switch.
- Stacks panel is displayed, but layer engines remain placeholders.
- Sun/Moon existing preview remains connected through its current custom event.

IMPORTANT LIMITATIONS / TEST BEFORE DEPLOY
1. This is not yet a final production release. The browser API geolocation gate is a best-effort guard; test the exact iPhone Safari/PWA behavior.
2. Earth HD/offline modes are preferences only; selecting Offline does not switch Location off. This package does not create an offline Earth dataset or high-definition globe profile.
3. Stacks layer buttons are honest placeholders; cloud/elevation/weather/earthquake/traffic engines are not included.
4. The service worker only transforms fetched HTML when it receives it from network; cached/offline behavior and update timing must be tested on the deployed PWA.
5. Location permission already granted to iOS is not revoked by the app switch. This switch governs app-owned web requests only; it cannot turn off iPhone system Location Services.
6. The existing astronomy module may request location after the UI opens Sun/Moon. With the app switch OFF, this candidate blocks the request and the existing panel should show its permission/error state.
7. External map tile/CDN resources remain subject to their own availability and usage policies.

IPHONE UPLOAD STEPS
1. Download and unzip this candidate.
2. In GitHub, open the Live-Earth repository, branch main.
3. Replace the existing root sw.js with the supplied sw.js.
4. Upload orb-controls.js to the repository root.
5. Commit both files together.
6. Open the deployed site, refresh/reopen the installed PWA, and test Earth/Moon/Sun/Location/Stacks.
7. If anything is wrong, restore the previous sw.js and remove orb-controls.js.

COMMIT TITLE
Integrate orb controls and app-owned location gate

This package has not been tested on the user's iPhone or deployed site. Do not treat it as fully verified.
