/* LIVE // EARTH — Atmospheric Composition View Controller.
   Owns the Atmospheric Composition observatory view and its active numerical grid layer.
   Reads only verified grid data; never displays fabricated sample measurements. */
(() => {
  'use strict';
  const flag = '__liveEarthAtmosphericCompositionViewControllerInstalled';
  if (window[flag]) return;

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Atmospheric Composition controller is waiting for the feature-view runtime.');
    return;
  }

  const WORLD = {
    id: 'atmospheric-composition',
    title: 'Atmospheric Composition',
    symbol: '◌',
    message: 'Seven registered atmospheric-composition fields are available as independent layers.'
  };
  const VALUES_BASE_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/Data/Central-Database/values/';

  function loadSharedGridTools() {
    const scripts = [
      ['./EarthEngine/Graphics/universal-grid-system.js', () => !!window.LiveEarthUniversalGridSystem?.loadCurrentGrid],
      ['./EarthEngine/Graphics/earth-grid-gpu-skin.js', () => !!window.LiveEarthGpuGridSkin?.create]
    ];
    return scripts.reduce((chain, [path, ready]) => chain.then(() => {
      if (ready()) return;
      const key = `__leScriptPromise:${path}`;
      if (window[key]) return window[key];
      window[key] = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL(path, document.baseURI).href;
        script.async = true;
        script.onload = () => ready() ? resolve() : reject(new Error(`${path} loaded without its public API.`));
        script.onerror = () => reject(new Error(`Could not load ${path}.`));
        (document.head || document.documentElement).appendChild(script);
      }).catch(error => { window[key] = null; throw error; });
      return window[key];
    }), Promise.resolve());
  }

  // This controller calls the shared Earth Engine directly and owns its view renderer.
async function initializeEngineView(view, worldId) {
  if (!view?.root || !view?.panel || !worldId) throw new TypeError("A mounted world view and stable world id are required.");
  const T = await import("../vendor/three.module.js");
  const engine = await import("../EarthEngine/Core/earth-engine.js");
  const createEarthGlobe = engine.createEarthGlobe || engine.createGlobe;
  if (typeof createEarthGlobe !== "function") throw new Error("The reusable Earth Engine factory is unavailable.");

  const root = view.root;
  root.classList.add("le-world-engine-host");
  const canvas = document.createElement("canvas");
  canvas.className = "le-world-engine-canvas";
  canvas.setAttribute("aria-label", `${worldId} independent interactive Earth globe`);
  canvas.setAttribute("role", "img");
  root.insertBefore(canvas, root.firstChild);
  installStyles();

  let renderer = null;
  let scene = null;
  let camera = null;
  let earthGlobe = null;
  let interactions = null;
  let disposed = false;
  let renderQueued = false;
  let resizeObserver = null;
  const layers = new Map();
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);

  function requestRender() {
    if (disposed || renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (!disposed && renderer && scene && camera) renderer.render(scene, camera);
    });
  }

  function resize() {
    if (disposed || !renderer || !camera) return;
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || window.innerWidth || 1));
    const height = Math.max(1, Math.round(rect.height || window.innerHeight || 1));
    renderer.setPixelRatio(maxPixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }

  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.setClearColor(0x02050b, 0);
    scene = new T.Scene();
    scene.background = null;
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, rect.width || window.innerWidth || 1);
    const height = Math.max(1, rect.height || window.innerHeight || 1);
    camera = new T.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.15);
    camera.lookAt(0, 0, 0);
    scene.add(new T.AmbientLight(0x8aa7c8, 0.28));
    const key = new T.DirectionalLight(0xffffff, 2.0);
    key.position.set(-3, 2, 4);
    scene.add(key);
    const fill = new T.DirectionalLight(0x245b9b, 0.10);
    fill.position.set(4, -2, -3);
    scene.add(fill);

    earthGlobe = await createEarthGlobe({
      THREE: T,
      radius: 1,
      textureUrl: "./EarthEngine/Assets/earth-land-ocean-ice-2048.png",
      geometryDetail: "standard",
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
      atmosphere: true
    });
    if (disposed) { earthGlobe.dispose(); throw new Error("The world view closed while its Engine globe was loading."); }
    scene.add(earthGlobe.group);
    interactions = earthGlobe.attachInteractions({
      element: canvas,
      enabled: () => !disposed && root.isConnected && runtime.isActive(worldId),
      rotation: { sensitivityX: 0.008, sensitivityY: 0.006, minPitch: -1.25, maxPitch: 1.25 },
      zoom: {
        enabled: true,
        getDistance: () => camera.position.z,
        setDistance: distance => { camera.position.z = Math.max(1.45, Math.min(4.2, distance)); camera.lookAt(0, 0, 0); requestRender(); },
        minDistance: 1.45,
        maxDistance: 4.2
      },
      onRotate: requestRender,
      onZoom: requestRender
    });
    resize();
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);
    }
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("orientationchange", resize, { passive: true });

    function attachLayer(id, factory) {
      if (disposed) throw new Error("This world globe has already been disposed.");
      if (typeof id !== "string" || !id.trim() || typeof factory !== "function") throw new TypeError("A layer needs an id and factory.");
      removeLayer(id);
      const cleanup = factory({
        THREE: T,
        scene,
        earth: earthGlobe.surface,
        group: earthGlobe.group,
        camera,
        renderer,
        redraw: requestRender,
        requestRender
      });
      if (typeof cleanup === "function") layers.set(id, cleanup);
      requestRender();
      return () => removeLayer(id);
    }

    function removeLayer(id) {
      const cleanup = layers.get(id);
      if (!cleanup) return false;
      layers.delete(id);
      try { cleanup(); } catch (error) { console.warn(`[LIVE // EARTH] ${worldId} layer cleanup failed:`, error); }
      requestRender();
      return true;
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      resizeObserver?.disconnect(); resizeObserver = null;
      interactions?.dispose?.(); interactions = null;
      for (const id of [...layers.keys()]) removeLayer(id);
      earthGlobe?.dispose?.(); earthGlobe = null;
      renderer?.dispose?.(); renderer?.forceContextLoss?.(); renderer = null;
      canvas.remove();
      scene = null; camera = null;
      root.classList.remove("le-world-engine-host");
    }

    requestRender();
    return Object.freeze({
      THREE: T,
      scene,
      camera,
      renderer,
      canvas,
      globe: earthGlobe,
      earth: earthGlobe.surface,
      attachLayer,
      removeLayer,
      requestRender,
      dispose
    });
  } catch (error) {
    disposed = true;
    resizeObserver?.disconnect();
    interactions?.dispose?.();
    earthGlobe?.dispose?.();
    renderer?.dispose?.();
    canvas.remove();
    root.classList.remove("le-world-engine-host");
    throw error;
  }
}


function installStyles() {
  if (document.getElementById("le-world-engine-canvas-style")) return;
  const style = document.createElement("style");
  style.id = "le-world-engine-canvas-style";
  style.textContent = `
    .le-world-engine-host{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(15,47,75,.22),rgba(2,6,13,.88) 76%)}
    .le-world-engine-canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;display:block;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}
    .le-world-engine-host .le-sfv-panel{z-index:1;pointer-events:none;overflow:hidden;background:linear-gradient(180deg,rgba(3,12,23,.48),rgba(3,9,18,.16) 48%,rgba(2,7,14,.62));backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
    .le-world-engine-host .le-sfv-head,.le-world-engine-host .le-sfv-body{pointer-events:auto}
    .le-world-engine-host .le-sfv-body{max-height:calc(100% - 150px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .le-world-engine-host .le-sfv-head{ text-shadow:0 2px 18px rgba(0,0,0,.85) }
    .le-world-engine-host .le-sfv-card{background:rgba(4,13,24,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  `;
  document.head.appendChild(style);
}


  function installHudStyle() {
    if (document.getElementById('le-composition-cinematic-hud')) return;
    const style = document.createElement('style');
    style.id = 'le-composition-cinematic-hud';
    style.textContent = `
      /* Atmosphere observatory: cinematic globe, quiet controls, precise data instrument. */
      .le-sfv--atmospheric-composition .le-sfv-panel {
        display:flex; flex-direction:column; align-items:stretch;
        overflow:hidden; background:transparent!important;
        backdrop-filter:none!important; -webkit-backdrop-filter:none!important;
        padding:calc(env(safe-area-inset-top) + clamp(66px,9vmin,82px))
          clamp(15px,4vw,32px) 0;
      }
      .le-sfv--atmospheric-composition .le-sfv-head { margin-bottom:9px; }
      /* The title is a permanent scene layer: the WebGL globe renders above it. */
      .le-acomp-scene-title {
        /* Portrait header anchor: 12% down from the screen top.
           Keep the position proportional across screen sizes. */
        position:absolute; z-index:1;
        top:12vh;
        top:12svh;
        left:50%; right:auto; width:min(84vw,620px);
        box-sizing:border-box; transform:translateX(-50%);
        display:flex; align-items:center; justify-content:center;
        gap:clamp(12px,3vw,24px);
        color:rgba(226,241,250,.88); pointer-events:none; user-select:none;
      }
      .le-acomp-scene-title::before,.le-acomp-scene-title::after {
        content:""; height:1px; flex:1 1 0; min-width:12px;
        background:linear-gradient(90deg,transparent,rgba(148,190,215,.46));
      }
      .le-acomp-scene-title::after { background:linear-gradient(90deg,rgba(148,190,215,.46),transparent); }
      .le-acomp-scene-title span {
        font:500 clamp(12px,3.25vmin,17px)/1.2 system-ui,-apple-system,sans-serif;
        letter-spacing:clamp(.24em,1.15vmin,.38em); white-space:nowrap;
        text-shadow:0 0 14px rgba(122,190,226,.20);
      }
      .le-acomp-scene-title i {
        position:absolute; left:16%; right:16%; top:calc(100% + 13px); height:1px;
        background:linear-gradient(90deg,transparent,rgba(50,155,232,.30) 28%,rgba(69,190,255,.9) 50%,rgba(50,155,232,.30) 72%,transparent);
        box-shadow:0 0 8px rgba(30,151,255,.45); font-style:normal;
      }
      .le-acomp-scene-title i::after {
        content:""; position:absolute; left:50%; top:50%; width:5px; height:5px; border-radius:50%;
        transform:translate(-50%,-50%); background:#a8eaff; box-shadow:0 0 6px 2px #168fff,0 0 15px 5px rgba(20,133,255,.55);
      }
      .le-acomp-hud-toggle {
        position:absolute; z-index:5; top:calc(env(safe-area-inset-top) + 14px);
        right:max(14px,env(safe-area-inset-right));
        display:grid; place-items:center;
        width:clamp(46px,6vmin,52px); height:clamp(46px,6vmin,52px);
        min-width:44px; min-height:44px; padding:0; aspect-ratio:1;
        border:1px solid rgba(135,205,239,.48); border-radius:50%;
        color:#eaf7ff;
        background:
          radial-gradient(circle at 34% 25%,rgba(112,207,245,.18),transparent 48%),
          linear-gradient(155deg,rgba(13,39,61,.94),rgba(3,12,24,.96));
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.16),
          inset 0 0 0 3px rgba(122,205,240,.035),
          0 0 18px rgba(54,174,231,.14),
          0 5px 18px rgba(0,0,0,.28);
        backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
        cursor:pointer; touch-action:manipulation; pointer-events:auto;
        transition:background .2s ease,border-color .2s ease,box-shadow .2s ease,transform .2s ease;
      }
      .le-acomp-hud-toggle:active { transform:scale(.94); }
      .le-acomp-hud-toggle:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-acomp-hud-toggle-icon { width:19px; height:19px; flex:none; color:#a6e5ff; }
      .le-acomp-hud-toggle[aria-expanded="true"] {
        border-color:rgba(111,218,255,.78);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 22px rgba(55,190,245,.25),0 5px 18px rgba(0,0,0,.28);
      }
      .le-acomp-dataset-orb-menu {
        position:absolute; z-index:6;
        top:calc(env(safe-area-inset-top) + 72px);
        right:max(14px,env(safe-area-inset-right));
        display:flex; flex-direction:column; align-items:center; gap:9px;
        opacity:0; visibility:hidden; pointer-events:none;
        transform:translateY(-7px) scale(.96);
        transform-origin:top center;
        transition:opacity .2s ease,transform .2s ease,visibility .2s ease;
      }
      .le-acomp-dataset-orb-menu.is-open {
        opacity:1; visibility:visible; pointer-events:auto;
        transform:translateY(0) scale(1);
      }
      /* Portrait: place the floating dataset control below the centered header.
         The menu follows the button so it opens directly beneath it on every screen size. */
      @media (orientation:portrait) {
        .le-acomp-hud-toggle { top:15svh; }
        .le-acomp-dataset-orb-menu {
          top:calc(15svh + clamp(46px,6vmin,52px) + 10px);
        }
      }
      /* Landscape: keep the dataset control lower and slightly inset from the edge. */
      @media (orientation:landscape) {
        .le-acomp-hud-toggle { top:8svh; right:8vw; }
        .le-acomp-dataset-orb-menu {
          top:calc(8svh + clamp(46px,6vmin,52px) + 10px);
          right:8vw;
        }
      }
      .le-acomp-dataset-orb {
        appearance:none; display:grid; place-items:center;
        width:clamp(42px,5.8vmin,48px); height:clamp(42px,5.8vmin,48px);
        min-width:42px; min-height:42px; padding:0; border-radius:50%;
        border:1px solid rgba(122,205,240,.42);
        color:#eaf7ff;
        background:
          radial-gradient(circle at 34% 24%,rgba(111,204,245,.2),transparent 52%),
          linear-gradient(155deg,rgba(12,37,58,.96),rgba(3,12,24,.97));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 0 15px rgba(54,174,231,.13),0 4px 13px rgba(0,0,0,.28);
        backdrop-filter:blur(13px); -webkit-backdrop-filter:blur(13px);
        cursor:pointer; touch-action:manipulation;
        transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease;
      }
      .le-acomp-dataset-orb:active { transform:scale(.92); }
      .le-acomp-dataset-orb:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-acomp-dataset-orb.is-selected {
        border-color:rgba(112,225,210,.9);
        box-shadow:inset 0 0 0 1px rgba(112,225,210,.22),0 0 19px rgba(72,220,196,.28),0 4px 13px rgba(0,0,0,.28);
        background:linear-gradient(155deg,rgba(15,65,72,.96),rgba(3,18,31,.98));
      }
      .le-acomp-dataset-orb:disabled { opacity:.48; cursor:progress; }
      .le-acomp-dataset-orb-icon { width:21px; height:21px; display:block; }
      .le-sfv--atmospheric-composition .le-sfv-panel.le-acomp-hud-hidden {
        opacity:0; visibility:hidden; pointer-events:none;
        transition:opacity .2s ease,visibility .2s ease;
      }
      .le-sfv--atmospheric-composition .le-sfv-panel { transition:opacity .2s ease,visibility .2s ease; }
      .le-sfv--atmospheric-composition.le-world-engine-host .le-world-engine-canvas { z-index:2; }
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-panel { z-index:3; }
      .le-sfv--atmospheric-composition .le-sfv-pill { margin-bottom:10px; }

      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body {
        display:block; box-sizing:border-box; width:min(100%,680px);
        margin:auto auto 0; min-height:0; max-height:min(48dvh,540px);
        overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
        padding-bottom:calc(env(safe-area-inset-bottom) + 144px);
        scrollbar-width:none;
      }
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body::-webkit-scrollbar { display:none; }
      /* Empty feature-body space must pass gestures through to the globe.
         Restore pointer handling only on actual content and controls. */
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body {
        pointer-events:none;
      }
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body > *,
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body :is(
        button, a, input, select, textarea, summary, [role="button"],
        .le-acomp-details, .le-acomp-scale-dock, .le-acomp-data-card
      ) {
        pointer-events:auto;
      }
      .le-sfv--atmospheric-composition .le-sfv-status {
        display:inline-block; width:auto; max-width:100%; margin:0 0 9px;
        padding:7px 11px; border-radius:999px; font-size:9px; line-height:1.35;
        background:rgba(3,13,24,.54); border-color:rgba(126,228,189,.22);
        backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
      }
      .le-sfv--atmospheric-composition .le-sfv-card {
        padding:13px 15px; border-radius:17px;
        border-color:rgba(159,211,249,.19);
        background:linear-gradient(145deg,rgba(8,23,40,.80),rgba(3,10,20,.78));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 28px rgba(0,0,0,.22);
        backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      }
      .le-sfv--atmospheric-composition .le-sfv-card h2 {
        margin:0 0 4px; font-size:10px; letter-spacing:.12em;
        color:#a9c9de; text-transform:uppercase;
      }
      .le-acomp-range { display:flex; align-items:baseline; flex-wrap:wrap; gap:5px 10px; }
      .le-acomp-range strong { color:#f2fbff; font-size:clamp(23px,6vw,31px); letter-spacing:-.035em; font-weight:760; }
      .le-acomp-range span { color:#a9c6d8; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }

      /* The scale is a floating instrument, not a card. Its text and spectrum share one track. */
      .le-acomp-scale-dock {
        container-type:inline-size;
        --acomp-action-space:42px;
        --acomp-track-gap:12px;
        --acomp-content-width:calc(100% - var(--acomp-action-space) - var(--acomp-track-gap));
        position:absolute; z-index:4;
        left:clamp(20px,4.5vw,48px); right:clamp(20px,4.5vw,48px);
        bottom:calc(env(safe-area-inset-bottom) + clamp(82px,12svh,112px));
        box-sizing:border-box; width:min(calc(100% - 40px),760px);
        margin:0 auto; padding:0;
        border:0; border-radius:0; color:#eff8ff;
        background:transparent; box-shadow:none;
        backdrop-filter:none; -webkit-backdrop-filter:none;
        pointer-events:none;
      }
      .le-acomp-scale-dock > .le-acomp-data-card { pointer-events:auto; }
      .le-acomp-scale-dock[hidden] { display:none!important; }
      /* Provenance opens as a separate panel anchored above the scale.
         It is removed from layout flow, so the scale deck never moves,
         grows, or changes its position when the panel is opened. */
      .le-acomp-scale-dock .le-acomp-data-card {
        display:none!important;
        position:absolute; left:0; right:0;
        bottom:calc(100% + clamp(10px,1.6svh,18px));
        width:100%; max-height:min(52svh,560px);
        box-sizing:border-box; margin:0;
        overflow:auto; overscroll-behavior:contain;
        pointer-events:auto; z-index:6;
      }
      .le-sfv--atmospheric-composition.le-acomp-details-expanded .le-acomp-scale-dock .le-acomp-data-card {
        display:block!important;
      }
      .le-acomp-scale-dock .le-sfv-attribution { margin:8px 2px 0; }
      .le-acomp-scale-dock .le-acomp-details { pointer-events:auto; }

      .le-acomp-instrument-label {
        display:flex; align-items:center; justify-content:center; gap:7px;
        width:100%; margin:0 0 6px;
        color:#b7dff4; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:10px; font-weight:650; letter-spacing:.28em;
        line-height:1; text-align:center; text-transform:uppercase;
        text-shadow:0 0 16px rgba(65,176,235,.20);
      }
      .le-acomp-instrument-label::before,
      .le-acomp-instrument-label::after {
        content:""; display:block; flex:1 1 0; max-width:88px; height:1px;
        background:linear-gradient(90deg,transparent,rgba(104,190,231,.46));
      }
      .le-acomp-instrument-label::after {
        background:linear-gradient(90deg,rgba(104,190,231,.46),transparent);
      }
      .le-acomp-scale-heading {
        display:flex; flex-flow:row nowrap; justify-content:flex-start;
        align-items:center; gap:8px;
        width:var(--acomp-content-width); min-width:0;
        margin:0 0 5px; white-space:nowrap; line-height:1;
        text-align:left;
      }
      .le-acomp-legend-title {
        display:block; flex:0 1 auto; min-width:0; overflow:hidden; margin:0;
        padding:0; color:#c6ddeb;
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(9px,2.25cqi,11px); font-weight:620;
        letter-spacing:.055em; text-align:left;
        text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap;
      }
      .le-acomp-scale-range {
        display:block; flex:0 0 auto; min-width:0; margin:0;
        padding:0 0 0 8px; border-left:1px solid rgba(137,200,228,.56);
        color:#f7fbff;
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(16px,4.1cqi,22px); font-weight:560;
        letter-spacing:-.025em; font-variant-numeric:tabular-nums;
        white-space:nowrap; text-align:left;
      }
      .le-acomp-scale-track-row {
        display:grid; grid-template-columns:minmax(0,1fr) var(--acomp-action-space);
        align-items:center; column-gap:var(--acomp-track-gap); min-width:0;
        --acomp-gradient-height:8px;
      }
      .le-acomp-scale-visual { min-width:0; width:100%; }
      .le-acomp-scale-track { min-width:0; width:100%; }
      .le-acomp-scale-more {
        position:relative; flex:none; display:grid; place-items:center;
        width:var(--acomp-action-space); height:var(--acomp-action-space);
        margin:0; padding:0; justify-self:center; align-self:center;
        border:1px solid rgba(116,218,250,.78); border-radius:50%;
        color:#d9f7ff;
        background:radial-gradient(circle at 35% 27%,rgba(78,190,229,.18),rgba(3,19,32,.72) 72%);
        box-shadow:0 0 0 1px rgba(82,186,228,.07),0 0 13px rgba(49,177,228,.20),
          inset 0 1px 4px rgba(255,255,255,.10);
        font:300 22px/1 ui-sans-serif,system-ui,sans-serif;
        cursor:pointer; pointer-events:auto; touch-action:manipulation;
        transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease;
      }
      /* Portrait: centre the + control on the colour gradient itself,
         not on the combined gradient-and-tick-label block. The offset is
         derived from the live control size and gradient thickness. */
      @media (orientation:portrait) {
        .le-acomp-scale-track-row { align-items:start; }
        .le-acomp-scale-more {
          align-self:start; justify-self:center;
          margin-top:calc((var(--acomp-gradient-height) - var(--acomp-action-space)) / 2);
        }
      }
      .le-acomp-scale-more:hover {
        border-color:rgba(150,232,255,.95);
        background:radial-gradient(circle at 35% 27%,rgba(78,190,229,.30),rgba(3,19,32,.82) 72%);
        box-shadow:0 0 16px rgba(49,177,228,.30);
      }
      .le-acomp-scale-more:active { transform:scale(.94); }
      .le-acomp-scale-more:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-acomp-legend-bar {
        width:100%; height:8px; border-radius:999px;
        background:linear-gradient(90deg,#080d2c 0%,#101c50 7.1429%,#203b8a 14.2857%,#1689b8 32.1429%,#45b978 50%,#f0c64b 67.8571%,#f06429 82.1429%,#c83f36 89.2857%,#8b152a 94.6429%,#450417 100%);
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.30),0 0 9px rgba(68,159,222,.24);
      }
      .le-acomp-legend-ticks {
        position:relative; width:var(--acomp-content-width);
        height:14px; margin-top:4px;
        color:#b9cddd; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        font-size:clamp(9px,1.8cqi,11px); font-weight:500;
        line-height:1; font-variant-numeric:tabular-nums;
      }
      .le-acomp-legend-ticks span {
        position:absolute; top:0; transform:translateX(-50%);
        white-space:nowrap; text-align:center;
      }
      .le-acomp-legend-ticks span::before {
        content:""; position:absolute; left:50%; top:-6px;
        width:1px; height:3px; background:rgba(171,211,233,.58);
        transform:translateX(-50%);
      }
      .le-acomp-legend-ticks span:first-child { transform:none; text-align:left; }
      .le-acomp-legend-ticks span:first-child::before { left:0; }
      .le-acomp-legend-ticks span:last-child { transform:translateX(-100%); text-align:right; }
      .le-acomp-legend-ticks span:last-child::before { left:100%; }

      .le-acomp-details { margin-top:10px; border-top:1px solid rgba(165,208,235,.14); padding-top:8px; }
      .le-acomp-details summary {
        list-style:none; cursor:pointer; color:#b7d8e9; font-size:10px;
        font-weight:700; letter-spacing:.08em; text-transform:uppercase;
        display:flex; justify-content:space-between; align-items:center; min-height:26px;
      }
      .le-acomp-details summary::-webkit-details-marker { display:none; }
      .le-acomp-details summary::after { content:'＋'; color:#82d9f5; font-size:15px; }
      .le-acomp-details[open] summary::after { content:'−'; }
      .le-sfv--atmospheric-composition .le-sfv-metric-grid { margin-top:9px; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
      .le-sfv--atmospheric-composition .le-sfv-metric { padding:9px 10px; border-radius:11px; background:rgba(1,8,17,.42); }
      .le-sfv--atmospheric-composition .le-sfv-metric-label { font-size:8px; margin-bottom:4px; }
      .le-sfv--atmospheric-composition .le-sfv-metric-value { font-size:clamp(13px,3.5vw,17px); }
      .le-sfv--atmospheric-composition .le-sfv-attribution { margin:7px 2px 0; font-size:8px; color:#8da9bc; }
      .le-sfv--atmospheric-composition .le-acomp-dataset-card { margin-bottom:9px; }
      .le-acomp-dataset-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
      .le-acomp-dataset-option {
        appearance:none; display:flex; flex-direction:column; align-items:flex-start;
        gap:4px; min-width:0; min-height:66px; padding:10px 11px;
        border:1px solid rgba(130,197,230,.22); border-radius:13px;
        color:#eaf7ff; text-align:left;
        background:linear-gradient(145deg,rgba(16,43,65,.82),rgba(4,13,25,.82));
        cursor:pointer; font:inherit;
        transition:border-color .18s ease,background .18s ease,transform .18s ease;
      }
      .le-acomp-dataset-option:active:not(:disabled) { transform:scale(.985); }
      .le-acomp-dataset-option.is-selected {
        border-color:rgba(91,222,190,.8);
        background:linear-gradient(145deg,rgba(15,76,75,.78),rgba(4,24,35,.92));
        box-shadow:inset 0 0 0 1px rgba(91,222,190,.14),0 0 18px rgba(62,218,181,.12);
      }
      .le-acomp-dataset-option:disabled { opacity:.48; cursor:not-allowed; }
      .le-acomp-dataset-name { font-size:12px; letter-spacing:.02em; }
      .le-acomp-dataset-detail { color:#a9c6d8; font-size:9px; line-height:1.35; }
      .le-acomp-dataset-state { margin-top:auto; color:#80d9c1; font-size:7px; font-weight:800; letter-spacing:.1em; }
      .le-acomp-dataset-option.is-unavailable .le-acomp-dataset-state { color:#91a4b4; }
    `;
    style.textContent += `
      /* Seven composition fields: keep the floating orb selector compact. */
      .le-acomp-dataset-orb-menu {
        display:grid; grid-template-columns:repeat(2,clamp(42px,5.8vmin,48px));
        gap:8px; align-items:center; justify-items:center;
        width:max-content;
      }
      .le-sfv--atmospheric-composition .le-sfv-head,
      .le-sfv--atmospheric-composition .le-sfv-pill { display:none!important; }
      body.le-composition-fullscreen-open #scene { visibility:hidden!important; pointer-events:none!important; }
      .le-sfv--atmospheric-composition.le-world-engine-host {
        position:absolute; inset:0; isolation:isolate;
        background:radial-gradient(ellipse at 50% 43%,#0a1b2b 0%,#030914 58%,#010308 100%);
        pointer-events:none;
      }
      .le-sfv--atmospheric-composition.le-world-engine-host .le-world-engine-canvas { z-index:2; pointer-events:auto; }
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-panel {
        z-index:3; background:transparent!important; backdrop-filter:none!important;
        -webkit-backdrop-filter:none!important;
      }
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body { pointer-events:none; }
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body > *,
      .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body :is(
        button,a,input,select,textarea,summary,[role="button"],.le-acomp-details,.le-acomp-scale-dock,.le-acomp-data-card
      ) { pointer-events:auto; }
    `;
    document.head.appendChild(style);
  }
  function installResponsivePresentationStyles() {
    if (document.getElementById('le-acomp-responsive-presentation-style')) return;
    const style = document.createElement('style');
    style.id = 'le-acomp-responsive-presentation-style';
    style.textContent = `
      /* Compact-width presentation */
      @container (max-width:430px) {
        .le-acomp-scale-heading { gap:7px; }
        .le-acomp-legend-title { font-size:clamp(8.5px,2.2cqi,10px); letter-spacing:.025em; }
        .le-acomp-scale-range { padding-left:8px; font-size:clamp(15px,4cqi,19px); }
        .le-acomp-instrument-label { margin-bottom:6px; }
      }
      @container (max-width:350px) {
        .le-acomp-scale-dock { --acomp-action-space:40px; --acomp-track-gap:9px; }
        .le-acomp-scale-heading { gap:5px; margin-bottom:5px; }
        .le-acomp-legend-title { font-size:8px; }
        .le-acomp-scale-range { padding-left:6px; font-size:15px; }
        .le-acomp-instrument-label { font-size:9px; letter-spacing:.22em; margin-bottom:5px; }
        .le-acomp-legend-ticks { font-size:8px; }
      }
      @media (max-width:360px) {
        .le-acomp-dataset-grid { grid-template-columns:1fr; }
      }
      @media (max-height:700px) {
        .le-sfv--atmospheric-composition.le-world-engine-host .le-sfv-body { margin-top:clamp(145px,28vh,230px); }
        .le-sfv--atmospheric-composition .le-sfv-panel { padding-bottom:calc(env(safe-area-inset-bottom) + 112px); }
      }

      /* Landscape presentation — scale only. Globe, header, orbs and shared
         feature controls retain their existing presentation and behavior. */
      @media (orientation:landscape) {
        .le-acomp-scene-title { top:3vh; top:3svh; }
        .le-acomp-scale-dock {
          left:6%; right:auto;
          top:50%; bottom:auto; transform:translateY(-50%);
          width:clamp(126px,12.24vw,151px); max-width:16.2vw;
          display:grid; grid-template-columns:minmax(0,1fr);
          grid-template-rows:auto auto auto auto; column-gap:0; row-gap:8px;
          padding:8px 8px 8px; border:0; border-radius:0; background:transparent;
          box-shadow:none; backdrop-filter:none; -webkit-backdrop-filter:none;
          pointer-events:auto;
        }
        .le-acomp-instrument-label {
          grid-column:1 / -1; grid-row:1;
          width:100%; margin:0 0 1px; font-size:9px; letter-spacing:.18em;
        }
        .le-acomp-instrument-label::before,.le-acomp-instrument-label::after { max-width:24px; }

        /* Dataset label is vertical; the live numeric range stays horizontal. */
        .le-acomp-scale-heading { display:contents; }
        .le-acomp-legend-title {
          position:absolute; z-index:1;
          left:7px; top:53%;
          grid-column:auto; grid-row:auto;
          align-self:auto; justify-self:auto;
          display:flex; align-items:center; justify-content:center;
          width:18px; max-width:none; overflow:visible;
          writing-mode:vertical-rl; transform:translateY(-50%) rotate(180deg);
          font-size:9px; letter-spacing:.08em; text-align:center;
          text-overflow:clip; white-space:nowrap;
        }
        .le-acomp-scale-range {
          grid-column:1; grid-row:2;
          display:block; width:100%; min-width:0;
          padding:0; border:0; font-size:clamp(13px,1.45vw,16px);
          line-height:1.1; letter-spacing:-.035em;
          white-space:nowrap; text-align:center;
        }
        .le-acomp-scale-track-row { display:contents; }
        .le-acomp-scale-visual {
          grid-column:1; grid-row:3;
          display:grid; grid-template-columns:8px max-content;
          align-items:stretch; column-gap:7px;
          width:max-content; max-width:100%; min-width:0;
          justify-self:center;
        }
        .le-acomp-scale-track { width:8px; height:clamp(210px,48vh,300px); }
        .le-acomp-legend-bar {
          width:100%; height:100%; min-height:100%;
          background:var(--acomp-gradient-vertical)!important;
          border-radius:999px;
        }
        .le-acomp-legend-ticks {
          position:relative; width:max-content; height:auto; min-height:clamp(210px,48vh,300px);
          margin:0; font-size:clamp(8px,.85vw,10px); line-height:1;
        }
        .le-acomp-legend-ticks span {
          top:var(--acomp-tick-position); left:0!important;
          transform:translateY(-50%); text-align:left; white-space:nowrap;
        }
        .le-acomp-legend-ticks span::before {
          left:-7px; top:50%; width:4px; height:1px;
          transform:translateY(-50%);
        }
        .le-acomp-legend-ticks span:first-child { transform:translateY(-50%); }
        .le-acomp-legend-ticks span:last-child { transform:translateY(-50%); text-align:left; }
        .le-acomp-scale-more {
          grid-column:1; grid-row:4;
          width:34px; height:34px; justify-self:center; align-self:center;
          margin:1px 0 0;
        }

        /* The + control opens provenance in a right-side drawer, not above
           the scale, so the drawer stays inside the Landscape viewport. */
        .le-acomp-scale-dock .le-acomp-data-card {
          left:calc(100% + 14px); right:auto;
          top:50%; bottom:auto; transform:translateY(-50%);
          width:min(42vw,620px);
          max-width:calc(80vw - 200px);
          max-height:85svh; overflow:auto;
          border-radius:16px;
        }
      }
    
    `;
    document.head.appendChild(style);
  }

  function formatTime(value) {
    if (!value) return 'Time unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Time unavailable'
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  // 06 — Feature composition: seven registered fields, one active grid layer, shared observatory HUD.
  const DATASET_OPTIONS = [
    { id: 'water-vapour', label: 'Water Vapour', detail: 'Atmospheric water vapour', datasetId: 'earth.atmosphere.water_vapour', icon: 'water' },
    { id: 'cloud-properties', label: 'Cloud Properties', detail: 'Cloud composition field', datasetId: 'earth.atmosphere.cloud_properties', icon: 'cloud' },
    { id: 'co2', label: 'Carbon Dioxide', detail: 'CO₂ concentration', datasetId: 'earth.atmosphere.co2_concentration', icon: 'co2' },
    { id: 'methane', label: 'Methane', detail: 'CH₄ concentration', datasetId: 'earth.atmosphere.methane', icon: 'methane' },
    { id: 'ozone', label: 'Ozone', detail: 'O₃ distribution', datasetId: 'earth.atmosphere.ozone', icon: 'ozone' },
    { id: 'carbon-monoxide', label: 'Carbon Monoxide', detail: 'CO concentration', datasetId: 'earth.atmosphere.carbon_monoxide', icon: 'co' },
    { id: 'aerosols-dust', label: 'Aerosols / Dust', detail: 'Atmospheric aerosol and dust field', datasetId: 'earth.atmosphere.aerosols_dust', icon: 'dust' }
  ];

  const PALETTES = {
    'water-vapour': ['#08152f', '#104a82', '#168fc0', '#35d5c2', '#c6f7ef'],
    'cloud-properties': ['#101b38', '#425d85', '#8caac0', '#d4e2e7', '#ffffff'],
    co2: ['#160d3b', '#40318c', '#7867c8', '#c18bd2', '#f2c5ec'],
    methane: ['#062d39', '#087d83', '#38b68c', '#b5d94a', '#ffe08a'],
    ozone: ['#1b124d', '#3f3ca3', '#786dd7', '#cb78c9', '#ffbdc8'],
    'carbon-monoxide': ['#071d3a', '#075c8a', '#00a4ae', '#8acb92', '#ffc06a'],
    'aerosols-dust': ['#24152a', '#63333b', '#a95c36', '#e1a63f', '#fff0a0']
  };

  function paletteStops(colors) {
    return colors.map((hex, index) => {
      const value = Number.parseInt(hex.slice(1), 16);
      return [
        index / Math.max(1, colors.length - 1),
        ((value >> 16) & 255) / 255,
        ((value >> 8) & 255) / 255,
        (value & 255) / 255
      ];
    });
  }

  function paletteGradient(colors, angle = '90deg') {
    const last = Math.max(1, colors.length - 1);
    return `linear-gradient(${angle},${colors.map((color, index) => `${color} ${index / last * 100}%`).join(',')})`;
  }

  function formatFieldValue(value) {
    if (!Number.isFinite(value)) return '—';
    const absolute = Math.abs(value);
    const digits = absolute >= 1000 ? 0 : (absolute >= 100 ? 1 : 2);
    return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  }

  function activateView() {
    installHudStyle();
    installResponsivePresentationStyles();
    const view = runtime.mount(WORLD.id);
    if (!view) return () => {};
    document.body.classList.add('le-composition-fullscreen-open');

    const sceneTitle = runtime.el('div', 'le-acomp-scene-title');
    sceneTitle.setAttribute('aria-label', 'Atmospheric Composition');
    sceneTitle.innerHTML = '<span>ATMOSPHERIC COMPOSITION</span><i aria-hidden="true"></i>';
    view.root.appendChild(sceneTitle);

    const hudToggle = runtime.el('button', 'le-acomp-hud-toggle');
    hudToggle.type = 'button';
    const hudIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    hudIcon.setAttribute('viewBox', '0 0 24 24');
    hudIcon.setAttribute('aria-hidden', 'true');
    hudIcon.classList.add('le-acomp-hud-toggle-icon');
    hudIcon.innerHTML = '<path d="M4 7h7m4 0h5M4 17h3m4 0h9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="13" cy="7" r="2" fill="#061525" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="17" r="2" fill="#061525" stroke="currentColor" stroke-width="1.6"/>';
    hudToggle.append(hudIcon);
    const datasetOrbMenu = runtime.el('div', 'le-acomp-dataset-orb-menu');
    datasetOrbMenu.id = 'le-acomp-dataset-orb-menu';
    datasetOrbMenu.setAttribute('role', 'group');
    datasetOrbMenu.setAttribute('aria-label', 'Atmospheric composition datasets');
    hudToggle.setAttribute('aria-controls', datasetOrbMenu.id);
    hudToggle.setAttribute('aria-expanded', 'false');
    hudToggle.setAttribute('aria-haspopup', 'true');
    hudToggle.setAttribute('aria-label', 'Open atmospheric composition datasets');
    hudToggle.addEventListener('click', () => {
      const open = datasetOrbMenu.classList.toggle('is-open');
      hudToggle.setAttribute('aria-expanded', String(open));
      hudToggle.setAttribute('aria-label', open ? 'Close atmospheric composition datasets' : 'Open atmospheric composition datasets');
    });
    view.root.append(hudToggle, datasetOrbMenu);
    view.panel.id = 'le-acomp-hud-panel';

    const status = runtime.el('p', 'le-sfv-status', '');
    status.dataset.state = 'neutral';
    status.hidden = true;
    const showStatus = (message, state = 'neutral') => {
      status.hidden = false;
      if (!status.isConnected) view.body.appendChild(status);
      runtime.setStatus(status, message, state);
    };
    const clearStatus = () => {
      status.remove();
      status.hidden = true;
    };

    const datasetOrbButtons = new Map();
    const dataButtons = new Map();
    const selectedDatasetConfig = new Map(DATASET_OPTIONS.map(item => [item.id, item]));
    let selectedDataset = null;

    const iconMarkup = {
      water: '<path d="M12 3.5s-6 6.4-6 10.5a6 6 0 0 0 12 0c0-4.1-6-10.5-6-10.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 15.2a3.2 3.2 0 0 0 3.2 3.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      cloud: '<path d="M6.3 18.2h11.2a3.5 3.5 0 0 0 .3-7 5.8 5.8 0 0 0-11-1.1 4.1 4.1 0 0 0-.5 8.1Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
      co2: '<circle cx="12" cy="12" r="7.4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="9" r="1.3" fill="currentColor"/><circle cx="15.5" cy="9" r="1.3" fill="currentColor"/><circle cx="12" cy="15.5" r="1.3" fill="currentColor"/>',
      methane: '<path d="M12 3.8 19 8v8l-7 4.2L5 16V8l7-4.2Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m5 8 7 4 7-4M12 12v8" fill="none" stroke="currentColor" stroke-width="1.4"/>',
      ozone: '<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7 14.5 10 9l3 6 4-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      co: '<path d="M5 8.5a4.3 4.3 0 0 1 7.5-2.8 4.5 4.5 0 0 1 6.8 3.8 4.2 4.2 0 0 1-.7 8.3H7a4 4 0 0 1-2-7.5Z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
      dust: '<path d="M4 8h12M7 12h13M4 16h9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="18.5" cy="7.5" r="1" fill="currentColor"/><circle cx="6" cy="19" r="1" fill="currentColor"/>'
    };

    for (const item of DATASET_OPTIONS) {
      const button = runtime.el('button', 'le-acomp-dataset-orb');
      button.type = 'button';
      button.dataset.dataset = item.id;
      button.setAttribute('aria-label', item.label);
      button.setAttribute('aria-pressed', 'false');
      button.title = item.label;
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      icon.classList.add('le-acomp-dataset-orb-icon');
      icon.style.color = PALETTES[item.id][Math.floor(PALETTES[item.id].length / 2)];
      icon.innerHTML = iconMarkup[item.icon];
      button.appendChild(icon);
      button.addEventListener('click', () => {
        selectDataset(item.id);
        datasetOrbMenu.classList.remove('is-open');
        hudToggle.setAttribute('aria-expanded', 'false');
        hudToggle.setAttribute('aria-label', 'Open atmospheric composition datasets');
      });
      datasetOrbMenu.appendChild(button);
      datasetOrbButtons.set(item.id, button);
      dataButtons.set(item.id, button);
    }

    const details = runtime.card('Atmospheric composition field', 'Select a registered composition dataset to load its current verified grid values.');
    details.classList.add('le-acomp-data-card');
    details.hidden = true;
    const range = runtime.el('div', 'le-acomp-range');
    const rangeValue = runtime.el('strong', '', '—');
    const rangeUnit = runtime.el('span', '', 'Current global range');
    range.append(rangeValue, rangeUnit);
    details.appendChild(range);

    const scaleDock = runtime.el('section', 'le-acomp-scale-dock');
    scaleDock.setAttribute('aria-label', 'Active atmospheric composition colour scale');
    scaleDock.hidden = true;
    const instrumentLabel = runtime.el('div', 'le-acomp-instrument-label');
    instrumentLabel.appendChild(runtime.el('span', 'le-acomp-instrument-name', 'Atmospheric Composition'));
    scaleDock.append(details, instrumentLabel);
    const scaleHeading = runtime.el('div', 'le-acomp-scale-heading');
    const legendTitle = runtime.el('span', 'le-acomp-legend-title', 'Select a composition field');
    const scaleRange = runtime.el('span', 'le-acomp-scale-range', '—');
    scaleHeading.append(legendTitle, scaleRange);
    scaleDock.appendChild(scaleHeading);
    const scaleTrackRow = runtime.el('div', 'le-acomp-scale-track-row');
    const scaleVisual = runtime.el('div', 'le-acomp-scale-visual');
    const scaleTrack = runtime.el('div', 'le-acomp-scale-track');
    const legendBar = runtime.el('div', 'le-acomp-legend-bar');
    legendBar.setAttribute('role', 'img');
    legendBar.setAttribute('aria-label', 'Atmospheric composition field colour gradient');
    scaleTrack.appendChild(legendBar);
    const legendTicks = runtime.el('div', 'le-acomp-legend-ticks');
    scaleVisual.append(scaleTrack, legendTicks);
    const scaleMore = runtime.el('button', 'le-acomp-scale-more', '+');
    scaleMore.type = 'button';
    scaleMore.setAttribute('aria-label', 'Show composition data details and provenance');
    scaleMore.setAttribute('aria-controls', 'le-composition-data-details');
    scaleMore.setAttribute('aria-expanded', 'false');
    scaleTrackRow.append(scaleVisual, scaleMore);
    scaleDock.appendChild(scaleTrackRow);
    view.root.appendChild(scaleDock);

    const disclosure = runtime.el('details', 'le-acomp-details');
    disclosure.id = 'le-composition-data-details';
    disclosure.appendChild(runtime.el('summary', '', 'Data details & provenance'));
    const syncScaleMore = () => {
      const expanded = disclosure.open;
      scaleMore.textContent = expanded ? '−' : '+';
      scaleMore.setAttribute('aria-expanded', String(expanded));
      scaleMore.setAttribute('aria-label', expanded ? 'Collapse composition data details' : 'Expand composition data details');
      view.root.classList.toggle('le-acomp-details-expanded', expanded);
    };
    scaleMore.addEventListener('click', () => { disclosure.open = !disclosure.open; syncScaleMore(); });
    disclosure.addEventListener('toggle', syncScaleMore);
    const metric = runtime.el('div', 'le-sfv-metric-grid');
    disclosure.appendChild(metric);
    details.appendChild(disclosure);
    const source = runtime.el('p', 'le-sfv-attribution', 'Dataset attribution and source metadata will be shown when the registered source is connected.');
    source.hidden = true;
    details.appendChild(source);

    let closed = false;
    let layerDispose = null;
    let gridHandle = null;
    let gridRoot = null;
    let worldGlobe = null;
    let dataRequest = null;
    let engineReady = null;

    function removeActiveLayer() {
      if (typeof layerDispose === 'function') {
        const dispose = layerDispose;
        layerDispose = null;
        try { dispose(); } catch (error) { console.warn(`[LIVE // EARTH] ${WORLD.id} layer detach failed.`, error); }
      }
      try { gridHandle?.dispose?.(); } catch (_) {}
      gridHandle = null;
      try { gridRoot?.removeFromParent?.(); } catch (_) {}
      gridRoot = null;
      delete view.root.dataset.gridData;
    }

    const cleanup = () => {
      if (closed) return;
      closed = true;
      document.body.classList.remove('le-composition-fullscreen-open');
      dataRequest?.abort();
      hudToggle.remove();
      sceneTitle.remove();
      datasetOrbMenu.remove();
      scaleDock.remove();
      removeActiveLayer();
      try { worldGlobe?.dispose?.(); } catch (error) { console.warn(`[LIVE // EARTH] ${WORLD.id} Engine globe cleanup failed.`, error); }
      worldGlobe = null;
    };

    function setSelectedDataset(id) {
      selectedDataset = id;
      for (const [key, button] of dataButtons) {
        const active = key === id;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
      for (const [key, button] of datasetOrbButtons) {
        const active = key === id;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
    }

    function updateLegend(grid, config) {
      const min = grid.min;
      const max = grid.max;
      if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
        throw new Error('The selected dataset has no valid numeric range for its colour scale.');
      }
      const unit = grid.units || 'source units not supplied';
      const colors = PALETTES[config.id];
      legendTitle.textContent = `${config.label} · ${unit}`;
      legendBar.style.background = paletteGradient(colors, '90deg');
      legendBar.style.setProperty('--acomp-gradient-vertical', paletteGradient(colors, '0deg'));
      legendTicks.replaceChildren();
      for (let index = 0; index < 5; index++) {
        const value = min + (max - min) * index / 4;
        const position = index * 25;
        const node = runtime.el('span', '', `${formatFieldValue(value)}${grid.units ? ` ${grid.units}` : ''}`);
        node.style.left = `${position}%`;
        node.style.setProperty('--acomp-tick-position', `${100 - position}%`);
        legendTicks.appendChild(node);
      }
      scaleRange.textContent = `${formatFieldValue(min)} — ${formatFieldValue(max)}${grid.units ? ` ${grid.units}` : ''}`;
      scaleDock.hidden = false;
      return { min, max };
    }

    function makeMetric(labelText, value, unit = '') {
      const item = runtime.el('div', 'le-sfv-metric');
      item.appendChild(runtime.el('span', 'le-sfv-metric-label', labelText));
      const valueNode = runtime.el('strong', 'le-sfv-metric-value', value);
      if (unit) valueNode.appendChild(runtime.el('span', 'le-sfv-metric-unit', ` ${unit}`));
      item.appendChild(valueNode);
      metric.appendChild(item);
    }

    async function selectDataset(datasetKey) {
      if (closed || !runtime.isActive(WORLD.id)) return;
      const config = selectedDatasetConfig.get(datasetKey);
      if (!config) return;
      if (selectedDataset === datasetKey && layerDispose) {
        dataRequest?.abort();
        dataRequest = null;
        removeActiveLayer();
        setSelectedDataset(null);
        details.hidden = true;
        source.hidden = true;
        scaleDock.hidden = true;
        clearStatus();
        worldGlobe?.requestRender?.();
        return;
      }

      dataRequest?.abort();
      dataRequest = null;
      for (const datasetButton of dataButtons.values()) datasetButton.disabled = false;
      removeActiveLayer();
      scaleDock.hidden = true;
      setSelectedDataset(datasetKey);
      details.hidden = false;
      source.hidden = false;
      details.querySelector('h2').textContent = config.label;
      details.querySelector('p').textContent = `${config.detail} · verified units and range are taken from the loaded grid.`;
      source.textContent = `${config.datasetId} · registered in the Universal Dataset Registry.`;

      const controller = new AbortController();
      dataRequest = controller;
      const button = dataButtons.get(datasetKey);
      if (button) button.disabled = true;
      showStatus(`Loading and verifying ${config.label.toLowerCase()} grid values…`, 'neutral');

      try {
        await loadSharedGridTools();
        if (engineReady) await engineReady;
        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        if (!window.LiveEarthUniversalGridSystem?.loadCurrentGrid) throw new Error('The shared Universal Grid System is unavailable.');
        const grid = await window.LiveEarthUniversalGridSystem.loadCurrentGrid({
          baseUrl: VALUES_BASE_URL,
          datasetId: config.datasetId,
          signal: controller.signal
        });
        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        if (!grid?.definition || !grid?.values) throw new Error('The dataset did not return a verified numerical grid.');
        if (grid.definition.width !== 1440 || grid.definition.height !== 721) {
          throw new Error('The selected composition field does not match the shared 1440 × 721 universal grid.');
        }
        if (!(grid.validCount > 0)) throw new Error('The selected composition field contains no valid cells.');
        const bounds = updateLegend(grid, config);
        const provenance = [
          config.datasetId,
          grid.provider,
          grid.product,
          grid.qualityStatus ? `Quality: ${grid.qualityStatus}` : null,
          grid.sourceUrl ? `Source: ${grid.sourceUrl}` : null
        ].filter(Boolean);
        source.textContent = provenance.join(' · ');
        const unit = grid.units || 'source units not supplied';
        rangeValue.textContent = `${formatFieldValue(grid.min)} — ${formatFieldValue(grid.max)}`;
        rangeUnit.textContent = `Current global range · ${unit}`;
        metric.replaceChildren();
        makeMetric('Grid dimensions', `${grid.definition.width} × ${grid.definition.height}`, 'cells');
        makeMetric('Valid cells', grid.validCount.toLocaleString(), `of ${(grid.definition.width * grid.definition.height).toLocaleString()}`);
        makeMetric('Observed / valid time', formatTime(grid.observedAt));
        makeMetric('Snapshot published', formatTime(grid.retrievedAt));
        makeMetric('Verified range', `${formatFieldValue(grid.min)} to ${formatFieldValue(grid.max)}`, unit);
        if (closed || controller.signal.aborted || !runtime.isActive(WORLD.id)) return;
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe is not ready.');
        layerDispose = worldGlobe.attachLayer(`composition-${datasetKey}`, ({ THREE, earth }) => {
          if (!THREE?.Group || !earth?.add) throw new Error('The Earth Engine did not provide its Three.js globe surface.');
          gridRoot = new THREE.Group();
          gridRoot.name = `liveEarth-composition-${datasetKey}-grid-layer`;
          gridHandle = window.LiveEarthGpuGridSkin.create({
            THREE,
            grid,
            radius: 1.009,
            opacity: 0.80,
            min: bounds.min,
            max: bounds.max,
            colorStops: paletteStops(PALETTES[datasetKey]),
            contourInterval: 0,
            contourStrength: 0.14,
            contourColor: [0.12, 0.10, 0.15],
            name: `ATMOSPHERIC-COMPOSITION-${datasetKey}`
          });
          gridRoot.add(gridHandle.mesh);
          earth.add(gridRoot);
          return () => {
            try { gridHandle?.dispose?.(); } catch (_) {}
            gridHandle = null;
            try { gridRoot?.removeFromParent?.(); } catch (_) {}
            gridRoot = null;
          };
        });
        if (closed || controller.signal.aborted) {
          layerDispose?.();
          layerDispose = null;
          return;
        }
        if (typeof layerDispose !== 'function') throw new Error(`The ${config.label.toLowerCase()} grid layer could not attach.`);
        view.root.dataset.gridRenderingSkin = 'gpu-ready';
        view.root.dataset.gridData = `central-database-${datasetKey}`;
        clearStatus();
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && !controller.signal.aborted && runtime.isActive(WORLD.id)) {
          removeActiveLayer();
          setSelectedDataset(null);
          details.hidden = true;
          source.hidden = true;
          scaleDock.hidden = true;
          showStatus(`${config.label} data could not be displayed. The base globe remains active. ${error?.message || ''}`, 'error');
        }
      } finally {
        if (dataRequest === controller) {
          dataRequest = null;
          if (button) button.disabled = false;
        }
      }
    }

    engineReady = initializeEngineView(view, WORLD.id).then(globe => {
      if (closed || !runtime.isActive(WORLD.id)) {
        globe?.dispose?.();
        return null;
      }
      if (!globe || typeof globe.attachLayer !== 'function') throw new Error('The Earth Engine globe could not be created.');
      worldGlobe = globe;
      view.root.dataset.globeEngine = 'ready';
      globe.requestRender?.();
      return globe;
    }).catch(error => {
      if (!closed && runtime.isActive(WORLD.id)) {
        showStatus(`The Earth Engine globe could not open. ${error?.message || ''}`, 'error');
      }
      throw error;
    });
    // Avoid an unhandled rejection when the globe fails before a field is selected.
    engineReady.catch(() => {});

    return cleanup;
  }

  if (runtime.registerFeature(WORLD.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-world-controller-ready', {
      detail: { id: WORLD.id }
    }));
  }
})();
