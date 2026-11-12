/* LIVE // EARTH — Weather Live Art, online-first renderer.
 * Loads only the artwork selected by the current weather. Artwork data is kept
 * in memory for this view session only; it is never written to Cache Storage.
 * The small renderer stays in the app shell so the offline paper state is usable.
 */
(() => {
  'use strict';

  if (window.__liveEarthWeatherArtOnlineInstalled) return;
  window.__liveEarthWeatherArtOnlineInstalled = true;

  const RAW_ROOT = 'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/';
  const CATALOG_URL = RAW_ROOT + 'Weather/Art/art-library.json';
  const PAPER = '#f5eee3';
  const SELECTOR = '.le-weather-screen .le-weather-studio';
  const prefersReducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let activeScreen = null;
  let activeCanvas = null;
  let activeRenderer = null;
  let activePrompt = null;
  let activeButton = null;
  let activeStatus = null;
  let activeTitle = null;
  let activeCaption = null;
  let screenObserver = null;
  let uiObserver = null;
  let pinnedStatus = '';
  let pinnedTitle = '';
  let pinnedCaption = '';
  let requestController = null;
  let requestSerial = 0;
  let currentArt = null;
  let currentArtId = '';
  let attaching = false;

  function setText(node, value) {
    if (node) node.textContent = String(value || '');
  }

  function setButtonEnabled(enabled) {
    if (!activeButton) return;
    activeButton.disabled = !enabled;
    activeButton.setAttribute('aria-disabled', String(!enabled));
    activeButton.style.opacity = enabled ? '' : '.42';
  }

  function drawPaper(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, '#f8f2e9');
    wash.addColorStop(1, PAPER);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = .055;
    ctx.strokeStyle = '#8c7764';
    ctx.lineWidth = .42;
    for (let i = 0; i < 76; i++) {
      const x = (i * 73.17) % width;
      const y = (i * 41.93) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2.2 + (i % 4), y + (i % 3 === 0 ? .45 : -.35));
      ctx.stroke();
    }
    ctx.restore();
  }

  function showPaper(message, stateLabel = 'WAITING') {
    if (activeRenderer) activeRenderer.stop();
    activeRenderer = null;
    currentArt = null;
    currentArtId = '';
    pinnedStatus = stateLabel;
    pinnedTitle = message;
    pinnedCaption = message;
    drawPaper(activeCanvas);
    if (activePrompt) {
      activePrompt.hidden = false;
      activePrompt.textContent = message;
    }
    setText(activeStatus, stateLabel);
    setText(activeCaption, message);
    setButtonEnabled(false);
  }

  function decodeSignedVarint(bytes, cursor) {
    let value = 0;
    let shift = 0;
    let byte = 0;
    do {
      if (cursor.index >= bytes.length || shift > 28) throw new Error('Artwork path data is truncated.');
      byte = bytes[cursor.index++];
      value |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    return (value >>> 1) ^ -(value & 1);
  }

  function decodePath(encoded) {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const cursor = { index: 0 };
    let x = 0;
    let y = 0;
    const points = [];
    while (cursor.index < bytes.length) {
      x += decodeSignedVarint(bytes, cursor);
      y += decodeSignedVarint(bytes, cursor);
      if (x < 0 || x > 1000 || y < 0 || y > 700) throw new Error('Artwork coordinates are outside the 10:7 canvas.');
      points.push([x / 1000, y / 700]);
    }
    if (points.length < 3) throw new Error('Artwork contains an incomplete path.');
    return points;
  }

  function prepareArtwork(raw) {
    if (!raw || raw.schemaVersion !== 1 || raw.renderMode !== 'ordered-ink-wash-paths' ||
        !Array.isArray(raw.palette) || !Array.isArray(raw.paths) || raw.paths.length < 20) {
      throw new Error('The selected Live Art file is not a valid ordered-path painting.');
    }
    const palette = raw.palette.map(color => {
      if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Artwork palette is invalid.');
      return color;
    });
    const paths = raw.paths.map(record => {
      if (!Array.isArray(record) || record.length !== 2 || !Number.isInteger(record[0]) ||
          record[0] < 0 || record[0] >= palette.length || typeof record[1] !== 'string') {
        throw new Error('Artwork path record is invalid.');
      }
      return { color: palette[record[0]], points: decodePath(record[1]) };
    });
    return {
      id: String(raw.id || ''),
      title: String(raw.title || 'Weather study'),
      caption: String(raw.caption || 'An original ink-and-wash scene'),
      durationMs: Math.max(9000, Math.min(30000, Number(raw.durationMs) || 18000)),
      paths
    };
  }

  function createRenderer(canvas, art, onProgress) {
    const visibleCtx = canvas.getContext('2d', { alpha: false });
    if (!visibleCtx) throw new Error('Canvas drawing is not available on this device.');
    const baseCanvas = document.createElement('canvas');
    const baseCtx = baseCanvas.getContext('2d', { alpha: false });
    if (!baseCtx) throw new Error('The Live Art drawing surface could not be created.');

    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let startAt = 0;
    let progress = 0;
    let drawn = 0;
    let stopped = false;
    let completed = false;
    let resizeObserver = null;
    const paths = art.paths;

    function paper(ctx) {
      const wash = ctx.createLinearGradient(0, 0, width, height);
      wash.addColorStop(0, '#f8f2e9');
      wash.addColorStop(1, PAPER);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.globalAlpha = .045;
      ctx.strokeStyle = '#887662';
      ctx.lineWidth = .42;
      for (let i = 0; i < 76; i++) {
        const x = (i * 73.17) % width;
        const y = (i * 41.93) % height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 2.2 + (i % 4), y + (i % 3 === 0 ? .45 : -.35));
        ctx.stroke();
      }
      ctx.restore();
    }

    function setupCanvas() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;
      visibleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildBase();
      renderVisible();
    }

    function buildPath(ctx, item, partial = 1) {
      const points = item.points;
      const segments = points.length - 1;
      const visibleSegments = Math.max(0, Math.min(segments, Math.floor(segments * partial)));
      const fractionAtEnd = segments * partial - visibleSegments;
      ctx.beginPath();
      ctx.moveTo(points[0][0] * width, points[0][1] * height);
      if (partial >= 1) {
        // Smooth the pixel-derived contour vertices into quiet ink-wash edges.
        for (let i = 1; i < points.length - 1; i++) {
          const point = points[i];
          const next = points[i + 1];
          const midX = (point[0] + next[0]) * .5 * width;
          const midY = (point[1] + next[1]) * .5 * height;
          ctx.quadraticCurveTo(point[0] * width, point[1] * height, midX, midY);
        }
        const last = points[points.length - 1];
        ctx.lineTo(last[0] * width, last[1] * height);
      } else {
        for (let i = 1; i <= visibleSegments; i++) {
          ctx.lineTo(points[i][0] * width, points[i][1] * height);
        }
      }
      if (partial < 1 && fractionAtEnd > 0) {
        const from = points[visibleSegments];
        const to = points[Math.min(visibleSegments + 1, points.length - 1)];
        ctx.lineTo(
          (from[0] + (to[0] - from[0]) * fractionAtEnd) * width,
          (from[1] + (to[1] - from[1]) * fractionAtEnd) * height
        );
      }
    }

    function paintCompleted(ctx, item) {
      buildPath(ctx, item, 1);
      ctx.closePath();
      ctx.save();
      ctx.globalAlpha = .90;
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.globalAlpha = .30;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(.55, Math.min(1.5, Math.min(width, height) / 270));
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    function paintPartial(ctx, item, partial) {
      if (partial <= 0) return;
      buildPath(ctx, item, partial);
      ctx.save();
      ctx.globalAlpha = .86;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(.7, Math.min(1.8, Math.min(width, height) / 235));
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    function rebuildBase() {
      baseCtx.clearRect(0, 0, width, height);
      paper(baseCtx);
      drawn = 0;
      const count = Math.min(paths.length, Math.floor(progress * paths.length));
      while (drawn < count) paintCompleted(baseCtx, paths[drawn++]);
    }

    function renderVisible() {
      visibleCtx.clearRect(0, 0, width, height);
      visibleCtx.drawImage(baseCanvas, 0, 0, width, height);
      const units = Math.max(0, Math.min(1, progress)) * paths.length;
      const whole = Math.floor(units);
      const partial = units - whole;
      if (whole < paths.length && partial > 0) paintPartial(visibleCtx, paths[whole], partial);
      if (typeof onProgress === 'function') {
        onProgress({ count: Math.min(paths.length, whole + (partial > 0 ? 1 : 0)), total: paths.length, complete: progress >= 1 });
      }
    }

    function advanceBase() {
      const target = Math.min(paths.length, Math.floor(progress * paths.length));
      while (drawn < target) paintCompleted(baseCtx, paths[drawn++]);
      renderVisible();
    }

    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function tick(now) {
      raf = 0;
      if (stopped || !canvas.isConnected || document.hidden) return;
      progress = Math.min(1, (now - startAt) / art.durationMs);
      advanceBase();
      if (progress < 1) raf = requestAnimationFrame(tick);
      else completed = true;
    }

    function replay() {
      if (stopped) return;
      stopLoop();
      if (prefersReducedMotion()) {
        progress = 1;
        completed = true;
        rebuildBase();
        renderVisible();
        return;
      }
      progress = 0;
      completed = false;
      rebuildBase();
      renderVisible();
      startAt = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function visibilityChanged() {
      if (document.hidden) stopLoop();
      else if (!completed && !stopped) {
        startAt = performance.now() - progress * art.durationMs;
        raf = requestAnimationFrame(tick);
      }
    }

    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('resize', setupCanvas, { passive: true });
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(setupCanvas);
      resizeObserver.observe(canvas);
    }
    setupCanvas();
    return {
      replay,
      stop() {
        stopped = true;
        stopLoop();
        resizeObserver?.disconnect();
        window.removeEventListener('resize', setupCanvas);
        document.removeEventListener('visibilitychange', visibilityChanged);
      }
    };
  }

  function makeCanvas(studio, oldCanvas) {
    const canvas = document.createElement('canvas');
    canvas.className = oldCanvas.className + ' le-weather-online-canvas';
    canvas.setAttribute('aria-label', 'A Japanese ink-and-wash rainy tea scene, painted stroke by stroke');
    canvas.dataset.liveArtOnline = 'true';
    oldCanvas.replaceWith(canvas);
    return canvas;
  }

  function styleAndPrompt(studio, canvas) {
    if (!document.getElementById('le-weather-online-art-style')) {
      const style = document.createElement('style');
      style.id = 'le-weather-online-art-style';
      style.textContent = `
        .le-weather-studio-canvas.le-weather-online-canvas{z-index:0;display:block;pointer-events:none;background:${PAPER}}
        .le-weather-online-prompt{position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);max-width:76%;padding:7px 12px;border-radius:999px;background:rgba(248,242,233,.78);color:#65594d;font:600 9px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.095em;text-align:center;white-space:normal;box-shadow:0 1px 8px rgba(54,43,34,.07);pointer-events:none}
        .le-weather-online-prompt[hidden]{display:none}
        .le-weather-art-replay:disabled{cursor:default;filter:grayscale(.25)}
      `;
      document.head.appendChild(style);
    }
    let prompt = studio.querySelector('.le-weather-online-prompt');
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.className = 'le-weather-online-prompt';
      prompt.setAttribute('role', 'status');
      prompt.setAttribute('aria-live', 'polite');
      studio.appendChild(prompt);
    }
    prompt.hidden = true;
    return prompt;
  }

  async function fetchJson(url, signal) {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal });
    if (!response.ok) throw new Error('Artwork source returned HTTP ' + response.status + '.');
    return response.json();
  }

  async function loadForWeather(screen) {
    if (screen !== activeScreen || !screen.isConnected) return;
    if (navigator.onLine === false) {
      requestSerial++;
      requestController?.abort();
      requestController = null;
      showPaper('Connect to paint', 'OFFLINE');
      return;
    }
    const weather = String(screen.dataset.weather || 'clear').toLowerCase();
    const entryWeather = ['rain', 'cloudy'].includes(weather) ? weather : '';
    if (!entryWeather) {
      requestSerial++;
      requestController?.abort();
      requestController = null;
      showPaper('A new scene is being prepared', 'COMING SOON');
      return;
    }
    if (currentArt && currentArtId === 'rainy-tea-afternoon-001') return;

    requestController?.abort();
    const controller = new AbortController();
    requestController = controller;
    const serial = ++requestSerial;
    showPaper('Preparing the painting…', 'LOADING');

    try {
      const catalog = await fetchJson(CATALOG_URL, controller.signal);
      if (serial !== requestSerial || screen !== activeScreen || !screen.isConnected) return;
      if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.artworks)) throw new Error('Artwork catalogue is invalid.');
      const record = catalog.artworks.find(item => Array.isArray(item.weather) && item.weather.includes(entryWeather));
      if (!record || typeof record.dataPath !== 'string' || !record.dataPath.startsWith('Weather/Art/')) {
        showPaper('A new scene is being prepared', 'COMING SOON');
        return;
      }
      const dataUrl = new URL(record.dataPath, RAW_ROOT).href;
      const raw = await fetchJson(dataUrl, controller.signal);
      if (serial !== requestSerial || screen !== activeScreen || !screen.isConnected) return;
      const prepared = prepareArtwork(raw);
      if (prepared.id !== record.id) throw new Error('Artwork ID does not match the catalogue.');
      if (activeRenderer) activeRenderer.stop();
      activeRenderer = createRenderer(activeCanvas, prepared, meta => {
        pinnedStatus = meta.complete ? 'FINISHED' : `PAINTING · ${String(meta.count).padStart(3, '0')} / ${meta.total}`;
        setText(activeStatus, pinnedStatus);
      });
      currentArt = prepared;
      currentArtId = prepared.id;
      activePrompt.hidden = true;
      pinnedTitle = prepared.title;
      pinnedCaption = prepared.caption + ' · Live weather matched';
      setText(activeTitle, pinnedTitle);
      setText(activeCaption, pinnedCaption);
      setText(activeStatus, pinnedStatus || 'READY');
      setButtonEnabled(true);
      activeRenderer.replay();
    } catch (error) {
      if (error?.name === 'AbortError' || serial !== requestSerial) return;
      console.warn('[LIVE // EARTH] Weather Live Art could not be loaded:', error?.message || error);
      showPaper('Connect to paint', 'ART UNAVAILABLE');
    } finally {
      if (requestController === controller) requestController = null;
    }
  }

  function attachScreen(screen) {
    if (!screen || screen === activeScreen || attaching) return;
    const studio = screen.querySelector('.le-weather-studio');
    const oldCanvas = studio?.querySelector('.le-weather-studio-canvas');
    if (!studio || !oldCanvas) return;
    attaching = true;
    if (activeRenderer) activeRenderer.stop();
    requestController?.abort();
    requestController = null;
    requestSerial++;
    activeScreen = screen;
    activeCanvas = makeCanvas(studio, oldCanvas);
    activePrompt = styleAndPrompt(studio, activeCanvas);
    activeButton = studio.querySelector('#le-weather-art-replay');
    activeStatus = studio.querySelector('#le-weather-studio-state');
    activeTitle = studio.querySelector('#le-weather-studio-title');
    activeCaption = studio.querySelector('#le-weather-studio-caption');
    currentArt = null;
    currentArtId = '';
    pinnedTitle = '';
    pinnedCaption = '';
    pinnedStatus = '';
    activeButton?.addEventListener('click', () => { if (activeRenderer) activeRenderer.replay(); });
    if (screenObserver) screenObserver.disconnect();
    if (uiObserver) uiObserver.disconnect();
    uiObserver = new MutationObserver(() => {
      if (activeTitle && pinnedTitle && activeTitle.textContent !== pinnedTitle) setText(activeTitle, pinnedTitle);
      if (activeCaption && pinnedCaption && activeCaption.textContent !== pinnedCaption) setText(activeCaption, pinnedCaption);
      if (activeStatus && pinnedStatus && activeStatus.textContent !== pinnedStatus) setText(activeStatus, pinnedStatus);
    });
    [activeTitle, activeCaption, activeStatus].filter(Boolean).forEach(node => uiObserver.observe(node, { childList: true, characterData: true, subtree: true }));
    showPaper('Preparing the painting…', 'LOADING');
    setButtonEnabled(false);
    screenObserver = new MutationObserver(() => loadForWeather(screen));
    screenObserver.observe(screen, { attributes: true, attributeFilter: ['data-weather'] });
    attaching = false;
    loadForWeather(screen);
  }

  function scan() {
    const screen = document.querySelector('.le-weather-screen');
    if (screen && screen !== activeScreen) attachScreen(screen);
    if (activeScreen && !activeScreen.isConnected) {
      screenObserver?.disconnect();
      uiObserver?.disconnect();
      activeRenderer?.stop();
      requestController?.abort();
      activeScreen = activeCanvas = activeRenderer = activePrompt = null;
      activeButton = activeStatus = activeTitle = activeCaption = null;
      currentArt = null;
      currentArtId = '';
    }
  }

  const pageObserver = new MutationObserver(scan);
  pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('online', () => { if (activeScreen) loadForWeather(activeScreen); });
  window.addEventListener('offline', () => { if (activeScreen) loadForWeather(activeScreen); });
  window.addEventListener('pagehide', () => {
    pageObserver.disconnect();
    screenObserver?.disconnect();
    uiObserver?.disconnect();
    activeRenderer?.stop();
    requestController?.abort();
  }, { once: true });
  scan();
})();
