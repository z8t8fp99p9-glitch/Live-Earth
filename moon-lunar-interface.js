/* LIVE // EARTH — Lunar Stardust interface (v81).
   Additive Moon-view overlay: does not alter Home, Sun View, or the Orb dock.
   Local geolocation is read only while the existing Location feature is ON. */
(() => {
  "use strict";
  if (window.__liveEarthLunarStardustInstalled) return;
  window.__liveEarthLunarStardustInstalled = true;

  const root = document.getElementById("le-sky-view");
  if (!root) {
    console.warn("[LIVE // EARTH] Lunar interface skipped: Sky View root is absent.");
    return;
  }

  const scriptUrl = document.currentScript?.src || location.href;
  const astronomyUrl = new URL("./astronomy.js", scriptUrl).href;
  const css = `
    #le-sky-view .le-lunar-ui {
      position:absolute; inset:0; z-index:4; overflow:hidden;
      opacity:0; visibility:hidden; pointer-events:none;
      transition:opacity .28s ease, visibility .28s ease;
      color:#eaf5ff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    #le-sky-view[data-view="moon"] .le-lunar-ui { opacity:1; visibility:visible; }
    #le-sky-view .le-lunar-svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
    #le-sky-view .le-lunar-arc { fill:none; stroke:url(#leLunarArcGradient); stroke-width:1.7; stroke-linecap:round; filter:drop-shadow(0 0 5px #86caffb5); }
    #le-sky-view .le-lunar-arc-halo { fill:none; stroke:#70bfff; stroke-opacity:.13; stroke-width:9; }
    #le-sky-view .le-lunar-rail { fill:none; stroke:url(#leLunarRailGradient); stroke-width:2; stroke-linecap:round; filter:drop-shadow(0 0 5px #76bfff90); }
    #le-sky-view .le-lunar-hit { fill:none; stroke:transparent; stroke-width:34; pointer-events:stroke; touch-action:none; cursor:grab; outline:none; }
    #le-sky-view .le-lunar-hit:active { cursor:grabbing; }
    #le-sky-view .le-lunar-hit:focus-visible { stroke:#d9f0ff66; stroke-width:28; }
    #le-sky-view .le-lunar-endpoint { fill:#d9f0ff; filter:drop-shadow(0 0 5px #9bd8ff); }
    #le-sky-view .le-lunar-endpoint-halo { fill:#9bd8ff; fill-opacity:.14; }
    #le-sky-view .le-lunar-label { fill:#d0e6f8; font-size:10px; letter-spacing:1.65px; paint-order:stroke; stroke:#031020a8; stroke-width:2.4px; stroke-linejoin:round; }
    #le-sky-view .le-lunar-event-time { fill:#f5faff; font-size:15px; font-weight:600; paint-order:stroke; stroke:#031020aa; stroke-width:2.6px; stroke-linejoin:round; }
    #le-sky-view .le-lunar-current-time { fill:#f6fbff; font-size:15px; font-weight:500; letter-spacing:.25px; text-anchor:middle; paint-order:stroke; stroke:#061629bb; stroke-width:3px; stroke-linejoin:round; }
    #le-sky-view .le-lunar-tick { stroke:#c6e8ff; stroke-width:1; stroke-opacity:.44; }
    #le-sky-view .le-lunar-dust { fill:#e0f2ff; filter:drop-shadow(0 0 2px #83c8ff); animation:le-lunar-twinkle 3.8s ease-in-out infinite alternate; }
    #le-sky-view .le-lunar-moon-halo { fill:url(#leLunarMoonGlow); }
    #le-sky-view .le-lunar-moon-disc { fill:url(#leLunarMoonFill); stroke:#f0f8ff; stroke-opacity:.55; stroke-width:.8; }
    #le-sky-view .le-lunar-crater { fill:#8ea8c4; fill-opacity:.55; stroke:#f2f8ff; stroke-opacity:.16; stroke-width:.65; }
    #le-sky-view .le-lunar-live {
      position:absolute; z-index:2; transform:translate(-50%,-50%); pointer-events:auto;
      display:flex; align-items:center; justify-content:center; gap:6px;
      min-height:27px; padding:5px 10px; border-radius:99px;
      border:1px solid #a7d8ff52; background:#09203b9c; color:#c8e7ff;
      box-shadow:0 0 12px #65baff24, inset 0 1px #ffffff1c;
      backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
      font:600 9px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing:1.6px; cursor:pointer; -webkit-tap-highlight-color:transparent;
    }
    #le-sky-view .le-lunar-live .le-lunar-live-dot { width:6px; height:6px; flex:none; border-radius:50%; background:#89d5ff; box-shadow:0 0 7px #7acbff; }
    #le-sky-view .le-lunar-live[aria-pressed="false"] { color:#afc2d5; background:#07172985; border-color:#a7d8ff2b; }
    #le-sky-view .le-lunar-live[aria-pressed="false"] .le-lunar-live-dot { background:#8397aa; box-shadow:none; }
    #le-sky-view .le-lunar-hint { fill:#bfd4e8; fill-opacity:.9; font-size:9px; letter-spacing:1.2px; text-anchor:middle; paint-order:stroke; stroke:#061629cc; stroke-width:2px; }
    @keyframes le-lunar-twinkle { from { opacity:.22; } to { opacity:.9; } }
    @media (orientation:landscape) {
      #le-sky-view .le-lunar-label { font-size:9px; letter-spacing:1.2px; }
      #le-sky-view .le-lunar-event-time { font-size:13px; }
      #le-sky-view .le-lunar-current-time { font-size:13px; }
    }
    @media (prefers-reduced-motion:reduce) {
      #le-sky-view .le-lunar-ui, #le-sky-view .le-lunar-dust { transition:none!important; animation:none!important; }
    }
  `;
  const style = document.createElement("style");
  style.id = "le-lunar-stardust-style";
  style.textContent = css;
  document.head.appendChild(style);

  const ui = document.createElement("div");
  ui.className = "le-lunar-ui";
  ui.setAttribute("aria-hidden", "true");
  ui.innerHTML = `
    <svg class="le-lunar-svg" aria-label="Lunar path and time scroller" role="group">
      <defs>
        <linearGradient id="leLunarArcGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#8cbfe9" stop-opacity=".25"/>
          <stop offset="38%" stop-color="#cceaff" stop-opacity=".92"/>
          <stop offset="52%" stop-color="#f3faff"/>
          <stop offset="100%" stop-color="#8cbfe9" stop-opacity=".38"/>
        </linearGradient>
        <linearGradient id="leLunarRailGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#d8efff" stop-opacity=".72"/>
          <stop offset="50%" stop-color="#70bdff"/>
          <stop offset="100%" stop-color="#e5f5ff" stop-opacity=".68"/>
        </linearGradient>
        <radialGradient id="leLunarMoonGlow">
          <stop offset="0%" stop-color="#b5deff" stop-opacity=".56"/>
          <stop offset="58%" stop-color="#8bc8ff" stop-opacity=".19"/>
          <stop offset="100%" stop-color="#8bc8ff" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="leLunarMoonFill" cx="28%" cy="22%" r="78%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="48%" stop-color="#d7e7f7"/>
          <stop offset="78%" stop-color="#9cb4cf"/>
          <stop offset="100%" stop-color="#667f9c"/>
        </radialGradient>
      </defs>
      <path class="le-lunar-arc-halo" id="le-lunar-arc-halo"/>
      <path class="le-lunar-arc" id="le-lunar-arc"/>
      <path class="le-lunar-hit" id="le-lunar-arc-hit" tabindex="0" role="slider" aria-label="Select a time along the Moon's arc" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/>
      <g id="le-lunar-arc-dust"></g>
      <circle class="le-lunar-endpoint-halo" id="le-lunar-rise-halo" r="10"/>
      <circle class="le-lunar-endpoint" id="le-lunar-rise-dot" r="2.5"/>
      <circle class="le-lunar-endpoint-halo" id="le-lunar-set-halo" r="10"/>
      <circle class="le-lunar-endpoint" id="le-lunar-set-dot" r="2.5"/>
      <text class="le-lunar-label" id="le-lunar-rise-label"></text>
      <text class="le-lunar-event-time" id="le-lunar-rise-time"></text>
      <text class="le-lunar-label" id="le-lunar-set-label" text-anchor="end"></text>
      <text class="le-lunar-event-time" id="le-lunar-set-time" text-anchor="end"></text>
      <g id="le-lunar-main-moon">
        <circle class="le-lunar-moon-halo" r="42"/>
        <circle class="le-lunar-moon-disc" r="27"/>
        <circle class="le-lunar-crater" cx="-8" cy="-8" r="5.4"/>
        <circle class="le-lunar-crater" cx="8" cy="5" r="4.4"/>
        <circle class="le-lunar-crater" cx="-3" cy="11" r="2.9"/>
        <circle class="le-lunar-crater" cx="12" cy="-10" r="2.6"/>
        <circle class="le-lunar-crater" cx="-14" cy="3" r="2"/>
      </g>
      <path class="le-lunar-rail" id="le-lunar-rail"/>
      <path class="le-lunar-hit" id="le-lunar-rail-hit" tabindex="0" role="slider" aria-label="Scrub lunar time" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/>
      <g id="le-lunar-rail-ticks"></g>
      <g id="le-lunar-rail-dust"></g>
      <circle id="le-lunar-rail-marker-halo" class="le-lunar-moon-halo" r="21"/>
      <circle id="le-lunar-rail-marker" class="le-lunar-moon-disc" r="9.5"/>
      <circle id="le-lunar-rail-crater" class="le-lunar-crater" cx="2.5" cy="-2" r="2.2"/>
      <text class="le-lunar-current-time" id="le-lunar-current-time"></text>
      <text class="le-lunar-hint" id="le-lunar-hint"></text>
    </svg>
    <button class="le-lunar-live" type="button" aria-pressed="true" aria-label="Return lunar time to live">
      <span class="le-lunar-live-dot" aria-hidden="true"></span><span>LIVE</span>
    </button>`;
  root.appendChild(ui);

  const $ = selector => ui.querySelector(selector);
  const svg = $(".le-lunar-svg");
  const arc = $("#le-lunar-arc");
  const arcHalo = $("#le-lunar-arc-halo");
  const rail = $("#le-lunar-rail");
  const arcHit = $("#le-lunar-arc-hit");
  const railHit = $("#le-lunar-rail-hit");
  const moon = $("#le-lunar-main-moon");
  const railMarker = $("#le-lunar-rail-marker-halo");
  const currentTimeText = $("#le-lunar-current-time");
  const liveButton = $(".le-lunar-live");
  const riseLabel = $("#le-lunar-rise-label");
  const riseTime = $("#le-lunar-rise-time");
  const setLabel = $("#le-lunar-set-label");
  const setTime = $("#le-lunar-set-time");
  const hint = $("#le-lunar-hint");

  let astronomyModule = null;
  let active = false;
  let enabled = false;
  let observer = null;
  let interval = null;
  let selectedTime = Date.now();
  let progress = 0;
  let live = true;
  let dragging = null;
  let animationTimer = 0;
  let width = 0, height = 0;
  let geometry = {};

  const fmt = timestamp => new Intl.DateTimeFormat(undefined, {
    hour: "numeric", minute: "2-digit"
  }).format(new Date(timestamp));
  const isLocationEnabled = () => window.liveEarthGetLocationState?.() === true;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function pathPoint(path, amount) {
    const length = path.getTotalLength();
    return path.getPointAtLength(clamp(amount, 0, 1) * length);
  }

  function writePoint(id, point) {
    const element = $(id);
    element.setAttribute("cx", point.x);
    element.setAttribute("cy", point.y);
  }

  function addDust(group, path, count, phase) {
    group.replaceChildren();
    const length = path.getTotalLength();
    for (let i = 0; i < count; i++) {
      const fraction = (i + .5) / count;
      const point = path.getPointAtLength(length * fraction);
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", point.x.toFixed(2));
      circle.setAttribute("cy", point.y.toFixed(2));
      circle.setAttribute("r", (i % 7 === 0 ? 1.45 : i % 3 === 0 ? 1.0 : .62).toString());
      circle.setAttribute("class", "le-lunar-dust");
      circle.style.animationDelay = `${((i * .37 + phase) % 4).toFixed(2)}s`;
      group.appendChild(circle);
    }
  }

  function buildGeometry() {
    width = Math.max(1, root.clientWidth);
    height = Math.max(1, root.clientHeight);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    const landscape = width > height;
    const x0 = width * (landscape ? .13 : .105);
    const x1 = width * (landscape ? .87 : .895);
    const arcY = height * (landscape ? .43 : .455);
    const arcControlY = height * (landscape ? .015 : .015);
    const railY = height * (landscape ? .665 : .715);
    const railAmp = Math.min(height * (landscape ? .045 : .031), landscape ? 24 : 27);
    const arcD = `M ${x0} ${arcY} Q ${width / 2} ${arcControlY} ${x1} ${arcY}`;
    const railD = `M ${x0} ${railY} C ${x0 + (x1-x0)*.24} ${railY-railAmp}, ${x0+(x1-x0)*.29} ${railY-railAmp}, ${width/2} ${railY} C ${x0+(x1-x0)*.71} ${railY+railAmp}, ${x0+(x1-x0)*.76} ${railY+railAmp}, ${x1} ${railY}`;
    arc.setAttribute("d", arcD); arcHalo.setAttribute("d", arcD); arcHit.setAttribute("d", arcD);
    rail.setAttribute("d", railD); railHit.setAttribute("d", railD);
    geometry = { x0, x1, arcY, arcControlY, railY, railAmp, landscape };
    writePoint("#le-lunar-rise-halo", {x:x0,y:arcY});
    writePoint("#le-lunar-rise-dot", {x:x0,y:arcY});
    writePoint("#le-lunar-set-halo", {x:x1,y:arcY});
    writePoint("#le-lunar-set-dot", {x:x1,y:arcY});
    riseLabel.setAttribute("x", x0 - 1); riseLabel.setAttribute("y", arcY + 23);
    riseLabel.setAttribute("text-anchor", "start"); riseLabel.textContent = "MOONRISE";
    riseTime.setAttribute("x", x0 - 1); riseTime.setAttribute("y", arcY + 42);
    riseTime.setAttribute("text-anchor", "start");
    setLabel.setAttribute("x", x1 + 1); setLabel.setAttribute("y", arcY + 23); setLabel.textContent = "MOONSET";
    setTime.setAttribute("x", x1 + 1); setTime.setAttribute("y", arcY + 42);
    setTime.setAttribute("text-anchor", "end");
    hint.setAttribute("x", width / 2); hint.setAttribute("y", Math.min(height - 84, railY + railAmp + 30));
    addDust($("#le-lunar-arc-dust"), arc, landscape ? 34 : 46, .5);
    addDust($("#le-lunar-rail-dust"), rail, landscape ? 22 : 30, 1.3);
    const ticks = $("#le-lunar-rail-ticks");
    ticks.replaceChildren();
    for (let i=0; i<=24; i++) {
      const p = pathPoint(rail, i/24);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1",p.x); line.setAttribute("x2",p.x);
      line.setAttribute("y1",p.y- (i%6===0?5:2.5)); line.setAttribute("y2",p.y+(i%6===0?5:2.5));
      line.setAttribute("class","le-lunar-tick");
      ticks.appendChild(line);
    }
    const pillX = width * (landscape ? .80 : .82);
    const pillY = railY - railAmp - 28;
    liveButton.style.left = `${pillX}px`; liveButton.style.top = `${pillY}px`;
    renderPosition();
  }

  function nearestProgress(path, event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return progress;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const length = path.getTotalLength();
    let bestT = 0, bestDistance = Infinity;
    const samples = 120;
    for (let i=0; i<=samples; i++) {
      const t = i/samples;
      const p = path.getPointAtLength(length*t);
      const distance = (p.x-local.x)**2 + (p.y-local.y)**2;
      if (distance < bestDistance) { bestDistance=distance; bestT=t; }
    }
    return bestT;
  }

  function setProgress(value) {
    if (!interval) return;
    progress = clamp(value, 0, 1);
    selectedTime = interval.rise.getTime() + progress * (interval.set.getTime() - interval.rise.getTime());
    live = false;
    updateLiveButton();
    renderPosition();
  }

  function renderPosition() {
    if (!arc || !rail || !width || !height) return;
    const mainPoint = pathPoint(arc, progress);
    const railPoint = pathPoint(rail, progress);
    moon.setAttribute("transform", `translate(${mainPoint.x} ${mainPoint.y})`);
    writePoint("#le-lunar-rail-marker-halo", railPoint);
    writePoint("#le-lunar-rail-marker", railPoint);
    const crater = $("#le-lunar-rail-crater");
    crater.setAttribute("transform", `translate(${railPoint.x} ${railPoint.y})`);
    const textAnchor = progress > .70 ? "end" : progress < .30 ? "start" : "middle";
    const labelX = progress > .70 ? railPoint.x - 17 : progress < .30 ? railPoint.x + 17 : railPoint.x;
    currentTimeText.setAttribute("x", clamp(labelX, 12, width - 12));
    currentTimeText.setAttribute("y", railPoint.y - 26);
    currentTimeText.setAttribute("text-anchor", textAnchor);
    currentTimeText.textContent = fmt(selectedTime);
    const value = String(Math.round(progress*100));
    [arcHit, railHit].forEach(hit=>hit.setAttribute("aria-valuenow", value));
    liveButton.setAttribute("aria-pressed", String(live));
    liveButton.setAttribute("aria-label", live ? "Lunar time is live. Tap to pause." : "Return lunar time to live");
  }

  function updateLiveButton() {
    liveButton.setAttribute("aria-pressed", String(live));
  }

  function showUnavailable(message) {
    interval = null;
    riseTime.textContent = enabled ? "UNAVAILABLE" : "LOCATION OFF";
    setTime.textContent = enabled ? "UNAVAILABLE" : "LOCATION OFF";
    hint.textContent = message;
    selectedTime = Date.now();
    progress = 0;
    renderPosition();
  }

  async function loadAstronomy() {
    if (astronomyModule) return astronomyModule;
    astronomyModule = await import(astronomyUrl);
    if (typeof astronomyModule.moonRiseSetInterval !== "function") {
      throw new Error("moonRiseSetInterval is missing from astronomy.js");
    }
    return astronomyModule;
  }

  function setIntervalData(nextInterval, now = Date.now()) {
    interval = nextInterval;
    if (!interval) {
      showUnavailable("NO MOONRISE/SET EVENT FOUND");
      return;
    }
    const rise = new Date(interval.rise).getTime();
    const set = new Date(interval.set).getTime();
    if (!(Number.isFinite(rise) && Number.isFinite(set) && set > rise)) {
      showUnavailable("LOCAL TIMES UNAVAILABLE");
      return;
    }
    riseTime.textContent = fmt(rise);
    setTime.textContent = fmt(set);
    hint.textContent = "DRAG THE CURVE TO EXPLORE LUNAR TIME";
    selectedTime = clamp(now, rise, set);
    progress = (selectedTime - rise) / (set - rise);
    if (now < rise) progress = 0;
    if (now >= set) progress = 0;
    selectedTime = rise + progress*(set-rise);
    renderPosition();
  }

  async function refreshObserverLocation() {
    enabled = isLocationEnabled();
    if (!enabled) {
      observer = null;
      showUnavailable("LOCATION OFF · LOCAL TIMES HIDDEN");
      return;
    }
    if (!navigator.geolocation || !active) {
      showUnavailable("LOCAL LOCATION UNAVAILABLE");
      return;
    }
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, maximumAge: 120000, timeout: 10000
        });
      });
      if (!active || !isLocationEnabled()) return;
      observer = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const astronomy = await loadAstronomy();
      if (!active || !isLocationEnabled()) return;
      const found = astronomy.moonRiseSetInterval(observer.latitude, observer.longitude, new Date());
      setIntervalData(found, Date.now());
    } catch (error) {
      observer = null;
      if (!isLocationEnabled()) showUnavailable("LOCATION OFF · LOCAL TIMES HIDDEN");
      else showUnavailable("COULD NOT CALCULATE LOCAL TIMES");
      console.info("[LIVE // EARTH] Lunar local-time calculation unavailable.", error?.message || error);
    }
  }

  function tick() {
    if (!active || !enabled || !observer || !interval) return;
    const now = Date.now();
    const rise = new Date(interval.rise).getTime();
    const set = new Date(interval.set).getTime();
    if (now >= set + 30000) {
      refreshIntervalOnly(now);
      return;
    }
    if (live) {
      progress = clamp((now-rise)/(set-rise), 0, 1);
      selectedTime = rise + progress*(set-rise);
      renderPosition();
    }
  }

  async function refreshIntervalOnly(now) {
    try {
      const astronomy = await loadAstronomy();
      const found = astronomy.moonRiseSetInterval(observer.latitude, observer.longitude, new Date(now));
      setIntervalData(found, now);
      if (!live && interval) {
        progress = clamp((selectedTime-new Date(interval.rise).getTime()) /
          (new Date(interval.set).getTime()-new Date(interval.rise).getTime()),0,1);
        selectedTime = new Date(interval.rise).getTime() + progress *
          (new Date(interval.set).getTime()-new Date(interval.rise).getTime());
        renderPosition();
      }
    } catch (error) { showUnavailable("LOCAL TIMES UNAVAILABLE"); }
  }

  function activate(view) {
    active = view === "moon";
    ui.setAttribute("aria-hidden", String(!active));
    if (!active) {
      if (animationTimer) window.clearInterval(animationTimer);
      animationTimer = 0;
      dragging = null;
      return;
    }
    buildGeometry();
    if (!enabled) refreshObserverLocation();
    else if (!observer) refreshObserverLocation();
    if (!animationTimer) animationTimer = window.setInterval(tick, 1000);
  }

  function beginDrag(event, path) {
    if (!active || event.button !== undefined && event.button !== 0) return;
    if (!interval) return;
    dragging = path;
    live = false;
    setProgress(nearestProgress(path, event));
    try { svg.setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
  }
  function moveDrag(event) {
    if (!dragging) return;
    setProgress(nearestProgress(dragging, event));
    event.preventDefault();
  }
  function endDrag() { dragging = null; }

  [arcHit, railHit].forEach(path => {
    path.addEventListener("pointerdown", event => beginDrag(event, path), { passive: false });
    path.addEventListener("keydown", event => {
      if (!interval) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") { setProgress(progress-.01); event.preventDefault(); }
      else if (event.key === "ArrowRight" || event.key === "ArrowUp") { setProgress(progress+.01); event.preventDefault(); }
      else if (event.key === "Home") { setProgress(0); event.preventDefault(); }
      else if (event.key === "End") { setProgress(1); event.preventDefault(); }
    });
  });
  svg.addEventListener("pointermove", moveDrag, { passive: false });
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("lostpointercapture", endDrag);
  liveButton.addEventListener("click", () => {
    if (!interval) { if (isLocationEnabled()) refreshObserverLocation(); return; }
    live = true;
    tick();
    updateLiveButton();
  });
  window.addEventListener("live-earth-primary-view-change", event => activate(event.detail?.view || "home"));
  window.addEventListener("live-earth-location-state", event => {
    const next = !!event.detail?.enabled && isLocationEnabled();
    if (!next) {
      enabled = false; observer = null;
      showUnavailable("LOCATION OFF · LOCAL TIMES HIDDEN");
    } else {
      enabled = true;
      if (active) refreshObserverLocation();
    }
  });
  window.addEventListener("live-earth-location-stop", () => {
    enabled = false; observer = null;
    showUnavailable("LOCATION OFF · LOCAL TIMES HIDDEN");
  });
  window.addEventListener("resize", () => { if (active) buildGeometry(); }, { passive: true });
  window.visualViewport?.addEventListener("resize", () => { if (active) buildGeometry(); }, { passive: true });
  window.addEventListener("pagehide", () => { if (animationTimer) clearInterval(animationTimer); }, { once: true });
  liveButton.addEventListener("pointerdown", event => event.stopPropagation());
  buildGeometry();
  // The interface is prepared without requesting location. Location stays OFF by default.
  showUnavailable("LOCATION OFF · LOCAL TIMES HIDDEN");
  if (window.LiveEarthViewManager?.getActiveView?.() === "moon") activate("moon");
})();
