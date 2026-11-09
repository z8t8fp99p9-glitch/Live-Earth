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

  const STYLE_TEXT = `
    .le-weather-resident-overlay .le-residents-3d-canvas{display:block;width:100%;height:100%;outline:0;touch-action:none;pointer-events:none}
    .le-weather-resident-overlay .le-residents-fallback{display:block;width:100%;height:100%;overflow:visible}
    .le-residents-fallback .le-resident-fallback-person{transform-box:fill-box;transform-origin:50% 100%;animation:le-resident-fallback-idle 3.8s ease-in-out infinite}
    .le-residents-fallback .le-resident-fallback-person:nth-child(2){animation-delay:-1.2s}.le-residents-fallback .le-resident-fallback-person:nth-child(3){animation-delay:-2.1s}
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

  function showFallback(host, state) {
    if (!state.mounted) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderMarkup();
    host.replaceChildren(wrapper.firstElementChild);
    host.dataset.renderMode = '2d-fallback';
    host.dataset.residents3dError = 'true';
  }

  function mount(host) {
    if (!host || typeof host.replaceChildren !== 'function') return false;
    unmount(host);
    installStyles();
    const canvas = document.createElement('canvas');
    canvas.className = 'le-residents-3d-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Three animated 3D LIVE Earth neighbours');
    host.replaceChildren(canvas);

    const state = { mounted: true, engine: null, activity: { mode: 'calm', gustLevel: 'normal' } };
    mountedHosts.set(host, state);
    host.dataset.residentsVersion = VERSION;
    host.dataset.activity = 'calm';
    host.dataset.gust = 'normal';
    host.dataset.renderMode = '3d-loading';

    loadEngine().then(module => {
      if (!state.mounted || mountedHosts.get(host) !== state) return;
      const engineRoster = ROSTER.map(person => ({ ...person, id: person.kind }));
      state.engine = module.createResidents3D(canvas, engineRoster, state.activity);
      state.engine.setActivity(state.activity);
      host.dataset.renderMode = '3d';
      delete host.dataset.residents3dError;
    }).catch(error => {
      if (!state.mounted || mountedHosts.get(host) !== state) return;
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
