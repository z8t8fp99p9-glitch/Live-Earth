/* LIVE // EARTH — Global Primary View Manager.
   Single source of truth: Home, Earth Explorer, Moon View, or Sun View. */
(() => {
  "use strict";
  if (window.__liveEarthViewManagerInstalled) return;
  window.__liveEarthViewManagerInstalled = true;

  const supported = new Set(["home", "explorer", "moon", "sun"]);
  let activeView = "home";
  let switching = false;

  function paintPrimaryOrbs(view) {
    const activeOrb = view === "explorer" ? "earth" : view === "home" ? null : view;
    // Query the live buttons each time: orb-controls-v4 replaces the original
    // nodes during startup, so a cached NodeList would become detached.
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
    if (id === "earth" || id === "sun" || id === "moon") {
      event.preventDefault();
      event.stopImmediatePropagation();
      requestView(id === "earth" ? "explorer" : id);
      return;
    }
    // Location and Stacks are independent utilities. They never change activeView.
  }, true);

  // Magazine is a separate peer view. Keep the Alien World and Nature views
  // focused on their own live reports; remove their former embedded issue UI.
  window.addEventListener("live-earth-alien-world-view-change", event => {
    if (!event?.detail?.active) return;
    const root = document.getElementById("le-alien-world-view");
    // Keep the Live Feeds control in place: the publisher client uses it to
    // refresh the live feed after reconnecting. Hide only its Magazine tab.
    const weeklyTab = root?.querySelector('[data-tab="weekly"]');
    if (weeklyTab) weeklyTab.hidden = true;
    root?.querySelector(".le-aw-weekly")?.remove();
  });

  window.addEventListener("live-earth-nature-view-change", event => {
    if (!event?.detail?.active) return;
    const root = document.getElementById("le-nature-view");
    root?.querySelector(".le-nature-tabs")?.remove();
    root?.querySelector(".le-nature-journal")?.remove();
    const reports = root?.querySelector(".le-nature-discover");
    if (reports && !reports.querySelector(".le-nature-section-title")) {
      const heading = document.createElement("h2");
      heading.className = "le-nature-section-title";
      heading.textContent = "Field Reports";
      reports.prepend(heading);
    }
  });

  // Nature's former in-view monthly journal must not load its catalogue or
  // saved-edition list. The Global PDF Reader and all existing saved PDF data
  // remain untouched and available through their normal app entry points.
  window.addEventListener("live-earth-nature-publisher-client-ready", () => {
    const publisher = window.LiveEarthNaturePublisher;
    if (!publisher || publisher.__magazineSectionDisabled) return;
    window.LiveEarthNaturePublisher = Object.freeze({
      ...publisher,
      __magazineSectionDisabled: true,
      loadCatalog: async () => ({ issues: [] }),
      listSavedMagazines: async () => []
    });
  });

  paintPrimaryOrbs(activeView);
  window.LiveEarthViewManager = Object.freeze({
    requestView,
    getActiveView: () => activeView,
    isActive: view => activeView === view
  });
})();
