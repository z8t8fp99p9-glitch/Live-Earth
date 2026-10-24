/* LIVE // EARTH — V88.4 shared view lifecycle + Stick Stacks rail + Global Orb sizing.
   Built as a draft from the verified main-branch registry baseline. Home/Earth framing stays untouched.
   All Orb size tiers use vmin; scattered feature Orbs are positioned from one full-screen overlay coordinate space. */
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
      /* GLOBAL ORB SIZE STANDARD: all Orb diameters derive from the shorter viewport side (vmin). */
      :root{--le-orb-size-primary:clamp(49px,14.2vmin,76px);--le-orb-size-feature:clamp(44px,12.5vmin,58px);--le-orb-size-dock:clamp(44px,13.5vmin,64px);--le-orb-size-hero:clamp(60px,22vmin,96px)}
      #navButtons[hidden]{display:none!important}
      #navButtons{width:min(94vw,98vmin,520px)!important;gap:clamp(2px,1.2vmin,7px)!important;bottom:calc(env(safe-area-inset-bottom) + clamp(32px,9vmin,48px))!important}
      #navButtons .orbShell{width:var(--le-orb-size-primary)!important}
      /* Landscape moves closer to the bottom; !important wins against the legacy navigation offset. */
      @media(orientation:landscape){#navButtons{bottom:calc(env(safe-area-inset-bottom) + clamp(14px,4vmin,20px))!important}}
      #le-feature-stage{position:fixed;inset:0;z-index:5;display:grid;place-items:center;padding:calc(env(safe-area-inset-top) + 66px) 18px calc(env(safe-area-inset-bottom) + 124px);background:radial-gradient(ellipse at 50% 36%,rgba(12,34,54,.32),rgba(2,5,11,.24) 70%);color:#eaf5ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:pan-y;overflow:auto}
      #le-feature-stage[hidden],#le-feature-library[hidden],#le-feature-dock[hidden]{display:none!important}
      .le-feature-stage-card{width:min(88vw,430px);padding:clamp(18px,5vw,28px);border:1px solid rgba(170,220,255,.24);border-radius:24px;background:linear-gradient(145deg,rgba(9,23,38,.88),rgba(3,8,16,.86));box-shadow:inset 1px 1px 2px rgba(255,255,255,.12),0 14px 42px rgba(0,0,0,.45),0 0 26px rgba(62,172,255,.09);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);text-align:center;pointer-events:none}
      .le-feature-stage-symbol{display:grid;place-items:center;width:var(--le-orb-size-hero);aspect-ratio:1;margin:0 auto 14px;border:1px solid rgba(210,240,255,.42);border-radius:50%;background:radial-gradient(circle at 32% 22%,rgba(255,255,255,.32),rgba(90,150,200,.12) 46%,rgba(0,7,18,.86));box-shadow:inset 2px 2px 6px rgba(255,255,255,.22),inset -4px -5px 10px rgba(0,0,0,.72),0 0 22px rgba(82,190,255,.16);font-size:clamp(34px,9vw,48px)}
      .le-feature-stage-title{margin:0 0 8px;font-weight:750;font-size:clamp(21px,5.3vw,29px);letter-spacing:.015em}
      .le-feature-stage-description{margin:0 auto;max-width:34em;color:#bfd1e2;font-size:13px;line-height:1.55}
      .le-feature-stage-status{margin:15px 0 0;color:#8eb2cb;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
      #le-feature-dock{position:fixed;z-index:9;left:50%;bottom:calc(env(safe-area-inset-bottom) + clamp(24px,8vmin,38px));transform:translateX(-50%);width:min(82vw,74vmin,330px);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end;gap:clamp(5px,1.8vmin,10px);pointer-events:auto}
      @media(orientation:landscape){#le-feature-dock{bottom:calc(env(safe-area-inset-bottom) + clamp(14px,4vmin,22px))}}
      #le-feature-dock .orbButton{min-width:0}
      #le-feature-dock .orbShell{width:var(--le-orb-size-dock)!important;display:grid;place-items:center;overflow:hidden}
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
      /* ORB HUNT: a full-screen transparent field. Each feature button is absolutely positioned
         in this one coordinate space, so the visual orb and its real hitbox travel together. */
      #le-feature-library{position:fixed;inset:0;z-index:8;display:block;pointer-events:none;padding:0;background:transparent;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaf5ff;overflow:hidden}
      .le-feature-library-panel{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;background:transparent;border:0;border-radius:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
      .le-feature-library-head{position:absolute;z-index:1;left:50%;top:calc(env(safe-area-inset-top) + clamp(62px,15vmin,80px));transform:translateX(-50%);width:min(82vw,320px);text-align:center;padding:0 4px;text-shadow:0 2px 12px #000;pointer-events:none}
      .le-feature-library-heading{margin:0 0 4px;text-align:center;font-size:clamp(14px,3.5vmin,18px);letter-spacing:.07em;font-weight:800;text-transform:uppercase;text-shadow:0 2px 12px #000}
      .le-feature-library-hint{margin:0 auto;color:#a8c0d5;font-size:clamp(8px,2.1vmin,10px);line-height:1.35;letter-spacing:.08em;text-transform:uppercase;text-align:center;text-shadow:0 2px 10px #000}
      .le-feature-library-grid{position:absolute;inset:0;pointer-events:none;overflow:hidden}
      .le-feature-library-item{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.22);translate:0 0;opacity:0;pointer-events:auto;appearance:none;-webkit-appearance:none;border:0;width:clamp(78px,23vmin,98px);min-width:0;min-height:44px;padding:4px 2px 6px;background:transparent;color:#e6f3ff;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;font:650 clamp(8px,2.1vmin,10px)/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.065em;text-transform:uppercase;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent;text-shadow:0 2px 9px rgba(0,0,0,.96);transition:left .44s cubic-bezier(.16,.78,.25,1),top .44s cubic-bezier(.16,.78,.25,1),transform .42s cubic-bezier(.16,.78,.25,1),opacity .25s ease;}
      .le-feature-library-item.le-orb-deployed{transform:translate(-50%,-50%) scale(1);opacity:1;animation:le-feature-orb-drift var(--le-orb-float-duration,5s) ease-in-out var(--le-orb-float-delay,0s) infinite alternate}
      .le-feature-library-item.le-orb-collecting{transform:translate(-50%,-50%) scale(.16)!important;opacity:0!important;filter:brightness(1.6) saturate(1.35);animation:none!important;pointer-events:none}
      .le-feature-library-item .orbShell{position:relative;display:grid;place-items:center;width:var(--le-orb-size-feature)!important;aspect-ratio:1;flex:0 0 auto;border-radius:50%;isolation:isolate;border:1px solid rgba(199,235,255,.42);background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(94,149,190,.045) 42%,rgba(0,5,15,.42));box-shadow:inset 2px 2px 5px rgba(255,255,255,.34),inset -3px -4px 8px rgba(0,0,0,.64),3px 4px 9px rgba(0,0,0,.65),-2px -2px 7px rgba(170,225,255,.12);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);overflow:hidden}
      .le-feature-library-item .orbShell:before{content:"";position:absolute;inset:2%;border-radius:inherit;background:radial-gradient(ellipse at 28% 16%,rgba(255,255,255,.48),transparent 27%),linear-gradient(138deg,rgba(255,255,255,.22),rgba(255,255,255,.035) 27%,transparent 47%,rgba(85,205,255,.06) 76%,rgba(255,255,255,.2));box-shadow:inset 1px 1px 3px rgba(255,255,255,.68),inset -2px -3px 6px rgba(0,0,0,.55);pointer-events:none}
      .le-feature-library-item .orbShell:after{content:"";position:absolute;left:18%;top:8%;width:35%;height:13%;border-radius:50%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.88),rgba(255,255,255,.12),transparent);filter:blur(1.3px);opacity:.88;pointer-events:none}
      .le-feature-library-item .le-feature-symbol{z-index:1}
      .le-feature-library-label{display:block;max-width:100%;width:100%;font-size:inherit;line-height:1.2;text-align:center;color:#e6f3ff;text-shadow:0 2px 9px rgba(0,0,0,.98);overflow-wrap:normal}
      .le-feature-library-detail{display:block;margin-top:0;color:#839bb1;font-size:8px;font-weight:400;letter-spacing:.02em;line-height:1.15;text-align:center;text-transform:none;text-shadow:0 2px 9px rgba(0,0,0,.96)}
      .le-feature-library-item[aria-pressed="true"] .orbShell{border-color:rgba(231,250,255,.9);filter:drop-shadow(0 0 10px rgba(95,202,255,.58))}
      .le-feature-library-item[data-feature="clouds"] .orbShell{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #001329aa,0 0 18px #9ccfff55,0 5px 10px #000a}
      .le-feature-library-item[data-feature="weather"] .orbShell{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #001329aa,0 0 18px #45b8ff66,0 5px 10px #000a}
      .le-feature-library-item[data-feature="alien-world"] .orbShell{box-shadow:inset 2px 2px 5px #e8fff866,inset -3px -4px 8px #081029aa,0 0 20px #a57aff66,0 5px 10px #000a}
      .le-feature-library-item[data-feature="elevation"] .orbShell{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #111b0aaa,0 0 18px #6cce9c55,0 5px 10px #000a}
      .le-feature-library-item[data-feature="earthquakes"] .orbShell{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #241007aa,0 0 18px #ff9b5c55,0 5px 10px #000a}
      .le-feature-library-item[data-feature="traffic"] .orbShell{box-shadow:inset 2px 2px 5px #fff8,inset -3px -4px 8px #001d16aa,0 0 18px #58e9bd55,0 5px 10px #000a}
      @keyframes le-feature-orb-drift{from{translate:0 -2px}to{translate:0 3px}}
      @media(orientation:landscape){
        .le-feature-library-head{top:calc(env(safe-area-inset-top) + clamp(26px,8vmin,42px));width:min(55vw,320px)}
        .le-feature-library-item{width:clamp(72px,20vmin,86px);padding:3px 1px 4px;gap:3px;font-size:8px}
        .le-feature-library-detail{font-size:7px}
      }
      @media(max-height:460px){
        .le-feature-library-head{top:calc(env(safe-area-inset-top) + 22px)}
        .le-feature-library-item .orbShell{width:clamp(36px,10vmin,44px)!important}
        .le-feature-library-item{width:clamp(70px,20vmin,82px);font-size:8px;gap:2px}
        .le-feature-library-detail{font-size:7px}
      }
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
    library.innerHTML = `<div class="le-feature-library-panel"><header class="le-feature-library-head"><h2 class="le-feature-library-heading">Stacks</h2><p class="le-feature-library-hint">Find a feature Orb</p></header><div class="le-feature-library-grid"></div></div>`;
    document.body.appendChild(library);

    const stageSymbol = stage.querySelector(".le-feature-stage-symbol");
    const stageTitle = stage.querySelector(".le-feature-stage-title");
    const stageDescription = stage.querySelector(".le-feature-stage-description");
    const stageStatus = stage.querySelector(".le-feature-stage-status");
    const libraryGrid = library.querySelector(".le-feature-library-grid");
    const libraryPanel = library.querySelector(".le-feature-library-panel");
    const libraryHead = library.querySelector(".le-feature-library-head");
    let locationEnabled = typeof window.liveEarthLocationAllowed === "function" ? window.liveEarthLocationAllowed() : false;

    let collectingOrbs = false;
    let collectingTimer = null;

    function getLibraryRect() {
      const rect = libraryGrid?.getBoundingClientRect?.() || library.getBoundingClientRect?.();
      const width = Number(rect?.width) || Number(document.documentElement?.clientWidth) || Number(window.innerWidth) || 0;
      const height = Number(rect?.height) || Number(document.documentElement?.clientHeight) || Number(window.innerHeight) || 0;
      return { left: Number(rect?.left) || 0, top: Number(rect?.top) || 0, width, height };
    }

    function getVisibleStacksAnchor() {
      // Query the live control each time. In Home it is in the five-Orb row;
      // while a feature is active it is the Stacks Orb in the three-Orb dock.
      const mainButton = !mainNav.hidden ? mainNav.querySelector('.orbButton[data-view="stacks"]') : null;
      const dockButton = !dock.hidden ? dock.querySelector('.orbButton[data-view="stacks"]') : null;
      const candidates = [mainButton, dockButton, originalStacksButton];
      const layerRect = getLibraryRect();
      for (const button of candidates) {
        if (typeof button?.getBoundingClientRect !== "function") continue;
        // Anchor to the visible Orb circle, not the taller button that includes its label.
        const shell = button.querySelector?.('.orbShell');
        const rect = (shell || button).getBoundingClientRect();
        if (!Number.isFinite(rect?.left) || !(rect.width > 0) || !(rect.height > 0)) continue;
        return {
          x: rect.left + rect.width / 2 - layerRect.left,
          y: rect.top + rect.height / 2 - layerRect.top,
          rect, layerRect
        };
      }
      return { x: layerRect.width * 0.88, y: layerRect.height - 48, rect: null, layerRect };
    }

    function clampNumber(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getOrbCenterOffsetY(item) {
      // Buttons include the label/caption below the sphere. Compensate for that content
      // so the actual glass Orb (not the taller button's centre) emerges from Stacks.
      const shell = item.querySelector?.('.orbShell');
      const layer = getLibraryRect();
      const shortSide = Math.max(1, Math.min(layer.width, layer.height));
      const landscape = layer.width > layer.height;
      const orbHeight = Number(shell?.offsetHeight) || clampNumber(shortSide * 0.125, 44, 58);
      const itemHeight = Number(item.offsetHeight) || orbHeight + (landscape ? 29 : 33);
      const shellTop = Number(shell?.offsetTop) || 4;
      return shellTop + orbHeight / 2 - itemHeight / 2;
    }

    function getRandomScatterPositions(items) {
      const layer = getLibraryRect();
      const width = layer.width;
      const height = layer.height;
      const shortSide = Math.max(1, Math.min(width, height));
      const landscape = width > height;
      const headRect = libraryHead?.getBoundingClientRect?.();
      const headBottom = Number(headRect?.height) > 0 ? headRect.bottom - layer.top : (landscape ? 66 : 100);
      const visibleNav = !mainNav.hidden ? mainNav : (!dock.hidden ? dock : mainNav);
      const navRect = visibleNav?.getBoundingClientRect?.();
      const navTop = Number(navRect?.height) > 0 ? navRect.top - layer.top : height - (landscape ? 86 : 104);
      const topBound = Math.max(headBottom + Math.max(9, shortSide * 0.025), landscape ? 72 : 112);
      const bottomBound = Math.min(height - 10, navTop - Math.max(8, shortSide * 0.025));
      const fallbackOrb = clampNumber(shortSide * 0.125, 44, 58);
      const fallbackWidth = clampNumber(shortSide * (landscape ? 0.20 : 0.23), landscape ? 72 : 78, landscape ? 86 : 98);
      const dimensions = items.map(item => ({
        item,
        width: Math.max(1, Number(item.offsetWidth) || fallbackWidth),
        height: Math.max(1, Number(item.offsetHeight) || fallbackOrb + (landscape ? 29 : 33))
      }));
      const largestHeight = Math.max(...dimensions.map(d => d.height), fallbackOrb + 18);
      const safeTop = Math.min(topBound, Math.max(8, bottomBound - largestHeight));
      const safeBottom = Math.max(safeTop + largestHeight, bottomBound);
      const gap = clampNumber(shortSide * 0.025, 7, 12);
      const inset = 7;
      const placed = [];

      // Fisher–Yates shuffle avoids the repeated row-by-row visual rhythm of a menu.
      const order = [...dimensions];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      for (const dimension of order) {
        let candidate = null;
        for (let attempt = 0; attempt < 500; attempt++) {
          const halfW = dimension.width / 2;
          const halfH = dimension.height / 2;
          const minX = Math.min(width / 2, halfW + inset);
          const maxX = Math.max(minX, width - halfW - inset);
          const minY = Math.min(safeBottom, safeTop + halfH);
          const maxY = Math.max(minY, safeBottom - halfH);
          const point = {
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY),
            width: dimension.width,
            height: dimension.height,
            item: dimension.item
          };
          const overlaps = placed.some(other =>
            Math.abs(point.x - other.x) < (point.width + other.width) / 2 + gap &&
            Math.abs(point.y - other.y) < (point.height + other.height) / 2 + gap
          );
          if (!overlaps) { candidate = point; break; }
        }
        if (candidate) placed.push(candidate);
      }

      // Constrained fallback: jittered cells keep every button tappable, while
      // spacing is calculated from the largest actual button footprint to prevent overlap.
      if (placed.length !== dimensions.length) {
        const areaTop = safeTop;
        const areaBottom = safeBottom;
        const areaHeight = Math.max(1, areaBottom - areaTop);
        const largestWidth = Math.max(...dimensions.map(d => d.width));
        let cols = landscape ? Math.min(3, dimensions.length) : Math.min(2, dimensions.length);
        let rows = Math.ceil(dimensions.length / cols);
        if (landscape && areaHeight < rows * largestHeight + (rows - 1) * gap) {
          // A low landscape viewport can fit one loose horizontal sweep more safely than clipped rows.
          cols = dimensions.length;
          rows = 1;
        } else if (areaHeight < rows * largestHeight + (rows - 1) * gap) {
          cols = Math.min(dimensions.length, Math.max(cols, Math.floor(width / (largestWidth + gap))));
          rows = Math.ceil(dimensions.length / cols);
        }
        const cellW = width / cols;
        const rowStep = Math.max(largestHeight + gap, areaHeight / rows);
        const totalHeight = rows * largestHeight + (rows - 1) * gap;
        const firstCenterY = areaTop + (areaHeight >= totalHeight ? (areaHeight - totalHeight) / 2 : 0) + largestHeight / 2;
        const fallback = [];
        const rowOrder = [...dimensions];
        for (let i = rowOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rowOrder[i], rowOrder[j]] = [rowOrder[j], rowOrder[i]];
        }
        rowOrder.forEach((d, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const xCenter = (col + 0.5) * cellW;
          const yCenter = firstCenterY + row * rowStep;
          const maxJitterX = Math.max(0, Math.min(cellW * 0.22, 30, (cellW - largestWidth - gap) / 2));
          const maxJitterY = Math.max(0, Math.min(12, (rowStep - largestHeight - gap) / 2));
          fallback.push({
            item: d.item,
            x: clampNumber(xCenter + (Math.random() - 0.5) * 2 * maxJitterX, d.width / 2 + inset, width - d.width / 2 - inset),
            y: clampNumber(yCenter + (Math.random() - 0.5) * 2 * maxJitterY, areaTop + d.height / 2, areaBottom - d.height / 2),
            width: d.width, height: d.height
          });
        });
        return fallback;
      }
      return placed;
    }

    function layoutLooseOrbs({ fromAnchor = false } = {}) {
      const items = [...(libraryGrid?.children || [])];
      if (!items.length) return;
      const anchor = getVisibleStacksAnchor();
      const positions = getRandomScatterPositions(items);
      const positionByItem = new Map(positions.map(point => [point.item, point]));
      for (const item of items) {
        item.classList.remove('le-orb-collecting');
        item.classList.remove('le-orb-deployed');
        item.style.pointerEvents = 'auto';
        item.style.transitionDuration = fromAnchor ? '0ms' : '0ms';
        item.style.transitionDelay = '0ms';
        item.style.left = `${fromAnchor ? anchor.x : (positionByItem.get(item)?.x ?? anchor.x)}px`;
        item.style.top = `${fromAnchor ? anchor.y - getOrbCenterOffsetY(item) : (positionByItem.get(item)?.y ?? anchor.y)}px`;
        item.style.opacity = fromAnchor ? '0' : '1';
        item.style.transform = fromAnchor ? 'translate(-50%,-50%) scale(.22)' : 'translate(-50%,-50%) scale(1)';
        item.style.animationDelay = `${-(Math.random() * 2.6).toFixed(2)}s`;
        item.style.setProperty?.('--le-orb-float-duration', `${(4.2 + Math.random() * 2.8).toFixed(2)}s`);
        item.classList.add('le-orb-deployed');
      }
      if (fromAnchor) {
        // Force the collapsed state to layout before moving each Orb to its random point.
        for (const item of items) void item.offsetWidth;
        const move = () => {
          for (const item of items) {
            const target = positionByItem.get(item);
            if (!target) continue;
            item.style.transitionDuration = '';
            item.style.transitionDelay = `${Math.floor(Math.random() * 130)}ms`;
            item.style.left = `${target.x}px`;
            item.style.top = `${target.y}px`;
            item.style.opacity = '1';
            item.style.transform = 'translate(-50%,-50%) scale(1)';
          }
        };
        if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(move);
        else move();
      } else {
        for (const item of items) {
          item.style.transitionDuration = '0ms';
          item.style.transitionDelay = '0ms';
        }
      }
    }

    function finishLibraryClose(reason = 'toggle') {
      if (collectingTimer) { clearTimeout(collectingTimer); collectingTimer = null; }
      libraryOpen = false;
      library.hidden = true;
      collectingOrbs = false;
      document.documentElement?.classList.remove('le-stacks-library-open');
      document.body.classList.remove('le-stacks-library-open');
      syncMainButtons();
      window.dispatchEvent(new CustomEvent('live-earth-stacks-library-change', {
        detail: { open: false, activeFeature, reason }
      }));
    }

    function collectLooseOrbs(done) {
      if (collectingOrbs) return false;
      collectingOrbs = true;
      const anchor = getVisibleStacksAnchor();
      const items = [...(libraryGrid?.children || [])];
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
      for (const item of items) {
        item.classList.remove('le-orb-deployed');
        item.classList.add('le-orb-collecting');
        item.style.animation = 'none';
        item.style.pointerEvents = 'none';
        item.style.transitionDuration = reducedMotion ? '0ms' : '320ms';
        item.style.transitionDelay = '0ms';
        item.style.left = `${anchor.x}px`;
        item.style.top = `${anchor.y - getOrbCenterOffsetY(item)}px`;
        item.style.opacity = '0';
        item.style.transform = 'translate(-50%,-50%) scale(.16)';
      }
      const finish = () => {
        collectingTimer = null;
        done?.();
      };
      if (reducedMotion || !items.length) finish();
      else collectingTimer = setTimeout(finish, 370);
      return true;
    }

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
        label.className = "le-feature-library-label";
        label.textContent = feature.title;
        const detail = document.createElement("small");
        detail.className = "le-feature-library-detail";
        detail.textContent = feature.connected ? "Ready" : "View preview";
        item.append(shell, label, detail);
        item.style.left = "50%";
        item.style.top = "50%";
        item.addEventListener("click", () => {
          if (collectingOrbs) return;
          collectLooseOrbs(() => {
            finishLibraryClose("feature-selected");
            if (activeFeature === feature.id) closeActiveFeature("library-toggle");
            else activateFeature(feature.id, "stacks");
          });
        });
        libraryGrid.appendChild(item);
      }
    }

    function toggleLibrary() {
      if (collectingOrbs) return;
      if (libraryOpen) {
        collectLooseOrbs(() => finishLibraryClose("toggle"));
        return;
      }
      // Refresh the three-Orb dock before measuring it as a possible anchor.
      if (activeFeature) updateDock();
      libraryOpen = true;
      library.hidden = false;
      document.documentElement?.classList.add("le-stacks-library-open");
      document.body.classList.add("le-stacks-library-open");
      renderLibrary();
      layoutLooseOrbs({ fromAnchor: true });
      syncMainButtons();
      window.dispatchEvent(new CustomEvent("live-earth-stacks-library-change", {
        detail: { open: true, activeFeature, mode: "orb-hunt" }
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

      // A feature Orb replaces the currently active primary scene. Explicitly return
      // Moon/Sun/Earth Explorer to Home before painting the feature stage so an old
      // celestial view can never remain visible behind Clouds, Weather, Alien World, etc.
      const primaryManager = window.LiveEarthViewManager;
      const primaryView = primaryManager?.getActiveView?.() || "home";
      if (primaryView !== "home") primaryManager?.requestView?.("home");
      returnView = "home";

      activeFeature = id;
      libraryOpen = false;
      document.documentElement?.classList.remove("le-stacks-library-open");
      document.body.classList.remove("le-stacks-library-open");
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
      document.documentElement?.classList.remove("le-stacks-library-open");
      document.body.classList.remove("le-stacks-library-open");
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
    window.addEventListener("resize", () => { if (libraryOpen && !collectingOrbs) layoutLooseOrbs(); }, { passive: true });
    window.addEventListener("orientationchange", () => { if (libraryOpen && !collectingOrbs) layoutLooseOrbs(); }, { passive: true });
    window.visualViewport?.addEventListener("resize", () => { if (libraryOpen && !collectingOrbs) layoutLooseOrbs(); }, { passive: true });
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
        if (libraryOpen) { renderLibrary(); layoutLooseOrbs(); }
        return Object.freeze({ id, unregister: () => api.unregister(id) });
      },
      unregister(id) {
        if (!catalog.has(id)) return false;
        if (activeFeature === id) closeActiveFeature("unregister");
        catalog.delete(id);
        if (libraryOpen) { renderLibrary(); layoutLooseOrbs(); }
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
