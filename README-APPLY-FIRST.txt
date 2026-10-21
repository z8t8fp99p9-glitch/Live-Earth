LIVE // EARTH — Solar Direction Test V54
Changed files only: sw.js, earth-mode-navigation.js

Purpose:
- Restores the tested V53 Explorer orb-routing source.
- Applies one controlled solar-direction experiment: reverses the shared world-space solar vector used by the Earth directional light and day/night shader.
- Does not intentionally change the Moon, Sun preview, Earth geometry, camera, Home framing, or orb controls.

Apply:
1. Replace the repository's sw.js and earth-mode-navigation.js with these files.
2. Commit and deploy.
3. On iPhone, fully close/reopen the site or refresh after deployment so the new service-worker shell is active.
4. Check the day/night boundary at the same globe orientation and time. If the bright/dark side is still wrong, do not stack another inversion; report the result and we will revert this single-line experiment.

Important:
This is an unverified experiment, not a confirmed fix. Keep your previous ZIP/commit so rollback is easy.
Suggested commit title: Test reversed Earth solar lighting direction
