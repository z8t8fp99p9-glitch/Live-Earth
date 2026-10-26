# V97 service-worker version patch

Apply this patch together with the corrected `sky-view-controller.js`. The service worker must use the same build ID as `update-manager.js` so the staged update gate and cache cleanup agree.

In `sw.js`, replace only these two constants near the top:

```js
const BUILD_ID = "v97-lunar-arc-spline-blue-scroller";
const CACHE_NAME = "live-earth-shell-v97-lunar-arc-spline-blue-scroller";
```

Do not change `CACHE_PREFIX`, `OPTIONAL_CACHE`, `OPTIONAL_LIMIT`, `APP_SHELL`, fetch retries, cache integrity checks, recovery logic, or IndexedDB handling.
