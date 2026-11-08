/* LIVE // EARTH V118 — Traffic full-screen feature view.
   Uses the shared Stacks feature runtime and existing Home Earth layer contract.
   The Global three-Orb dock and its lifecycle remain owned by the Global registry. */
(() => {
  'use strict';
  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] traffic feature runtime is unavailable.');
    return;
  }
  const { mount, el, setStatus, button, card, attribution, isActive, globe } = runtime;

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
    return () => {};
  }



  runtime.registerFeature('traffic', activateTraffic);
})();
