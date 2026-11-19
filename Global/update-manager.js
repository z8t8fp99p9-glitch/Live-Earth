/* LIVE // EARTH V138 update manager — Global Orb and view lifecycle. */
(() => {
  "use strict";
  if (window.__liveEarthSunUpdateManagerInstalled) return;
  window.__liveEarthSunUpdateManagerInstalled = true;
  const BUILD_ID = "v151-friendly-offline-feature-message";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  function readyControllersPresent() {
    return Boolean(
      window.LiveEarthPrimeScene && window.LiveEarthEngine && window.LiveEarthGlobalViewpoint && window.LiveEarthViewManager && window.LiveEarthViewModules && window.LiveEarthOrbSystem &&
      window.LiveEarthViewModules.has("sky-container") &&
      window.LiveEarthViewModules.has("earth-independent-renderer") &&
      window.__liveEarthEarthRendererInstalled === true &&
      window.LiveEarthViewModules.has("moon-lunar-interface") &&
      window.__liveEarthMoonRendererInstalled === true &&
      window.LiveEarthSkyViews &&
      window.__liveEarthControlsInstalled && window.__liveEarthLocationScannerInstalled &&
      window.__liveEarthLunarStardustInstalled && window.__liveEarthStartupReady === true
    );
  }
  function signalVerifiedStartup() {
    const controller = navigator.serviceWorker.controller;
    if (!controller || !readyControllersPresent()) return;
    controller.postMessage({ type: "LIVE_EARTH_APP_READY_V75", buildId: BUILD_ID });
  }
  // Optional feature renderers are intentionally excluded from verified startup.
  // Sun and Stacks implementations are loaded by the view registry only on selection.

  window.addEventListener("live-earth-scene-ready", signalVerifiedStartup);
  window.addEventListener("live-earth-earth-engine-ready", signalVerifiedStartup);
  window.addEventListener("live-earth-startup-ready", signalVerifiedStartup);
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (document.readyState === "complete") signalVerifiedStartup(); });
  if (document.readyState === "complete") signalVerifiedStartup();
  else window.addEventListener("load", signalVerifiedStartup, { once: true });
  navigator.serviceWorker.ready.then(registration => {
    if (navigator.onLine !== false && typeof registration.update === "function") registration.update().catch(() => {});
  }).catch(() => {});
})();
