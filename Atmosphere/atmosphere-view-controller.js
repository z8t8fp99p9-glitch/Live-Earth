/* LIVE // EARTH — Atmosphere View Controller.
   First real consumer of the shared Universal Grid System and GPU grid skin.
   Reads only the verified NOAA GFS snapshot; owns its layer only while open.
*/
(() => {
  'use strict';
  const flag = '__liveEarthAtmosphereViewControllerInstalled';
  if (window[flag]) return;
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Atmosphere controller is waiting for the feature-view runtime.');
    return;
  }
  const ATMOSPHERE_VIEW = { id: 'atmosphere', title: 'Atmosphere', symbol: '◉' };
  const MANIFEST_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/atmosphere/manifest.json';
  const DATASET_ID = 'ATMOSPHERE_01';
  const SCRIPT_PATHS = ['./EarthEngine/Graphics/universal-grid-system.js','./EarthEngine/Graphics/earth-grid-gpu-skin.js'];

  function installHudStyle() {
    if (document.getElementById('le-atmosphere-cinematic-hud')) return;
    const style = document.createElement('style');
    style.id = 'le-atmosphere-cinematic-hud';
    style.textContent = `
      /* Atmosphere: keep the centre of the shared globe visually clear. */
      .le-sfv--atmosphere .le-sfv-panel {
        display:flex; flex-direction:column; align-items:stretch;
        overflow:hidden;
        background:transparent;
        backdrop-filter:none; -webkit-backdrop-filter:none;
        padding:calc(env(safe-area-inset-top) + clamp(66px,9vmin,82px))
          clamp(15px,4vw,32px) 0;
      }
      .le-sfv--atmosphere .le-sfv-head { margin-bottom: 9px; }
      .le-atmo-hud-toggle {
        position:absolute; z-index:5; top:calc(env(safe-area-inset-top) + 14px);
        right:max(14px,env(safe-area-inset-right)); min-height:40px;
        padding:9px 13px; border:1px solid rgba(151,210,238,.34);
        border-radius:999px; color:#eaf7ff; background:rgba(4,16,29,.86);
        box-shadow:0 6px 22px rgba(0,0,0,.28); backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px); font-family:inherit;
        font-size:11px; font-weight:650; line-height:1.1;
        cursor:pointer; touch-action:manipulation; pointer-events:auto;
      }
      .le-atmo-hud-toggle:focus-visible { outline:2px solid #80d9f5; outline-offset:3px; }
      .le-sfv--atmosphere .le-sfv-panel.le-atmo-hud-hidden {
        opacity:0; visibility:hidden; pointer-events:none; transition:opacity .2s ease,visibility .2s ease;
      }
      .le-sfv--atmosphere .le-sfv-panel { transition:opacity .2s ease,visibility .2s ease; }

      .le-sfv--atmosphere .le-sfv-pill { margin-bottom: 10px; }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body {
        display:block; box-sizing:border-box; width:min(100%,680px);
        margin:auto auto 0; min-height:0;
        max-height:min(48dvh,540px); overflow-y:auto; overflow-x:hidden;
        overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
        padding-bottom:calc(env(safe-area-inset-bottom) + 144px);
        scrollbar-width:none;
      }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body::-webkit-scrollbar { display:none; }
      @media (orientation:landscape) {
        .le-sfv--atmosphere.le-world-engine-host .le-sfv-body { max-height:min(48dvh,350px); }
      }
      .le-sfv--atmosphere .le-sfv-status {
        display:inline-block; width:auto; max-width:100%; margin:0 0 9px;
        padding:7px 11px; border-radius:999px; font-size:9px; line-height:1.35;
        background:rgba(3,13,24,.54); border-color:rgba(126,228,189,.22);
        backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
      }
      .le-sfv--atmosphere .le-sfv-card {
        padding:13px 15px; border-radius:19px;
        border-color:rgba(159,211,249,.22);
        background:linear-gradient(135deg,rgba(8,22,38,.78),rgba(4,10,20,.72));
        box-shadow:inset 1px 1px 1px rgba(255,255,255,.10),0 12px 34px rgba(0,0,0,.25),0 0 28px rgba(69,169,226,.08);
        backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      }
      .le-sfv--atmosphere .le-sfv-card h2 { margin:0 0 4px; font-size:10px; letter-spacing:.13em; color:#9fc5dc; text-transform:uppercase; }
      .le-atmo-range { display:flex; align-items:baseline; flex-wrap:wrap; gap:5px 10px; }
      .le-atmo-range strong { color:#f2fbff; font-size:clamp(23px,6vw,31px); letter-spacing:-.035em; font-weight:760; }
      .le-atmo-range span { color:#a9c6d8; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }
      .le-atmo-details { margin-top:10px; border-top:1px solid rgba(165,208,235,.14); padding-top:8px; }
      .le-atmo-details summary { list-style:none; cursor:pointer; color:#b7d8e9; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; display:flex; justify-content:space-between; align-items:center; min-height:26px; }
      .le-atmo-details summary::-webkit-details-marker { display:none; }
      .le-atmo-details summary::after { content:'＋'; color:#82d9f5; font-size:15px; }
      .le-atmo-details[open] summary::after { content:'−'; }
      .le-sfv--atmosphere .le-sfv-metric-grid { margin-top:9px; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
      .le-sfv--atmosphere .le-sfv-metric { padding:9px 10px; border-radius:11px; background:rgba(1,8,17,.42); }
      .le-sfv--atmosphere .le-sfv-metric-label { font-size:8px; margin-bottom:4px; }
      .le-sfv--atmosphere .le-sfv-metric-value { font-size:clamp(13px,3.5vw,17px); }
      .le-sfv--atmosphere .le-sfv-attribution { margin:7px 2px 0; font-size:8px; color:#8da9bc; }
      .le-sfv--atmosphere .le-atmo-dataset-card { margin-bottom:9px; }
      .le-atmo-dataset-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
      .le-atmo-dataset-option { appearance:none; display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-width:0; min-height:66px; padding:10px 11px; border:1px solid rgba(130,197,230,.22); border-radius:13px; color:#eaf7ff; text-align:left; background:linear-gradient(145deg,rgba(16,43,65,.82),rgba(4,13,25,.82)); cursor:pointer; font:inherit; transition:border-color .18s ease,background .18s ease,transform .18s ease; }
      .le-atmo-dataset-option:active:not(:disabled) { transform:scale(.985); }
      .le-atmo-dataset-option.is-selected { border-color:rgba(91,222,190,.8); background:linear-gradient(145deg,rgba(15,76,75,.78),rgba(4,24,35,.92)); box-shadow:inset 0 0 0 1px rgba(91,222,190,.14),0 0 18px rgba(62,218,181,.12); }
      .le-atmo-dataset-option:disabled { opacity:.48; cursor:not-allowed; }
      .le-atmo-dataset-name { font-size:12px; letter-spacing:.02em; }
      .le-atmo-dataset-detail { color:#a9c6d8; font-size:9px; line-height:1.35; }
      .le-atmo-dataset-state { margin-top:auto; color:#80d9c1; font-size:7px; font-weight:800; letter-spacing:.1em; }
      .le-atmo-dataset-option.is-unavailable .le-atmo-dataset-state { color:#91a4b4; }
      @media (max-width:360px) { .le-atmo-dataset-grid { grid-template-columns:1fr; } }
      @media (max-height:700px) {
        .le-sfv--atmosphere.le-world-engine-host .le-sfv-body { margin-top:clamp(145px,28vh,230px); }
        .le-sfv--atmosphere .le-sfv-panel { padding-bottom:calc(env(safe-area-inset-bottom) + 112px); }
      }
      @media (orientation:landscape) {
        .le-sfv--atmosphere.le-world-engine-host .le-sfv-body { width:min(70vw,620px); margin-top:clamp(105px,22vh,190px); }
      }
    `;
    document.head.appendChild(style);
  }
  function loadScript(path, ready) {
    if (ready()) return Promise.resolve();
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
  }
  async function loadSharedGridTools() {
    await loadScript(SCRIPT_PATHS[0], () => !!window.LiveEarthUniversalGridSystem?.loadSnapshot);
    await loadScript(SCRIPT_PATHS[1], () => !!window.LiveEarthGpuGridSkin?.create);
  }
  function formatTime(value) {
    if (!value) return 'Time unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
  }
  // This controller calls the shared Earth Engine directly and owns its view renderer.
async function initializeEngineView(view, viewId) {
  if (!view?.root || !view?.panel || !viewId) throw new TypeError("A mounted world view and stable world id are required.");
  const T = await import("../vendor/three.module.js");
  const engine = await import("../EarthEngine/Core/earth-engine.js");
  const createEarthGlobe = engine.createEarthGlobe || engine.createGlobe;
  const getDefaultCameraDistance = engine.getDefaultCameraDistance;
  if (typeof getDefaultCameraDistance !== "function") throw new Error("Earth Engine default framing API is unavailable.");
  if (typeof createEarthGlobe !== "function") throw new Error("The reusable Earth Engine factory is unavailable.");

  const root = view.root;
  root.classList.add("le-world-engine-host");
  const canvas = document.createElement("canvas");
  canvas.className = "le-world-engine-canvas";
  canvas.setAttribute("aria-label", `${viewId} independent interactive Earth globe`);
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
  let defaultCameraDistance = 3.15;
  const ATMOSPHERE_MAX_ZOOM = 2;
  let zoomFactor = 1;
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
    defaultCameraDistance = getDefaultCameraDistance({ width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.75 });
    camera.position.z = defaultCameraDistance / zoomFactor;
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
    defaultCameraDistance = getDefaultCameraDistance({ width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.75 });
    camera.position.set(0, 0, defaultCameraDistance);
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
      enabled: () => !disposed && root.isConnected && runtime.isActive(viewId),
      rotation: { sensitivityX: 0.008, sensitivityY: 0.006, minPitch: -1.25, maxPitch: 1.25 },
      zoom: {
        enabled: true,
        getDistance: () => camera.position.z,
        setDistance: distance => {
          const nextDistance = Math.max(
            defaultCameraDistance / ATMOSPHERE_MAX_ZOOM,
            Math.min(defaultCameraDistance, distance)
          );
          camera.position.z = nextDistance;
          zoomFactor = defaultCameraDistance / nextDistance;
          camera.lookAt(0, 0, 0);
          requestRender();
        },
        minDistance: () => defaultCameraDistance / ATMOSPHERE_MAX_ZOOM,
        maxDistance: () => defaultCameraDistance
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
      try { cleanup(); } catch (error) { console.warn(`[LIVE // EARTH] ${viewId} layer cleanup failed:`, error); }
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
    /* Atmosphere is an exclusive full-screen world, not a transparent Home overlay. */
    body.le-atmosphere-fullscreen-open #scene{visibility:hidden!important;pointer-events:none!important}
    .le-sfv--atmosphere.le-world-engine-host{position:absolute;inset:0;isolation:isolate;background:radial-gradient(ellipse at 50% 43%,#0a1b2b 0%,#030914 58%,#010308 100%);pointer-events:none}
    .le-world-engine-host{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(15,47,75,.22),rgba(2,6,13,.88) 76%)}
    .le-world-engine-canvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;display:block;pointer-events:auto;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}
    .le-world-engine-host .le-sfv-panel{z-index:1;pointer-events:none;overflow:hidden;background:linear-gradient(180deg,rgba(3,12,23,.48),rgba(3,9,18,.16) 48%,rgba(2,7,14,.62));backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
    .le-world-engine-host .le-sfv-head,.le-world-engine-host .le-sfv-body{pointer-events:auto}
    .le-world-engine-host .le-sfv-body{max-height:calc(100% - 150px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .le-world-engine-host .le-sfv-head{ text-shadow:0 2px 18px rgba(0,0,0,.85) }
    .le-world-engine-host .le-sfv-card{background:rgba(4,13,24,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
  `;
  document.head.appendChild(style);
}


  function activateView() {
    installHudStyle();
    const view = runtime.mount(ATMOSPHERE_VIEW.id);
    if (!view) return () => {};
    document.body.classList.add('le-atmosphere-fullscreen-open');

    // The globe is the view's immediate baseline. Scientific tools and data
    // are deliberately not requested until the user chooses a dataset.
    const hudToggle = runtime.el('button', 'le-atmo-hud-toggle', 'Hide controls');
    hudToggle.type = 'button';
    hudToggle.setAttribute('aria-controls', 'le-atmo-hud-panel');
    hudToggle.setAttribute('aria-expanded', 'true');
    hudToggle.addEventListener('click', () => {
      const hidden = view.panel.classList.toggle('le-atmo-hud-hidden');
      hudToggle.textContent = hidden ? 'Show controls' : 'Hide controls';
      hudToggle.setAttribute('aria-expanded', String(!hidden));
      hudToggle.setAttribute('aria-label', hidden ? 'Show Atmosphere controls' : 'Hide Atmosphere controls');
    });
    view.root.appendChild(hudToggle);
    view.panel.id = 'le-atmo-hud-panel';
    const status = runtime.el('p', 'le-sfv-status', 'Opening the Earth Engine globe…');
    status.dataset.state = 'neutral';
    view.body.appendChild(status);

    const selector = runtime.card('Atmosphere datasets', 'Choose a verified atmospheric field to render on the globe. The Earth remains available while datasets load.');
    selector.classList.add('le-atmo-dataset-card');
    const datasetGrid = runtime.el('div', 'le-atmo-dataset-grid');
    const datasetOptions = [
      { id: 'temperature', label: 'Temperature', detail: 'Global air temperature · NOAA GFS', available: true },
      { id: 'pressure', label: 'Pressure', detail: 'Awaiting verified pressure adapter', available: false },
      { id: 'wind', label: 'Wind', detail: 'Awaiting verified wind adapter', available: false },
      { id: 'moisture', label: 'Moisture', detail: 'Awaiting verified moisture adapter', available: false },
      { id: 'composition', label: 'Composition', detail: 'Awaiting verified composition adapter', available: false }
    ];
    const datasetButtons = new Map();
    let selectedDataset = null;
    for (const item of datasetOptions) {
      const button = runtime.el('button', `le-atmo-dataset-option${item.available ? '' : ' is-unavailable'}`);
      button.type = 'button';
      button.disabled = !item.available;
      button.dataset.dataset = item.id;
      const name = runtime.el('strong', 'le-atmo-dataset-name', item.label);
      const description = runtime.el('span', 'le-atmo-dataset-detail', item.detail);
      const state = runtime.el('span', 'le-atmo-dataset-state', item.available ? 'AVAILABLE' : 'COMING WHEN VERIFIED');
      button.append(name, description, state);
      datasetGrid.appendChild(button);
      datasetButtons.set(item.id, button);
    }
    selector.appendChild(datasetGrid);
    view.body.appendChild(selector);

    const details = runtime.card('NOAA · Global air temperature', 'Select Temperature to load the verified GFS field.');
    details.hidden = true;
    const range = runtime.el('div', 'le-atmo-range');
    const rangeValue = runtime.el('strong', '', '—');
    range.appendChild(rangeValue);
    range.appendChild(runtime.el('span', '', 'Verified global range · °C'));
    details.appendChild(range);
    const disclosure = runtime.el('details', 'le-atmo-details');
    disclosure.appendChild(runtime.el('summary', '', 'Data details & provenance'));
    const metric = runtime.el('div', 'le-sfv-metric-grid');
    disclosure.appendChild(metric);
    details.appendChild(disclosure);
    view.body.appendChild(details);
    const source = runtime.el('p', 'le-sfv-attribution', 'NOAA NCEP · Global Forecast System · GFS 0.25° analysis · model analysis, not direct thermometer readings');
    source.hidden = true;
    view.body.appendChild(source);

    let closed = false, layerDispose = null, gridHandle = null, gridRoot = null, worldGlobe = null;
    let dataRequest = null;
    let contourFrame = 0;
    let contourStartedAt = 0;
    const stopContourAnimation = () => {
      if (contourFrame) cancelAnimationFrame(contourFrame);
      contourFrame = 0;
      contourStartedAt = 0;
    };
    const startContourAnimation = () => {
      stopContourAnimation();
      if (!gridHandle?.mesh?.material?.uniforms?.uTime) return;
      contourStartedAt = performance.now();
      const animateContours = now => {
        if (closed || document.hidden || !runtime.isActive(ATMOSPHERE_VIEW.id) ||
            !gridHandle?.mesh?.material?.uniforms?.uTime) {
          contourFrame = 0;
          return;
        }
        gridHandle.mesh.material.uniforms.uTime.value = (now - contourStartedAt) / 1000;
        worldGlobe?.requestRender?.();
        contourFrame = requestAnimationFrame(animateContours);
      };
      contourFrame = requestAnimationFrame(animateContours);
    };
    const onVisibilityChange = () => {
      if (document.hidden) stopContourAnimation();
      else if (gridHandle) startContourAnimation();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const cleanup = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stopContourAnimation();
      document.body.classList.remove('le-atmosphere-fullscreen-open');
      hudToggle.remove();
      dataRequest?.abort();
      try { gridHandle?.dispose?.(); } catch (_) {}
      gridHandle = null;
      try { layerDispose?.(); } catch (error) { console.warn('[LIVE // EARTH] Atmosphere layer cleanup failed.', error); }
      layerDispose = null;
      try { gridRoot?.removeFromParent?.(); } catch (_) {}
      gridRoot = null;
      try { worldGlobe?.dispose?.(); } catch (error) { console.warn('[LIVE // EARTH] Atmosphere Engine globe cleanup failed.', error); }
      worldGlobe = null;
    };

    function setSelectedDataset(id) {
      selectedDataset = id;
      for (const [key, button] of datasetButtons) {
        const active = key === id;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
    }

    async function selectTemperature() {
      if (closed || !runtime.isActive(ATMOSPHERE_VIEW.id) || selectedDataset === 'temperature' && layerDispose) return;
      setSelectedDataset('temperature');
      details.hidden = false;
      source.hidden = false;
      dataRequest?.abort();
      const controller = new AbortController();
      dataRequest = controller;
      runtime.setStatus(status, 'Loading and verifying NOAA temperature data…', 'neutral');
      datasetButtons.get('temperature').disabled = true;
      try {
        await loadSharedGridTools();
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        const grid = await window.LiveEarthUniversalGridSystem.loadSnapshot({
          manifestUrl: MANIFEST_URL, datasetId: DATASET_ID, signal: controller.signal
        });
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        if (grid.definition.width !== 1440 || grid.definition.height !== 721 || grid.units !== 'degree_Celsius') {
          throw new Error('The NOAA grid dimensions or units differ from the approved dataset contract.');
        }

        // Replace only the active dataset skin; never recreate the Engine globe.
        stopContourAnimation();
        if (typeof layerDispose === 'function') {
          layerDispose(); layerDispose = null;
        }
        try { gridHandle?.dispose?.(); } catch (_) {}
        gridHandle = null;
        try { gridRoot?.removeFromParent?.(); } catch (_) {}
        gridRoot = null;

        rangeValue.textContent = `${grid.min.toFixed(1)}° — ${grid.max.toFixed(1)}°`;
        metric.replaceChildren();
        const makeMetric = (label, value, unit = '') => {
          const item = runtime.el('div', 'le-sfv-metric');
          item.appendChild(runtime.el('span', 'le-sfv-metric-label', label));
          const v = runtime.el('strong', 'le-sfv-metric-value', value);
          if (unit) v.appendChild(runtime.el('span', 'le-sfv-metric-unit', ` ${unit}`));
          item.appendChild(v); metric.appendChild(item);
        };
        makeMetric('Grid resolution', '0.25°', 'global');
        makeMetric('Valid cells', grid.validCount.toLocaleString(), 'of ' + (grid.definition.width * grid.definition.height).toLocaleString());
        makeMetric('Observed / valid time', formatTime(grid.observedAt));
        makeMetric('Snapshot published', formatTime(grid.retrievedAt));
        makeMetric('Verified range', `${grid.min.toFixed(1)} to ${grid.max.toFixed(1)}`, '°C');

        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe is not ready.');
        layerDispose = worldGlobe.attachLayer('atmosphere-temperature', ({ THREE, earth }) => {
          if (!THREE || !earth?.add) throw new Error('The Earth Engine did not provide its Three.js surface.');
          gridRoot = new THREE.Group();
          gridRoot.name = 'liveEarth-atmosphere-temperature-layer';
          gridHandle = window.LiveEarthGpuGridSkin.create({
            THREE, grid, radius: 1.009, opacity: 0.86, min: -80, max: 45,
            contours: true, contourStrength: 0.24,
            name: 'NOAA-GFS-2m-air-temperature'
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
        if (closed || controller.signal.aborted) { layerDispose?.(); layerDispose = null; return; }
        if (typeof layerDispose !== 'function') throw new Error('The verified NOAA temperature layer could not attach.');
        view.root.dataset.gridRenderingSkin = 'gpu-ready';
        view.root.dataset.gridData = 'verified-noaa-gfs';
        runtime.setStatus(status, 'Temperature · NOAA grid verified. Isotherm contours show the measured temperature pattern.', 'success');
        startContourAnimation();
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && !controller.signal.aborted && runtime.isActive(ATMOSPHERE_VIEW.id)) {
          runtime.setStatus(status, `Temperature data could not be displayed. The base globe remains active. ${error?.message || ''}`, 'error');
        }
      } finally {
        if (dataRequest === controller) {
          dataRequest = null;
          datasetButtons.get('temperature').disabled = false;
        }
      }
    }

    datasetButtons.get('temperature').addEventListener('click', selectTemperature);

    (async () => {
      try {
        worldGlobe = await initializeEngineView(view, ATMOSPHERE_VIEW.id);
        if (closed || !runtime.isActive(ATMOSPHERE_VIEW.id)) { worldGlobe?.dispose?.(); worldGlobe = null; return; }
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe could not be created.');
        view.root.dataset.globeEngine = 'ready';
        runtime.setStatus(status, 'Earth Engine globe ready · choose an atmospheric dataset to add its live layer.', 'success');
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && runtime.isActive(ATMOSPHERE_VIEW.id)) {
          runtime.setStatus(status, `The Earth Engine globe could not open. ${error?.message || ''}`, 'error');
        }
      }
    })();

    return cleanup;
  }
  if (runtime.registerFeature(ATMOSPHERE_VIEW.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-atmosphere-view-controller-ready', { detail: { id: ATMOSPHERE_VIEW.id } }));
  }
})();
