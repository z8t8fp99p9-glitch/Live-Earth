/* LIVE // EARTH — Independent Traffic feature.
   This module owns only the Traffic Orb. It does not load or register Live Cams.
   No live traffic provider is connected in this build; never present sample data as live. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Stacks runtime is unavailable; Traffic was not registered.');
    return;
  }

  function activateTraffic() {
    const view = runtime.mount('traffic');
    if (!view?.root || !view?.body) return () => {};

    const { body } = view;
    body.replaceChildren();

    const intro = runtime.card(
      'Traffic intelligence',
      'A dedicated space for road conditions, congestion and transport movement across the globe.'
    );
    const status = runtime.el(
      'p',
      'le-sfv-status',
      'LIVE TRAFFIC DATA IS NOT CONNECTED'
    );
    status.dataset.state = 'error';
    intro.appendChild(status);
    body.appendChild(intro);

    const coverage = runtime.card(
      'Live coverage',
      'This view is ready for a verified traffic provider. Until a source is connected and its coverage is confirmed, no congestion colours, incidents, speeds or road closures are shown.'
    );
    const coverageNote = runtime.el(
      'p',
      'le-sfv-copy',
      'Provider integration, attribution, update time and regional coverage will be displayed here when available.'
    );
    coverage.appendChild(coverageNote);
    body.appendChild(coverage);

    const mapCard = runtime.card(
      'Traffic layer',
      'The Traffic Orb remains independent from Live Cams. Its future map layer will use the shared Earth view rather than creating another globe.'
    );
    const mapStatus = runtime.el(
      'p',
      'le-sfv-status',
      'WAITING FOR A VERIFIED TRAFFIC SOURCE'
    );
    mapStatus.dataset.state = 'error';
    mapCard.appendChild(mapStatus);
    body.appendChild(mapCard);

    return () => {
      // The shared Stacks runtime owns root removal and stage restoration.
    };
  }

  runtime.registerFeature('traffic', activateTraffic, false);
})();
