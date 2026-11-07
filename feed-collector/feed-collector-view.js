/* LIVE // EARTH — Feed Collector article-inspection workspace.
   Reuses the existing Feed Collector Feature Orb registration. Does not connect
   to or invoke Global Collector, Global Checker, Scout, Manager or Publisher. */
(() => {
  'use strict';
  if (window.__liveEarthFeedCollectorViewInstalled) return;
  const api = window.LiveEarthFeatureViews;
  if (!api || typeof api.register !== 'function') return;

  function openWorkspace() {
    const host = document.getElementById('le-feed-collector-view');
    if (!host) return;
    let frame = document.getElementById('le-feed-collector-frame');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'le-feed-collector-frame';
      frame.title = 'Feed Collector article and source inspection';
      frame.setAttribute('aria-label', 'Feed Collector article and source inspection workspace');
      frame.setAttribute('allow', 'clipboard-write; web-share');
      frame.style.cssText = 'position:absolute;inset:0;z-index:3;width:100%;height:100%;border:0;background:#061321;';
      frame.src = new URL('./feed-collector/feed-collector.html', document.baseURI).href;
    }
    if (frame.parentElement !== host) host.appendChild(frame);
    frame.hidden = false;
    frame.setAttribute('aria-hidden', 'false');
  }

  function closeWorkspace() {
    const frame = document.getElementById('le-feed-collector-frame');
    if (!frame) return;
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
  }

  api.register('feed-collector', {
    title: 'Feed Collector', shortLabel: 'Collector', symbol: '📡',
    description: 'Inspect complete public articles, original images and all available source information. Share or export the inspection.',
    connected: false,
    activate: openWorkspace,
    deactivate: closeWorkspace
  });

  window.__liveEarthFeedCollectorViewInstalled = true;
  window.dispatchEvent(new Event('live-earth-feed-collector-view-ready'));
})();
