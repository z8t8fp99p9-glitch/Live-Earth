/* LIVE // EARTH V128 update manager — Global Orb and view lifecycle. */
(() => {
  "use strict";
  if (window.__liveEarthSunUpdateManagerInstalled) return;
  window.__liveEarthSunUpdateManagerInstalled = true;
  const BUILD_ID = "v129-engine-quaternion-viewpoint";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  function readyControllersPresent() {
    return Boolean(
      window.LiveEarthScene && window.LiveEarthEngine && window.LiveEarthGlobalViewpoint && window.LiveEarthViewManager && window.LiveEarthViewModules && window.LiveEarthOrbSystem &&
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
  async function loadEngineFeatureViews() {
    if (window.__liveEarthEngineFeatureViewsInstalled) return true;
    if (!window.LiveEarthFeatureViews?.register) throw new Error("The Stacks feature registry is not ready yet.");
    if (window.__liveEarthEngineFeatureViewsLoadPromise) return window.__liveEarthEngineFeatureViewsLoadPromise;
    const loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./Editorial-Engine/engine-feature-views.js", document.baseURI).href; script.async = true;
      script.onload = () => window.__liveEarthEngineFeatureViewsInstalled ? resolve(true) : reject(new Error("The Editorial Engine workspace loaded but did not register its view."));
      script.onerror = () => reject(new Error("The Editorial Engine workspace controller could not be loaded."));
      document.head.appendChild(script);
    });
    window.__liveEarthEngineFeatureViewsLoadPromise = loading;
    return loading.catch(error => { window.__liveEarthEngineFeatureViewsLoadPromise = null; throw error; });
  }

  loadProceduralSun().then(() => { window.__liveEarthSunRendererReady = true; signalVerifiedStartup(); }).catch(error => {
    window.__liveEarthSunRendererReady = false;
    console.warn("[LIVE // EARTH] Procedural Sun is not available yet; Home and Moon remain available.", error?.message || error);
  });

  loadEngineFeatureViews().catch(error => console.warn(
    "[LIVE // EARTH] Editorial Engine view is not available yet; Home, Moon and other Stacks views remain available.",
    error?.message || error
  ));

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
