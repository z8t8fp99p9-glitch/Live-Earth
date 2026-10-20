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
    .le-quality-button {
      min-width:94px; padding:10px 16px; border-radius:999px;
      border:1px solid rgba(197,230,255,.24); color:#cfe8f8;
      background:rgba(255,255,255,.045); font:650 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing:.09em; text-transform:uppercase; -webkit-tap-highlight-color:transparent;
    }
    .le-quality-button[aria-pressed="true"]{
      color:#f5fcff; border-color:rgba(153,226,255,.8);
      background:linear-gradient(135deg,rgba(102,204,255,.25),rgba(255,255,255,.1));
      box-shadow:inset 1px 1px 2px #ffffff50,0 0 14px rgba(71,187,255,.22);
    }
    .le-quality-button:active{transform:scale(.97)}
    @media(max-height:560px){
      #le-quality-controls{bottom:calc(env(safe-area-inset-bottom) + 100px)}
      .le-quality-button{min-width:78px;padding:8px 12px}
    }
    @media(prefers-reduced-motion:reduce){#le-quality-controls,.le-quality-button{transition:none!important}}

    /* Explicit active glow: the legacy controller deliberately marks Earth inactive. */
    .orbButton[data-view="earth"].le-earth-exploration-active .orbShell{
      filter:brightness(1.08) saturate(1.12) drop-shadow(0 0 10px rgba(55,205,255,.92))!important;
      border-color:rgba(225,250,255,.98)!important;
      box-shadow:inset 1px 1px 3px rgba(255,255,255,.72),inset -2px -3px 5px rgba(0,0,0,.52),
        0 0 0 2px rgba(90,220,255,.58),0 0 18px rgba(35,195,255,.88),0 0 30px rgba(35,145,255,.48)!important;
    }
    .orbButton[data-view="earth"].le-earth-exploration-active .orbShine{opacity:.58!important}
  `;
  document.head.appendChild(style);

  const controls = document.createElement("div");
  controls.id = "le-quality-controls";
  controls.hidden = true;
  controls.setAttribute("role","group");
  controls.setAttribute("aria-label","Earth globe quality");
  controls.innerHTML = `
    <button type="button" class="le-quality-button" data-quality="basic" aria-pressed="true">Basic</button>
    <button type="button" class="le-quality-button" data-quality="hd" aria-pressed="false">HD</button>`;
  document.body.appendChild(controls);

  const qualityButtons = [...controls.querySelectorAll("[data-quality]")];
  function paintQuality(value) {
    qualityButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.quality === value)));
  }

  function setEarthActive(active) {
    const button = document.querySelector(earthSelector);
    if (!button) return;
    // The legacy orb controller paints Earth as inactive in Home mode. Keep
    // its own handlers intact and add an explicit mode state for this feature.
    button.classList.toggle("le-earth-exploration-active", active);
    button.setAttribute("aria-expanded", String(active));
    button.setAttribute("data-earth-exploration", String(active));
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
      paintQuality("basic");
      setEarthActive(true);
    }
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const earthButton = target?.closest(earthSelector);
    if (earthButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleEarth();
      return;
    }
    const otherOrb = target?.closest('.orbButton[data-view]:not([data-view="earth"])');
    if (otherOrb && window.LiveEarthScene?.isUnlocked()) closeEarthMode();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && window.LiveEarthScene?.isUnlocked()) closeEarthMode();
  });
})();
