/* LIVE // EARTH — shared view-module lifecycle registry (V87 phase 1).
   One app, one shared shell, independent view modules. This registry consumes the
   existing primary-view event; it does not render UI or alter the protected Home scene. */
(() => {
  "use strict";
  if (window.LiveEarthViewModules) return;

  const modules = new Map();
  let activeView = window.LiveEarthViewManager?.getActiveView?.() || "home";

  function matches(entry, view) {
    return entry.views.includes(view);
  }

  function safely(callback, ...args) {
    if (typeof callback !== "function") return;
    try { callback(...args); }
    catch (error) {
      console.error(`[LIVE // EARTH] View module lifecycle failed: ${error?.message || error}`, error);
      window.dispatchEvent(new CustomEvent("live-earth-view-module-error", {
        detail: { error, view: activeView }
      }));
    }
  }

  function onPrimaryViewChange(event) {
    const next = event.detail?.view || "home";
    const previous = event.detail?.previous || activeView;
    if (next === activeView) return;

    // Deactivate modules that own the previous view before the next view activates.
    for (const entry of modules.values()) {
      const wasActive = entry.active;
      const shouldBeActive = matches(entry, next);
      if (wasActive && !shouldBeActive) {
        entry.active = false;
        safely(entry.deactivate, previous, next);
      }
    }

    activeView = next;

    for (const entry of modules.values()) {
      const shouldBeActive = matches(entry, next);
      if (!entry.active && shouldBeActive) {
        entry.active = true;
        safely(entry.activate, next, previous);
      } else if (entry.active && shouldBeActive) {
        // A module spanning multiple views (e.g. the shared sky canvas) stays mounted
        // while changing its active mode, rather than tearing down its shared root.
        safely(entry.change, next, previous);
      }
    }
    window.dispatchEvent(new CustomEvent("live-earth-view-modules-changed", {
      detail: { view: next, previous, moduleCount: modules.size }
    }));
  }

  window.addEventListener("live-earth-primary-view-change", onPrimaryViewChange);
  window.__liveEarthViewModuleRegistryInstalled = true;

  window.LiveEarthViewModules = Object.freeze({
    register(id, options = {}) {
      if (typeof id !== "string" || !id.trim()) throw new TypeError("A view module needs a stable id.");
      if (modules.has(id)) return modules.get(id).unregister;
      const views = Array.isArray(options.views) ? [...new Set(options.views.filter(v => typeof v === "string" && v))] : [];
      if (!views.length) throw new TypeError(`View module ${id} must declare at least one view.`);
      const entry = {
        id, views,
        activate: options.activate,
        deactivate: options.deactivate,
        change: options.change,
        active: false,
        unregister: null
      };
      entry.unregister = () => {
        if (!modules.has(id)) return;
        if (entry.active) {
          entry.active = false;
          safely(entry.deactivate, activeView, "home");
        }
        modules.delete(id);
      };
      modules.set(id, entry);
      if (matches(entry, activeView)) {
        entry.active = true;
        safely(entry.activate, activeView, null);
      }
      return entry.unregister;
    },
    getActiveView: () => activeView,
    isActive: view => activeView === view,
    has: id => modules.has(id),
    list: () => [...modules.values()].map(entry => Object.freeze({
      id: entry.id, views: [...entry.views], active: entry.active
    }))
  });
  window.dispatchEvent(new Event("live-earth-view-modules-ready"));
})();
