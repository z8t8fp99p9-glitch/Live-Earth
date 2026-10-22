/* LIVE // EARTH v71 — silent startup verification; same-origin runtime dependencies cached for offline launch. */
(() => {
  "use strict";
  const BUILD_ID = "v71-offline-runtime";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  function readyControllersPresent() {
    return Boolean(
      window.LiveEarthScene &&
      window.LiveEarthViewManager &&
      window.LiveEarthSkyViews &&
      window.__liveEarthControlsInstalled &&
      window.__liveEarthLocationScannerInstalled
    );
  }

  function signalVerifiedStartup() {
    const controller = navigator.serviceWorker.controller;
    if (!controller || !readyControllersPresent()) return;
    controller.postMessage({ type: "LIVE_EARTH_APP_READY_V71", buildId: BUILD_ID });
  }

  window.addEventListener("live-earth-scene-ready", signalVerifiedStartup);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (document.readyState === "complete") signalVerifiedStartup();
  });
  if (document.readyState === "complete") signalVerifiedStartup();
  else window.addEventListener("load", signalVerifiedStartup, { once: true });

  // Ask the browser to check the root-scoped worker on launch without blocking
  // app rendering. Network errors simply leave the current offline shell active.
  navigator.serviceWorker.ready.then(registration => {
    if (navigator.onLine !== false && typeof registration.update === "function") {
      registration.update().catch(() => {});
    }
  }).catch(() => {});
})();
