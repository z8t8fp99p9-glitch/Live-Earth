/* LIVE // EARTH — Clouds globe-first feature view.
   Owns an Earth Engine globe like Atmosphere while preserving the NASA GIBS
   daily cloud-fraction imagery pipeline and the shared Stacks feature lifecycle. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] clouds feature runtime is unavailable.');
    return;
  }
  const { mount, el, setStatus, button, card, attribution, isActive } = runtime;
  const { fetchImageBlob, textureFromBlob, getEarthRaster, timeLabel } = runtime;

  function installCloudsStyles() {
    if (document.getElementById('le-clouds-globe-style')) return;
    const style = document.createElement('style');
    style.id = 'le-clouds-globe-style';
    style.textContent = `
      .le-sfv--clouds.le-clouds-world-host { position:absolute; inset:0; overflow:hidden; isolation:isolate; background:radial-gradient(ellipse at 50% 32%,rgba(23,78,112,.20),transparent 55%); }
      .le-sfv--clouds.le-clouds-world-host .le-world-engine-canvas { position:absolute; inset:0; z-index:0; width:100%; height:100%; display:block; touch-action:none; outline:0; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-panel { position:absolute; inset:0; z-index:2; width:100%; max-width:none; max-height:none; overflow:visible; padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; backdrop-filter:none; -webkit-backdrop-filter:none; pointer-events:none; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-head { position:absolute; z-index:3; top:calc(env(safe-area-inset-top) + 22px); left:clamp(18px,5vw,34px); right:clamp(18px,5vw,34px); width:auto; margin:0; pointer-events:auto; text-shadow:0 2px 18px rgba(0,0,0,.8); }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-symbol { width:48px; font-size:25px; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-title { font-size:clamp(24px,6vw,34px); }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-subtitle { max-width:540px; font-size:11px; line-height:1.5; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-pill { position:absolute; z-index:3; top:calc(env(safe-area-inset-top) + 105px); left:50%; transform:translateX(-50%); margin:0; pointer-events:auto; white-space:nowrap; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-body { position:absolute; inset:0; display:block; width:100%; max-width:none; margin:0; padding:0; pointer-events:none; }
      .le-sfv--clouds.le-clouds-world-host .le-clouds-status { position:absolute; z-index:3; top:calc(env(safe-area-inset-top) + 154px); left:clamp(16px,4vw,30px); right:clamp(16px,4vw,30px); max-width:760px; margin:0 auto; padding:10px 13px; background:rgba(2,13,24,.62); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); pointer-events:auto; font-size:10px; }
      .le-sfv--clouds.le-clouds-world-host .le-clouds-controls { position:absolute; z-index:3; left:clamp(16px,4vw,30px); right:clamp(16px,4vw,30px); bottom:calc(env(safe-area-inset-bottom) + 112px); width:auto; max-width:650px; margin:0 auto; padding:14px 16px 13px; border:1px solid rgba(153,201,234,.22); border-radius:22px; background:linear-gradient(145deg,rgba(15,31,49,.78),rgba(4,12,24,.76)); box-shadow:inset 1px 1px 1px rgba(255,255,255,.08),0 16px 42px rgba(0,0,0,.30),0 0 30px rgba(76,167,220,.08); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); pointer-events:auto; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-card h2 { margin-bottom:6px; font-size:13px; }
      .le-sfv--clouds.le-clouds-world-host .le-clouds-description { margin:0 0 10px; color:#b6cbdc; font-size:10px; line-height:1.5; }
      .le-sfv--clouds.le-clouds-world-host .le-clouds-attribution { position:absolute; z-index:3; left:clamp(18px,4vw,30px); right:clamp(18px,4vw,30px); bottom:calc(env(safe-area-inset-bottom) + 82px); margin:0; text-align:left; font-size:9px; color:#91a9bc; pointer-events:auto; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-range-label { margin-bottom:6px; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-controls { margin-top:11px; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-button { min-height:40px; }
      .le-sfv--clouds.le-clouds-world-host .le-sfv-head,
      .le-sfv--clouds.le-clouds-world-host .le-sfv-pill { text-shadow:0 2px 18px rgba(0,0,0,.85); }
      @media (max-height:720px) {
        .le-sfv--clouds.le-clouds-world-host .le-sfv-head { top:calc(env(safe-area-inset-top) + 10px); }
        .le-sfv--clouds.le-clouds-world-host .le-sfv-pill { top:calc(env(safe-area-inset-top) + 88px); }
        .le-sfv--clouds.le-clouds-world-host .le-clouds-status { top:calc(env(safe-area-inset-top) + 132px); }
        .le-sfv--clouds.le-clouds-world-host .le-clouds-controls { bottom:calc(env(safe-area-inset-bottom) + 100px); padding:10px 13px; }
        .le-sfv--clouds.le-clouds-world-host .le-clouds-description { display:none; }
        .le-sfv--clouds.le-clouds-world-host .le-clouds-attribution { bottom:calc(env(safe-area-inset-bottom) + 72px); }
      }
      @media (orientation:landscape) {
        .le-sfv--clouds.le-clouds-world-host .le-sfv-head { top:calc(env(safe-area-inset-top) + 8px); left:22px; right:auto; max-width:390px; }
        .le-sfv--clouds.le-clouds-world-host .le-sfv-pill { top:calc(env(safe-area-inset-top) + 12px); left:auto; right:22px; transform:none; }
        .le-sfv--clouds.le-clouds-world-host .le-clouds-status { top:auto; bottom:calc(env(safe-area-inset-bottom) + 82px); left:22px; right:auto; max-width:390px; }
        .le-sfv--clouds.le-clouds-world-host .le-clouds-controls { left:auto; right:22px; bottom:calc(env(safe-area-inset-bottom) + 82px); width:min(390px,45vw); }
        .le-sfv--clouds.le-clouds-world-host .le-clouds-attribution { bottom:calc(env(safe-area-inset-bottom) + 52px); }
      }
    `;
    document.head.appendChild(style);
  }

  async function initializeCloudsGlobe(view) {
    if (!view?.root || !view?.panel) throw new TypeError('A mounted Clouds view is required.');
    const T = await import('../vendor/three.module.js');
    const engine = await import('../EarthEngine/Core/earth-engine.js');
    const createEarthGlobe = engine.createEarthGlobe || engine.createGlobe;
    const getDefaultCameraDistance = engine.getDefaultCameraDistance;
    if (typeof getDefaultCameraDistance !== 'function') throw new Error('Earth Engine default framing API is unavailable.');
    if (typeof createEarthGlobe !== 'function') throw new Error('The reusable Earth Engine factory is unavailable.');

    const root = view.root;
    root.classList.add('le-clouds-world-host');
    installCloudsStyles();
    const canvas = document.createElement('canvas');
    canvas.className = 'le-world-engine-canvas';
    canvas.setAttribute('aria-label', 'Clouds interactive Earth globe');
    canvas.setAttribute('role', 'img');
    root.insertBefore(canvas, root.firstChild);

    let renderer = null, scene = null, camera = null, earthGlobe = null;
    let gestureController = null, resizeObserver = null, disposed = false, renderQueued = false;
    let defaultCameraDistance = 3.15, zoomFactor = 1;
    const CLOUDS_MAX_ZOOM = 3;
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
      requestRender();
    }
    function removeLayer(id) {
      const cleanup = layers.get(id);
      if (!cleanup) return false;
      layers.delete(id);
      try { cleanup(); } catch (error) { console.warn('[LIVE // EARTH] Clouds layer cleanup failed:', error); }
      requestRender();
      return true;
    }
    function attachLayer(id, factory) {
      if (disposed) throw new Error('The Clouds globe has already been disposed.');
      if (typeof id !== 'string' || !id.trim() || typeof factory !== 'function') throw new TypeError('A layer needs an id and factory.');
      removeLayer(id);
      const cleanup = factory({ THREE: T, scene, earth: earthGlobe.surface, group: earthGlobe.group, camera, renderer, redraw: requestRender, requestRender });
      if (typeof cleanup === 'function') layers.set(id, cleanup);
      requestRender();
      return () => removeLayer(id);
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      resizeObserver?.disconnect(); resizeObserver = null;
      gestureController?.dispose?.(); gestureController = null;
      for (const id of [...layers.keys()]) removeLayer(id);
      earthGlobe?.dispose?.(); earthGlobe = null;
      renderer?.dispose?.(); renderer?.forceContextLoss?.(); renderer = null;
      canvas.remove();
      scene = null; camera = null;
      root.classList.remove('le-world-engine-host');
      root.classList.remove('le-clouds-world-host');
    }

    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
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
      key.position.set(-3, 2, 4); scene.add(key);
      const fill = new T.DirectionalLight(0x245b9b, 0.10);
      fill.position.set(4, -2, -3); scene.add(fill);

      earthGlobe = await createEarthGlobe({
        THREE: T, radius: 1,
        textureUrl: './EarthEngine/Assets/earth-land-ocean-ice-2048.png',
        geometryDetail: 'standard',
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
        atmosphere: true
      });
      if (disposed || !isActive('clouds')) {
        earthGlobe.dispose();
        throw new Error('The Clouds view closed while its Earth globe was loading.');
      }
      scene.add(earthGlobe.group);

      // Full surface-anchored drag and pinch interaction, adapted from Atmosphere.
      gestureController = (() => {
        const raycaster = new T.Raycaster();
        const pointerNdc = new T.Vector2();
        const anchorLocal = new T.Vector3();
        const anchorWorld = new T.Vector3();
        const targetWorld = new T.Vector3();
        const sphere = new T.Sphere(new T.Vector3(0, 0, 0), 1.001);
        const deltaRotation = new T.Quaternion();
        const MIN_GLOBE_TILT = -1.15, MAX_GLOBE_TILT = 1.15;
        const worldXAxis = new T.Vector3(1, 0, 0), localYAxis = new T.Vector3(0, 1, 0);
        const tiltRotation = new T.Quaternion(), headingRotation = new T.Quaternion();
        const pointers = new Map();
        let activePointerId = null, pinchStartDistance = 0, pinchStartZoom = 1, hasAnchor = false;
        const enabled = () => !disposed && root.isConnected && isActive('clouds');
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
          target.normalize(); return true;
        };
        const clampTilt = () => {
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
          return values.length < 2 ? 0 : Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
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
          if (!enabled() || (event.pointerType === 'mouse' && event.button !== 0)) return;
          const pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
          if (!pickSurfacePoint(pointer.x, pointer.y, anchorLocal)) return;
          pointers.set(event.pointerId, pointer);
          try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
          if (pointers.size === 1) beginAnchor(pointer);
          else if (pointers.size === 2) {
            hasAnchor = false; activePointerId = null;
            pinchStartDistance = Math.max(1, pointerDistance()); pinchStartZoom = zoomFactor;
          }
          event.preventDefault();
        };
        const onPointerMove = event => {
          if (!enabled() || !pointers.has(event.pointerId)) return;
          const pointer = pointers.get(event.pointerId);
          pointer.x = event.clientX; pointer.y = event.clientY;
          if (pointers.size >= 2) {
            const distance = pointerDistance();
            if (pinchStartDistance > 0) setZoom(pinchStartZoom * distance / pinchStartDistance);
            event.preventDefault(); return;
          }
          if (pointers.size !== 1 || event.pointerId !== activePointerId || !hasAnchor) return;
          if (!pointerRayToSphere(pointer.x, pointer.y, targetWorld)) return;
          earthGlobe.group.updateMatrixWorld(true);
          anchorWorld.copy(anchorLocal).applyQuaternion(earthGlobe.group.quaternion).normalize();
          deltaRotation.setFromUnitVectors(anchorWorld, targetWorld);
          earthGlobe.group.quaternion.premultiply(deltaRotation).normalize();
          clampTilt(); earthGlobe.group.updateMatrixWorld(true);
          requestRender(); event.preventDefault();
        };
        const onPointerUp = event => {
          if (!pointers.has(event.pointerId)) return;
          pointers.delete(event.pointerId);
          try { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch (_) {}
          hasAnchor = false; activePointerId = null;
          if (pointers.size === 1) beginAnchor([...pointers.values()][0]);
          else if (pointers.size >= 2) {
            pinchStartDistance = Math.max(1, pointerDistance()); pinchStartZoom = zoomFactor;
          }
        };
        const onPointerCancel = event => onPointerUp(event);
        canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
        canvas.addEventListener('pointermove', onPointerMove, { passive: false });
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerCancel);
        canvas.addEventListener('lostpointercapture', onPointerCancel);
        return { dispose() {
          canvas.removeEventListener('pointerdown', onPointerDown);
          canvas.removeEventListener('pointermove', onPointerMove);
          canvas.removeEventListener('pointerup', onPointerUp);
          canvas.removeEventListener('pointercancel', onPointerCancel);
          canvas.removeEventListener('lostpointercapture', onPointerCancel);
          pointers.clear(); hasAnchor = false;
        }};
      })();

      resize();
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(root);
      }
      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('orientationchange', resize, { passive: true });
      requestRender();
      return Object.freeze({ THREE: T, scene, camera, renderer, canvas, globe: earthGlobe, earth: earthGlobe.surface, attachLayer, removeLayer, requestRender, dispose });
    } catch (error) {
      disposed = true;
      resizeObserver?.disconnect();
      gestureController?.dispose?.();
      earthGlobe?.dispose?.();
      renderer?.dispose?.(); renderer?.forceContextLoss?.();
      canvas.remove();
      root.classList.remove('le-world-engine-host', 'le-clouds-world-host');
      throw error;
    }
  }

  function activateClouds() {
    const view = mount('clouds');
    if (!view) return () => {};
    const { body } = view;
    const status = el('p', 'le-sfv-status le-clouds-status', 'Preparing the latest available NASA cloud-fraction image…');
    status.dataset.state = 'neutral';
    body.appendChild(status);

    const controls = card('Layer controls', '');
    controls.classList.add('le-clouds-controls');
    const description = el('p', 'le-clouds-description', 'Observed cloud fraction from NASA Terra MODIS. Colour represents measured cloud fraction, not a photographic cloud texture. The source composite is daily; this view checks hourly for a newer image.');
    const rangeLabel = el('label', 'le-sfv-range-label');
    const label = el('span', '', 'Layer opacity');
    const value = el('strong', '', '58%');
    rangeLabel.append(label, value);
    const range = el('input', 'le-sfv-range');
    range.type = 'range'; range.min = '10'; range.max = '95'; range.step = '5'; range.value = '58';
    range.setAttribute('aria-label', 'Cloud layer opacity');
    const actionRow = el('div', 'le-sfv-controls');
    const refresh = button('Refresh imagery', () => { loadCloudTexture(); });
    const toggle = button('Hide layer', () => {
      cloudVisible = !cloudVisible;
      if (cloudLayerMesh) cloudLayerMesh.visible = cloudVisible && !!cloudMaterial?.map;
      toggle.textContent = cloudVisible ? 'Hide layer' : 'Show layer';
      worldGlobe?.requestRender?.();
    });
    actionRow.append(refresh, toggle);
    controls.append(description, rangeLabel, range, actionRow);
    body.appendChild(controls);
    attribution(body, [
      { text: 'Imagery: ' },
      { label: 'NASA Global Imagery Browse Services (GIBS)', href: 'https://nasa-gibs.github.io/gibs-api-docs/' },
      { text: ' · MODIS/Terra Cloud Fraction (Day).' }
    ]);
    const existingAttribution = body.querySelector('.le-sfv-attribution');
    if (existingAttribution) existingAttribution.classList.add('le-clouds-attribution');

    let closed = false, cloudVisible = true, cloudLayerMesh = null, cloudMaterial = null;
    let layerDispose = null, hourlyTimer = 0, loading = false, cloudRequestController = null;
    let worldGlobe = null, engineReady = null;

    function setCloudStatus(message, state = '') {
      if (!closed && isActive('clouds')) setStatus(status, message, state);
    }
    function globeContextThree() { return worldGlobe?.THREE || null; }

    async function loadCloudTexture() {
      if (closed || !isActive('clouds') || loading || !cloudMaterial) return;
      loading = true; refresh.disabled = true;
      if (cloudLayerMesh) cloudLayerMesh.visible = false;
      worldGlobe?.requestRender?.();
      const request = new AbortController();
      cloudRequestController = request;
      const requestedDates = [0, 1, 2].map(daysAgo => {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() - daysAgo);
        return date.toISOString().slice(0, 10);
      });
      try {
        let result = null, usedDate = '', lastError = null;
        for (let i = 0; i < requestedDates.length; i++) {
          const date = requestedDates[i];
          try {
            const url = await getEarthRaster('MODIS_Terra_Cloud_Fraction_Day', date);
            result = await fetchImageBlob(url, 12000, request.signal);
            usedDate = date; break;
          } catch (error) {
            lastError = error;
            if (closed || !isActive('clouds') || request.signal.aborted || error?.name === 'AbortError') throw error;
            if (i < requestedDates.length - 1) setCloudStatus(`The cloud product for ${date} is not available yet. Trying the previous daily observation…`);
          }
        }
        if (!result) throw lastError || new Error('No recent daily cloud product was returned.');
        const texture = await textureFromBlob(globeContextThree(), result.blob);
        if (closed || !isActive('clouds') || cloudRequestController !== request || request.signal.aborted || !cloudMaterial) {
          texture.dispose(); return;
        }
        const old = cloudMaterial.map;
        cloudMaterial.map = texture;
        cloudMaterial.needsUpdate = true;
        if (cloudLayerMesh) cloudLayerMesh.visible = cloudVisible && !!cloudMaterial.map;
        if (old && old !== texture) old.dispose();
        setCloudStatus(`NASA cloud-fraction image loaded · product date ${usedDate} · checked ${timeLabel(result.checkedAt)}. This is a daily product, not a minute-by-minute live cloud feed.`, 'success');
        worldGlobe?.requestRender?.();
      } catch (error) {
        if (request.signal.aborted || error?.name === 'AbortError' || closed || !isActive('clouds') || cloudRequestController !== request) return;
        const offline = navigator.onLine === false ? ' An internet connection is required; no saved cloud image is shown offline.' : '';
        setCloudStatus(`Cloud imagery is unavailable. The base Earth remains unchanged.${offline} ${error?.message || ''}`, 'error');
      } finally {
        if (cloudRequestController === request) cloudRequestController = null;
        loading = false; refresh.disabled = false;
      }
    }

    range.addEventListener('input', () => {
      value.textContent = `${range.value}%`;
      if (cloudMaterial) { cloudMaterial.opacity = Number(range.value) / 100; cloudMaterial.needsUpdate = true; }
      worldGlobe?.requestRender?.();
    });

    engineReady = (async () => {
      try {
        worldGlobe = await initializeCloudsGlobe(view);
        if (closed || !isActive('clouds')) { worldGlobe?.dispose?.(); worldGlobe = null; return null; }
        if (!worldGlobe || typeof worldGlobe.attachLayer !== 'function') throw new Error('The Clouds Earth Engine globe could not be created.');
        view.root.dataset.globeEngine = 'ready';
        layerDispose = worldGlobe.attachLayer('clouds-nasa-fraction', ({ THREE, earth, requestRender }) => {
          const material = new THREE.MeshBasicMaterial({
            transparent: true, opacity: Number(range.value) / 100,
            depthWrite: false, depthTest: true, side: THREE.FrontSide
          });
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.009, 128, 96), material);
          mesh.name = 'nasaTerraDailyCloudFraction';
          mesh.renderOrder = 3; mesh.visible = false; earth.add(mesh);
          cloudLayerMesh = mesh; cloudMaterial = material;
          requestRender?.();
          return () => {
            earth.remove(mesh); mesh.geometry.dispose(); material.map?.dispose(); material.dispose();
            if (cloudLayerMesh === mesh) { cloudLayerMesh = null; cloudMaterial = null; }
          };
        });
        if (typeof layerDispose !== 'function') throw new Error('The NASA cloud layer could not attach to the Clouds globe.');
        worldGlobe.requestRender?.();
        if (navigator.onLine === false) {
          setCloudStatus('Offline · the Earth globe is available, but NASA cloud imagery requires an internet connection.', 'error');
        } else {
          await loadCloudTexture();
        }
        return worldGlobe;
      } catch (error) {
        if (!closed && isActive('clouds')) setCloudStatus(`The Clouds Earth globe could not open. ${error?.message || ''}`, 'error');
        throw error;
      }
    })();
    engineReady.catch(() => {});

    hourlyTimer = window.setInterval(() => {
      if (!closed && isActive('clouds') && !document.hidden) loadCloudTexture();
    }, 60 * 60 * 1000);

    const networkOfflineHandler = () => {
      if (closed || !isActive('clouds')) return;
      cloudRequestController?.abort();
      if (cloudLayerMesh) cloudLayerMesh.visible = false;
      const staleTexture = cloudMaterial?.map;
      if (cloudMaterial) { cloudMaterial.map = null; cloudMaterial.needsUpdate = true; }
      staleTexture?.dispose?.();
      setCloudStatus('Offline · cloud imagery is hidden. An internet connection is required for a fresh image.', 'error');
      worldGlobe?.requestRender?.();
    };
    const networkOnlineHandler = () => {
      if (closed || !isActive('clouds')) return;
      setCloudStatus('Connection restored · requesting the latest available NASA cloud image…');
      window.setTimeout(() => { if (!closed && isActive('clouds')) loadCloudTexture(); }, 350);
    };
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);

    return () => {
      closed = true;
      if (hourlyTimer) clearInterval(hourlyTimer);
      hourlyTimer = 0;
      cloudRequestController?.abort(); cloudRequestController = null;
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
      try { layerDispose?.(); } catch (_) {}
      layerDispose = null; cloudLayerMesh = null; cloudMaterial = null;
      worldGlobe?.dispose?.(); worldGlobe = null;
    };
  }

  runtime.registerFeature('clouds', activateClouds);
})();
