/* Nature browser client — Live Feed only. Read-only; no collection or persistence. */
(() => {
  'use strict';
  if (window.__liveEarthNaturePublisherClientInstalled) return;
  const VIEW_ID = 'nature';
  const ROOT = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published/';
  const NO_STORE = { method:'GET',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer' };
  async function loadFeed() {
    if (navigator.onLine === false) throw new Error('Nature Live Feeds need an internet connection.');
    if (!window.LiveEarthUniversalEditorialEngine?.validateFeed) throw new Error('The shared Editorial Engine validator is not ready.');
    const url = new URL('live-feed.json',ROOT);
    url.searchParams.set('_',String(Date.now()));
    const response = await fetch(url.href,NO_STORE);
    if (!response.ok) throw new Error(`Nature Live Feed unavailable (${response.status}).`);
    return window.LiveEarthUniversalEditorialEngine.validateFeed(await response.json(),VIEW_ID);
  }
  window.LiveEarthNaturePublisher = Object.freeze({
    viewId:VIEW_ID,publisherId:'nature-publisher',loadFeed
  });
  window.__liveEarthNaturePublisherClientInstalled = true;
  window.dispatchEvent(new Event('live-earth-nature-publisher-client-ready'));
})();
