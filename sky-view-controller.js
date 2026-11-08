/* LIVE // EARTH — shared full-screen Sky View host for independent celestial views.
   The host owns the overlay lifecycle; Earth, Moon and Sun own separate renderers. */
(() => {
  "use strict";
  if (window.__liveEarthSkyViewController) return;
  window.__liveEarthSkyViewController = true;

  const css = `
    #le-sky-view {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      height: 100dvh;
      z-index: 6;
      overflow: hidden;
      background: #061326;
      color: #f3f7ff;
      isolation: isolate;
      touch-action: pan-y;
    }
    #le-sky-view[hidden] { display: none; }
    #le-sky-view .le-sky-bg {
      position: absolute;
      inset: 0;
      background-color: #061326;
      background-position: center center;
      background-size: cover;
      background-repeat: no-repeat;
      pointer-events: none;
    }
    #le-sky-view[data-view="earth"] .le-sky-bg {
      background-image: radial-gradient(ellipse at 50% 48%, #0a1c31 0%, #030914 56%, #010308 100%);
    }
    #le-sky-view[data-view="moon"] .le-sky-bg {
      background-image: url("./moon-sky-background-portrait.webp");
    }
    #le-sky-view[data-view="sun"] .le-sky-bg {
      background-image: url("./sun-sky-background-portrait.webp");
    }
    /* The sky view is its own stage; prevent the Home 3D scene from ghosting through it.
       The five navigation Orbs remain visible and interactive above the stage. */
    body.le-sky-view-open #scene { visibility:hidden !important; }
    body.le-sky-view-open #navButtons {
      z-index: 10 !important;
      pointer-events: auto !important;
    }
    body.le-sky-view-open #navButtons .orbButton {
      pointer-events: auto !important;
    }
    @media (orientation: landscape) {
      #le-sky-view .le-sky-bg { background-position: center center; }
      #le-sky-view[data-view="moon"] .le-sky-bg {
        background-image: url("./moon-sky-background-landscape.webp");
      }
      #le-sky-view[data-view="sun"] .le-sky-bg {
        background-image: url("./sun-sky-background-landscape.webp");
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      #le-sky-view .le-sky-bg { animation: le-sky-enter .28s ease-out both; }
      @keyframes le-sky-enter {
        from { opacity: .75; }
        to { opacity: 1; }
      }
    }
  `;

  const style = document.createElement("style");
  style.id = "le-sky-view-controller-style";
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("section");
  root.id = "le-sky-view";
  root.hidden = true;
  root.setAttribute("aria-label", "Sky View");
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `<div class="le-sky-bg" aria-hidden="true"></div>`;
  document.body.appendChild(root);

  let activeView = null;
  let previousBodyOverflow = "";

  function open(view) {
    if (view !== "earth" && view !== "sun" && view !== "moon") return;
    if (!activeView) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeView = view;
    root.dataset.view = view;
    root.setAttribute("aria-label", view === "moon" ? "Moon View" : view === "sun" ? "Sun View" : "Earth View");
    root.setAttribute("aria-hidden", "false");
    root.hidden = false;
    document.body.classList.add("le-sky-view-open");
    window.dispatchEvent(new CustomEvent("live-earth-sky-view", { detail: { active: view } }));
  }

  function close() {
    if (!activeView) return;
    const closedView = activeView;
    activeView = null;
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    root.removeAttribute("data-view");
    document.body.classList.remove("le-sky-view-open");
    document.body.style.overflow = previousBodyOverflow;
    window.dispatchEvent(new CustomEvent("live-earth-sky-view", { detail: { active: null, closed: closedView } }));
  }

  if (window.LiveEarthViewModules) {
    window.LiveEarthViewModules.register("sky-container", {
      views: ["earth", "sun", "moon"],
      activate: view => open(view),
      deactivate: () => close(),
      change: view => open(view)
    });
  } else {
    window.addEventListener("live-earth-primary-view-change", event => {
      const view = event.detail?.view || "home";
      if (view === "earth" || view === "sun" || view === "moon") open(view);
      else close();
    });
  }

  window.addEventListener("pagehide", close, { once: true });
  window.LiveEarthSkyViews = Object.freeze({
    open,
    close,
    isOpen: () => activeView !== null,
    getActive: () => activeView
  });
  // Controllers that load before the host wait for this signal. This also
  // guarantees registry order: shared host first, independent renderer second.
  window.dispatchEvent(new Event("live-earth-sky-view-ready"));
})();
