/* LIVE // EARTH — additive Sky View artwork/UI layer.
   Intended to load AFTER sky-views.js. Does not modify Home scene or orb source markup. */
(() => {
  "use strict";
  if (window.__liveEarthSkyAdaptiveLayer) return;
  window.__liveEarthSkyAdaptiveLayer = true;

  const css = `
  /* The existing Sky View remains the only primary-view overlay. */
  #le-sky-view { z-index: 8; isolation: isolate; }
  #le-sky-view .le-sky-bg {
    background-color: #061326;
    background-image: var(--le-sky-art);
    background-position: center center;
    background-size: cover;
    background-repeat: no-repeat;
  }
  #le-sky-view[data-view="sun"] { --le-sky-art: url("./sun-sky-background-responsive.svg"); }
  #le-sky-view[data-view="moon"] { --le-sky-art: url("./moon-sky-background-responsive.svg"); }
  #le-sky-view .le-stars,
  #le-sky-view .le-sky-haze,
  #le-sky-view .le-mountain,
  #le-sky-view .le-water { display: none !important; }

  /* Preserve the global orb dock above the Sky View without changing its geometry. */
  #navButtons { z-index: 10 !important; pointer-events: auto !important; }
  #navButtons .orbButton { pointer-events: auto !important; }

  /* Remove the tray's glass card. Each existing data group receives its own anchor. */
  #le-sky-view .le-data {
    position: static !important;
    display: contents !important;
    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    padding: 0 !important;
  }
  #le-sky-view .le-data-top {
    position: absolute;
    z-index: 4;
    top: calc(env(safe-area-inset-top) + 112px);
    left: 24px;
    right: 24px;
    display: block;
    pointer-events: none;
  }
  #le-sky-view .le-event-label {
    font-size: 10px;
    letter-spacing: .18em;
    text-shadow: 0 1px 8px #000a;
  }
  #le-sky-view .le-event-time {
    font-size: clamp(18px, 2.6vw, 25px);
    text-shadow: 0 1px 10px #000b;
  }
  #le-sky-view .le-live {
    position: absolute;
    right: 0;
    top: 0;
    pointer-events: auto;
  }
  #le-sky-view .le-metrics {
    position: absolute;
    z-index: 4;
    left: 24px;
    right: 24px;
    bottom: calc(env(safe-area-inset-bottom) + 154px);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 20px;
    margin: 0 !important;
    pointer-events: none;
    text-shadow: 0 1px 8px #000c;
  }
  #le-sky-view .le-metric {
    border: 0 !important;
    padding: 0 !important;
    min-width: 0;
  }
  #le-sky-view .le-metric small { font-size: 9px; }
  #le-sky-view .le-metric strong { font-size: clamp(12px, 1.8vw, 15px); }
  #le-sky-view .le-timeline {
    position: absolute;
    z-index: 5;
    left: 24px;
    right: 24px;
    bottom: calc(env(safe-area-inset-bottom) + 102px);
    margin: 0 !important;
    padding: 0;
  }
  #le-sky-view .le-time-labels { margin-bottom: 5px; text-shadow: 0 1px 8px #000c; }
  #le-sky-view input[type=range] { pointer-events: auto; }
  #le-sky-view .le-time-current {
    margin-top: 4px;
    text-shadow: 0 1px 8px #000c;
  }
  #le-sky-view .le-error {
    position: absolute;
    z-index: 4;
    left: 24px;
    right: 24px;
    bottom: calc(env(safe-area-inset-bottom) + 188px);
    text-align: center;
    text-shadow: 0 1px 8px #000c;
    pointer-events: none;
  }
  #le-sky-view .le-footer {
    bottom: calc(env(safe-area-inset-bottom) + 78px);
    pointer-events: none;
  }
  #le-sky-view .le-head { z-index: 6; }
  #le-sky-view .le-position { z-index: 2; }
  @media (min-width: 700px) {
    #le-sky-view .le-head { left: clamp(28px, 5vw, 72px); right: clamp(28px, 5vw, 72px); }
    #le-sky-view .le-data-top { left: clamp(28px, 5vw, 72px); right: clamp(28px, 5vw, 72px); }
    #le-sky-view .le-position { inset: 13% 18% 24%; }
    #le-sky-view .le-metrics { left: 18%; right: 18%; bottom: 130px; }
    #le-sky-view .le-timeline { left: 18%; right: 18%; bottom: 72px; }
    #le-sky-view .le-error { left: 18%; right: 18%; bottom: 166px; }
    #le-sky-view .le-footer { bottom: 32px; }
  }
  @media (orientation: landscape) and (max-height: 600px) {
    #le-sky-view .le-head { top: calc(env(safe-area-inset-top) + 10px); }
    #le-sky-view .le-title { font-size: clamp(20px, 4vh, 29px); }
    #le-sky-view .le-subtitle { font-size: 9px; }
    #le-sky-view .le-position { inset: 10% 30% 17%; }
    #le-sky-view .le-data-top { top: calc(env(safe-area-inset-top) + 78px); left: 20px; }
    #le-sky-view .le-metrics { left: 20px; right: 20px; bottom: 84px; justify-content: flex-end; }
    #le-sky-view .le-timeline { left: 20px; right: 20px; bottom: 18px; }
    #le-sky-view .le-error, #le-sky-view .le-footer { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    #le-sky-view * { scroll-behavior: auto !important; }
  }`;
  const style = document.createElement("style");
  style.id = "le-sky-adaptive-layer-style";
  style.textContent = css;
  document.head.appendChild(style);

  function syncView() {
    const root = document.getElementById("le-sky-view");
    const title = root?.querySelector(".le-title")?.textContent || "";
    if (!root || root.hidden) {
      root?.removeAttribute("data-view");
      return;
    }
    const view = title.toLowerCase().includes("moon") ? "moon" :
                 title.toLowerCase().includes("sun") ? "sun" : "";
    if (view) root.dataset.view = view;
  }
  const observer = new MutationObserver(syncView);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  document.addEventListener("click", event => {
    if (event.target?.closest?.(".orbButton[data-view='sun'], .orbButton[data-view='moon']")) {
      requestAnimationFrame(syncView);
      requestAnimationFrame(() => requestAnimationFrame(syncView));
    }
  }, true);
  window.addEventListener("resize", syncView, { passive: true });
  window.visualViewport?.addEventListener("resize", syncView, { passive: true });
  syncView();
})();