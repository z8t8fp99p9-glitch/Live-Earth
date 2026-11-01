/* LIVE // EARTH V109 update manager. */
(() => {
  "use strict";
  if (window.__liveEarthSunUpdateManagerInstalled) return;
  window.__liveEarthSunUpdateManagerInstalled = true;
  const BUILD_ID = "v109-alien-view-reset";
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
      window.__liveEarthAlienWorldViewInstalled === true &&
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
    // The service worker and update manager must share the exact V109 build identity.
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

  // Nature is an optional Stacks view. It loads only after the shared feature
  // registry exists, and its failure must never block Home, Moon or app startup.
  async function loadNatureView() {
    if (window.__liveEarthNatureViewInstalled) return true;
    if (!window.LiveEarthFeatureViews?.register) throw new Error("The Stacks feature registry is not ready yet.");
    if (window.__liveEarthNatureViewLoadPromise) return window.__liveEarthNatureViewLoadPromise;
    const loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./nature/view/nature-view-controller.js", document.baseURI).href;
      script.async = true;
      script.onload = () => {
        if (window.__liveEarthNatureViewInstalled) resolve(true);
        else reject(new Error("The Nature controller loaded but did not register its view."));
      };
      script.onerror = () => reject(new Error("The Nature view file could not be loaded."));
      document.head.appendChild(script);
    });
    window.__liveEarthNatureViewLoadPromise = loading;
    return loading.catch(error => {
      window.__liveEarthNatureViewLoadPromise = null;
      throw error;
    });
  }

  // Magazine is a deliberately blank full-screen Feature Orb view for now.
  // Its shell is independent of the dormant publication adapter and never blocks startup.
  async function loadMagazineView() {
    if (window.__liveEarthMagazineViewInstalled) return true;
    if (!window.LiveEarthFeatureViews?.register) throw new Error("The Stacks feature registry is not ready yet.");
    if (window.__liveEarthMagazineViewLoadPromise) return window.__liveEarthMagazineViewLoadPromise;
    const loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./magazine/view/magazine-view-controller.js", document.baseURI).href;
      script.async = true;
      script.onload = () => {
        if (window.__liveEarthMagazineViewInstalled) resolve(true);
        else reject(new Error("The Magazine controller loaded but did not register its view."));
      };
      script.onerror = () => reject(new Error("The Magazine view file could not be loaded."));
      document.head.appendChild(script);
    });
    window.__liveEarthMagazineViewLoadPromise = loading;
    return loading.catch(error => {
      window.__liveEarthMagazineViewLoadPromise = null;
      throw error;
    });
  }

  // The procedural Sun, Nature and Magazine remain optional; failure never blocks Home or Moon.
  loadProceduralSun().then(() => {
    window.__liveEarthSunRendererReady = true;
    signalVerifiedStartup();
  }).catch(error => {
    window.__liveEarthSunRendererReady = false;
    console.warn("[LIVE // EARTH] Procedural Sun is not available yet; Home and Moon remain available.", error?.message || error);
  });
  loadNatureView().catch(error => {
    console.warn("[LIVE // EARTH] Nature view is not available yet; Home, Moon and the existing Stacks views remain available.", error?.message || error);
  });
  loadMagazineView().catch(error => {
    console.warn("[LIVE // EARTH] Magazine view is not available yet; Home, Moon and the other Stacks views remain available.", error?.message || error);
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
