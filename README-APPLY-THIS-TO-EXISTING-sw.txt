LIVE // EARTH — v78 service-worker fix

Purpose: fix the missing app-shell update so Sun View loads the new portrait/landscape WebP backgrounds offline too.

IMPORTANT
- This is a PATCH for the existing sw.js, not a replacement sw.js file.
- Do NOT upload this patch as a new repo file.
- Do NOT overwrite sw.js with a reconstructed copy.
- Edit the existing z8t8fp99p9-glitch/Live-Earth main/sw.js and make exactly these three changes.

1) Change BUILD_ID:
const BUILD_ID = "v77-ios-root-flow-ab-test";
to:
const BUILD_ID = "v78-sun-view-backgrounds";

2) Change CACHE_NAME:
const CACHE_NAME = "live-earth-shell-v77-ios-root-flow-ab-test";
to:
const CACHE_NAME = "live-earth-shell-v78-sun-view-backgrounds";

3) In APP_SHELL, directly after:
 "./moon-sky-background-portrait.webp","./moon-sky-background-landscape.webp",
add:
 "./sun-sky-background-portrait.webp","./sun-sky-background-landscape.webp",

Do not change any other code. Preserve the install/activate logic, IndexedDB/data recovery, cache cleanup, location privacy defaults, and startup flow.

Current base was verified on main before this patch:
- sw.js blob SHA: 73e84b7b4ffabf40aa1ca82875220356693bd4a2
- prior source commit: a1179495b6dc19e81654267aa9371304f6266acc (Sun backgrounds + controller already committed)

After applying the three edits, check the top lines and APP_SHELL, then commit sw.js only.
Suggested commit title:
Fix v78 Sun View app-shell caching

Expected effect: the updated service worker can stage the new background assets in a fresh v78 shell cache and activate through the existing app update flow. This does not implement dynamic terrain lighting; that remains separate work.
