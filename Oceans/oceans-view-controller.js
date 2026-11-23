/* LIVE // EARTH — Oceans View Controller.
   Uses the shared responsive globe, surface-anchored gestures and live-location marker.
   Owns the numerical grid-rendering skin only while this world view is open.
   Ocean dataset loading remains intentionally deferred; no fabricated values or data requests. */
(() => {
  'use strict';
  const flag = '__liveEarthOceansViewControllerInstalled';
  if (window[flag]) return;

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Oceans controller is waiting for the feature-view runtime.');
    return;
  }

  const WORLD = {
    id: 'oceans',
    title: 'Oceans',
    symbol: '≈',
    message: 'Ocean numerical observations will appear here after the database and approved data sources are connected.'
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

  // Oceans adopts the complete shared globe interaction and framing system from Atmospheric Composition.
async function initializeEngineView(view, worldId) {
  if (!view?.root || !view?.panel || !worldId) throw new TypeError("A mounted world view and stable world id are required.");
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
  canvas.setAttribute("aria-label", `${worldId} independent interactive Earth globe`);
  canvas.setAttribute("role", "img");
  root.insertBefore(canvas, root.firstChild);
  installStyles();

  let renderer = null;
  let scene = null;
  let camera = null;
  let earthGlobe = null;
  let gestureController = null;
  let locationMarker = null;
  let locationHalo = null;
  let locationDot = null;
  let locationVector = null;
  let syncOceansLocation = null;
  let disposed = false;
  let renderQueued = false;
  let resizeObserver = null;
  let defaultCameraDistance = 3.15;
  const OCEANS_MAX_ZOOM = 3;
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
    defaultCameraDistance = getDefaultCameraDistance({ width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.71 });
    camera.position.z = defaultCameraDistance / zoomFactor;
    camera.lookAt(0, 0, 0);
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
    defaultCameraDistance = getDefaultCameraDistance({ width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.71 });
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

    // 03 — Composition-owned marker driven by the shared app-wide live location.
    // This consumes the same location state as Atmosphere; it does not request
    // GPS permission or create a second geolocation watch.
    locationMarker = new T.Group();
    locationMarker.name = "liveEarthOceansLocationMarker";
    locationVector = new T.Vector3();
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
    // Keep the shared location indicator above the active ocean data skin.
    locationHalo.renderOrder = 20;
    locationDot.renderOrder = 21;
    locationMarker.add(locationHalo, locationDot);
    locationMarker.visible = false;
    earthGlobe.surface.add(locationMarker);

    syncOceansLocation = function syncOceansLocation() {
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
    };
    window.addEventListener("live-earth-location-fix", syncOceansLocation);
    window.addEventListener("live-earth-location-state", syncOceansLocation);
    syncOceansLocation();

    // 04 — Match Atmosphere's complete surface-anchored globe interaction.
    // Dragging keeps the picked geographic point beneath the pointer; pinch
    // zoom is admitted only when both pointers begin on the visible globe.
    gestureController = (() => {
      const raycaster = new T.Raycaster();
      const pointerNdc = new T.Vector2();
      const anchorLocal = new T.Vector3();
      const anchorWorld = new T.Vector3();
      const targetWorld = new T.Vector3();
      const sphere = new T.Sphere(new T.Vector3(0, 0, 0), 1.001);
      const deltaRotation = new T.Quaternion();
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

      const isEnabled = () => !disposed && root.isConnected && runtime.isActive(worldId);
      const updatePointerRay = (x, y) => {
        const bounds = canvas.getBoundingClientRect();
        if (!(bounds.width > 0 && bounds.height > 0)) return false;
        pointerNdc.set(((x - bounds.left) / bounds.width) * 2 - 1, -((y - bounds.top) / bounds.height) * 2 + 1);
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
        if (!raycaster.ray.intersectSphere(sphere, target)) return false;
        target.normalize();
        return true;
      };
      const clampGlobeTilt = () => {
        const q = earthGlobe.group.quaternion;
        const headingHalf = Math.atan2(q.y, q.w);
        const sinHalfTilt = q.x * Math.cos(headingHalf) + q.z * Math.sin(headingHalf);
        const cosHalfTilt = Math.hypot(q.w, q.y);
        const tilt = 2 * Math.atan2(sinHalfTilt, cosHalfTilt);
        const boundedTilt = Math.max(MIN_GLOBE_TILT, Math.min(MAX_GLOBE_TILT, tilt));
        const heading = 2 * headingHalf;
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
        zoomFactor = Math.max(1, Math.min(OCEANS_MAX_ZOOM, value));
        camera.position.z = defaultCameraDistance / zoomFactor;
        camera.lookAt(0, 0, 0);
        requestRender();
      };
      const beginAnchor = pointer => {
        hasAnchor = pickSurfacePoint(pointer.x, pointer.y, anchorLocal);
        activePointerId = hasAnchor ? pointer.id : null;
        return hasAnchor;
      };
      const onPointerDown = event => {
        if (!isEnabled() || (event.pointerType === "mouse" && event.button !== 0)) return;
        const pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        if (!pickSurfacePoint(pointer.x, pointer.y, anchorLocal)) return;
        pointers.set(event.pointerId, pointer);
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
        if (pointers.size === 1) beginAnchor(pointer);
        else if (pointers.size === 2) {
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
        if (pointers.size === 1) beginAnchor([...pointers.values()][0]);
        else if (pointers.size >= 2) {
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
      return { dispose() {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerCancel);
        canvas.removeEventListener("lostpointercapture", onPointerCancel);
        pointers.clear();
        hasAnchor = false;
      }};
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
      const cleanup = factory({ THREE: T, scene, earth: earthGlobe.surface, group: earthGlobe.group, camera, renderer, redraw: requestRender, requestRender });
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
      if (syncOceansLocation) {
        window.removeEventListener("live-earth-location-fix", syncOceansLocation);
        window.removeEventListener("live-earth-location-state", syncOceansLocation);
        syncOceansLocation = null;
      }
      gestureController?.dispose?.(); gestureController = null;
      for (const id of [...layers.keys()]) removeLayer(id);
      if (locationMarker?.parent) locationMarker.parent.remove(locationMarker);
      locationHalo?.geometry?.dispose?.(); locationHalo?.material?.dispose?.();
      locationDot?.geometry?.dispose?.(); locationDot?.material?.dispose?.();
      locationMarker = null; locationHalo = null; locationDot = null; locationVector = null;
      earthGlobe?.dispose?.(); earthGlobe = null;
      renderer?.dispose?.(); renderer?.forceContextLoss?.(); renderer = null;
      canvas.remove();
      scene = null; camera = null;
      root.classList.remove("le-world-engine-host");
    }

    requestRender();
    return Object.freeze({ THREE: T, scene, camera, renderer, canvas, globe: earthGlobe, earth: earthGlobe.surface, attachLayer, removeLayer, requestRender, dispose });
  } catch (error) {
    disposed = true;
    resizeObserver?.disconnect();
    if (syncOceansLocation) {
      window.removeEventListener("live-earth-location-fix", syncOceansLocation);
      window.removeEventListener("live-earth-location-state", syncOceansLocation);
      syncOceansLocation = null;
    }
    if (locationMarker?.parent) locationMarker.parent.remove(locationMarker);
    locationHalo?.geometry?.dispose?.(); locationHalo?.material?.dispose?.();
    locationDot?.geometry?.dispose?.(); locationDot?.material?.dispose?.();
    gestureController?.dispose?.();
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
