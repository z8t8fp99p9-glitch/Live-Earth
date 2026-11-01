/* Nature's browser-side publication reader. No collection, database or persistence. */
(() => {
  'use strict';
  if (window.__liveEarthNaturePublisherClientInstalled) return;
  const VIEW_ID = 'nature';
  const ROOT = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/nature/published/';
  const NO_STORE = { method: 'GET', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' };
  const ready = () => Boolean(window.LiveEarthUniversalEditorialEngine && window.LiveEarthUniversalPDFViewer);

  async function fetchJson(name) {
    if (navigator.onLine === false) throw new Error('Live Nature publications require an internet connection.');
    const url = new URL(name, ROOT);
    url.searchParams.set('_', String(Date.now()));
    const response = await fetch(url.href, NO_STORE);
    if (!response.ok) throw new Error(`Nature publication unavailable (${response.status}).`);
    return response.json();
  }
  async function loadFeed() {
    if (!ready()) throw new Error('Shared editorial services are not ready.');
    return window.LiveEarthUniversalEditorialEngine.validateFeed(await fetchJson('live-feed.json'), VIEW_ID);
  }
  async function loadCatalog() {
    if (!ready()) throw new Error('Shared editorial services are not ready.');
    return window.LiveEarthUniversalEditorialEngine.validateCatalog(await fetchJson('catalog.json'), VIEW_ID);
  }
  function safeIssueUrl(issue) {
    try {
      const url = new URL(issue.pdfUrl, document.baseURI);
      return url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com' &&
        url.pathname.startsWith('/z8t8fp99p9-glitch/Live-Earth/main/nature/published/') ? url.href : '';
    } catch (_) { return ''; }
  }
  async function openMagazine(issue) {
    const url = issue && safeIssueUrl(issue);
    if (!url || !ready()) throw new Error('This Nature issue is not ready to open.');
    return window.LiveEarthUniversalPDFViewer.open({
      id: issue.issueId, issueId: issue.issueId, title: issue.title || 'The Living World',
      url, fileName: `${issue.issueId}.pdf`, pages: issue.pages, sha256: issue.sha256,
      viewId: VIEW_ID, returnTo: 'monthly-journal', allowSavedFallback: true
    });
  }
  async function listSavedMagazines() {
    if (!window.LiveEarthUniversalPDFViewer?.listSaved) return [];
    const records = await window.LiveEarthUniversalPDFViewer.listSaved();
    return records.filter(item => item.viewId === VIEW_ID).sort((a,b) => Number(b.savedAt)-Number(a.savedAt));
  }
  async function openSaved(item) {
    if (!item || !ready()) throw new Error('The saved Nature issue is not available.');
    const id = String(item.id || '');
    const issueId = id.startsWith('nature:') ? id.slice(7) : id;
    return window.LiveEarthUniversalPDFViewer.open({
      id: issueId, viewId: VIEW_ID, title: item.title || 'The Living World',
      fileName: `${issueId}.pdf`, pages: item.pages, returnTo: 'monthly-journal',
      allowSavedFallback: true
    });
  }
  window.LiveEarthNaturePublisher = Object.freeze({
    viewId: VIEW_ID, publisherId: 'nature-publisher',
    loadFeed, loadCatalog, openMagazine, listSavedMagazines, openSaved
  });
  window.__liveEarthNaturePublisherClientInstalled = true;
  window.dispatchEvent(new Event('live-earth-nature-publisher-client-ready'));
})();
