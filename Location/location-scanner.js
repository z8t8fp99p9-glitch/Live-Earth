/* LIVE // EARTH V53 — verified Location permission/fix state.
   The Location Orb stays visually OFF until the browser supplies a fresh,
   valid position. The existing Orb controller remains the owner of the
   protected Orb styling and navigation; this scanner owns the request lifecycle. */
(() => {
  "use strict";
  if (window.__liveEarthLocationScannerInstalled) return;
  window.__liveEarthLocationScannerInstalled = true;

  const MAX_FIX_AGE = 120000;
  const MAX_FUTURE_SKEW = 30000;
  let requested = false;
  let hasFreshFix = false;
  let watchId = null;
  let lastFixAt = 0;
  let staleTimer = 0;
  let statusTimer = 0;
  let bypassPrimaryClick = false;
  const statusNode = document.querySelector("#status");

  function globe() {
    return window.LiveEarthScene || null;
  }

  function isFreshFix() {
    return requested && hasFreshFix && lastFixAt > 0 &&
      Date.now() - lastFixAt <= MAX_FIX_AGE;
  }

  // Other features may use Location only after a fresh fix exists.
  window.liveEarthLocationAllowed = isFreshFix;
  window.liveEarthGetLocationState = isFreshFix;
  window.liveEarthLocationPending = () => requested && !isFreshFix();

  function showStatus(message, duration = 2800) {
    if (!statusNode) return;
    if (statusTimer) window.clearTimeout(statusTimer);
    statusNode.hidden = false;
    statusNode.textContent = message;
    if (duration > 0) {
      statusTimer = window.setTimeout(() => {
        if (statusNode.textContent === message) statusNode.hidden = true;
        statusTimer = 0;
      }, duration);
    } else {
      statusTimer = 0;
    }
  }

  function publishState(enabled, status) {
    window.dispatchEvent(new CustomEvent("live-earth-location-state", {
      detail: {
        enabled: !!enabled,
        requested,
        status
      }
    }));
  }

  function paintLocationOrbs() {
    const active = isFreshFix();
    const pending = requested && !active;
    const label = active
      ? "Location ON — tap to turn off"
      : pending
        ? "Location permission pending — tap to cancel"
        : "Location OFF — tap to turn on";
    document.querySelectorAll(
      '#navButtons .orbButton[data-view="location"], #le-feature-dock .orbButton[data-view="location"]'
    ).forEach(button => {
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-busy", String(pending));
      button.setAttribute("aria-label", label);
      button.dataset.locationState = active ? "active" : pending ? "pending" : "off";
    });
  }

  function hideForNoFreshFix() {
    const api = globe();
    if (api && typeof api.setLocationEnabled === "function") {
      api.setLocationEnabled(false);
    }
  }

  function stopWatch() {
    if (watchId !== null && navigator.geolocation &&
        typeof navigator.geolocation.clearWatch === "function") {
      try { navigator.geolocation.clearWatch(watchId); } catch (_) {}
    }
    watchId = null;
    if (staleTimer) window.clearInterval(staleTimer);
    staleTimer = 0;
  }

  function clearRequestState() {
    requested = false;
    hasFreshFix = false;
    lastFixAt = 0;
    stopWatch();
    hideForNoFreshFix();
    paintLocationOrbs();
  }

  function onPosition(position) {
    if (!requested) return;

    const now = Date.now();
    const rawTimestamp = Number(position?.timestamp);
    const fixTimestamp = Number.isFinite(rawTimestamp) && rawTimestamp > 0
      ? rawTimestamp
      : now;
    if (now - fixTimestamp > MAX_FIX_AGE || fixTimestamp - now > MAX_FUTURE_SKEW) {
      if (!hasFreshFix) {
        showStatus("Waiting for a current location fix. The Location Orb stays OFF until one arrives.", 0);
      }
      return;
    }

    const latitude = Number(position?.coords?.latitude);
    const longitude = Number(position?.coords?.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return;
    }

    const api = globe();
    if (!api || typeof api.setLocation !== "function" ||
        typeof api.setLocationEnabled !== "function") return;

    let accepted = false;
    try { accepted = api.setLocation(latitude, longitude) === true; }
    catch (error) {
      console.warn("[LIVE // EARTH] Location fix could not be applied.", error);
      return;
    }
    if (!accepted || !requested) return;

    const wasFresh = isFreshFix();
    lastFixAt = fixTimestamp;
    hasFreshFix = true;
    api.setLocationEnabled(true);

    if (!wasFresh) {
      // This is the first point at which the app announces Location as ON.
      publishState(true, "active");
      showStatus("Live Location ON — a fresh position has been received.");
    }
    paintLocationOrbs();
  }

  function finishThroughOrbController(reason, message) {
    const primaryButton = document.querySelector('#navButtons .orbButton[data-view="location"]');
    const hadWatch = watchId !== null;
    requested = false;
    hasFreshFix = false;
    lastFixAt = 0;
    hideForNoFreshFix();

    if (hadWatch && primaryButton) {
      // The existing Orb controller owns the watch-ID cleanup set. Temporarily
      // align its internal gate, then let its normal OFF path clear that set.
      publishState(true, "cleanup-bridge");
      bypassPrimaryClick = true;
      try { primaryButton.click(); }
      catch (_) { bypassPrimaryClick = false; }
      if (bypassPrimaryClick) bypassPrimaryClick = false;
    } else {
      stopWatch();
      publishState(false, reason);
    }

    // The controller's OFF event is intentionally followed by a reasoned state
    // event so the dock and any open feature receive the final status as well.
    publishState(false, reason);
    paintLocationOrbs();
    showStatus(message, reason === "denied" ? 6500 : 2800);
  }

  function onError(error) {
    if (!requested) return;
    const code = Number(error?.code);

    if (code === 1) {
      finishThroughOrbController(
        "denied",
        "Location permission was denied or revoked. The Location Orb is OFF. Check this site's Location permission before trying again."
      );
      return;
    }

    if (!isFreshFix()) {
      hasFreshFix = false;
      lastFixAt = 0;
      hideForNoFreshFix();
      publishState(false, "pending");
      paintLocationOrbs();
      showStatus("No fresh location is available yet. Waiting for the device to provide a fix.", 0);
    }
    // A timeout or temporary position error does not revoke the user's request.
    // The watch remains active and the next valid fix can turn the Orb ON.
  }

  function startWatch() {
    if (!navigator.geolocation ||
        typeof navigator.geolocation.watchPosition !== "function") {
      finishThroughOrbController(
        "unsupported",
        "Location is not available in this browser. The Location Orb remains OFF."
      );
      return;
    }

    try {
      // orb-controls-v4.js protects the native geolocation methods behind its
      // internal Location gate. Open that gate only long enough to register the
      // user-requested watch; the Orb is then returned to OFF/pending until a fix.
      publishState(true, "permission-start");
      const createdWatchId = navigator.geolocation.watchPosition(onPosition, onError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      });

      if (createdWatchId === -1 || createdWatchId === null || createdWatchId === undefined) {
        throw new Error("The browser did not start a Location watch.");
      }
      watchId = createdWatchId;
    } catch (error) {
      console.warn("[LIVE // EARTH] Location watch could not start.", error);
      finishThroughOrbController(
        "unavailable",
        "The device could not start Location. The Location Orb is OFF; check browser permission and try again."
      );
      return;
    }

    if (!requested) {
      stopWatch();
      return;
    }

    // Registration succeeded, but no fix has been received yet: keep the public
    // state and red active ring OFF while retaining the already-created watch.
    publishState(false, "pending");
    paintLocationOrbs();
    showStatus("Requesting Location permission and waiting for a fresh fix. The Orb will turn ON only after a valid position arrives.", 0);

    staleTimer = window.setInterval(() => {
      if (!requested || !hasFreshFix) return;
      if (Date.now() - lastFixAt <= MAX_FIX_AGE) return;

      hasFreshFix = false;
      hideForNoFreshFix();
      publishState(false, "stale");
      paintLocationOrbs();
      showStatus("The last location fix is no longer fresh. The Location Orb is OFF while the scanner waits for an update.", 0);
    }, 15000);
  }

  function handleLocationClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest(
      '#navButtons .orbButton[data-view="location"], #le-feature-dock .orbButton[data-view="location"]'
    );
    if (!button) return;

    const primaryButton = target?.closest('#navButtons .orbButton[data-view="location"]');
    if (bypassPrimaryClick && primaryButton) {
      bypassPrimaryClick = false;
      return;
    }

    // When active, let the established Orb controller run its normal OFF path;
    // that path also clears its own tracked geolocation watch IDs.
    if (requested && isFreshFix()) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (requested) {
      finishThroughOrbController("off", "Live Location OFF. Fresh location requests are stopped.");
      return;
    }

    requested = true;
    hasFreshFix = false;
    lastFixAt = 0;
    hideForNoFreshFix();
    paintLocationOrbs();
    startWatch();
  }

  function onControllerLocationState(event) {
    const detail = event.detail || {};
    // Ignore the scanner's reasoned lifecycle events. An untagged OFF event is
    // the established Orb controller's explicit user-OFF action.
    if (detail.status) return;
    if (detail.enabled === false) {
      clearRequestState();
      showStatus("Live Location OFF. Fresh location requests are stopped.");
    }
  }

  function onControllerLocationStop() {
    clearRequestState();
  }

  document.addEventListener("click", handleLocationClick, true);
  window.addEventListener("live-earth-location-state", onControllerLocationState);
  window.addEventListener("live-earth-location-stop", onControllerLocationStop);
  window.addEventListener("pagehide", clearRequestState, { once: true });
  window.addEventListener("live-earth-scene-ready", () => {
    if (!requested) hideForNoFreshFix();
  });

  // Location is deliberately OFF at every fresh app launch.
  clearRequestState();
})();
