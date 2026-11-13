/* LIVE // EARTH — Weather Live Art online-first painter.
 * Clear scenes are painted by depositing brush marks and pigment onto a
 * persistent canvas. No master image, reveal mask, or completed-image swap.
 * Rain remains on its original schema-v1 ink-wash path renderer.
 */
(() => {
  'use strict';

  if (window.__liveEarthWeatherArtOnlineInstalled) return;
  window.__liveEarthWeatherArtOnlineInstalled = true;

  const ROOT = String(window.LIVE_EARTH_WEATHER_ART_ROOT ||
    'https://raw.githubusercontent.com/z8t8fp99p9-glitch/Live-Earth/main/').replace(/\/?$/, '/');
  const CATALOG_URL = ROOT + 'Weather/Art/art-library.json';
  const PAPER = '#f5eee3';
  const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let activeScreen = null, activeCanvas = null, activeRenderer = null;
  let activePrompt = null, activeButton = null, activeStatus = null;
  let activeTitle = null, activeCaption = null;
  let screenObserver = null, uiObserver = null, pageObserver = null;
  let requestController = null, requestSerial = 0;
  let currentArt = null, currentWeather = '', attaching = false;
  let pinnedStatus = '', pinnedTitle = '', pinnedCaption = '';

  function setText(node, value) { if (node) node.textContent = String(value || ''); }
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
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintPaper(ctx, width, height);
  }

  function paintPaper(ctx, width, height) {
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, '#f8f2e9'); wash.addColorStop(1, PAPER);
    ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.globalAlpha = .055; ctx.strokeStyle = '#8c7764'; ctx.lineWidth = .42;
    for (let i = 0; i < 76; i++) {
      const x = (i * 73.17) % width, y = (i * 41.93) % height;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + 2.2 + (i % 4), y + (i % 3 === 0 ? .45 : -.35)); ctx.stroke();
    }
    ctx.restore();
  }

  function showPaper(message, stateLabel = 'WAITING') {
    activeRenderer?.stop(); activeRenderer = null;
    currentArt = null; currentWeather = '';
    pinnedStatus = stateLabel; pinnedTitle = message; pinnedCaption = message;
    drawPaper(activeCanvas);
    if (activePrompt) { activePrompt.hidden = false; activePrompt.textContent = message; }
    setText(activeStatus, stateLabel); setText(activeCaption, message); setButtonEnabled(false);
  }

  function decodeSignedVarint(bytes, cursor) {
    let value = 0, shift = 0, byte = 0;
    do {
      if (cursor.index >= bytes.length || shift > 28) throw new Error('Rain path data is truncated.');
      byte = bytes[cursor.index++]; value |= (byte & 0x7f) << shift; shift += 7;
    } while (byte & 0x80);
    return (value >>> 1) ^ -(value & 1);
  }

  function decodePath(encoded) {
    const binary = atob(encoded), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const cursor = { index: 0 }; let x = 0, y = 0; const points = [];
    while (cursor.index < bytes.length) {
      x += decodeSignedVarint(bytes, cursor); y += decodeSignedVarint(bytes, cursor);
      if (x < 0 || x > 1000 || y < 0 || y > 700) throw new Error('Rain path coordinate is outside the 10:7 canvas.');
      points.push([x / 1000, y / 700]);
    }
    if (points.length < 3) throw new Error('Rain contains an incomplete ink-wash path.');
    return points;
  }

  function sampleCurve(points, subdivisions = 9) {
    const samples = [];
    const catmull = (a, b, c, d, t) => {
      const t2 = t * t, t3 = t2 * t;
      return .5 * ((2 * b) + (-a + c) * t + (2*a - 5*b + 4*c - d) * t2 + (-a + 3*b - 3*c + d) * t3);
    };
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)], p1 = points[i];
      const p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
      for (let step = 0; step < subdivisions; step++) {
        const t = step / subdivisions;
        samples.push({
          x: Math.max(0, Math.min(1, catmull(p0[0], p1[0], p2[0], p3[0], t))),
          y: Math.max(0, Math.min(1, catmull(p0[1], p1[1], p2[1], p3[1], t))),
          pressure: Math.max(.035, Math.min(1, catmull(p0[2], p1[2], p2[2], p3[2], t)))
        });
      }
    }
    const last = points[points.length - 1];
    samples.push({ x: last[0], y: last[1], pressure: last[2] });
    return samples;
  }

  function curveLength(samples, breaks = []) {
    let length = 0;
    const separated = new Set(breaks);
    for (let i = 1; i < samples.length; i++) {
      if (separated.has(i)) continue;
      length += Math.hypot(
        (samples[i].x - samples[i - 1].x) * 1000,
        (samples[i].y - samples[i - 1].y) * 700
      );
    }
    return length;
  }

  const BRUSHES = Object.freeze({
    wash:      { bristles: 13, spread: .78, density: .92, softness: .78, grain: .12, hairWidth: 1.55, jitter: .055 },
    mop:       { bristles: 17, spread: .72, density: .95, softness: .48, grain: .22, hairWidth: 1.42, jitter: .045 },
    flat:      { bristles: 15, spread: .66, density: .88, softness: .24, grain: .34, hairWidth: 1.24, jitter: .06 },
    calligraphy:{ bristles: 9, spread: .48, density: .88, softness: .10, grain: .34, hairWidth: 1.14, jitter: .035 },
    dry:       { bristles: 23, spread: .88, density: .62, softness: .02, grain: .82, hairWidth: .78, jitter: .12 },
    detail:    { bristles: 4, spread: .25, density: .96, softness: .04, grain: .25, hairWidth: 1.0, jitter: .025 }
  });

  function hashString(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function random01(seed) {
    let x = seed >>> 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  }


  function pointInsidePolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      const crosses = ((a[1] > y) !== (b[1] > y)) &&
        (x < (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) || 1e-9) + a[0]);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function sampleMass(region, angle, rowSpacing, seed, brushWidth) {
    const xs = region.map(point => point[0] * 1000), ys = region.map(point => point[1] * 700);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spacing = Math.max(8, Math.min(64, rowSpacing));
    let twiceArea = 0;
    for (let i = 0; i < region.length; i++) {
      const a = region[i], b = region[(i + 1) % region.length];
      twiceArea += (a[0] * 1000) * (b[1] * 700) - (b[0] * 1000) * (a[1] * 700);
    }
    const area = Math.abs(twiceArea) * .5;
    const target = Math.max(32, Math.min(500, Math.round(area / (spacing * spacing * .48))));
    const dabs = [];
    const minDistance = spacing * .18;
    let attempt = 0;
    while (dabs.length < target && attempt < target * 500) {
      const localSeed = seed ^ Math.imul(attempt + 1, 0x45d9f3b);
      attempt++;
      const x = minX + random01(localSeed) * (maxX - minX);
      const y = minY + random01(localSeed ^ 0x27d4eb2d) * (maxY - minY);
      const nx = x / 1000, ny = y / 700;
      if (!pointInsidePolygon(nx, ny, region)) continue;
      let crowded = false;
      for (const dab of dabs) {
        if (Math.hypot((dab.x - nx) * 1000, (dab.y - ny) * 700) < minDistance) { crowded = true; break; }
      }
      if (crowded) continue;
      const pressure = .18 + random01(localSeed ^ 0x68bc21eb) * .78;
      const size = .82 + random01(localSeed ^ 0x02e5be93) * .36;
      dabs.push({ x: nx, y: ny, pressure,
        angle: angle + (random01(localSeed ^ 0x967a889b) - .5) * 1.25,
        size, grain: .45 + random01(localSeed ^ 0x4f1bbcdc) * .55,
        seed: localSeed >>> 0 });
    }
    if (dabs.length < 8) throw new Error('Artist paint mass does not contain enough pigment deposits.');
    const sweepX = Math.cos(angle), sweepY = Math.sin(angle);
    dabs.sort((a, b) => (a.x * 1000 * sweepX + a.y * 700 * sweepY) - (b.x * 1000 * sweepX + b.y * 700 * sweepY));
    return { dabs, length: dabs.length * spacing * .42 };
  }

  function prepareArtwork(raw) {
    if (!raw || !Array.isArray(raw.palette)) throw new Error('Artwork palette is missing.');
    const palette = raw.palette.map(color => {
      if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Artwork contains an invalid pigment colour.');
      return color;
    });

    if (raw.schemaVersion === 1 && raw.renderMode === 'ordered-ink-wash-paths') {
      if (!Array.isArray(raw.paths) || raw.paths.length < 20) throw new Error('Rain artwork has an invalid path list.');
      const paths = raw.paths.map(record => {
        if (!Array.isArray(record) || record.length !== 2 || !Number.isInteger(record[0]) || record[0] < 0 || record[0] >= palette.length || typeof record[1] !== 'string') throw new Error('Rain path record is invalid.');
        return { color: palette[record[0]], points: decodePath(record[1]) };
      });
      return { rendererVersion: 1, id: String(raw.id || ''), title: String(raw.title || 'Weather study'), caption: String(raw.caption || 'Ink wash'), durationMs: Math.max(9000, Math.min(30000, Number(raw.durationMs) || 18000)), paths };
    }

    if (raw.schemaVersion !== 4 || raw.renderMode !== 'artist-led-pigment-painting') {
      throw new Error('Unsupported artwork version. Only Rain v1 and the independent artist-led painter are active.');
    }
    if (!Array.isArray(raw.canvas) || raw.canvas[0] !== 1000 || raw.canvas[1] !== 700 ||
        !Array.isArray(raw.events) || raw.events.length < 24 || raw.events.length > 160) {
      throw new Error('Artist painting score has invalid canvas dimensions or event count.');
    }
    const events = raw.events.map((event, index) => {
      const kind = event?.kind || 'stroke';
      if (!event || typeof event.id !== 'string' || !event.id || event.order !== index + 1 ||
          !['stroke', 'mass'].includes(kind) || !BRUSHES[event.tool] ||
          !Number.isInteger(event.colorIndex) || event.colorIndex < 0 || event.colorIndex >= palette.length) {
        throw new Error('Artist brush event ' + (index + 1) + ' is invalid.');
      }
      const width = Number(event.width);
      let points = null, mass = null;
      if (kind === 'mass') {
        if (!Array.isArray(event.region) || event.region.length < 4 || event.region.length > 40) throw new Error('Artist paint mass region is invalid for ' + event.id + '.');
        const region = event.region.map((point, pointIndex) => {
          if (!Array.isArray(point) || point.length !== 2 || point.some(value => !Number.isFinite(value)) ||
              point[0] < 0 || point[0] > 1 || point[1] < 0 || point[1] > 1) throw new Error('Artist mass point ' + pointIndex + ' is out of range.');
          return point;
        });
        const angle = Math.max(-1.2, Math.min(1.2, Number(event.angle) || 0));
        const spacing = Number(event.rowSpacing || Number(event.width) * .48);
        if (!Number.isFinite(spacing) || spacing < 5 || spacing > 64) throw new Error('Artist mass row spacing is invalid for ' + event.id + '.');
        mass = sampleMass(region, angle, spacing, hashString(event.id), width);
      } else {
        if (!Array.isArray(event.points) || event.points.length < 2 || event.points.length > 80) throw new Error('Artist stroke points are invalid for ' + event.id + '.');
        points = event.points.map((point, pointIndex) => {
          if (!Array.isArray(point) || point.length !== 3 || point.some(value => !Number.isFinite(value)) ||
              point[0] < 0 || point[0] > 1 || point[1] < 0 || point[1] > 1 || point[2] < 0 || point[2] > 1) {
            throw new Error('Artist brush point ' + pointIndex + ' in ' + event.id + ' is out of range.');
          }
          return point;
        });
      }
      const opacity = Number(event.opacity), pigmentLoad = Number(event.pigmentLoad), wetness = Number(event.wetness);
      const durationWeight = Number(event.durationWeight || 1);
      if (!Number.isFinite(width) || width < 1 || width > 190 || !Number.isFinite(opacity) || opacity < .04 || opacity > 1 ||
          !Number.isFinite(pigmentLoad) || pigmentLoad < .05 || pigmentLoad > 1 || !Number.isFinite(wetness) || wetness < 0 || wetness > 1 ||
          !Number.isFinite(durationWeight) || durationWeight <= 0 || durationWeight > 12 || typeof event.phase !== 'string' || !event.phase) {
        throw new Error('Artist brush dynamics are invalid for ' + event.id + '.');
      }
      const samples = kind === 'mass' ? mass.dabs.map(dab => ({ x: dab.x, y: dab.y, pressure: dab.pressure })) : sampleCurve(points, event.tool === 'detail' ? 7 : 9);
      const breaks = [];
      const length = kind === 'mass' ? mass.length : curveLength(samples, breaks);
      if (length < .0005) throw new Error('Artist brush event is too short: ' + event.id);
      return {
        id: event.id, order: index + 1, phase: event.phase, kind, tool: event.tool,
        color: palette[event.colorIndex], width, opacity, pigmentLoad, wetness,
        durationWeight, samples, breaks, length, seed: hashString(event.id), dabs: kind === 'mass' ? mass.dabs : null, region: kind === 'mass' ? event.region : null,
        granulation: event.granulation === undefined ? BRUSHES[event.tool].grain : Math.max(0, Math.min(1, Number(event.granulation)))
      };
    });
    const durationMs = Number(raw.durationMs);
    if (!Number.isFinite(durationMs) || durationMs < 30000 || durationMs > 120000) throw new Error('Artist replay duration is outside its supported range.');
    const phaseOrder = [];
    for (const event of events) if (phaseOrder[phaseOrder.length - 1] !== event.phase) phaseOrder.push(event.phase);
    return {
      rendererVersion: 4, id: String(raw.id || ''), title: String(raw.title || 'Original weather painting'),
      caption: String(raw.caption || 'Painted live, mark by mark'), durationMs,
      stagePauseMs: Math.max(0, Math.min(1400, Number(raw.stagePauseMs) || 0)),
      phases: phaseOrder, events
    };
  }

  /* Rain v1 is intentionally retained as its own legacy path painter. */
  function createRainRenderer(canvas, art, onProgress) {
    const visibleCtx = canvas.getContext('2d', { alpha: false });
    if (!visibleCtx) throw new Error('Canvas drawing is unavailable.');
    let baseCanvas = document.createElement('canvas'), baseCtx = baseCanvas.getContext('2d', { alpha: false });
    if (!baseCtx) throw new Error('Rain drawing surface could not be created.');
    let width = 1, height = 1, dpr = 1, raf = 0, startAt = 0, progress = 0, drawn = 0;
    let stopped = false, completed = false, resizeObserver = null;
    const paths = art.paths;

    function setup() {
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = baseCanvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = baseCanvas.height = Math.max(1, Math.round(height * dpr));
      visibleCtx.setTransform(dpr, 0, 0, dpr, 0, 0); baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    }
    function trace(ctx, item, partial) {
      const pts = item.points, segments = pts.length - 1, visible = Math.max(0, Math.min(segments, Math.floor(segments * partial)));
      const fraction = segments * partial - visible;
      ctx.beginPath(); ctx.moveTo(pts[0][0] * width, pts[0][1] * height);
      if (partial >= 1) {
        for (let i = 1; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1];
          ctx.quadraticCurveTo(p[0] * width, p[1] * height, (p[0] + q[0]) * .5 * width, (p[1] + q[1]) * .5 * height);
        }
        const last = pts[pts.length - 1]; ctx.lineTo(last[0] * width, last[1] * height);
      } else {
        for (let i = 1; i <= visible; i++) ctx.lineTo(pts[i][0] * width, pts[i][1] * height);
      }
      if (partial < 1 && fraction > 0) {
        const a = pts[visible], b = pts[Math.min(visible + 1, pts.length - 1)];
        ctx.lineTo((a[0] + (b[0] - a[0]) * fraction) * width, (a[1] + (b[1] - a[1]) * fraction) * height);
      }
    }
    function paintPath(ctx, item, partial, complete) {
      if (partial <= 0) return;
      trace(ctx, item, partial);
      ctx.save(); ctx.globalAlpha = complete ? .90 : .86; ctx.fillStyle = item.color; ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(complete ? .55 : .7, Math.min(complete ? 1.5 : 1.8, Math.min(width, height) / (complete ? 270 : 235)));
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (complete) { ctx.closePath(); ctx.fill(); ctx.globalAlpha = .30; ctx.stroke(); } else ctx.stroke();
      ctx.restore();
    }
    function rebuild() {
      baseCtx.clearRect(0, 0, width, height); paintPaper(baseCtx, width, height); drawn = 0;
      const count = Math.min(paths.length, Math.floor(progress * paths.length));
      while (drawn < count) paintPath(baseCtx, paths[drawn++], 1, true);
      render();
    }
    function render() {
      visibleCtx.clearRect(0, 0, width, height); visibleCtx.drawImage(baseCanvas, 0, 0, width, height);
      const units = Math.max(0, Math.min(1, progress)) * paths.length, whole = Math.floor(units), part = units - whole;
      if (whole < paths.length && part > 0) paintPath(visibleCtx, paths[whole], part, false);
      onProgress?.({ count: Math.min(paths.length, whole + (part > 0 ? 1 : 0)), total: paths.length, complete: progress >= 1 });
    }
    function tick(now) {
      raf = 0; if (stopped || !canvas.isConnected || document.hidden) return;
      progress = Math.min(1, (now - startAt) / art.durationMs); rebuild();
      if (progress < 1) raf = requestAnimationFrame(tick); else completed = true;
    }
    function replay() {
      if (stopped) return; if (raf) cancelAnimationFrame(raf);
      progress = 0; completed = false; rebuild();
      if (reducedMotion()) { progress = 1; completed = true; rebuild(); return; }
      startAt = performance.now(); raf = requestAnimationFrame(tick);
    }
    function visibility() {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
      else if (!completed && !stopped) { startAt = performance.now() - progress * art.durationMs; raf = requestAnimationFrame(tick); }
    }
    document.addEventListener('visibilitychange', visibility); window.addEventListener('resize', setup, { passive: true });
    if (typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(setup); resizeObserver.observe(canvas); }
    setup();
    return { replay, stop() { stopped = true; if (raf) cancelAnimationFrame(raf); resizeObserver?.disconnect(); window.removeEventListener('resize', setup); document.removeEventListener('visibilitychange', visibility); } };
  }

  function createArtistRenderer(canvas, art, onProgress) {
    const visibleCtx = canvas.getContext('2d', { alpha: false });
    const paintCanvas = document.createElement('canvas'), paintCtx = paintCanvas.getContext('2d');
    if (!visibleCtx || !paintCtx) throw new Error('The artist canvas could not be created.');
    let width = 1, height = 1, dpr = 1, raf = 0, startAt = 0, elapsed = 0;
    let stopped = false, complete = false, resizeObserver = null, nextEvent = 0, activePainted = 0;

    const events = art.events;
    const pauses = Math.max(0, art.phases.length - 1) * art.stagePauseMs;
    const paintBudget = Math.max(1, art.durationMs - pauses);
    const totalWeight = events.reduce((sum, event) => sum + event.durationWeight * (0.7 + 0.3 * Math.sqrt(event.length / 100)), 0);
    let cursor = 0;
    const timeline = events.map((event, index) => {
      const weight = event.durationWeight * (0.7 + 0.3 * Math.sqrt(event.length / 100));
      const duration = paintBudget * weight / totalWeight;
      const item = { start: cursor, end: cursor + duration, duration, pauseEnd: cursor + duration };
      cursor += duration;
      if (index < events.length - 1 && events[index + 1].phase !== event.phase && art.stagePauseMs > 0) {
        item.pauseEnd = cursor + art.stagePauseMs; cursor = item.pauseEnd;
      }
      return item;
    });

    function createPaperTexture() {
      const grain = document.createElement('canvas'); grain.width = 240; grain.height = 168;
      const g = grain.getContext('2d'), data = g.createImageData(grain.width, grain.height);
      let seed = 0x516e2a91;
      for (let i = 0; i < data.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const n = 222 + (seed % 29);
        data.data[i] = n; data.data[i + 1] = n - 3; data.data[i + 2] = n - 9; data.data[i + 3] = 26 + (seed % 22);
      }
      g.putImageData(data, 0, 0); return grain;
    }
    const paperTexture = createPaperTexture();

    function resize() {
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.max(1, Math.round(width * dpr)), ph = Math.max(1, Math.round(height * dpr));
      canvas.width = paintCanvas.width = pw; canvas.height = paintCanvas.height = ph;
      visibleCtx.setTransform(dpr, 0, 0, dpr, 0, 0); paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild(elapsed);
    }

    function seeded(event, sampleIndex, bristleIndex, salt = 0) {
      return random01(event.seed ^ Math.imul(sampleIndex + 17, 0x9e3779b1) ^ Math.imul(bristleIndex + 31, 0x85ebca6b) ^ salt);
    }

    function paintSample(ctx, event, sampleIndex, previous, current) {
      const profile = BRUSHES[event.tool];
      const px = current.x * width, py = current.y * height;
      const qx = previous ? previous.x * width : px - .1, qy = previous ? previous.y * height : py - .1;
      let dx = px - qx, dy = py - qy;
      if (!previous) { dx = 1; dy = 0; }
      const length = Math.max(.01, Math.hypot(dx, dy));
      const nx = -dy / length, ny = dx / length, tx = dx / length, ty = dy / length;
      const scale = Math.min(width / 1000, height / 700);
      const pressure = Math.max(.035, current.pressure);
      const averageStep = Math.max(.001, (event.length * scale) / Math.max(1, event.samples.length - 1));
      const speedRatio = previous ? Math.hypot(dx, dy) / averageStep : 1;
      const speedResponse = Math.max(.76, Math.min(1.18, 1 / Math.sqrt(Math.max(.12, speedRatio))));
      const massScale = event.kind === 'mass' ? .78 : 1;
      const brushWidth = Math.max(.45, event.width * massScale * scale * (.12 + .88 * pressure) * speedResponse);
      const bristles = profile.bristles;
      const wet = event.wetness;

      // A translucent wet edge is deposited first; it is pigment, not a reveal mask.
      if (wet > .18 && sampleIndex % 2 === 0) {
        ctx.save(); ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = event.opacity * event.pigmentLoad * wet * .11;
        ctx.strokeStyle = event.color; ctx.lineCap = 'round';
        ctx.lineWidth = brushWidth * (1.18 + wet * .32);
        ctx.shadowColor = event.color; ctx.shadowBlur = brushWidth * profile.softness * .23;
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke(); ctx.restore();
      }

      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = event.color; ctx.lineCap = 'butt';
      for (let b = 0; b < bristles; b++) {
        // A bristle is a continuous strand for the whole gesture. Its position,
        // pigment character and likelihood of carrying paint are stroke-stable;
        // only pressure, path direction and a tiny natural drift vary per sample.
        const identity = seeded(event, 0, b, 7);
        if (identity > profile.density * (1 - profile.grain * event.granulation * .28)) continue;
        const lane = (b + .5) / bristles - .5 + (seeded(event, 0, b, 11) - .5) * (.72 / bristles);
        const staticJitter = (seeded(event, 0, b, 13) - .5) * profile.jitter * 1.35;
        const offset = (lane + staticJitter) * brushWidth * profile.spread;
        const drift = (seeded(event, 0, b, 29) - .5) * brushWidth * .012;
        const wobble = (seeded(event, sampleIndex, b, 41) - .5) * brushWidth * .003;
        const startX = qx + nx * (offset - wobble) + tx * drift;
        const startY = qy + ny * (offset - wobble) + ty * drift;
        const endX = px + nx * (offset + wobble) + tx * drift;
        const endY = py + ny * (offset + wobble) + ty * drift;
        const hairFactor = .72 + seeded(event, 0, b, 57) * .56;
        const hair = brushWidth / bristles * profile.hairWidth * hairFactor;
        const pigmentFactor = .48 + seeded(event, 0, b, 71) * .43;
        const alpha = event.opacity * event.pigmentLoad * (.26 + pressure * .72) * pigmentFactor;
        ctx.globalAlpha = Math.max(.015, Math.min(1, alpha)); ctx.lineWidth = Math.max(.42, hair * 1.08);
        ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
      }
      // The loaded belly of the brush gives broad marks a connected painted body.
      ctx.globalAlpha = event.opacity * event.pigmentLoad * pressure * (event.tool === 'dry' ? .045 : (event.kind === 'mass' ? .12 : (event.tool === 'wash' || event.tool === 'mop' || event.tool === 'flat' ? .29 : .17)));
      ctx.lineCap = 'round';
      ctx.lineWidth = brushWidth * (event.tool === 'detail' ? .20 : (event.kind === 'mass' ? .48 : (event.tool === 'wash' || event.tool === 'mop' || event.tool === 'flat' ? .92 : .42)));
      ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
      ctx.restore();

      // Small pigment granules settle unevenly through the wet and dry brush edges.
      if (event.granulation > .16 && sampleIndex % (event.tool === 'dry' ? 1 : 3) === 0) {
        ctx.save(); ctx.globalCompositeOperation = 'multiply';
        const specks = event.tool === 'dry' ? 4 : 2;
        for (let s = 0; s < specks; s++) {
          const along = (seeded(event, sampleIndex, s, 101) - .5) * brushWidth * .72;
          const across = (seeded(event, sampleIndex, s, 109) - .5) * brushWidth * profile.spread * 1.25;
          const radius = Math.max(.22, scale * (.45 + seeded(event, sampleIndex, s, 127) * 1.5));
          ctx.globalAlpha = event.opacity * event.pigmentLoad * event.granulation * (.10 + seeded(event, sampleIndex, s, 137) * .24);
          ctx.fillStyle = event.color; ctx.beginPath();
          ctx.arc(px + tx * along + nx * across, py + ty * along + ny * across, radius, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }

    function paintMassDab(event, dab) {
      const profile = BRUSHES[event.tool];
      const scale = Math.min(width / 1000, height / 700);
      const pressure = Math.max(.08, dab.pressure);
      const radius = Math.max(1.6, event.width * scale * (.12 + pressure * .15) * dab.size);
      paintCtx.save();
      paintCtx.globalCompositeOperation = 'multiply';
      paintCtx.translate(dab.x * width, dab.y * height);
      paintCtx.rotate(dab.angle);
      paintCtx.globalAlpha = event.opacity * event.pigmentLoad * (.085 + pressure * .105) * dab.grain;
      paintCtx.fillStyle = event.color;
      paintCtx.shadowColor = event.color;
      paintCtx.shadowBlur = event.wetness * radius * .88;
      paintCtx.beginPath();
      paintCtx.ellipse(0, 0, radius * 1.62, radius * (.58 + profile.softness * .22), 0, 0, Math.PI * 2);
      paintCtx.fill();
      paintCtx.shadowBlur = 0;
      paintCtx.globalAlpha = event.opacity * event.pigmentLoad * (.045 + pressure * .065);
      paintCtx.lineCap = 'round';
      paintCtx.strokeStyle = event.color;
      const hairs = Math.max(2, Math.round(profile.bristles * .34));
      for (let i = 0; i < hairs; i++) {
        const r = random01(dab.seed ^ Math.imul(i + 1, 0x9e3779b1));
        const across = (r - .5) * radius * .7;
        const length = radius * (.48 + random01(dab.seed ^ Math.imul(i + 17, 0x85ebca6b)) * .78);
        paintCtx.globalAlpha = event.opacity * event.pigmentLoad * (.025 + pressure * .055) * (.5 + dab.grain * .5);
        paintCtx.lineWidth = Math.max(.35, scale * (.7 + random01(dab.seed ^ Math.imul(i + 29, 0xc2b2ae35)) * 1.25));
        paintCtx.beginPath();
        paintCtx.moveTo(-length * .5, across);
        paintCtx.lineTo(length * .5, across + (random01(dab.seed ^ (i + 53)) - .5) * radius * .12);
        paintCtx.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const angle = random01(dab.seed ^ Math.imul(i + 71, 0x27d4eb2d)) * Math.PI * 2;
        const distance = radius * (.55 + random01(dab.seed ^ Math.imul(i + 83, 0x165667b1)) * .5);
        const dot = scale * (.55 + random01(dab.seed ^ Math.imul(i + 97, 0xd3a2646c)) * 1.35);
        paintCtx.globalAlpha = event.opacity * event.pigmentLoad * event.granulation * (.08 + dab.grain * .14);
        paintCtx.beginPath();
        paintCtx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance * .42, dot, 0, Math.PI * 2);
        paintCtx.fill();
      }
      paintCtx.restore();
    }

    function paintEvent(index, fromSample = 0, toSample = null) {
      const event = events[index], samples = event.samples;
      const end = toSample === null ? samples.length : Math.max(0, Math.min(samples.length, toSample));
      const start = Math.max(0, Math.min(end, fromSample));
      for (let i = start; i < end; i++) {
        if (event.kind === 'mass') paintMassDab(event, event.dabs[i]);
        else paintSample(paintCtx, event, i, i === 0 ? null : samples[i - 1], samples[i]);
      }
    }

    function stateAt(time) {
      const t = Math.max(0, Math.min(art.durationMs, time));
      if (t >= art.durationMs - .25) return { done: events.length, active: -1, fraction: 0, complete: true };
      for (let i = 0; i < timeline.length; i++) {
        const line = timeline[i];
        if (t >= line.end) {
          if (t < line.pauseEnd) return { done: i + 1, active: -1, fraction: 0, complete: false };
          continue;
        }
        const fraction = Math.max(0, Math.min(1, (t - line.start) / line.duration));
        return { done: i, active: fraction > 0 ? i : -1, fraction, complete: false };
      }
      return { done: events.length, active: -1, fraction: 0, complete: true };
    }

    function composite(state) {
      visibleCtx.clearRect(0, 0, width, height);
      paintPaper(visibleCtx, width, height);
      visibleCtx.save(); visibleCtx.globalAlpha = .17;
      visibleCtx.globalCompositeOperation = 'multiply';
      visibleCtx.drawImage(paperTexture, 0, 0, width, height); visibleCtx.restore();
      visibleCtx.drawImage(paintCanvas, 0, 0, width, height);
      onProgress?.({
        count: Math.min(events.length, state.done + (state.active >= 0 ? 1 : 0)),
        total: events.length, complete: state.complete,
        phase: state.active >= 0 ? events[state.active].phase : (state.done ? events[state.done - 1].phase : 'Paper')
      });
    }

    function rebuild(time) {
      paintCtx.clearRect(0, 0, width, height);
      const state = stateAt(time);
      for (let i = 0; i < state.done; i++) paintEvent(i);
      if (state.active >= 0) {
        const count = Math.max(1, Math.floor(events[state.active].samples.length * state.fraction));
        paintEvent(state.active, 0, count);
      }
      nextEvent = state.done; activePainted = state.active >= 0 ? Math.max(1, Math.floor(events[state.active].samples.length * state.fraction)) : 0;
      composite(state); complete = state.complete;
    }

    function advance(time) {
      const state = stateAt(time);
      while (nextEvent < state.done) { paintEvent(nextEvent); nextEvent++; activePainted = 0; }
      if (state.active >= 0) {
        const count = Math.max(1, Math.floor(events[state.active].samples.length * state.fraction));
        if (count > activePainted) { paintEvent(state.active, activePainted, count); activePainted = count; }
      }
      composite(state); complete = state.complete;
    }
    function tick(now) {
      raf = 0; if (stopped || !canvas.isConnected || document.hidden) return;
      elapsed = Math.max(0, Math.min(art.durationMs, now - startAt)); advance(elapsed);
      if (elapsed < art.durationMs) raf = requestAnimationFrame(tick); else complete = true;
    }
    function replay() {
      if (stopped) return; if (raf) cancelAnimationFrame(raf); raf = 0;
      elapsed = 0; complete = false; rebuild(0);
      if (reducedMotion()) { elapsed = art.durationMs; rebuild(elapsed); return; }
      startAt = performance.now(); raf = requestAnimationFrame(tick);
    }
    function visibility() {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
      else if (!complete && !stopped) { startAt = performance.now() - elapsed; raf = requestAnimationFrame(tick); }
    }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize, { passive: true });
    if (typeof ResizeObserver === 'function') { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); }
    resize();
    return {
      replay,
      renderAt(timeMs) { elapsed = Math.max(0, Math.min(art.durationMs, Number(timeMs) || 0)); rebuild(elapsed); },
      stop() { stopped = true; if (raf) cancelAnimationFrame(raf); resizeObserver?.disconnect(); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); }
    };
  }

  function createRenderer(canvas, art, onProgress) {
    if (art.rendererVersion === 4) return createArtistRenderer(canvas, art, onProgress);
    if (art.rendererVersion === 1) return createRainRenderer(canvas, art, onProgress);
    throw new Error('No renderer is registered for this artwork.');
  }

  if (window.__LIVE_EARTH_WEATHER_ART_TEST__ === true) {
    window.__LIVE_EARTH_WEATHER_ART_TEST_API__ = { prepareArtwork, createRenderer, BRUSHES };
  }

  function makeCanvas(studio, oldCanvas) {
    const canvas = document.createElement('canvas');
    canvas.className = oldCanvas.className + ' le-weather-online-canvas';
    canvas.setAttribute('aria-label', 'An original painting being created live through brushwork and deposited pigment');
    canvas.dataset.liveArtOnline = 'true'; oldCanvas.replaceWith(canvas); return canvas;
  }

  function styleAndPrompt(studio) {
    if (!document.getElementById('le-weather-online-art-style')) {
      const style = document.createElement('style'); style.id = 'le-weather-online-art-style';
      style.textContent = `
        .le-weather-studio-canvas.le-weather-online-canvas{z-index:0;display:block;pointer-events:none;background:${PAPER}}
        .le-weather-online-prompt{position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);max-width:76%;padding:7px 12px;border-radius:999px;background:rgba(248,242,233,.78);color:#65594d;font:600 9px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.095em;text-align:center;white-space:normal;box-shadow:0 1px 8px rgba(54,43,34,.07);pointer-events:none}
        .le-weather-online-prompt[hidden]{display:none}.le-weather-art-replay:disabled{cursor:default;filter:grayscale(.25)}
      `; document.head.appendChild(style);
    }
    let prompt = studio.querySelector('.le-weather-online-prompt');
    if (!prompt) { prompt = document.createElement('div'); prompt.className = 'le-weather-online-prompt'; prompt.setAttribute('role', 'status'); prompt.setAttribute('aria-live', 'polite'); studio.appendChild(prompt); }
    prompt.hidden = true; return prompt;
  }

  async function fetchJson(url, signal) {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal });
    if (!response.ok) throw new Error('Artwork source returned HTTP ' + response.status + '.');
    return response.json();
  }

  async function loadForWeather(screen) {
    if (screen !== activeScreen || !screen.isConnected) return;
    if (navigator.onLine === false) { requestSerial++; requestController?.abort(); requestController = null; showPaper('Connect to paint', 'OFFLINE'); return; }
    const weather = String(screen.dataset.weather || 'clear').toLowerCase();
    const selected = ['rain', 'clear'].includes(weather) ? weather : '';
    if (!selected) { requestSerial++; requestController?.abort(); requestController = null; showPaper('A new scene is being prepared', 'COMING SOON'); return; }
    if (currentArt && currentWeather === selected) return;
    requestController?.abort(); const controller = new AbortController(); requestController = controller;
    const serial = ++requestSerial; showPaper('Preparing the painting…', 'LOADING');
    try {
      const catalog = await fetchJson(CATALOG_URL, controller.signal);
      if (serial !== requestSerial || screen !== activeScreen || !screen.isConnected) return;
      if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.artworks)) throw new Error('Artwork catalogue is invalid.');
      const record = catalog.artworks.find(item => Array.isArray(item.weather) && item.weather.includes(selected));
      if (!record || typeof record.dataPath !== 'string' || !record.dataPath.startsWith('Weather/Art/')) { showPaper('A new scene is being prepared', 'COMING SOON'); return; }
      const raw = await fetchJson(new URL(record.dataPath, ROOT).href, controller.signal);
      if (serial !== requestSerial || screen !== activeScreen || !screen.isConnected) return;
      const prepared = prepareArtwork(raw);
      if (prepared.id !== record.id || prepared.rendererVersion !== record.rendererVersion) throw new Error('Catalogue and painting score do not match.');
      activeRenderer?.stop();
      activeRenderer = createRenderer(activeCanvas, prepared, meta => {
        pinnedStatus = meta.complete ? 'FINISHED' : `PAINTING · ${String(meta.count).padStart(2, '0')} / ${meta.total}`;
        setText(activeStatus, pinnedStatus);
      });
      currentArt = prepared; currentWeather = selected;
      activePrompt.hidden = true; pinnedTitle = prepared.title;
      pinnedCaption = prepared.caption + ' · Original live painting';
      setText(activeTitle, pinnedTitle); setText(activeCaption, pinnedCaption); setButtonEnabled(true);
      activeRenderer.replay();
    } catch (error) {
      if (error?.name === 'AbortError' || serial !== requestSerial) return;
      console.warn('[LIVE // EARTH] Weather Live Art could not be loaded:', error?.message || error);
      showPaper('Connect to paint', 'ART UNAVAILABLE');
    } finally { if (requestController === controller) requestController = null; }
  }

  function attachScreen(screen) {
    if (!screen || screen === activeScreen || attaching) return;
    const studio = screen.querySelector('.le-weather-studio'), oldCanvas = studio?.querySelector('.le-weather-studio-canvas');
    if (!studio || !oldCanvas) return;
    attaching = true; activeRenderer?.stop(); requestController?.abort(); requestController = null; requestSerial++;
    activeScreen = screen; activeCanvas = makeCanvas(studio, oldCanvas); activePrompt = styleAndPrompt(studio);
    activeButton = studio.querySelector('#le-weather-art-replay'); activeStatus = studio.querySelector('#le-weather-studio-state');
    activeTitle = studio.querySelector('#le-weather-studio-title'); activeCaption = studio.querySelector('#le-weather-studio-caption');
    currentArt = null; currentWeather = ''; pinnedTitle = ''; pinnedCaption = ''; pinnedStatus = '';
    activeButton?.addEventListener('click', () => activeRenderer?.replay());
    screenObserver?.disconnect(); uiObserver?.disconnect();
    uiObserver = new MutationObserver(() => {
      if (activeTitle && pinnedTitle && activeTitle.textContent !== pinnedTitle) setText(activeTitle, pinnedTitle);
      if (activeCaption && pinnedCaption && activeCaption.textContent !== pinnedCaption) setText(activeCaption, pinnedCaption);
      if (activeStatus && pinnedStatus && activeStatus.textContent !== pinnedStatus) setText(activeStatus, pinnedStatus);
    });
    [activeTitle, activeCaption, activeStatus].filter(Boolean).forEach(node => uiObserver.observe(node, { childList: true, characterData: true, subtree: true }));
    showPaper('Preparing the painting…', 'LOADING'); setButtonEnabled(false);
    screenObserver = new MutationObserver(() => loadForWeather(screen));
    screenObserver.observe(screen, { attributes: true, attributeFilter: ['data-weather'] });
    attaching = false; loadForWeather(screen);
  }

  function scan() {
    const screen = document.querySelector('.le-weather-screen');
    if (screen && screen !== activeScreen) attachScreen(screen);
    if (activeScreen && !activeScreen.isConnected) {
      screenObserver?.disconnect(); uiObserver?.disconnect(); activeRenderer?.stop(); requestController?.abort();
      activeScreen = activeCanvas = activeRenderer = activePrompt = null;
      activeButton = activeStatus = activeTitle = activeCaption = null; currentArt = null; currentWeather = '';
    }
  }
  pageObserver = new MutationObserver(scan); pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('online', () => { if (activeScreen) loadForWeather(activeScreen); });
  window.addEventListener('offline', () => { if (activeScreen) loadForWeather(activeScreen); });
  window.addEventListener('pagehide', () => { pageObserver?.disconnect(); screenObserver?.disconnect(); uiObserver?.disconnect(); activeRenderer?.stop(); requestController?.abort(); }, { once: true });
  scan();
})();
