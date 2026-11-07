/* LIVE // EARTH — Feed Collector discovery workspace adapter.
   Registers only the existing Feed Collector feature identity. It does not add
   an Orb, alter global Orb behaviour, or fork any shared collection engine. */
(() => {
  'use strict';
  if (window.__liveEarthFeedCollectorViewInstalled) return;

  const api = window.LiveEarthFeatureViews;
  if (!api || typeof api.register !== 'function') {
    console.warn('[LIVE // EARTH] Feed Collector workspace is waiting for the existing Feature Orb registry.');
    return;
  }

  let root = null;
  let frame = null;

  function ensureWorkspace() {
    if (root?.isConnected && frame?.isConnected) return;
    root = document.getElementById('le-feed-collector-view');
    if (!root) {
      root = document.createElement('section');
      root.id = 'le-feed-collector-view';
      root.dataset.feature = 'feed-collector';
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', 'Feed Collector website discovery and inspection workspace');
      root.style.cssText = 'position:fixed;inset:0;z-index:6;display:none;overflow:hidden;background:#020811;pointer-events:auto;';
      document.body.appendChild(root);
    }
    root.replaceChildren();
    frame = document.createElement('iframe');
    frame.id = 'le-feed-collector-frame';
    frame.title = 'Feed Collector website and feed inspection';
    frame.setAttribute('aria-label', 'Discover website feeds and inspect their entries and source information');
    frame.setAttribute('allow', 'clipboard-write');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.style.cssText = 'position:absolute;inset:0;z-index:1;width:100%;height:100%;border:0;background:#061321;';
    frame.src = new URL('./feed-collector/discovery.html', document.baseURI).href;
    root.appendChild(frame);
  }

  function openWorkspace() {
    ensureWorkspace();
    root.style.display = 'block';
    root.setAttribute('aria-hidden', 'false');
  }

  function closeWorkspace() {
    if (!root) return;
    root.style.display = 'none';
    root.setAttribute('aria-hidden', 'true');
  }

  api.register('feed-collector', {
    title: 'Feed Collector',
    shortLabel: 'Collector',
    symbol: '📡',
    description: 'Discover RSS, Atom and supported JSON feeds from a website, filter entries by date, and inspect original source material using the shared Global Collector retrieval and parsing code.',
    connected: true,
    activate: openWorkspace,
    deactivate: closeWorkspace
  });

  window.__liveEarthFeedCollectorViewInstalled = true;
  window.dispatchEvent(new Event('live-earth-feed-collector-view-ready'));
})();
