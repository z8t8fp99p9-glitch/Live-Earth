/* ALIEN WORLD VIEW-SPECIFIC PUBLISHER CLIENT.
   It only reads completed Publisher outputs. Source collection and database writes
   stay in publishers/alien-world/publisher.py. */
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldPublisherClientInstalled) return;
  const VIEW_ID = 'alien-world';
  const ROOT = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/published/alien-world/';
  const noStore = { method: 'GET', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' };
  const engineReady = () => window.LiveEarthUniversalEditorialEngine && window.LiveEarthUniversalPDFViewer;

  async function fetchJson(path) {
    const url = new URL(path, document.baseURI);
    url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url.href, noStore);
    if (!response.ok) throw new Error(`Publisher output unavailable (${response.status}).`);
    return response.json();
  }
  async function loadLiveFeed() {
    if (!engineReady()) throw new Error('The global editorial services are still loading.');
    const raw = await fetchJson(ROOT + 'live-feed.json');
    return window.LiveEarthUniversalEditorialEngine.validateFeed(raw, VIEW_ID);
  }
  async function loadCatalog() {
    if (!engineReady()) throw new Error('The global editorial services are still loading.');
    const raw = await fetchJson(ROOT + 'catalog.json');
    return window.LiveEarthUniversalEditorialEngine.validateCatalog(raw, VIEW_ID);
  }
  async function openMagazine(issue) {
    if (!issue || !issue.pdfUrl || !engineReady()) throw new Error('This issue is not ready to open.');
    return window.LiveEarthUniversalPDFViewer.open({
      id: issue.issueId,
      issueId: issue.issueId,
      title: issue.title || 'The Space Journal',
      url: issue.pdfUrl,
      fileName: `${issue.issueId}.pdf`,
      pages: issue.pages,
      sha256: issue.sha256,
      viewId: VIEW_ID,
      returnTo: 'weekly-publish',
      allowSavedFallback: true
    });
  }
  window.LiveEarthAlienWorldPublisher = Object.freeze({
    viewId: VIEW_ID,
    publisherId: 'alien-world-publisher',
    loadLiveFeed,
    loadCatalog,
    openMagazine,
    actionsUrl: 'https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/workflows/alien-world-publisher.yml'
  });
  window.__liveEarthAlienWorldPublisherClientInstalled = true;
  window.dispatchEvent(new Event('live-earth-alien-world-publisher-client-ready'));
})();
