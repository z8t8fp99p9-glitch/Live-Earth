/* LIVE // EARTH V104 update manager; Alien World is an online-only full-screen Stacks feature. */
(() => {
  "use strict";
  if (window.__liveEarthSunUpdateManagerInstalled) return;
  window.__liveEarthSunUpdateManagerInstalled = true;
  const BUILD_ID = "v104-alien-world-article-images";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  function readyControllersPresent() {
    return Boolean(
      window.LiveEarthScene &&
      window.LiveEarthViewManager &&
      window.LiveEarthViewModules &&
      window.LiveEarthViewModules.has("sky-container") &&
      window.LiveEarthViewModules.has("sun-procedural-renderer") &&
      window.LiveEarthViewModules.has("moon-lunar-interface") &&
      window.__liveEarthMoonRendererInstalled === true &&
      window.__liveEarthStacksFeatureViewsInstalled === true &&
      window.__liveEarthAlienWorldDiscoveryInstalled === true &&
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
    // The service worker and update manager share the V104 cache identity.
    controller.postMessage({ type: "LIVE_EARTH_APP_READY_V75", buildId: BUILD_ID });
  }

  async function loadProceduralSun() {
    if (window.LiveEarthViewModules?.has("sun-procedural-renderer")) return true;
    if (window.__liveEarthSunRendererLoadPromise) return window.__liveEarthSunRendererLoadPromise;
    if (!window.LiveEarthViewModules) throw new Error("The view registry is not ready yet.");

    const loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./sun-view-renderer.js", document.baseURI).href;
      script.async = true;
      script.onload = () => {
        if (window.LiveEarthViewModules?.has("sun-procedural-renderer")) resolve(true);
        else reject(new Error("The Sun renderer loaded but did not register its view."));
      };
      script.onerror = () => reject(new Error("The Sun renderer file could not be loaded."));
      document.head.appendChild(script);
    });
    window.__liveEarthSunRendererLoadPromise = loading;
    return loading;
  }

  // The procedural Sun remains an optional local renderer, cached by the existing
  // service-worker policy. Alien World content is fetched separately with no-store.
  // An optional-view failure never blocks Home or Moon.
  loadProceduralSun().then(() => {
    window.__liveEarthSunRendererReady = true;
    signalVerifiedStartup();
  }).catch(error => {
    window.__liveEarthSunRendererReady = false;
    console.warn("[LIVE // EARTH] Procedural Sun is not available yet; Home and Moon remain available.", error?.message || error);
  });

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
