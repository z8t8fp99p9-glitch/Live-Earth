/* LIVE // EARTH — unlock the existing Home globe; never navigate to a second globe. */
(() => {
  "use strict";
  if (window.__liveEarthModeNavigation) return;
  window.__liveEarthModeNavigation = true;

  const earthSelector = '.orbButton[data-view="earth"]';
  const style = document.createElement("style");
  style.textContent = `
    #le-quality-controls {
      position:fixed; z-index:12; left:50%; bottom:calc(env(safe-area-inset-bottom) + 139px);
      transform:translateX(-50%); display:flex; align-items:center; justify-content:center; gap:10px;
      padding:6px; border:1px solid rgba(210,240,255,.26); border-radius:999px;
      background:linear-gradient(145deg,rgba(255,255,255,.15),rgba(16,34,54,.72) 48%,rgba(0,5,15,.76));
      box-shadow:inset 1px 1px 2px rgba(255,255,255,.25),inset -2px -3px 6px rgba(0,0,0,.45),0 8px 24px #0008;
      backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
      transition:opacity .22s ease,transform .22s ease; pointer-events:auto;
    }
    #le-quality-controls[hidden]{display:none}
    #le-location-scanner{position:fixed;z-index:12;right:max(16px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top) + 16px);display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:999px;border:1px solid rgba(255,70,100,.42);color:#ffeaf0;background:linear-gradient(145deg,rgba(90,12,32,.72),rgba(5,8,18,.84));box-shadow:inset 1px 1px 2px #ffffff24,0 5px 18px #0008;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);font:650 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    #le-location-scanner[hidden]{display:none}
    #le-location-scanner[aria-pressed="true"]{border-color:rgba(255,105,130,.95);box-shadow:inset 1px 1px 2px #ffffff30,0 0 14px rgba(255,35,75,.38),0 5px 18px #0008;color:#fff}
    #le-location-scanner .le-radar-dot{width:7px;height:7px;border-radius:50%;background:#ff234d;box-shadow:0 0 8px #ff234d}
    #le-quality-controls button{touch-action:manipulation}
    .le-quality-button {
      min-width:78px; padding:10px 13px; border-radius:999px;
      border:1px solid rgba(197,230,255,.24); color:#cfe8f8;
      background:rgba(255,255,255,.045); font:650 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing:.09em; text-transform:uppercase; -webkit-tap-highlight-color:transparent;
    }
    .le-quality-button[aria-pressed="true"]{
      color:#f5fcff; border-color:rgba(153,226,255,.8);
      background:linear-gradient(135deg,rgba(102,204,255,.25),rgba(255,255,255,.1));
      box-shadow:inset 1px 1px 2px #ffffff50,0 0 14px rgba(71,187,255,.22);
    }
    .le-quality-button:active,.le-zoom-button:active{transform:scale(.96)}
    .le-zoom-button{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(197,230,255,.28);color:#edf9ff;background:rgba(255,255,255,.07);font:600 23px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    .le-zoom-button:focus-visible,.le-quality-button:focus-visible{outline:2px solid #8de1ff;outline-offset:3px}
    @media(max-height:560px){
      #le-quality-controls{bottom:calc(env(safe-area-inset-bottom) + 100px)}
      .le-quality-button{min-width:68px;padding:8px 10px}
      .le-zoom-button{width:34px;height:34px}
    }
    @media(prefers-reduced-motion:reduce){#le-quality-controls,.le-quality-button{transition:none!important}}

  `;
  document.head.appendChild(style);

  const controls = document.createElement("div");
  controls.id = "le-quality-controls";
  controls.hidden = true;
  controls.setAttribute("role","group");
  controls.setAttribute("aria-label","Earth globe quality");
  controls.innerHTML = `
    <button type="button" class="le-zoom-button" data-zoom="out" aria-label="Zoom out" title="Zoom out">−</button>
    <button type="button" class="le-quality-button" data-quality="basic" aria-pressed="true">Basic</button>
    <button type="button" class="le-quality-button" data-quality="hd" aria-pressed="false">HD</button>
    <button type="button" class="le-zoom-button" data-zoom="in" aria-label="Zoom in" title="Zoom in">+</button>`;
  document.body.appendChild(controls);
  const scannerButton = document.createElement("button");
  scannerButton.type = "button";
  scannerButton.id = "le-location-scanner";
  scannerButton.hidden = true;
  scannerButton.setAttribute("aria-pressed","false");
  scannerButton.setAttribute("aria-label","Show or hide your location marker in Exploration");
  scannerButton.innerHTML = '<span class="le-radar-dot" aria-hidden="true"></span><span>Scanner</span>';
  document.body.appendChild(scannerButton);
  scannerButton.addEventListener("click", () => {
    const globe = window.LiveEarthScene;
    if (!globe?.isUnlocked()) return;
    if (window.liveEarthLocationAllowed?.() !== true) {
      const status = document.querySelector("#status");
      if (status) {
        status.hidden = false;
        status.textContent = "Turn the red Location Orb ON to use Scanner.";
        window.setTimeout(() => { if (status.textContent === "Turn the red Location Orb ON to use Scanner.") status.hidden = true; }, 3000);
      }
      return;
    }
    const next = !globe.getScannerVisible();
    globe.setScannerVisible(next);
    scannerButton.setAttribute("aria-pressed",String(next));
    const status = document.querySelector("#status");
    if (status) {
      status.hidden = false;
      status.textContent = next ? "Location Scanner ON · showing your position on Earth." : "Location Scanner hidden · Location tracking remains ON.";
      window.setTimeout(() => { if (status.textContent.startsWith("Location Scanner")) status.hidden = true; }, 2600);
    }
  });

  const qualityButtons = [...controls.querySelectorAll("[data-quality]")];
  const zoomButtons = [...controls.querySelectorAll("[data-zoom]")];
  zoomButtons.forEach(button => button.addEventListener("click", () => {
    const globe = window.LiveEarthScene;
    if (!globe?.isUnlocked()) return;
    globe.zoomBy(button.dataset.zoom === "in" ? 0.82 : 1.22);
  }));
  function paintQuality(value) {
    qualityButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.quality === value)));
  }
  function syncQualityFromGlobe() {
    const globe = window.LiveEarthScene;
    paintQuality(globe?.getQuality?.() || "basic");
  }

  function setEarthActive(active) {
    const button = document.querySelector(earthSelector);
    if (!button) return;
    // The legacy orb controller paints Earth as inactive in Home mode. Keep
    // its own handlers intact and add an explicit mode state for this feature.
    button.classList.toggle("le-earth-exploration-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-expanded", String(active));
    button.setAttribute("data-earth-exploration", String(active));
    window.dispatchEvent(new CustomEvent("live-earth-exclusive-mode", {detail:{active}}));
  }

  qualityButtons.forEach(button => button.addEventListener("click", () => {
    const globe = window.LiveEarthScene;
    if (!globe?.isUnlocked()) return;
    const value = globe.setQuality(button.dataset.quality);
    paintQuality(value);
  }));

  function closeEarthMode() {
    const globe = window.LiveEarthScene;
    if (globe?.isUnlocked()) globe.lock();
    controls.hidden = true;
    scannerButton.hidden = true;
    scannerButton.setAttribute("aria-pressed","false");
    setEarthActive(false);
  }

  function toggleEarth() {
    const globe = window.LiveEarthScene;
    if (!globe) {
      const status = document.querySelector("#status");
      if (status) {
        status.hidden = false;
        status.textContent = "Earth is still preparing. Please try again in a moment.";
        setTimeout(() => { if (status.textContent.startsWith("Earth is still preparing")) status.hidden = true; }, 2200);
      }
      return;
    }
    if (globe.isUnlocked()) {
      closeEarthMode();
    } else {
      globe.unlock();
      controls.hidden = false;
      scannerButton.hidden = false;
      scannerButton.setAttribute("aria-pressed","false");
      syncQualityFromGlobe();
      setEarthActive(true);
    }
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const earthButton = target?.closest(earthSelector);
    if (earthButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.LiveEarthSkyViews?.close();
      toggleEarth();
      return;
    }
    // Location and Stacks are independent global orbs. Their clicks must not
    // force Explorer back to Home; only the Earth Orb exits Explorer.
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && window.LiveEarthScene?.isUnlocked()) closeEarthMode();
  });
  window.addEventListener("live-earth-quality-change", syncQualityFromGlobe);
})();
