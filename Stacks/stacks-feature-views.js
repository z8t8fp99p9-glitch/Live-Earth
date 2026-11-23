/* LIVE // EARTH V155 — shared Stacks runtime with on-demand feature controllers.
   Uses the existing LiveEarthFeatureViews contract and Prime Earth scene.
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
        script.src = new URL('./Stacks/stacks-feature-views.js', document.baseURI).href;
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

  if (window.__liveEarthStacksFeatureViewsLoading) return;
  window.__liveEarthStacksFeatureViewsLoading = true;

  // These seven numerical worlds own independent Earth Engine globes and need
  // a shared exclusive-screen guard. Other Stacks views retain their own
  // presentation: Prime Earth layer overlays, Weather's full-page scene, or
  // the dedicated Traffic/Editorial workspaces.
  const EXCLUSIVE_WORLD_VIEWS = new Set([
    'atmosphere',
    'atmospheric-composition',
    'oceans',
    'land',
    'water-ice',
    'earth-activity',
    'energy-humanity'
  ]);

  const VIEW_META = {
    clouds: { title: 'Clouds', symbol: '☁', description: 'Online NASA cloud-fraction imagery over the existing Earth globe; the product is daily, not minute-by-minute.' },
    weather: { title: 'Weather', symbol: '🌦', description: 'Online current-model weather for the existing enabled location; Location must be ON.' },
    elevation: { title: 'Elevation', symbol: '⛰', description: 'Online global relief imagery and a coordinate-based elevation lookup.' },
    earthquakes: { title: 'Earthquakes', symbol: '〰', description: 'Recent USGS earthquake events on the same Earth globe; refreshes while open.' },
    traffic: { title: 'Traffic', symbol: '↗', description: 'Independent traffic workspace; verified live traffic data is not connected yet.' },
    // Numerical discovery worlds are catalogue entries as well as runtime modules.
    // registerFeature intentionally rejects ids that are not declared here.
    atmosphere: { title: 'Atmosphere', symbol: '◉', description: 'A numerical view of atmospheric conditions: temperature, pressure, wind and moisture.' },
    'atmospheric-composition': { title: 'Atmospheric Composition', symbol: '◌', description: 'A dedicated world for verified atmospheric constituents and chemistry, including greenhouse gases, ozone, aerosols and particulates.' },
    oceans: { title: 'Oceans', symbol: '≈', description: 'A visual preview of numerical ocean systems: currents, heat, salinity, sea level and marine productivity.' },
    land: { title: 'Land', symbol: '⌁', description: 'A visual preview of numerical land systems: terrain, soils, vegetation and land-cover change.' },
    'water-ice': { title: 'Water & Ice', symbol: '❄', description: 'A visual preview of freshwater and cryosphere systems: rainfall, snow, glaciers, ice and water storage.' },
    'earth-activity': { title: 'Earth Activity', symbol: '✧', description: 'A visual preview of measured geophysical and environmental activity, including earthquakes, volcanoes and fires.' },
    'energy-humanity': { title: 'Energy & Humanity', symbol: '✺', description: 'A visual preview of planetary energy and human activity indicators, including radiation, night lights and land use.' },
    'editorial-engine': { title: 'Editorial Engine', symbol: '✍️', description: 'A full-screen workspace for the retained Universal Editorial Engine utilities.' }
  };

  const style = document.createElement('style');
  style.id = 'le-stacks-feature-views-v155-style';
  style.textContent = `
    /* Preserve the shared feature-Orb symbol scale/highlight without loading the Editorial workspace. */
    .le-feature-library-item .le-feature-symbol{font-size:clamp(30px,8vmin,42px);filter:drop-shadow(0 2px 5px rgba(0,0,0,.72))}
    #le-feature-dock .le-feature-orb .le-feature-symbol{font-size:clamp(30px,8vmin,42px)}
    #le-feature-library .le-feature-library-item .orbShell:before{background:radial-gradient(ellipse at 28% 16%,rgba(255,255,255,.58),transparent 30%),linear-gradient(138deg,rgba(255,255,255,.25),rgba(255,255,255,.035) 27%,transparent 47%,rgba(255,255,255,.09) 76%,rgba(255,255,255,.22))}
    /* The Editorial Orb keeps its identity in the shared catalogue; its workspace stays on-demand. */
    #le-feature-library .le-feature-library-item[data-feature="editorial-engine"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="editorial-engine"] .orbShell{background:radial-gradient(circle at 30% 22%,#ffe0a8 0,#b7793d 24%,#4b281b 67%,#160e0b 100%);border-color:#f4d09a;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #160a0acc,0 0 22px #d69c5577,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item[data-feature="editorial-engine"] .orbShell:before{background:radial-gradient(ellipse at 28% 16%,rgba(255,255,255,.58),transparent 30%),linear-gradient(138deg,rgba(255,255,255,.25),rgba(255,255,255,.035) 27%,transparent 47%,rgba(255,255,255,.09) 76%,rgba(255,255,255,.22))}
    #le-feature-library .le-feature-library-item[data-feature="editorial-engine"] .le-feature-symbol,#le-feature-dock .le-feature-orb[data-feature="editorial-engine"] .le-feature-symbol{font-size:clamp(30px,8vmin,42px)}
    /* Independent numerical worlds are exclusive full-screen observatories.
       Hide Home's canvas while one is mounted; the shared three-Orb dock stays above the stage. */
    body.le-exclusive-world-open #scene{visibility:hidden!important;pointer-events:none!important}
    body.le-exclusive-world-open .le-world-engine-host{
      background:radial-gradient(ellipse at 50% 43%,#0a1b2b 0%,#030914 58%,#010308 100%);
    }
    /* Feature views occupy the complete stage. The protected Global three-Orb dock stays above them. */
    #le-feature-stage.le-sfv-open{display:block!important;padding:0!important;overflow:hidden!important;background:transparent!important}
    #le-feature-stage .le-feature-stage-card[hidden]{display:none!important}
    .le-sfv{position:absolute;inset:0;z-index:6;pointer-events:none;color:#edf7ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
    .le-sfv-panel{position:absolute;inset:0;transform:none;width:100%;max-width:none;max-height:none;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;pointer-events:auto;padding:calc(env(safe-area-inset-top) + clamp(68px,10vmin,88px)) clamp(15px,4vw,32px) calc(env(safe-area-inset-bottom) + clamp(122px,18vmin,146px));border:0;border-radius:0;background:linear-gradient(180deg,rgba(3,12,23,.93),rgba(3,9,18,.82) 58%,rgba(2,7,14,.94));box-shadow:none;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);scrollbar-width:none}
    .le-sfv-panel::-webkit-scrollbar{display:none}
    .le-sfv--elevation .le-sfv-panel{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 58px);bottom:calc(env(safe-area-inset-bottom) + 105px);transform:translateX(-50%);width:min(90vw,460px);max-width:460px;max-height:calc(100% - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 170px);overflow:auto;padding:clamp(14px,3.8vw,21px);border:1px solid rgba(159,211,249,.22);border-radius:24px;background:linear-gradient(155deg,rgba(5,17,30,.83),rgba(3,8,16,.78));box-shadow:inset 1px 1px 2px rgba(255,255,255,.10),0 14px 42px rgba(0,0,0,.36),0 0 24px rgba(62,172,255,.08);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
    .le-sfv--elevation .le-sfv-head{width:auto;margin:0 0 14px}
    .le-sfv--elevation .le-sfv-body{display:block;width:auto;max-width:none;margin:0}
    .le-sfv--elevation .le-sfv-status{margin:0 0 10px;padding:0;border:0;border-radius:0;background:transparent}
    .le-sfv--elevation .le-sfv-attribution{margin:10px 0 0}
    .le-sfv--weather .le-sfv-panel{background:radial-gradient(ellipse at 50% 0%,rgba(33,126,178,.30),transparent 52%),linear-gradient(180deg,rgba(4,24,40,.94),rgba(3,11,22,.88) 60%,rgba(2,7,15,.96))}
    .le-sfv--clouds .le-sfv-panel{background:radial-gradient(ellipse at 50% 0%,rgba(81,157,203,.27),transparent 52%),linear-gradient(180deg,rgba(6,25,43,.94),rgba(4,12,24,.87) 58%,rgba(2,7,16,.96))}
    .le-sfv--traffic .le-sfv-panel{background:radial-gradient(ellipse at 50% 0%,rgba(33,153,126,.24),transparent 52%),linear-gradient(180deg,rgba(4,27,29,.95),rgba(3,14,20,.89) 60%,rgba(2,7,14,.97))}
    .le-sfv--earthquakes .le-sfv-panel{background:radial-gradient(ellipse at 50% 0%,rgba(191,80,48,.25),transparent 52%),linear-gradient(180deg,rgba(35,16,20,.95),rgba(18,10,17,.89) 60%,rgba(5,7,14,.97))}
    .le-sfv--weather .le-sfv-card,.le-sfv--clouds .le-sfv-card,.le-sfv--traffic .le-sfv-card{grid-column:1/-1}
    .le-sfv--weather .le-sfv-metric-grid{grid-template-columns:repeat(auto-fit,minmax(125px,1fr))}
    .le-sfv-head{display:flex;gap:13px;align-items:center;width:min(100%,980px);margin:0 auto 17px}
    .le-sfv-symbol{flex:0 0 auto;display:grid;place-items:center;width:50px;aspect-ratio:1;border:1px solid rgba(215,243,255,.4);border-radius:50%;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.25),rgba(77,139,185,.10) 50%,rgba(0,5,13,.84));box-shadow:inset 1px 1px 4px #fff3,inset -3px -4px 7px #0009,0 0 18px rgba(100,200,255,.14);font-size:27px}
    .le-sfv-title{margin:0;font-size:clamp(23px,6vw,34px);font-weight:780;letter-spacing:-.02em;line-height:1.08}
    .le-sfv-subtitle{margin:6px 0 0;color:#a9c4d9;font-size:11px;line-height:1.5;letter-spacing:.035em}
    .le-sfv-pill{display:flex;align-items:center;gap:7px;width:fit-content;max-width:min(100%,980px);margin:0 auto 17px;padding:7px 11px;border:1px solid rgba(125,204,241,.22);border-radius:999px;background:rgba(83,164,205,.09);color:#cfeeff;font-size:9px;font-weight:750;letter-spacing:.10em;text-transform:uppercase}
    .le-sfv-dot{width:6px;height:6px;flex:0 0 auto;border-radius:50%;background:#7ee4bd;box-shadow:0 0 8px #7ee4bd80}
    .le-sfv-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:12px;width:min(100%,980px);margin:0 auto}
    .le-sfv-card{min-width:0;margin:0;padding:clamp(13px,2.6vw,19px);border:1px solid rgba(153,201,234,.15);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025));box-shadow:inset 1px 1px 1px rgba(255,255,255,.055),0 10px 28px rgba(0,0,0,.12)}
    .le-sfv-card h2,.le-sfv-card h3{margin:0 0 9px;color:#edf8ff;font-size:13px;font-weight:750;letter-spacing:.035em}
    .le-sfv-copy{margin:0;color:#b6cbdc;font-size:11px;line-height:1.6}
    .le-sfv-status{grid-column:1/-1;margin:0;padding:11px 13px;border:1px solid rgba(153,201,234,.13);border-radius:13px;background:rgba(0,8,17,.35);color:#91b7ce;font-size:10px;line-height:1.55}
    .le-sfv-status[data-state="error"]{color:#ffb8bd;border-color:rgba(255,130,140,.24)}
    .le-sfv-status[data-state="success"]{color:#9ce8c8;border-color:rgba(126,228,189,.24)}
    .le-sfv-controls{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}
    .le-sfv-button{appearance:none;min-height:40px;padding:10px 15px;border:1px solid rgba(140,211,246,.28);border-radius:999px;background:linear-gradient(135deg,rgba(57,156,206,.23),rgba(255,255,255,.04));color:#eff9ff;font:700 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.045em;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .le-sfv-button:active{transform:scale(.98)}
    .le-sfv-button:focus-visible,.le-sfv-input:focus-visible{outline:2px solid #8de1ff;outline-offset:3px}
    .le-sfv-button[disabled]{opacity:.45}
    .le-sfv-range{width:100%;accent-color:#75dcff;min-height:30px}
    .le-sfv-range-label{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#b9d0e1;font-size:10px}
    .le-sfv-metric-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .le-sfv-metric{min-width:0;padding:12px;border-radius:14px;background:rgba(4,13,23,.48);border:1px solid rgba(153,201,234,.12)}
    .le-sfv-metric-label{display:block;color:#92aec4;font-size:9px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
    .le-sfv-metric-value{display:block;color:#f0f9ff;font-size:clamp(18px,4.8vw,26px);font-weight:720;line-height:1.15;overflow-wrap:anywhere}
    .le-sfv-metric-unit{color:#a9c5d7;font-size:10px;font-weight:500}
    .le-sfv-list{display:grid;gap:8px;margin-top:9px}
    .le-sfv-event{display:flex;align-items:flex-start;gap:10px;padding:11px;border:1px solid rgba(153,201,234,.12);border-radius:13px;background:rgba(1,8,17,.30);color:inherit;text-decoration:none}
    .le-sfv-mag{flex:0 0 auto;min-width:44px;padding:8px 5px;border-radius:9px;text-align:center;background:rgba(255,120,65,.12);border:1px solid rgba(255,153,98,.25);color:#ffd0b8;font-weight:800;font-size:11px}
    .le-sfv-event-text{min-width:0;flex:1}
    .le-sfv-event-place{display:block;color:#eef7ff;font-size:11px;line-height:1.4;font-weight:650}
    .le-sfv-event-meta{display:block;margin-top:4px;color:#8eabc0;font-size:9px;line-height:1.45}
    .le-sfv-input-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .le-sfv-input-wrap{display:grid;gap:5px;color:#a9c4d8;font-size:9px;letter-spacing:.04em}
    .le-sfv-input{width:100%;min-width:0;min-height:40px;border:1px solid rgba(153,201,234,.20);border-radius:10px;padding:8px 10px;background:rgba(0,8,17,.56);color:#f0f9ff;font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .le-sfv-attribution{grid-column:1/-1;margin:1px 0 0;color:#7997ad;font-size:9px;line-height:1.5}
    .le-sfv-attribution a{color:#98dfff;text-decoration:underline;text-underline-offset:2px}
    @media(max-width:560px){.le-sfv-body{grid-template-columns:minmax(0,1fr)}.le-sfv-card{grid-column:1/-1}.le-sfv-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(orientation:landscape) and (max-height:520px){.le-sfv-panel{padding-top:calc(env(safe-area-inset-top) + 54px);padding-bottom:calc(env(safe-area-inset-bottom) + 96px)}.le-sfv-head{margin-bottom:10px}.le-sfv-symbol{width:42px}.le-sfv-title{font-size:22px}.le-sfv-card{padding:11px}}
    @media(prefers-reduced-motion:reduce){.le-sfv *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `;
  document.head.appendChild(style);

  let currentFeature = null;
  let currentRoot = null;
  let currentCleanup = null;
  const stage = () => document.getElementById('le-feature-stage');
  const stageCard = () => stage()?.querySelector('.le-feature-stage-card');
  const globe = () => window.LiveEarthPrimeScene || null;

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
    if (EXCLUSIVE_WORLD_VIEWS.has(id)) {
      document.body.classList.add('le-exclusive-world-open');
    }
    const cardNode = stageCard();
    if (cardNode) cardNode.hidden = true;
    host.classList.add('le-sfv-open');
    const meta = VIEW_META[id] || { title: id, symbol: '✦', description: 'Live Earth feature view.' };
    const root = el('div', `le-sfv le-sfv--${id}`);
    root.dataset.feature = id;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', `${meta.title} view`);
    // Atmosphere is intentionally a globe-first instrument. Do not create the
    // generic feature intro (title, description, symbol or FEATURE VIEW pill)
    // for this view. Other feature views retain the shared intro unchanged.
    if (id === 'atmosphere') {
      root.innerHTML = `<div class="le-sfv-panel"><div class="le-sfv-body"></div></div>`;
    } else {
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
    }
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
    // The flag is runtime-owned so it is cleared for every close/switch path,
    // even when a controller's own cleanup encounters an error.
    document.body.classList.remove('le-exclusive-world-open');
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


  const registered = new Set();
  const featureActivators = new Map();
  const externalModules = [
    { id: 'clouds', path: './Clouds/clouds-view.js', connected: true },
    { id: 'elevation', path: './Elevation/elevation-view.js', connected: true },
    { id: 'weather', path: './Weather/weather-view.js', connected: true },
    { id: 'earthquakes', path: './Earthquakes/earthquakes-view.js', connected: true },
    { id: 'traffic', path: './Traffic/traffic-view.js', connected: false },
    { id: 'atmosphere', path: './Atmosphere/atmosphere-view-controller.js', connected: false },
    { id: 'atmospheric-composition', path: './Atmospheric-Composition/atmospheric-composition-view-controller.js', connected: false },
    { id: 'oceans', path: './Oceans/oceans-view-controller.js', connected: false },
    { id: 'land', path: './Land/land-view-controller.js', connected: false },
    { id: 'water-ice', path: './Water-Ice/water-ice-view-controller.js', connected: false },
    { id: 'earth-activity', path: './Earth-Activity/earth-activity-view-controller.js', connected: false },
    { id: 'energy-humanity', path: './Energy-Humanity/energy-humanity-view-controller.js', connected: false },
    { id: 'editorial-engine', path: './Editorial-Engine/engine-feature-views.js', connected: true }
  ];
  const externalModulesById = new Map(externalModules.map(item => [item.id, item]));
  const moduleStates = new Map(externalModules.map(item => [item.id, { status: 'idle', promise: null, activationToken: 0 }]));

  function runFeatureActivation(id) {
    if (!api.isActive(id)) return;
    const activate = featureActivators.get(id);
    if (typeof activate !== 'function') {
      showFeatureLoadStatus(id, 'This feature controller has not registered its view yet. Close and reopen the feature to retry.', 'error');
      return;
    }
    // Remove the temporary loading surface before the feature creates its own view.
    cleanupCurrent();
    try {
      const cleanup = activate();
      currentCleanup = typeof cleanup === 'function' ? cleanup : () => {};
    } catch (error) {
      console.error(`[LIVE // EARTH] ${id} view failed to open.`, error);
      showFeatureLoadStatus(id, `This view could not initialize. Prime Earth and the Global Orb dock remain intact. ${error?.message || ''}`, 'error');
    }
  }

  function showFeatureLoadStatus(id, message, state = '') {
    if (!api.isActive(id)) return;
    let body = null;
    if (currentFeature === id && currentRoot?.isConnected) {
      body = currentRoot.querySelector('.le-sfv-body');
    } else {
      const view = mount(id);
      body = view?.body || null;
    }
    if (!body) return;
    const status = el('p', 'le-sfv-status', message);
    if (state) status.dataset.state = state;
    body.replaceChildren(status);
    currentCleanup = () => {};
  }

  const FEATURE_MODULE_LOAD_TIMEOUT_MS = 25000;

  function ensureFeatureModule(id) {
    const item = externalModulesById.get(id);
    const state = moduleStates.get(id);
    if (!item || !state) return Promise.reject(new Error(`Unknown optional feature module: ${id}`));
    if (featureActivators.has(id)) {
      state.status = 'loaded';
      return Promise.resolve(true);
    }
    if (state.promise) return state.promise;

    state.status = 'loading';
    const request = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      let timeoutId = null;
      const settle = (callback, value) => {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) clearTimeout(timeoutId);
        script.onload = null;
        script.onerror = null;
        callback(value);
      };

      script.src = new URL(item.path, document.baseURI).href;
      script.async = true;
      script.dataset.liveEarthOptionalFeature = id;
      script.onload = () => {
        if (settled) return;
        if (typeof featureActivators.get(id) === 'function') {
          state.status = 'loaded';
          settle(resolve, true);
        } else {
          script.remove();
          settle(reject, new Error(`${VIEW_META[id].title} loaded but did not register its Stacks view.`));
        }
      };
      script.onerror = () => {
        script.remove();
        settle(reject, new Error('This feature could not be downloaded. Check your connection and try again.'));
      };
      timeoutId = setTimeout(() => {
        // A script may have registered just before its load event was delayed.
        if (typeof featureActivators.get(id) === 'function') {
          state.status = 'loaded';
          settle(resolve, true);
          return;
        }
        script.remove();
        settle(reject, new Error('This feature is taking longer than expected to load. Check your connection and try again.'));
      }, FEATURE_MODULE_LOAD_TIMEOUT_MS);
      (document.head || document.documentElement).appendChild(script);
    });

    // Keep a single shared in-flight request. Any failure, including timeout,
    // returns the module to idle so a later Orb selection can retry it.
    state.promise = request.catch(error => {
      state.status = 'idle';
      state.promise = null;
      throw error;
    });
    return state.promise;
  }

  function activateRegisteredFeature(id) {
    if (!externalModulesById.has(id) || featureActivators.has(id)) {
      runFeatureActivation(id);
      return;
    }
    const state = moduleStates.get(id);
    if (!state) return;
    const activationToken = ++state.activationToken;
    showFeatureLoadStatus(id, `Loading ${VIEW_META[id].title}…`);
    ensureFeatureModule(id).then(() => {
      // A user may switch away and back while one script request is in flight.
      // Only the newest selection token may activate when that shared request resolves.
      if (state.activationToken === activationToken && api.isActive(id)) runFeatureActivation(id);
    }).catch(error => {
      if (state.activationToken === activationToken && api.isActive(id)) {
        showFeatureLoadStatus(id, error?.message || 'This feature is unavailable right now.', 'error');
      }
      console.warn(`[LIVE // EARTH] ${id} feature module is unavailable.`, error);
    });
  }

  function registerCatalogEntry(id, connected) {
    const meta = VIEW_META[id];
    if (!meta) return false;
    api.register(id, {
      title: meta.title,
      shortLabel: id === 'earthquakes' ? 'Quakes' : meta.title,
      symbol: meta.symbol,
      description: meta.description,
      connected: typeof connected === 'boolean' ? connected : id !== 'traffic',
      activate: () => activateRegisteredFeature(id),
      deactivate: () => cleanupCurrent()
    });
    registered.add(id);
    return true;
  }

  function registerFeature(id, activate, connectedOverride = null) {
    const meta = VIEW_META[id];
    if (!meta || typeof activate !== 'function') return false;
    // External controllers register here after their script is fetched. Updating the
    // activation map is intentional: the catalogue placeholder already exists.
    featureActivators.set(id, activate);
    if (!registered.has(id)) registerCatalogEntry(id, connectedOverride);
    else if (typeof connectedOverride === 'boolean') api.register(id, { connected: connectedOverride });
    const state = moduleStates.get(id);
    if (state) state.status = 'loaded';
    return true;
  }

  window.LiveEarthStacksFeatureRuntime = Object.freeze({
    registerFeature,
    mount, el, setStatus, button, card, attribution,
    attachLayer, isActive, globe,
    fetchImageBlob, textureFromBlob, getEarthRaster, timeLabel
  });

  // Register lightweight catalogue metadata immediately, in its original order.
  // All feature-view implementations, including Elevation, load only on Orb selection.
  const catalogueOrder = [
    'clouds', 'weather', 'elevation', 'earthquakes', 'traffic',
    'atmosphere', 'atmospheric-composition', 'oceans', 'land', 'water-ice',
    'earth-activity', 'energy-humanity', 'editorial-engine'
  ];
  for (const id of catalogueOrder) {
    const item = externalModulesById.get(id);
    registerCatalogEntry(id, item?.connected);
  }

  // Stacks readiness now means the shared runtime and complete Orb catalogue are ready;
  // optional feature controllers are deliberately fetched only after their Orb is selected.
  window.__liveEarthStacksFeatureViewsInstalled = true;
  window.__liveEarthStacksFeatureViewsLoading = false;
  window.dispatchEvent(new Event('live-earth-stacks-feature-views-ready'));
})();
