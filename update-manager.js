/* LIVE // EARTH — update prompt and post-startup cache verification. */
(() => {
  "use strict";
  if (window.__liveEarthUpdateManagerInstalled) return;
  window.__liveEarthUpdateManagerInstalled = true;

  const BUILD_ID = "v69-local-recovery";
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;

  let registration = null;
  let updateRequested = false;
  let notice = null;
  const controllerAtStartup = navigator.serviceWorker.controller;

  function buildNotice() {
    if (notice) return notice;
    const style = document.createElement("style");
    style.textContent = `
      #le-update-notice{position:fixed;z-index:30;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18px);transform:translateX(-50%);width:min(92vw,420px);padding:15px;border:1px solid rgba(173,220,255,.28);border-radius:18px;background:linear-gradient(145deg,rgba(13,29,48,.97),rgba(2,7,16,.97));box-shadow:0 12px 36px #000b,inset 1px 1px 1px #ffffff20;color:#edf7ff;font:500 14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      #le-update-notice[hidden]{display:none}#le-update-notice strong{display:block;font-size:14px;letter-spacing:.03em}#le-update-notice p{margin:5px 0 12px;color:#b8cadc;font-size:12px}
      #le-update-notice .le-update-actions{display:flex;gap:8px;justify-content:flex-end}#le-update-notice button{min-height:38px;padding:8px 13px;border:1px solid rgba(180,220,250,.23);border-radius:999px;background:rgba(255,255,255,.06);color:#eaf6ff;font:650 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:manipulation}
      #le-update-notice button[data-action="update"]{border-color:rgba(106,205,255,.65);background:linear-gradient(135deg,rgba(48,145,205,.42),rgba(255,255,255,.08))}#le-update-notice button:disabled{opacity:.6}
      @media(prefers-reduced-motion:reduce){#le-update-notice{backdrop-filter:none;-webkit-backdrop-filter:none}}
    `;
    document.head.appendChild(style);
    notice = document.createElement("section");
    notice.id = "le-update-notice";
    notice.hidden = true;
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.innerHTML = `
      <strong>LIVE // EARTH update available</strong>
      <p>The new version is ready. Update now to restart, or choose Later to keep this session unchanged.</p>
      <div class="le-update-actions">
        <button type="button" data-action="later">Later</button>
        <button type="button" data-action="update">Update now</button>
      </div>`;
    document.body.appendChild(notice);
    notice.querySelector('[data-action="later"]').addEventListener("click", () => {
      // Dismiss for this page only. The waiting worker stays staged and does
      // not take over; it can activate naturally after old clients close.
      notice.hidden = true;
    });
    notice.querySelector('[data-action="update"]').addEventListener("click", () => {
      const waiting = registration?.waiting;
      if (!waiting) {
        notice.hidden = true;
        return;
      }
      updateRequested = true;
      const button = notice.querySelector('[data-action="update"]');
      button.disabled = true;
      button.textContent = "Updating…";
      waiting.postMessage({ type: "LIVE_EARTH_SKIP_WAITING", buildId: BUILD_ID });
    });
    return notice;
  }

  function showUpdateIfWaiting() {
    if (!registration?.waiting || !navigator.serviceWorker.controller) return;
    const panel = buildNotice();
    panel.querySelector('[data-action="update"]').disabled = false;
    panel.querySelector('[data-action="update"]').textContent = "Update now";
    panel.hidden = false;
  }

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
    if (!navigator.serviceWorker.controller || !readyControllersPresent()) return;
    navigator.serviceWorker.controller.postMessage({ type: "LIVE_EARTH_APP_READY_V69", buildId: BUILD_ID });
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updateRequested || (controllerAtStartup && navigator.serviceWorker.controller !== controllerAtStartup)) {
      // Reload on an explicitly requested update. Other already-controlled app
      // windows also reload if that approved update takes over their controller.
      location.reload();
      return;
    }
    if (document.readyState === "complete") signalVerifiedStartup();
  });

  navigator.serviceWorker.ready.then(reg => {
    registration = reg;
    showUpdateIfWaiting();
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") showUpdateIfWaiting();
      });
    });
    window.addEventListener("load", signalVerifiedStartup, { once: true });
    // If controller attachment completes after load, the listener above sends
    // the verified-startup message once the new controller is in place.
    if (document.readyState === "complete") signalVerifiedStartup();
  }).catch(error => {
    console.warn("[LIVE // EARTH] Update manager unavailable; the existing app remains usable.", error);
  });
})();
