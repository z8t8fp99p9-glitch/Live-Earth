# V97 update-manager build-ID patch

In `update-manager.js`, replace only its `BUILD_ID` value so the page sends the same identity as the new service worker:

```js
const BUILD_ID = "v97-lunar-arc-spline-blue-scroller";
```

Leave the readiness gate and every other line unchanged. This matters because the worker accepts the verified-startup message only when its `buildId` matches the worker's `BUILD_ID`.
