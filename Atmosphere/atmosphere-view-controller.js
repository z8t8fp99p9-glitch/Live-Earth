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
  const MANIFEST_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/Data/Central-Database/published/atmosphere/manifest.json';
  // Temperature uses an expanded cold-to-hot scale. The original deep blue
  // remains anchored at -60 C; values below it progress into midnight blues.
  // The original green and gold identity is retained; values above 45 C deepen
  // through crimson to burgundy at +60 C. GPU renderer remains unchanged.
  const TEMPERATURE_COLOR_STOPS = [
    [0.000000, 0.0314, 0.0510, 0.1725], // -80 C · midnight navy
    [0.071429, 0.0627, 0.1098, 0.3137], // -70 C · polar indigo
    [0.142857, 0.1255, 0.2314, 0.5412], // -60 C · original deep blue
    [0.321429, 0.0863, 0.5373, 0.7216], // -35 C · original blue-cyan
    [0.500000, 0.2706, 0.7255, 0.4706], // -10 C · original green
    [0.678571, 0.9412, 0.7765, 0.2941], // +15 C · original gold
    [0.821429, 0.9412, 0.3922, 0.1608], // +35 C · orange
    [0.892857, 0.7843, 0.2471, 0.2118], // +45 C · original red
    [0.946429, 0.5451, 0.0824, 0.1647], // +52.5 C · deep crimson
    [1.000000, 0.2706, 0.0157, 0.0902]  // +60 C · dark burgundy
  ];
  const TEMPERATURE_LEGEND = 'linear-gradient(90deg,#080d2c 0%,#101c50 7.1429%,#203b8a 14.2857%,#1689b8 32.1429%,#45b978 50%,#f0c64b 67.8571%,#f06429 82.1429%,#c83f36 89.2857%,#8b152a 94.6429%,#450417 100%)';
  const SCRIPT_PATHS = ['./EarthEngine/Graphics/universal-grid-system.js','./EarthEngine/Graphics/earth-grid-gpu-skin.js'];

  function installHudStyle() {
    if (document.getElementById('le-atmosphere-cinematic-hud')) return;
    const style = document.createElement('style');
    style.id = 'le-atmosphere-cinematic-hud';
    style.textContent = `
      /* Atmosphere-only controls: flat surfaces, no decorative effects. */
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-panel {
        background:transparent !important;
        backdrop-filter:none !important;
        -webkit-backdrop-filter:none !important;
        overflow:visible;
        padding:calc(env(safe-area-inset-top) + 12px) 14px 0;
      }
      .le-sfv--atmosphere .le-sfv-head { display:none !important; }
      .le-sfv--atmosphere .le-sfv-status[hidden],
      .le-sfv--atmosphere .le-atmo-dataset-card[hidden] { display:none !important; }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body {
        display:flex; flex-direction:column; justify-content:flex-end; align-items:stretch;
        box-sizing:border-box; width:min(100%,760px); margin:auto auto 0;
        min-height:0; max-height:min(38dvh,330px); overflow-y:auto; overflow-x:hidden;
        overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
        padding:8px 0 calc(env(safe-area-inset-bottom) + 128px);
        scrollbar-width:none;
      }
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-body::-webkit-scrollbar { display:none; }
      @media (orientation:landscape) {
        .le-sfv--atmosphere.le-world-engine-host .le-sfv-body { max-height:min(48dvh,280px); }
      }
      .le-atmo-hud-toggle {
        position:absolute; z-index:6; top:calc(env(safe-area-inset-top) + 14px);
        right:max(14px,env(safe-area-inset-right));
        display:grid; place-items:center; width:44px; height:44px; min-height:44px;
        padding:0; border:1px solid rgba(205,230,245,.8); border-radius:50%;
        color:#f4f8fb; background:#173047; font-family:inherit; font-size:23px;
        font-weight:500; line-height:1; cursor:pointer; touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;
      }
      .le-atmo-hud-toggle:focus-visible,
      .le-atmo-dataset-option:focus-visible,
      .le-atmo-details summary:focus-visible { outline:2px solid #b9e6fa; outline-offset:3px; }
      .le-sfv--atmosphere .le-sfv-status {
        display:block; width:fit-content; max-width:100%; margin:0 auto 8px;
        padding:5px 9px; border:1px solid rgba(180,220,240,.35); border-radius:8px;
        color:#e8f2f8; background:rgba(5,15,25,.82); font-size:10px; line-height:1.35;
        text-shadow:none;
      }
      .le-sfv--atmosphere .le-sfv-card,
      .le-sfv--atmosphere.le-world-engine-host .le-sfv-card {
        border:0 !important; border-radius:0 !important; box-shadow:none !important;
        background:transparent !important; backdrop-filter:none !important;
        -webkit-backdrop-filter:none !important;
      }
      .le-sfv--atmosphere .le-atmo-dataset-card {
        width:100%; margin:0 auto 10px; padding:0; text-align:center;
      }
      .le-sfv--atmosphere .le-atmo-dataset-card h2,
      .le-sfv--atmosphere .le-atmo-dataset-card > p { display:none !important; }
      .le-atmo-dataset-grid {
        display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
        justify-items:center; align-items:center; gap:clamp(5px,2vw,12px);
        width:100%;
      }
      .le-atmo-dataset-option:nth-child(1) { grid-column:1; }
      .le-atmo-dataset-option:nth-child(3) { grid-column:2; }
      .le-atmo-dataset-option:nth-child(2) { grid-column:3; }
      .le-atmo-dataset-option:nth-child(4) { grid-column:4; }
      .le-atmo-dataset-option {
        appearance:none; display:flex; flex-direction:column; align-items:center;
        justify-content:center; gap:3px; width:clamp(54px,17vw,72px);
        height:clamp(54px,17vw,72px); min-height:0; padding:4px;
        border:1px solid rgba(225,240,250,.78); border-radius:50%;
        color:#fff; font:inherit; text-align:center; cursor:pointer;
        background:#24445c; box-shadow:none; filter:none; transform:none;
        -webkit-tap-highlight-color:transparent;
      }
      .le-atmo-dataset-option::before {
        content:attr(data-orb-symbol); display:block; color:#fff;
        font-size:clamp(15px,4.5vw,21px); line-height:1;
      }
      .le-atmo-dataset-option[data-dataset="temperature"] { background:#9a4c28; }
      .le-atmo-dataset-option[data-dataset="wind"] { background:#155d83; }
      .le-atmo-dataset-option[data-dataset="pressure"] { background:#51468d; }
      .le-atmo-dataset-option[data-dataset="moisture"] { background:#08717c; }
      .le-atmo-dataset-option.is-selected { border:2px solid #fff; }
      .le-atmo-dataset-option:disabled { opacity:.55; cursor:wait; }
      .le-atmo-dataset-name {
        display:block; max-width:100%; color:#fff; font-size:clamp(8px,2.2vw,10px);
        font-weight:650; line-height:1.1; overflow-wrap:anywhere;
      }
      .le-atmo-dataset-detail,.le-atmo-dataset-state { display:none !important; }
      .le-atmo-scale-card { width:100%; margin:0 auto; padding:0 !important; }
      .le-atmo-scale-card > h2, .le-atmo-scale-card > p { display:none !important; }
      .le-atmo-scale-strip { display:flex; align-items:center; gap:9px; width:100%; }
      .le-atmo-legend-bar {
        flex:1 1 auto; min-width:0; height:5px; border-radius:999px;
        background:linear-gradient(90deg,#203b8a,#1689b8,#45b978,#f0c64b,#f06429,#c83f36);
      }
      .le-atmo-details { flex:0 0 auto; margin:0; padding:0; border:0; }
      .le-atmo-details summary {
        list-style:none; display:grid; place-items:center; width:32px; height:32px;
        border:1px solid rgba(205,230,245,.8); border-radius:50%; color:#fff;
        background:#173047; cursor:pointer; font-size:21px; font-weight:400; line-height:1;
      }
      .le-atmo-details summary::-webkit-details-marker { display:none; }
      .le-atmo-details summary::after { content:none !important; }
      .le-atmo-scale-expanded {
        margin-top:8px; padding:9px 10px; border:1px solid rgba(170,205,225,.28);
        border-radius:8px; background:rgba(3,12,22,.82); color:#e8f2f8;
      }
      .le-atmo-range { display:flex; align-items:baseline; flex-wrap:wrap; gap:5px 10px; }
      .le-atmo-range strong { color:#fff; font-size:clamp(18px,5vw,24px); font-weight:650; }
      .le-atmo-range span { color:#c2d4df; font-size:10px; }
      .le-atmo-legend { margin-top:8px; }
      .le-atmo-legend-title { display:block; margin-bottom:5px; color:#d5e6ef; font-size:10px; }
      .le-atmo-legend-ticks { display:flex; justify-content:space-between; gap:5px; margin-top:5px; color:#d1e0e8; font-size:9px; font-variant-numeric:tabular-nums; }
      .le-sfv--atmosphere .le-sfv-metric-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:9px; }
      .le-sfv--atmosphere .le-sfv-metric { padding:7px 8px; border:1px solid rgba(170,205,225,.20); border-radius:6px; background:rgba(12,28,42,.72); }
      .le-sfv--atmosphere .le-sfv-metric-label { display:block; margin-bottom:3px; color:#b7cbd8; font-size:8px; }
      .le-sfv--atmosphere .le-sfv-metric-value { color:#fff; font-size:12px; }
      .le-sfv--atmosphere .le-sfv-attribution { margin:8px 0 0; color:#b7cbd8; font-size:9px; }
      @media (max-width:340px) {
        .le-atmo-dataset-grid { gap:3px; }
        .le-atmo-dataset-option { width:52px; height:52px; }
        .le-atmo-dataset-name { font-size:8px; }
      }
      @media (prefers-reduced-motion:reduce) {
        .le-atmo-hud-toggle,.le-atmo-dataset-option { transition:none !important; }
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
  // Match Moon and Sun: display each absolute timestamp in the device's
  // local timezone. The source instant remains UTC and is never shifted.
  function formatTime(value) {
    if (!value) return 'Time unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Time unavailable'
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  // This controller calls the shared Earth Engine directly and owns its view renderer.
async function initializeEngineView(view, viewId) {
  if (!view?.root || !view?.panel || !viewId) throw new TypeError("A mounted world view and stable world id are required.");
  const T = await import("../vendor/three.module.js");
  const engine = await import("../EarthEngine/Core/earth-engine.js");
  const { createCountryBordersSkin } = await import("./country-borders-skin.js");
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
  let countryBorders = null;
  let gestureController = null;
  let locationMarker = null;
  let locationHalo = null;
  let locationDot = null;
  let locationVector = null;
  let disposed = false;
  let renderQueued = false;
  let resizeObserver = null;
  let defaultCameraDistance = 3.15;
  const ATMOSPHERE_MAX_ZOOM = 3;
  let zoomFactor = 1;
  const layers = new Map();
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

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
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
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

    // Country boundaries are an Atmosphere-only overlay. Attach them to the
    // surface so they inherit its base texture alignment and globe rotation.
    try {
      countryBorders = await createCountryBordersSkin({
        THREE: T,
        earthGroup: earthGlobe.surface,
        // Hug the satellite surface (radius 1.000) with only 0.0015 clearance.
        // This prevents the country overlay from protruding beyond the globe limb.
        radius: 1.0015,
        color: 0x3a5568,
        opacity: 0.20,
        lineWidth: 0.0048,
        renderOrder: 10
      });
      if (countryBorders) root.dataset.countryBorders = "natural-earth-50m";
    } catch (error) {
      console.warn("[LIVE // EARTH] Atmosphere country borders could not be loaded; the base globe will remain available.", error);
    }
    if (disposed) {
      countryBorders?.dispose?.(); countryBorders = null;
      earthGlobe.dispose();
      throw new Error("The Atmosphere view closed while its globe was loading.");
    }

    // Match the Home Earth location marker: a small red halo and dot attached
    // directly to this view's Earth surface, so it follows every globe rotation.
    locationVector = new T.Vector3();
    locationMarker = new T.Group();
    locationMarker.name = "liveEarthAtmosphereLocationMarker";
    locationHalo = new T.Mesh(
      new T.SphereGeometry(0.031, 16, 12),
      new T.MeshBasicMaterial({
        color: 0xff234d, transparent: true, opacity: 0.28,
        depthTest: false, depthWrite: false
      })
    );
    locationDot = new T.Mesh(
      new T.SphereGeometry(0.014, 16, 12),
      new T.MeshBasicMaterial({
        color: 0xff183f, depthTest: false, depthWrite: false
      })
    );
    // The universal temperature skin renders at order 4. Draw the Home-style
    // location marker afterward so the data surface cannot cover it.
    locationHalo.renderOrder = 20;
    locationDot.renderOrder = 21;
    locationMarker.add(locationHalo, locationDot);
    locationMarker.visible = false;
    earthGlobe.surface.add(locationMarker);

    function syncAtmosphereLocation() {
      const fix = window.liveEarthGetLocationState?.() === true
        ? window.liveEarthGetLocationFix?.()
        : null;
      if (!fix || !locationMarker || !locationVector) {
        if (locationMarker) locationMarker.visible = false;
        requestRender();
        return;
      }
      const phi = fix.latitude * Math.PI / 180;
      const lambda = fix.longitude * Math.PI / 180;
      locationVector.set(
        Math.cos(phi) * Math.cos(lambda),
        Math.sin(phi),
        -Math.cos(phi) * Math.sin(lambda)
      ).normalize();
      locationHalo.position.copy(locationVector).multiplyScalar(1.006);
      locationDot.position.copy(locationVector).multiplyScalar(1.019);
      locationMarker.visible = true;
      requestRender();
    }
    window.addEventListener("live-earth-location-fix", syncAtmosphereLocation);
    window.addEventListener("live-earth-location-state", syncAtmosphereLocation);
    syncAtmosphereLocation();

    // Atmosphere owns its gestures. A geographic surface point is picked once
    // on pointer-down; every drag move rotates the globe until that same local
    // point intersects the camera ray beneath the finger.
    gestureController = (() => {
      const raycaster = new T.Raycaster();
      const pointerNdc = new T.Vector2();
      const anchorLocal = new T.Vector3();
      const anchorWorld = new T.Vector3();
      const targetWorld = new T.Vector3();
      const sphere = new T.Sphere(new T.Vector3(0, 0, 0), 1.001);
      const deltaRotation = new T.Quaternion();
      // Match Home/Earth's shared north-south tilt limits. Horizontal heading
      // remains unrestricted; only the globe's vertical tilt is clamped.
      const MIN_GLOBE_TILT = -1.15;
      const MAX_GLOBE_TILT = 1.15;
      const worldXAxis = new T.Vector3(1, 0, 0);
      const localYAxis = new T.Vector3(0, 1, 0);
      const tiltRotation = new T.Quaternion();
      const headingRotation = new T.Quaternion();
      const pointers = new Map();
      let activePointerId = null;
      let pinchStartDistance = 0;
      let pinchStartZoom = 1;
      let hasAnchor = false;

      const isEnabled = () => !disposed && root.isConnected && runtime.isActive(viewId);
      const updatePointerRay = (x, y) => {
        const rect = canvas.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) return false;
        pointerNdc.set(
          ((x - rect.left) / rect.width) * 2 - 1,
          -((y - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(pointerNdc, camera);
        return true;
      };
      const pickSurfacePoint = (x, y, target) => {
        if (!updatePointerRay(x, y)) return false;
        const hits = raycaster.intersectObject(earthGlobe.surface, true);
        if (!hits.length) return false;
        earthGlobe.group.updateMatrixWorld(true);
        target.copy(hits[0].point);
        earthGlobe.group.worldToLocal(target);
        return target.lengthSq() > 0;
      };
      const pointerRayToSphere = (x, y, target) => {
        if (!updatePointerRay(x, y)) return false;
        const hit = raycaster.ray.intersectSphere(sphere, target);
        if (!hit) return false;
        target.normalize();
        return true;
      };
      const clampGlobeTilt = () => {
        const q = earthGlobe.group.quaternion;
        // Decompose using the same q = qX(tilt) * qY(heading) convention
        // used by Earth Engine's standard globe gestures.
        const headingHalf = Math.atan2(q.y, q.w);
        const sinHalfTilt = q.x * Math.cos(headingHalf) + q.z * Math.sin(headingHalf);
        const cosHalfTilt = Math.hypot(q.w, q.y);
        const tilt = 2 * Math.atan2(sinHalfTilt, cosHalfTilt);
        const boundedTilt = Math.max(MIN_GLOBE_TILT, Math.min(MAX_GLOBE_TILT, tilt));
        const heading = 2 * headingHalf;

        // Rebuild without roll so the poles can never turn over, while heading
        // can continue through a complete 360 degrees in either direction.
        tiltRotation.setFromAxisAngle(worldXAxis, boundedTilt);
        headingRotation.setFromAxisAngle(localYAxis, heading);
        q.copy(tiltRotation).multiply(headingRotation).normalize();
      };
      const pointerDistance = () => {
        const values = [...pointers.values()];
        if (values.length < 2) return 0;
        return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
      };
      const setZoom = value => {
        zoomFactor = Math.max(1, Math.min(ATMOSPHERE_MAX_ZOOM, value));
        camera.position.z = defaultCameraDistance / zoomFactor;
        camera.lookAt(0, 0, 0);
        requestRender();
      };
      const beginAnchor = pointer => {
        hasAnchor = pickSurfacePoint(pointer.x, pointer.y, anchorLocal);
        activePointerId = hasAnchor ? pointer.id : null;
      };
      const onPointerDown = event => {
        if (!isEnabled()) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
        if (pointers.size === 1) {
          beginAnchor(pointers.get(event.pointerId));
        } else if (pointers.size === 2) {
          hasAnchor = false;
          activePointerId = null;
          pinchStartDistance = Math.max(1, pointerDistance());
          pinchStartZoom = zoomFactor;
        }
        event.preventDefault();
      };
      const onPointerMove = event => {
        if (!isEnabled() || !pointers.has(event.pointerId)) return;
        const pointer = pointers.get(event.pointerId);
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (pointers.size >= 2) {
          const distance = pointerDistance();
          if (pinchStartDistance > 0) setZoom(pinchStartZoom * distance / pinchStartDistance);
          event.preventDefault();
          return;
        }
        if (pointers.size !== 1 || event.pointerId !== activePointerId || !hasAnchor) return;
        if (!pointerRayToSphere(pointer.x, pointer.y, targetWorld)) return;

        earthGlobe.group.updateMatrixWorld(true);
        anchorWorld.copy(anchorLocal).applyQuaternion(earthGlobe.group.quaternion).normalize();
        deltaRotation.setFromUnitVectors(anchorWorld, targetWorld);
        earthGlobe.group.quaternion.premultiply(deltaRotation).normalize();
        clampGlobeTilt();
        earthGlobe.group.updateMatrixWorld(true);
        requestRender();
        event.preventDefault();
      };
      const onPointerUp = event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.delete(event.pointerId);
        try { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch (_) {}
        hasAnchor = false;
        activePointerId = null;
        if (pointers.size === 1) {
          const remaining = [...pointers.values()][0];
          beginAnchor(remaining);
        } else if (pointers.size >= 2) {
          pinchStartDistance = Math.max(1, pointerDistance());
          pinchStartZoom = zoomFactor;
        }
      };
      const onPointerCancel = event => onPointerUp(event);
      canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
      canvas.addEventListener("pointermove", onPointerMove, { passive: false });
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerCancel);
      canvas.addEventListener("lostpointercapture", onPointerCancel);
      return {
        dispose() {
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerCancel);
          canvas.removeEventListener("lostpointercapture", onPointerCancel);
          pointers.clear();
          hasAnchor = false;
        }
      };
    })();
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
      window.removeEventListener("live-earth-location-fix", syncAtmosphereLocation);
      window.removeEventListener("live-earth-location-state", syncAtmosphereLocation);
      gestureController?.dispose?.(); gestureController = null;
      for (const id of [...layers.keys()]) removeLayer(id);
      if (locationMarker?.parent) locationMarker.parent.remove(locationMarker);
      locationHalo?.geometry?.dispose?.(); locationHalo?.material?.dispose?.();
      locationDot?.geometry?.dispose?.(); locationDot?.material?.dispose?.();
      locationMarker = null; locationHalo = null; locationDot = null; locationVector = null;
      countryBorders?.dispose?.(); countryBorders = null;
      delete root.dataset.countryBorders;
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
      setCountryBordersStyle(style) {
        countryBorders?.setStyle?.(style);
        requestRender();
      },
      requestRender,
      dispose
    });
  } catch (error) {
    disposed = true;
    resizeObserver?.disconnect();
    gestureController?.dispose?.();
    countryBorders?.dispose?.(); countryBorders = null;
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
    // Start with the globe unobstructed. The Atmosphere-only round button
    // reveals the existing datasets, colour scale and provenance on demand.
    // Global Orbs and their shared dock remain owned by the existing runtime.
    const hudToggle = runtime.el('button', 'le-atmo-hud-toggle', '☰');
    hudToggle.type = 'button';
    hudToggle.setAttribute('aria-controls', 'le-atmo-dataset-selector');
    hudToggle.setAttribute('aria-expanded', 'false');
    hudToggle.setAttribute('aria-label', 'Show Atmosphere datasets');
    hudToggle.title = 'Show Atmosphere datasets';
    view.root.appendChild(hudToggle);
    const status = runtime.el('p', 'le-sfv-status', 'Opening the Earth Engine globe…');
    status.dataset.state = 'neutral';
    status.hidden = true;
    view.body.appendChild(status);

    const selector = runtime.card('Atmosphere datasets', 'Choose a verified NOAA atmospheric field to render on the globe. Composition is available in its own World.');
    selector.classList.add('le-atmo-dataset-card');
    selector.id = 'le-atmo-dataset-selector';
    selector.hidden = true;
    const datasetGrid = runtime.el('div', 'le-atmo-dataset-grid');
    const datasetOptions = [
      { id: 'temperature', label: 'Temperature', detail: '2 m air temperature · NOAA GFS' },
      { id: 'wind', label: 'Wind', detail: '10 m wind speed + direction · U/V' },
      { id: 'pressure', label: 'Pressure', detail: 'Mean sea-level pressure · kPa' },
      { id: 'moisture', label: 'Moisture', detail: '2 m relative humidity · %' }
    ];
    const FIELD_CONFIG = {
      temperature: { ids: ['earth.atmosphere.air_temperature'], title: 'NOAA · 2 m air temperature', units: 'degree_Celsius', displayUnits: '°C', min: -80, max: 60, ticks: ['−80°','−60°','−10°','45°','60°'], source: 'NOAA NCEP · GFS 0.25° analysis · 2 m air temperature' },
      pressure: { ids: ['earth.atmosphere.atmospheric_pressure'], title: 'NOAA · Mean sea-level pressure', units: 'kilopascal', displayUnits: 'kPa', min: null, max: null, ticks: null, source: 'NOAA NCEP · GFS 0.25° analysis · mean sea-level pressure' },
      wind: { ids: ['earth.atmosphere.wind_speed','earth.atmosphere.wind_direction'], title: 'NOAA · 10 m wind', units: 'metre_per_second', displayUnits: 'm/s', min: 0, max: null, ticks: null, source: 'NOAA NCEP · GFS 0.25° analysis · 10 m wind speed and direction derived from U/V components' },
      moisture: { ids: ['earth.atmosphere.humidity'], title: 'NOAA · 2 m relative humidity', units: 'percent', displayUnits: '%', min: 0, max: 100, ticks: ['0%','25%','50%','75%','100%'], source: 'NOAA NCEP · GFS 0.25° analysis · 2 m relative humidity' }
    };
    const datasetButtons = new Map();
    let selectedDataset = null;
    for (const item of datasetOptions) {
      const button = runtime.el('button', 'le-atmo-dataset-option');
      button.type = 'button';
      button.dataset.dataset = item.id;
      button.dataset.orbSymbol = ({ temperature: '°', pressure: '◉', wind: '↗', moisture: '≈' })[item.id] || '';
      button.setAttribute('aria-label', `${item.label}. ${item.detail}. Load verified NOAA field.`);
      const name = runtime.el('strong', 'le-atmo-dataset-name', item.label);
      const description = runtime.el('span', 'le-atmo-dataset-detail', item.detail);
      const state = runtime.el('span', 'le-atmo-dataset-state', 'LOAD VERIFIED FIELD');
      button.append(name, description, state);
      datasetGrid.appendChild(button);
      datasetButtons.set(item.id, button);
    }
    selector.appendChild(datasetGrid);
    view.body.appendChild(selector);
    hudToggle.addEventListener('click', () => {
      const hidden = !selector.hidden;
      selector.hidden = hidden;
      const label = hidden ? 'Show Atmosphere datasets' : 'Hide Atmosphere datasets';
      hudToggle.textContent = hidden ? '☰' : '×';
      hudToggle.setAttribute('aria-expanded', String(!hidden));
      hudToggle.setAttribute('aria-label', label);
      hudToggle.title = label;
    });

    // The scale strip stays on screen with the globe. Its plus control reveals
    // the verified range, ticks, metrics and NOAA provenance when requested.
    const details = runtime.el('div', 'le-sfv-card le-atmo-scale-card');
    const scaleStrip = runtime.el('div', 'le-atmo-scale-strip');
    const legendBar = runtime.el('div', 'le-atmo-legend-bar');
    legendBar.style.background = TEMPERATURE_LEGEND;
    scaleStrip.appendChild(legendBar);
    const disclosure = runtime.el('details', 'le-atmo-details');
    const scaleSummary = runtime.el('summary', '', '+');
    scaleSummary.setAttribute('aria-label', 'Show scale details');
    scaleSummary.title = 'Show scale details';
    disclosure.appendChild(scaleSummary);
    disclosure.addEventListener('toggle', () => {
      const open = disclosure.open;
      scaleSummary.textContent = open ? '−' : '+';
      scaleSummary.setAttribute('aria-label', open ? 'Hide scale details' : 'Show scale details');
      scaleSummary.title = open ? 'Hide scale details' : 'Show scale details';
    });
    scaleStrip.appendChild(disclosure);
    details.appendChild(scaleStrip);
    const expanded = runtime.el('div', 'le-atmo-scale-expanded');
    const range = runtime.el('div', 'le-atmo-range');
    const rangeValue = runtime.el('strong', '', '—');
    range.appendChild(rangeValue);
    const rangeUnit = runtime.el('span', '', 'Select a field to load its verified range');
    range.appendChild(rangeUnit);
    expanded.appendChild(range);
    const legend = runtime.el('div', 'le-atmo-legend');
    legend.setAttribute('role', 'group');
    legend.setAttribute('aria-label', 'Selected atmospheric field colour scale');
    const legendTitle = runtime.el('span', 'le-atmo-legend-title', 'Field scale');
    legend.appendChild(legendTitle);
    const legendTicks = runtime.el('div', 'le-atmo-legend-ticks');
    legendTicks.appendChild(runtime.el('span', '', 'NOAA field scale appears after selection'));
    legend.appendChild(legendTicks);
    expanded.appendChild(legend);
    const metric = runtime.el('div', 'le-sfv-metric-grid');
    expanded.appendChild(metric);
    const source = runtime.el('p', 'le-sfv-attribution', 'NOAA NCEP · Global Forecast System · 0.25° analysis');
    expanded.appendChild(source);
    disclosure.appendChild(expanded);
    details.appendChild(disclosure);
    view.body.appendChild(details);

    let closed = false, layerDispose = null, gridHandle = null, windArrowsHandle = null, gridRoot = null, worldGlobe = null;
    let dataRequest = null;
    function removeActiveLayer() {
      if (typeof layerDispose === 'function') {
        const dispose = layerDispose;
        layerDispose = null;
        dispose();
      }
      try { windArrowsHandle?.dispose?.(); } catch (_) {}
      windArrowsHandle = null;
      try { gridHandle?.dispose?.(); } catch (_) {}
      gridHandle = null;
      try { gridRoot?.removeFromParent?.(); } catch (_) {}
      gridRoot = null;
      delete view.root.dataset.gridData;
    }

    const cleanup = () => {
      if (closed) return;
      closed = true;
      document.body.classList.remove('le-atmosphere-fullscreen-open');
      hudToggle.remove();
      dataRequest?.abort();
      removeActiveLayer();
      try { worldGlobe?.dispose?.(); } catch (error) { console.warn('[LIVE // EARTH] Atmosphere Engine globe cleanup failed.', error); }
      worldGlobe = null;
    };

    function setSelectedDataset(id) {
      selectedDataset = id;
      if (worldGlobe?.setCountryBordersStyle) {
        if (id === "temperature") {
          // Temperature overlay sits at renderOrder 4. Keep borders beneath it.
          worldGlobe.setCountryBordersStyle({ color: 0x263746, opacity: 0.32, renderOrder: 3 });
        } else if (id) {
          // Other atmospheric fields retain the subdued satellite guide style.
          worldGlobe.setCountryBordersStyle({ color: 0x3a5568, opacity: 0.32, renderOrder: 10 });
        }
      }
      for (const [key, button] of datasetButtons) {
        const active = key === id;
        button.classList.toggle('is-selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
    }

    function formatFieldValue(value) {
      if (!Number.isFinite(value)) return '—';
      return value.toFixed(1);
    }

    function updateLegend(grid, config) {
      const min = config.min === null ? grid.min : config.min;
      const max = config.max === null ? grid.max : config.max;
      legendTitle.textContent = `${config.title.replace('NOAA · ','')} · ${config.displayUnits}`;
      if (legendBar) legendBar.style.background = config === FIELD_CONFIG.temperature ? TEMPERATURE_LEGEND : '';
      legendTicks.replaceChildren();
      const ticks = config.ticks || Array.from({ length: 5 }, (_, index) => {
        const value = min + (max - min) * index / 4;
        return `${formatFieldValue(value)} ${config.displayUnits}`;
      });
      for (const tick of ticks) legendTicks.appendChild(runtime.el('span', '', tick));
      return { min, max };
    }

    function makeWindArrows(THREE, earth, directionGrid) {
      const def = directionGrid.definition;
      const values = directionGrid.values;
      const positions = [];
      const rowStep = 36;
      const colStep = 48;
      const rad = Math.PI / 180;
      for (let y = 18; y < def.height - 18; y += rowStep) {
        const latitude = def.latStart + y * def.latStep;
        const phi = latitude * rad;
        for (let x = 24; x < def.width - 24; x += colStep) {
          const index = y * def.width + x;
          const direction = values[index];
          if (!Number.isFinite(direction)) continue;
          const longitude = def.lonStart + x * def.lonStep;
          const lambda = longitude * rad;
          const normal = new THREE.Vector3(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)).normalize();
          const north = new THREE.Vector3(-Math.sin(phi) * Math.cos(lambda), Math.cos(phi), Math.sin(phi) * Math.sin(lambda)).normalize();
          const east = new THREE.Vector3(-Math.sin(lambda), 0, -Math.cos(lambda)).normalize();
          const bearingTo = ((direction + 180) % 360) * rad;
          const tangent = north.multiplyScalar(Math.cos(bearingTo)).add(east.multiplyScalar(Math.sin(bearingTo))).normalize();
          const side = new THREE.Vector3().crossVectors(normal, tangent).normalize();
          const start = normal.clone().multiplyScalar(1.018);
          const tip = normal.clone().add(tangent.clone().multiplyScalar(0.028)).normalize().multiplyScalar(1.018);
          const headBase = tip.clone().add(tangent.clone().multiplyScalar(-0.009));
          const headLeft = headBase.clone().add(side.clone().multiplyScalar(0.006));
          const headRight = headBase.clone().add(side.clone().multiplyScalar(-0.006));
          positions.push(start.x,start.y,start.z,tip.x,tip.y,tip.z,
            tip.x,tip.y,tip.z,headLeft.x,headLeft.y,headLeft.z,
            tip.x,tip.y,tip.z,headRight.x,headRight.y,headRight.z);
        }
      }
      if (!positions.length) return null;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({ color: 0xe5f8ff, transparent: true, opacity: 0.88, depthTest: true, depthWrite: false });
      const lines = new THREE.LineSegments(geometry, material);
      lines.name = 'liveEarthAtmosphereWindDirectionVectors';
      lines.renderOrder = 9;
      earth.add(lines);
      return { dispose() { lines.removeFromParent(); geometry.dispose(); material.dispose(); } };
    }

    async function selectDataset(datasetKey) {
      if (closed || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
      const config = FIELD_CONFIG[datasetKey];
      if (!config) return;
      if (selectedDataset === datasetKey && layerDispose) {
        dataRequest?.abort(); dataRequest = null;
        removeActiveLayer();
        setSelectedDataset(null);
        disclosure.open = false;
        rangeValue.textContent = '—';
        rangeUnit.textContent = 'Select a field to load its verified range';
        legendTitle.textContent = 'Field scale';
        legendBar.style.background = TEMPERATURE_LEGEND;
        legendTicks.replaceChildren(runtime.el('span', '', 'NOAA field scale appears after selection'));
        metric.replaceChildren();
        source.textContent = 'NOAA NCEP · Global Forecast System · 0.25° analysis';
        status.hidden = true;
        worldGlobe?.requestRender?.();
        return;
      }
      dataRequest?.abort(); dataRequest = null;
      removeActiveLayer();
      setSelectedDataset(datasetKey);
      disclosure.open = false;
      status.hidden = false;
      rangeValue.textContent = 'Loading…';
      rangeUnit.textContent = `${config.title} · verifying NOAA GFS`;
      legendTitle.textContent = `${config.title} · ${config.displayUnits}`;
      legendTicks.replaceChildren();
      source.textContent = config.source + ' · model analysis, not direct instrument readings';
      const controller = new AbortController();
      dataRequest = controller;
      const button = datasetButtons.get(datasetKey);
      button.disabled = true;
      const label = datasetOptions.find(item => item.id === datasetKey).label;
      runtime.setStatus(status, `Loading and verifying NOAA ${label.toLowerCase()} grids…`, 'neutral');
      try {
        await loadSharedGridTools();
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        const grids = await Promise.all(config.ids.map(datasetId => window.LiveEarthUniversalGridSystem.loadSnapshot({
          manifestUrl: MANIFEST_URL, datasetId, signal: controller.signal
        })));
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        const grid = grids[0];
        for (const item of grids) {
          if (item.definition.width !== 1440 || item.definition.height !== 721) throw new Error('A selected NOAA field does not match the approved 1440 × 721 grid.');
        }
        if (grid.units !== config.units) throw new Error(`Expected ${config.units}, received ${grid.units}.`);
        if (datasetKey === 'wind' && grids[1].units !== 'degree') throw new Error(`Expected wind direction in degrees, received ${grids[1].units}.`);
        const bounds = updateLegend(grid, config);
        rangeValue.textContent = `${formatFieldValue(grid.min)} — ${formatFieldValue(grid.max)}`;
        rangeUnit.textContent = `Verified global range · ${config.displayUnits}`;
        metric.replaceChildren();
        const makeMetric = (labelText, value, unit = '') => {
          const item = runtime.el('div', 'le-sfv-metric');
          item.appendChild(runtime.el('span', 'le-sfv-metric-label', labelText));
          const v = runtime.el('strong', 'le-sfv-metric-value', value);
          if (unit) v.appendChild(runtime.el('span', 'le-sfv-metric-unit', ` ${unit}`));
          item.appendChild(v); metric.appendChild(item);
        };
        makeMetric('Grid resolution', '0.25°', 'global');
        makeMetric('Valid cells', grid.validCount.toLocaleString(), 'of ' + (grid.definition.width * grid.definition.height).toLocaleString());
        makeMetric('Observed / valid time', formatTime(grid.observedAt));
        makeMetric('Snapshot published', formatTime(grid.retrievedAt));
        makeMetric('Verified range', `${formatFieldValue(grid.min)} to ${formatFieldValue(grid.max)}`, config.displayUnits);
        if (datasetKey === 'wind') {
          makeMetric('Wind direction range', `${formatFieldValue(grids[1].min)} to ${formatFieldValue(grids[1].max)}`, 'degrees FROM north');
          makeMetric('Wind vectors', '10 m', 'U/V components');
        }
        if (closed || controller.signal.aborted || !runtime.isActive(ATMOSPHERE_VIEW.id)) return;
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe is not ready.');
        layerDispose = worldGlobe.attachLayer(`atmosphere-${datasetKey}`, ({ THREE, earth }) => {
          if (!THREE || !earth?.add) throw new Error('The Earth Engine did not provide its Three.js surface.');
          gridRoot = new THREE.Group();
          gridRoot.name = `liveEarth-atmosphere-${datasetKey}-layer`;
          const colorMin = datasetKey === 'temperature' ? -80 : (datasetKey === 'moisture' ? 0 : bounds.min);
          const colorMax = datasetKey === 'temperature' ? 60 : (datasetKey === 'moisture' ? 100 : bounds.max);
          gridHandle = window.LiveEarthGpuGridSkin.create({
            THREE, grid, radius: 1.009,
            opacity: datasetKey === 'temperature' ? 0.75 : 0.78,
            min: colorMin, max: colorMax,
            colorStops: datasetKey === 'temperature' ? TEMPERATURE_COLOR_STOPS : undefined,
            thermalAura: datasetKey === 'temperature' ? {
              enabled: true,
              expansion: 0.0015,
              intensity: 0.075,
              diffusion: 0.012
            } : undefined,
            contourInterval: datasetKey === 'temperature' ? 5 : 0,
            contourStrength: datasetKey === 'temperature' ? 0.085 : 0.16,
            contourColor: [0.13, 0.10, 0.09],
            name: `NOAA-GFS-${datasetKey}`
          });
          if (datasetKey === 'wind') windArrowsHandle = makeWindArrows(THREE, earth, grids[1]);
          gridRoot.add(gridHandle.mesh);
          if (gridHandle.auraMesh) gridRoot.add(gridHandle.auraMesh);
          earth.add(gridRoot);
          return () => {
            try { windArrowsHandle?.dispose?.(); } catch (_) {}
            windArrowsHandle = null;
            try { gridHandle?.dispose?.(); } catch (_) {}
            gridHandle = null;
            try { gridRoot?.removeFromParent?.(); } catch (_) {}
            gridRoot = null;
          };
        });
        if (closed || controller.signal.aborted) { layerDispose?.(); layerDispose = null; return; }
        if (typeof layerDispose !== 'function') throw new Error(`The verified NOAA ${label.toLowerCase()} layer could not attach.`);
        view.root.dataset.gridRenderingSkin = 'gpu-ready';
        view.root.dataset.gridData = `verified-noaa-gfs-${datasetKey}`;
        status.hidden = true;
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && !controller.signal.aborted && runtime.isActive(ATMOSPHERE_VIEW.id)) {
          removeActiveLayer();
          setSelectedDataset(null);
          disclosure.open = false;
          rangeValue.textContent = '—';
          rangeUnit.textContent = `${label} · verified range unavailable`;
          legendTicks.replaceChildren(runtime.el('span', '', 'Scale unavailable until data verifies'));
          metric.replaceChildren();
          status.hidden = false;
          runtime.setStatus(status, `${label} data could not be displayed. The base globe remains active. ${error?.message || ''}`, 'error');
        }
      } finally {
        if (dataRequest === controller) dataRequest = null;
        button.disabled = false;
      }
    }

    for (const [key, button] of datasetButtons) button.addEventListener('click', () => selectDataset(key));

    (async () => {
      try {
        worldGlobe = await initializeEngineView(view, ATMOSPHERE_VIEW.id);
        if (closed || !runtime.isActive(ATMOSPHERE_VIEW.id)) { worldGlobe?.dispose?.(); worldGlobe = null; return; }
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Earth Engine globe could not be created.');
        view.root.dataset.globeEngine = 'ready';
        status.hidden = true;
        worldGlobe.requestRender?.();
      } catch (error) {
        if (!closed && runtime.isActive(ATMOSPHERE_VIEW.id)) {
          status.hidden = false;
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
