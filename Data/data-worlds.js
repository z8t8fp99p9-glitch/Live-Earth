/* LIVE // EARTH — six numerical-world Orb placeholders.
   Preserve the six Stacks Orbs while the central database is prepared.
   No collectors, API calls, local storage or sample measurements are used. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.warn('[LIVE // EARTH] Numerical-world Orbs are waiting for the shared Stacks runtime.');
    return;
  }
  if (window.__liveEarthDataWorldsRegistered) return;
  window.__liveEarthDataWorldsRegistered = true;

  const WORLDS = [
    { id: 'atmosphere', title: 'Atmosphere', symbol: '◉' },
    { id: 'oceans', title: 'Oceans', symbol: '≈' },
    { id: 'land', title: 'Land', symbol: '⌁' },
    { id: 'water-ice', title: 'Water & Ice', symbol: '❄' },
    { id: 'earth-activity', title: 'Earth Activity', symbol: '✧' },
    { id: 'energy-humanity', title: 'Energy & Humanity', symbol: '✺' }
  ];

  function openPlaceholder(world) {
    const view = runtime.mount(world.id);
    if (!view) return () => {};
    const heading = runtime.el('h2', '', world.title);
    const status = runtime.el(
      'p',
      'le-sfv-status',
      'Database foundation is being prepared. No source data has been connected or imported yet.'
    );
    status.dataset.state = 'success';
    view.body.append(heading, status);
    return () => {};
  }

  WORLDS.forEach(world => {
    runtime.registerFeature(world.id, () => openPlaceholder(world), false);
  });

  window.dispatchEvent(new CustomEvent('live-earth-data-worlds-ready', {
    detail: { count: WORLDS.length, state: 'database-preparation' }
  }));
})();
