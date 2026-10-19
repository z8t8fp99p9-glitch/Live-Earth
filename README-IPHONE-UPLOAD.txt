LIVE // EARTH — automatic cache refresh patch

WHAT THIS FIXES
The existing service worker uses cache-first for HTML. An installed iPhone
home-screen app can therefore continue showing old UI after Safari shows the
new page. This replacement uses network-first for navigations/HTML and keeps an
offline fallback to the last cached page.

UPLOAD FROM IPHONE
1. Open the Live-Earth repository on GitHub, branch main.
2. Open the existing root-level sw.js and tap Edit (pencil).
3. Replace the full file with the included sw.js.
4. Commit title:
   Fix automatic PWA HTML cache refresh
5. Wait for GitHub Pages deployment to finish.
6. Close and reopen the installed LIVE // EARTH app while online.

This patch changes only sw.js; it does not edit the globe or remove saved
button selection. It also does not instantly update a page that is already
open: the new service worker must install and activate. No GitHub files were
changed while preparing this ZIP.
