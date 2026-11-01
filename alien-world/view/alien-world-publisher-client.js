/* Alien World browser client — Live Feed only.
   Reads and validates the completed public feed. It never collects sources,
   opens a database, creates PDFs, or stores an Alien World publication archive. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldPublisherClientInstalled) return;

  const VIEW_ID = 'alien-world';
  const OUTPUT_ROOT = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/alien-world/published/';
  const REQUEST_OPTIONS = {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer'
  };

  async function fetchLiveFeed() {
    if (navigator.onLine === false) {
      throw new Error('Alien World Live Feeds need an internet connection.');
    }
    if (!window.LiveEarthUniversalEditorialEngine?.validateFeed) {
      throw new Error('The shared Editorial Engine validator is not ready.');
    }
    const url = new URL('live-feed.json', OUTPUT_ROOT);
    url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url.href, REQUEST_OPTIONS);
    if (!response.ok) throw new Error(`Alien World Live Feed unavailable (${response.status}).`);
    const payload = await response.json();
    return window.LiveEarthUniversalEditorialEngine.validateFeed(payload, VIEW_ID);
  }

  window.LiveEarthAlienWorldPublisher = Object.freeze({
    viewId: VIEW_ID,
    publisherId: 'alien-world-publisher',
    loadLiveFeed: fetchLiveFeed,
    actionsUrl: 'https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/workflows/alien-world-publisher.yml'
  });
  window.__liveEarthAlienWorldPublisherClientInstalled = true;
  window.dispatchEvent(new Event('live-earth-alien-world-publisher-client-ready'));
})();
