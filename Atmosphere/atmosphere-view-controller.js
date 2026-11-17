/* LIVE // EARTH — Atmosphere View Controller.
   Independent Stacks feature controller for the Atmosphere Orb.
   Database-preparation phase only: no fabricated values, API calls or local storage. */
(() => {
  'use strict';
  const flag = '__liveEarthAtmosphereViewControllerInstalled';
  if (window[flag]) return;

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Atmosphere controller is waiting for the Stacks feature runtime.');
    return;
  }

  const WORLD = {
    id: 'atmosphere',
    title: 'Atmosphere',
    symbol: '◉',
    message: 'Atmospheric numerical observations will appear here after the database and approved data sources are connected.'
  };

  function activateView() {
    const view = runtime.mount(WORLD.id);
    if (!view) return () => {};

    const status = runtime.el('p', 'le-sfv-status', WORLD.message);
    status.dataset.state = 'neutral';
    view.body.appendChild(status);

    return () => {
      // The shared Stacks runtime owns the view shell and removes it on close.
      // This controller has no timers, requests, layers or persistent state.
    };
  }

  if (runtime.registerFeature(WORLD.id, activateView, false)) {
    window[flag] = true;
    window.dispatchEvent(new CustomEvent('live-earth-world-controller-ready', {
      detail: { id: WORLD.id }
    }));
  }
})();
