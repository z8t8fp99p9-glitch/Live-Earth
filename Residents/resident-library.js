/* LIVE // EARTH — Shared Residents Library (3D renderer)
   The library owns the three permanent identities and activity contract.
   The host view owns context and timing; the 3D engine owns geometry and animation. */
(() => {
  'use strict';

  const VERSION = '1.3.0'; // Keep the public Weather loader contract stable.
  const STYLE_ID = 'le-world-residents-3d-style';
  const ROSTER = Object.freeze([
    Object.freeze({ id: 'one', kind: 'red', displayName: 'Red Hoodie Boy', asset: 'resident-red-hoodie-boy.webp', x: 92, y: 116, shirt: '#b84238', signature: 'tousled curls and red hoodie' }),
    Object.freeze({ id: 'two', kind: 'lady', displayName: 'Little Lady', asset: 'resident-little-lady.webp', x: 210, y: 122, shirt: '#537ca7', signature: 'chestnut bob, denim pinafore and satchel' }),
    Object.freeze({ id: 'three', kind: 'blue', displayName: 'Blue Jacket Boy', asset: 'resident-blue-jacket-boy.webp', x: 328, y: 116, shirt: '#536e9a', signature: 'soft curls and blue jacket' })
  ]);
  const ACTIVITY_CATALOG = Object.freeze({
    calm: Object.freeze({ label: 'A quiet little moment', stage: 'weather-ready' }),
    morning: Object.freeze({ label: 'Morning park exercise and a butterfly chase', stage: 'weather-ready' }),
    play: Object.freeze({ label: 'Playing together', stage: 'weather-ready' }),
    rain: Object.freeze({ label: 'Two umbrellas and one rain dancer', stage: 'weather-ready' }),
    snow: Object.freeze({ label: 'Bundled up and shivering', stage: 'weather-ready' }),
    heat: Object.freeze({ label: 'Fanning themselves in the heat', stage: 'weather-ready' }),
    wind: Object.freeze({ label: 'Bracing against the gusts', stage: 'weather-ready' }),
    stargaze: Object.freeze({ label: 'Watching the stars', stage: 'weather-ready' }),
    walk: Object.freeze({ label: 'A little neighbourhood walk', stage: 'shared-library' }),
    picnic: Object.freeze({ label: 'A tiny picnic by the river', stage: 'shared-library' }),
    kite: Object.freeze({ label: 'Flying a kite together', stage: 'shared-library' }),
    garden: Object.freeze({ label: 'Looking after the garden', stage: 'shared-library' }),
    festival: Object.freeze({ label: 'A local celebration', stage: 'shared-library' }),
    camping: Object.freeze({ label: 'A night under the stars', stage: 'shared-library' })
  });

  const mountedHosts = new WeakMap();
  let enginePromise = null;
  let ladyPrototypePromise = null;

  const STYLE_TEXT = `
    .le-weather-resident-overlay .le-residents-3d-canvas{display:block;width:100%;height:100%;outline:0;touch-action:none;pointer-events:none}
    .le-weather-resident-overlay .le-residents-fallback{display:block;width:100%;height:100%;overflow:visible}
    .le-residents-fallback .le-resident-fallback-person{transform-box:fill-box;transform-origin:50% 100%;animation:le-resident-fallback-idle 3.8s ease-in-out infinite}
    .le-residents-fallback .le-resident-fallback-person:nth-child(2){animation-delay:-1.2s}.le-residents-fallback .le-resident-fallback-person:nth-child(3){animation-delay:-2.1s}
    .le-weather-resident-overlay[data-resident-prototype="little-lady"]::after{content:"LITTLE LADY · GLB PROTOTYPE";position:absolute;left:10px;bottom:10px;z-index:2;padding:4px 8px;border:1px solid #e6f5ff66;border-radius:999px;background:#102b4077;color:#f3f9ff;font:650 8px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;pointer-events:none;text-shadow:0 1px 5px #0008}
    @keyframes le-resident-fallback-idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
    @media(prefers-reduced-motion:reduce){.le-residents-fallback .le-resident-fallback-person{animation:none}}
  `;

  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  }

  // Fallback is only used if WebGL/Three.js is unavailable. The normal path is the 3D renderer.
  function renderMarkup() {
    return `<svg class="le-residents-fallback" viewBox="0 0 420 250" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Three little LIVE Earth neighbours">
      ${ROSTER.map(person => `<g class="le-resident-fallback-person"><image href="./Residents/assets/${person.asset}" x="${person.x - 46}" y="${person.y - 16}" width="92" height="128" preserveAspectRatio="xMidYMax meet"/></g>`).join('')}
    </svg>`;
  }

  function loadEngine() {
    if (!enginePromise) {
      if (typeof document === 'undefined') return Promise.reject(new Error('Residents 3D needs a document context.'));
      const url = new URL('./Residents/resident-3d-engine.mjs', document.baseURI).href;
      enginePromise = import(url).catch(error => {
        enginePromise = null;
        throw error;
      });
    }
    return enginePromise;
  }

  async function prepareLittleLadyPrototypeModule() {
    const url = new URL('./Residents/resident-lady-gltf-preview.mjs', document.baseURI).href;
    const sourceCacheName = 'live-earth-resident-prototype-v1';
    const sourceCacheKey = new URL('./Residents/.prototype-cache/resident-lady-gltf-preview-v149.mjs', document.baseURI).href;
    let sourceResponse = null;
    let sourceCache = null;
    let sourceKey = null;
    if ('caches' in window) {
      try {
        sourceCache = await caches.open(sourceCacheName);
        sourceKey = new Request(sourceCacheKey);
        sourceResponse = await sourceCache.match(sourceKey);
      } catch (cacheError) {
        console.warn('[LIVE // EARTH] Prototype module cache is unavailable; trying the online module.', cacheError?.message || cacheError);
      }
    }
    if (!sourceResponse) {
      sourceResponse = await fetch(url, { cache: 'no-store' });
      if (!sourceResponse.ok || sourceResponse.type === 'opaque') {
        throw new Error(`Little Lady preview module returned HTTP ${sourceResponse.status}`);
      }
      if (sourceCache && sourceKey) {
        try { await sourceCache.put(sourceKey, sourceResponse.clone()); }
        catch (cacheError) {
          console.warn('[LIVE // EARTH] Could not persist the preview module source; current online preview can continue.', cacheError?.message || cacheError);
        }
      }
    }
    const source = await sourceResponse.text();
    if (source.length < 5000) throw new Error('Little Lady preview module is empty or truncated.');
    const threeUrl = new URL('./vendor/three.module.js', document.baseURI).href;
    const threeImport = /from\s+['"]\.\.\/vendor\/three\.module\.js['"]/;
    if (!threeImport.test(source)) throw new Error('Little Lady preview module import layout changed; refusing an unverified module.');
    const rewritten = source.replace(threeImport, `from '${threeUrl}'`);
    const moduleBlobUrl = URL.createObjectURL(new Blob([rewritten], { type: 'text/javascript' }));
    try {
      const module = await import(moduleBlobUrl);
      if (typeof module.createLittleLadyPrototype !== 'function') throw new Error('Little Lady preview module export is missing.');
      return module;
    } finally {
      URL.revokeObjectURL(moduleBlobUrl);
    }
  }


  function loadLittleLadyPrototype() {
    if (!ladyPrototypePromise) {
      if (typeof document === 'undefined') return Promise.reject(new Error('Little Lady prototype needs a document context.'));
      ladyPrototypePromise = prepareLittleLadyPrototypeModule().catch(error => {
        ladyPrototypePromise = null;
        throw error;
      });
    }
    return ladyPrototypePromise;
  }

  function prototypeRequested() {
    try {
      return new URLSearchParams(window.location.search).get('residentPrototype') === 'little-lady';
    } catch (_) {
      return false;
    }
  }

  function showFallback(host, state) {
    if (!state.mounted) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderMarkup();
    host.replaceChildren(wrapper.firstElementChild);
    host.dataset.renderMode = '2d-fallback';
    host.dataset.residents3dError = 'true';
    delete host.dataset.residentPrototype;
  }

  function mount(host) {
    if (!host || typeof host.replaceChildren !== 'function') return false;
    unmount(host);
    installStyles();
    const useLittleLadyPrototype = prototypeRequested();
    const canvas = document.createElement('canvas');
    canvas.className = 'le-residents-3d-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', useLittleLadyPrototype ? 'Little Lady rigged GLB 3D prototype' : 'Three animated 3D LIVE Earth neighbours');
    host.replaceChildren(canvas);

    const state = { mounted: true, engine: null, prototype: useLittleLadyPrototype, activity: { mode: 'calm', gustLevel: 'normal' } };
    mountedHosts.set(host, state);
    host.dataset.residentsVersion = VERSION;
    host.dataset.activity = 'calm';
    host.dataset.gust = 'normal';
    host.dataset.renderMode = useLittleLadyPrototype ? '3d-prototype-loading' : '3d-loading';
    if (useLittleLadyPrototype) host.dataset.residentPrototype = 'little-lady';

    const load = useLittleLadyPrototype ? loadLittleLadyPrototype() : loadEngine();
    load.then(module => {
      if (!state.mounted || mountedHosts.get(host) !== state) return null;
      if (useLittleLadyPrototype) {
        state.engine = module.createLittleLadyPrototype(canvas, state.activity);
        return state.engine.ready;
      }
      const engineRoster = ROSTER.map(person => ({ ...person, id: person.kind }));
      state.engine = module.createResidents3D(canvas, engineRoster, state.activity);
      state.engine.setActivity(state.activity);
      return Promise.resolve();
    }).then(() => {
      if (!state.mounted || mountedHosts.get(host) !== state) return;
      host.dataset.renderMode = useLittleLadyPrototype ? '3d-prototype' : '3d';
      delete host.dataset.residents3dError;
      state.engine?.setActivity(state.activity);
    }).catch(error => {
      if (!state.mounted || mountedHosts.get(host) !== state) return;
      if (useLittleLadyPrototype) {
        console.warn('[LIVE // EARTH] Little Lady GLB prototype could not load; restoring the original three-Resident renderer.', error?.message || error);
        // A failed prototype may already own a renderer and animation loop. Dispose
        // it before reusing the canvas for the protected three-Resident fallback.
        state.engine?.dispose();
        state.engine = null;
        delete host.dataset.residentPrototype;
        host.dataset.residentPrototypeError = 'true';
        // A prototype renderer may have explicitly lost its WebGL context during
        // cleanup. Give the protected renderer a fresh canvas rather than asking
        // the browser to recreate a context on the old, lost canvas.
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.className = 'le-residents-3d-canvas';
        fallbackCanvas.setAttribute('role', 'img');
        fallbackCanvas.setAttribute('aria-label', 'Three animated 3D LIVE Earth neighbours');
        host.replaceChildren(fallbackCanvas);
        loadEngine().then(module => {
          if (!state.mounted || mountedHosts.get(host) !== state) return;
          const engineRoster = ROSTER.map(person => ({ ...person, id: person.kind }));
          state.engine = module.createResidents3D(fallbackCanvas, engineRoster, state.activity);
          state.engine.setActivity(state.activity);
          host.dataset.renderMode = '3d-prototype-fallback';
        }).catch(fallbackError => {
          console.warn('[LIVE // EARTH] Standard Residents renderer also failed.', fallbackError?.message || fallbackError);
          showFallback(host, state);
        });
        return;
      }
      console.warn('[LIVE // EARTH] Residents 3D renderer unavailable; using the lightweight artwork fallback.', error?.message || error);
      showFallback(host, state);
    });
    return true;
  }

  function setActivity(host, state = {}) {
    if (!host) return false;
    const requested = String(state.mode || 'calm');
    const weather = String(state.weather || 'clear');
    const weatherAllowsMorning = !['rain', 'storm', 'snow', 'fog', 'hot'].includes(weather);
    const morning = requested === 'calm' && state.phase === 'dawn' && weatherAllowsMorning;
    const activity = morning ? 'morning' : requested;
    const mode = Object.prototype.hasOwnProperty.call(ACTIVITY_CATALOG, activity) ? activity : 'calm';
    const nextState = { ...state, mode, gustLevel: state.gustLevel === 'strong' ? 'strong' : 'normal' };
    host.dataset.activity = mode;
    host.dataset.gust = nextState.gustLevel;
    const mounted = mountedHosts.get(host);
    if (mounted) {
      mounted.activity = nextState;
      mounted.engine?.setActivity(nextState);
    }
    return true;
  }

  function getStatus(host) {
    return host?.dataset?.renderMode || 'unmounted';
  }

  function unmount(host) {
    if (!host) return;
    const mounted = mountedHosts.get(host);
    if (mounted) {
      mounted.mounted = false;
      mounted.engine?.dispose();
      mountedHosts.delete(host);
    }
    host.replaceChildren?.();
    delete host.dataset.residentsVersion;
    delete host.dataset.activity;
    delete host.dataset.gust;
    delete host.dataset.renderMode;
    delete host.dataset.residents3dError;
    delete host.dataset.residentPrototype;
    delete host.dataset.residentPrototypeError;
  }

  const api = Object.freeze({
    version: VERSION,
    renderer: 'threejs-procedural-3d',
    getRoster: () => ROSTER,
    getActivityCatalog: () => ACTIVITY_CATALOG,
    renderMarkup,
    mount,
    setActivity,
    getStatus,
    unmount
  });

  if (!window.LiveEarthResidentLibrary || window.LiveEarthResidentLibrary.version !== VERSION || window.LiveEarthResidentLibrary.renderer !== api.renderer) {
    window.LiveEarthResidentLibrary = api;
  }
})();
