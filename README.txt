LIVE // EARTH — Stage A Core Stability Patch

PURPOSE
Improve service-worker update safety and cache bounds while preserving the current
homepage scene and known-good v4 orb behaviour. This is Stage A only. It does NOT
add Earth Basic/HD selection; that remains Stage B.

FILES
- sw.js — safe waiting update policy, precache essential shell, retain old shell
  caches until the new homepage reports that the Earth scene started, and cap
  same-origin optional asset cache to 48 entries.
- orb-controls-v4.js — existing v4 orb logic retained, with a readiness signal
  after the existing homepage loading status is hidden.

IMPORTANT
- This patch deliberately retains the existing service-worker HTML injection for
  the v4 controller to minimise changes during the stability pass. Moving the
  controller into index.html is deferred until the core is validated.
- Homepage index.html and its Earth/Moon scene are not replaced or edited.
- External Three.js imports and third-party map tiles are not cached by this
  same-origin cache policy.
- The 48-entry limit is an entry-count bound, not a byte-size bound; browser
  storage quotas still apply.
- This package does not change any GitHub files. Upload the two files manually
  only after reviewing the change.

IPHONE UPLOAD
1. Extract this ZIP in Files.
2. In GitHub, open z8t8fp99p9-glitch/Live-Earth, branch main.
3. Replace only sw.js and orb-controls-v4.js at the repository root.
4. Commit title: Improve safe app updates and bound optional cache
5. After Pages deploys, open the app online once, then test closing/reopening,
   offline launch after assets have cached, all five orbs, and Location OFF.
6. If any orb behaviour changes, stop and restore the known-good v4 package.

TEST LIMIT
The package source and ZIP structure should be checked before upload. Real
service-worker lifecycle and offline behaviour must still be verified on iPhone.
