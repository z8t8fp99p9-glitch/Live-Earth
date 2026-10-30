/* LIVE // EARTH — GLOBAL Universal PDF Viewer.
   Stores only explicitly opened PDF files for offline reading. It does not store
   separate page images or any view's article/feed database. */
(() => {
  'use strict';
  if (window.__liveEarthUniversalPDFViewerInstalled) return;

  const DB_NAME = 'live-earth-pdf-library';
  const DB_VERSION = 1;
  const STORE = 'issues';
  const MAX_FILES = 3;
  const MAX_TOTAL_BYTES = 70 * 1024 * 1024;
  let dbPromise = null;
  let active = null;
  let opening = false;
  let openGeneration = 0;
  let root = null;
  let lastFocus = null;

  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Local PDF storage is unavailable.'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; reject(req.error || new Error('Could not open the PDF library.')); };
      req.onblocked = () => reject(new Error('Close another LIVE // EARTH tab to finish preparing the PDF library.'));
    });
    return dbPromise;
  }
  function requestResult(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('PDF library request failed.'));
    });
  }
  async function getSaved(id) {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    return requestResult(tx.objectStore(STORE).get(id));
  }
  async function listSaved() {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readonly');
    return requestResult(tx.objectStore(STORE).getAll());
  }
  async function putSaved(record) {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const completed = new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Could not save the PDF.'));
    });
    const req = tx.objectStore(STORE).put(record);
    await requestResult(req);
    await completed;
    await pruneSaved();
  }
  async function pruneSaved() {
    const records = (await listSaved()).sort((a, b) => Number(b.savedAt) - Number(a.savedAt));
    let total = 0;
    const keep = new Set();
    for (const record of records) {
      const size = Number(record.bytes) || 0;
      if (keep.size < MAX_FILES && total + size <= MAX_TOTAL_BYTES) {
        keep.add(record.id); total += size;
      }
    }
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const record of records) if (!keep.has(record.id)) store.delete(record.id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Could not trim the local PDF library.'));
    });
  }

  function make(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function setChromeHidden(hidden) {
    const selectors = ['#navButtons', '#le-feature-dock', '.le-feature-dock'];
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) continue;
      if (hidden) {
        node.dataset.lePdfWasHidden = node.hidden ? '1' : '0';
        node.hidden = true;
      } else if (node.dataset.lePdfWasHidden !== undefined) {
        node.hidden = node.dataset.lePdfWasHidden === '1';
        delete node.dataset.lePdfWasHidden;
      }
    }
  }
  function buildUi() {
    if (root) return;
    const style = make('style');
    style.id = 'le-universal-pdf-viewer-style';
    style.textContent = `
      #le-universal-pdf-viewer{position:fixed;inset:0;z-index:2147482000;background:#030811;color:#edf5ff;display:flex;flex-direction:column;padding:env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
      #le-universal-pdf-viewer[hidden]{display:none!important}
      #le-universal-pdf-viewer .le-pdf-toolbar{height:54px;min-height:54px;display:grid;grid-template-columns:1fr minmax(0,2fr) 1fr;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid #304152;background:#071321;}
      #le-universal-pdf-viewer button{appearance:none;border:1px solid #536477;border-radius:9px;background:#142537;color:#edf5ff;padding:9px 12px;font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
      #le-universal-pdf-viewer .le-pdf-download{justify-self:start;border-color:#9c825f;color:#f1d6ad;}
      #le-universal-pdf-viewer .le-pdf-close{justify-self:end;}
      #le-universal-pdf-viewer .le-pdf-title{min-width:0;text-align:center;font-size:11px;font-weight:650;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      #le-universal-pdf-viewer .le-pdf-viewport{position:relative;flex:1;min-height:0;background:#202933;}
      #le-universal-pdf-viewer iframe{display:block;width:100%;height:100%;border:0;background:#202933;}
      #le-universal-pdf-viewer .le-pdf-swipe-edge{position:absolute;top:0;bottom:0;z-index:2;width:34px;background:transparent;touch-action:pan-y;-webkit-tap-highlight-color:transparent;}
      #le-universal-pdf-viewer .le-pdf-swipe-left{left:0;}
      #le-universal-pdf-viewer .le-pdf-swipe-right{right:0;}
      #le-universal-pdf-viewer .le-pdf-nav{height:58px;min-height:58px;display:flex;justify-content:center;align-items:center;gap:18px;padding-bottom:env(safe-area-inset-bottom);background:#071321;border-top:1px solid #304152;}
      #le-universal-pdf-viewer .le-pdf-page-label{font-size:11px;color:#b6c6d5;min-width:74px;text-align:center;font-variant-numeric:tabular-nums;}
      #le-universal-pdf-viewer .le-pdf-status{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#c5d6e4;background:#091421;font-size:13px;line-height:1.5;}
      #le-universal-pdf-viewer .le-pdf-status[hidden]{display:none!important}
      body.le-universal-pdf-open{overflow:hidden!important;}
      @media(orientation:landscape){#le-universal-pdf-viewer .le-pdf-toolbar{height:46px;min-height:46px;}#le-universal-pdf-viewer .le-pdf-nav{height:48px;min-height:48px;}}
    `;
    document.head.appendChild(style);
    root = make('section'); root.id = 'le-universal-pdf-viewer'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'PDF reader');
    const toolbar = make('header', 'le-pdf-toolbar');
    const download = make('button', 'le-pdf-download', 'Download'); download.type = 'button';
    const title = make('div', 'le-pdf-title', 'Publication');
    const close = make('button', 'le-pdf-close', 'Close'); close.type = 'button';
    toolbar.append(download, title, close);
    const viewport = make('div', 'le-pdf-viewport');
    const iframe = make('iframe'); iframe.title = 'Published PDF'; iframe.setAttribute('loading', 'eager');
    const status = make('div', 'le-pdf-status', 'Preparing PDF…');
    const swipeLeft = make('div', 'le-pdf-swipe-edge le-pdf-swipe-left');
    const swipeRight = make('div', 'le-pdf-swipe-edge le-pdf-swipe-right');
    swipeLeft.setAttribute('aria-hidden', 'true');
    swipeRight.setAttribute('aria-hidden', 'true');
    viewport.append(iframe, status, swipeLeft, swipeRight);
    const nav = make('footer', 'le-pdf-nav');
    const previous = make('button', '', 'Previous'); previous.type = 'button';
    const pageLabel = make('span', 'le-pdf-page-label', 'Page 1');
    const next = make('button', '', 'Next'); next.type = 'button';
    nav.append(previous, pageLabel, next);
    root.append(toolbar, viewport, nav);
    document.body.appendChild(root);

    download.addEventListener('click', () => {
      if (!active) return;
      const a = make('a'); a.href = active.objectUrl; a.download = active.fileName;
      a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    });
    close.addEventListener('click', closeViewer);
    previous.addEventListener('click', () => changePage(-1));
    next.addEventListener('click', () => changePage(1));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) closeViewer(); });
    function bindEdgeSwipe(edge) {
      let startX = 0, startY = 0;
      edge.addEventListener('touchstart', event => {
        if (!event.touches || event.touches.length !== 1) return;
        startX = event.touches[0].clientX; startY = event.touches[0].clientY;
      }, { passive: true });
      edge.addEventListener('touchend', event => {
        if (!event.changedTouches || !active) return;
        const dx = event.changedTouches[0].clientX - startX;
        const dy = event.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.25) changePage(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    bindEdgeSwipe(swipeLeft);
    bindEdgeSwipe(swipeRight);
    root._pdfParts = { download, title, close, iframe, status, previous, next, pageLabel, swipeLeft, swipeRight };
  }
  function setStatus(message, show = true) {
    if (!root) return;
    const status = root._pdfParts.status;
    status.textContent = message;
    status.hidden = !show;
  }
  function applyPage() {
    if (!active) return;
    const { iframe, pageLabel, previous, next } = root._pdfParts;
    const page = Math.max(1, Math.min(active.page, active.pageCount || 99999));
    active.page = page;
    iframe.src = active.objectUrl + `#page=${page}&toolbar=0&navpanes=0&view=Fit`;
    pageLabel.textContent = active.pageCount ? `Page ${page} of ${active.pageCount}` : `Page ${page}`;
    previous.disabled = page <= 1;
    next.disabled = active.pageCount ? page >= active.pageCount : false;
  }
  function changePage(delta) {
    if (!active) return;
    active.page += delta;
    if (active.page < 1) active.page = 1;
    if (active.pageCount && active.page > active.pageCount) active.page = active.pageCount;
    applyPage();
  }
  function blobFromRecord(record) {
    if (record.pdf instanceof Blob) return record.pdf;
    return new Blob([record.pdf], { type: 'application/pdf' });
  }
  async function sha256Hex(blob) {
    if (!window.crypto?.subtle) throw new Error('This browser cannot verify the magazine integrity hash.');
    const digest = await window.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function verifyPdfHash(blob, expected) {
    if (!expected) return;
    if (!/^[a-f0-9]{64}$/i.test(String(expected))) throw new Error('The magazine integrity hash is invalid.');
    const actual = await sha256Hex(blob);
    if (actual.toLowerCase() !== String(expected).toLowerCase()) {
      throw new Error('The downloaded PDF did not match the Publisher integrity hash.');
    }
  }
  async function resolvePdf(options) {
    const requestedId = String(options.id || options.issueId || options.url || 'publication').slice(0, 150);
    const viewId = String(options.viewId || 'shared').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60);
    const id = `${viewId}:${requestedId}`;
    const url = options.url ? new URL(options.url, document.baseURI).href : '';
    if (url && !/^https:\/\//i.test(url)) throw new Error('Only HTTPS PDF publications can be opened.');
    let fetched = null;
    if (url && navigator.onLine !== false) {
      try {
        const response = await fetch(url, { method: 'GET', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!response.ok) throw new Error(`PDF request returned ${response.status}.`);
        const type = (response.headers.get('content-type') || '').toLowerCase();
        const urlPath = new URL(url).pathname.toLowerCase();
        if (type && !type.includes('application/pdf') && !urlPath.endsWith('.pdf')) throw new Error('The requested resource is not identified as a PDF.');
        const blob = await response.blob();
        if (!blob.size || blob.size > 35 * 1024 * 1024) throw new Error('The PDF is empty or exceeds the 35 MiB reader safety limit.');
        await verifyPdfHash(blob, options.sha256);
        fetched = { id, title: String(options.title || 'Publication'), viewId,
          fileName: String(options.fileName || `${requestedId}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '-'),
          pages: Number(options.pages) || 0, bytes: blob.size, sha256: String(options.sha256 || ''), savedAt: Date.now(), sourceUrl: url, pdf: blob };
        await putSaved(fetched);
      } catch (error) {
        if (!options.allowSavedFallback) throw error;
      }
    }
    if (fetched) return fetched;
    const saved = await getSaved(id);
    if (saved && saved.pdf) {
      await verifyPdfHash(blobFromRecord(saved), options.sha256 || saved.sha256);
      return saved;
    }
    throw new Error(navigator.onLine === false ? 'This PDF has not been saved on this device yet. Open it once while online, then it will be available offline.' : 'The PDF could not be loaded and no saved copy exists.');
  }

  async function open(options = {}) {
    buildUi();
    if (active || opening || !root.hidden) closeViewer();
    const generation = ++openGeneration;
    opening = true;
    lastFocus = document.activeElement;
    setStatus('Loading the actual PDF file…', true);
    root.hidden = false;
    document.body.classList.add('le-universal-pdf-open');
    setChromeHidden(true);
    try {
      const record = await resolvePdf(options);
      if (generation !== openGeneration) return false;
      const blob = blobFromRecord(record);
      active = {
        id: record.id,
        title: record.title || 'Publication',
        fileName: record.fileName || `${record.id}.pdf`,
        page: 1,
        pageCount: Number(options.pages || record.pages) || 0,
        objectUrl: URL.createObjectURL(blob),
        viewId: record.viewId || options.viewId || 'shared',
        returnTo: options.returnTo || null
      };
      root._pdfParts.title.textContent = active.title;
      setStatus('', false);
      applyPage();
      root._pdfParts.close.focus({ preventScroll: true });
      window.dispatchEvent(new CustomEvent('live-earth-pdf-viewer-open', { detail: { id: active.id, viewId: active.viewId } }));
      return true;
    } catch (error) {
      if (generation !== openGeneration) return false;
      setStatus(error && error.message ? error.message : 'The PDF could not be opened.', true);
      const close = root._pdfParts.close;
      close.focus({ preventScroll: true });
      return false;
    } finally {
      if (generation === openGeneration) opening = false;
    }
  }
  function closeViewer() {
    openGeneration += 1;
    opening = false;
    if (!root) return;
    const previous = active;
    if (active && active.objectUrl) URL.revokeObjectURL(active.objectUrl);
    active = null;
    root._pdfParts.iframe.removeAttribute('src');
    root.hidden = true;
    document.body.classList.remove('le-universal-pdf-open');
    setChromeHidden(false);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent('live-earth-pdf-viewer-close', {
      detail: previous ? { id: previous.id, viewId: previous.viewId, returnTo: previous.returnTo } : {}
    }));
  }
  async function savedPublications() {
    const rows = await listSaved();
    return rows.map(x => ({ id: x.id, title: x.title, viewId: x.viewId, bytes: x.bytes, savedAt: x.savedAt, pages: x.pages }));
  }

  window.LiveEarthUniversalPDFViewer = Object.freeze({
    open,
    close: closeViewer,
    isOpen: () => Boolean(root && !root.hidden),
    listSaved: savedPublications,
    version: '1.0.0'
  });
  window.__liveEarthUniversalPDFViewerInstalled = true;
  window.dispatchEvent(new Event('live-earth-universal-pdf-viewer-ready'));
})();
