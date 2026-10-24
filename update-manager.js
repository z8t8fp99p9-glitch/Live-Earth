/* LIVE // EARTH v83 — Moon Arc + online-first launch + verified startup gate. */
(() => {
  "use strict";
  const BUILD_ID = "v84-moon-arc-refinement";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  function readyControllersPresent() {
    return Boolean(
      window.LiveEarthScene &&
      window.LiveEarthViewManager &&
      window.LiveEarthSkyViews &&
      window.__liveEarthControlsInstalled &&
      window.__liveEarthLocationScannerInstalled &&
      window.__liveEarthLunarStardustInstalled &&
      window.__liveEarthStartupReady === true
    );
  }

  function signalVerifiedStartup() {
    const controller = navigator.serviceWorker.controller;
    if (!controller || !readyControllersPresent()) return;
    // Keep the existing message type for compatibility; BUILD_ID identifies this build.
    controller.postMessage({ type: "LIVE_EARTH_APP_READY_V75", buildId: BUILD_ID });
  }

  window.addEventListener("live-earth-scene-ready", signalVerifiedStartup);
  window.addEventListener("live-earth-startup-ready", signalVerifiedStartup);
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
