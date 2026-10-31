/* ALIEN WORLD VIEW-SPECIFIC PUBLISHER CLIENT.
   This browser-side client reads only completed Publisher outputs. It never
   collects news, opens the source database, or builds a magazine.

   It also exposes the shared PDF Viewer's already-saved Alien World issues and
   clears visible live stories immediately when the device goes offline.
*/
(() => {
  'use strict';
  if (window.__liveEarthAlienWorldPublisherClientInstalled) return;

  const VIEW_ID = 'alien-world';
  const ROOT = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/published/alien-world/';
  const noStore = { method: 'GET', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' };
  const engineReady = () => Boolean(window.LiveEarthUniversalEditorialEngine && window.LiveEarthUniversalPDFViewer);

  function fetchJson(path) {
    const url = new URL(path, document.baseURI);
    url.searchParams.set('_', String(Date.now()));
    return fetch(url.href, noStore).then(response => {
      if (!response.ok) throw new Error(`Publisher output unavailable (${response.status}).`);
      return response.json();
    });
  }

  async function loadLiveFeed() {
    if (!engineReady()) throw new Error('The global editorial services are still loading.');
    if (navigator.onLine === false) throw new Error('The live space-news feed requires an internet connection.');
    const raw = await fetchJson(ROOT + 'live-feed.json');
    return window.LiveEarthUniversalEditorialEngine.validateFeed(raw, VIEW_ID);
  }

  async function loadCatalog() {
    if (!engineReady()) throw new Error('The global editorial services are still loading.');
    if (navigator.onLine === false) throw new Error('The online magazine catalogue requires an internet connection.');
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

  function create(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function formatSavedDate(value) {
    const date = new Date(Number(value) || 0);
    if (!Number.isFinite(date.getTime()) || !Number(value)) return 'Saved on this device';
    return `Saved ${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)}`;
  }

  function ensureLocalLibraryStyle() {
    if (document.getElementById('le-aw-local-library-style')) return;
    const style = create('style');
    style.id = 'le-aw-local-library-style';
    style.textContent = `
      #le-alien-world-view .le-aw-local-library{margin:18px 0 0;padding:14px;border:1px solid #526d8566;border-radius:14px;background:linear-gradient(145deg,#122133e8,#07111cde);}
      #le-alien-world-view .le-aw-local-library h3{margin:0 0 5px;color:#e6eef5;font-size:14px;}
      #le-alien-world-view .le-aw-local-library p{margin:0 0 11px;color:#a9bdcb;font-size:10px;line-height:1.5;}
      #le-alien-world-view .le-aw-local-saved-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #8fa4b220;}
      #le-alien-world-view .le-aw-local-saved-copy{min-width:0;display:flex;flex-direction:column;gap:4px;}
      #le-alien-world-view .le-aw-local-saved-title{color:#f0e7d7;font-size:11px;font-weight:700;line-height:1.35;}
      #le-alien-world-view .le-aw-local-saved-meta{color:#8ea3b4;font-size:9px;}
      #le-alien-world-view .le-aw-local-saved-open{flex:0 0 auto;min-height:36px;padding:8px 11px;border:1px solid #c39a6688;border-radius:9px;background:#9e78432e;color:#f0d5ad;font-size:9px;font-weight:750;}
      #le-alien-world-view .le-aw-local-library[hidden]{display:none!important;}
    `;
    document.head.appendChild(style);
  }

  function ensureLocalLibraryPanel() {
    const root = document.getElementById('le-alien-world-view');
    if (!root) return null;
    const weekly = root.querySelector('.le-aw-weekly');
    if (!weekly) return null;
    let panel = weekly.querySelector('.le-aw-local-library');
    if (panel) return panel;
    const publisherPanel = weekly.querySelector('.le-aw-publisher-panel');
    if (!publisherPanel) return null;
    ensureLocalLibraryStyle();
    panel = create('section', 'le-aw-local-library');
    panel.setAttribute('aria-label', 'Magazines saved on this device');
    panel.append(
      create('h3', '', 'Saved on this device'),
      create('p', '', 'Your saved magazines stay available here without storing live news or article feeds offline.'),
    );
    const list = create('div', 'le-aw-local-saved-list');
    list.dataset.savedList = 'alien-world';
    panel.appendChild(list);
    publisherPanel.insertAdjacentElement('afterend', panel);
    return panel;
  }

  async function refreshSavedLibrary() {
    const panel = ensureLocalLibraryPanel();
    if (!panel || !window.LiveEarthUniversalPDFViewer?.listSaved) return;
    const list = panel.querySelector('[data-saved-list="alien-world"]');
    if (!list) return;
    list.replaceChildren();
    try {
      const records = await window.LiveEarthUniversalPDFViewer.listSaved();
      const saved = records.filter(item => item.viewId === VIEW_ID).sort((a, b) => Number(b.savedAt) - Number(a.savedAt));
      if (!saved.length) {
        list.appendChild(create('p', '', 'No saved Space Journal yet. Open a magazine once while online and it will be kept here for offline reading.'));
        return;
      }
      for (const item of saved) {
        const row = create('div', 'le-aw-local-saved-item');
        const copy = create('div', 'le-aw-local-saved-copy');
        const title = create('strong', 'le-aw-local-saved-title', item.title || 'The Space Journal');
        const meta = create('span', 'le-aw-local-saved-meta', `${formatSavedDate(item.savedAt)} · ${item.pages || 'PDF'} pages · ${Math.max(1, Math.round((Number(item.bytes) || 0) / 1024))} KB`);
        copy.append(title, meta);
        const button = create('button', 'le-aw-local-saved-open', 'Open');
        button.type = 'button';
        button.addEventListener('click', async () => {
          try {
            const prefix = `${VIEW_ID}:`;
            const savedId = String(item.id || '');
            const issueId = savedId.startsWith(prefix) ? savedId.slice(prefix.length) : savedId;
            await window.LiveEarthUniversalPDFViewer.open({
              id: issueId,
              viewId: VIEW_ID,
              title: item.title || 'The Space Journal',
              fileName: `${issueId}.pdf`,
              pages: item.pages,
              allowSavedFallback: true,
              returnTo: 'weekly-publish'
            });
          } catch (error) {
            const status = document.querySelector('#le-alien-world-view .le-aw-weekly .le-aw-status');
            if (status) {
              status.textContent = error?.message || 'Could not open the saved magazine.';
              status.dataset.state = 'warning';
              status.hidden = false;
            }
          }
        });
        row.append(copy, button);
        list.appendChild(row);
      }
    } catch (_) {
      list.appendChild(create('p', '', 'The local PDF library is not available in this browser session. Your existing app data has not been changed.'));
    }
  }

  function clearOnlineStories() {
    const root = document.getElementById('le-alien-world-view');
    if (!root || root.hidden) return;
    const live = root.querySelector('.le-aw-live-list');
    if (live) {
      live.querySelectorAll('.le-aw-story').forEach(card => card.remove());
      const status = live.querySelector('.le-aw-status');
      if (status) {
        status.textContent = 'You are offline. Live news has been cleared; reconnect to load the latest reports.';
        status.dataset.state = 'warning';
        status.hidden = false;
      }
      const count = live.querySelector('.le-aw-count');
      if (count) count.textContent = 'LIVE FEEDS';
    }
    refreshSavedLibrary();
  }

  function refreshVisibleTab() {
    const root = document.getElementById('le-alien-world-view');
    if (!root || root.hidden) return;
    const liveTab = root.querySelector('[data-tab="live"]');
    const weeklyTab = root.querySelector('[data-tab="weekly"]');
    if (liveTab?.getAttribute('aria-pressed') === 'true') liveTab.click();
    else if (weeklyTab?.getAttribute('aria-pressed') === 'true') weeklyTab.click();
    refreshSavedLibrary();
  }

  window.LiveEarthAlienWorldPublisher = Object.freeze({
    viewId: VIEW_ID,
    publisherId: 'alien-world-publisher',
    loadLiveFeed,
    loadCatalog,
    openMagazine,
    listSavedMagazines: refreshSavedLibrary,
    actionsUrl: 'https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/workflows/alien-world-publisher.yml'
  });

  window.addEventListener('offline', clearOnlineStories);
  window.addEventListener('online', refreshVisibleTab);
  window.addEventListener('live-earth-alien-world-view-change', event => {
    if (event?.detail?.active) refreshSavedLibrary();
  });
  window.addEventListener('live-earth-pdf-viewer-close', refreshSavedLibrary);
  window.__liveEarthAlienWorldPublisherClientInstalled = true;
  window.dispatchEvent(new Event('live-earth-alien-world-publisher-client-ready'));
  refreshSavedLibrary();
})();
