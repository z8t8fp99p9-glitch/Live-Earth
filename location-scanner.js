/* LIVE // EARTH V52 — Location Scanner and persistent Home location dot. */
(() => {
  "use strict";
  if (window.__liveEarthLocationScannerInstalled) return;
  window.__liveEarthLocationScannerInstalled = true;
  let enabled = false;
  let watchId = null;
  let lastFixAt = 0;
  let staleTimer = 0;
  const MAX_FIX_AGE = 120000;

  function globe() { return window.LiveEarthScene || null; }
  function stopWatch() {
    if (watchId !== null && navigator.geolocation) {
      try { navigator.geolocation.clearWatch(watchId); } catch (_) {}
    }
    watchId = null;
    if (staleTimer) clearInterval(staleTimer);
    staleTimer = 0;
  }
  function hideForNoFreshFix() {
    const api = globe();
    if (api) api.setLocationEnabled(false);
  }
  function onPosition(position) {
    if (!enabled || window.liveEarthLocationAllowed?.() !== true) return;
    const timestamp = Number(position?.timestamp) || Date.now();
    if (Date.now() - timestamp > MAX_FIX_AGE) return;
    const api = globe();
    if (!api) return;
    if (api.setLocation(position.coords.latitude, position.coords.longitude)) {
      lastFixAt = timestamp;
      api.setLocationEnabled(true);
    }
  }
  function onError(error) {
    if (!enabled) return;
    // Do not leave an old position pretending to be live when the browser says
    // the location cannot be refreshed or permission has been revoked.
    if (error?.code === 1) {
      stopWatch();
      enabled = false;
      hideForNoFreshFix();
      return;
    }
    if (!lastFixAt || Date.now() - lastFixAt > MAX_FIX_AGE) hideForNoFreshFix();
  }
  function startWatch() {
    stopWatch();
    lastFixAt = 0;
    if (!enabled || window.liveEarthLocationAllowed?.() !== true || !navigator.geolocation) {
      hideForNoFreshFix();
      return;
    }
    // A location marker is not shown until a fresh successful fix arrives.
    hideForNoFreshFix();
    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy:true, maximumAge:0, timeout:15000
    });
    staleTimer = setInterval(() => {
      if (enabled && (!lastFixAt || Date.now() - lastFixAt > MAX_FIX_AGE)) hideForNoFreshFix();
    }, 15000);
  }
  function applyState(value) {
    enabled = !!value && window.liveEarthLocationAllowed?.() === true;
    const api = globe();
    if (api) api.setLocationEnabled(enabled && !!lastFixAt && Date.now()-lastFixAt<=MAX_FIX_AGE);
    if (enabled) startWatch();
    else { stopWatch(); lastFixAt = 0; hideForNoFreshFix(); }
  }
  window.addEventListener("live-earth-location-state", event => applyState(!!event.detail?.enabled));
  window.addEventListener("live-earth-location-stop", () => applyState(false));
  window.addEventListener("live-earth-scene-ready", () => {
    if (window.liveEarthLocationAllowed?.() === true) applyState(true);
    else hideForNoFreshFix();
  });
  window.addEventListener("pagehide", stopWatch, {once:true});
  // The app deliberately defaults Location to OFF on each fresh page load.
  hideForNoFreshFix();
})();
