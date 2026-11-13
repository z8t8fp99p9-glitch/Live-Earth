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
  let currentWeather = '';
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
    currentWeather = '';
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
    if (!raw || !Array.isArray(raw.palette)) throw new Error('Artwork data is invalid.');
    const palette = raw.palette.map(color => {
      if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Artwork palette is invalid.');
      return color;
    });

    const masterReveal = raw.schemaVersion === 3 && raw.renderMode === 'ordered-master-brush-reveal';
    const pressureStrokes = raw.schemaVersion === 2 && raw.renderMode === 'ordered-pressure-strokes';
    if (masterReveal || pressureStrokes) {
      const maxStrokes = masterReveal ? 100 : 500;
      if (!Array.isArray(raw.strokes) || raw.strokes.length < 1 || raw.strokes.length > maxStrokes) {
        throw new Error(masterReveal ? 'Master-reveal artwork must contain no more than 100 brush strokes.' : 'Pressure-stroke artwork has an invalid stroke list.');
      }
      if (masterReveal && (Number(raw.durationMs) !== 30000 ||
          typeof raw.masterImagePath !== 'string' || !raw.masterImagePath.startsWith('Weather/Art/References/') || !raw.masterImagePath.endsWith('.jpg') ||
          typeof raw.stageMaskAtlasPath !== 'string' || !raw.stageMaskAtlasPath.startsWith('Weather/Art/References/') || !raw.stageMaskAtlasPath.endsWith('.png'))) {
        throw new Error('Master-reveal artwork must use its preserved JPEG master, stage-mask atlas and a 30-second Replay.');
      }
      const stages = new Set();
      const strokes = raw.strokes.map((stroke, index) => {
        if (!stroke || typeof stroke.id !== 'string' || !stroke.id ||
            !Number.isInteger(stroke.colorIndex) || stroke.colorIndex < 0 || stroke.colorIndex >= palette.length ||
            !Array.isArray(stroke.points) || stroke.points.length < 2 || stroke.points.length > 2048) {
          throw new Error('Pressure-stroke record ' + (index + 1) + ' is invalid.');
        }
        if (stroke.order !== index + 1) throw new Error('Pressure-stroke order must match the authored array order.');
        const points = stroke.points.map((point, pointIndex) => {
          if (!Array.isArray(point) || point.length !== 3 ||
              !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || !Number.isFinite(point[2]) ||
              point[0] < 0 || point[0] > 1 || point[1] < 0 || point[1] > 1 || point[2] < 0 || point[2] > 1) {
            throw new Error('Pressure-stroke point ' + pointIndex + ' in ' + stroke.id + ' is outside its normalized range.');
          }
          return { x: point[0], y: point[1], pressure: point[2] };
        });
        const width = Number(stroke.baseWidth);
        const durationWeight = Number(stroke.durationWeight);
        const opacity = Number(stroke.opacity ?? 0.92);
        if (!Number.isFinite(width) || width < 0.5 || width > 100 ||
            !Number.isFinite(durationWeight) || durationWeight <= 0 || durationWeight > 20 ||
            !Number.isFinite(opacity) || opacity < 0.05 || opacity > 1) {
          throw new Error('Pressure-stroke brush settings are invalid for ' + stroke.id + '.');
        }
        const stageId = String(stroke.stageId || '');
        if (!stageId) throw new Error('Pressure-stroke stage is missing for ' + stroke.id + '.');
        stages.add(stageId);
        const samples = samplePressureCurve(points);
        const length = measurePressureCurve(samples);
        if (length < 0.0005) throw new Error('Pressure-stroke geometry is too short for ' + stroke.id + '.');
        return {
          id: stroke.id,
          order: index + 1,
          stageId,
          stage: String(stroke.stage || stageId),
          color: palette[stroke.colorIndex],
          width,
          opacity,
          durationWeight,
          samples,
          length
        };
      });
      if (masterReveal) {
        const expectedStages = ['01','02','03','04','05'];
        if (strokes.length !== raw.strokeCount || strokes.some(stroke => !expectedStages.includes(stroke.stageId))) {
          throw new Error('Master-reveal stroke count or stage order is invalid.');
        }
        if (strokes[0].stageId !== '01' || strokes.at(-1).stageId !== '05' ||
            strokes.some((stroke, index) => index > 0 && Number(stroke.stageId) < Number(strokes[index - 1].stageId))) {
          throw new Error('Master-reveal stages must follow thick, thin, air, leaves, then sun and finish.');
        }
      }
      return {
        rendererVersion: masterReveal ? 3 : 2,
        id: String(raw.id || ''),
        title: String(raw.title || 'Weather study'),
        caption: String(raw.caption || 'An original ink scene'),
        durationMs: masterReveal ? 30000 : Math.max(30000, Math.min(180000, Number(raw.durationMs) || 75000)),
        stagePauseMs: Math.max(0, Math.min(masterReveal ? 400 : 1800, Number(raw.stagePauseMs) || 0)),
        stages: Array.isArray(raw.stages) ? raw.stages : [],
        masterImagePath: masterReveal ? raw.masterImagePath : '',
        stageMaskAtlasPath: masterReveal ? raw.stageMaskAtlasPath : '',
        strokes
      };
    }

    if (raw.schemaVersion !== 1 || raw.renderMode !== 'ordered-ink-wash-paths' ||
        !Array.isArray(raw.paths) || raw.paths.length < 20) {
      throw new Error('The selected Live Art file is not a valid versioned painting.');
    }
    const paths = raw.paths.map(record => {
      if (!Array.isArray(record) || record.length !== 2 || !Number.isInteger(record[0]) ||
          record[0] < 0 || record[0] >= palette.length || typeof record[1] !== 'string') {
        throw new Error('Artwork path record is invalid.');
      }
      return { color: palette[record[0]], points: decodePath(record[1]) };
    });
    return {
      rendererVersion: 1,
      id: String(raw.id || ''),
      title: String(raw.title || 'Weather study'),
      caption: String(raw.caption || 'An original ink-and-wash scene'),
      durationMs: Math.max(9000, Math.min(30000, Number(raw.durationMs) || 18000)),
      paths
    };
  }

  function samplePressureCurve(points) {
    const samples = [points[0]];
    const steps = 6;
    const catmull = (p0, p1, p2, p3, t) => {
      const t2 = t * t;
      const t3 = t2 * t;
      return 0.5 * ((2 * p1) + (-p0 + p2) * t +
        (2*p0 - 5*p1 + 4*p2 - p3) * t2 + (-p0 + 3*p1 - 3*p2 + p3) * t3);
    };
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        samples.push({
          x: Math.max(0, Math.min(1, catmull(p0.x, p1.x, p2.x, p3.x, t))),
          y: Math.max(0, Math.min(1, catmull(p0.y, p1.y, p2.y, p3.y, t))),
          pressure: Math.max(0.02, Math.min(1, catmull(p0.pressure, p1.pressure, p2.pressure, p3.pressure, t)))
        });
      }
    }
    return samples;
  }

  function measurePressureCurve(samples) {
    let length = 0;
    for (let i = 1; i < samples.length; i++) {
      const dx = (samples[i].x - samples[i - 1].x) * 1000;
      const dy = (samples[i].y - samples[i - 1].y) * 700;
      length += Math.hypot(dx, dy);
    }
    return length;
  }

  function createLegacyRenderer(canvas, art, onProgress) {
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

  function createPressureStrokeRenderer(canvas, art, onProgress) {
    const visibleCtx = canvas.getContext('2d', { alpha: false });
    if (!visibleCtx) throw new Error('Canvas drawing is not available on this device.');
    const baseCanvas = document.createElement('canvas');
    const baseCtx = baseCanvas.getContext('2d', { alpha: false });
    if (!baseCtx) throw new Error('The Live Art drawing surface could not be created.');

    let width = 1, height = 1, dpr = 1, raf = 0, startAt = 0, elapsedMs = 0;
    let drawn = 0, stopped = false, completed = false, resizeObserver = null;
    const strokes = art.strokes;
    const maxLength = Math.max(...strokes.map(stroke => stroke.length));
    const weighted = strokes.map(stroke => stroke.durationWeight * (0.68 + 0.32 * Math.sqrt(stroke.length / maxLength)));
    const weightTotal = weighted.reduce((sum, value) => sum + value, 0);
    const transitionCount = strokes.reduce((sum, stroke, index) =>
      sum + (index < strokes.length - 1 && stroke.stageId !== strokes[index + 1].stageId ? 1 : 0), 0);
    const pauseTotal = Math.min(art.durationMs * 0.14, transitionCount * art.stagePauseMs);
    const drawingBudget = art.durationMs - pauseTotal;
    let cursor = 0;
    const timeline = strokes.map((stroke, index) => {
      const duration = drawingBudget * weighted[index] / weightTotal;
      const event = { start: cursor, end: cursor + duration, duration };
      cursor += duration;
      if (index < strokes.length - 1 && stroke.stageId !== strokes[index + 1].stageId) {
        event.pauseEnd = cursor + Math.min(art.stagePauseMs, art.durationMs * 0.02);
        cursor = event.pauseEnd;
      }
      return event;
    });

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

    function prefixByLength(samples, fraction) {
      if (fraction >= 1) return samples;
      if (fraction <= 0) return [];
      let total = 0;
      const lengths = [0];
      for (let i = 1; i < samples.length; i++) {
        const dx = (samples[i].x - samples[i - 1].x) * width;
        const dy = (samples[i].y - samples[i - 1].y) * height;
        total += Math.hypot(dx, dy);
        lengths.push(total);
      }
      const target = total * fraction;
      const result = [samples[0]];
      for (let i = 1; i < samples.length; i++) {
        if (lengths[i] < target) {
          result.push(samples[i]);
          continue;
        }
        const segmentLength = lengths[i] - lengths[i - 1];
        const t = segmentLength > 0 ? (target - lengths[i - 1]) / segmentLength : 0;
        const a = samples[i - 1], b = samples[i];
        result.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          pressure: a.pressure + (b.pressure - a.pressure) * t
        });
        break;
      }
      return result;
    }

    function paintBrush(ctx, stroke, fraction = 1) {
      const samples = prefixByLength(stroke.samples, fraction);
      if (samples.length < 2) return;
      const scale = Math.min(width / 1000, height / 700);
      const left = [], right = [];
      for (let i = 0; i < samples.length; i++) {
        const prev = samples[Math.max(0, i - 1)];
        const next = samples[Math.min(samples.length - 1, i + 1)];
        const dx = (next.x - prev.x) * width;
        const dy = (next.y - prev.y) * height;
        const mag = Math.max(0.0001, Math.hypot(dx, dy));
        const nx = -dy / mag, ny = dx / mag;
        const taper = Math.max(0.018, samples[i].pressure);
        const half = Math.max(0.18, stroke.width * scale * taper * 0.5);
        const cx = samples[i].x * width, cy = samples[i].y * height;
        left.push([cx + nx * half, cy + ny * half]);
        right.push([cx - nx * half, cy - ny * half]);
      }
      ctx.save();
      ctx.globalAlpha = stroke.opacity;
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.moveTo(left[0][0], left[0][1]);
      for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0], left[i][1]);
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
      ctx.closePath();
      ctx.fill();
      // A restrained inner ink line keeps the gesture visually connected without a hard vector outline.
      ctx.globalAlpha = stroke.opacity * 0.12;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(0.25, scale * 0.8);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(samples[0].x * width, samples[0].y * height);
      for (let i = 1; i < samples.length; i++) ctx.lineTo(samples[i].x * width, samples[i].y * height);
      ctx.stroke();
      ctx.restore();
    }

    function stateAt(time) {
      const t = Math.max(0, Math.min(art.durationMs, time));
      if (t >= art.durationMs - 0.5) {
        return { completedCount: strokes.length, activeIndex: -1, partial: 0, complete: true };
      }
      let completedCount = 0;
      for (let i = 0; i < timeline.length; i++) {
        if (t >= timeline[i].end) {
          completedCount++;
          continue;
        }
        const pauseEnd = timeline[i].pauseEnd;
        if (pauseEnd && t >= timeline[i].end) return { completedCount, activeIndex: -1, partial: 0, complete: false };
        const partial = Math.max(0, Math.min(1, (t - timeline[i].start) / timeline[i].duration));
        return { completedCount, activeIndex: partial > 0 ? i : -1, partial, complete: false };
      }
      return { completedCount: strokes.length, activeIndex: -1, partial: 0, complete: true };
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
      rebuildAt(elapsedMs);
    }

    function rebuildAt(time) {
      baseCtx.clearRect(0, 0, width, height);
      paper(baseCtx);
      const state = stateAt(time);
      drawn = 0;
      while (drawn < state.completedCount) paintBrush(baseCtx, strokes[drawn++], 1);
      renderVisible(state);
    }

    function renderVisible(state = stateAt(elapsedMs)) {
      visibleCtx.clearRect(0, 0, width, height);
      visibleCtx.drawImage(baseCanvas, 0, 0, width, height);
      if (state.activeIndex >= 0 && state.partial > 0) paintBrush(visibleCtx, strokes[state.activeIndex], state.partial);
      if (typeof onProgress === 'function') {
        const count = Math.min(strokes.length, state.completedCount + (state.activeIndex >= 0 ? 1 : 0));
        onProgress({ count, total: strokes.length, complete: state.complete, strokeId: state.activeIndex >= 0 ? strokes[state.activeIndex].id : '' });
      }
    }

    function advance(time) {
      const state = stateAt(time);
      while (drawn < state.completedCount) paintBrush(baseCtx, strokes[drawn++], 1);
      renderVisible(state);
      if (state.complete) completed = true;
    }

    function stopLoop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function tick(now) {
      raf = 0;
      if (stopped || !canvas.isConnected || document.hidden) return;
      elapsedMs = Math.max(0, Math.min(art.durationMs, now - startAt));
      advance(elapsedMs);
      if (elapsedMs < art.durationMs) raf = requestAnimationFrame(tick);
      else completed = true;
    }

    function replay() {
      if (stopped) return;
      stopLoop();
      if (prefersReducedMotion()) {
        elapsedMs = art.durationMs;
        completed = true;
        rebuildAt(elapsedMs);
        return;
      }
      elapsedMs = 0;
      completed = false;
      rebuildAt(elapsedMs);
      startAt = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function visibilityChanged() {
      if (document.hidden) stopLoop();
      else if (!completed && !stopped) {
        startAt = performance.now() - elapsedMs;
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

  function createMasterRevealRenderer(canvas, art, masterImage, stageMaskAtlas, onProgress) {
    const visibleCtx = canvas.getContext('2d', { alpha: false });
    if (!visibleCtx || !masterImage || !stageMaskAtlas) throw new Error('The approved painted master and stage masks could not be prepared.');
    const baseMask = document.createElement('canvas');
    const baseMaskCtx = baseMask.getContext('2d');
    const workingMask = document.createElement('canvas');
    const workingMaskCtx = workingMask.getContext('2d');
    const strokeMask = document.createElement('canvas');
    const strokeMaskCtx = strokeMask.getContext('2d');
    const coverCanvas = document.createElement('canvas');
    const coverCtx = coverCanvas.getContext('2d');
    if (!baseMaskCtx || !workingMaskCtx || !strokeMaskCtx || !coverCtx) throw new Error('The master-reveal drawing surfaces could not be created.');

    let width=1, height=1, dpr=1, raf=0, startAt=0, elapsedMs=0;
    let drawn=0, stopped=false, completed=false, resizeObserver=null;
    const strokes=art.strokes;
    const stageMasks=Array.from({length:5},()=>document.createElement('canvas'));
    const stageMaskContexts=stageMasks.map(item=>item.getContext('2d'));
    // Schema 3 is a timed master-reveal score: each authored gesture receives
    // the same share of the 30-second drawing budget. This keeps the counter
    // and the visual sequence in sync; only the four stage boundaries pause.
    const transitions=strokes.reduce((n,stroke,index)=>
      n+(index<strokes.length-1&&stroke.stageId!==strokes[index+1].stageId?1:0),0);
    const pauseTotal=Math.min(art.durationMs*0.08,transitions*art.stagePauseMs);
    const drawingBudget=art.durationMs-pauseTotal;
    const strokeDuration=drawingBudget/strokes.length;
    let cursor=0;
    const timeline=strokes.map((stroke,index)=>{
      const duration=strokeDuration;
      const event={start:cursor,end:cursor+duration,duration};cursor+=duration;
      if(index<strokes.length-1&&stroke.stageId!==strokes[index+1].stageId){event.pauseEnd=cursor+Math.min(art.stagePauseMs,art.durationMs*0.01);cursor=event.pauseEnd;}
      return event;
    });

    function paper(ctx){
      const wash=ctx.createLinearGradient(0,0,width,height);
      wash.addColorStop(0,'#f8f2e9');wash.addColorStop(1,PAPER);
      ctx.fillStyle=wash;ctx.fillRect(0,0,width,height);
      ctx.save();ctx.globalAlpha=.045;ctx.strokeStyle='#887662';ctx.lineWidth=.42;
      for(let i=0;i<76;i++){
        const x=(i*73.17)%width,y=(i*41.93)%height;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2.2+(i%4),y+(i%3===0?.45:-.35));ctx.stroke();
      }
      ctx.restore();
    }
    function prefix(samples,fraction){
      if(fraction>=1)return samples;if(fraction<=0)return[];
      let total=0;const lengths=[0];
      for(let i=1;i<samples.length;i++){const dx=(samples[i].x-samples[i-1].x)*width,dy=(samples[i].y-samples[i-1].y)*height;total+=Math.hypot(dx,dy);lengths.push(total);}
      const target=total*fraction,out=[samples[0]];
      for(let i=1;i<samples.length;i++){
        if(lengths[i]<target){out.push(samples[i]);continue;}
        const segment=lengths[i]-lengths[i-1],t=segment>0?(target-lengths[i-1])/segment:0,a=samples[i-1],b=samples[i];
        out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,pressure:a.pressure+(b.pressure-a.pressure)*t});break;
      }
      return out;
    }
    function revealBrush(ctx,stroke,fraction=1){
      const samples=prefix(stroke.samples,fraction);if(samples.length<2)return;
      const scale=Math.min(width/1000,height/700),left=[],right=[];
      for(let i=0;i<samples.length;i++){
        const prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)];
        const dx=(next.x-prev.x)*width,dy=(next.y-prev.y)*height,mag=Math.max(.0001,Math.hypot(dx,dy));
        const nx=-dy/mag,ny=dx/mag,half=Math.max(.18,stroke.width*scale*Math.max(.018,samples[i].pressure)*.5);
        const x=samples[i].x*width,y=samples[i].y*height;
        left.push([x+nx*half,y+ny*half]);right.push([x-nx*half,y-ny*half]);
      }
      ctx.save();ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(left[0][0],left[0][1]);
      for(let i=1;i<left.length;i++)ctx.lineTo(left[i][0],left[i][1]);
      for(let i=right.length-1;i>=0;i--)ctx.lineTo(right[i][0],right[i][1]);
      ctx.closePath();ctx.fill();ctx.restore();
    }
    function addStageBrush(destinationCtx,stroke,fraction=1){
      const stageIndex=Number(stroke.stageId)-1;
      if(stageIndex<0||stageIndex>=stageMasks.length)throw new Error('A master-reveal gesture references an unknown stage.');
      strokeMaskCtx.clearRect(0,0,width,height);
      revealBrush(strokeMaskCtx,stroke,fraction);
      strokeMaskCtx.save();
      strokeMaskCtx.globalCompositeOperation='destination-in';
      strokeMaskCtx.drawImage(stageMasks[stageIndex],0,0,width,height);
      strokeMaskCtx.restore();
      destinationCtx.drawImage(strokeMask,0,0,width,height);
    }
    function stateAt(time){
      const t=Math.max(0,Math.min(art.durationMs,time));
      if(t>=art.durationMs-.5)return{completedCount:strokes.length,activeIndex:-1,partial:0,complete:true};
      let done=0;
      for(let i=0;i<timeline.length;i++){
        if(t>=timeline[i].end){done++;continue;}
        const part=Math.max(0,Math.min(1,(t-timeline[i].start)/timeline[i].duration));
        return{completedCount:done,activeIndex:part>0?i:-1,partial:part,complete:false};
      }
      return{completedCount:strokes.length,activeIndex:-1,partial:0,complete:true};
    }
    function setup(){
      const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(window.devicePixelRatio||1,2);
      const pixelWidth=Math.max(1,Math.round(width*dpr)),pixelHeight=Math.max(1,Math.round(height*dpr));
      for(const target of [canvas,baseMask,workingMask,strokeMask,coverCanvas,...stageMasks]){target.width=pixelWidth;target.height=pixelHeight;}
      visibleCtx.setTransform(dpr,0,0,dpr,0,0);baseMaskCtx.setTransform(dpr,0,0,dpr,0,0);
      workingMaskCtx.setTransform(dpr,0,0,dpr,0,0);strokeMaskCtx.setTransform(dpr,0,0,dpr,0,0);coverCtx.setTransform(dpr,0,0,dpr,0,0);
      const sourceWidth=stageMaskAtlas.width||stageMaskAtlas.naturalWidth;
      const sourceHeight=(stageMaskAtlas.height||stageMaskAtlas.naturalHeight)/5;
      for(let i=0;i<5;i++){
        const maskCtx=stageMaskContexts[i];maskCtx.setTransform(dpr,0,0,dpr,0,0);maskCtx.clearRect(0,0,width,height);
        maskCtx.drawImage(stageMaskAtlas,0,i*sourceHeight,sourceWidth,sourceHeight,0,0,width,height);
      }
      rebuild(elapsedMs);
    }
    function rebuild(time){
      baseMaskCtx.clearRect(0,0,width,height);drawn=0;const state=stateAt(time);
      while(drawn<state.completedCount)addStageBrush(baseMaskCtx,strokes[drawn++],1);
      render(state);
    }
    function render(state=stateAt(elapsedMs)){
      workingMaskCtx.clearRect(0,0,width,height);workingMaskCtx.drawImage(baseMask,0,0,width,height);
      if(state.activeIndex>=0&&state.partial>0)addStageBrush(workingMaskCtx,strokes[state.activeIndex],state.partial);
      coverCtx.clearRect(0,0,width,height);paper(coverCtx);
      coverCtx.globalCompositeOperation='destination-out';coverCtx.drawImage(workingMask,0,0,width,height);coverCtx.globalCompositeOperation='source-over';
      visibleCtx.clearRect(0,0,width,height);visibleCtx.drawImage(masterImage,0,0,width,height);
      // At FINISHED, show the immutable master directly so even its original
      // paper grain and finest edge texture are restored exactly.
      if(!state.complete)visibleCtx.drawImage(coverCanvas,0,0,width,height);
      if(typeof onProgress==='function')onProgress({count:Math.min(strokes.length,state.completedCount+(state.activeIndex>=0?1:0)),total:strokes.length,complete:state.complete,strokeId:state.activeIndex>=0?strokes[state.activeIndex].id:''});
    }
    function advance(time){const state=stateAt(time);while(drawn<state.completedCount)addStageBrush(baseMaskCtx,strokes[drawn++],1);render(state);if(state.complete)completed=true;}
    function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;}
    function tick(now){raf=0;if(stopped||!canvas.isConnected||document.hidden)return;elapsedMs=Math.max(0,Math.min(art.durationMs,now-startAt));advance(elapsedMs);if(elapsedMs<art.durationMs)raf=requestAnimationFrame(tick);else completed=true;}
    function replay(){if(stopped)return;stopLoop();if(prefersReducedMotion()){elapsedMs=art.durationMs;completed=true;rebuild(elapsedMs);return;}elapsedMs=0;completed=false;rebuild(0);startAt=performance.now();raf=requestAnimationFrame(tick);}
    function visibility(){if(document.hidden)stopLoop();else if(!completed&&!stopped){startAt=performance.now()-elapsedMs;raf=requestAnimationFrame(tick);}}
    document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',setup,{passive:true});
    if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(setup);resizeObserver.observe(canvas);}setup();
    return{replay,stop(){stopped=true;stopLoop();resizeObserver?.disconnect();window.removeEventListener('resize',setup);document.removeEventListener('visibilitychange',visibility);}};
  }

  function createRenderer(canvas, art, onProgress, masterImage, stageMaskAtlas) {
    if (art.rendererVersion === 3) return createMasterRevealRenderer(canvas, art, masterImage, stageMaskAtlas, onProgress);
    return art.rendererVersion === 2
      ? createPressureStrokeRenderer(canvas, art, onProgress)
      : createLegacyRenderer(canvas, art, onProgress);
  }

  if (window.__LIVE_EARTH_WEATHER_ART_TEST__ === true) {
    window.__LIVE_EARTH_WEATHER_ART_TEST_API__ = { prepareArtwork, createRenderer };
  }

  function makeCanvas(studio, oldCanvas) {
    const canvas = document.createElement('canvas');
    canvas.className = oldCanvas.className + ' le-weather-online-canvas';
    canvas.setAttribute('aria-label', 'The approved Japanese brush painting, revealed progressively through animated brush strokes');
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

  async function fetchMasterImage(url, signal) {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal });
    if (!response.ok) throw new Error('Approved artwork master returned HTTP ' + response.status + '.');
    const blob = await response.blob();
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(blob);
      image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Approved artwork master could not be decoded.')); };
      image.src = objectUrl;
    });
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
    const entryWeather = ['rain', 'clear'].includes(weather) ? weather : '';
    if (!entryWeather) {
      requestSerial++;
      requestController?.abort();
      requestController = null;
      showPaper('A new scene is being prepared', 'COMING SOON');
      return;
    }
    if (currentArt && currentWeather === entryWeather) return;

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
      const masterImage = prepared.rendererVersion === 3
        ? await fetchMasterImage(new URL(prepared.masterImagePath, RAW_ROOT).href, controller.signal)
        : null;
      const stageMaskAtlas = prepared.rendererVersion === 3
        ? await fetchMasterImage(new URL(prepared.stageMaskAtlasPath, RAW_ROOT).href, controller.signal)
        : null;
      if (serial !== requestSerial || screen !== activeScreen || !screen.isConnected) return;
      if (activeRenderer) activeRenderer.stop();
      activeRenderer = createRenderer(activeCanvas, prepared, meta => {
        pinnedStatus = meta.complete ? 'FINISHED' : `PAINTING · ${String(meta.count).padStart(2, '0')} / ${meta.total}`;
        setText(activeStatus, pinnedStatus);
      }, masterImage, stageMaskAtlas);
      currentArt = prepared;
      currentArtId = prepared.id;
      currentWeather = entryWeather;
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
    currentWeather = '';
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
      currentWeather = '';
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
