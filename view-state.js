/* LIVE // EARTH — V57 independent View State Manager.
   Owns foreground-view identity, contextual options, and global feature flags.
   It does not render or mutate the protected Home scene. */
(() => {
  "use strict";
  if (window.LiveEarthViewState) return;
  let activeView = null; // null = protected Home; Home is not a managed View.
  const options = new Map();
  const features = new Map([["location", false]]);
  const listeners = new Set();

  const snapshot = () => Object.freeze({
    activeView,
    isHome: activeView === null,
    options: Object.freeze(Object.fromEntries(options)),
    features: Object.freeze(Object.fromEntries(features))
  });
  function emit(reason) {
    const state = snapshot();
    window.dispatchEvent(new CustomEvent("live-earth-state-change", {detail:{state,reason}}));
    listeners.forEach(fn => { try { fn(state, reason); } catch (e) { console.error(e); } });
  }
  const api = {
    getState: snapshot,
    enterView(id) {
      if (typeof id !== "string" || !id.trim() || id === "home") return snapshot();
      if (activeView !== id) {
        activeView = id;
        for (const key of options.keys()) options.set(key, false);
        emit("view-enter");
      }
      return snapshot();
    },
    leaveView() {
      if (activeView !== null) { activeView = null; emit("view-exit"); }
      return snapshot();
    },
    toggleOption(id, force) {
      if (typeof id !== "string" || !id.trim()) return false;
      const next = typeof force === "boolean" ? force : !options.get(id);
      if (options.get(id) !== next) { options.set(id,next); emit("option"); }
      return next;
    },
    setFeature(id, enabled) {
      if (typeof id !== "string" || !id.trim()) return false;
      const next = !!enabled;
      if (features.get(id) !== next) { features.set(id,next); emit("feature"); }
      return next;
    },
    isView(id) { return activeView === id; },
    isOptionOpen(id) { return options.get(id) === true; },
    isFeatureOn(id) { return features.get(id) === true; },
    subscribe(fn) { if (typeof fn !== "function") return () => {}; listeners.add(fn); fn(snapshot(),"subscribe"); return () => listeners.delete(fn); }
  };
  window.LiveEarthViewState = Object.freeze(api);
})();
