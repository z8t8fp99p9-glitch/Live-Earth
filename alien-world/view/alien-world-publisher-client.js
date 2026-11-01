/* Alien World browser publication client.
   Reads validated JSON output and opens PDFs through the shared Global PDF Reader.
   It does not collect sources, access SQLite, compose PDFs or save files by itself. */
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
  const servicesReady = () => Boolean(
    window.LiveEarthUniversalEditorialEngine && window.LiveEarthUniversalPDFViewer
  );

  async function fetchJson(fileName) {
    if (navigator.onLine === false) throw new Error('Alien World public publications need an internet connection.');
    const url = new URL(fileName, OUTPUT_ROOT);
    url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url.href, REQUEST_OPTIONS);
    if (!response.ok) throw new Error(`Alien World publication unavailable (${response.status}).`);
    return response.json();
  }

  async function loadLiveFeed() {
    if (!servicesReady()) throw new Error('The shared Editorial Engine is not ready.');
    const feed = await fetchJson('live-feed.json');
    return window.LiveEarthUniversalEditorialEngine.validateFeed(feed, VIEW_ID);
  }

  async function loadCatalog() {
    if (!servicesReady()) throw new Error('The shared Editorial Engine is not ready.');
    const catalog = await fetchJson('catalog.json');
    return window.LiveEarthUniversalEditorialEngine.validateCatalog(catalog, VIEW_ID);
  }

  function safeIssueUrl(issue) {
    try {
      const url = new URL(issue?.pdfUrl || '', document.baseURI);
      return url.protocol === 'https:' &&
        url.hostname === 'raw.githubusercontent.com' &&
        url.pathname.startsWith('/z8t8fp99p9-glitch/Live-Earth/main/alien-world/published/')
        ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  async function openMagazine(issue) {
    if (!servicesReady()) throw new Error('The Global PDF Reader is not ready.');
    const url = safeIssueUrl(issue);
    if (!url) throw new Error('This Space Journal does not have a valid published PDF URL.');
    return window.LiveEarthUniversalPDFViewer.open({
      id: issue.issueId,
      issueId: issue.issueId,
      viewId: VIEW_ID,
      title: issue.title || 'The Space Journal',
      url,
      fileName: `${issue.issueId}.pdf`,
      pages: issue.pages,
      sha256: issue.sha256,
      returnTo: 'alien-world-journal',
      allowSavedFallback: true
    });
  }

  async function listSavedMagazines() {
    if (!window.LiveEarthUniversalPDFViewer?.listSaved) return [];
    const items = await window.LiveEarthUniversalPDFViewer.listSaved();
    return items
      .filter(item => item.viewId === VIEW_ID)
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
  }

  async function openSaved(item) {
    if (!servicesReady() || !item) throw new Error('The saved Space Journal is unavailable.');
    const prefix = `${VIEW_ID}:`;
    const rawId = String(item.id || item.issueId || '');
    const issueId = rawId.startsWith(prefix) ? rawId.slice(prefix.length) : rawId;
    if (!issueId) throw new Error('The saved issue has no valid identifier.');
    return window.LiveEarthUniversalPDFViewer.open({
      id: issueId,
      issueId,
      viewId: VIEW_ID,
      title: item.title || 'The Space Journal',
      fileName: `${issueId}.pdf`,
      pages: item.pages,
      returnTo: 'alien-world-journal',
      allowSavedFallback: true
    });
  }

  window.LiveEarthAlienWorldPublisher = Object.freeze({
    viewId: VIEW_ID,
    publisherId: 'alien-world-publisher',
    loadLiveFeed,
    loadCatalog,
    openMagazine,
    listSavedMagazines,
    openSaved,
    actionsUrl: 'https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/workflows/alien-world-publisher.yml'
  });
  window.__liveEarthAlienWorldPublisherClientInstalled = true;
  window.dispatchEvent(new Event('live-earth-alien-world-publisher-client-ready'));
})();
