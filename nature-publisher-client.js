/* NATURE VIEW-SPECIFIC PUBLISHER CLIENT.
   Reads only completed Nature outputs. It never collects sources, opens a database,
   or generates magazines. All Nature publications use the shared PDF Reader. */
(() => {
  'use strict';
  if (window.__liveEarthNaturePublisherClientInstalled) return;

  const VIEW_ID = 'nature';
  const ROOT = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/published/nature/';
  const noStore = { method: 'GET', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' };
  const servicesReady = () => Boolean(window.LiveEarthUniversalEditorialEngine && window.LiveEarthUniversalPDFViewer);

  async function fetchJson(path) {
    const url = new URL(path, ROOT);
    url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url.href, noStore);
    if (!response.ok) throw new Error(`Nature publication unavailable (${response.status}).`);
    return response.json();
  }

  async function loadFeed() {
    if (!servicesReady()) throw new Error('The shared editorial services are still loading.');
    if (navigator.onLine === false) throw new Error('The live Nature feed requires an internet connection.');
    const payload = await fetchJson('live-feed.json');
    return window.LiveEarthUniversalEditorialEngine.validateFeed(payload, VIEW_ID);
  }

  async function loadCatalog() {
    if (!servicesReady()) throw new Error('The shared editorial services are still loading.');
    if (navigator.onLine === false) throw new Error('The online Nature catalogue requires an internet connection.');
    const payload = await fetchJson('catalog.json');
    return window.LiveEarthUniversalEditorialEngine.validateCatalog(payload, VIEW_ID);
  }

  function safeIssueUrl(issue) {
    try {
      const url = new URL(issue.pdfUrl, document.baseURI);
      const allowed = url.protocol === 'https:' &&
        url.hostname === 'raw.githubusercontent.com' &&
        url.pathname.startsWith('/z8t8fp99p9-glitch/Live-Earth/main/published/nature/');
      return allowed ? url.href : '';
    } catch (_) { return ''; }
  }

  async function openMagazine(issue) {
    const url = issue && safeIssueUrl(issue);
    if (!url || !servicesReady()) throw new Error('This Nature issue is not ready to open.');
    return window.LiveEarthUniversalPDFViewer.open({
      id: issue.issueId,
      issueId: issue.issueId,
      title: issue.title || 'The Living World',
      url,
      fileName: `${issue.issueId}.pdf`,
      pages: issue.pages,
      sha256: issue.sha256,
      viewId: VIEW_ID,
      returnTo: 'monthly-journal',
      allowSavedFallback: true
    });
  }

  async function listSavedMagazines() {
    if (!window.LiveEarthUniversalPDFViewer?.listSaved) return [];
    const records = await window.LiveEarthUniversalPDFViewer.listSaved();
    return records.filter(item => item.viewId === VIEW_ID).sort((a, b) => Number(b.savedAt) - Number(a.savedAt));
  }

  async function openSaved(item) {
    if (!item || !servicesReady()) throw new Error('The saved Nature issue is not available in this session.');
    const id = String(item.id || '');
    const prefix = `${VIEW_ID}:`;
    const issueId = id.startsWith(prefix) ? id.slice(prefix.length) : id;
    return window.LiveEarthUniversalPDFViewer.open({
      id: issueId,
      viewId: VIEW_ID,
      title: item.title || 'The Living World',
      fileName: `${issueId}.pdf`,
      pages: item.pages,
      returnTo: 'monthly-journal',
      allowSavedFallback: true
    });
  }

  window.LiveEarthNaturePublisher = Object.freeze({
    viewId: VIEW_ID,
    publisherId: 'nature-publisher',
    loadFeed,
    loadCatalog,
    openMagazine,
    listSavedMagazines,
    openSaved
  });
  window.__liveEarthNaturePublisherClientInstalled = true;
  window.dispatchEvent(new Event('live-earth-nature-publisher-client-ready'));
})();
