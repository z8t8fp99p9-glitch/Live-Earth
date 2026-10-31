/* LIVE // EARTH — Universal PDF Reader v2.0.0
   Independent, full-screen magazine reader.
   Public contract remains: LiveEarthUniversalPDFViewer.open(options), close(), isOpen(), listSaved().
   PDF.js is loaded on demand and cached in Cache Storage; PDF files remain in the existing IndexedDB library.
*/
(() => {
  'use strict';
  if (window.__liveEarthUniversalPDFViewerInstalled) return;

  const DB_NAME = 'live-earth-pdf-library';
  const DB_VERSION = 1; // Preserve the existing saved-publication database unchanged.
  const STORE = 'issues';
  const MAX_FILES = 3;
  const MAX_TOTAL_BYTES = 70 * 1024 * 1024;
  const PDFJS_VERSION = '6.4.299';
  const ENGINE_CACHE = 'live-earth-pdf-reader-engine-v1';
  const ENGINE_ASSETS = [
    {
      name: 'pdf.mjs',
      key: `./__le_pdf_reader_engine/${PDFJS_VERSION}/pdf.mjs`,
      minBytes: 150000,
      urls: [
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.mjs`,
        `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.mjs`
      ]
    },
    {
      name: 'pdf.worker.mjs',
      key: `./__le_pdf_reader_engine/${PDFJS_VERSION}/pdf.worker.mjs`,
      minBytes: 150000,
      urls: [
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.mjs`,
        `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.mjs`
      ]
    }
  ];

  let dbPromise = null;
  let active = null;
  let opening = false;
  let openGeneration = 0;
  let root = null;
  let lastFocus = null;
  let pdfEnginePromise = null;
  let pdfEngine = null;
  let pdfEngineUrls = [];
  let resizeFrame = 0;

  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Local PDF storage is unavailable in this browser.'));
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
      req.onerror = () => { dbPromise = null; reject(req.error || new Error('Could not open the local PDF library.')); };
      req.onblocked = () => reject(new Error('Close another LIVE // EARTH tab to finish preparing local PDF storage.'));
    });
    return dbPromise;
  }

  function requestResult(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Local PDF library request failed.'));
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
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Could not save the PDF for offline reading.'));
    });
    tx.objectStore(STORE).put(record);
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
        keep.add(record.id);
        total += size;
      }
    }
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const record of records) if (!keep.has(record.id)) store.delete(record.id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Could not maintain the local PDF library.'));
    });
  }

  function make(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function iconButton(label, glyph, className) {
    const button = make('button', `le-pdf-button ${className || ''}`.trim());
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    const mark = make('span', 'le-pdf-button-glyph', glyph);
    mark.setAttribute('aria-hidden', 'true');
    button.appendChild(mark);
    return button;
  }


  function buildUi() {
    if (root) return;
    const style = make('style');
    style.id = 'le-universal-pdf-viewer-style';
    style.textContent = `
      #le-universal-pdf-viewer{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;overflow:hidden;isolation:isolate;box-sizing:border-box;padding:calc(env(safe-area-inset-top) + 7px) calc(env(safe-area-inset-right) + 12px) calc(env(safe-area-inset-bottom) + 8px) calc(env(safe-area-inset-left) + 12px);color:#f5f0e6;background:radial-gradient(ellipse at 50% 35%,#18283a 0%,#0b1421 42%,#050911 78%,#03060c 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
      #le-universal-pdf-viewer[hidden]{display:none!important}
      #le-universal-pdf-viewer:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.38;background-image:radial-gradient(1px 1px at 8% 17%,#e6d7b7 98%,transparent),radial-gradient(1px 1px at 88% 23%,#c7d9e8 98%,transparent),radial-gradient(1px 1px at 23% 74%,#e6d7b7 98%,transparent),radial-gradient(1.3px 1.3px at 76% 83%,#c7d9e8 98%,transparent),radial-gradient(1px 1px at 54% 10%,#e6d7b7 98%,transparent);}
      #le-universal-pdf-viewer *{box-sizing:border-box}
      #le-universal-pdf-viewer .le-pdf-topbar{position:relative;z-index:5;display:grid;grid-template-columns:52px minmax(0,1fr) 52px;align-items:center;gap:10px;min-height:54px;padding:0 2px;}
      #le-universal-pdf-viewer .le-pdf-brand{min-width:0;text-align:center;}
      #le-universal-pdf-viewer .le-pdf-eyebrow{font-size:9px;line-height:1.2;font-weight:800;letter-spacing:.26em;color:#c9a975;text-transform:uppercase;white-space:nowrap;}
      #le-universal-pdf-viewer .le-pdf-title{margin-top:4px;overflow:hidden;color:#f2eee6;font-size:13px;line-height:1.2;font-weight:650;letter-spacing:.015em;text-overflow:ellipsis;white-space:nowrap;}
      #le-universal-pdf-viewer .le-pdf-button{appearance:none;-webkit-appearance:none;display:grid;place-items:center;min-width:44px;min-height:44px;padding:0;border:1px solid #8e9aaa45;border-radius:15px;color:#f4ebdc;background:linear-gradient(145deg,#ffffff17,#ffffff05);box-shadow:inset 0 1px 0 #ffffff14,0 7px 22px #0005;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);font:600 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
      #le-universal-pdf-viewer .le-pdf-button:active{transform:scale(.94);background:#d4b47b25;}
      #le-universal-pdf-viewer .le-pdf-button:focus{outline:none;}
      #le-universal-pdf-viewer .le-pdf-button:focus-visible{outline:1px solid #c9a9759c;outline-offset:3px;}
      #le-universal-pdf-viewer .le-pdf-button-glyph{display:block;font-size:25px;line-height:1;font-weight:300;}
      #le-universal-pdf-viewer .le-pdf-download .le-pdf-button-glyph{font-size:20px;}
      #le-universal-pdf-viewer .le-pdf-stage{position:relative;display:flex;flex:1;min-height:0;align-items:center;justify-content:center;overflow:hidden;padding:10px 0 12px;perspective:1800px;touch-action:pan-y;}
      #le-universal-pdf-viewer .le-pdf-book{position:relative;flex:0 0 auto;max-width:100%;max-height:100%;isolation:isolate;perspective:1800px;filter:drop-shadow(0 22px 30px #0009) drop-shadow(0 3px 7px #0008);}
      #le-universal-pdf-viewer .le-pdf-book:before,#le-universal-pdf-viewer .le-pdf-book:after{content:"";position:absolute;z-index:-1;inset:3px -4px -3px 3px;border:1px solid #e3d7bf66;border-radius:2px;background:linear-gradient(90deg,#bdb29d,#f4eddf 5%,#e9e0ce 96%,#9a8c76);}
      #le-universal-pdf-viewer .le-pdf-book:after{inset:6px -7px -5px 5px;z-index:-2;opacity:.58;}
      #le-universal-pdf-viewer .le-pdf-page-layer{position:absolute;inset:0;overflow:hidden;border:1px solid #e9dfce;border-radius:2px;background:linear-gradient(90deg,#eee5d4 0%,#faf7ef 2.5%,#faf7ef 98%,#e9dfce 100%);box-shadow:inset 10px 0 16px #4d3e2514,inset -3px 0 9px #3b2c1b16,0 0 0 1px #ffffff15;}
      #le-universal-pdf-viewer .le-pdf-page-canvas{display:block;width:100%;height:100%;background:#faf7ef;}
      #le-universal-pdf-viewer .le-pdf-flip-sheet{position:absolute;inset:0;z-index:3;transform-style:preserve-3d;will-change:transform;pointer-events:none;filter:drop-shadow(0 2px 4px #251b1038);}
      #le-universal-pdf-viewer .le-pdf-flip-sheet:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#24190f20,transparent 22%,transparent 78%,#24190f0d);opacity:.55;}
      #le-universal-pdf-viewer .le-pdf-flip-face{position:absolute;inset:0;overflow:hidden;border:1px solid #e9dfce;border-radius:2px;background:#faf7ef;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:inset 0 0 18px #45351a0b;}
      #le-universal-pdf-viewer .le-pdf-flip-face canvas{display:block;width:100%;height:100%;}
      #le-universal-pdf-viewer .le-pdf-flip-back{transform:rotateY(180deg);}
      #le-universal-pdf-viewer .le-pdf-flip-back:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#382b1b21,transparent 18%,transparent 82%,#382b1b0a);}
      #le-universal-pdf-viewer .le-pdf-turn-forward{transform-origin:left center;transform:rotateY(-180deg);}
      #le-universal-pdf-viewer .le-pdf-turn-backward{transform-origin:right center;transform:rotateY(180deg);}
      #le-universal-pdf-viewer .le-pdf-bottom{position:relative;z-index:5;display:grid;grid-template-columns:58px minmax(0,1fr) 58px;align-items:center;gap:12px;min-height:67px;padding:5px 1px 0;}
      #le-universal-pdf-viewer .le-pdf-page-control{width:52px;height:48px;border-radius:17px;border-color:#c4a77570;color:#f3e6d0;background:linear-gradient(145deg,#b38a4b2b,#ffffff08);}
      #le-universal-pdf-viewer .le-pdf-page-control .le-pdf-button-glyph{font-size:29px;}
      #le-universal-pdf-viewer .le-pdf-page-control:disabled{opacity:.28;}
      #le-universal-pdf-viewer .le-pdf-page-meta{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;}
      #le-universal-pdf-viewer .le-pdf-page-count{font-size:10px;font-weight:700;letter-spacing:.2em;color:#e5d8c1;font-variant-numeric:tabular-nums;}
      #le-universal-pdf-viewer .le-pdf-page-count strong{color:#d6b77e;font-size:12px;}
      #le-universal-pdf-viewer .le-pdf-progress{width:min(100%,230px);height:2px;overflow:hidden;border-radius:5px;background:#c9d0d92a;}
      #le-universal-pdf-viewer .le-pdf-progress-fill{display:block;width:0;height:100%;border-radius:5px;background:linear-gradient(90deg,#8d6c3b,#e0c48e);box-shadow:0 0 10px #d3ad6a80;transition:width .28s ease;}
      #le-universal-pdf-viewer .le-pdf-status{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;padding:26px;text-align:center;color:#e9e2d6;background:linear-gradient(180deg,#07101ee8,#07101ef5);font-size:13px;line-height:1.5;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
      #le-universal-pdf-viewer .le-pdf-status[hidden]{display:none!important}
      #le-universal-pdf-viewer .le-pdf-spinner{width:25px;height:25px;border:2px solid #d6c39b40;border-top-color:#d7b77e;border-radius:50%;animation:le-pdf-spin .8s linear infinite;}
      #le-universal-pdf-viewer .le-pdf-status-message{max-width:290px;}
      #le-universal-pdf-viewer .le-pdf-status-detail{max-width:300px;color:#aebaca;font-size:11px;}
      @keyframes le-pdf-spin{to{transform:rotate(360deg)}}
      body.le-universal-pdf-open{overflow:hidden!important;}
      @media(orientation:landscape){#le-universal-pdf-viewer .le-pdf-topbar{min-height:48px;}#le-universal-pdf-viewer .le-pdf-stage{padding:4px 0 6px;}#le-universal-pdf-viewer .le-pdf-bottom{min-height:58px;}#le-universal-pdf-viewer .le-pdf-button{min-height:40px;}}
      @media(prefers-reduced-motion:reduce){#le-universal-pdf-viewer .le-pdf-button,#le-universal-pdf-viewer .le-pdf-progress-fill{transition:none!important;}#le-universal-pdf-viewer .le-pdf-spinner{animation:none!important;}}
    `;
    document.head.appendChild(style);

    root = make('section', '');
    root.id = 'le-universal-pdf-viewer';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'LIVE // EARTH magazine reader');

    const topbar = make('header', 'le-pdf-topbar');
    const close = iconButton('Close reader', '×', 'le-pdf-close');
    const brand = make('div', 'le-pdf-brand');
    brand.append(make('div', 'le-pdf-eyebrow', 'LIVE // EARTH  ·  EDITIONS'), make('div', 'le-pdf-title', 'Publication'));
    const download = iconButton('Download magazine PDF', '↓', 'le-pdf-download');
    download.disabled = true;
    topbar.append(close, brand, download);

    const stage = make('main', 'le-pdf-stage');
    stage.setAttribute('aria-label', 'Magazine page. Swipe left or right to turn pages.');
    const book = make('div', 'le-pdf-book');
    const pageLayer = make('div', 'le-pdf-page-layer');
    book.appendChild(pageLayer);
    stage.appendChild(book);

    const status = make('div', 'le-pdf-status');
    status.append(make('span', 'le-pdf-spinner'), make('div', 'le-pdf-status-message', 'Preparing your magazine…'), make('div', 'le-pdf-status-detail', 'Opening the pages in the reader'));
    stage.appendChild(status);

    const bottom = make('footer', 'le-pdf-bottom');
    const previous = iconButton('Previous page', '‹', 'le-pdf-page-control le-pdf-previous');
    previous.disabled = true;
    const pageMeta = make('div', 'le-pdf-page-meta');
    const pageCount = make('div', 'le-pdf-page-count');
    const progress = make('div', 'le-pdf-progress');
    const progressFill = make('span', 'le-pdf-progress-fill');
    progress.appendChild(progressFill);
    pageMeta.append(pageCount, progress);
    const next = iconButton('Next page', '›', 'le-pdf-page-control le-pdf-next');
    next.disabled = true;
    bottom.append(previous, pageMeta, next);
    root.append(topbar, stage, bottom);
    document.body.appendChild(root);

    close.addEventListener('click', closeViewer);
    download.addEventListener('click', downloadActivePdf);
    previous.addEventListener('click', () => changePage(-1));
    next.addEventListener('click', () => changePage(1));
    document.addEventListener('keydown', event => {
      if (!active) return;
      if (event.key === 'Escape') closeViewer();
      else if (event.key === 'ArrowLeft') changePage(-1);
      else if (event.key === 'ArrowRight') changePage(1);
    });

    let swipeStart = null;
    stage.addEventListener('pointerdown', event => {
      if (!active || active.turning || event.button > 0) return;
      swipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      try { stage.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture is optional on older Safari builds. */ }
    }, { passive: true });
    stage.addEventListener('pointerup', event => {
      if (!swipeStart || !active || event.pointerId !== swipeStart.pointerId) { swipeStart = null; return; }
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      try { if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId); } catch (_) { /* Ignore stale pointer capture. */ }
      if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy) * 1.2) changePage(dx < 0 ? 1 : -1);
    }, { passive: true });
    stage.addEventListener('pointercancel', () => { swipeStart = null; }, { passive: true });

    root._pdfParts = { close, brand, title: brand.lastElementChild, download, stage, book, pageLayer, status, statusMessage: status.children[1], statusDetail: status.children[2], previous, next, pageCount, progressFill };
  }

  function setStatus(message, detail = '', show = true) {
    if (!root) return;
    const parts = root._pdfParts;
    parts.statusMessage.textContent = message;
    parts.statusDetail.textContent = detail;
    parts.status.hidden = !show;
  }

  function updateNavigation() {
    if (!active || !root) return;
    const { previous, next, pageCount, progressFill } = root._pdfParts;
    const page = active.page;
    const total = active.pdf.numPages;
    pageCount.replaceChildren();
    pageCount.append(make('strong', '', String(page).padStart(2, '0')), document.createTextNode(`  /  ${String(total).padStart(2, '0')}`));
    progressFill.style.width = `${Math.max(0, Math.min(100, (page / total) * 100))}%`;
    previous.disabled = page <= 1 || active.turning;
    next.disabled = page >= total || active.turning;
  }

  function canvasCopy(source) {
    const copy = document.createElement('canvas');
    copy.width = source.width;
    copy.height = source.height;
    copy.className = 'le-pdf-page-canvas';
    const context = copy.getContext('2d', { alpha: false });
    if (context) context.drawImage(source, 0, 0);
    return copy;
  }

  async function renderPage(pdf, pageNumber, generation) {
    const page = await pdf.getPage(pageNumber);
    if (!active || generation !== openGeneration) throw new Error('The reader session changed while preparing a page.');
    const stageRect = root._pdfParts.stage.getBoundingClientRect();
    const baseViewport = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(180, stageRect.width - 34);
    const availableHeight = Math.max(180, stageRect.height - 34);
    const fitScale = Math.min(availableWidth / baseViewport.width, availableHeight / baseViewport.height, 1.8);
    const cssWidth = Math.max(1, Math.floor(baseViewport.width * fitScale));
    const cssHeight = Math.max(1, Math.floor(baseViewport.height * fitScale));
    const outputScale = Math.min(window.devicePixelRatio || 1, 2.25);
    const viewport = page.getViewport({ scale: fitScale * outputScale });
    const canvas = document.createElement('canvas');
    canvas.className = 'le-pdf-page-canvas';
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) throw new Error('This device could not create a page-rendering surface.');
    context.fillStyle = '#faf7ef';
    context.fillRect(0, 0, canvas.width, canvas.height);
    root._pdfParts.book.style.width = `${cssWidth}px`;
    root._pdfParts.book.style.height = `${cssHeight}px`;
    try { active?.renderTask?.cancel(); } catch (_) { /* A previous render may already have completed. */ }
    const task = page.render({ canvas, canvasContext: context, viewport, background: '#faf7ef' });
    active.renderTask = task;
    try { await task.promise; }
    finally { if (active && active.renderTask === task) active.renderTask = null; }
    if (!active || generation !== openGeneration) throw new Error('The reader session changed while rendering a page.');
    page.cleanup();
    return canvas;
  }

  function waitForFlip(sheet, duration) {
    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        sheet.removeEventListener('transitionend', onEnd);
        clearTimeout(timer);
        resolve();
      };
      const onEnd = event => { if (event.target === sheet && event.propertyName === 'transform') finish(); };
      sheet.addEventListener('transitionend', onEnd);
      const timer = window.setTimeout(finish, duration + 120);
    });
  }

  async function changePage(delta) {
    if (!active || active.turning) return false;
    const targetPage = active.page + delta;
    if (targetPage < 1 || targetPage > active.pdf.numPages) return false;
    const session = active;
    const generation = openGeneration;
    session.turning = true;
    updateNavigation();
    try {
      const targetCanvas = await renderPage(session.pdf, targetPage, generation);
      if (!active || active !== session || generation !== openGeneration) return false;
      const currentCanvas = root._pdfParts.pageLayer.querySelector('canvas');
      if (!currentCanvas) throw new Error('The current page surface is unavailable.');

      const sheet = make('div', 'le-pdf-flip-sheet');
      const front = make('div', 'le-pdf-flip-face le-pdf-flip-front');
      const back = make('div', 'le-pdf-flip-face le-pdf-flip-back');
      const frontCanvas = canvasCopy(currentCanvas);
      const backCanvas = canvasCopy(targetCanvas);
      front.appendChild(frontCanvas);
      back.appendChild(backCanvas);
      sheet.append(front, back);

      // Put the next real PDF page underneath before animating the old page away.
      root._pdfParts.pageLayer.appendChild(targetCanvas);
      root._pdfParts.book.appendChild(sheet);
      currentCanvas.remove();
      void sheet.offsetWidth;
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
      const duration = reducedMotion ? 1 : 420;
      sheet.style.transition = `transform ${duration}ms cubic-bezier(.22,.72,.18,1)`;
      sheet.classList.add(delta > 0 ? 'le-pdf-turn-forward' : 'le-pdf-turn-backward');
      await waitForFlip(sheet, duration);
      if (!active || active !== session || generation !== openGeneration) { sheet.remove(); targetCanvas.remove(); return false; }
      sheet.remove();
      session.page = targetPage;
      session.turning = false;
      updateNavigation();
      window.dispatchEvent(new CustomEvent('live-earth-pdf-page-change', { detail: { id: session.id, viewId: session.viewId, page: targetPage, pages: session.pdf.numPages } }));
      return true;
    } catch (error) {
      if (active === session) {
        session.turning = false;
        updateNavigation();
        setStatus('This page could not be displayed.', error?.message || 'Please try turning the page again.', true);
        window.setTimeout(() => { if (active === session) setStatus('', '', false); }, 1800);
      }
      return false;
    }
  }

  function downloadActivePdf() {
    if (!active?.blob) return;
    const url = URL.createObjectURL(active.blob);
    const anchor = make('a');
    anchor.href = url;
    anchor.download = active.fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
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
    if (actual.toLowerCase() !== String(expected).toLowerCase()) throw new Error('The downloaded PDF did not match its supplied integrity hash.');
  }

  async function validatePdfBlob(blob) {
    if (!(blob instanceof Blob) || !blob.size) throw new Error('The PDF file is empty.');
    if (blob.size > 35 * 1024 * 1024) throw new Error('The PDF exceeds the 35 MiB reader safety limit.');
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    const signature = new TextDecoder().decode(head);
    if (!signature.includes('%PDF-')) throw new Error('The publication URL did not return a valid PDF file.');
  }

  async function resolvePdf(options) {
    const requestedId = String(options.id || options.issueId || options.url || 'publication').slice(0, 150);
    const viewId = String(options.viewId || 'shared').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60);
    const id = `${viewId}:${requestedId}`;
    const url = options.url ? new URL(options.url, document.baseURI).href : '';
    if (url && !/^https:\/\//i.test(url)) throw new Error('Only HTTPS PDF publications can be opened.');
    let networkError = null;

    if (url && navigator.onLine !== false) {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 30000);
        let response;
        try {
          response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
        } finally { window.clearTimeout(timer); }
        if (!response.ok) throw new Error(`The publication server returned ${response.status}.`);
        const blob = await response.blob();
        await validatePdfBlob(blob);
        await verifyPdfHash(blob, options.sha256);
        const record = {
          id,
          title: String(options.title || 'Publication'),
          viewId,
          fileName: String(options.fileName || `${requestedId}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '-'),
          pages: Number(options.pages) || 0,
          bytes: blob.size,
          sha256: String(options.sha256 || ''),
          savedAt: Date.now(),
          sourceUrl: url,
          pdf: blob
        };
        // Local saving is best-effort: an IndexedDB quota or availability issue must never block online reading.
        try { await putSaved(record); }
        catch (storageError) {
          console.warn('[LIVE // EARTH] PDF opened but could not be saved for offline use:', storageError);
          window.dispatchEvent(new CustomEvent('live-earth-pdf-save-warning', { detail: { id, error: String(storageError?.message || storageError) } }));
        }
        return record;
      } catch (error) {
        networkError = error;
        if (!options.allowSavedFallback) throw error;
      }
    }

    try {
      const saved = await getSaved(id);
      if (saved?.pdf) {
        const blob = saved.pdf instanceof Blob ? saved.pdf : new Blob([saved.pdf], { type: 'application/pdf' });
        await validatePdfBlob(blob);
        await verifyPdfHash(blob, options.sha256 || saved.sha256);
        return { ...saved, pdf: blob };
      }
    } catch (storageError) {
      if (navigator.onLine === false || !networkError) throw storageError;
    }

    if (navigator.onLine === false) throw new Error('This magazine has not been saved on this device yet. Open it once while online to make it available offline.');
    throw networkError || new Error('The PDF could not be loaded and no saved copy exists.');
  }

  async function fetchEngineAsset(asset, cache) {
    const key = new Request(new URL(asset.key, document.baseURI).href);
    if (cache) {
      const cached = await cache.match(key);
      if (cached) {
        const bytes = await cached.arrayBuffer();
        if (bytes.byteLength >= asset.minBytes) return bytes;
        await cache.delete(key);
      }
    }
    if (navigator.onLine === false) throw new Error(`The reader engine has not been downloaded on this device yet (${asset.name}).`);
    let lastError = null;
    for (const url of asset.urls) {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 25000);
        let response;
        try {
          response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'force-cache', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
        } finally { window.clearTimeout(timer); }
        if (!response.ok) throw new Error(`Engine download returned ${response.status}.`);
        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        if (contentType && !/(javascript|ecmascript|text\/plain)/i.test(contentType)) {
          throw new Error(`Reader engine source returned an unexpected content type (${asset.name}).`);
        }
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength < asset.minBytes) throw new Error(`Reader engine file is incomplete (${asset.name}).`);
        if (cache) {
          try {
            const saved = new Response(bytes.slice(0), { status: 200, headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=31536000' } });
            await cache.put(key, saved);
          } catch (cacheError) {
            console.warn('[LIVE // EARTH] Reader engine loaded but could not be retained for offline use:', cacheError);
          }
        }
        return bytes;
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error(`Could not download the reader engine (${asset.name}).`);
  }

async function loadPdfEngine() {
    if (pdfEngine) return pdfEngine;
    if (pdfEnginePromise) return pdfEnginePromise;

    pdfEnginePromise = (async () => {
      let cache = null;
      if ('caches' in window) {
        try { cache = await caches.open(ENGINE_CACHE); }
        catch (error) { console.warn('[LIVE // EARTH] Reader engine cache is unavailable; continuing online:', error); }
      }

      const [pdfBytes, workerBytes] = await Promise.all(
        ENGINE_ASSETS.map(asset => fetchEngineAsset(asset, cache))
      );
      const moduleUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'text/javascript' }));
      const workerUrl = URL.createObjectURL(new Blob([workerBytes], { type: 'text/javascript' }));

      try {
        // Load the real PDF.js module from verified, cached distribution bytes.
        // Its worker is also a Blob URL so it remains independent of a CDN at render time.
        const imported = await import(moduleUrl);
        if (typeof imported.getDocument !== 'function' || !imported.GlobalWorkerOptions) {
          throw new Error('The downloaded PDF renderer did not expose the expected PDF.js API.');
        }
        imported.GlobalWorkerOptions.workerSrc = workerUrl;
        pdfEngine = imported;
        // Keep both object URLs alive for the lifetime of the reader: PDF.js creates
        // its worker lazily, and later magazine opens reuse this same engine.
        pdfEngineUrls = [moduleUrl, workerUrl];
        return pdfEngine;
      } catch (error) {
        URL.revokeObjectURL(moduleUrl);
        URL.revokeObjectURL(workerUrl);
        throw error;
      }
    })().catch(error => {
      pdfEnginePromise = null;
      throw error;
    });

    return pdfEnginePromise;
  }

  async function open(options = {}) {
    buildUi();
    if (active || opening || !root.hidden) closeViewer();
    const generation = ++openGeneration;
    opening = true;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('le-universal-pdf-open');
    setStatus('Preparing your magazine…', 'Fetching the publication and preparing the page renderer.', true);
    try {
      const [record, engine] = await Promise.all([resolvePdf(options), loadPdfEngine()]);
      if (generation !== openGeneration) return false;
      const blob = record.pdf instanceof Blob ? record.pdf : new Blob([record.pdf], { type: 'application/pdf' });
      const data = new Uint8Array(await blob.arrayBuffer());
      const loadingTask = engine.getDocument({ data, isEvalSupported: false, useSystemFonts: true, stopAtErrors: false });
      loadingTask.onProgress = progress => {
        if (!active && generation === openGeneration && progress?.total) {
          const percent = Math.max(0, Math.min(100, Math.round((progress.loaded / progress.total) * 100)));
          setStatus('Opening your magazine…', `${percent}% · Preparing the first page`, true);
        }
      };
      setStatus('Opening your magazine…', 'Rendering the first page at reading size.', true);
      const pdf = await loadingTask.promise;
      if (generation !== openGeneration) { await pdf.destroy(); return false; }
      active = {
        id: record.id,
        title: record.title || options.title || 'Publication',
        fileName: record.fileName || `${record.id}.pdf`,
        page: 1,
        pdf,
        loadingTask,
        blob,
        viewId: record.viewId || options.viewId || 'shared',
        returnTo: options.returnTo || null,
        turning: false,
        renderTask: null
      };
      root._pdfParts.title.textContent = active.title;
      root._pdfParts.download.disabled = false;
      const firstCanvas = await renderPage(pdf, 1, generation);
      if (generation !== openGeneration || !active) return false;
      root._pdfParts.pageLayer.replaceChildren(firstCanvas);
      updateNavigation();
      setStatus('', '', false);
      root._pdfParts.close.focus({ preventScroll: true });
      window.dispatchEvent(new CustomEvent('live-earth-pdf-viewer-open', { detail: { id: active.id, viewId: active.viewId, pages: pdf.numPages } }));
      return true;
    } catch (error) {
      if (generation !== openGeneration) return false;
      console.error('[LIVE // EARTH] Universal PDF Reader could not open the publication:', error);
      const message = error?.message || 'The magazine could not be opened.';
      setStatus('We could not open this magazine.', message, true);
      root._pdfParts.close.focus({ preventScroll: true });
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
    active = null;
    if (previous) {
      try { previous.renderTask?.cancel(); } catch (_) { /* render already finished */ }
      try { previous.loadingTask?.destroy(); } catch (_) { /* document already closed */ }
      try { previous.pdf?.destroy(); } catch (_) { /* document already closed */ }
    }
    root._pdfParts.pageLayer.replaceChildren();
    root._pdfParts.book.querySelector('.le-pdf-flip-sheet')?.remove();
    root._pdfParts.download.disabled = true;
    root._pdfParts.previous.disabled = true;
    root._pdfParts.next.disabled = true;
    root.hidden = true;
    document.body.classList.remove('le-universal-pdf-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent('live-earth-pdf-viewer-close', {
      detail: previous ? { id: previous.id, viewId: previous.viewId, returnTo: previous.returnTo } : {}
    }));
  }

  async function rerenderCurrentPage() {
    if (!active || active.turning || opening) return;
    const session = active;
    const generation = openGeneration;
    try {
      const canvas = await renderPage(session.pdf, session.page, generation);
      if (active !== session || generation !== openGeneration) return;
      root._pdfParts.pageLayer.replaceChildren(canvas);
    } catch (_) { /* Keep the last visible page if a transient resize render fails. */ }
  }

  function scheduleResize() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; rerenderCurrentPage(); });
  }

  window.addEventListener('resize', scheduleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });

  async function savedPublications() {
    const rows = await listSaved();
    return rows.map(item => ({ id: item.id, title: item.title, viewId: item.viewId, bytes: item.bytes, savedAt: item.savedAt, pages: item.pages }));
  }

  window.LiveEarthUniversalPDFViewer = Object.freeze({
    open,
    close: closeViewer,
    isOpen: () => Boolean(root && !root.hidden),
    listSaved: savedPublications,
    version: '2.0.0'
  });
  window.__liveEarthUniversalPDFViewerInstalled = true;
  window.dispatchEvent(new Event('live-earth-universal-pdf-viewer-ready'));
})();
