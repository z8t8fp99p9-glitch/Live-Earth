/* LIVE // EARTH — dedicated cinematic Sun/Moon background views.
   Additive layer: preserves the Home canvas, orb geometry, and existing global orb styling. */
(() => {
  "use strict";
  if (window.__liveEarthSkyViewController) return;
  window.__liveEarthSkyViewController = true;

  const css = `
    #le-sky-view {
      position: fixed;
      inset: 0;
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
    #le-sky-view[data-view="moon"] .le-sky-bg {
      background-image: url("./moon-sky-background-responsive.svg");
    }
    #le-sky-view[data-view="sun"] .le-sky-bg {
      background-image: url("./sun-sky-background-responsive.svg");
    }
    #le-sky-view .le-sky-close {
      position: absolute;
      z-index: 2;
      top: calc(env(safe-area-inset-top) + 14px);
      right: calc(env(safe-area-inset-right) + 14px);
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      padding: 0 0 2px;
      border: 1px solid rgba(225, 242, 255, .28);
      border-radius: 50%;
      background: rgba(3, 12, 27, .30);
      color: rgba(244, 250, 255, .84);
      font: 300 25px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      opacity: .74;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    #le-sky-view .le-sky-close:active { opacity: 1; }
    #le-sky-view .le-sky-close:focus-visible {
      outline: 2px solid #b8e5ff;
      outline-offset: 3px;
    }
    body.le-sky-view-open #navButtons {
      z-index: 10 !important;
      pointer-events: auto !important;
    }
    body.le-sky-view-open #navButtons .orbButton {
      pointer-events: auto !important;
    }
    @media (orientation: landscape) {
      #le-sky-view .le-sky-bg { background-position: center center; }
      #le-sky-view .le-sky-close {
        top: calc(env(safe-area-inset-top) + 10px);
        right: calc(env(safe-area-inset-right) + 14px);
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
  root.innerHTML = `
    <div class="le-sky-bg" aria-hidden="true"></div>
    <button class="le-sky-close" type="button" aria-label="Close Sky View" title="Close Sky View">×</button>
  `;
  document.body.appendChild(root);

  const closeButton = root.querySelector(".le-sky-close");
  let activeView = null;
  let previousBodyOverflow = "";

  function setSkyOrbState(view) {
    // Sun and Moon share the global pressed/glow styling already in index.html.
    // Leave the independent Location and Stacks states alone.
    document.querySelectorAll('.orbButton[data-view="earth"], .orbButton[data-view="sun"], .orbButton[data-view="moon"]')
      .forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
  }

  function open(view) {
    if (view !== "sun" && view !== "moon") return;
    if (!activeView) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeView = view;
    root.dataset.view = view;
    root.setAttribute("aria-label", view === "moon" ? "Moon View" : "Sun View");
    root.setAttribute("aria-hidden", "false");
    root.hidden = false;
    document.body.classList.add("le-sky-view-open");
    setSkyOrbState(view);
    window.dispatchEvent(new CustomEvent("live-earth-sky-view", {
      detail: { active: view }
    }));
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
    setSkyOrbState(null);
    window.dispatchEvent(new CustomEvent("live-earth-sky-view", {
      detail: { active: null, closed: closedView }
    }));
  }

  closeButton.addEventListener("click", close);

  // Capture the click before the existing placeholder handler can reset the
  // Sun/Moon selection. Other orbs still close this view and run normally.
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('.orbButton[data-view]');
    if (!button) return;

    const id = button.dataset.view;
    if (id === "sun" || id === "moon") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (activeView === id) close();
      else open(id);
      return;
    }
    if (activeView) close();
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && activeView) close();
  });

  window.addEventListener("pagehide", close, { once: true });

  window.LiveEarthSkyViews = Object.freeze({
    open,
    close,
    isOpen: () => activeView !== null,
    getActive: () => activeView
  });
})();
