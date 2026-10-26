# Required service-worker candidate version bump

In repository-root `sw.js`, change only these two constants near the top:

```js
const BUILD_ID = "v96-moon-view-inline-renderer-candidate";
const CACHE_NAME = "live-earth-shell-v96-moon-view-inline-renderer-candidate";
```

Keep `CACHE_PREFIX`, `APP_SHELL`, retry logic, content validation, staging, rollback, data recovery, and fetch handling unchanged. The existing APP_SHELL already lists `sky-view-controller.js`, and the compact Moon texture is embedded in that file, so no APP_SHELL asset addition is required.
