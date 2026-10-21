/* LIVE // EARTH — Global Primary View Manager.
   Single source of truth: Home, Earth Explorer, Moon View, or Sun View. */
(() => {
  "use strict";
  if (window.__liveEarthViewManagerInstalled) return;
  window.__liveEarthViewManagerInstalled = true;

  const primaryOrbs = [...document.querySelectorAll('.orbButton[data-view="earth"], .orbButton[data-view="moon"], .orbButton[data-view="sun"]')];
  const supported = new Set(["home", "explorer", "moon", "sun"]);
  let activeView = "home";
  let switching = false;

  function paintPrimaryOrbs(view) {
    const activeOrb = view === "explorer" ? "earth" : view === "home" ? null : view;
    primaryOrbs.forEach(button => {
      const active = button.dataset.view === activeOrb;
      button.setAttribute("aria-pressed", String(active));
      if (button.dataset.view === "earth") {
        button.classList.toggle("le-earth-exploration-active", active);
        button.setAttribute("aria-expanded", String(active));
        button.setAttribute("data-earth-exploration", String(active));
      }
    });
  }

  function requestView(requested) {
    if (!supported.has(requested) || switching) return activeView;
    const next = requested === activeView ? "home" : requested;
    if (next === activeView) return activeView;
    switching = true;
    const previous = activeView;
    activeView = next;
    // Controllers synchronously clean up the previous view and activate the
    // next one. State is committed once, not separately in each controller.
    window.dispatchEvent(new CustomEvent("live-earth-primary-view-change", {
      detail: { view: next, previous }
    }));
    paintPrimaryOrbs(next);
    window.dispatchEvent(new CustomEvent("live-earth-primary-view-state", {
      detail: { view: next, previous }
    }));
    switching = false;
    return activeView;
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('.orbButton[data-view]');
    if (!button) return;
    const id = button.dataset.view;
    if (id === "sun" || id === "moon") {
      event.preventDefault();
      event.stopImmediatePropagation();
      requestView(id);
      return;
    }
    // Location and Stacks are global utility orbs, not primary views.
    // Let their existing controllers handle the tap without changing activeView.
  }, true);

  paintPrimaryOrbs(activeView);
  window.LiveEarthViewManager = Object.freeze({
    requestView,
    getActiveView: () => activeView,
    isActive: view => activeView === view
  });
})();
