/* LIVE // EARTH — Clouds full-screen Earth Engine world.
   Owns the interactive globe, then attaches real multi-mission geostationary
   satellite imagery as an independent transparent Earth-surface layer.
   Global imagery discovery, timestamps and WMS requests live inside /Clouds.
*/
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Clouds is waiting for the shared Stacks feature runtime.');
    return;
  }

  const VIEW_ID = 'clouds';
  const { mount, el, button, setStatus, attribution, isActive } = runtime;
  const { fetchImageBlob, textureFromBlob, timeLabel } = runtime;

  // -------------------------------------------------------------------------
  // 01 — Clouds-only presentation. The shared Stacks dock remains untouched.
  // -------------------------------------------------------------------------
  function installCloudsStyles() {
    // Retire the previous Clouds layout stylesheet if an in-page upgrade leaves it behind.
    document.getElementById('le-clouds-globe-style')?.remove();
    if (document.getElementById('le-clouds-world-style')) return;
    const style = document.createElement('style');
    style.id = 'le-clouds-world-style';
    style.textContent = `
      .le-sfv--clouds.le-clouds-world-host {
        position:absolute; inset:0; z-index:6; overflow:hidden; isolation:isolate;
        background:radial-gradient(ellipse at 50% 44%,rgba(18,67,101,.18),transparent 57%),
                   radial-gradient(ellipse at 50% 100%,rgba(11,35,54,.18),transparent 58%),
                   #020711;
      }
      .le-sfv--clouds.le-clouds-world-host .le-clouds-panel {
        position:absolute; inset:0; z-index:2; display:block; overflow:hidden;
        width:100%; max-width:none; max-height:none; margin:0; padding:0;
        border:0; border-radius:0; background:transparent; box-shadow:none;
        backdrop-filter:none; -webkit-backdrop-filter:none; pointer-events:none;
      }
      .le-sfv--clouds.le-clouds-world-host .le-world-engine-canvas {
        position:absolute; inset:0; z-index:1; display:block; width:100%; height:100%;
        outline:0; pointer-events:auto; touch-action:none; -webkit-tap-highlight-color:transparent;
      }
      .le-sfv--clouds.le-clouds-world-host .le-clouds-body {
        position:absolute; inset:0; z-index:2; display:block!important;
        width:100%; max-width:none; margin:0; padding:0; overflow:visible;
        pointer-events:none;
      }
      .le-clouds-header {
        position:absolute; z-index:3; top:calc(env(safe-area-inset-top) + 17px);
        left:clamp(18px,4.6vw,34px); right:88px;
        display:flex; align-items:center; gap:12px; max-width:610px;
        color:#eef8ff; pointer-events:none;
        text-shadow:0 2px 18px rgba(0,0,0,.74);
      }
      .le-clouds-emblem {
        flex:0 0 auto; display:grid; place-items:center;
        width:47px; height:47px; border:1px solid rgba(208,235,250,.40); border-radius:50%;
        color:#f5fbff; font-size:23px; line-height:1;
        background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.27),rgba(72,126,163,.14) 48%,rgba(1,8,17,.88));
        box-shadow:inset 1px 1px 4px rgba(255,255,255,.20),inset -3px -4px 8px rgba(0,0,0,.55),0 0 20px rgba(99,194,239,.16);
      }
      .le-clouds-heading { min-width:0; }
      .le-clouds-title {
        margin:0; color:#f1f8ff; font-size:clamp(24px,6vw,32px); line-height:1.05;
        font-weight:780; letter-spacing:-.035em;
      }
      .le-clouds-subtitle {
        margin:6px 0 0; max-width:510px; color:#a9c4d8;
        font-size:10px; line-height:1.45; letter-spacing:.035em;
      }
      .le-clouds-refresh {
        appearance:none; position:absolute; z-index:5;
        top:calc(env(safe-area-inset-top) + 15px); right:clamp(17px,4.5vw,32px);
        display:grid; place-items:center; width:48px; height:48px; min-width:48px; min-height:48px;
        padding:0; border:1px solid rgba(137,213,246,.48); border-radius:50%;
        color:#eaf8ff; background:radial-gradient(circle at 32% 22%,rgba(112,207,245,.20),transparent 50%),
                    linear-gradient(155deg,rgba(13,43,65,.94),rgba(3,12,24,.96));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.17),0 0 20px rgba(54,174,231,.17),0 5px 18px rgba(0,0,0,.32);
        backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
        pointer-events:auto; cursor:pointer; touch-action:manipulation;
        -webkit-tap-highlight-color:transparent;
      }
      .le-clouds-refresh:active { transform:scale(.94); }
      .le-clouds-refresh:focus-visible,.le-clouds-toggle:focus-visible { outline:2px solid #83dcff; outline-offset:3px; }
      .le-clouds-refresh svg { width:20px; height:20px; display:block; }
      .le-clouds-refresh.is-loading svg { animation:le-clouds-spin .9s linear infinite; }
      .le-clouds-refresh:disabled { opacity:.56; cursor:progress; }
      @keyframes le-clouds-spin { to { transform:rotate(360deg); } }
      .le-clouds-status {
        position:absolute; z-index:4; top:calc(env(safe-area-inset-top) + 83px);
        left:clamp(18px,4vw,30px); right:clamp(18px,4vw,30px);
        width:auto; max-width:680px; margin:0 auto; padding:8px 12px;
        border:1px solid rgba(125,203,236,.20); border-radius:13px;
        color:#b9d9e9; background:rgba(2,13,24,.55);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 7px 24px rgba(0,0,0,.18);
        backdrop-filter:blur(13px); -webkit-backdrop-filter:blur(13px);
        font-size:9px; line-height:1.45; text-align:center;
        pointer-events:none;
      }
      .le-clouds-status[data-state="success"] { color:#a8ebd0; border-color:rgba(126,228,189,.23); }
      .le-clouds-status[data-state="error"] { color:#ffc0c4; border-color:rgba(255,130,140,.30); }
      .le-clouds-controls {
        position:absolute; z-index:4; left:clamp(17px,4vw,30px); right:clamp(17px,4vw,30px);
        bottom:calc(env(safe-area-inset-bottom) + 128px);
        width:auto; max-width:560px; margin:0 auto; padding:11px 14px 9px;
        border:1px solid rgba(151,205,235,.22); border-radius:19px;
        background:linear-gradient(145deg,rgba(13,31,49,.80),rgba(3,12,24,.78));
        box-shadow:inset 1px 1px 1px rgba(255,255,255,.08),0 13px 34px rgba(0,0,0,.32),0 0 24px rgba(65,166,218,.07);
        backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
        pointer-events:auto;
      }
      .le-clouds-control-top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
      .le-clouds-control-title { min-width:0; }
      .le-clouds-control-title strong {
        display:block; color:#e8f5ff; font-size:11px; font-weight:760; letter-spacing:.07em;
      }
      .le-clouds-control-title span {
        display:block; margin-top:3px; color:#8faec3; font-size:8px; letter-spacing:.10em; text-transform:uppercase;
      }
      .le-clouds-toggle {
        appearance:none; flex:0 0 auto; min-height:32px; padding:7px 12px;
        border:1px solid rgba(134,205,237,.28); border-radius:999px;
        color:#e9f7ff; background:rgba(55,133,171,.17);
        font:700 9px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        letter-spacing:.05em; pointer-events:auto; touch-action:manipulation;
      }
      .le-clouds-mode-row { display:flex; gap:8px; margin-top:8px; }
      .le-clouds-mode-row button { flex:1 1 0; min-width:0; }
      .le-clouds-opacity-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:7px; }
      .le-clouds-opacity-row label { color:#b8ccdc; font-size:9px; }
      .le-clouds-opacity-row strong { color:#dbeefa; font-size:9px; font-variant-numeric:tabular-nums; }
      .le-clouds-range { display:block; width:100%; min-height:25px; margin:0; accent-color:#79dcff; }
      .le-clouds-attribution {
        margin:3px 1px 0; color:#7798ad; font-size:8px; line-height:1.35;
      }
      .le-clouds-attribution a { color:#9bdcf6; text-decoration:underline; text-underline-offset:2px; }
      .le-clouds-body button { -webkit-tap-highlight-color:transparent; }
      @media (max-height:700px) and (orientation:portrait) {
        .le-clouds-header { top:calc(env(safe-area-inset-top) + 10px); }
        .le-clouds-status { top:calc(env(safe-area-inset-top) + 73px); }
        .le-clouds-controls { bottom:calc(env(safe-area-inset-bottom) + 112px); padding:8px 12px 7px; }
        .le-clouds-emblem { width:40px; height:40px; font-size:20px; }
        .le-clouds-subtitle { display:none; }
      }
      @media (orientation:landscape) {
        .le-clouds-header { top:calc(env(safe-area-inset-top) + 11px); left:24px; right:88px; }
        .le-clouds-refresh { top:calc(env(safe-area-inset-top) + 10px); right:24px; }
        .le-clouds-status { top:auto; left:24px; right:auto; bottom:calc(env(safe-area-inset-bottom) + 104px); width:min(39vw,390px); margin:0; text-align:left; }
        .le-clouds-controls { left:auto; right:24px; bottom:calc(env(safe-area-inset-bottom) + 104px); width:min(38vw,380px); margin:0; }
      }
      @media (prefers-reduced-motion:reduce) {
        .le-clouds-refresh.is-loading svg { animation:none; }
      }
    `;
    document.head.appendChild(style);
  }

  // -------------------------------------------------------------------------
  // 02 — The complete Atmosphere-equivalent globe lifecycle.
  // Owns its scene/renderer/camera and transfers the full pointer gesture model.
  // -------------------------------------------------------------------------
  async function initializeCloudsGlobe(view, isAlive) {
    if (!view?.root || !view?.panel) throw new TypeError('A mounted Clouds view is required.');

    const THREE = await import('../vendor/three.module.js');
    const engine = await import('../EarthEngine/Core/earth-engine.js');
    const createEarthGlobe = engine.createEarthGlobe || engine.createGlobe;
    const getDefaultCameraDistance = engine.getDefaultCameraDistance;
    if (typeof getDefaultCameraDistance !== 'function') throw new Error('Earth Engine default framing API is unavailable.');
    if (typeof createEarthGlobe !== 'function') throw new Error('The shared Earth Engine globe factory is unavailable.');
    if (!isAlive()) throw new Error('The Clouds view closed before its globe could initialize.');

    const root = view.root;
    const canvas = document.createElement('canvas');
    canvas.className = 'le-world-engine-canvas';
    canvas.setAttribute('aria-label', 'Clouds interactive Earth globe');
    canvas.setAttribute('role', 'img');
    root.insertBefore(canvas, view.panel);

    let renderer = null;
    let scene = null;
    let camera = null;
    let earthGlobe = null;
    let gestureController = null;
    let resizeObserver = null;
    let disposed = false;
    let renderQueued = false;
    let defaultCameraDistance = 3.15;
    const CLOUDS_MAX_ZOOM = 3;
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
      defaultCameraDistance = getDefaultCameraDistance({
        width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.71
      });
      camera.position.z = defaultCameraDistance / zoomFactor;
      camera.lookAt(0, 0, 0);
      requestRender();
    }

    function removeLayer(id) {
      const cleanup = layers.get(id);
      if (!cleanup) return false;
      layers.delete(id);
      try { cleanup(); }
      catch (error) { console.warn('[LIVE // EARTH] Clouds layer cleanup failed:', error); }
      requestRender();
      return true;
    }

    function attachLayer(id, factory) {
      if (disposed) throw new Error('The Clouds globe has already been disposed.');
      if (typeof id !== 'string' || !id.trim() || typeof factory !== 'function') {
        throw new TypeError('A Clouds layer requires a stable id and factory.');
      }
      removeLayer(id);
      const cleanup = factory({
        THREE, scene, earth: earthGlobe.surface, group: earthGlobe.group,
        camera, renderer, redraw: requestRender, requestRender
      });
      if (typeof cleanup === 'function') layers.set(id, cleanup);
      requestRender();
      return () => removeLayer(id);
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      resizeObserver?.disconnect();
      resizeObserver = null;
      gestureController?.dispose?.();
      gestureController = null;
      for (const id of [...layers.keys()]) removeLayer(id);
      earthGlobe?.dispose?.();
      earthGlobe = null;
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
      renderer = null;
      canvas.remove();
      scene = null;
      camera = null;
      root.classList.remove('le-world-engine-host');
    }

    try {
      root.classList.add('le-world-engine-host');
      renderer = new THREE.WebGLRenderer({
        canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x02050b, 0);
      scene = new THREE.Scene();
      scene.background = null;

      const rect = root.getBoundingClientRect();
      const width = Math.max(1, rect.width || window.innerWidth || 1);
      const height = Math.max(1, rect.height || window.innerHeight || 1);
      camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      defaultCameraDistance = getDefaultCameraDistance({
        width, height, radius: 1, fieldOfView: 38, diameterFraction: 0.71
      });
      camera.position.set(0, 0, defaultCameraDistance);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0x8aa7c8, 0.28));
      const key = new THREE.DirectionalLight(0xffffff, 2.0);
      key.position.set(-3, 2, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x245b9b, 0.10);
      fill.position.set(4, -2, -3);
      scene.add(fill);

      earthGlobe = await createEarthGlobe({
        THREE, radius: 1,
        textureUrl: './EarthEngine/Assets/earth-land-ocean-ice-2048.png',
        geometryDetail: 'standard',
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
        atmosphere: true
      });
      if (disposed || !isAlive()) {
        earthGlobe?.dispose?.();
        earthGlobe = null;
        throw new Error('The Clouds view closed while its Earth globe was loading.');
      }
      if (!earthGlobe?.group || !earthGlobe?.surface || typeof earthGlobe.dispose !== 'function') {
        throw new Error('The Earth Engine returned an incomplete globe surface.');
      }
      scene.add(earthGlobe.group);

      // Atmosphere's surface-anchored rotation and pinch transition, kept as a
      // complete gesture system rather than a screen-delta approximation.
      gestureController = (() => {
        const raycaster = new THREE.Raycaster();
        const pointerNdc = new THREE.Vector2();
        const anchorLocal = new THREE.Vector3();
        const anchorWorld = new THREE.Vector3();
        const targetWorld = new THREE.Vector3();
        const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.001);
        const deltaRotation = new THREE.Quaternion();
        const MIN_GLOBE_TILT = -1.15;
        const MAX_GLOBE_TILT = 1.15;
        const worldXAxis = new THREE.Vector3(1, 0, 0);
        const localYAxis = new THREE.Vector3(0, 1, 0);
        const tiltRotation = new THREE.Quaternion();
        const headingRotation = new THREE.Quaternion();
        const pointers = new Map();
        let activePointerId = null;
        let pinchStartDistance = 0;
        let pinchStartZoom = 1;
        let hasAnchor = false;

        const enabled = () => !disposed && root.isConnected && isAlive();
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
          zoomFactor = Math.max(1, Math.min(CLOUDS_MAX_ZOOM, value));
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
          if (!enabled()) return;
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          const pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
          const startedOnGlobe = pickSurfacePoint(pointer.x, pointer.y, anchorLocal);
          if (!startedOnGlobe) return;
          pointers.set(event.pointerId, pointer);
          try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
          if (pointers.size === 1) {
            beginAnchor(pointer);
          } else if (pointers.size === 2) {
            hasAnchor = false;
            activePointerId = null;
            pinchStartDistance = Math.max(1, pointerDistance());
            pinchStartZoom = zoomFactor;
          }
          event.preventDefault();
        };
        const onPointerMove = event => {
          if (!enabled() || !pointers.has(event.pointerId)) return;
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
          try {
            if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
          } catch (_) {}
          hasAnchor = false;
          activePointerId = null;
          if (pointers.size === 1) {
            beginAnchor([...pointers.values()][0]);
          } else if (pointers.size >= 2) {
            pinchStartDistance = Math.max(1, pointerDistance());
            pinchStartZoom = zoomFactor;
          }
        };
        const onPointerCancel = event => onPointerUp(event);

        canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
        canvas.addEventListener('pointermove', onPointerMove, { passive: false });
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerCancel);
        canvas.addEventListener('lostpointercapture', onPointerCancel);
        return {
          dispose() {
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerCancel);
            canvas.removeEventListener('lostpointercapture', onPointerCancel);
            pointers.clear();
            hasAnchor = false;
          }
        };
      })();

      resize();
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(root);
      }
      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('orientationchange', resize, { passive: true });
      requestRender();

      return Object.freeze({
        THREE, scene, camera, renderer, canvas,
        globe: earthGlobe, earth: earthGlobe.surface,
        attachLayer, removeLayer, requestRender, dispose
      });
    } catch (error) {
      dispose();
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // 03 — Clouds scene composition and responsive controls.
  // No full-screen cards: the Earth remains the centre of the experience.
  // -------------------------------------------------------------------------
  function activateClouds() {
    const view = mount(VIEW_ID);
    if (!view) return () => {};

    const { root, panel, body } = view;
    let closed = false;
    let worldGlobe = null;
    let engineReady = null;
    let layerDispose = null;
    let cloudLayerMesh = null;
    let cloudMaterial = null;
    let cloudVisible = true;
    let cloudImageReady = false;
    let loading = false;
    let activeMode = 'natural';
    let staticCloudTexture = null;
    let animationTextures = [];
    let animationTimer = 0;
    let animationLoading = false;
    let cloudRequestController = null;
    let hourlyTimer = 0;
    let onlineRetryTimer = 0;

    const isAlive = () => !closed && isActive(VIEW_ID) && root.isConnected;

    installCloudsStyles();
    root.classList.add('le-clouds-world-host');
    panel.classList.add('le-clouds-panel');
    panel.replaceChildren(body);
    body.classList.add('le-clouds-body');
    body.replaceChildren();

    const header = el('header', 'le-clouds-header');
    const emblem = el('span', 'le-clouds-emblem', '☁');
    emblem.setAttribute('aria-hidden', 'true');
    const heading = el('div', 'le-clouds-heading');
    const title = el('h1', 'le-clouds-title', 'Clouds');
    const subtitle = el('p', 'le-clouds-subtitle', 'Global satellite cloud imagery · Five-satellite geostationary ring · 3-hour composite');
    heading.append(title, subtitle);
    header.append(emblem, heading);

    const refresh = button('', () => { loadCloudTexture(); }, 'le-clouds-refresh');
    refresh.setAttribute('aria-label', 'Refresh global satellite cloud imagery');
    refresh.title = 'Refresh global satellite cloud imagery';
    refresh.disabled = true;
    const refreshIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    refreshIcon.setAttribute('viewBox', '0 0 24 24');
    refreshIcon.setAttribute('aria-hidden', 'true');
    refreshIcon.innerHTML = '<path d="M20 7v5h-5M4 17v-5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    refresh.appendChild(refreshIcon);

    const status = el('p', 'le-clouds-status', 'Preparing the Earth globe…');
    status.dataset.state = 'neutral';

    const controls = el('section', 'le-clouds-controls');
    controls.setAttribute('aria-label', 'Cloud layer controls');
    const controlTop = el('div', 'le-clouds-control-top');
    const controlTitle = el('div', 'le-clouds-control-title');
    controlTitle.append(
      el('strong', '', 'Satellite cloud imagery'),
      el('span', '', 'GOES · METEOSAT · HIMAWARI · GLOBAL RING')
    );
    const toggle = button('Hide imagery', () => {
      cloudVisible = !cloudVisible;
      toggle.textContent = cloudVisible ? 'Hide imagery' : 'Show imagery';
      toggle.setAttribute('aria-pressed', String(cloudVisible));
      if (cloudLayerMesh) cloudLayerMesh.visible = cloudVisible && cloudImageReady;
      worldGlobe?.requestRender?.();
    }, 'le-clouds-toggle');
    toggle.setAttribute('aria-pressed', 'true');
    controlTop.append(controlTitle, toggle);

    const rangeRow = el('div', 'le-clouds-opacity-row');
    const rangeLabel = el('label', '', 'Satellite imagery opacity');
    const rangeValue = el('strong', '', '100%');
    rangeRow.append(rangeLabel, rangeValue);
    const range = el('input', 'le-clouds-range');
    range.type = 'range';
    range.min = '20';
    range.max = '100';
    range.step = '5';
    range.value = '100';
    range.setAttribute('aria-label', 'Cloud layer opacity');
    const rangeId = 'le-clouds-opacity';
    range.id = rangeId;
    rangeLabel.htmlFor = rangeId;

    const modeRow = el('div', 'le-clouds-mode-row');
    const modeButton = button('Switch to infrared', () => {
      if (loading || animationLoading || !isAlive()) return;
      stopCloudAnimation();
      activeMode = activeMode === 'natural' ? 'infrared' : 'natural';
      modeButton.textContent = activeMode === 'natural' ? 'Switch to infrared' : 'Switch to natural colour';
      loadCloudTexture();
    }, 'le-clouds-toggle');
    modeButton.setAttribute('aria-label', 'Switch satellite cloud imagery mode');
    const animationButton = button('Play cloud movement', () => {
      if (animationTimer) stopCloudAnimation();
      else startCloudAnimation();
    }, 'le-clouds-toggle');
    animationButton.setAttribute('aria-label', 'Play recent satellite cloud observations');
    modeRow.append(modeButton, animationButton);

    controls.append(controlTop, modeRow, rangeRow, range);
    attribution(controls, [
      { text: 'Satellite imagery: ' },
      { label: 'EUMETSAT', href: 'https://www.eumetsat.int/' },
      { text: ' · ' },
      { label: 'NOAA', href: 'https://www.noaa.gov/' },
      { text: ' · ' },
      { label: 'JMA', href: 'https://www.jma.go.jp/jma/indexe.html' },
      { text: ' · delivered through public EUMETView / NASA GIBS imagery services' }
    ]).classList.add('le-clouds-attribution');

    body.append(header, status, refresh, controls);

    function setCloudStatus(message, state = '') {
      if (isAlive()) setStatus(status, message, state);
    }

    function setLoadingState(value) {
      loading = value;
      refresh.disabled = value || !worldGlobe;
      refresh.classList.toggle('is-loading', value);
      refresh.setAttribute('aria-busy', String(value));
    }

    function setLayerVisible() {
      if (cloudLayerMesh) cloudLayerMesh.visible = cloudVisible && cloudImageReady;
      worldGlobe?.requestRender?.();
    }

    // -----------------------------------------------------------------------
    // 04 — Global satellite imagery pipeline. It starts only after the clean Earth is ready.
    // The global geostationary ring is discovered from live WMS capabilities; imagery remains network-only.
    // -----------------------------------------------------------------------
    function disposeAnimationTextures(keepTexture = null) {
      for (const texture of animationTextures) {
        if (texture && texture !== keepTexture) texture.dispose?.();
      }
      animationTextures = keepTexture ? [keepTexture] : [];
    }

    function stopCloudAnimation() {
      const wasPlaying = Boolean(animationTimer);
      if (animationTimer) window.clearInterval(animationTimer);
      animationTimer = 0;
      if (cloudMaterial && staticCloudTexture) {
        cloudMaterial.map = staticCloudTexture;
        cloudMaterial.needsUpdate = true;
      }
      disposeAnimationTextures(staticCloudTexture);
      animationButton.textContent = 'Play cloud movement';
      animationButton.disabled = false;
      worldGlobe?.requestRender?.();
      if (wasPlaying && isAlive()) setCloudStatus('Showing the latest available satellite observation.');
    }

    function applyCloudTexture(texture) {
      if (!cloudMaterial || !texture) return;
      const previousTexture = cloudMaterial.map;
      cloudMaterial.map = texture;
      cloudMaterial.needsUpdate = true;
      cloudImageReady = true;
      setLayerVisible();
      if (previousTexture && previousTexture !== texture && !animationTextures.includes(previousTexture)) {
        previousTexture.dispose?.();
      }
    }

    async function loadCloudTexture() {
      if (!isAlive() || loading || animationLoading || !worldGlobe || !cloudMaterial) return;
      if (navigator.onLine === false) {
        setCloudStatus('Offline · the Earth remains available; fresh satellite imagery requires an internet connection.', 'error');
        return;
      }

      stopCloudAnimation();
      animationTextures = [];
      setLoadingState(true);
      cloudImageReady = false;
      if (cloudLayerMesh) cloudLayerMesh.visible = false;
      worldGlobe.requestRender?.();
      setCloudStatus('Finding the latest available global satellite cloud observation…');

      const request = new AbortController();
      cloudRequestController = request;
      try {
        const satellite = await import('./clouds-satellite.js');
        const times = await satellite.discoverRecentTimes({ mode: activeMode, limit: 5, signal: request.signal });
        if (!times.length) throw new Error('The satellite service did not report an available observation time.');
        let result = null;
        let lastFrameError = null;
        for (let index = 0; index < times.length; index++) {
          try {
            result = await satellite.fetchGlobalCloudFrame({
              mode: activeMode,
              time: times[index],
              signal: request.signal,
              fetchImageBlob
            });
            break;
          } catch (error) {
            lastFrameError = error;
            if (!isAlive() || request.signal.aborted || error?.name === 'AbortError') throw error;
            if (index < times.length - 1) {
              setCloudStatus(`The newest global satellite slot is not available yet. Trying the previous observation…`);
            }
          }
        }
        if (!result) throw lastFrameError || new Error('No recent global satellite image was returned.');
        const texture = await textureFromBlob(worldGlobe.THREE, result.blob);
        if (!isAlive() || cloudRequestController !== request || request.signal.aborted || !cloudMaterial) {
          texture?.dispose?.();
          return;
        }

        staticCloudTexture = texture;
        applyCloudTexture(texture);
        const observation = new Date(result.time).toLocaleString(undefined, {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        });
        setCloudStatus(
          `Global satellite image loaded · ${activeMode === 'natural' ? 'natural colour' : 'infrared'} · ${result.title || result.provider} · observation ${observation} · checked ${timeLabel(result.checkedAt)}. Composite cadence: about 3 hours.`,
          'success'
        );
      } catch (error) {
        if (request.signal.aborted || error?.name === 'AbortError' || !isAlive() || cloudRequestController !== request) return;
        const offline = navigator.onLine === false
          ? ' Internet access is required; no saved satellite image is shown offline.'
          : '';
        setCloudStatus(`Global satellite imagery is unavailable. The real Earth remains visible.${offline} ${error?.message || ''}`, 'error');
      } finally {
        if (cloudRequestController === request) cloudRequestController = null;
        if (isAlive()) setLoadingState(false);
        else loading = false;
      }
    }

    async function startCloudAnimation() {
      if (!isAlive() || animationLoading || loading || !worldGlobe || !cloudMaterial) return;
      if (navigator.onLine === false) {
        setCloudStatus('Cloud movement playback requires an internet connection.', 'error');
        return;
      }

      animationLoading = true;
      animationButton.disabled = true;
      setCloudStatus('Loading recent satellite observations for cloud movement playback…');
      const request = new AbortController();
      cloudRequestController = request;
      const frames = [];

      try {
        const satellite = await import('./clouds-satellite.js');
        const times = await satellite.discoverRecentTimes({ mode: activeMode, limit: 4, signal: request.signal });
        if (times.length < 2) throw new Error('Not enough recent satellite observations are available for an animation.');
        for (const time of times) {
          if (!isAlive() || request.signal.aborted) throw new DOMException('Cloud view closed', 'AbortError');
          try {
            const result = await satellite.fetchGlobalCloudFrame({
              mode: activeMode, time, signal: request.signal, fetchImageBlob
            });
            const texture = await textureFromBlob(worldGlobe.THREE, result.blob);
            if (!isAlive() || request.signal.aborted) {
              texture?.dispose?.();
              throw new DOMException('Cloud view closed', 'AbortError');
            }
            frames.push({ texture, time: result.time });
          } catch (error) {
            if (!isAlive() || request.signal.aborted || error?.name === 'AbortError') throw error;
            console.warn('[LIVE // EARTH] A historical satellite frame was skipped:', error);
          }
        }

        if (frames.length < 2) throw new Error('Fewer than two recent satellite frames could be loaded.');
        if (!isAlive() || request.signal.aborted || !cloudMaterial) {
          for (const frame of frames) frame.texture.dispose?.();
          return;
        }

        stopCloudAnimation();
        animationTextures = frames.map(frame => frame.texture);
        staticCloudTexture = frames[0].texture;
        let index = 0;
        applyCloudTexture(frames[0].texture);
        animationButton.textContent = 'Stop movement';
        animationButton.disabled = false;
        const oldest = new Date(frames[frames.length - 1].time).toLocaleString();
        const newest = new Date(frames[0].time).toLocaleString();
        setCloudStatus(
          `Playing ${frames.length} real satellite observations · ${newest} back to ${oldest}. Each frame is approximately 3 hours apart; playback is accelerated.`,
          'success'
        );
        animationTimer = window.setInterval(() => {
          if (!isAlive() || !cloudMaterial || !animationTextures.length) {
            stopCloudAnimation();
            return;
          }
          index = (index + 1) % animationTextures.length;
          cloudMaterial.map = animationTextures[index];
          cloudMaterial.needsUpdate = true;
          worldGlobe?.requestRender?.();
        }, 1050);
      } catch (error) {
        for (const frame of frames) frame.texture.dispose?.();
        if (request.signal.aborted || error?.name === 'AbortError' || !isAlive()) return;
        setCloudStatus(`Cloud movement playback is unavailable. ${error?.message || ''}`, 'error');
      } finally {
        if (cloudRequestController === request) cloudRequestController = null;
        animationLoading = false;
        if (isAlive()) animationButton.disabled = false;
      }
    }

    range.addEventListener('input', () => {
      rangeValue.textContent = `${range.value}%`;
      if (cloudMaterial) {
        cloudMaterial.opacity = Number(range.value) / 100;
        cloudMaterial.needsUpdate = true;
      }
      worldGlobe?.requestRender?.();
    });

    const offlineHandler = () => {
      if (!isAlive()) return;
      cloudRequestController?.abort();
      stopCloudAnimation();
      cloudImageReady = false;
      if (cloudLayerMesh) cloudLayerMesh.visible = false;
      const oldTexture = cloudMaterial?.map;
      if (cloudMaterial) {
        cloudMaterial.map = null;
        cloudMaterial.needsUpdate = true;
      }
      oldTexture?.dispose?.();
      staticCloudTexture = null;
      animationTextures = [];
      setCloudStatus('Offline · cloud imagery hidden. Your interactive Earth remains available.', 'error');
      worldGlobe?.requestRender?.();
    };

    const onlineHandler = () => {
      if (!isAlive()) return;
      setCloudStatus('Connection restored · requesting the latest global satellite image…');
      if (onlineRetryTimer) window.clearTimeout(onlineRetryTimer);
      onlineRetryTimer = window.setTimeout(() => {
        onlineRetryTimer = 0;
        if (isAlive()) loadCloudTexture();
      }, 350);
    };

    window.addEventListener('offline', offlineHandler);
    window.addEventListener('online', onlineHandler);

    // -----------------------------------------------------------------------
    // 05 — Globe-first startup. Satellite imagery begins only after the clean Earth exists.
    // -----------------------------------------------------------------------
    engineReady = (async () => {
      try {
        worldGlobe = await initializeCloudsGlobe(view, isAlive);
        if (!isAlive()) {
          worldGlobe?.dispose?.();
          worldGlobe = null;
          return null;
        }
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') {
          throw new Error('The Clouds Earth Engine did not provide its layer interface.');
        }

        root.dataset.globeEngine = 'ready';
        layerDispose = worldGlobe.attachLayer('clouds-global-geostationary-imagery', ({ THREE, earth, requestRender }) => {
          if (!THREE || !earth?.add) throw new Error('The Clouds globe did not provide its Earth surface.');
          const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: Number(range.value) / 100,
            depthWrite: false,
            depthTest: true,
            side: THREE.FrontSide
          });
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.009, 128, 96), material);
          mesh.name = 'globalGeostationarySatelliteCloudImagery';
          mesh.renderOrder = 3;
          mesh.visible = false;
          earth.add(mesh);
          cloudLayerMesh = mesh;
          cloudMaterial = material;
          requestRender?.();
          return () => {
            earth.remove(mesh);
            mesh.geometry.dispose();
            material.map?.dispose?.();
            material.dispose();
            if (cloudLayerMesh === mesh) {
              cloudLayerMesh = null;
              cloudMaterial = null;
              cloudImageReady = false;
            }
          };
        });
        if (typeof layerDispose !== 'function') throw new Error('The global satellite imagery layer could not attach to the Earth surface.');

        refresh.disabled = false;
        worldGlobe.requestRender?.();
        if (navigator.onLine === false) {
          setCloudStatus('Earth ready · offline. Global satellite imagery will load when the connection returns.', 'error');
        } else {
          await loadCloudTexture();
        }
        if (!isAlive()) return null;
        hourlyTimer = window.setInterval(() => {
          if (isAlive() && !document.hidden && !animationTimer) loadCloudTexture();
        }, 60 * 60 * 1000);
        return worldGlobe;
      } catch (error) {
        if (isAlive()) setCloudStatus(`The Clouds Earth could not initialize. ${error?.message || ''}`, 'error');
        throw error;
      }
    })();
    engineReady.catch(() => {});

    // The refresh button becomes available only after the Earth and layer are ready.

    return () => {
      closed = true;
      if (hourlyTimer) window.clearInterval(hourlyTimer);
      hourlyTimer = 0;
      if (onlineRetryTimer) window.clearTimeout(onlineRetryTimer);
      onlineRetryTimer = 0;
      cloudRequestController?.abort();
      cloudRequestController = null;
      stopCloudAnimation();
      staticCloudTexture = null;
      animationTextures = [];
      window.removeEventListener('offline', offlineHandler);
      window.removeEventListener('online', onlineHandler);
      try { layerDispose?.(); } catch (error) { console.warn('[LIVE // EARTH] Clouds layer detach failed:', error); }
      layerDispose = null;
      worldGlobe?.dispose?.();
      worldGlobe = null;
      cloudLayerMesh = null;
      cloudMaterial = null;
      cloudImageReady = false;
      root.classList.remove('le-clouds-world-host');
    };
  }

  runtime.registerFeature(VIEW_ID, activateClouds);
})();
