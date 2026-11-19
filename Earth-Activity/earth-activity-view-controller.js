/* LIVE // EARTH — Earth Activity View Controller.
   Owns the numerical grid-rendering skin only while this world view is open.
   No fabricated values, data requests or persistent state are created here. */
(() => {
  'use strict';
  const flag = '__liveEarthEarthactivityViewControllerInstalled';
  if (window[flag]) return;

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Earth Activity controller is waiting for the feature-view runtime.');
    return;
  }

  const WORLD = {
    id: 'earth-activity',
    title: 'Earth Activity',
    symbol: '✧',
    message: 'Verified geophysical and environmental measurements will appear here after the database and approved data sources are connected.'
  };

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


  function activateView() {
    const view = runtime.mount(WORLD.id);
    if (!view) return () => {};

    const status = runtime.el('p', 'le-sfv-status', 'Preparing the shared globe-rendering skin…');
    status.dataset.state = 'neutral';
    view.body.appendChild(status);

    let closed = false;
    let layerDispose = null;
    let worldGlobe = null;
    let gridRoot = null;
    let gridHandle = null;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      try { gridHandle?.dispose?.(); } catch (_) {}
      gridHandle = null;
      try { layerDispose?.(); } catch (error) {
        console.warn(`[LIVE // EARTH] ${WORLD.id} grid layer cleanup failed.`, error);
      }
      layerDispose = null;
      if (gridRoot) {
        try { gridRoot.removeFromParent?.(); } catch (_) {}
        gridRoot = null;
      }
      try { worldGlobe?.dispose?.(); } catch (error) { console.warn(`[LIVE // EARTH] ${WORLD.id} Engine globe cleanup failed.`, error); }
      worldGlobe = null;
    };

    (async () => {
      try {
        await loadSharedGridTools();
        if (closed || !runtime.isActive(WORLD.id)) return;

        worldGlobe = await initializeEngineView(view, WORLD.id);
        if (closed || !runtime.isActive(WORLD.id)) { worldGlobe?.dispose?.(); worldGlobe = null; return; }
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') {
          throw new Error('The Earth Engine globe could not be created.');
        }

        layerDispose = worldGlobe.attachLayer(WORLD.id, ({ THREE, earth }) => {
          if (!THREE?.Group || !earth?.add) {
            throw new Error('The Earth Engine did not provide its Three.js globe surface.');
          }
          gridRoot = new THREE.Group();
          gridRoot.name = `liveEarth-${WORLD.id}-numerical-grid-layer`;
          earth.add(gridRoot);

          // A verified dataset adapter will create the mesh with:
          // LiveEarthGpuGridSkin.create({ THREE, grid, ... })
          // and add the returned mesh to this view-owned group.
          return () => {
            try { gridHandle?.dispose?.(); } catch (_) {}
            gridHandle = null;
            try { gridRoot?.removeFromParent?.(); } catch (_) {}
            gridRoot = null;
          };
        });

        if (closed) {
          layerDispose?.();
          layerDispose = null;
          return;
        }
        if (typeof layerDispose !== 'function') {
          throw new Error('The numerical grid layer could not attach to this world’s Engine globe.');
        }

        view.root.dataset.gridRenderingSkin = 'gpu-ready';
        runtime.setStatus(status,
          'Earth Engine + Universal Grid System + GPU Grid Skin ready · waiting for a verified dataset adapter. No sample or placeholder measurements are displayed.',
          'success');
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && runtime.isActive(WORLD.id)) {
          runtime.setStatus(status,
            `Grid rendering is unavailable. The original Earth remains unchanged. ${error?.message || ''}`,
            'error');
        }
      }
    })();

    return cleanup;
  }

  if (runtime.registerFeature(WORLD.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-world-controller-ready', {
      detail: { id: WORLD.id }
    }));
  }
})();
