/* LIVE // EARTH — shared view lifecycle + Global Feature Orb Contract.
   Based on the V87 registry. The protected Home scene and the five Home Orbs
   are never resized or reframed. Feature-view UI is additive and uses this
   already-loaded file so the existing app shell and offline asset list stay intact. */
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

  // -------------------------------------------------------------------------
  // Global Feature Orb Contract
  // Main Home stays at five Orbs. A Stacks feature temporarily uses three:
  // [active feature toggle] [Location toggle] [Stacks library].
  // -------------------------------------------------------------------------
  function installFeatureViews() {
    if (window.LiveEarthFeatureViews || !document.getElementById("navButtons")) return;

    const catalog = new Map();
    let activeFeature = null;
    let libraryOpen = false;
    let returnView = window.LiveEarthViewManager?.getActiveView?.() || "home";
    const mainNav = document.getElementById("navButtons");
    const originalLocationButton = mainNav.querySelector('.orbButton[data-view="location"]');
    const originalStacksButton = mainNav.querySelector('.orbButton[data-view="stacks"]');

    const css = document.createElement("style");
    css.id = "le-feature-orb-contract-style";
    css.textContent = `
      #navButtons[hidden]{display:none!important}
      #le-feature-stage{position:fixed;inset:0;z-index:5;display:grid;place-items:center;padding:calc(env(safe-area-inset-top) + 66px) 18px calc(env(safe-area-inset-bottom) + 124px);background:radial-gradient(ellipse at 50% 36%,rgba(12,34,54,.32),rgba(2,5,11,.24) 70%);color:#eaf5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:pan-y;overflow:auto}
      #le-feature-stage[hidden],#le-feature-library[hidden],#le-feature-dock[hidden]{display:none!important}
      .le-feature-stage-card{width:min(88vw,430px);padding:clamp(18px,5vw,28px);border:1px solid rgba(170,220,255,.24);border-radius:24px;background:linear-gradient(145deg,rgba(9,23,38,.88),rgba(3,8,16,.86));box-shadow:inset 1px 1px 2px rgba(255,255,255,.12),0 14px 42px rgba(0,0,0,.45),0 0 26px rgba(62,172,255,.09);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);text-align:center;pointer-events:none}
      .le-feature-stage-symbol{display:grid;place-items:center;width:clamp(68px,19vw,96px);aspect-ratio:1;margin:0 auto 14px;border:1px solid rgba(210,240,255,.42);border-radius:50%;background:radial-gradient(circle at 32% 22%,rgba(255,255,255,.32),rgba(90,150,200,.12) 46%,rgba(0,7,18,.86));box-shadow:inset 2px 2px 6px rgba(255,255,255,.22),inset -4px -5px 10px rgba(0,0,0,.72),0 0 22px rgba(82,190,255,.16);font-size:clamp(34px,9vw,48px)}
      .le-feature-stage-title{margin:0 0 8px;font-weight:750;font-size:clamp(21px,5.3vw,29px);letter-spacing:.015em}
      .le-feature-stage-description{margin:0 auto;max-width:34em;color:#bfd1e2;font-size:13px;line-height:1.55}
      .le-feature-stage-status{margin:15px 0 0;color:#8eb2cb;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
      #le-feature-dock{position:fixed;z-index:9;left:50%;bottom:clamp(32px,9vmin,48px);transform:translateX(-50%);width:min(82vw,330px);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;gap:clamp(7px,2vw,14px);pointer-events:auto}
      #le-feature-dock .orbButton{min-width:0}
      #le-feature-dock .orbShell{width:clamp(52px,15vw,72px);display:grid;place-items:center;overflow:hidden}
      #le-feature-dock .orbImage{width:100%;height:100%;object-fit:cover}
      .le-feature-symbol{position:absolute;inset:0;display:grid;place-items:center;font-size:clamp(25px,7vw,36px);line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7));pointer-events:none}
      .le-feature-orb[data-feature="clouds"] .orbShell,.le-feature-library-item[data-feature="clouds"] .orbShell,.le-feature-stage[data-feature="clouds"] .le-feature-stage-symbol{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #001329aa,0 0 18px #9ccfff55,0 5px 10px #000a}
      .le-feature-orb[data-feature="weather"] .orbShell,.le-feature-library-item[data-feature="weather"] .orbShell,.le-feature-stage[data-feature="weather"] .le-feature-stage-symbol{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #001329aa,0 0 18px #45b8ff66,0 5px 10px #000a}
      .le-feature-orb[data-feature="alien-world"] .orbShell,.le-feature-library-item[data-feature="alien-world"] .orbShell,.le-feature-stage[data-feature="alien-world"] .le-feature-stage-symbol{box-shadow:inset 2px 2px 5px #e8fff866,inset -3px -4px 8px #081029aa,0 0 20px #a57aff66,0 5px 10px #000a}
      .le-feature-orb[data-feature="elevation"] .orbShell,.le-feature-library-item[data-feature="elevation"] .orbShell,.le-feature-stage[data-feature="elevation"] .le-feature-stage-symbol{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #111b0aaa,0 0 18px #6cce9c55,0 5px 10px #000a}
      .le-feature-orb[data-feature="earthquakes"] .orbShell,.le-feature-library-item[data-feature="earthquakes"] .orbShell,.le-feature-stage[data-feature="earthquakes"] .le-feature-stage-symbol{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #241007aa,0 0 18px #ff9b5c55,0 5px 10px #000a}
      .le-feature-orb[data-feature="traffic"] .orbShell,.le-feature-library-item[data-feature="traffic"] .orbShell,.le-feature-stage[data-feature="traffic"] .le-feature-stage-symbol{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #001d16aa,0 0 18px #58e9bd55,0 5px 10px #000a}
      #le-feature-dock .orbButton[aria-pressed="true"] .orbShell{border-color:rgba(231,250,255,.92);filter:drop-shadow(0 0 8px rgba(109,207,255,.55))}
      #le-feature-dock .orbButton[data-view="location"][aria-pressed="true"] .orbShell{box-shadow:inset 2px 2px 5px #ffdbe866,inset -3px -4px 8px #22000faa,0 0 0 2px #ff676744,0 0 20px #ff264e88}
      #le-feature-dock .orbButton[data-view="stacks"][aria-pressed="true"] .orbShell{box-shadow:inset 2px 2px 5px #d6ffff66,inset -3px -4px 8px #001a22aa,0 0 0 2px #55f5ff33,0 0 20px #00d9ff66}
      #le-feature-library{position:fixed;inset:0;z-index:8;display:grid;place-items:center;pointer-events:none;padding:calc(env(safe-area-inset-top) + 24px) 14px calc(env(safe-area-inset-bottom) + 126px);background:rgba(1,5,12,.58);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaf5ff}
      .le-feature-library-panel{pointer-events:auto;width:min(94vw,560px);max-height:min(68vh,calc(100dvh - 170px));overflow:auto;overscroll-behavior:contain;padding:18px 15px 20px;border:1px solid rgba(170,220,255,.28);border-radius:24px;background:linear-gradient(145deg,rgba(11,26,43,.97),rgba(3,8,16,.98));box-shadow:inset 1px 1px 2px rgba(255,255,255,.12),0 18px 44px rgba(0,0,0,.55),0 0 26px rgba(62,172,255,.1);touch-action:pan-y}
      .le-feature-library-heading{margin:0 0 5px;font-size:20px;letter-spacing:.07em;font-weight:800;text-transform:uppercase}
      .le-feature-library-hint{margin:0 0 17px;color:#98b3ca;font-size:11px;line-height:1.45}
      .le-feature-library-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px 8px}
      .le-feature-library-item{appearance:none;border:0;min-width:0;padding:0 2px 5px;background:transparent;color:#dcecff;display:flex;flex-direction:column;align-items:center;gap:8px;font:600 10px/1.25 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.09em;text-transform:uppercase;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent}
      .le-feature-library-item .orbShell{position:relative;display:grid;place-items:center;width:clamp(55px,16vw,76px);aspect-ratio:1;border-radius:50%;isolation:isolate;border:1px solid rgba(199,235,255,.34);background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(94,149,190,.045) 42%,rgba(0,5,15,.42));box-shadow:inset 2px 2px 5px rgba(255,255,255,.34),inset -3px -4px 8px rgba(0,0,0,.64),3px 4px 9px rgba(0,0,0,.65),-2px -2px 7px rgba(170,225,255,.12);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);transition:transform .2s ease,filter .2s ease;overflow:hidden}
      .le-feature-library-item .orbShell:before{content:"";position:absolute;inset:2%;border-radius:inherit;background:radial-gradient(ellipse at 28% 16%,rgba(255,255,255,.48),transparent 27%),linear-gradient(138deg,rgba(255,255,255,.22),rgba(255,255,255,.035) 27%,transparent 47%,rgba(85,205,255,.06) 76%,rgba(255,255,255,.2));box-shadow:inset 1px 1px 3px rgba(255,255,255,.68),inset -2px -3px 6px rgba(0,0,0,.55);pointer-events:none}
      .le-feature-library-item .orbShell:after{content:"";position:absolute;left:18%;top:8%;width:35%;height:13%;border-radius:50%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.88),rgba(255,255,255,.12),transparent);filter:blur(1.3px);opacity:.88;pointer-events:none}
      .le-feature-library-item .le-feature-symbol{z-index:1}
      .le-feature-library-item[aria-pressed="true"] .orbShell{border-color:rgba(231,250,255,.9);filter:drop-shadow(0 0 10px rgba(95,202,255,.48))}
      .le-feature-library-item small{display:block;max-width:100%;font-size:9px;font-weight:400;letter-spacing:.02em;text-transform:none;color:#7995ae}
      .le-feature-library-item[aria-pressed="true"] small{color:#9ce4ff}
      @media(max-height:560px){#le-feature-library{padding-top:14px;padding-bottom:92px}.le-feature-library-panel{max-height:calc(100dvh - 110px);padding-top:13px}.le-feature-library-grid{gap:10px 6px}.le-feature-library-item .orbShell{width:clamp(42px,10vh,60px)}}
      @media(prefers-reduced-motion:reduce){#le-feature-dock *,#le-feature-library *{transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(css);

    const stage = document.createElement("section");
    stage.id = "le-feature-stage";
    stage.hidden = true;
    stage.setAttribute("role", "region");
    stage.setAttribute("aria-live", "polite");
    stage.innerHTML = `<div class="le-feature-stage-card"><div class="le-feature-stage-symbol" aria-hidden="true"></div><h1 class="le-feature-stage-title"></h1><p class="le-feature-stage-description"></p><p class="le-feature-stage-status">Preview shell · data layer not connected</p></div>`;
    document.body.appendChild(stage);

    const dock = document.createElement("nav");
    dock.id = "le-feature-dock";
    dock.hidden = true;
    dock.setAttribute("aria-label", "Active feature controls");
    document.body.appendChild(dock);

    const library = document.createElement("section");
    library.id = "le-feature-library";
    library.hidden = true;
    library.setAttribute("role", "dialog");
    library.setAttribute("aria-modal", "false");
    library.setAttribute("aria-label", "Stacks feature library");
    library.innerHTML = `<div class="le-feature-library-panel"><h2 class="le-feature-library-heading">Stacks</h2><p class="le-feature-library-hint">Choose a feature Orb. Selecting another feature closes the current view before opening the next.</p><div class="le-feature-library-grid"></div></div>`;
    document.body.appendChild(library);

    const stageSymbol = stage.querySelector(".le-feature-stage-symbol");
    const stageTitle = stage.querySelector(".le-feature-stage-title");
    const stageDescription = stage.querySelector(".le-feature-stage-description");
    const stageStatus = stage.querySelector(".le-feature-stage-status");
    const libraryGrid = library.querySelector(".le-feature-library-grid");
    let locationEnabled = typeof window.liveEarthLocationAllowed === "function" ? window.liveEarthLocationAllowed() : false;

    function emitChange(next, previous, phase, extra = {}) {
      window.dispatchEvent(new CustomEvent("live-earth-feature-view-change", {
        detail: { view: next, previous, phase, returnView, ...extra }
      }));
    }

    function safeHook(callback, ...args) {
      if (typeof callback !== "function") return;
      try { callback(...args); }
      catch (error) {
        console.error(`[LIVE // EARTH] Feature lifecycle failed: ${error?.message || error}`, error);
        window.dispatchEvent(new CustomEvent("live-earth-feature-view-error", {
          detail: { error, feature: activeFeature }
        }));
      }
    }

    function orbMarkup(feature, compact = false) {
      const symbol = feature.symbol || "✦";
      return `<span class="orbShell"><span class="le-feature-symbol" aria-hidden="true">${symbol}</span><span class="orbShine" aria-hidden="true"></span></span>`;
    }

    function makeDockButton({ id, label, symbol, image, ariaLabel, pressed = false, className = "" }) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `orbButton ${className}`.trim();
      button.dataset.view = id;
      if (id !== "location" && id !== "stacks") button.dataset.feature = id;
      button.setAttribute("aria-label", ariaLabel || label);
      button.setAttribute("aria-pressed", String(pressed));
      const shell = document.createElement("span");
      shell.className = "orbShell";
      if (image) {
        const img = document.createElement("img");
        img.className = "orbImage";
        img.src = image;
        img.alt = "";
        img.draggable = false;
        shell.appendChild(img);
      } else {
        const glyph = document.createElement("span");
        glyph.className = "le-feature-symbol";
        glyph.setAttribute("aria-hidden", "true");
        glyph.textContent = symbol || "✦";
        shell.appendChild(glyph);
      }
      const shine = document.createElement("span");
      shine.className = "orbShine";
      shine.setAttribute("aria-hidden", "true");
      shell.appendChild(shine);
      const text = document.createElement("span");
      text.className = "orbLabel";
      text.textContent = label;
      button.append(shell, text);
      return button;
    }

    function syncMainButtons() {
      if (originalStacksButton) originalStacksButton.setAttribute("aria-pressed", String(libraryOpen));
      if (originalLocationButton) {
        originalLocationButton.setAttribute("aria-pressed", String(locationEnabled));
        originalLocationButton.setAttribute("aria-label", locationEnabled ? "Location ON — tap to turn off" : "Location OFF — tap to turn on");
      }
    }

    function updateDock() {
      dock.replaceChildren();
      if (!activeFeature) return;
      const feature = catalog.get(activeFeature);
      if (!feature) return;
      const featureButton = makeDockButton({
        id: feature.id, label: feature.shortLabel || feature.title, symbol: feature.symbol,
        ariaLabel: `${feature.title} view — tap to close`, pressed: true, className: "le-feature-orb"
      });
      featureButton.dataset.feature = feature.id;
      featureButton.addEventListener("click", () => closeActiveFeature("orb-toggle"));
      const locationButton = makeDockButton({
        id: "location", label: "Location", image: "./location.webp",
        ariaLabel: locationEnabled ? "Location ON — tap to turn off" : "Location OFF — tap to turn on",
        pressed: locationEnabled
      });
      locationButton.addEventListener("click", () => {
        if (originalLocationButton) originalLocationButton.click();
        locationEnabled = typeof window.liveEarthLocationAllowed === "function" ? window.liveEarthLocationAllowed() : !locationEnabled;
        updateDock();
        syncMainButtons();
      });
      const stacksButton = makeDockButton({
        id: "stacks", label: "Stacks", image: "./stacks.webp",
        ariaLabel: libraryOpen ? "Stacks library open — tap to close" : "Open Stacks feature library",
        pressed: libraryOpen
      });
      stacksButton.addEventListener("click", toggleLibrary);
      dock.append(featureButton, locationButton, stacksButton);
    }

    function updateStage() {
      if (!activeFeature) {
        stage.hidden = true;
        stage.removeAttribute("data-feature");
        return;
      }
      const feature = catalog.get(activeFeature);
      if (!feature) return;
      stage.dataset.feature = feature.id;
      stageSymbol.textContent = feature.symbol || "✦";
      stageTitle.textContent = feature.title;
      stageDescription.textContent = feature.description || "This feature view is registered and ready for its own content.";
      stageStatus.textContent = feature.connected ? "Feature integration connected" : "Preview shell · data layer not connected";
      stage.hidden = false;
    }

    function renderLibrary() {
      libraryGrid.replaceChildren();
      for (const feature of catalog.values()) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "le-feature-library-item";
        item.dataset.feature = feature.id;
        item.setAttribute("aria-pressed", String(activeFeature === feature.id));
        item.setAttribute("aria-label", `${feature.title}${activeFeature === feature.id ? ", active, tap to close" : ", tap to open"}`);
        const shell = document.createElement("span");
        shell.className = "orbShell";
        const glyph = document.createElement("span");
        glyph.className = "le-feature-symbol";
        glyph.setAttribute("aria-hidden", "true");
        glyph.textContent = feature.symbol || "✦";
        shell.appendChild(glyph);
        const label = document.createElement("span");
        label.textContent = feature.title;
        const detail = document.createElement("small");
        detail.textContent = feature.connected ? "Ready" : "View preview";
        item.append(shell, label, detail);
        item.addEventListener("click", () => {
          if (activeFeature === feature.id) closeActiveFeature("library-toggle");
          else activateFeature(feature.id, "stacks");
        });
        libraryGrid.appendChild(item);
      }
    }

    function toggleLibrary() {
      libraryOpen = !libraryOpen;
      library.hidden = !libraryOpen;
      if (libraryOpen) renderLibrary();
      if (activeFeature) updateDock();
      syncMainButtons();
      window.dispatchEvent(new CustomEvent("live-earth-stacks-library-change", {
        detail: { open: libraryOpen, activeFeature }
      }));
    }

    function activateFeature(id, source = "stacks") {
      const nextFeature = catalog.get(id);
      if (!nextFeature) return false;
      if (activeFeature === id) {
        closeActiveFeature("same-feature-selected");
        return true;
      }
      const previous = activeFeature;
      const previousFeature = previous ? catalog.get(previous) : null;

      // Mandatory order: outgoing feature is deactivated and cleaned before the next activates.
      if (previousFeature) safeHook(previousFeature.deactivate, id, source);
      if (!previous) returnView = window.LiveEarthViewManager?.getActiveView?.() || "home";
      activeFeature = id;
      libraryOpen = false;
      library.hidden = true;
      mainNav.hidden = true;
      mainNav.setAttribute("aria-hidden", "true");
      dock.hidden = false;
      document.body.classList.add("le-feature-view-active");
      updateStage();
      updateDock();
      syncMainButtons();
      safeHook(nextFeature.activate, previous, source);
      emitChange(id, previous, "activate", { source, returnView });
      if (libraryGrid.childElementCount) renderLibrary();
      return true;
    }

    function closeActiveFeature(reason = "close") {
      if (!activeFeature) {
        if (libraryOpen) toggleLibrary();
        return false;
      }
      const previous = activeFeature;
      const previousFeature = catalog.get(previous);
      // Cleanup happens before restoring the base view and its original five controls.
      if (previousFeature) safeHook(previousFeature.deactivate, null, reason);
      activeFeature = null;
      libraryOpen = false;
      library.hidden = true;
      dock.hidden = true;
      stage.hidden = true;
      stage.removeAttribute("data-feature");
      mainNav.hidden = false;
      mainNav.removeAttribute("aria-hidden");
      document.body.classList.remove("le-feature-view-active");
      syncMainButtons();
      emitChange(null, previous, "deactivate", { reason, returnView });
      return true;
    }

    function onMainNavCapture(event) {
      const target = event.target instanceof Element ? event.target : null;
      const stacksButton = target?.closest('#navButtons .orbButton[data-view="stacks"]');
      if (!stacksButton) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleLibrary();
    }

    // The capture handler runs before the legacy button's direct click listener,
    // so Stacks has one owner rather than two competing panels.
    document.addEventListener("click", onMainNavCapture, true);
    window.addEventListener("live-earth-location-state", event => {
      locationEnabled = !!event.detail?.enabled;
      updateDock();
      syncMainButtons();
    });
    window.addEventListener("live-earth-primary-view-change", () => {
      if (!activeFeature) return;
      // Keep the feature overlay from leaking stale primary-view controls if another
      // app subsystem legitimately changes the underlying primary view.
      returnView = window.LiveEarthViewManager?.getActiveView?.() || returnView;
    });
    window.addEventListener("pagehide", () => {
      if (activeFeature) safeHook(catalog.get(activeFeature)?.deactivate, null, "pagehide");
    }, { once: true });

    const api = {
      register(feature, options = {}) {
        if (!feature || typeof feature !== "string" || !feature.trim()) throw new TypeError("A feature view needs a stable id.");
        const id = feature.trim();
        const existing = catalog.get(id);
        const entry = {
          id,
          title: String(options.title || existing?.title || id),
          shortLabel: String(options.shortLabel || existing?.shortLabel || options.title || existing?.title || id),
          symbol: String(options.symbol || existing?.symbol || "✦"),
          description: String(options.description || existing?.description || "This feature view is registered and ready for its own content."),
          connected: options.connected === true || existing?.connected === true,
          activate: options.activate || existing?.activate,
          deactivate: options.deactivate || existing?.deactivate
        };
        catalog.set(id, entry);
        if (activeFeature === id) { updateStage(); updateDock(); }
        if (libraryOpen) renderLibrary();
        return Object.freeze({ id, unregister: () => api.unregister(id) });
      },
      unregister(id) {
        if (!catalog.has(id)) return false;
        if (activeFeature === id) closeActiveFeature("unregister");
        catalog.delete(id);
        if (libraryOpen) renderLibrary();
        return true;
      },
      open: (id, source = "api") => activateFeature(id, source),
      close: closeActiveFeature,
      toggleLibrary,
      getActive: () => activeFeature,
      getReturnView: () => returnView,
      isLibraryOpen: () => libraryOpen,
      list: () => [...catalog.values()].map(({ id, title, shortLabel, symbol, description, connected }) => ({ id, title, shortLabel, symbol, description, connected, active: id === activeFeature })),
      getActiveView: () => activeFeature,
      isActive: id => activeFeature === id
    };
    window.LiveEarthFeatureViews = Object.freeze(api);

    // Default Orb identities are deliberate temporary looks; custom art comes later.
    [
      { id: "clouds", title: "Clouds", shortLabel: "Clouds", symbol: "☁", description: "Cloud-view shell. The cloud data layer is not connected yet." },
      { id: "weather", title: "Weather", shortLabel: "Weather", symbol: "🌦", description: "Weather-view shell. Forecast and live weather data are not connected yet." },
      { id: "alien-world", title: "Alien World", shortLabel: "Alien World", symbol: "🛸", description: "A new world-view shell for testing global feature navigation. Its world content is not connected yet." },
      { id: "elevation", title: "Elevation", shortLabel: "Elevation", symbol: "⛰", description: "Elevation-view shell. The terrain data layer is not connected yet." },
      { id: "earthquakes", title: "Earthquakes", shortLabel: "Quakes", symbol: "〰", description: "Earthquake-view shell. Live earthquake data is not connected yet." },
      { id: "traffic", title: "Traffic", shortLabel: "Traffic", symbol: "↗", description: "Traffic-view shell. The traffic data layer is not connected yet." }
    ].forEach(item => api.register(item.id, item));

    syncMainButtons();
    window.dispatchEvent(new Event("live-earth-feature-views-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installFeatureViews, { once: true });
  } else {
    installFeatureViews();
  }
})();
