/* LIVE // EARTH — numerical-world controller loader.
   Each numerical Orb owns its folder and dedicated View Controller.
   This file only loads those controllers in the established Stacks order. */
(() => {
  'use strict';
  if (window.__liveEarthNumericalWorldControllersLoading) return;
  window.__liveEarthNumericalWorldControllersLoading = true;

  const controllers = [
    './Atmosphere/atmosphere-view-controller.js',
    './Oceans/oceans-view-controller.js',
    './Land/land-view-controller.js',
    './Water-Ice/water-ice-view-controller.js',
    './Earth-Activity/earth-activity-view-controller.js',
    './Energy-Humanity/energy-humanity-view-controller.js'
  ];

  const load = path => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(path, document.baseURI).href;
    script.async = false;
    script.onload = () => resolve(path);
    script.onerror = () => reject(new Error(`Numerical-world controller failed to load: ${path}`));
    (document.head || document.documentElement).appendChild(script);
  });

  (async () => {
    for (const path of controllers) {
      try {
        await load(path);
      } catch (error) {
        console.error('[LIVE // EARTH] Numerical-world controller unavailable.', error);
      }
    }
    window.__liveEarthNumericalWorldControllersLoading = false;
    window.__liveEarthNumericalWorldControllersReady = true;
    window.dispatchEvent(new CustomEvent('live-earth-data-worlds-ready', {
      detail: { count: controllers.length, state: 'database-preparation' }
    }));
  })();
})();
