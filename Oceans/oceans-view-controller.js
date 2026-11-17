/* LIVE // EARTH — Oceans View Controller.
   Owns the numerical grid-rendering skin only while this world view is open.
   No fabricated values, data requests or persistent state are created here. */
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

  function loadGridSkin() {
    if (window.LiveEarthGridRenderingSkin?.create) return Promise.resolve(window.LiveEarthGridRenderingSkin);
    if (window.__liveEarthGridSkinLoadPromise) return window.__liveEarthGridSkinLoadPromise;

    window.__liveEarthGridSkinLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./EarthEngine/Graphics/earth-grid-rendering-skin.js', document.baseURI).href;
      script.async = true;
      script.onload = () => {
        const skin = window.LiveEarthGridRenderingSkin;
        if (skin && typeof skin.create === 'function') resolve(skin);
        else reject(new Error('The grid-rendering skin loaded without its public API.'));
      };
      script.onerror = () => reject(new Error('The shared grid-rendering skin could not be loaded.'));
      (document.head || document.documentElement).appendChild(script);
    }).catch(error => {
      window.__liveEarthGridSkinLoadPromise = null;
      throw error;
    });

    return window.__liveEarthGridSkinLoadPromise;
  }

  function activateView() {
    const view = runtime.mount(WORLD.id);
    if (!view) return () => {};

    const status = runtime.el('p', 'le-sfv-status', 'Preparing the shared globe-rendering skin…');
    status.dataset.state = 'neutral';
    view.body.appendChild(status);

    let closed = false;
    let layerDispose = null;
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
    };

    (async () => {
      try {
        await loadGridSkin();
        if (closed || !runtime.isActive(WORLD.id)) return;

        const globe = runtime.globe();
        if (!globe || typeof globe.getTHREE !== 'function' ||
            typeof globe.registerLayer !== 'function') {
          throw new Error('The existing shared Earth layer interface is unavailable.');
        }

        layerDispose = runtime.attachLayer(WORLD.id, ({ THREE, earth }) => {
          if (!THREE?.Group || !earth?.add) {
            throw new Error('The shared Earth layer did not provide its Three.js globe surface.');
          }
          gridRoot = new THREE.Group();
          gridRoot.name = `liveEarth-${WORLD.id}-numerical-grid-layer`;
          earth.add(gridRoot);

          // A verified dataset adapter will create the mesh with:
          // LiveEarthGridRenderingSkin.create({ THREE, definition, values, ... })
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
          throw new Error('The numerical grid layer could not attach to the existing Earth.');
        }

        view.root.dataset.gridRenderingSkin = 'ready';
        runtime.setStatus(status,
          'Globe rendering skin ready · waiting for verified numerical grid data. No sample or placeholder measurements are displayed.',
          'success');
        globe.requestRender?.();
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
