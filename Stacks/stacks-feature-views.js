/* LIVE // EARTH V97 — online Stacks data views over the existing shared Earth.
   Uses the existing LiveEarthFeatureViews contract and LiveEarthScene Earth.
   No second Earth is created. Location-based weather uses only an already-enabled fix.
   Live-data views do not display old cached data as current while offline. */
(() => {
  'use strict';
  if (window.__liveEarthStacksFeatureViewsInstalled) return;
  const api = window.LiveEarthFeatureViews;
  if (!api || typeof api.register !== 'function') {
    // The registry may defer its setup until DOMContentLoaded. Do not silently
    // lose the Stacks views if this script wins the cache/load race on launch.
    if (!window.__liveEarthStacksFeatureViewsWaiting) {
      window.__liveEarthStacksFeatureViewsWaiting = true;
      const retryWhenRegistryReady = () => {
        if (window.__liveEarthStacksFeatureViewsInstalled || window.__liveEarthStacksFeatureViewsRetrying) return;
        if (!window.LiveEarthFeatureViews || typeof window.LiveEarthFeatureViews.register !== 'function') return;
        window.__liveEarthStacksFeatureViewsRetrying = true;
        const script = document.createElement('script');
        script.src = new URL('./stacks-feature-views.js', document.baseURI).href;
        script.onload = () => { window.__liveEarthStacksFeatureViewsRetrying = false; };
        script.onerror = () => { window.__liveEarthStacksFeatureViewsRetrying = false; };
        (document.head || document.documentElement).appendChild(script);
      };
      window.addEventListener('live-earth-feature-views-ready', retryWhenRegistryReady);
      document.addEventListener('DOMContentLoaded', retryWhenRegistryReady, { once: true });
    }
    console.warn('[LIVE // EARTH] Stacks feature views are waiting for the feature Orb registry.');
    return;
  }

  const VIEW_META = {
    clouds: { title: 'Clouds', symbol: '☁', description: 'Online NASA cloud-fraction imagery over the existing Earth globe; the product is daily, not minute-by-minute.' },
    weather: { title: 'Weather', symbol: '🌦', description: 'Online current-model weather for the existing enabled location; Location must be ON.' },
    elevation: { title: 'Elevation', symbol: '⛰', description: 'Online global relief imagery and a coordinate-based elevation lookup.' },
    earthquakes: { title: 'Earthquakes', symbol: '〰', description: 'Recent USGS earthquake events on the same Earth globe; refreshes while open.' },
    traffic: { title: 'Traffic', symbol: '↗', description: 'Preview screen only. A verified live traffic source is not connected yet.' }
  };

  const style = document.createElement('style');
  style.id = 'le-stacks-feature-views-v97-style';
  style.textContent = `
    #le-feature-stage.le-sfv-open{display:block!important;padding:0!important;overflow:hidden!important;background:radial-gradient(ellipse at 50% 38%,rgba(7,21,37,.18),rgba(2,5,11,.10) 70%)!important}
    #le-feature-stage .le-feature-stage-card[hidden]{display:none!important}
    .le-sfv{position:absolute;inset:0;z-index:6;pointer-events:none;color:#edf7ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .le-sfv-panel{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 58px);bottom:calc(env(safe-area-inset-bottom) + 105px);transform:translateX(-50%);width:min(90vw,460px);max-height:calc(100% - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 170px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;pointer-events:auto;padding:clamp(14px,3.8vw,21px);border:1px solid rgba(159,211,249,.22);border-radius:24px;background:linear-gradient(155deg,rgba(5,17,30,.83),rgba(3,8,16,.78));box-shadow:inset 1px 1px 2px rgba(255,255,255,.10),0 14px 42px rgba(0,0,0,.36),0 0 24px rgba(62,172,255,.08);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);scrollbar-width:none}
    .le-sfv-panel::-webkit-scrollbar{display:none}
    .le-sfv-head{display:flex;gap:12px;align-items:center;margin:0 0 14px}
    .le-sfv-symbol{flex:0 0 auto;display:grid;place-items:center;width:48px;aspect-ratio:1;border:1px solid rgba(215,243,255,.4);border-radius:50%;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.25),rgba(77,139,185,.10) 50%,rgba(0,5,13,.84));box-shadow:inset 1px 1px 4px #fff3,inset -3px -4px 7px #0009,0 0 18px rgba(100,200,255,.14);font-size:27px}
    .le-sfv-title{margin:0;font-size:clamp(21px,5.4vw,28px);font-weight:760;letter-spacing:-.02em;line-height:1.08}
    .le-sfv-subtitle{margin:5px 0 0;color:#a9c4d9;font-size:11px;line-height:1.45;letter-spacing:.025em}
    .le-sfv-pill{display:inline-flex;align-items:center;gap:6px;margin:0 0 13px;padding:6px 9px;border:1px solid rgba(125,204,241,.22);border-radius:999px;background:rgba(83,164,205,.09);color:#cfeeff;font-size:9px;font-weight:750;letter-spacing:.10em;text-transform:uppercase}
    .le-sfv-dot{width:6px;height:6px;border-radius:50%;background:#7ee4bd;box-shadow:0 0 8px #7ee4bd80}
    .le-sfv-card{margin:0 0 10px;padding:13px;border:1px solid rgba(153,201,234,.15);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.025));box-shadow:inset 1px 1px 1px rgba(255,255,255,.055)}
    .le-sfv-card h2,.le-sfv-card h3{margin:0 0 7px;color:#edf8ff;font-size:12px;font-weight:750;letter-spacing:.035em}
    .le-sfv-copy{margin:0;color:#b6cbdc;font-size:11px;line-height:1.55}
    .le-sfv-status{margin:0 0 10px;color:#91b7ce;font-size:10px;line-height:1.5}
    .le-sfv-status[data-state="error"]{color:#ffb8bd}
    .le-sfv-status[data-state="success"]{color:#9ce8c8}
    .le-sfv-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:11px}
    .le-sfv-button{appearance:none;min-height:38px;padding:9px 13px;border:1px solid rgba(140,211,246,.28);border-radius:999px;background:linear-gradient(135deg,rgba(57,156,206,.23),rgba(255,255,255,.04));color:#eff9ff;font:700 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.045em;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .le-sfv-button:active{transform:scale(.98)}
    .le-sfv-button:focus-visible,.le-sfv-input:focus-visible{outline:2px solid #8de1ff;outline-offset:3px}
    .le-sfv-button[disabled]{opacity:.45}
    .le-sfv-range{width:100%;accent-color:#75dcff;min-height:28px}
    .le-sfv-range-label{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#b9d0e1;font-size:10px}
    .le-sfv-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .le-sfv-metric{padding:11px;border-radius:13px;background:rgba(4,13,23,.48);border:1px solid rgba(153,201,234,.12);min-width:0}
    .le-sfv-metric-label{display:block;color:#92aec4;font-size:9px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}
    .le-sfv-metric-value{display:block;color:#f0f9ff;font-size:clamp(17px,4.8vw,23px);font-weight:700;line-height:1.15;overflow-wrap:anywhere}
    .le-sfv-metric-unit{color:#a9c5d7;font-size:10px;font-weight:500}
    .le-sfv-list{display:grid;gap:7px;margin-top:8px}
    .le-sfv-event{display:flex;align-items:flex-start;gap:9px;padding:9px;border:1px solid rgba(153,201,234,.12);border-radius:12px;background:rgba(1,8,17,.30);color:inherit;text-decoration:none}
    .le-sfv-mag{flex:0 0 auto;min-width:42px;padding:7px 5px;border-radius:9px;text-align:center;background:rgba(255,120,65,.12);border:1px solid rgba(255,153,98,.25);color:#ffd0b8;font-weight:800;font-size:11px}
    .le-sfv-event-text{min-width:0;flex:1}
    .le-sfv-event-place{display:block;color:#eef7ff;font-size:10px;line-height:1.4;font-weight:650}
    .le-sfv-event-meta{display:block;margin-top:3px;color:#8eabc0;font-size:9px;line-height:1.45}
    .le-sfv-input-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .le-sfv-input-wrap{display:grid;gap:5px;color:#a9c4d8;font-size:9px;letter-spacing:.04em}
    .le-sfv-input{width:100%;min-width:0;min-height:38px;border:1px solid rgba(153,201,234,.20);border-radius:10px;padding:8px 10px;background:rgba(0,8,17,.56);color:#f0f9ff;font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .le-sfv-attribution{margin:10px 0 0;color:#7997ad;font-size:9px;line-height:1.45}
    .le-sfv-attribution a{color:#98dfff;text-decoration:underline;text-underline-offset:2px}
    @media(prefers-reduced-motion:reduce){.le-sfv *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `;
  document.head.appendChild(style);

  let currentFeature = null;
  let currentRoot = null;
  let currentCleanup = null;
  const stage = () => document.getElementById('le-feature-stage');
  const stageCard = () => stage()?.querySelector('.le-feature-stage-card');
  const globe = () => window.LiveEarthScene || null;

  function el(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined && textContent !== null) node.textContent = textContent;
    return node;
  }
  function setStatus(node, message, state = '') {
    if (!node) return;
    node.textContent = message;
    if (state) node.dataset.state = state; else node.removeAttribute('data-state');
  }
  function button(label, action, className = 'le-sfv-button') {
    const node = el('button', className, label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  function card(title, description) {
    const node = el('section', 'le-sfv-card');
    if (title) node.appendChild(el('h2', '', title));
    if (description) node.appendChild(el('p', 'le-sfv-copy', description));
    return node;
  }
  function attribution(container, parts) {
    const node = el('p', 'le-sfv-attribution');
    for (const part of parts) {
      if (part.text) node.appendChild(document.createTextNode(part.text));
      if (part.href) {
        const a = el('a', '', part.label || part.href);
        a.href = part.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
        node.appendChild(a);
      }
    }
    container.appendChild(node);
    return node;
  }
  function mount(id) {
    cleanupCurrent();
    currentFeature = id;
    const host = stage();
    if (!host) return null;
    const cardNode = stageCard();
    if (cardNode) cardNode.hidden = true;
    host.classList.add('le-sfv-open');
    const meta = VIEW_META[id] || { title: id, symbol: '✦', description: 'Live Earth feature view.' };
    const root = el('div', `le-sfv le-sfv--${id}`);
    root.dataset.feature = id;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', `${meta.title} view`);
    root.innerHTML = `<div class="le-sfv-panel"><header class="le-sfv-head"><span class="le-sfv-symbol" aria-hidden="true"></span><div><h1 class="le-sfv-title"></h1><p class="le-sfv-subtitle"></p></div></header><div class="le-sfv-pill"><span class="le-sfv-dot" aria-hidden="true"></span><span class="le-sfv-pill-text"></span></div><div class="le-sfv-body"></div></div>`;
    root.querySelector('.le-sfv-symbol').textContent = meta.symbol;
    root.querySelector('.le-sfv-title').textContent = meta.title;
    root.querySelector('.le-sfv-subtitle').textContent = meta.description;
    const pillLabels = {
      clouds: 'ONLINE · NASA CLOUD PRODUCT',
      weather: 'ONLINE · LOCATION REQUIRED',
      elevation: 'ONLINE · GLOBAL RELIEF',
      earthquakes: 'ONLINE · USGS FEED',
      traffic: 'DATA SOURCE NOT CONNECTED'
    };
    root.querySelector('.le-sfv-pill-text').textContent = pillLabels[id] || 'FEATURE VIEW';
    host.appendChild(root);
    currentRoot = root;
    return { root, panel: root.querySelector('.le-sfv-panel'), body: root.querySelector('.le-sfv-body') };
  }
  function cleanupCurrent() {
    if (typeof currentCleanup === 'function') {
      try { currentCleanup(); } catch (error) { console.warn('[LIVE // EARTH] Feature cleanup failed.', error); }
    }
    currentCleanup = null;
    if (currentRoot) currentRoot.remove();
    currentRoot = null;
    const host = stage();
    host?.classList.remove('le-sfv-open');
    const cardNode = stageCard();
    if (cardNode) cardNode.hidden = false;
    currentFeature = null;
  }
  function attachLayer(id, factory) {
    const apiRef = globe();
    if (!apiRef || typeof apiRef.registerLayer !== 'function') return null;
    try { return apiRef.registerLayer(`stacks-${id}`, factory); }
    catch (error) { console.warn(`[LIVE // EARTH] ${id} layer could not attach.`, error); return null; }
  }
  function isActive(id) { return currentFeature === id; }

  // Live-data raster requests are network-only. The app shell may be cached,
  // but these views never paint a saved image and label it as current data.
  async function fetchImageBlob(url, timeoutMs = 18000, parentSignal = null) {
    const controller = new AbortController();
    const abortFromParent = () => controller.abort();
    if (parentSignal?.aborted) controller.abort();
    else parentSignal?.addEventListener('abort', abortFromParent, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal
      });
      const mime = (response.headers.get('content-type') || '').toLowerCase();
      if (!response.ok || !mime.startsWith('image/')) {
        throw new Error(`The imagery service returned ${response.status || 'an unusable response'}.`);
      }
      const blob = await response.blob();
      if (blob.size < 100) throw new Error('The imagery response was empty or incomplete.');
      return { blob, checkedAt: Date.now() };
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abortFromParent);
    }
  }
  function textureFromBlob(THREE, blob) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      if (!THREE?.TextureLoader) { URL.revokeObjectURL(objectUrl); reject(new Error('The shared Earth renderer is not ready.')); return; }
      const loader = new THREE.TextureLoader();
      loader.load(objectUrl, texture => {
        URL.revokeObjectURL(objectUrl);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 2;
        resolve(texture);
      }, undefined, error => {
        URL.revokeObjectURL(objectUrl);
        reject(error || new Error('The saved image could not be decoded.'));
      });
    });
  }
  async function getEarthRaster(layer, date = null) {
    const base = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
    const params = new URLSearchParams({
      SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetMap',
      LAYERS: layer, STYLES: '', SRS: 'EPSG:4326',
      BBOX: '-180,-90,180,90', WIDTH: '1536', HEIGHT: '768',
      FORMAT: 'image/png', TRANSPARENT: layer === 'MODIS_Terra_Cloud_Fraction_Day' ? 'true' : 'false'
    });
    if (date) params.set('TIME', date);
    return `${base}?${params.toString()}`;
  }
  function timeLabel(timestamp) {
    if (!timestamp) return 'time unknown';
    try { return new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return new Date(timestamp).toISOString(); }
  }

  // CLOUDS — NASA's daily cloud-fraction visualization is a real data layer,
  // not a fabricated procedural cloud skin. The image is checked hourly while active;
  // the source product itself is daily/nearest-available, not a guaranteed hourly composite.
  function activateClouds() {
    const view = mount('clouds'); if (!view) return;
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Preparing the latest available NASA cloud-fraction image…');
    body.appendChild(status);
    const controls = card('Layer controls', 'This is an observed cloud-fraction data product. Its colors represent cloud fraction; it is not a photographic cloud texture. The source composite is daily, and the app checks for a newer image hourly while this view is open.');
    const rangeLabel = el('label', 'le-sfv-range-label');
    const label = el('span', '', 'Layer opacity');
    const value = el('strong', '', '58%');
    rangeLabel.append(label, value);
    const range = el('input', 'le-sfv-range'); range.type = 'range'; range.min = '10'; range.max = '95'; range.step = '5'; range.value = '58'; range.setAttribute('aria-label', 'Cloud layer opacity');
    controls.append(rangeLabel, range);
    const actionRow = el('div', 'le-sfv-controls');
    const refresh = button('Refresh imagery', () => { loadCloudTexture(); });
    const toggle = button('Hide layer', () => {
      cloudVisible = !cloudVisible;
      if (cloudLayerMesh) cloudLayerMesh.visible = cloudVisible && !!cloudMaterial?.map;
      toggle.textContent = cloudVisible ? 'Hide layer' : 'Show layer';
      globe()?.requestRender?.();
    });
    actionRow.append(refresh, toggle);
    controls.append(actionRow);
    body.appendChild(controls);
    attribution(body, [
      { text: 'Imagery: ' },
      { label: 'NASA Global Imagery Browse Services (GIBS)', href: 'https://nasa-gibs.github.io/gibs-api-docs/' },
      { text: ' · MODIS/Terra Cloud Fraction (Day).' }
    ]);
    let cloudVisible = true, cloudLayerMesh = null, cloudMaterial = null, layerDispose = null, hourlyTimer = 0, loading = false, cloudRequestController = null;
    function setCloudStatus(message, state = '') { if (isActive('clouds')) setStatus(status, message, state); }
    layerDispose = attachLayer('clouds', ({ THREE, earth, redraw }) => {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: Number(range.value) / 100, depthWrite: false, depthTest: true, side: THREE.FrontSide });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.009, 96, 64), material);
      mesh.renderOrder = 3; mesh.visible = false; earth.add(mesh);
      cloudLayerMesh = mesh; cloudMaterial = material;
      return () => {
        earth.remove(mesh); mesh.geometry.dispose(); material.map?.dispose(); material.dispose();
        if (cloudLayerMesh === mesh) { cloudLayerMesh = null; cloudMaterial = null; }
      };
    });
    range.addEventListener('input', () => {
      value.textContent = `${range.value}%`;
      if (cloudMaterial) { cloudMaterial.opacity = Number(range.value) / 100; cloudMaterial.needsUpdate = true; }
      globe()?.requestRender?.();
    });
    async function loadCloudTexture() {
      if (!isActive('clouds') || loading || !cloudMaterial) return;
      loading = true; refresh.disabled = true;
      // Never leave an older image visible while waiting for a fresh online response.
      if (cloudLayerMesh) cloudLayerMesh.visible = false;
      globe()?.requestRender?.();
      const request = new AbortController(); cloudRequestController = request;
      const requestedDates = [0, 1, 2].map(daysAgo => {
        const d = new Date(); d.setUTCDate(d.getUTCDate() - daysAgo); return d.toISOString().slice(0, 10);
      });
      try {
        let result = null, usedDate = '', lastError = null;
        for (let i = 0; i < requestedDates.length; i++) {
          const date = requestedDates[i];
          try {
            const url = await getEarthRaster('MODIS_Terra_Cloud_Fraction_Day', date);
            result = await fetchImageBlob(url, 12000, request.signal);
            usedDate = date;
            break;
          } catch (error) {
            lastError = error;
            if (!isActive('clouds') || request.signal.aborted || error?.name === 'AbortError') throw error;
            if (i < requestedDates.length - 1) {
              setCloudStatus(`The cloud product for ${date} is not available yet. Trying the previous daily observation…`);
            }
          }
        }
        if (!result) throw lastError || new Error('No recent daily cloud product was returned.');
        const texture = await textureFromBlob(globeContextThree(), result.blob);
        if (!isActive('clouds') || cloudRequestController !== request || request.signal.aborted || !cloudMaterial) { texture.dispose(); return; }
        const old = cloudMaterial.map;
        cloudMaterial.map = texture; cloudMaterial.needsUpdate = true;
        if (cloudLayerMesh) cloudLayerMesh.visible = cloudVisible && !!cloudMaterial?.map;
        if (old && old !== texture) old.dispose();
        setCloudStatus(`NASA cloud-fraction image loaded · product date ${usedDate} · checked ${timeLabel(result.checkedAt)}. This is a daily product, not a minute-by-minute live cloud feed.`, 'success');
        globe()?.requestRender?.();
      } catch (error) {
        if (request.signal.aborted || error?.name === 'AbortError' || !isActive('clouds') || cloudRequestController !== request) return;
        const offline = navigator.onLine === false ? ' An internet connection is required; no saved cloud image is shown offline.' : '';
        setCloudStatus(`Cloud imagery is unavailable. The base Earth remains unchanged.${offline} ${error?.message || ''}`, 'error');
      } finally {
        if (cloudRequestController === request) cloudRequestController = null;
        loading = false; refresh.disabled = false;
      }
    }
    function globeContextThree() { return window.LiveEarthScene?.getTHREE?.() || null; }
    // Get THREE from the shared layer contract; older cached contracts fail gracefully.
    if (!cloudMaterial || !globe()?.getTHREE) {
      setCloudStatus('The shared Earth layer interface is unavailable. Your original Earth stays intact.', 'error');
    } else loadCloudTexture();
    hourlyTimer = window.setInterval(() => { if (isActive('clouds') && !document.hidden) loadCloudTexture(); }, 60 * 60 * 1000);
    const networkOfflineHandler = () => {
      if (!isActive('clouds')) return;
      cloudRequestController?.abort();
      if (cloudLayerMesh) cloudLayerMesh.visible = false;
      const staleTexture = cloudMaterial?.map;
      if (cloudMaterial) { cloudMaterial.map = null; cloudMaterial.needsUpdate = true; }
      staleTexture?.dispose?.();
      setCloudStatus('Offline · cloud imagery is hidden. An internet connection is required for a fresh image.', 'error');
      globe()?.requestRender?.();
    };
    const networkOnlineHandler = () => {
      if (!isActive('clouds')) return;
      setCloudStatus('Connection restored · requesting the latest available NASA cloud image…');
      window.setTimeout(() => { if (isActive('clouds')) loadCloudTexture(); }, 350);
    };
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);
    currentCleanup = () => {
      if (hourlyTimer) clearInterval(hourlyTimer);
      hourlyTimer = 0; cloudRequestController?.abort(); cloudRequestController = null;
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
      if (layerDispose) layerDispose();
      layerDispose = null; cloudLayerMesh = null; cloudMaterial = null;
    };
  }

  // WEATHER — reads only a fresh position already supplied by the Location system.
  // It never calls geolocation itself. Turning Location OFF clears the view immediately.
  function activateWeather() {
    const view = mount('weather'); if (!view) return;
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Checking Location permission…');
    body.appendChild(status);
    const metrics = el('div', 'le-sfv-metric-grid');
    const currentCard = card('Current conditions', 'Turn the red Location Orb ON to load weather for your current position. Weather requests are not made while Location is OFF.');
    currentCard.appendChild(metrics);
    const controls = el('div', 'le-sfv-controls');
    const refresh = button('Refresh weather', () => readExistingLocation());
    controls.appendChild(refresh); currentCard.appendChild(controls); body.appendChild(currentCard);
    attribution(body, [{ text: 'Weather data: ' }, { label: 'Open-Meteo', href: 'https://open-meteo.com/' }, { text: ' · CC BY 4.0 attribution required.' }]);
    let abortController = null, pollTimer = 0, locationEventHandler = null;
    function clearMetrics() { metrics.replaceChildren(); }
    function privacyState() {
      clearMetrics();
      setStatus(status, 'Location OFF · weather data cleared from this view. Turn ON the red Location Orb to request fresh local weather.');
      currentCard.querySelector('.le-sfv-copy').textContent = 'No weather request is made while Location is OFF. Coordinates are not saved by this view.';
      refresh.disabled = false;
    }
    function loadingState() {
      setStatus(status, 'Location is ON. Waiting for the existing location scanner to supply a fresh fix…');
      currentCard.querySelector('.le-sfv-copy').textContent = 'This view waits for the shared Location system; it does not start a separate location request.';
    }
    async function readExistingLocation() {
      if (!isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) { privacyState(); return; }
      if (navigator.onLine === false) {
        clearMetrics();
        setStatus(status, 'Offline · internet is required for current weather. No saved weather is shown.', 'error');
        currentCard.querySelector('.le-sfv-copy').textContent = 'Weather data is unavailable offline. Reconnect to request a fresh model update.';
        refresh.disabled = false;
        return;
      }
      const point = globe()?.getLocation?.();
      if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) { loadingState(); return; }
      if (abortController) abortController.abort();
      abortController = new AbortController();
      const controller = abortController;
      refresh.disabled = true; clearMetrics();
      setStatus(status, 'Loading current conditions for the fresh, enabled location…');
      try {
        const q = new URLSearchParams({ latitude: String(point.latitude), longitude: String(point.longitude), current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m', timezone: 'auto' });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${q.toString()}`, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`Weather source returned ${response.status}.`);
        const data = await response.json();
        if (!isActive('weather') || window.liveEarthLocationAllowed?.() !== true || abortController !== controller) return;
        const current = data?.current;
        if (!current || !Number.isFinite(Number(current.temperature_2m))) throw new Error('The weather response did not contain current conditions.');
        const values = [
          ['Temperature', current.temperature_2m, data.current_units?.temperature_2m || '°C'],
          ['Feels like', current.apparent_temperature, data.current_units?.apparent_temperature || '°C'],
          ['Humidity', current.relative_humidity_2m, data.current_units?.relative_humidity_2m || '%'],
          ['Wind', current.wind_speed_10m, data.current_units?.wind_speed_10m || 'km/h'],
          ['Cloud cover', current.cloud_cover, data.current_units?.cloud_cover || '%'],
          ['Precipitation', current.precipitation, data.current_units?.precipitation || 'mm']
        ];
        metrics.replaceChildren();
        for (const [labelText, raw, unit] of values) {
          const metric = el('div', 'le-sfv-metric');
          metric.appendChild(el('span', 'le-sfv-metric-label', labelText));
          const val = raw === undefined || raw === null || !Number.isFinite(Number(raw)) ? '—' : String(raw);
          const valueNode = el('strong', 'le-sfv-metric-value', val);
          const unitNode = el('span', 'le-sfv-metric-unit', ` ${unit}`); valueNode.appendChild(unitNode);
          metric.appendChild(valueNode); metrics.appendChild(metric);
        }
        const observed = current.time ? new Date(current.time).toLocaleString() : 'time not supplied';
        setStatus(status, `Open-Meteo current-model snapshot · ${observed}. Coordinates remain in memory only.`, 'success');
        currentCard.querySelector('.le-sfv-copy').textContent = 'Conditions are model-based estimates for the enabled location, not an on-site weather-station reading.';
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isActive('weather') && window.liveEarthLocationAllowed?.() === true) setStatus(status, `Weather could not be loaded: ${error?.message || 'connection unavailable'}.`, 'error');
      } finally {
        if (abortController === controller) { refresh.disabled = false; }
      }
    }
    function waitForExistingFix() {
      if (pollTimer) clearInterval(pollTimer);
      let remaining = 24;
      pollTimer = window.setInterval(() => {
        if (!isActive('weather')) { clearInterval(pollTimer); pollTimer = 0; return; }
        if (window.liveEarthLocationAllowed?.() !== true) { clearInterval(pollTimer); pollTimer = 0; privacyState(); return; }
        const point = globe()?.getLocation?.();
        if (point) { clearInterval(pollTimer); pollTimer = 0; readExistingLocation(); return; }
        remaining--;
        if (remaining <= 0) { clearInterval(pollTimer); pollTimer = 0; setStatus(status, 'Location is ON, but no fresh position is available yet. Wait for the red scanner to settle, then refresh.', 'error'); }
      }, 500);
    }
    locationEventHandler = event => {
      if (!isActive('weather')) return;
      if (event.detail?.enabled !== true || window.liveEarthLocationAllowed?.() !== true) {
        abortController?.abort(); privacyState();
      } else { loadingState(); waitForExistingFix(); }
    };
    const networkOfflineHandler = () => {
      if (!isActive('weather')) return;
      abortController?.abort();
      clearMetrics();
      setStatus(status, 'Offline · internet is required for current weather. No saved weather is shown.', 'error');
      currentCard.querySelector('.le-sfv-copy').textContent = 'Weather data is unavailable offline. Reconnect to request a fresh model update.';
      refresh.disabled = false;
    };
    const networkOnlineHandler = () => {
      if (!isActive('weather')) return;
      if (window.liveEarthLocationAllowed?.() !== true) { privacyState(); return; }
      loadingState();
      if (globe()?.getLocation?.()) readExistingLocation();
      else waitForExistingFix();
    };
    window.addEventListener('live-earth-location-state', locationEventHandler);
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);
    if (window.liveEarthLocationAllowed?.() === true) { loadingState(); waitForExistingFix(); }
    else privacyState();
    currentCleanup = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = 0; abortController?.abort(); abortController = null;
      if (locationEventHandler) window.removeEventListener('live-earth-location-state', locationEventHandler);
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
    };
  }

  // ELEVATION — the globe layer is NASA's global shaded-relief/bathymetry raster.
  // Numerical point elevations are queried on demand; no device location is requested.
  function activateElevation() {
    const view = mount('elevation'); if (!view) return;
    const { body } = view;
    let reliefRequestController = null, elevationLookupController = null;
    const status = el('p', 'le-sfv-status', 'Preparing global shaded relief and bathymetry…'); body.appendChild(status);
    const controls = card('Relief layer', 'A global shaded-relief and bathymetry image over the same Earth sphere. This first layer changes the surface visualization; it does not physically displace the globe mesh.');
    const rangeLabel = el('label', 'le-sfv-range-label');
    const left = el('span', '', 'Overlay opacity'); const right = el('strong', '', '88%'); rangeLabel.append(left, right);
    const range = el('input', 'le-sfv-range'); range.type = 'range'; range.min = '25'; range.max = '100'; range.step = '5'; range.value = '88'; range.setAttribute('aria-label', 'Elevation layer opacity');
    const actions = el('div', 'le-sfv-controls');
    const refresh = button('Refresh relief layer', () => loadRelief());
    const toggle = button('Hide relief layer', () => {
      reliefVisible = !reliefVisible;
      if (reliefMesh) reliefMesh.visible = reliefVisible && !!reliefMaterial?.map;
      toggle.textContent = reliefVisible ? 'Hide relief layer' : 'Show relief layer';
      globe()?.requestRender?.();
    });
    actions.append(refresh, toggle); controls.append(rangeLabel, range, actions); body.appendChild(controls);

    const lookup = card('Point elevation lookup', 'Enter coordinates to ask Open-Meteo for a modelled surface elevation. Device location is never requested here. This image is a global relief/bathymetry baseline, not a time-varying live terrain scan; the coordinate lookup requires an internet connection. The numeric result is not a seafloor-depth measurement.');
    const inputRow = el('div', 'le-sfv-input-row');
    const latWrap = el('label', 'le-sfv-input-wrap', 'LATITUDE'); const latInput = el('input', 'le-sfv-input'); latInput.type = 'number'; latInput.min = '-90'; latInput.max = '90'; latInput.step = 'any'; latInput.placeholder = 'e.g. 27.0'; latInput.value = '0'; latWrap.appendChild(latInput);
    const lonWrap = el('label', 'le-sfv-input-wrap', 'LONGITUDE'); const lonInput = el('input', 'le-sfv-input'); lonInput.type = 'number'; lonInput.min = '-180'; lonInput.max = '180'; lonInput.step = 'any'; lonInput.placeholder = 'e.g. 78.0'; lonInput.value = '0'; lonWrap.appendChild(lonInput);
    inputRow.append(latWrap, lonWrap); lookup.appendChild(inputRow);
    const lookupStatus = el('p', 'le-sfv-status', 'No coordinate lookup requested.'); lookupStatus.style.marginTop = '10px'; lookup.appendChild(lookupStatus);
    const lookupActions = el('div', 'le-sfv-controls');
    const locate = button('Use enabled Location', () => {
      if (window.liveEarthLocationAllowed?.() !== true) { setStatus(lookupStatus, 'Location is OFF. Turn it ON first, or enter coordinates manually.', 'error'); return; }
      const point = globe()?.getLocation?.();
      if (!point) { setStatus(lookupStatus, 'Waiting for a fresh fix from the existing Location scanner.', 'error'); return; }
      latInput.value = point.latitude.toFixed(4); lonInput.value = point.longitude.toFixed(4);
      setStatus(lookupStatus, 'Copied the current enabled position into the fields. No new location request was made.');
    });
    const look = button('Look up elevation', async () => {
      const lat = Number(latInput.value), lon = Number(lonInput.value);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) { setStatus(lookupStatus, 'Enter a valid latitude (−90 to 90) and longitude (−180 to 180).', 'error'); return; }
      if (navigator.onLine === false) { setStatus(lookupStatus, 'Offline · internet is required for a point elevation lookup. No saved result is shown.', 'error'); return; }
      elevationLookupController?.abort();
      const controller = new AbortController(); elevationLookupController = controller;
      look.disabled = true; setStatus(lookupStatus, 'Querying the public elevation model online…');
      try {
        const q = new URLSearchParams({ latitude: String(lat), longitude: String(lon) });
        const response = await fetch(`https://api.open-meteo.com/v1/elevation?${q.toString()}`, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`Elevation source returned ${response.status}.`);
        const data = await response.json();
        const elevation = Array.isArray(data?.elevation) ? Number(data.elevation[0]) : NaN;
        if (!Number.isFinite(elevation)) throw new Error('No elevation value was returned.');
        if (!isActive('elevation') || elevationLookupController !== controller) return;
        setStatus(lookupStatus, `Modelled surface elevation: ${Math.round(elevation).toLocaleString()} m at ${lat.toFixed(3)}°, ${lon.toFixed(3)}°.`, 'success');
      } catch (error) {
        if (error?.name !== 'AbortError' && isActive('elevation') && elevationLookupController === controller) {
          const offline = navigator.onLine === false ? ' Internet connection required; no saved result is used.' : '';
          setStatus(lookupStatus, `Elevation lookup unavailable: ${error?.message || 'connection failed'}.${offline}`, 'error');
        }
      } finally { if (elevationLookupController === controller) { elevationLookupController = null; look.disabled = false; } }
    });
    lookupActions.append(locate, look); lookup.appendChild(lookupActions); body.appendChild(lookup);
    attribution(body, [{ text: 'Global relief: ' }, { label: 'NASA GIBS', href: 'https://nasa-gibs.github.io/gibs-api-docs/' }, { text: ' · Point elevation: ' }, { label: 'Open-Meteo Elevation API', href: 'https://open-meteo.com/en/docs/elevation-api' }, { text: ' (90 m Copernicus DEM GLO-90 model estimate; Copernicus Programme attribution).' }]);

    let reliefMesh = null, reliefMaterial = null, reliefVisible = true, layerDispose = null, loading = false;
    layerDispose = attachLayer('elevation', ({ THREE, earth, redraw }) => {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: Number(range.value) / 100, depthWrite: false, depthTest: true, side: THREE.FrontSide });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.006, 96, 64), material);
      mesh.renderOrder = 2; mesh.visible = false; earth.add(mesh); reliefMesh = mesh; reliefMaterial = material;
      return () => {
        earth.remove(mesh); mesh.geometry.dispose(); material.map?.dispose(); material.dispose();
        if (reliefMesh === mesh) { reliefMesh = null; reliefMaterial = null; }
      };
    });
    range.addEventListener('input', () => { right.textContent = `${range.value}%`; if (reliefMaterial) { reliefMaterial.opacity = Number(range.value) / 100; reliefMaterial.needsUpdate = true; } globe()?.requestRender?.(); });
    async function loadRelief() {
      if (!isActive('elevation') || !reliefMaterial) return;
      if (navigator.onLine === false) {
        if (reliefMesh) reliefMesh.visible = false;
        setStatus(status, 'Offline · internet is required for the relief imagery. The base Earth remains unchanged.', 'error');
        globe()?.requestRender?.();
        return;
      }
      if (loading) return;
      loading = true; refresh.disabled = true;
      if (reliefMesh) reliefMesh.visible = false;
      globe()?.requestRender?.();
      setStatus(status, 'Loading NASA global shaded-relief and bathymetry imagery…');
      reliefRequestController?.abort();
      const controller = new AbortController(); reliefRequestController = controller;
      try {
        const url = await getEarthRaster('BlueMarble_ShadedRelief_Bathymetry');
        const result = await fetchImageBlob(url, 18000, controller.signal);
        const texture = await textureFromBlob(globe()?.getTHREE?.(), result.blob);
        if (!isActive('elevation') || !reliefMaterial || controller.signal.aborted) { texture.dispose(); return; }
        const old = reliefMaterial.map; reliefMaterial.map = texture; reliefMaterial.needsUpdate = true;
        if (reliefMesh) reliefMesh.visible = reliefVisible && !!reliefMaterial?.map;
        if (old && old !== texture) old.dispose();
        setStatus(status, `Global relief layer loaded from NASA · checked ${timeLabel(result.checkedAt)}.`, 'success');
        globe()?.requestRender?.();
      } catch (error) {
        if (error?.name !== 'AbortError' && isActive('elevation')) {
          const offline = navigator.onLine === false ? ' Internet connection required; no saved relief image is shown offline.' : '';
          setStatus(status, `Global relief imagery unavailable. The base Earth remains unchanged.${offline} ${error?.message || ''}`, 'error');
        }
      } finally {
        if (reliefRequestController === controller) { reliefRequestController = null; loading = false; refresh.disabled = false; }
      }
    }
    const networkOfflineHandler = () => {
      if (!isActive('elevation')) return;
      reliefRequestController?.abort();
      elevationLookupController?.abort();
      if (reliefMesh) reliefMesh.visible = false;
      const staleTexture = reliefMaterial?.map;
      if (reliefMaterial) { reliefMaterial.map = null; reliefMaterial.needsUpdate = true; }
      staleTexture?.dispose?.();
      setStatus(status, 'Offline · relief imagery is hidden until a fresh online request can be made. The base Earth remains unchanged.', 'error');
      setStatus(lookupStatus, 'Offline · internet is required for point elevation lookups. No saved result is shown.', 'error');
      refresh.disabled = false; look.disabled = false;
      globe()?.requestRender?.();
    };
    const networkOnlineHandler = () => {
      if (!isActive('elevation')) return;
      setStatus(status, 'Connection restored · requesting fresh relief imagery…');
      window.setTimeout(() => { if (isActive('elevation')) loadRelief(); }, 350);
      setStatus(lookupStatus, 'Online again · enter coordinates and request a fresh elevation result when needed.');
    };
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);
    if (reliefMaterial && globe()?.getTHREE) loadRelief();
    else setStatus(status, 'The shared Earth layer interface is unavailable. The original Earth stays intact.', 'error');
    currentCleanup = () => {
      reliefRequestController?.abort(); reliefRequestController = null;
      elevationLookupController?.abort(); elevationLookupController = null;
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
      if (layerDispose) layerDispose(); layerDispose = null; reliefMesh = null; reliefMaterial = null;
    };
  }

  // EARTHQUAKES — live latest-day GeoJSON from USGS; no persistent/offline snapshot is used.
  const QUAKE_FEED = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  function simplifyQuakes(payload) {
    const features = Array.isArray(payload?.features) ? payload.features : [];
    return features.map(item => {
      const c = item?.geometry?.coordinates, p = item?.properties;
      if (!Array.isArray(c) || c.length < 3 || !p) return null;
      const lon = Number(c[0]), lat = Number(c[1]), depth = Number(c[2]), mag = Number(p.mag);
      if (![lon, lat, depth, mag].every(Number.isFinite) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
      const url = typeof p.url === 'string' && p.url.startsWith('https://earthquake.usgs.gov/earthquakes/eventpage/') ? p.url : 'https://earthquake.usgs.gov/earthquakes/';
      return { id: String(item.id || `${lon}:${lat}:${p.time}`), mag, place: String(p.place || 'Location not supplied').slice(0, 160), time: Number(p.time) || 0, depth, lat, lon, url };
    }).filter(Boolean).sort((a, b) => b.mag - a.mag).slice(0, 120);
  }
  function formatAgo(timestamp) {
    const mins = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60); if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} d ago`;
  }
  function activateEarthquakes() {
    const view = mount('earthquakes'); if (!view) return;
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Checking the recent USGS earthquake feed…'); body.appendChild(status);
    const summary = el('div', 'le-sfv-metric-grid');
    const countMetric = el('div', 'le-sfv-metric'); countMetric.append(el('span', 'le-sfv-metric-label', 'Events today'), el('strong', 'le-sfv-metric-value', '—'));
    const largestMetric = el('div', 'le-sfv-metric'); largestMetric.append(el('span', 'le-sfv-metric-label', 'Largest reported'), el('strong', 'le-sfv-metric-value', '—'));
    summary.append(countMetric, largestMetric); body.appendChild(summary);
    const listCard = card('Largest recent events', 'Select an event to open its official USGS details. Markers are placed on the existing rotating Earth. The feed is refreshed while this view is open; no saved snapshot is presented as live.');
    const list = el('div', 'le-sfv-list'); listCard.appendChild(list); body.appendChild(listCard);
    const refresh = button('Refresh USGS feed', loadQuakes); const row = el('div', 'le-sfv-controls'); row.appendChild(refresh); body.appendChild(row);
    attribution(body, [{ text: 'Event data: ' }, { label: 'USGS real-time GeoJSON feeds', href: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php' }, { text: ' · The official latest-day feed is generally refreshed every minute.' }]);
    let events = [], savedAt = 0, refreshTimer = 0, visibilityHandler = null;
    let layerDispose = null, markerGroup = null, markerTHREE = null, markerMaterials = null, markerGeometry = null, requestController = null;
    function clearMarkerChildren() {
      if (!markerGroup || !markerTHREE) return;
      markerGroup.clear();
    }
    function paintMarkers() {
      if (!markerGroup || !markerTHREE || !markerMaterials || !markerGeometry) return;
      clearMarkerChildren();
      for (const event of events.slice(0, 120)) {
        const phi = event.lat * Math.PI / 180, lambda = event.lon * Math.PI / 180;
        const marker = new markerTHREE.Mesh(markerGeometry, event.mag >= 5 ? markerMaterials.high : event.mag >= 3.5 ? markerMaterials.mid : markerMaterials.low);
        marker.position.set(Math.cos(phi) * Math.cos(lambda), Math.sin(phi), -Math.cos(phi) * Math.sin(lambda)).multiplyScalar(1.012);
        const scale = Math.max(.75, Math.min(2.7, .55 + Math.pow(10, Math.max(0, event.mag) * .20) * .19));
        marker.scale.setScalar(scale); markerGroup.add(marker);
      }
      globe()?.requestRender?.();
    }
    layerDispose = attachLayer('earthquakes', ({ THREE, earth }) => {
      const group = new THREE.Group(); earth.add(group);
      markerGroup = group; markerTHREE = THREE; markerGeometry = new THREE.SphereGeometry(.0055, 8, 6);
      markerMaterials = {
        low: new THREE.MeshBasicMaterial({ color: 0xffd18a, depthWrite: false }),
        mid: new THREE.MeshBasicMaterial({ color: 0xff8d4d, depthWrite: false }),
        high: new THREE.MeshBasicMaterial({ color: 0xff365d, depthWrite: false })
      };
      paintMarkers();
      return () => {
        earth.remove(group); group.clear(); markerGeometry?.dispose();
        Object.values(markerMaterials || {}).forEach(material => material.dispose());
        markerGroup = markerTHREE = markerGeometry = markerMaterials = null;
      };
    });
    function renderEventList() {
      countMetric.querySelector('.le-sfv-metric-value').textContent = String(events.length);
      largestMetric.querySelector('.le-sfv-metric-value').textContent = events.length ? `M ${events[0].mag.toFixed(1)}` : '—';
      list.replaceChildren();
      if (!events.length) {
        list.appendChild(el('p', 'le-sfv-copy', 'No live events are currently displayed. Connect to the internet or refresh to request the official feed. This view does not show saved events as current data.'));
        // Clear globe markers as well as the list when offline or when the feed fails.
        paintMarkers();
        return;
      }
      for (const event of events.slice(0, 6)) {
        const link = el('a', 'le-sfv-event'); link.href = event.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.appendChild(el('span', 'le-sfv-mag', `M${event.mag.toFixed(1)}`));
        const details = el('span', 'le-sfv-event-text');
        details.appendChild(el('span', 'le-sfv-event-place', event.place));
        details.appendChild(el('span', 'le-sfv-event-meta', `${formatAgo(event.time)} · depth ${Number(event.depth).toFixed(1)} km`));
        link.appendChild(details); list.appendChild(link);
      }
      paintMarkers();
    }
    async function loadQuakes() {
      if (!isActive('earthquakes')) return;
      if (navigator.onLine === false) {
        requestController?.abort();
        events = []; savedAt = 0; renderEventList();
        setStatus(status, 'Offline · internet is required for the current USGS feed. No saved earthquake data is shown.', 'error');
        refresh.disabled = false; globe()?.requestRender?.();
        return;
      }
      if (requestController) requestController.abort();
      requestController = new AbortController();
      const controller = requestController; refresh.disabled = true;
      setStatus(status, 'Loading the latest USGS feed from the internet…');
      try {
        const response = await fetch(QUAKE_FEED, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`USGS feed returned ${response.status}.`);
        const payload = await response.json();
        const fresh = simplifyQuakes(payload);
        if (!fresh.length && !Array.isArray(payload?.features)) throw new Error('The USGS feed format was not recognized.');
        if (!isActive('earthquakes') || requestController !== controller) return;
        events = fresh; savedAt = Number(payload?.metadata?.generated) || Date.now(); renderEventList();
        setStatus(status, `USGS feed refreshed ${timeLabel(savedAt)} · latest-day catalogue.`, 'success');
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isActive('earthquakes') && requestController === controller) {
          events = []; savedAt = 0; renderEventList();
          const offline = navigator.onLine === false ? ' Internet connection required; no cached earthquake data is shown offline.' : ' No saved snapshot is presented as live data.';
          setStatus(status, `The live USGS feed is unavailable: ${error?.message || 'connection failed'}.${offline}`, 'error');
        }
      } finally { if (requestController === controller) refresh.disabled = false; }
    }
    const networkOfflineHandler = () => {
      if (!isActive('earthquakes')) return;
      requestController?.abort();
      events = []; savedAt = 0; renderEventList();
      setStatus(status, 'Offline · internet is required for the current USGS feed. No saved earthquake data is shown.', 'error');
      refresh.disabled = false; globe()?.requestRender?.();
    };
    const networkOnlineHandler = () => { if (isActive('earthquakes')) loadQuakes(); };
    window.addEventListener('offline', networkOfflineHandler);
    window.addEventListener('online', networkOnlineHandler);
    renderEventList();
    loadQuakes();
    refreshTimer = window.setInterval(() => { if (isActive('earthquakes') && !document.hidden) loadQuakes(); }, 60 * 1000);
    visibilityHandler = () => { if (!document.hidden && isActive('earthquakes')) loadQuakes(); };
    document.addEventListener('visibilitychange', visibilityHandler);
    currentCleanup = () => {
      if (refreshTimer) clearInterval(refreshTimer); refreshTimer = 0;
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler); visibilityHandler = null;
      window.removeEventListener('offline', networkOfflineHandler);
      window.removeEventListener('online', networkOnlineHandler);
      requestController?.abort(); requestController = null;
      if (layerDispose) layerDispose(); layerDispose = null;
      markerGroup = markerTHREE = markerGeometry = markerMaterials = null;
    };
  }

  // TRAFFIC — provide a finished, honest view rather than inventing global live congestion.
  function activateTraffic() {
    const view = mount('traffic'); if (!view) return;
    const { body } = view;
    const status = el('p', 'le-sfv-status', 'Preview ready · no live traffic requests are made.'); body.appendChild(status);
    const intro = card('Traffic layer · source pending', 'This view is included for navigation and layout testing, but the live traffic feed is not connected. There is no verified global, no-cost source configured for this app, so this view intentionally draws no fake congestion and makes no traffic API requests.');
    const rows = el('div', 'le-sfv-metric-grid');
    for (const [label, value] of [['Road network', 'Not connected'], ['Live congestion', 'Not connected'], ['Route speeds', 'Not connected'], ['Offline snapshot', 'Not available yet']]) {
      const item = el('div', 'le-sfv-metric'); item.append(el('span', 'le-sfv-metric-label', label), el('strong', 'le-sfv-metric-value', value)); rows.appendChild(item);
    }
    intro.appendChild(rows); body.appendChild(intro);
    const next = card('Integration rule', 'When a trustworthy traffic source is selected, its road and congestion layer can attach to the existing Earth through the shared layer interface. This view currently leaves the Earth untouched.');
    body.appendChild(next);
    attribution(body, [{ text: 'No traffic network is queried by this preview. ' }]);
    currentCleanup = () => {};
  }

  const activation = {
    clouds: activateClouds,
    weather: activateWeather,
    elevation: activateElevation,
    earthquakes: activateEarthquakes,
    traffic: activateTraffic
  };
  for (const [id, meta] of Object.entries(VIEW_META)) {
    api.register(id, {
      title: meta.title,
      shortLabel: id === 'earthquakes' ? 'Quakes' : meta.title,
      symbol: meta.symbol,
      description: meta.description,
      connected: id !== 'traffic',
      activate: () => {
        try { activation[id](); }
        catch (error) {
          console.error(`[LIVE // EARTH] ${id} view failed to open.`, error);
          const view = mount(id);
          if (view) view.body.appendChild(el('p', 'le-sfv-status', `This view could not initialize. The Home Earth is preserved. ${error?.message || ''}`));
          currentCleanup = () => {};
        }
      },
      deactivate: () => cleanupCurrent()
    });
  }

  // Location OFF always cancels any feature-level attempt that could use a device fix.
  // Weather owns the only local-weather request in this module and explicitly aborts it.
  window.__liveEarthStacksFeatureViewsInstalled = true;
  window.dispatchEvent(new Event('live-earth-stacks-feature-views-ready'));
})();
