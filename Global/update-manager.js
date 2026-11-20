/* LIVE // EARTH V155 update manager — core startup readiness and staged updates. */
(() => {
  "use strict";
  if (window.__liveEarthSunUpdateManagerInstalled) return;
  window.__liveEarthSunUpdateManagerInstalled = true;
  const BUILD_ID = "v155-on-demand-feature-views";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  function readyControllersPresent() {
    return Boolean(
      window.LiveEarthPrimeScene && window.LiveEarthEngine && window.LiveEarthGlobalViewpoint && window.LiveEarthViewManager && window.LiveEarthViewModules && window.LiveEarthOrbSystem &&
      window.LiveEarthViewModules.has("sky-container") &&
      window.LiveEarthViewModules.has("earth-independent-renderer") &&
      window.__liveEarthEarthRendererInstalled === true &&
      window.LiveEarthViewModules.has("sun-procedural-renderer") &&
      window.LiveEarthViewModules.has("moon-lunar-interface") &&
      window.__liveEarthMoonRendererInstalled === true &&
      window.__liveEarthStacksFeatureViewsInstalled === true && window.LiveEarthSkyViews &&
      window.__liveEarthControlsInstalled && window.__liveEarthLocationScannerInstalled &&
      window.__liveEarthLunarStardustInstalled && window.__liveEarthStartupReady === true
    );
  }
  function signalVerifiedStartup() {
    const controller = navigator.serviceWorker.controller;
    if (!controller || !readyControllersPresent()) return;
    controller.postMessage({ type: "LIVE_EARTH_APP_READY_V75", buildId: BUILD_ID });
  }
  async function loadProceduralSun() {
    if (window.LiveEarthViewModules?.has("sun-procedural-renderer")) return true;
    if (window.__liveEarthSunRendererLoadPromise) return window.__liveEarthSunRendererLoadPromise;
    if (!window.LiveEarthViewModules) throw new Error("The view registry is not ready yet.");
    const loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./Sun/sun-view-controller.js", document.baseURI).href; script.async = true;
      script.onload = () => window.LiveEarthViewModules?.has("sun-procedural-renderer") ? resolve(true) : reject(new Error("The Sun controller loaded but did not register its view."));
      script.onerror = () => reject(new Error("The Sun controller file could not be loaded."));
      document.head.appendChild(script);
    });
    window.__liveEarthSunRendererLoadPromise = loading; return loading;
  }


  loadProceduralSun().then(() => { window.__liveEarthSunRendererReady = true; signalVerifiedStartup(); }).catch(error => {
    window.__liveEarthSunRendererReady = false;
    console.warn("[LIVE // EARTH] Procedural Sun is not available yet; Home and Moon remain available.", error?.message || error);
  });


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
