/* LIVE // EARTH — Universal PDF Reader v4.0.0
   Immersive full-screen PDF reader with glassmorphism + claymorphism controls.
   Public API preserved: LiveEarthUniversalPDFViewer.open(options), close(), isOpen(), listSaved().
   Existing PDF.js engine cache and IndexedDB publication store are preserved.
*/
(() => {
  'use strict';
  if (window.__liveEarthUniversalPDFViewerInstalled) return;

  const DB_NAME = 'live-earth-pdf-library';
  const DB_VERSION = 1;
  const STORE = 'issues';
  const MAX_FILES = 3;
  const MAX_TOTAL_BYTES = 70 * 1024 * 1024;
  const PDFJS_VERSION = '6.4.299';
  const ENGINE_CACHE = 'live-earth-pdf-reader-engine-v1';
  const ENGINE_ASSETS = [
    { name: 'pdf.mjs', key: `./__le_pdf_reader_engine/${PDFJS_VERSION}/pdf.mjs`, minBytes: 150000,
      urls: [`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.mjs`, `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.mjs`] },
    { name: 'pdf.worker.mjs', key: `./__le_pdf_reader_engine/${PDFJS_VERSION}/pdf.worker.mjs`, minBytes: 150000,
      urls: [`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.mjs`, `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.mjs`] }
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
  let tapTimer = 0;
  const pointers = new Map();
  let gesture = null;

  const SVG = {
    previous: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.8 5.2 8 12l6.8 6.8"/><path d="M8.4 12h11"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 5.2 6.8 6.8-6.8 6.8"/><path d="M15.6 12h-11"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.8v10.8m-4.2-4.1L12 14.7l4.2-4.2"/><path d="M5 17.2v2.5h14v-2.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.2 6.2 11.6 11.6m0-11.6L6.2 17.8"/></svg>'
  };

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
      req.onsuccess = () => { const db = req.result; db.onversionchange = () => { db.close(); dbPromise = null; }; resolve(db); };
      req.onerror = () => { dbPromise = null; reject(req.error || new Error('Could not open the local PDF library.')); };
      req.onblocked = () => reject(new Error('Close another LIVE // EARTH tab to finish preparing local PDF storage.'));
    });
    return dbPromise;
  }

  function requestResult(req) {
    return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error || new Error('Local PDF library request failed.')); });
  }
  async function getSaved(id) { const db = await openDb(); return requestResult(db.transaction(STORE, 'readonly').objectStore(STORE).get(id)); }
  async function listSaved() { const db = await openDb(); return requestResult(db.transaction(STORE, 'readonly').objectStore(STORE).getAll()); }
  async function putSaved(record) {
    const db = await openDb(); const tx = db.transaction(STORE, 'readwrite');
    const done = new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error || new Error('Could not save the PDF for offline reading.')); });
    tx.objectStore(STORE).put(record); await done; await pruneSaved();
  }
  async function pruneSaved() {
    const rows = (await listSaved()).sort((a, b) => Number(b.savedAt) - Number(a.savedAt));
    let total = 0; const keep = new Set();
    for (const row of rows) { const bytes = Number(row.bytes) || 0; if (keep.size < MAX_FILES && total + bytes <= MAX_TOTAL_BYTES) { keep.add(row.id); total += bytes; } }
    const db = await openDb(); const tx = db.transaction(STORE, 'readwrite'); const store = tx.objectStore(STORE);
    for (const row of rows) if (!keep.has(row.id)) store.delete(row.id);
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error || new Error('Could not maintain the local PDF library.')); });
  }

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function iconButton(label, kind, rowClass) {
    const button = make('button', `le-pdf-control ${rowClass}`);
    button.type = 'button'; button.setAttribute('aria-label', label); button.title = label;
    const icon = make('span', 'le-pdf-icon'); icon.innerHTML = SVG[kind]; button.appendChild(icon);
    return button;
  }

  function buildUi() {
    if (root) return;
    const style = make('style'); style.id = 'le-universal-pdf-viewer-style';
    style.textContent = `
      #le-universal-pdf-viewer{position:fixed;inset:0;z-index:2147482000;overflow:hidden;isolation:isolate;background:#090d16;color:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;touch-action:none;}
      #le-universal-pdf-viewer[hidden]{display:none!important}#le-universal-pdf-viewer *{box-sizing:border-box}
      #le-universal-pdf-viewer:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 44%,#27324738 0%,#10182722 56%,#0508104d 100%);z-index:0}
      #le-universal-pdf-viewer .le-pdf-stage{position:absolute;inset:0;overflow:hidden;touch-action:none;z-index:1;}
      #le-universal-pdf-viewer .le-pdf-page-wrap{position:absolute;left:50%;top:50%;width:1px;height:1px;transform:translate3d(-50%,-50%,0);will-change:transform;}
      #le-universal-pdf-viewer .le-pdf-page-canvas{display:block;max-width:none;max-height:none;background:#fff;box-shadow:0 16px 65px #0005;transform-origin:center center;will-change:transform;}
      #le-universal-pdf-viewer .le-pdf-page-count{position:absolute;z-index:7;top:calc(env(safe-area-inset-top) + 13px);right:calc(env(safe-area-inset-right) + 15px);display:flex;align-items:center;gap:7px;min-height:31px;padding:5px 11px;border:1px solid #ffffff3d;border-radius:999px;color:#f6f8fb;background:linear-gradient(145deg,#ffffff42,#ffffff15 52%,#ffffff0b);box-shadow:inset 0 1px 1px #ffffff86,inset 0 -1px 1px #ffffff0d,0 5px 18px #0002,0 1px 2px #0002;backdrop-filter:blur(22px) saturate(165%);-webkit-backdrop-filter:blur(22px) saturate(165%);font-size:11px;font-weight:650;letter-spacing:.09em;font-variant-numeric:tabular-nums;text-shadow:0 1px 8px #0004;pointer-events:none;}
      #le-universal-pdf-viewer .le-pdf-page-count strong{font-size:12px;font-weight:750;color:#fff;}
      #le-universal-pdf-viewer .le-pdf-dock{position:absolute;z-index:8;left:50%;bottom:calc(env(safe-area-inset-bottom) + 22px);display:flex;flex-direction:column;align-items:center;gap:11px;transform:translateX(-50%);opacity:1;visibility:visible;transition:opacity .24s ease,transform .24s cubic-bezier(.2,.8,.2,1),visibility .24s;pointer-events:none;}
      #le-universal-pdf-viewer .le-pdf-dock[hidden]{display:none!important}
      #le-universal-pdf-viewer .le-pdf-nav-row,#le-universal-pdf-viewer .le-pdf-action-row{display:flex;align-items:center;justify-content:center;gap:13px;pointer-events:auto;}
      #le-universal-pdf-viewer .le-pdf-control{position:relative;display:grid;place-items:center;flex:none;appearance:none;-webkit-appearance:none;padding:0;border:1px solid #ffffff59;color:#fff;cursor:pointer;outline:none;overflow:hidden;-webkit-tap-highlight-color:transparent;touch-action:manipulation;isolation:isolate;background:linear-gradient(145deg,#ffffff55 0%,#ffffff27 23%,#ffffff13 58%,#ffffff27 100%);backdrop-filter:blur(28px) saturate(175%);-webkit-backdrop-filter:blur(28px) saturate(175%);box-shadow:inset 0 1.5px 1px #ffffffb0,inset 1px 0 1px #ffffff47,inset 0 -2px 3px #26364a30,0 8px 18px #0003,0 2px 5px #0002,0 0 0 1px #ffffff0d;transition:transform .18s cubic-bezier(.2,.8,.2,1),background .18s ease,box-shadow .18s ease;}
      #le-universal-pdf-viewer .le-pdf-control:before{content:"";position:absolute;inset:3px;border-radius:inherit;z-index:-1;background:linear-gradient(155deg,#ffffff22,#ffffff05 42%,#ffffff12);box-shadow:inset 0 1px 2px #ffffff40,inset 0 -5px 9px #17223516;pointer-events:none;}
      #le-universal-pdf-viewer .le-pdf-control:after{content:"";position:absolute;top:7%;left:17%;width:66%;height:36%;border-radius:50%;background:linear-gradient(180deg,#ffffff3b,#ffffff00);filter:blur(7px);z-index:-1;pointer-events:none;}
      #le-universal-pdf-viewer .le-pdf-control:active{transform:translateY(1px) scale(.94);background:linear-gradient(145deg,#ffffff30,#ffffff10);box-shadow:inset 0 2px 5px #07101d49,inset 0 1px 1px #ffffff55,0 2px 5px #0003;}
      #le-universal-pdf-viewer .le-pdf-control:focus-visible{outline:2px solid #fff9;outline-offset:4px;}
      #le-universal-pdf-viewer .le-pdf-control:disabled{opacity:.3;cursor:default;filter:saturate(.4);}
      #le-universal-pdf-viewer .le-pdf-nav-control{width:68px;height:68px;border-radius:50%;}
      #le-universal-pdf-viewer .le-pdf-action-control{width:126px;height:55px;border-radius:20px;}
      #le-universal-pdf-viewer .le-pdf-icon{display:grid;place-items:center;width:100%;height:100%;filter:drop-shadow(0 1px 2px #16203375);}
      #le-universal-pdf-viewer .le-pdf-icon svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;}
      #le-universal-pdf-viewer .le-pdf-action-control .le-pdf-icon svg{width:25px;height:25px;stroke-width:1.8;}
      #le-universal-pdf-viewer .le-pdf-status{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:26px;text-align:center;background:#070b13dc;color:#f1f4f8;font-size:13px;line-height:1.5;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}
      #le-universal-pdf-viewer .le-pdf-status[hidden]{display:none!important}
      #le-universal-pdf-viewer .le-pdf-spinner{width:27px;height:27px;border:2px solid #ffffff30;border-top-color:#fff;border-radius:50%;animation:le-pdf-spin .8s linear infinite;}
      #le-universal-pdf-viewer .le-pdf-status-message{max-width:300px;font-weight:650;}#le-universal-pdf-viewer .le-pdf-status-detail{max-width:320px;color:#bdc7d5;font-size:11px;}
      @keyframes le-pdf-spin{to{transform:rotate(360deg)}}body.le-universal-pdf-open{overflow:hidden!important;}
      @media(orientation:landscape){#le-universal-pdf-viewer .le-pdf-dock{bottom:calc(env(safe-area-inset-bottom) + 12px);gap:8px;}#le-universal-pdf-viewer .le-pdf-nav-control{width:60px;height:60px;}#le-universal-pdf-viewer .le-pdf-action-control{width:112px;height:48px;border-radius:17px;}#le-universal-pdf-viewer .le-pdf-nav-row,#le-universal-pdf-viewer .le-pdf-action-row{gap:10px;}}
      @media(prefers-reduced-motion:reduce){#le-universal-pdf-viewer .le-pdf-control,#le-universal-pdf-viewer .le-pdf-dock{transition:none!important;}#le-universal-pdf-viewer .le-pdf-spinner{animation:none!important;}}
    `;
    document.head.appendChild(style);

    root = make('section'); root.id = 'le-universal-pdf-viewer'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'LIVE // EARTH magazine reader');
    const stage = make('main', 'le-pdf-stage'); stage.setAttribute('aria-label', 'Magazine page. Swipe left or right to turn pages. Pinch or double-tap to zoom.');
    const pageWrap = make('div', 'le-pdf-page-wrap'); stage.appendChild(pageWrap);
    const counter = make('div', 'le-pdf-page-count'); counter.setAttribute('aria-live', 'polite');
    const dock = make('div', 'le-pdf-dock'); dock.hidden = true;
    const navRow = make('div', 'le-pdf-nav-row');
    const previous = iconButton('Previous page', 'previous', 'le-pdf-nav-control le-pdf-previous');
    const next = iconButton('Next page', 'next', 'le-pdf-nav-control le-pdf-next');
    navRow.append(previous, next);
    const actionRow = make('div', 'le-pdf-action-row');
    const download = iconButton('Download magazine PDF', 'download', 'le-pdf-action-control le-pdf-download');
    download.disabled = true;
    const close = iconButton('Close reader', 'close', 'le-pdf-action-control le-pdf-close');
    actionRow.append(download, close); dock.append(navRow, actionRow);
    const status = make('div', 'le-pdf-status'); status.append(make('span', 'le-pdf-spinner'), make('div', 'le-pdf-status-message', 'Preparing your magazine…'), make('div', 'le-pdf-status-detail', 'Opening the pages in the reader'));
    root.append(stage, counter, dock, status); document.body.appendChild(root);

    close.addEventListener('click', event => { event.stopPropagation(); closeViewer(); });
    download.addEventListener('click', event => { event.stopPropagation(); downloadActivePdf(); });
    previous.addEventListener('click', event => { event.stopPropagation(); changePage(-1); });
    next.addEventListener('click', event => { event.stopPropagation(); changePage(1); });
    document.addEventListener('keydown', event => {
      if (!active) return;
      if (event.key === 'Escape') closeViewer();
      else if (event.key === 'ArrowLeft' && active.scale === 1) changePage(-1);
      else if (event.key === 'ArrowRight' && active.scale === 1) changePage(1);
    });
    bindGestures(stage);
    root._pdfParts = { stage, pageWrap, counter, dock, previous, next, download, close, status, statusMessage: status.children[1], statusDetail: status.children[2] };
  }

  function setStatus(message, detail = '', show = true) {
    if (!root) return; const p = root._pdfParts;
    p.statusMessage.textContent = message; p.statusDetail.textContent = detail; p.status.hidden = !show;
  }
  function updateCounter() {
    if (!active || !root) return;
    const count = root._pdfParts.counter;
    count.replaceChildren();
    count.append(make('strong', '', String(active.page).padStart(2, '0')), document.createTextNode(' / ' + String(active.pdf.numPages).padStart(2, '0')));
  }
  function updateNavigation() {
    if (!active || !root) return;
    root._pdfParts.previous.disabled = active.page <= 1 || active.turning;
    root._pdfParts.next.disabled = active.page >= active.pdf.numPages || active.turning;
    updateCounter();
  }
  function setControlsVisible(visible) {
    if (!root) return;
    root._pdfParts.dock.hidden = !visible;
    if (active) active.controlsVisible = visible;
  }
  function applyZoom() {
    if (!active || !root) return;
    const canvas = root._pdfParts.pageWrap.querySelector('canvas'); if (!canvas) return;
    const s = active.scale;
    const maxX = canvas.clientWidth * Math.max(0, s - 1) / 2;
    const maxY = canvas.clientHeight * Math.max(0, s - 1) / 2;
    active.panX = Math.max(-maxX, Math.min(maxX, active.panX));
    active.panY = Math.max(-maxY, Math.min(maxY, active.panY));
    canvas.style.transform = `translate3d(${active.panX}px,${active.panY}px,0) scale(${s})`;
  }
  function resetZoom() { if (!active) return; active.scale = 1; active.panX = 0; active.panY = 0; applyZoom(); }

  async function renderPage(pdf, pageNumber, generation) {
    const page = await pdf.getPage(pageNumber);
    if (!active || generation !== openGeneration) throw new Error('The reader session changed while preparing a page.');
    const width = Math.max(1, window.visualViewport?.width || window.innerWidth);
    const height = Math.max(1, window.visualViewport?.height || window.innerHeight);
    const base = page.getViewport({ scale: 1 });
    const fitScale = Math.min((width - 2) / base.width, (height - 2) / base.height);
    const outputScale = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssWidth = Math.max(1, Math.floor(base.width * fitScale));
    const cssHeight = Math.max(1, Math.floor(base.height * fitScale));
    const viewport = page.getViewport({ scale: fitScale * outputScale });
    const canvas = document.createElement('canvas'); canvas.className = 'le-pdf-page-canvas';
    canvas.width = Math.max(1, Math.floor(viewport.width)); canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.style.width = `${cssWidth}px`; canvas.style.height = `${cssHeight}px`;
    root._pdfParts.pageWrap.style.width = `${cssWidth}px`; root._pdfParts.pageWrap.style.height = `${cssHeight}px`;
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) throw new Error('This device could not create a page-rendering surface.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    try { active?.renderTask?.cancel(); } catch (_) { /* A previous render may already have completed. */ }
    const task = page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' }); active.renderTask = task;
    try { await task.promise; } finally { if (active && active.renderTask === task) active.renderTask = null; }
    if (!active || generation !== openGeneration) throw new Error('The reader session changed while rendering a page.');
    page.cleanup(); return canvas;
  }

  async function changePage(delta) {
    if (!active || active.turning) return false;
    const target = active.page + delta; if (target < 1 || target > active.pdf.numPages) return false;
    const session = active; const generation = openGeneration; session.turning = true; updateNavigation();
    try {
      const canvas = await renderPage(session.pdf, target, generation);
      if (active !== session || generation !== openGeneration) return false;
      root._pdfParts.pageWrap.replaceChildren(canvas);
      session.page = target; session.turning = false; resetZoom(); updateNavigation();
      window.dispatchEvent(new CustomEvent('live-earth-pdf-page-change', { detail: { id: session.id, viewId: session.viewId, page: target, pages: session.pdf.numPages } }));
      return true;
    } catch (error) {
      if (active === session) { session.turning = false; updateNavigation(); setStatus('This page could not be displayed.', error?.message || 'Please try again.', true); window.setTimeout(() => { if (active === session) setStatus('', '', false); }, 1800); }
      return false;
    }
  }

  function bindGestures(stage) {
    stage.addEventListener('pointerdown', event => {
      if (!active || active.turning || event.button > 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try { stage.setPointerCapture(event.pointerId); } catch (_) { /* Optional on older Safari versions. */ }
      if (pointers.size === 1) {
        gesture = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, time: performance.now(), moved: false, startScale: active.scale, startPanX: active.panX, startPanY: active.panY };
      } else if (pointers.size === 2) {
        clearTimeout(tapTimer); tapTimer = 0;
        const pair = [...pointers.values()]; gesture = { pinch: true, distance: Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y), startScale: active.scale, moved: true };
      }
    }, { passive: true });

    stage.addEventListener('pointermove', event => {
      if (!active || !pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2 && gesture?.pinch) {
        const pair = [...pointers.values()]; const distance = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
        active.scale = Math.max(1, Math.min(4, gesture.startScale * distance / Math.max(1, gesture.distance)));
        gesture.moved = true; applyZoom(); return;
      }
      if (pointers.size === 1 && gesture && !gesture.pinch) {
        const dx = event.clientX - gesture.x; const dy = event.clientY - gesture.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) gesture.moved = true;
        if (gesture.startScale > 1 || active.scale > 1) {
          active.panX = gesture.startPanX + dx; active.panY = gesture.startPanY + dy; applyZoom();
        }
        gesture.lastX = event.clientX; gesture.lastY = event.clientY;
      }
    }, { passive: true });

    const finish = event => {
      if (!pointers.has(event.pointerId)) return;
      const before = pointers.size; pointers.delete(event.pointerId);
      try { if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId); } catch (_) { /* Pointer capture may already be released. */ }
      if (!active) { gesture = null; return; }
      if (before > 1) { if (pointers.size === 1) { const p = [...pointers.values()][0]; gesture = { x: p.x, y: p.y, lastX: p.x, lastY: p.y, time: performance.now(), moved: true, startScale: active.scale, startPanX: active.panX, startPanY: active.panY }; } else gesture = null; return; }
      const g = gesture; gesture = null; if (!g || g.pinch) return;
      const dx = event.clientX - g.x; const dy = event.clientY - g.y; const elapsed = performance.now() - g.time;
      if (g.startScale === 1 && active.scale === 1 && Math.abs(dx) >= 46 && Math.abs(dx) > Math.abs(dy) * 1.15) { changePage(dx < 0 ? 1 : -1); return; }
      if (!g.moved && elapsed < 320) {
        if (tapTimer) {
          clearTimeout(tapTimer); tapTimer = 0;
          if (active.scale > 1) resetZoom(); else { active.scale = 2.25; active.panX = 0; active.panY = 0; applyZoom(); }
        } else {
          tapTimer = window.setTimeout(() => { tapTimer = 0; if (active) setControlsVisible(!active.controlsVisible); }, 260);
        }
      }
    };
    stage.addEventListener('pointerup', finish, { passive: true });
    stage.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); gesture = null; }, { passive: true });
    stage.addEventListener('lostpointercapture', event => { pointers.delete(event.pointerId); }, { passive: true });
  }

  function downloadActivePdf() {
    if (!active?.blob) return;
    const url = URL.createObjectURL(active.blob); const anchor = make('a');
    anchor.href = url; anchor.download = active.fileName; anchor.rel = 'noopener';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  async function sha256Hex(blob) {
    if (!window.crypto?.subtle) throw new Error('This browser cannot verify the magazine integrity hash.');
    const digest = await window.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function verifyPdfHash(blob, expected) {
    if (!expected) return;
    if (!/^[a-f0-9]{64}$/i.test(String(expected))) throw new Error('The magazine integrity hash is invalid.');
    if ((await sha256Hex(blob)).toLowerCase() !== String(expected).toLowerCase()) throw new Error('The downloaded PDF did not match its supplied integrity hash.');
  }
  async function validatePdfBlob(blob) {
    if (!(blob instanceof Blob) || !blob.size) throw new Error('The PDF file is empty.');
    if (blob.size > 35 * 1024 * 1024) throw new Error('The PDF exceeds the 35 MiB reader safety limit.');
    const signature = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 8).arrayBuffer()));
    if (!signature.includes('%PDF-')) throw new Error('The publication URL did not return a valid PDF file.');
  }

  async function resolvePdf(options) {
    const requestedId = String(options.id || options.issueId || options.url || 'publication').slice(0, 150);
    const viewId = String(options.viewId || 'shared').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60);
    const id = `${viewId}:${requestedId}`; const url = options.url ? new URL(options.url, document.baseURI).href : '';
    if (url && !/^https:\/\//i.test(url)) throw new Error('Only HTTPS PDF publications can be opened.');
    let networkError = null;
    if (url && navigator.onLine !== false) {
      try {
        const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), 30000); let response;
        try { response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal }); }
        finally { window.clearTimeout(timer); }
        if (!response.ok) throw new Error(`The publication server returned ${response.status}.`);
        const blob = await response.blob(); await validatePdfBlob(blob); await verifyPdfHash(blob, options.sha256);
        const record = { id, title: String(options.title || 'Publication'), viewId, fileName: String(options.fileName || `${requestedId}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '-'), pages: Number(options.pages) || 0, bytes: blob.size, sha256: String(options.sha256 || ''), savedAt: Date.now(), sourceUrl: url, pdf: blob };
        try { await putSaved(record); }
        catch (error) { console.warn('[LIVE // EARTH] PDF opened but could not be saved for offline use:', error); window.dispatchEvent(new CustomEvent('live-earth-pdf-save-warning', { detail: { id, error: String(error?.message || error) } })); }
        return record;
      } catch (error) { networkError = error; if (!options.allowSavedFallback) throw error; }
    }
    try {
      const saved = await getSaved(id);
      if (saved?.pdf) { const blob = saved.pdf instanceof Blob ? saved.pdf : new Blob([saved.pdf], { type: 'application/pdf' }); await validatePdfBlob(blob); await verifyPdfHash(blob, options.sha256 || saved.sha256); return { ...saved, pdf: blob }; }
    } catch (error) { if (navigator.onLine === false || !networkError) throw error; }
    if (navigator.onLine === false) throw new Error('This magazine has not been saved on this device yet. Open it once while online to make it available offline.');
    throw networkError || new Error('The PDF could not be loaded and no saved copy exists.');
  }

  async function fetchEngineAsset(asset, cache) {
    const key = new Request(new URL(asset.key, document.baseURI).href);
    if (cache) { const cached = await cache.match(key); if (cached) { const bytes = await cached.arrayBuffer(); if (bytes.byteLength >= asset.minBytes) return bytes; await cache.delete(key); } }
    if (navigator.onLine === false) throw new Error(`The reader engine has not been downloaded on this device yet (${asset.name}).`);
    let lastError = null;
    for (const url of asset.urls) {
      try {
        const controller = new AbortController(); const timer = window.setTimeout(() => controller.abort(), 25000); let response;
        try { response = await fetch(url, { method: 'GET', mode: 'cors', cache: 'force-cache', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal }); }
        finally { window.clearTimeout(timer); }
        if (!response.ok) throw new Error(`Engine download returned ${response.status}.`);
        const type = (response.headers.get('content-type') || '').toLowerCase();
        if (type && !/(javascript|ecmascript|text\/plain)/i.test(type)) throw new Error(`Reader engine source returned an unexpected content type (${asset.name}).`);
        const bytes = await response.arrayBuffer(); if (bytes.byteLength < asset.minBytes) throw new Error(`Reader engine file is incomplete (${asset.name}).`);
        if (cache) { try { await cache.put(key, new Response(bytes.slice(0), { status: 200, headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=31536000' } })); } catch (error) { console.warn('[LIVE // EARTH] Reader engine loaded but could not be retained for offline use:', error); } }
        return bytes;
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error(`Could not download the reader engine (${asset.name}).`);
  }

  async function loadPdfEngine() {
    if (pdfEngine) return pdfEngine; if (pdfEnginePromise) return pdfEnginePromise;
    pdfEnginePromise = (async () => {
      let cache = null;
      if ('caches' in window) { try { cache = await caches.open(ENGINE_CACHE); } catch (error) { console.warn('[LIVE // EARTH] Reader engine cache is unavailable; continuing online:', error); } }
      const [pdfBytes, workerBytes] = await Promise.all(ENGINE_ASSETS.map(asset => fetchEngineAsset(asset, cache)));
      const moduleUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'text/javascript' }));
      const workerUrl = URL.createObjectURL(new Blob([workerBytes], { type: 'text/javascript' }));
      try {
        const imported = await import(moduleUrl);
        if (typeof imported.getDocument !== 'function' || !imported.GlobalWorkerOptions) throw new Error('The downloaded PDF renderer did not expose the expected PDF.js API.');
        imported.GlobalWorkerOptions.workerSrc = workerUrl; pdfEngine = imported; pdfEngineUrls = [moduleUrl, workerUrl]; return pdfEngine;
      } catch (error) { URL.revokeObjectURL(moduleUrl); URL.revokeObjectURL(workerUrl); throw error; }
    })().catch(error => { pdfEnginePromise = null; throw error; });
    return pdfEnginePromise;
  }

  async function open(options = {}) {
    buildUi(); if (active || opening || !root.hidden) closeViewer();
    const generation = ++openGeneration; opening = true; lastFocus = document.activeElement;
    root.hidden = false; document.body.classList.add('le-universal-pdf-open'); setControlsVisible(false);
    root._pdfParts.counter.textContent = '— / —';
    setStatus('Preparing your magazine…', 'Fetching the publication and preparing the reader.', true);
    try {
      const [record, engine] = await Promise.all([resolvePdf(options), loadPdfEngine()]);
      if (generation !== openGeneration) return false;
      const blob = record.pdf instanceof Blob ? record.pdf : new Blob([record.pdf], { type: 'application/pdf' });
      const data = new Uint8Array(await blob.arrayBuffer());
      const loadingTask = engine.getDocument({ data, isEvalSupported: false, useSystemFonts: true, stopAtErrors: false });
      loadingTask.onProgress = progress => { if (!active && generation === openGeneration && progress?.total) setStatus('Opening your magazine…', `${Math.round((progress.loaded / progress.total) * 100)}% · Preparing the first page`, true); };
      setStatus('Opening your magazine…', 'Rendering the first page at reading size.', true);
      const pdf = await loadingTask.promise; if (generation !== openGeneration) { await pdf.destroy(); return false; }
      active = { id: record.id, title: record.title || options.title || 'Publication', fileName: record.fileName || `${record.id}.pdf`, page: 1, pdf, loadingTask, blob, viewId: record.viewId || options.viewId || 'shared', returnTo: options.returnTo || null, turning: false, renderTask: null, controlsVisible: false, scale: 1, panX: 0, panY: 0 };
      root._pdfParts.download.disabled = false;
      const canvas = await renderPage(pdf, 1, generation); if (generation !== openGeneration || !active) return false;
      root._pdfParts.pageWrap.replaceChildren(canvas); updateNavigation(); setStatus('', '', false);
      root._pdfParts.close.focus({ preventScroll: true });
      window.dispatchEvent(new CustomEvent('live-earth-pdf-viewer-open', { detail: { id: active.id, viewId: active.viewId, pages: pdf.numPages } }));
      return true;
    } catch (error) {
      if (generation !== openGeneration) return false;
      console.error('[LIVE // EARTH] Universal PDF Reader could not open the publication:', error);
      setStatus('We could not open this magazine.', error?.message || 'The magazine could not be opened.', true);
      setControlsVisible(true);
      root._pdfParts.close.focus({ preventScroll: true }); return false;
    } finally { if (generation === openGeneration) opening = false; }
  }

  function closeViewer() {
    openGeneration += 1; opening = false; if (!root) return;
    const previous = active; active = null; pointers.clear(); gesture = null; clearTimeout(tapTimer); tapTimer = 0;
    if (previous) { try { previous.renderTask?.cancel(); } catch (_) {} try { previous.loadingTask?.destroy(); } catch (_) {} try { previous.pdf?.destroy(); } catch (_) {} }
    root._pdfParts.pageWrap.replaceChildren(); root._pdfParts.download.disabled = true; root._pdfParts.previous.disabled = true; root._pdfParts.next.disabled = true;
    root._pdfParts.dock.hidden = true; root.hidden = true; document.body.classList.remove('le-universal-pdf-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent('live-earth-pdf-viewer-close', { detail: previous ? { id: previous.id, viewId: previous.viewId, returnTo: previous.returnTo } : {} }));
  }

  async function rerenderCurrentPage() {
    if (!active || active.turning || opening) return;
    const session = active; const generation = openGeneration;
    try { const canvas = await renderPage(session.pdf, session.page, generation); if (active !== session || generation !== openGeneration) return; root._pdfParts.pageWrap.replaceChildren(canvas); session.scale = 1; session.panX = 0; session.panY = 0; }
    catch (_) { /* Keep the last visible page if a transient resize render fails. */ }
  }
  function scheduleResize() { if (resizeFrame) cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; rerenderCurrentPage(); }); }
  window.addEventListener('resize', scheduleResize, { passive: true }); window.visualViewport?.addEventListener('resize', scheduleResize, { passive: true });
  async function savedPublications() { return (await listSaved()).map(item => ({ id: item.id, title: item.title, viewId: item.viewId, bytes: item.bytes, savedAt: item.savedAt, pages: item.pages })); }

  window.LiveEarthUniversalPDFViewer = Object.freeze({ open, close: closeViewer, isOpen: () => Boolean(root && !root.hidden), listSaved: savedPublications, version: '4.0.0' });
  window.__liveEarthUniversalPDFViewerInstalled = true;
  window.dispatchEvent(new Event('live-earth-universal-pdf-viewer-ready'));
})();
