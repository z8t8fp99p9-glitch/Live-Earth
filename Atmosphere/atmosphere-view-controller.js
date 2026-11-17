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
  const WORLD = { id: 'atmosphere', title: 'Atmosphere', symbol: '◉' };
  const MANIFEST_URL = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/atmosphere/manifest.json';
  const DATASET_ID = 'ATMOSPHERE_01';
  const SCRIPT_PATHS = [
    './EarthEngine/Graphics/universal-grid-system.js',
    './EarthEngine/Graphics/earth-grid-gpu-skin.js'
  ];

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
  function activateView() {
    const view = runtime.mount(WORLD.id);
    if (!view) return () => {};
    const status = runtime.el('p', 'le-sfv-status', 'Connecting to the verified NOAA atmospheric snapshot…');
    status.dataset.state = 'neutral';
    view.body.appendChild(status);
    const details = runtime.card('NOAA · Global air temperature', 'Near-surface air temperature from the GFS 0.25° analysis grid. This is a model analysis field, not a network of direct thermometer readings.');
    const metric = runtime.el('div', 'le-sfv-metric-grid');
    const makeMetric = (label, value, unit = '') => {
      const item = runtime.el('div', 'le-sfv-metric');
      item.appendChild(runtime.el('span', 'le-sfv-metric-label', label));
      const v = runtime.el('strong', 'le-sfv-metric-value', value);
      if (unit) v.appendChild(runtime.el('span', 'le-sfv-metric-unit', ` ${unit}`));
      item.appendChild(v); metric.appendChild(item);
    };
    details.appendChild(metric);
    view.body.appendChild(details);
    const source = runtime.el('p', 'le-sfv-attribution', 'Source: NOAA NCEP Global Forecast System · GFS 0.25° analysis · verified snapshot metadata');
    view.body.appendChild(source);

    let closed = false;
    let layerDispose = null;
    let gridHandle = null;
    let abortController = new AbortController();
    let gridRoot = null;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      abortController.abort();
      try { gridHandle?.dispose?.(); } catch (_) {}
      gridHandle = null;
      try { layerDispose?.(); } catch (error) { console.warn('[LIVE // EARTH] Atmosphere layer cleanup failed.', error); }
      layerDispose = null;
      try { gridRoot?.removeFromParent?.(); } catch (_) {}
      gridRoot = null;
    };

    (async () => {
      try {
        await loadSharedGridTools();
        if (closed || !runtime.isActive(WORLD.id)) return;
        const grid = await window.LiveEarthUniversalGridSystem.loadSnapshot({
          manifestUrl: MANIFEST_URL, datasetId: DATASET_ID, signal: abortController.signal
        });
        if (closed || !runtime.isActive(WORLD.id)) return;
        if (grid.definition.width !== 1440 || grid.definition.height !== 721 || grid.units !== 'degree_Celsius') {
          throw new Error('The NOAA grid dimensions or units differ from the approved dataset contract.');
        }
        makeMetric('Grid resolution', '0.25°', 'global');
        makeMetric('Valid cells', grid.validCount.toLocaleString(), 'of ' + (grid.definition.width * grid.definition.height).toLocaleString());
        makeMetric('Observed / valid time', formatTime(grid.observedAt));
        makeMetric('Snapshot published', formatTime(grid.retrievedAt));
        makeMetric('Verified range', `${grid.min.toFixed(1)} to ${grid.max.toFixed(1)}`, '°C');
        const globe = runtime.globe();
        if (!globe || typeof globe.getTHREE !== 'function' || typeof globe.registerLayer !== 'function') {
          throw new Error('The existing shared Earth layer interface is unavailable.');
        }
        layerDispose = runtime.attachLayer(WORLD.id, ({ THREE, earth }) => {
          if (!THREE || !earth?.add) throw new Error('The shared Earth layer did not provide its Three.js surface.');
          gridRoot = new THREE.Group();
          gridRoot.name = 'liveEarth-atmosphere-universal-grid-layer';
          gridHandle = window.LiveEarthGpuGridSkin.create({
            THREE, grid, radius: 1.009, opacity: 0.86,
            min: -80, max: 45, name: 'NOAA-GFS-2m-air-temperature'
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
        if (closed) { layerDispose?.(); layerDispose = null; return; }
        if (typeof layerDispose !== 'function') throw new Error('The verified NOAA grid could not attach to the existing Earth.');
        view.root.dataset.gridRenderingSkin = 'gpu-ready';
        view.root.dataset.gridData = 'verified-noaa-gfs';
        runtime.setStatus(status, 'NOAA grid verified · GPU texture attached to the shared Earth. Tap the layer controls to explore more atmospheric signals as they become available.', 'success');
        globe.requestRender?.();
      } catch (error) {
        if (!closed && runtime.isActive(WORLD.id)) {
          runtime.setStatus(status, `Atmosphere data could not be displayed. No placeholder values were used. ${error?.message || ''}`, 'error');
        }
      }
    })();
    return cleanup;
  }
  if (runtime.registerFeature(WORLD.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-world-controller-ready', { detail: { id: WORLD.id } }));
  }
})();
