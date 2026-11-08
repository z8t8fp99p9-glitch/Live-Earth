/* LIVE // EARTH — Global Primary View Manager.
   Single source of truth: Home, independent Earth View, Moon View, or Sun View. */
(() => {
  "use strict";
  if (window.__liveEarthViewManagerInstalled) return;
  window.__liveEarthViewManagerInstalled = true;

  const supported = new Set(["home", "earth", "moon", "sun"]);
  // Compatibility adapter for the existing Orb controller and saved feature return paths.
  const normalizeView = view => view === "explorer" ? "earth" : view;
  let activeView = "home";
  let switching = false;

  function paintPrimaryOrbs(view) {
    const activeOrb = view === "home" ? null : view;
    document.querySelectorAll('.orbButton[data-view="earth"], .orbButton[data-view="moon"], .orbButton[data-view="sun"]')
      .forEach(button => {
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
    const normalized = normalizeView(requested);
    if (!supported.has(normalized) || switching) return activeView;
    const next = normalized === activeView ? "home" : normalized;
    if (next === activeView) return activeView;
    switching = true;
    const previous = activeView;
    activeView = next;
    window.dispatchEvent(new CustomEvent("live-earth-primary-view-change", { detail: { view: next, previous } }));
    paintPrimaryOrbs(next);
    window.dispatchEvent(new CustomEvent("live-earth-primary-view-state", { detail: { view: next, previous } }));
    switching = false;
    return activeView;
  }

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('.orbButton[data-view]');
    if (!button) return;
    const id = button.dataset.view;
    if (id === "earth" || id === "sun" || id === "moon") {
      event.preventDefault();
      event.stopImmediatePropagation();
      requestView(id);
    }
  }, true);

  paintPrimaryOrbs(activeView);
  window.LiveEarthViewManager = Object.freeze({
    requestView,
    // getActiveView keeps the legacy "explorer" label visible to the protected
    // Orb controller; events and module registration use canonical "earth".
    getActiveView: () => activeView === "earth" ? "explorer" : activeView,
    getCanonicalActiveView: () => activeView,
    isActive: view => activeView === normalizeView(view)
  });
})();
